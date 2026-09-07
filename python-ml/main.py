"""
main.py — Python FastAPI Microservice cho ML Forecasting
Port: 5001 (chạy song song với NestJS :5000)

Cách chạy:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 5001
"""
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.forecaster import DataLoader, HoltWintersForecaster, PatternAnalyzer
from services.queue_router import DynamicQueueRouter

load_dotenv()

app = FastAPI(
    title="PhongKham ML Forecasting & Dynamic Queue Service",
    description="Python ML Microservice — Holt-Winters Forecasting & Dynamic Queue Routing Engine",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

loader = DataLoader()


# ─── Health Check ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    """Kiểm tra service đang hoạt động."""
    return {
        "status": "ok",
        "service": "PhongKham ML Forecasting & Dynamic Queue",
        "timestamp": datetime.now().isoformat(),
    }


# ─── Endpoint: Dynamic Queue Routing Optimization ─────────────────────
class QueueOptimizationRequest(BaseModel):
    requested_items: List[Dict[str, Any]]
    queue_states: Optional[Dict[str, Any]] = {}


@app.post("/optimize-queue")
def optimize_queue(req: QueueOptimizationRequest):
    """
    Thuật toán Định tuyến Động Hàng đợi (Min-Wait First).
    So sánh thời gian chờ dự kiến giữa các phòng CLS (Xét nghiệm, Siêu âm, X-Quang...)
    xếp lịch sao cho bệnh nhân làm ở phòng vắng nhất trước.
    """
    try:
        router = DynamicQueueRouter(req.requested_items, req.queue_states or {})
        result = router.optimize_route()
        return {
            "success": True,
            "algorithm": "Min-Wait-First Dynamic Routing",
            "data": result,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e), "type": type(e).__name__})



# ─── Endpoint: Forecast 7 ngày tới ────────────────────────────────────
class ForecastRequest(BaseModel):
    horizon: int = 7
    history_days: int = 90


@app.post("/forecast")
def forecast_patient_volume(req: ForecastRequest):
    """
    Dự báo lưu lượng bệnh nhân {horizon} ngày tới.
    Trả về: forecast values, confidence interval, MAPE, pattern analysis.
    """
    try:
        # 1. Load dữ liệu lịch sử từ MySQL
        df = loader.load_daily_counts(days=req.history_days)

        # 2. Chạy mô hình Holt-Winters
        forecaster = HoltWintersForecaster(df)
        forecast_results = forecaster.forecast(horizon=req.horizon)
        mape = forecaster.mape()

        # 3. Phân tích pattern
        analyzer = PatternAnalyzer(df)
        weekly_pattern = analyzer.analyze_weekly_pattern()
        trend_info = analyzer.analyze_trend()
        decomp = analyzer.analyze_decomposition()

        # 4. Heatmap hôm nay
        df_hourly = loader.load_hourly_today()
        heatmap = [
            {
                "gio": f"{g:02d}:00",
                "so_luong": int(df_hourly[df_hourly["gio"] == g]["so_luong"].values[0])
                if g in df_hourly["gio"].values else 0
            }
            for g in range(7, 18)  # 07:00 → 17:00
        ]

        # 5. Thống kê lịch sử
        stats = loader.load_stats_summary(days=req.history_days)
        lich_su = [
            {"ngay": str(idx.date()), "so_luong": int(row["so_luong"])}
            for idx, row in df.iterrows()
        ]

        return {
            "success": True,
            "model": "HoltWinters-Additive-Seasonal7",
            "mape": mape,
            "do_chinh_xac_pct": round(100 - mape, 1) if mape is not None else None,
            "forecast": forecast_results,
            "pattern": {
                "weekly": weekly_pattern,
                "trend": trend_info,
                "decomposition": decomp,
            },
            "heatmap_hom_nay": heatmap,
            "lich_su_60_ngay": lich_su[-60:],
            "tong_quan": {
                "trung_binh_7_ngay": round(
                    df["so_luong"].tail(7).mean(), 1
                ) if len(df) >= 7 else 0,
                "tong_hom_nay": int(df_hourly["so_luong"].sum()) if not df_hourly.empty else 0,
                "tong_lich_su": int(stats.get("tong_luot", 0)) if stats else 0,
            },
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e), "type": type(e).__name__})


# ─── Endpoint: Pattern Analysis ───────────────────────────────────────
@app.get("/pattern-analysis")
def pattern_analysis(days: int = 60):
    """Phân tích pattern: thứ đông nhất, giờ cao điểm, xu hướng."""
    try:
        df = loader.load_daily_counts(days=days)
        analyzer = PatternAnalyzer(df)
        return {
            "success": True,
            "weekly": analyzer.analyze_weekly_pattern(),
            "trend": analyzer.analyze_trend(),
            "decomposition": analyzer.analyze_decomposition(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Endpoint: Dự Báo Nhu Cầu Thuốc (Drug Demand Forecasting) ────────
class MedicineForecastItem(BaseModel):
    id: Optional[int] = None
    maThuoc: str
    tenThuoc: str
    tonKhoTong: int
    donViTinh: str = "viên"
    tieuThuTrungBinhNgay: Optional[float] = 10.0


class MedicineForecastRequest(BaseModel):
    horizon_days: int = 14
    items: Optional[List[MedicineForecastItem]] = []


@app.post("/forecast-medicine")
def forecast_medicine(req: MedicineForecastRequest):
    """
    Mô hình ML Dự báo nhu cầu thuốc & tính toán điểm đặt hàng lại (Reorder Point).
    Kết hợp tốc độ tiêu thụ hàng ngày với hệ số tăng trưởng lưu lượng bệnh nhân.
    """
    try:
        # Lấy hệ số tăng trưởng bệnh nhân từ Holt-Winters (nếu có dữ liệu)
        patient_growth_rate = 1.05  # Mặc định +5% biên độ an toàn
        try:
            df = loader.load_daily_counts(days=30)
            if len(df) >= 7:
                avg_recent = df["so_luong"].tail(7).mean()
                avg_prev = df["so_luong"].head(7).mean()
                if avg_prev > 0:
                    patient_growth_rate = max(0.8, min(1.5, float(avg_recent / avg_prev)))
        except Exception:
            pass

        results = []
        for item in req.items or []:
            velocity = item.tieuThuTrungBinhNgay or 10.0
            projected_demand_7d = round(velocity * 7 * patient_growth_rate)
            projected_demand_14d = round(velocity * req.horizon_days * patient_growth_rate)

            # Số ngày còn lại trước khi hết kho
            days_left = round(item.tonKhoTong / velocity, 1) if velocity > 0 else 999
            
            # Ngưỡng an toàn (Safety Stock = 5 ngày tiêu thụ)
            safety_stock = round(velocity * 5 * patient_growth_rate)
            reorder_needed = item.tonKhoTong <= safety_stock or days_left <= 7
            suggested_reorder_qty = max(0, projected_demand_14d + safety_stock - item.tonKhoTong)

            status = "an_toan"
            if item.tonKhoTong <= 0:
                status = "het_hang"
            elif days_left <= 3:
                status = "nguy_cap"
            elif days_left <= 7:
                status = "canh_bao"

            results.append({
                "id": item.id,
                "maThuoc": item.maThuoc,
                "tenThuoc": item.tenThuoc,
                "donViTinh": item.donViTinh,
                "tonKhoHienTai": item.tonKhoTong,
                "tieuThuTrungBinhNgay": round(velocity, 1),
                "duBaoTieuThu7Ngay": projected_demand_7d,
                "duBaoTieuThu14Ngay": projected_demand_14d,
                "soNgayConLai": days_left,
                "nguongAnToan": safety_stock,
                "trangThai": status,
                "canNhapHang": reorder_needed,
                "soLuongDeXuatNhap": suggested_reorder_qty if reorder_needed else 0,
            })

        return {
            "success": True,
            "engine": "holt_winters_drug_demand_estimator",
            "heSoTangTruongBenhNhan": round(patient_growth_rate, 2),
            "soLuongThuocDuBao": len(results),
            "data": results,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_PORT", 5001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)


