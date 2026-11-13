"""
triage_classifier.py — Bộ phân loại chuyên khoa từ mô tả triệu chứng
TF-IDF n-gram ký tự (đã bỏ dấu, chịu được gõ không dấu/sai chính tả) + Logistic Regression.

Dữ liệu huấn luyện:
  1. data/triage_seed.csv — mẫu chuẩn soạn tay (nhãn đáng tin, dùng để đánh giá cross-validation)
  2. Bảng ai_cau_tra_loi_cache — câu hỏi thật đã được Gemini gán chuyên khoa (nhãn máy, chỉ dùng để học thêm)
Lớp KHAC = câu không phải mô tả triệu chứng (hỏi giá, giờ mở cửa, chào hỏi...) → nơi gọi chuyển cho Gemini.
Huấn luyện chạy ở luồng nền (lúc khởi động + mỗi RETRAIN_SECONDS), không chặn request của người dùng.
"""
import csv
import os
import threading
import time
import unicodedata

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

SEED_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "triage_seed.csv")
RETRAIN_SECONDS = 6 * 3600
MA_KHOA = {"NHI", "HH_TMH", "CAP_CUU", "TIM", "TH", "TK", "CXK", "DA", "MAT", "NOI", "KHAC"}


def bo_dau(text: str) -> str:
    s = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def tao_pipeline():
    return make_pipeline(
        TfidfVectorizer(preprocessor=bo_dau, analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True),
        LogisticRegression(max_iter=2000, C=20),
    )


class TriageClassifier:
    def __init__(self, loader):
        self.loader = loader
        self.model = None
        self.info = None

    def _load_seed(self):
        with open(SEED_PATH, encoding="utf-8") as f:
            return [(r["text"], r["ma_khoa"]) for r in csv.DictReader(f)]

    def _load_cache(self):
        try:
            conn = self.loader.get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT cau_hoi_goc, ma_khoa FROM ai_cau_tra_loi_cache WHERE ma_khoa IS NOT NULL")
                return [(t, m) for t, m in cur.fetchall() if t and m in MA_KHOA]
            finally:
                conn.close()
        except Exception as e:
            print(f"[triage] Bỏ qua dữ liệu ai_cau_tra_loi_cache: {e}")
            return []

    def train(self):
        seed = self._load_seed()
        rows = seed + self._load_cache()
        # Độ chính xác đo bằng 5-fold cross-validation, chỉ trên mẫu soạn tay (nhãn đáng tin)
        cv = cross_val_score(tao_pipeline(), [t for t, _ in seed], [m for _, m in seed], cv=5)
        model = tao_pipeline().fit([t for t, _ in rows], [m for _, m in rows])
        self.model = model
        self.info = {
            "so_mau": len(rows),
            "so_mau_seed": len(seed),
            "so_khoa": len(model.classes_),
            "cv_accuracy_seed": round(float(cv.mean()), 3),
        }
        print(f"[triage] Đã huấn luyện: {self.info}")
        return self.info

    def train_forever(self):
        """Vòng lặp luồng nền: huấn luyện ngay rồi nạp dữ liệu mới định kỳ."""
        while True:
            try:
                self.train()
            except Exception as e:
                print(f"[triage] Huấn luyện lỗi: {e}")
            time.sleep(RETRAIN_SECONDS)

    def start(self):
        threading.Thread(target=self.train_forever, daemon=True).start()

    def predict(self, text: str):
        """Trả về None khi mô hình chưa huấn luyện xong (vài giây đầu sau khi khởi động)."""
        model = self.model
        if model is None:
            return None
        proba = model.predict_proba([text])[0]
        i = int(proba.argmax())
        return {"ma_khoa": str(model.classes_[i]), "xac_suat": round(float(proba[i]), 3)}
