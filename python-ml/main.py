"""
main.py — Python ML Microservice (FastAPI)
Dự báo lưu lượng (Holt-Winters), phân loại chuyên khoa (TF-IDF + LR), nhận diện khuôn mặt (InsightFace).
Chỉ nhận lời gọi nội bộ từ backend / ai-service (header x-internal-key).

Cách chạy:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 5001
"""
import os
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.forecaster import DataLoader, HoltWintersForecaster, PatternAnalyzer, today_vn
from services.face_verifier import verify_face, check_duplicate_face, get_face_app
from services.triage_classifier import TriageClassifier

load_dotenv()

app = FastAPI(title="PhongKham ML Service", version="2.0.0")

loader = DataLoader()
triage_classifier = TriageClassifier(loader)

# Cùng khóa với backend ↔ ai-service. Service gọi server-to-server nên không bật CORS.
INTERNAL_KEY = os.getenv("AI_INTERNAL_KEY")
if not INTERNAL_KEY:
    print("⚠️ AI_INTERNAL_KEY chưa đặt — Python ML đang mở cho mọi nguồn gọi")


@app.middleware("http")
async def require_internal_key(request: Request, call_next):
    """/health mở để Render kiểm tra và backend đánh thức service."""
    if INTERNAL_KEY and request.url.path != "/health" and request.headers.get("x-internal-key") != INTERNAL_KEY:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    """Ghi log chi tiết ở server, không trả nội dung lỗi (có thể lộ thông tin DB) ra ngoài."""
    print(f"[ERROR] {request.url.path}: {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Lỗi nội bộ dịch vụ ML"})


@app.on_event("startup")
def warmup():
    """Nạp model khuôn mặt và huấn luyện bộ phân loại ở luồng nền → request đầu tiên không phải chờ."""
    threading.Thread(target=get_face_app, daemon=True).start()
    triage_classifier.start()


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ─── Nhận diện khuôn mặt ──────────────────────────────────────────────
class FaceVerifyRequest(BaseModel):
    # Mẫu nhân viên: embedding đã lưu, hoặc ảnh (khi đó kết quả trả kèm ref_embedding để backend lưu)
    ref_embedding: Optional[List[float]] = None
    ref_image_base64: Optional[str] = None
    # Chuỗi khung hình camera cho thử thách quay đầu
    frames_b64: List[str] = Field(min_length=5, max_length=12)


@app.post("/verify-face")
def verify_face_endpoint(req: FaceVerifyRequest):
    """Thử thách quay đầu (chống ảnh tĩnh) rồi so khớp embedding ArcFace với mẫu nhân viên."""
    return verify_face(req.frames_b64, req.ref_image_base64, req.ref_embedding)


class CheckDuplicateFaceRequest(BaseModel):
    target_image_base64: str
    candidates: List[Dict[str, Any]] = []  # [{id, ho_ten, chuc_vu, embedding | anh_base64}]


@app.post("/check-duplicate-face")
def check_duplicate_face_endpoint(req: CheckDuplicateFaceRequest):
    """Kiểm tra ảnh đại diện có khuôn mặt hợp lệ và không trùng với nhân viên khác."""
    return check_duplicate_face(req.target_image_base64, req.candidates)


# ─── Phân loại chuyên khoa từ triệu chứng ─────────────────────────────
class TriageClassifyRequest(BaseModel):
    text: str


@app.post("/triage-classify")
def triage_classify(req: TriageClassifyRequest):
    """Dự đoán mã chuyên khoa + xác suất. 503 khi mô hình chưa huấn luyện xong."""
    result = triage_classifier.predict(req.text)
    if result is None:
        raise HTTPException(status_code=503, detail="Mô hình đang huấn luyện")
    return result


@app.get("/triage-classify/info")
def triage_info():
    """Số mẫu huấn luyện và độ chính xác cross-validation của mô hình đang chạy."""
    return triage_classifier.info or {"status": "dang_huan_luyen"}


@app.post("/triage-classify/retrain")
def triage_retrain():
    """Huấn luyện lại ngay với dữ liệu mẫu + câu hỏi Gemini đã gán nhãn trong cache."""
    return triage_classifier.train()


# ─── Dự báo lưu lượng bệnh nhân ───────────────────────────────────────
class ForecastRequest(BaseModel):
    horizon: int = Field(7, ge=1, le=30)
    history_days: int = Field(90, ge=21, le=730)


# Chuỗi ngày chỉ đổi khi sang ngày mới → fit mô hình 1 lần/ngày cho mỗi bộ tham số
_model_cache: Dict[tuple, Dict[str, Any]] = {}
_model_cache_lock = threading.Lock()


# Lịch sử dài để học hiệu ứng ngày lễ và mùa vụ (cần hơn 1 năm mới có tác dụng)
SO_NGAY_LICH_SU_DAI = 800
SO_KHOA_TOI_DA = 8


def _du_bao_theo_khoa(horizon: int, history_days: int) -> List[Dict[str, Any]]:
    """Dự báo riêng từng chuyên khoa đủ dữ liệu (tối đa SO_KHOA_TOI_DA khoa đông nhất) để xếp lịch bác sĩ."""
    ket_qua = []
    for khoa, df in loader.load_daily_counts_by_khoa(days=history_days).items():
        forecaster = HoltWintersForecaster(df)
        if not forecaster.can_forecast():
            continue
        try:
            du_bao = forecaster.forecast(horizon=horizon)
        except Exception as e:
            print(f"[forecast] Bỏ qua khoa {khoa}: {type(e).__name__}: {e}")
            continue
        ket_qua.append({
            "chuyen_khoa": khoa,
            "tong_lich_su": int(df["so_luong"].sum()),
            "forecast": [{k: d[k] for k in ("ngay", "thu", "du_bao", "ci_thap", "ci_cao")} for d in du_bao],
        })
    return sorted(ket_qua, key=lambda k: -k["tong_lich_su"])[:SO_KHOA_TOI_DA]


def _run_model(horizon: int, history_days: int) -> Dict[str, Any]:
    key = (today_vn(), horizon, history_days)
    with _model_cache_lock:
        if key in _model_cache:
            return _model_cache[key]

        df = loader.load_daily_counts(days=history_days)
        forecaster = HoltWintersForecaster(df, loader.load_daily_counts(days=SO_NGAY_LICH_SU_DAI))
        data_quality = {
            "observed_days": int(len(df)),
            "history_days_requested": history_days,
            "minimum_days_required": forecaster.MIN_HISTORY_DAYS,
        }
        ly_do = None
        if len(df) < forecaster.MIN_HISTORY_DAYS:
            ly_do = f"Cần tối thiểu {forecaster.MIN_HISTORY_DAYS} ngày dữ liệu tiếp nhận để dự báo (hiện có {len(df)})."
        elif not forecaster.can_forecast():
            ly_do = "Không có lượt tiếp nhận nào trong 7 ngày gần nhất — dữ liệu chưa đủ mới để dự báo."
        if ly_do:
            # Không cache: dữ liệu có thể vừa được nhập bổ sung
            return {
                "success": False,
                "status": "insufficient_data",
                "message": ly_do,
                "model": None,
                "mape": None,
                "mape_naive": None,
                "do_chinh_xac_pct": None,
                "forecast": [],
                "data_quality": data_quality,
            }

        backtest = forecaster.backtest() or {}
        mape = backtest.get("mape")
        analyzer = PatternAnalyzer(df)
        result = {
            "success": True,
            "model": "HoltWinters-Additive-DampedTrend-Seasonal7",
            # Sai số ngoài mẫu trên 7 ngày gần nhất; None nếu chưa đủ dữ liệu để kiểm định
            "mape": mape,
            "mape_naive": backtest.get("mape_naive"),
            "do_chinh_xac_pct": round(max(0.0, 100 - mape), 1) if mape is not None else None,
            "forecast": forecaster.forecast(horizon=horizon),
            "theo_chuyen_khoa": _du_bao_theo_khoa(horizon, history_days),
            "pattern": {
                "weekly": analyzer.analyze_weekly_pattern(),
                "trend": analyzer.analyze_trend(),
                "decomposition": analyzer.analyze_decomposition(),
            },
            "lich_su_60_ngay": [
                {"ngay": str(idx.date()), "so_luong": int(val)} for idx, val in df["so_luong"].tail(60).items()
            ],
            "trung_binh_7_ngay": round(float(df["so_luong"].tail(7).mean()), 1),
            "tong_lich_su": int(df["so_luong"].sum()),
            "data_quality": data_quality,
        }
        _model_cache.clear()  # chỉ giữ kết quả của ngày hiện tại
        _model_cache[key] = result
        return result


@app.post("/forecast")
def forecast_patient_volume(req: ForecastRequest):
    """
    Dự báo lưu lượng bệnh nhân {horizon} ngày tới (từ ngày mai).
    Trả về: dự báo + khoảng tin cậy 95%, MAPE kiểm định ngoài mẫu, pattern tuần, phân bố theo giờ.
    """
    result = dict(_run_model(req.horizon, req.history_days))
    result["timestamp"] = datetime.now().isoformat()
    if not result["success"]:
        return result

    # Số liệu trong ngày thay đổi liên tục → luôn truy vấn mới
    hourly, nguon = loader.load_hourly()
    result["heatmap_hom_nay"] = [{"gio": f"{g:02d}:00", "so_luong": hourly.get(g, 0)} for g in range(7, 18)]
    result["heatmap_nguon"] = nguon  # 'hom_nay' | 'trung_binh_lich_su'
    result["tong_quan"] = {
        "trung_binh_7_ngay": result.pop("trung_binh_7_ngay"),
        "tong_hom_nay": loader.load_today_total(),
        "tong_lich_su": result.pop("tong_lich_su"),
    }
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PYTHON_PORT", 5001)))
