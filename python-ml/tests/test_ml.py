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


# ─── Thử thách nháy mắt (khuôn mặt dựng từ 5 + 106 điểm mốc) ──────────
EMB = np.random.default_rng(1).normal(size=512).astype(np.float32)


def mat_gia(mo=1.0, lech_mui=0.0, co_doc=1.0, xoay_do=0.0, embedding=EMB):
    """`mo`: độ mở mắt (1 = mở, ~0.3 = nhắm). `co_doc`, `xoay_do`: nghiêng / xoay cả khuôn mặt như một tấm ảnh phẳng."""
    kps = np.array([[-30, 0], [30, 0], [60 * lech_mui, 35], [-22, 70], [22, 70]], dtype=np.float32)
    lmk = np.zeros((106, 2), dtype=np.float32)
    for (tren, duoi), dx in zip(fv.CAP_MI_MAT, [-6, 0, 6, -6, 0, 6]):
        cx = -30 if tren < 87 else 30
        lmk[tren], lmk[duoi] = [cx + dx, -4 * mo], [cx + dx, 4 * mo]
    lmk[list(fv.TAM_MAT)] = [[-30, 0], [30, 0]]
    lmk[list(fv.KHOE_MIENG)] = [[-22, 70], [22, 70]]
    goc = np.radians(xoay_do)
    bien_doi = np.array([[np.cos(goc), -np.sin(goc)], [np.sin(goc), np.cos(goc)]]) @ np.diag([1.0, co_doc])
    return SimpleNamespace(kps=kps @ bien_doi.T + [320, 200], landmark_2d_106=lmk @ bien_doi.T + [320, 200],
                           embedding=embedding, det_score=0.9, bbox=np.array([240, 120, 400, 320]))


def danh_gia(faces):
    return fv.danh_gia_nhay_mat(faces, embedding=lambda f: f.embedding)


def chuoi_mat(mo, lech=None):
    lech = lech or [0.0] * len(mo)
    return [(i, mat_gia(m, l)) for i, (m, l) in enumerate(zip(mo, lech))]


def nguoi_that_nhay_mat():
    return chuoi_mat([1.0, 0.98, 1.0, 0.6, 0.25, 0.7, 1.0, 0.97, 1.0, 1.0],
                 [0.12, 0.1, 0.02, 0.0, 0.0, 0.01, 0.05, 0.08, 0.1, 0.1])


def test_nguoi_that_nhay_mat_thi_dat_va_chon_khung_mo_mat_nhin_thang():
    kq = danh_gia(nguoi_that_nhay_mat())
    assert kq["ok"] and kq["frame_index"] == 2 and kq["ti_le_nhay_mat"] <= fv.NGUONG_NHAM_MAT


def test_anh_phang_nghieng_xoay_bi_tu_choi():
    phang = [(i, mat_gia(1.0, 0.0, c, x)) for i, (c, x) in
             enumerate(zip([1, 0.95, 0.8, 0.6, 0.5, 0.6, 0.8, 0.9, 1, 1], [0, 5, 10, 20, 30, 20, -10, -20, 0, 0]))]
    kq = danh_gia(phang)
    assert not kq["ok"] and kq["ti_le_nhay_mat"] > 0.95 and "Chưa nhận thấy nháy mắt" in kq["reason"]


def test_nham_mat_khong_phai_nhay_mat():
    # Nhắm mắt lâu (> SO_KHUNG_NHAM_TOI_DA khung) rồi mới mở
    lau = danh_gia(chuoi_mat([1, 1, 1, 0.3, 0.25, 0.2, 0.2, 0.25, 0.3, 0.3, 1, 1]))
    assert not lau["ok"] and "không nhắm mắt lâu" in lau["reason"]
    # Nhắm mắt đến hết lượt quét, không mở lại
    khong_mo_lai = danh_gia(chuoi_mat([1, 1, 1, 1, 1, 0.9, 0.5, 0.25, 0.2, 0.2]))
    assert not khong_mo_lai["ok"] and "không nhắm mắt lâu" in khong_mo_lai["reason"]
    # Nhắm sẵn từ đầu rồi mở ra
    mo_ra = danh_gia(chuoi_mat([0.2, 0.2, 0.3, 1, 1, 1, 1, 1, 1, 1]))
    assert not mo_ra["ok"]


def test_khung_mat_mat_giua_lan_nhay_tinh_theo_vi_tri_goc():
    # Khung 4..8 mất mặt: khoảng nhắm giữa hai khung mở dài 6 khung gốc → không tính là nháy mắt
    faces = [f for f in chuoi_mat([1, 1, 1, 1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1, 1, 1]) if f[0] not in (5, 6, 7, 8)]
    assert not danh_gia(faces)["ok"]


def test_cac_truong_hop_tu_choi_khac():
    assert not danh_gia(nguoi_that_nhay_mat()[:5])["ok"]  # thiếu khung hình
    nguoi_khac = np.random.default_rng(2).normal(size=512).astype(np.float32)
    trao = nguoi_that_nhay_mat()
    trao[4] = (4, mat_gia(0.25, 0.0, embedding=nguoi_khac))
    assert "thay đổi" in danh_gia(trao)["reason"]  # khung nhắm mắt là người khác
    nghieng = [(i, mat_gia(m, 0.4)) for i, (m, _) in enumerate(nguoi_that_nhay_mat())]
    assert "nhìn thẳng" in danh_gia(nghieng)["reason"]  # không có khung nhìn thẳng


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
