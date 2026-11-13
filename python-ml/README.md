Hệ thống gồm các thành phần sau. Bạn mở từng cửa sổ Terminal (PowerShell / Command Prompt) tương ứng để khởi chạy:

1. Cơ sở dữ liệu (MySQL)
Đảm bảo MySQL đang chạy (qua XAMPP, Laragon hoặc MySQL Windows Service) trên cổng mặc định 3306.
2. Backend chính (NestJS API - Port 5000)

Mở Terminal 1:

powershell
cd d:\KLTN\backend
npm run start:dev
Địa chỉ: http://localhost:5000
Swagger API Docs: http://localhost:5000/api/docs
3. Frontend (React / Vite - Port 3000)

Mở Terminal 2:

powershell
cd d:\KLTN\frontend
npm run dev
Giao diện Web: http://localhost:3000
4. Dịch vụ Trợ lý AI (Clinical RAG & AI Service - Port 5002)

Mở Terminal 3:

powershell
cd d:\KLTN\ai-service
npm run start:dev
Địa chỉ: http://localhost:5002
Swagger Docs: http://localhost:5002/api/docs
5. Dịch vụ Medicare Office (Chat & Realtime Collaboration - Port 5003)

Mở Terminal 4:

powershell
cd d:\KLTN\office-service
npm run start:dev
Địa chỉ: http://localhost:5003
6. Dịch vụ Python ML (Dự báo lượt khám, phân loại chuyên khoa, nhận diện khuôn mặt - Port 5001)

Mở Terminal 5:

powershell
cd d:\KLTN\python-ml
.\venv\Scripts\activate
uvicorn main:app --reload --port 5001
Địa chỉ: http://localhost:5001
(Nếu dịch vụ Python không chạy: dự báo dùng trung bình theo thứ, phân loại chuyên khoa chuyển sang Gemini; chấm công khuôn mặt tạm không dùng được).
# 🐍 Python ML Service

Dịch vụ nội bộ, chỉ backend và ai-service gọi (header `x-internal-key`).

## Cấu trúc

```
python-ml/
├── main.py                     # FastAPI app (Port 5001): xác thực khóa nội bộ, các endpoint
├── requirements.txt
├── .env                        # DB_* và AI_INTERNAL_KEY
├── data/triage_seed.csv        # Mẫu huấn luyện phân loại chuyên khoa (soạn tay)
└── services/
    ├── forecaster.py           # Holt-Winters + phân tích pattern
    ├── triage_classifier.py    # TF-IDF ký tự + Logistic Regression
    └── face_verifier.py        # InsightFace: so khớp khuôn mặt chấm công
```

## Cài đặt

```bash
cd d:\KLTN\python-ml
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

## Biến môi trường

| Biến | Ý nghĩa |
|------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Kết nối MySQL (chỉ đọc) |
| `AI_INTERNAL_KEY` | Cùng giá trị với backend và ai-service. Không đặt → service mở cho mọi nguồn gọi (chỉ nên dùng khi chạy local) |

## API Endpoints

Mọi endpoint trừ `/health` yêu cầu header `x-internal-key`.

| Method | URL | Mô tả | Nơi gọi |
|--------|-----|-------|---------|
| GET | `/health` | Kiểm tra / đánh thức service | Render, backend |
| POST | `/forecast` | Dự báo lưu lượng bệnh nhân | ai-service |
| POST | `/triage-classify` | Phân loại chuyên khoa từ triệu chứng | ai-service |
| GET | `/triage-classify/info` | Số mẫu và độ chính xác cross-validation | — |
| POST | `/triage-classify/retrain` | Huấn luyện lại ngay | — |
| POST | `/verify-face` | So khớp khuôn mặt chấm công với ảnh mẫu | backend |
| POST | `/check-duplicate-face` | Kiểm tra ảnh đại diện hợp lệ và không trùng | backend |

```bash
curl -X POST http://localhost:5001/forecast \
  -H "Content-Type: application/json" -H "x-internal-key: <khóa>" \
  -d '{"horizon": 7, "history_days": 90}'
```

## Thuật toán

### Dự báo lưu lượng (`/forecast`)
- Chuỗi lượt tiếp nhận theo ngày, liên tục đến hôm qua (ngày không có lượt = 0, không gồm hôm nay), giờ Việt Nam.
- **Holt-Winters** cộng tính, chu kỳ 7 ngày, xu hướng có giảm chấn. Kết quả là đầu ra thật của mô hình.
- **Khoảng tin cậy 95%** = dự báo ± 1.96 × độ lệch chuẩn phần dư.
- **MAPE** đo ngoài mẫu: giấu 7 ngày cuối, huấn luyện trên phần còn lại, tính trên các ngày có lượt khám.
  Trả kèm `mape_naive` (lấy đúng thứ đó của tuần trước) làm mốc so sánh. Chưa đủ 28 ngày → `null`.
- Không dự báo (`status: insufficient_data`) khi chưa đủ 21 ngày hoặc 7 ngày gần nhất không có lượt nào.
- Ngày lễ (gồm Tết âm lịch, Giỗ Tổ đến 2028) chỉ được gắn nhãn; mô hình chưa học hiệu ứng nghỉ lễ.
- Mô hình fit 1 lần/ngày rồi cache; số liệu trong ngày (heatmap, tổng hôm nay) luôn truy vấn mới.

### Phân loại chuyên khoa (`/triage-classify`)
- TF-IDF n-gram ký tự (2-4, đã bỏ dấu) + Logistic Regression, 11 lớp (10 khoa + `KHAC` = không phải triệu chứng).
- Huấn luyện ở luồng nền lúc khởi động và mỗi 6 giờ: mẫu seed + câu hỏi đã được Gemini gán nhãn trong `ai_cau_tra_loi_cache`.
- Độ chính xác đo bằng 5-fold cross-validation trên mẫu seed (~72% với 337 mẫu). ai-service chỉ dùng kết quả khi
  xác suất ≥ 0.7 (khi đó ~94% đúng), còn lại chuyển Gemini.

### Khuôn mặt (`/verify-face`, `/check-duplicate-face`)
- InsightFace `buffalo_sc`, so cosine giữa embedding ArcFace; ngưỡng chấp nhận cosine ≥ 0.445 (hiển thị 70%).
- Có kiểm tra chất lượng khung hình (đủ nét, có mặt, mặt đủ lớn). **Chưa có chống giả mạo** (ảnh/video phát lại).
