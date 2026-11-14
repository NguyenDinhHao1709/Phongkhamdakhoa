"""
Test tự động cho python-ml — không cần CSDL, không tải model khuôn mặt.
Chạy: pip install pytest httpx && pytest tests -q
"""
import os
import sys
from datetime import date, timedelta
from types import SimpleNamespace

import numpy as np
import pandas as pd
import pytest

os.environ["AI_INTERNAL_KEY"] = "test-key"  # phải đặt trước khi import main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import face_verifier as fv  # noqa: E402
from services import forecaster as fc  # noqa: E402
from services.triage_classifier import TriageClassifier  # noqa: E402

TUAN = np.array([1.2, 1.3, 0.95, 1.05, 1.0, 1.35, 0.0])  # T2..CN, chủ nhật nghỉ


def chuoi(days: int, base: float, end: date | None = None, seed: int = 0) -> pd.DataFrame:
    """Chuỗi lượt khám giả lập có chu kỳ tuần, kết thúc hôm qua (hoặc `end`)."""
    rng = np.random.default_rng(seed)
    idx = pd.date_range(end=pd.Timestamp(end or fc.today_vn() - timedelta(days=1)), periods=days, freq="D")
    vals = np.round(base * TUAN[idx.dayofweek] + rng.normal(0, base * 0.08, days)).clip(0)
    vals[idx.dayofweek == 6] = 0
    return pd.DataFrame({"so_luong": vals}, index=idx)


# ─── Dự báo ───────────────────────────────────────────────────────────
def test_du_bao_bat_dau_tu_ngay_mai_va_giu_chu_ky_tuan():
    du_bao = fc.HoltWintersForecaster(chuoi(90, 40)).forecast(7)
    assert [d["ngay"] for d in du_bao] == [str(fc.today_vn() + timedelta(days=i)) for i in range(1, 8)]
    chu_nhat = next(d for d in du_bao if d["thu"] == "CN")
    thu_bay = next(d for d in du_bao if d["thu"] == "T7")
    assert chu_nhat["du_bao"] <= 5 and 45 <= thu_bay["du_bao"] <= 63
    assert all(d["ci_thap"] <= d["du_bao"] <= d["ci_cao"] for d in du_bao)


def test_phong_kham_nho_khong_bi_ep_san():
    du_bao = fc.HoltWintersForecaster(chuoi(90, 6)).forecast(7)
    assert max(d["du_bao"] for d in du_bao) <= 12  # trước đây bị ép tối thiểu 18


def test_khong_du_bao_khi_thieu_hoac_du_lieu_cu():
    assert fc.HoltWintersForecaster(chuoi(10, 40)).forecast(7) == []
    cu = chuoi(60, 40)
    cu.iloc[-7:] = 0  # 7 ngày gần nhất không có lượt nào
    assert not fc.HoltWintersForecaster(cu).can_forecast()


def test_backtest_tra_sai_so_that_hoac_none():
    kq = fc.HoltWintersForecaster(chuoi(90, 40)).backtest()
    assert kq is not None and 0 <= kq["mape"] < 40 and "mape_naive" in kq
    assert fc.HoltWintersForecaster(chuoi(25, 40)).backtest() is None  # chưa đủ 28 ngày


def test_ngay_le_am_lich_va_duong_lich():
    assert fc.ten_ngay_le(date(2027, 2, 6)) == "Tết Nguyên đán"
    assert fc.ten_ngay_le(date(2026, 9, 2)) == "Quốc khánh 2/9"
    assert fc.ten_ngay_le(date(2026, 11, 16)) is None


def test_he_so_ngay_le_hoc_tu_lich_su():
    dai = chuoi(760, 40, end=date(2027, 8, 25))
    for ngay in dai.index:
        if fc.ten_ngay_le(ngay.date()):
            dai.loc[ngay, "so_luong"] = round(dai.loc[ngay, "so_luong"] * 0.3)
    he_so = fc.he_so_ngay_le(dai["so_luong"])
    assert 0.15 <= he_so["Quốc khánh 2/9"] <= 0.5
    co = {d["ngay"]: d for d in fc.HoltWintersForecaster(dai.tail(90), dai).forecast(10)}
    khong = {d["ngay"]: d for d in fc.HoltWintersForecaster(dai.tail(90)).forecast(10)}
    assert khong["2027-09-02"]["he_so_ngay_le"] is None
    assert co["2027-09-02"]["du_bao"] < khong["2027-09-02"]["du_bao"] * 0.6


def test_mua_vu_chi_ap_dung_khi_du_hon_mot_nam():
    ngan = chuoi(300, 40)
    assert fc.he_so_mua_vu(ngan["so_luong"], ngan.index[-1] + timedelta(days=2)) is None
    on_dinh = chuoi(760, 40)
    assert fc.he_so_mua_vu(on_dinh["so_luong"], on_dinh.index[-1] + timedelta(days=2)) == 1.0


# ─── Phân loại chuyên khoa ────────────────────────────────────────────
class KhongCoDb:
    def get_connection(self):
        raise RuntimeError("không có CSDL trong test")


@pytest.fixture(scope="module")
def bo_phan_loai():
    clf = TriageClassifier(KhongCoDb())
    assert clf.predict("đau bụng") is None  # chưa huấn luyện
    clf.train()
    return clf


def test_phan_loai_cac_cau_ro_rang(bo_phan_loai):
    for cau, khoa in [("dau bung di ngoai", "TH"), ("bé sốt cao quấy khóc", "NHI"),
                      ("mat mo nhin khong ro", "MAT"), ("giá khám bao nhiêu", "KHAC")]:
        assert bo_phan_loai.predict(cau)["ma_khoa"] == khoa, cau


def test_do_chinh_xac_kiem_dinh_cheo_khong_tut(bo_phan_loai):
    info = bo_phan_loai.info
    assert info["cv_accuracy_seed"] >= 0.65  # hiện ~0.72; tụt dưới mức này là dữ liệu seed/mô hình có vấn đề
    assert len(info["cv_theo_khoa"]) == 11


# ─── Thử thách quay đầu (khuôn mặt dựng từ 5 điểm mốc) ────────────────
EMB = np.random.default_rng(1).normal(size=512).astype(np.float32)


def mat_gia(lech_mui=0.0, co_ngang=1.0, embedding=EMB):
    kps = np.array([[-30, 0], [30, 0], [60 * lech_mui, 35], [-22, 70], [22, 70]], dtype=np.float32)
    kps[:, 0] *= co_ngang
    return SimpleNamespace(kps=kps + [320, 200], embedding=embedding, det_score=0.9, bbox=np.array([240, 120, 400, 320]))


def dau_that():
    return [(i, mat_gia(l, np.cos(np.arctan(l / 0.55)))) for i, l in enumerate([0.02, 0.0, 0.1, 0.2, 0.3, 0.3, 0.15, 0.03])]


def test_dau_that_quay_thi_dat_va_chon_khung_nhin_thang():
    kq = fv.danh_gia_quay_dau(dau_that())
    assert kq["ok"] and kq["frame_index"] == 1 and kq["bien_do_quay_dau"] >= fv.NGUONG_QUAY_DAU


def test_anh_phang_nghieng_bi_tu_choi():
    phang = [(i, mat_gia(0.0, c)) for i, c in enumerate([1, 0.95, 0.85, 0.75, 0.7, 0.75, 0.9, 1])]
    kq = fv.danh_gia_quay_dau(phang)
    assert not kq["ok"] and kq["bien_do_quay_dau"] < 0.05


def test_cac_truong_hop_tu_choi_khac():
    assert not fv.danh_gia_quay_dau(dau_that()[:4])["ok"]  # thiếu khung hình
    nguoi_khac = np.random.default_rng(2).normal(size=512).astype(np.float32)
    trao = dau_that()[:6] + [(6, mat_gia(0.15, 0.96, nguoi_khac)), dau_that()[7]]
    assert "thay đổi" in fv.danh_gia_quay_dau(trao)["reason"]  # tráo người giữa chừng
    nghieng = [(i, mat_gia(l)) for i, l in enumerate([0.3, 0.35, 0.4, 0.5, 0.45, 0.3])]
    assert "nhìn thẳng" in fv.danh_gia_quay_dau(nghieng)["reason"]  # không có khung nhìn thẳng


def test_thang_diem_hien_thi():
    assert fv.similarity_percent(0.20) == 0.0 and fv.similarity_percent(0.55) == 100.0
    assert fv.similarity_percent(0.445) == pytest.approx(fv.NGUONG_KHOP_PCT, abs=0.01)


# ─── Endpoint: khóa nội bộ và kiểm tra đầu vào ────────────────────────
@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    import main
    return TestClient(main.app)


def test_khoa_noi_bo(client):
    assert client.get("/health").status_code == 200
    assert client.post("/triage-classify", json={"text": "ho"}).status_code == 401
    assert client.post("/triage-classify", json={"text": "ho"}, headers={"x-internal-key": "sai"}).status_code == 401


def test_kiem_tra_dau_vao(client):
    khoa = {"x-internal-key": "test-key"}
    assert client.post("/forecast", json={"horizon": 99}, headers=khoa).status_code == 422
    assert client.post("/verify-face", json={"ref_embedding": [0.1], "frames_b64": ["x"]}, headers=khoa).status_code == 422
    assert client.post("/triage-classify", json={"text": "ho"}, headers=khoa).status_code == 503  # chưa huấn luyện xong
