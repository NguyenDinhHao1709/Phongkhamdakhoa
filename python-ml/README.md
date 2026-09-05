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

