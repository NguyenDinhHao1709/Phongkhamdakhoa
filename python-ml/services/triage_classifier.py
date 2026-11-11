"""
triage_classifier.py — Bộ phân loại chuyên khoa từ mô tả triệu chứng
TF-IDF n-gram ký tự (đã bỏ dấu, chịu được gõ không dấu/sai chính tả) + Logistic Regression.

Dữ liệu huấn luyện:
  1. data/triage_seed.csv — mẫu chuẩn soạn sẵn
  2. Bảng ai_cau_tra_loi_cache — câu hỏi thật đã được Gemini gán chuyên khoa
     → dùng càng lâu, mô hình càng học được nhiều, càng ít phải gọi Gemini.
Tự huấn luyện lại sau RETRAIN_SECONDS để nạp dữ liệu mới.
"""
import csv
import os
import threading
import time
import unicodedata

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline

SEED_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "triage_seed.csv")
RETRAIN_SECONDS = 6 * 3600
MA_KHOA = {"NHI", "HH_TMH", "CAP_CUU", "TIM", "TH", "TK", "CXK", "DA", "MAT", "NOI"}


def bo_dau(text: str) -> str:
    s = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


class TriageClassifier:
    def __init__(self, loader):
        self.loader = loader
        self.model = None
        self.trained_at = 0.0
        self.lock = threading.Lock()

    def _load_data(self):
        with open(SEED_PATH, encoding="utf-8") as f:
            rows = [(r["text"], r["ma_khoa"]) for r in csv.DictReader(f)]
        try:
            conn = self.loader.get_connection()
            cur = conn.cursor()
            cur.execute("SELECT cau_hoi_goc, ma_khoa FROM ai_cau_tra_loi_cache WHERE ma_khoa IS NOT NULL")
            rows += cur.fetchall()
            conn.close()
        except Exception as e:
            print(f"[triage] Skip training data from ai_cau_tra_loi_cache: {e}")
        rows = [(t, m) for t, m in rows if t and m in MA_KHOA]
        return [t for t, _ in rows], [m for _, m in rows]

    def train(self):
        texts, labels = self._load_data()
        model = make_pipeline(
            TfidfVectorizer(preprocessor=bo_dau, analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True),
            LogisticRegression(max_iter=2000, C=20),
        )
        model.fit(texts, labels)
        self.model, self.trained_at = model, time.time()
        return {"so_mau": len(texts), "so_khoa": len(set(labels))}

    def predict(self, text: str):
        with self.lock:
            if self.model is None or time.time() - self.trained_at > RETRAIN_SECONDS:
                self.train()
        proba = self.model.predict_proba([text])[0]
        i = int(proba.argmax())
        return {"ma_khoa": str(self.model.classes_[i]), "xac_suat": round(float(proba[i]), 3)}
