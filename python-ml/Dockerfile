FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Tải sẵn model buffalo_sc vào image: khởi động lạnh trên Render không phải tải lại từ GitHub
RUN python -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])"
COPY main.py ./
COPY services ./services
COPY models ./models
COPY data ./data
EXPOSE 5001
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-5001}"]
