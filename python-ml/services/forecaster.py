"""
forecaster.py — Dự báo lưu lượng bệnh nhân
Holt-Winters Exponential Smoothing (chu kỳ tuần) + phân rã mùa vụ.
"""
import os
import numpy as np
import pandas as pd
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple

import mysql.connector
from dotenv import load_dotenv
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.seasonal import seasonal_decompose

load_dotenv()

# Múi giờ Việt Nam: backend lưu thoi_gian_den theo giờ +07:00, server chạy UTC
VN_TZ = timezone(timedelta(hours=7))


def today_vn() -> date:
    return datetime.now(VN_TZ).date()


# ─── Ngày lễ Việt Nam ─────────────────────────────────────────────────
# Mô hình CHƯA học hiệu ứng ngày lễ (chưa đủ 1 năm dữ liệu) — chỉ gắn nhãn để người xem lưu ý.
NGAY_LE_DUONG_LICH = {
    "01-01": "Tết Dương lịch",
    "04-30": "Ngày giải phóng 30/4",
    "05-01": "Quốc tế Lao động 1/5",
    "09-02": "Quốc khánh 2/9",
}
# Lễ âm lịch đổi ngày mỗi năm: mùng 1 Tết và Giỗ Tổ 10/3
TET_MUNG_1 = [date(2026, 2, 17), date(2027, 2, 6), date(2028, 1, 26)]
GIO_TO = [date(2026, 4, 26), date(2027, 4, 16), date(2028, 4, 4)]


def ten_ngay_le(ngay: date) -> Optional[str]:
    for mung_1 in TET_MUNG_1:
        if -2 <= (ngay - mung_1).days <= 4:  # 29 Tết → mùng 5
            return "Tết Nguyên đán"
    if ngay in GIO_TO:
        return "Giỗ Tổ Hùng Vương"
    return NGAY_LE_DUONG_LICH.get(ngay.strftime("%m-%d"))


# ─── Database Loader ───────────────────────────────────────────────────
class DataLoader:
    def __init__(self):
        self.config = {
            "host":     os.getenv("DB_HOST", "localhost"),
            "port":     int(os.getenv("DB_PORT", 3306)),
            "database": os.getenv("DB_NAME", "phong_kham"),
            "user":     os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASSWORD", ""),
            "time_zone": "+07:00",  # CURDATE()/NOW() theo giờ Việt Nam
        }

    def get_connection(self):
        return mysql.connector.connect(**self.config)

    def _query(self, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            conn.close()

    def load_daily_counts(self, days: int = 90) -> pd.DataFrame:
        """
        Lượt tiếp nhận theo ngày trong N ngày gần nhất, KHÔNG gồm hôm nay (ngày chưa kết thúc).
        Chuỗi liên tục đến hôm qua; ngày không có lượt nào = 0 (giữ đúng chu kỳ tuần).
        """
        rows = self._query("""
            SELECT DATE(thoi_gian_den) AS ngay, COUNT(*) AS so_luong
            FROM luot_tiep_nhan
            WHERE thoi_gian_den >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                AND thoi_gian_den < CURDATE()
                AND trang_thai != 'da_huy'
            GROUP BY DATE(thoi_gian_den)
            ORDER BY ngay ASC
        """, (days,))
        df = pd.DataFrame(rows, columns=["ngay", "so_luong"])
        df["ngay"] = pd.to_datetime(df["ngay"])
        df["so_luong"] = df["so_luong"].astype(float)
        df = df.set_index("ngay")
        if df.empty:
            return df
        full_idx = pd.date_range(df.index.min(), pd.Timestamp(today_vn() - timedelta(days=1)), freq="D")
        return df.reindex(full_idx, fill_value=0.0)

    def load_hourly(self) -> Tuple[Dict[int, int], str]:
        """
        Phân bố lượt tiếp nhận theo giờ. Trả về ({giờ: số lượt}, nguồn):
        'hom_nay' nếu hôm nay đã có ≥ 5 lượt, ngược lại 'trung_binh_lich_su' (trung bình thật mỗi ngày).
        """
        rows = self._query("""
            SELECT HOUR(thoi_gian_den) AS gio, COUNT(*) AS so_luong
            FROM luot_tiep_nhan
            WHERE DATE(thoi_gian_den) = CURDATE() AND trang_thai != 'da_huy'
            GROUP BY HOUR(thoi_gian_den)
        """)
        if sum(int(r["so_luong"]) for r in rows) >= 5:
            return {int(r["gio"]): int(r["so_luong"]) for r in rows}, "hom_nay"
        rows = self._query("""
            SELECT HOUR(thoi_gian_den) AS gio,
                   ROUND(COUNT(*) / (SELECT COUNT(DISTINCT DATE(thoi_gian_den)) FROM luot_tiep_nhan
                                     WHERE trang_thai != 'da_huy')) AS so_luong
            FROM luot_tiep_nhan
            WHERE trang_thai != 'da_huy'
            GROUP BY HOUR(thoi_gian_den)
        """)
        return {int(r["gio"]): int(r["so_luong"] or 0) for r in rows}, "trung_binh_lich_su"

    def load_today_total(self) -> int:
        rows = self._query("""
            SELECT COUNT(*) AS tong FROM luot_tiep_nhan
            WHERE DATE(thoi_gian_den) = CURDATE() AND trang_thai != 'da_huy'
        """)
        return int(rows[0]["tong"])


# ─── Forecaster Engine ─────────────────────────────────────────────────
class HoltWintersForecaster:
    """
    Holt-Winters cộng tính, chu kỳ 7 ngày, xu hướng có giảm chấn.
    Kết quả là đầu ra thật của mô hình — không pha trộn hằng số, không chặn trần sai số.
    """
    SEASONAL_PERIOD = 7
    MIN_HISTORY_DAYS = 21  # tối thiểu 3 chu kỳ tuần
    BACKTEST_DAYS = 7

    def __init__(self, df: pd.DataFrame):
        self.series = df["so_luong"]

    def can_forecast(self) -> bool:
        return len(self.series) >= self.MIN_HISTORY_DAYS

    def _fit(self, series: pd.Series):
        return ExponentialSmoothing(
            series,
            trend="add",
            damped_trend=True,
            seasonal="add",
            seasonal_periods=self.SEASONAL_PERIOD,
            initialization_method="estimated",
        ).fit()

    def forecast(self, horizon: int = 7) -> List[Dict[str, Any]]:
        """Dự báo `horizon` ngày kể từ ngày mai, kèm khoảng tin cậy 95% từ phần dư của mô hình."""
        if not self.can_forecast():
            return []
        fit = self._fit(self.series)
        # Chuỗi kết thúc hôm qua → bước 1 là hôm nay (bỏ), lấy từ ngày mai
        values = fit.forecast(horizon + 1).iloc[1:]
        margin = 1.96 * float(fit.resid.std())

        THU_MAP = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        results = []
        for ts, raw in values.items():
            ngay = ts.date()
            val = max(0, round(float(raw)))
            muc_do = "cao" if val >= 50 else ("trung_binh" if val >= 35 else "thap")
            le = ten_ngay_le(ngay)
            results.append({
                "ngay": ngay.strftime("%Y-%m-%d"),
                "thu": THU_MAP[ngay.weekday()],
                "du_bao": val,
                "ci_thap": max(0, round(float(raw) - margin)),
                "ci_cao": max(0, round(float(raw) + margin)),
                "muc_do": muc_do,
                "is_ngay_le": le is not None,
                "ten_ngay_le": le,
                "goi_y_nhan_su": self._suggest_staffing(val, muc_do, le is not None),
            })
        return results

    def _suggest_staffing(self, val: int, muc_do: str, is_holiday: bool) -> str:
        if is_holiday:
            return f"Ngày lễ — mô hình dự báo ~{val} ca nhưng chưa tính hiệu ứng nghỉ lễ. Bố trí kíp trực theo lịch nghỉ."
        if muc_do == "cao":
            return f"Ngày cao điểm (~{val} ca) — Bố trí 3 Bác sĩ + 4 Điều dưỡng để tránh ùn ứ tiếp đón"
        elif muc_do == "trung_binh":
            return f"Lưu lượng ổn định (~{val} ca) — Đội ngũ 2 Bác sĩ + 3 Điều dưỡng vận hành tiêu chuẩn"
        else:
            return f"Lưu lượng nhẹ (~{val} ca) — Bố trí 1-2 Bác sĩ, có thể kết hợp kiểm kê và đào tạo"

    def backtest(self) -> Optional[Dict[str, float]]:
        """
        Kiểm định ngoài mẫu: giấu 7 ngày cuối, huấn luyện trên phần còn lại rồi dự báo 7 ngày đó.
        MAPE tính trên các ngày có lượt khám (> 0). So với mốc "naive": lấy đúng thứ đó của tuần trước.
        Trả về None nếu chưa đủ dữ liệu để kiểm định.
        """
        if len(self.series) < self.MIN_HISTORY_DAYS + self.BACKTEST_DAYS:
            return None
        train = self.series.iloc[:-self.BACKTEST_DAYS]
        test = self.series.iloc[-self.BACKTEST_DAYS:].values
        co_luot = test > 0
        if not co_luot.any():
            return None
        pred = np.maximum(self._fit(train).forecast(self.BACKTEST_DAYS).values, 0)
        naive = train.iloc[-self.SEASONAL_PERIOD:].values

        def mape(du_bao: np.ndarray) -> float:
            return round(float((np.abs(test - du_bao)[co_luot] / test[co_luot]).mean() * 100), 1)

        return {"mape": mape(pred), "mape_naive": mape(naive)}


# ─── Pattern Analyzer ──────────────────────────────────────────────────
class PatternAnalyzer:
    """Phân tích pattern: thứ đông nhất, xu hướng, phân rã mùa vụ. Nhận chuỗi ngày liên tục."""

    def __init__(self, df: pd.DataFrame):
        self.series = df["so_luong"]

    def analyze_weekly_pattern(self) -> Dict[str, Any]:
        """Phân bố theo thứ trong tuần."""
        if self.series.empty:
            return {}
        weekly = self.series.groupby(self.series.index.dayofweek).mean().round(1)
        labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        return {
            "phan_bo": [{"thu": labels[i], "trung_binh": float(weekly.get(i, 0))} for i in range(7)],
            "dong_nhat": labels[int(weekly.idxmax())],
            "it_nhat": labels[int(weekly.idxmin())],
            "ty_le_dong_it": round(float(weekly.max() / max(weekly.min(), 1)), 2),
        }

    def analyze_trend(self) -> Dict[str, Any]:
        """So sánh 15 ngày gần nhất với 15 ngày trước đó."""
        if len(self.series) < 30:
            return {"xu_huong": "khong_du_du_lieu"}
        recent = self.series.tail(30)
        first_half = recent.iloc[:15].mean()
        second_half = recent.iloc[15:].mean()
        delta_pct = ((second_half - first_half) / max(first_half, 1)) * 100
        if delta_pct > 10:
            xu_huong = "tang"
            mo_ta = f"Lưu lượng bệnh nhân đang tăng ~{abs(delta_pct):.1f}% so với 2 tuần trước"
        elif delta_pct < -10:
            xu_huong = "giam"
            mo_ta = f"Lưu lượng bệnh nhân đang giảm ~{abs(delta_pct):.1f}% so với 2 tuần trước"
        else:
            xu_huong = "on_dinh"
            mo_ta = "Lưu lượng bệnh nhân ổn định trong 30 ngày qua"
        return {
            "xu_huong": xu_huong,
            "delta_pct": round(float(delta_pct), 1),
            "mo_ta": mo_ta,
            "trung_binh_30_ngay": round(float(recent.mean()), 1),
        }

    def analyze_decomposition(self) -> Optional[Dict[str, Any]]:
        """Phân rã cộng tính: trend + seasonal + residual."""
        if len(self.series) < 14:
            return None
        result = seasonal_decompose(self.series, model="additive", period=7, extrapolate_trend="freq")
        return {
            "trend_cuoi": round(float(result.trend.iloc[-1]), 1),
            "trend_dau": round(float(result.trend.iloc[0]), 1),
            "seasonal_amplitude": round(float(result.seasonal.max() - result.seasonal.min()), 1),
        }
