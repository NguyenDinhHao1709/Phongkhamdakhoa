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
├── scripts/calibrate_face_threshold.py   # Đo FRR/FAR của ngưỡng khuôn mặt trên dữ liệu thật
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
| POST | `/verify-face` | Thử thách nháy mắt + so khớp khuôn mặt chấm công với mẫu | backend |
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
- **Ngày lễ** (gồm Tết âm lịch, Giỗ Tổ đến 2028): hệ số = lượt khám ngày lễ / trung vị ngày thường cùng thứ ±4 tuần, học từ
  800 ngày lịch sử và nhân vào dự báo (`he_so_ngay_le`). Lễ chưa từng có trong dữ liệu thì chỉ gắn nhãn.
- **Mùa vụ / mùa dịch**: so với cùng kỳ năm trước (lùi 52 tuần) — mức quanh ngày được dự báo so với mức 4 tuần trước đó
  của năm ngoái; kẹp trong [0.7, 1.5], chênh dưới 10% thì bỏ qua (`he_so_mua_vu`). Cần hơn 13 tháng dữ liệu.
  Trên dữ liệu giả lập 2 năm, sai số lúc bước vào mùa cao giảm từ 12,2 xuống 3,1 lượt/ngày.
- **Theo chuyên khoa** (`theo_chuyen_khoa`): mô hình riêng cho tối đa 8 khoa đông nhất; chuyên khoa lấy từ lượt tiếp nhận,
  nếu trống thì theo phòng khám rồi bác sĩ.
- ai-service lưu dự báo mỗi ngày vào `du_bao_luu_luong` và đối chiếu với lượt thật để báo sai số thực tế.
- Mô hình fit 1 lần/ngày rồi cache; số liệu trong ngày (heatmap, tổng hôm nay) luôn truy vấn mới.

### Phân loại chuyên khoa (`/triage-classify`)
- TF-IDF n-gram ký tự (2-4, đã bỏ dấu) + Logistic Regression, 11 lớp (10 khoa + `KHAC` = không phải triệu chứng).
- Huấn luyện ở luồng nền lúc khởi động và mỗi 6 giờ: mẫu seed + nhãn lễ tân xác nhận/sửa (`ai_phan_loai_nhan`, ưu tiên)
  + câu hỏi đã được Gemini gán nhãn trong `ai_cau_tra_loi_cache`. `/triage-classify/info` trả độ chính xác theo từng khoa.
  Câu trả lời bị người dùng đánh giá 👎 sẽ bị ai-service xóa khỏi cache nên không được dùng để học.
- Độ chính xác đo bằng 5-fold cross-validation trên mẫu seed (~72% với 337 mẫu). ai-service chỉ dùng kết quả khi
  xác suất ≥ 0.7 (khi đó ~94% đúng), còn lại chuyển Gemini.

### Khuôn mặt (`/verify-face`, `/check-duplicate-face`)
- InsightFace `buffalo_sc`, so cosine giữa embedding ArcFace; ngưỡng chấp nhận cosine ≥ 0.445 (hiển thị 70%).
- **Mẫu nhân viên**: backend gửi `ref_embedding` đã lưu trong bảng `nhan_vien_khuon_mat`; lần đầu gửi ảnh đại diện,
  service trả kèm `ref_embedding` để backend lưu. Đổi model → `TRUNCATE TABLE nhan_vien_khuon_mat`.
- **Chống giả mạo bằng thử thách nháy mắt** (`frames_b64`, 8–30 khung hình; frontend gửi 24 khung trong 3 giây):
  người dùng nhìn thẳng và nháy mắt. Model 106 điểm mốc `models/2d106det.onnx` (lấy từ gói `buffalo_l` của InsightFace,
  vì `buffalo_sc` chỉ có 5 điểm) cho vị trí mí mắt; *độ mở mắt* = khe mí trung bình / khoảng cách mắt–miệng.
  Nghiêng/xoay ảnh phẳng thì tử và mẫu co giãn cùng tỉ lệ nên độ mở không đổi. Đạt khi: độ mở nhỏ nhất ≤ 0.55 × độ mở
  lúc mở mắt, có khung nhìn thẳng đang mở mắt (dùng để so khớp), khung nhắm mắt + 6 khung rải đều cùng một người.
  - Chỉ khung so khớp và các khung kiểm tra cùng người mới tính embedding ArcFace; mọi khung chạy dò mặt + 106 điểm.
    Đo với 1 CPU: ~7–8 giây cho 24 khung.
  - Thực nghiệm (cửa sổ 3 giây, lấy mẫu 8 khung/giây): video nháy mắt thật đạt 6/6, tỉ lệ 0.29–0.37; video người nói
    chuyện không nháy mắt 0.73–0.93 và ảnh tĩnh nghiêng/xoay phối cảnh 0.80 đều bị từ chối.
    Ảnh mắt nhắm của người khác nhau có độ mở tuyệt đối chồng lấn với mắt mở → bắt buộc so tương đối trong cùng lượt quét.
  - **Giới hạn**: không chặn được video quay sẵn cảnh người đó nháy mắt; chưa đo trên camera thật với nhiều người.
    Backend ghi log số đo (`nhắm mắt …`, `cosine …`) mỗi lần chấm công để hiệu chỉnh `NGUONG_NHAM_MAT`.
- **Hiệu chỉnh ngưỡng độ khớp**: `python scripts/calibrate_face_threshold.py --backend-dir ../backend` in bảng FRR/FAR theo
  từng ngưỡng từ ảnh đại diện và ảnh chấm công đã lưu.
