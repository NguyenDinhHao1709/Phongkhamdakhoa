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
6. Dịch vụ Python ML (Dự báo lượt khám Holt-Winters - Port 5001)

Mở Terminal 5:

powershell
cd d:\KLTN\python-ml
.\venv\Scripts\activate
uvicorn main:app --reload --port 5001
Địa chỉ: http://localhost:5001
(Nếu dịch vụ Python không chạy, Backend sẽ tự động dùng thuật toán dự phòng tích hợp sẵn).
# 🐍 Python ML Forecasting Service

## Cấu trúc

```
python-ml/
├── main.py              # FastAPI app (Port 5001)
├── requirements.txt     # Dependencies
├── .env                 # Database config
└── services/
    ├── __init__.py
    └── forecaster.py    # HoltWinters ML Engine + PatternAnalyzer
```

## Cài đặt

```bash
# 1. Cài Python 3.11+ từ https://www.python.org/downloads/
# 2. Mở terminal tại thư mục python-ml/
cd d:\KLTN\python-ml

# 3. Tạo virtual environment (khuyến nghị)
python -m venv venv
venv\Scripts\activate

# 4. Cài packages
pip install -r requirements.txt

# 5. Chạy service
uvicorn main:app --reload --port 5001
```

## API Endpoints

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | `http://localhost:5001/health` | Kiểm tra service |
| POST | `http://localhost:5001/forecast` | Dự báo 7 ngày tới |
| GET | `http://localhost:5001/pattern-analysis` | Phân tích pattern |
| GET | `http://localhost:5001/docs` | Swagger UI |

## Test nhanh

```bash
# Health check
curl http://localhost:5001/health

# Forecast
curl -X POST http://localhost:5001/forecast \
  -H "Content-Type: application/json" \
  -d '{"horizon": 7, "history_days": 90}'
```

## Thuật toán

- **Holt-Winters Exponential Smoothing** (trend=additive, seasonal=additive, period=7)  
- **STL Decomposition** để tách xu hướng + seasonal component  
- **MAPE evaluation** via walk-forward validation (7 ngày cuối)  
- Tự động fallback về Weighted Moving Average nếu không đủ dữ liệu (< 21 ngày)

