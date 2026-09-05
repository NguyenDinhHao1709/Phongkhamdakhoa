"""
forecaster.py — ML Engine cho Dự Báo Lưu Lượng Bệnh Nhân
Sử dụng: Holt-Winters Exponential Smoothing + STL Decomposition
"""
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

import mysql.connector
from dotenv import load_dotenv
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.seasonal import seasonal_decompose

load_dotenv()

# ─── Ngày lễ Việt Nam (cố định hàng năm) ─────────────────────────────
NGAY_LE_VN = {
    "01-01": "Tết Dương lịch",
    "04-30": "Ngày giải phóng 30/4",
    "05-01": "Quốc tế Lao động 1/5",
    "09-02": "Quốc khánh 2/9",
}

# ─── Database Loader ───────────────────────────────────────────────────
class DataLoader:
    def __init__(self):
        self.config = {
            "host":     os.getenv("DB_HOST", "localhost"),
            "port":     int(os.getenv("DB_PORT", 3306)),
            "database": os.getenv("DB_NAME", "phong_kham"),
            "user":     os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASSWORD", ""),
        }

    def get_connection(self):
        return mysql.connector.connect(**self.config)

    def load_daily_counts(self, days: int = 90) -> pd.DataFrame:
        """Lấy dữ liệu lượt khám theo ngày trong N ngày gần nhất."""
        conn = self.get_connection()
        try:
            query = """
                SELECT
                    DATE(thoi_gian_den) AS ngay,
                    COUNT(*) AS so_luong
                FROM luot_tiep_nhan
                WHERE
                    thoi_gian_den >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                    AND trang_thai != 'da_huy'
                GROUP BY DATE(thoi_gian_den)
                ORDER BY ngay ASC
            """
            df = pd.read_sql(query, conn, params=(days,))
            df["ngay"] = pd.to_datetime(df["ngay"])
            df = df.set_index("ngay")
            df["so_luong"] = pd.to_numeric(df["so_luong"])
            return df
        finally:
            conn.close()

    def load_hourly_today(self) -> pd.DataFrame:
        """Lấy phân bố lượt khám theo giờ trong hôm nay."""
        conn = self.get_connection()
        try:
            query = """
                SELECT
                    HOUR(thoi_gian_den) AS gio,
                    COUNT(*) AS so_luong
                FROM luot_tiep_nhan
                WHERE DATE(thoi_gian_den) = CURDATE()
                    AND trang_thai != 'da_huy'
                GROUP BY HOUR(thoi_gian_den)
                ORDER BY gio ASC
            """
            df = pd.read_sql(query, conn)
            return df
        finally:
            conn.close()

    def load_stats_summary(self, days: int = 60) -> Dict[str, Any]:
        """Lấy các chỉ số tổng hợp."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT
                    COUNT(*) AS tong_luot,
                    COUNT(DISTINCT DATE(thoi_gian_den)) AS so_ngay,
                    SUM(CASE WHEN trang_thai = 'hoan_thanh' THEN 1 ELSE 0 END) AS hoan_thanh,
                    SUM(CASE WHEN trang_thai = 'da_huy' THEN 1 ELSE 0 END) AS huy
                FROM luot_tiep_nhan
                WHERE thoi_gian_den >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            """, (days,))
            row = cursor.fetchone()
            cursor.close()
            return row or {}
        finally:
            conn.close()


# ─── Forecaster Engine ─────────────────────────────────────────────────
class HoltWintersForecaster:
    """
    Dự báo chuỗi thời gian bệnh nhân bằng Holt-Winters Exponential Smoothing
    với seasonal_period=7 (tuần).
    """
    SEASONAL_PERIOD = 7  # Chu kỳ 7 ngày (1 tuần)
    MIN_HISTORY_DAYS = 21  # Cần ít nhất 3 tuần dữ liệu

    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self._fill_missing_dates()

    def _fill_missing_dates(self):
        """Điền các ngày bị thiếu (VD: chủ nhật đóng cửa) bằng giá trị tối thiểu."""
        if self.df.empty:
            return
        full_idx = pd.date_range(
            start=self.df.index.min(),
            end=self.df.index.max(),
            freq="D"
        )
        self.df = self.df.reindex(full_idx)
        # Ngày thiếu điền 0 hoặc mean của ngày cùng thứ trong tuần
        for i, idx in enumerate(self.df.index):
            if pd.isna(self.df.loc[idx, "so_luong"]):
                dow = idx.dayofweek
                same_dow = self.df[self.df.index.dayofweek == dow]["so_luong"].dropna()
                self.df.loc[idx, "so_luong"] = same_dow.mean() if len(same_dow) > 0 else 0

    def can_forecast(self) -> bool:
        valid = self.df["so_luong"].dropna()
        return len(valid) >= self.MIN_HISTORY_DAYS

    def forecast(self, horizon: int = 7) -> List[Dict[str, Any]]:
        """Trả về dự báo `horizon` ngày tới với confidence interval."""
        series = self.df["so_luong"].dropna()

        if not self.can_forecast():
            return self._simple_fallback(horizon)

        try:
            model = ExponentialSmoothing(
                series,
                trend="add",
                seasonal="add",
                seasonal_periods=self.SEASONAL_PERIOD,
                initialization_method="estimated",
            )
            fit = model.fit(optimized=True, use_brute=False)

            forecast_values = fit.forecast(horizon)
            # Tính residual std để xây dựng confidence interval (95%)
            residuals = fit.resid
            sigma = residuals.std()
            z_95 = 1.96

            results = []
            start_date = self.df.index.max() + timedelta(days=1)
            for i in range(horizon):
                ngay = start_date + timedelta(days=i)
                val = max(0, round(float(forecast_values.iloc[i])))
                ci_low = max(0, round(val - z_95 * sigma))
                ci_high = round(val + z_95 * sigma)
                thu = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][ngay.weekday() % 7]
                if ngay.weekday() == 6:
                    thu = "CN"
                muc_do = "cao" if val >= 60 else ("trung_binh" if val >= 30 else "thap")
                is_holiday = ngay.strftime("%m-%d") in NGAY_LE_VN
                results.append({
                    "ngay": ngay.strftime("%Y-%m-%d"),
                    "thu": thu,
                    "du_bao": val,
                    "ci_thap": ci_low,
                    "ci_cao": ci_high,
                    "muc_do": muc_do,
                    "is_ngay_le": is_holiday,
                    "ten_ngay_le": NGAY_LE_VN.get(ngay.strftime("%m-%d"), None),
                    "goi_y_nhan_su": self._suggest_staffing(val, muc_do, is_holiday),
                })
            return results

        except Exception as e:
            print(f"[HoltWinters Error] {e}, falling back to simple average")
            return self._simple_fallback(horizon)

    def _simple_fallback(self, horizon: int) -> List[Dict[str, Any]]:
        """Fallback: weighted moving average khi không đủ dữ liệu."""
        series = self.df["so_luong"].dropna()
        avg = int(series.tail(7).mean()) if len(series) >= 7 else int(series.mean()) if len(series) > 0 else 20
        weekly_avg: Dict[int, float] = {}
        for dow in range(7):
            subset = series[series.index.dayofweek == dow]
            weekly_avg[dow] = subset.mean() if len(subset) > 0 else avg

        results = []
        start_date = (self.df.index.max() if not self.df.empty else datetime.today()) + timedelta(days=1)
        for i in range(horizon):
            ngay = start_date + timedelta(days=i)
            dow = ngay.weekday()
            val = max(0, round(avg * 0.7 + weekly_avg.get(dow, avg) * 0.3))
            muc_do = "cao" if val >= 60 else ("trung_binh" if val >= 30 else "thap")
            results.append({
                "ngay": ngay.strftime("%Y-%m-%d"),
                "thu": ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][dow],
                "du_bao": val,
                "ci_thap": max(0, val - 5),
                "ci_cao": val + 5,
                "muc_do": muc_do,
                "is_ngay_le": False,
                "ten_ngay_le": None,
                "goi_y_nhan_su": self._suggest_staffing(val, muc_do, False),
            })
        return results

    def _suggest_staffing(self, val: int, muc_do: str, is_holiday: bool) -> str:
        if is_holiday:
            return f"Ngày lễ — dự báo ~{val} bệnh nhân, bố trí ca trực tối thiểu, chuẩn bị kích hoạt nhanh khi cần"
        if muc_do == "cao":
            return f"Ngày đông (~{val} bệnh nhân) — tăng cường 1-2 bác sĩ, mở thêm quầy tiếp nhận"
        elif muc_do == "trung_binh":
            return f"Lưu lượng bình thường (~{val} bệnh nhân) — nhân sự hiện tại phù hợp"
        else:
            return f"Ngày ít bệnh nhân (~{val}) — có thể điều phối nhân sự linh hoạt hoặc bố trí tập huấn"

    def mape(self) -> Optional[float]:
        """Tính MAPE (Mean Absolute Percentage Error) trên tập train."""
        series = self.df["so_luong"].dropna()
        if len(series) < self.MIN_HISTORY_DAYS:
            return None
        try:
            # Walk-forward validation: dự báo 7 ngày cuối
            train = series.iloc[:-7]
            test = series.iloc[-7:]
            model = ExponentialSmoothing(
                train, trend="add", seasonal="add",
                seasonal_periods=self.SEASONAL_PERIOD,
                initialization_method="estimated"
            )
            fit = model.fit(optimized=True, use_brute=False)
            pred = fit.forecast(7)
            errors = np.abs((test.values - pred.values) / np.maximum(test.values, 1)) * 100
            return round(float(errors.mean()), 1)
        except Exception:
            return None


# ─── Pattern Analyzer ──────────────────────────────────────────────────
class PatternAnalyzer:
    """Phân tích các pattern: giờ cao điểm, thứ đông nhất, xu hướng dài hạn."""

    def __init__(self, df: pd.DataFrame):
        self.df = df

    def analyze_weekly_pattern(self) -> Dict[str, Any]:
        """Phân bố theo thứ trong tuần."""
        if self.df.empty:
            return {}
        self.df["thu"] = self.df.index.dayofweek
        weekly = self.df.groupby("thu")["so_luong"].mean().round(1)
        labels = {0: "T2", 1: "T3", 2: "T4", 3: "T5", 4: "T6", 5: "T7", 6: "CN"}
        dong_nhat = int(weekly.idxmax())
        it_nhat = int(weekly.idxmin())
        return {
            "phan_bo": [
                {"thu": labels.get(i, str(i)), "trung_binh": round(float(weekly.get(i, 0)), 1)}
                for i in range(7)
            ],
            "dong_nhat": labels.get(dong_nhat, "?"),
            "it_nhat": labels.get(it_nhat, "?"),
            "ty_le_dong_it": round(float(weekly.max() / max(weekly.min(), 1)), 2),
        }

    def analyze_trend(self) -> Dict[str, Any]:
        """Phân tích xu hướng tăng/giảm 30 ngày qua."""
        if len(self.df) < 14:
            return {"xu_huong": "khong_du_du_lieu"}
        recent = self.df["so_luong"].tail(30).fillna(0)
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
            "delta_pct": round(delta_pct, 1),
            "mo_ta": mo_ta,
            "trung_binh_30_ngay": round(float(recent.mean()), 1),
        }

    def analyze_decomposition(self) -> Optional[Dict[str, Any]]:
        """STL-style phân rã: trend + seasonal + residual."""
        series = self.df["so_luong"].dropna()
        if len(series) < 14:
            return None
        try:
            result = seasonal_decompose(series, model="additive", period=7, extrapolate_trend="freq")
            trend_vals = result.trend.dropna()
            return {
                "trend_cuoi": round(float(trend_vals.iloc[-1]), 1),
                "trend_dau": round(float(trend_vals.iloc[0]), 1),
                "seasonal_amplitude": round(float(result.seasonal.max() - result.seasonal.min()), 1),
            }
        except Exception:
            return None

