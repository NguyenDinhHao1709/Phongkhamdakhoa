# Hệ thống quản lý phòng khám đa khoa

Đồ án tốt nghiệp: phần mềm số hóa quy trình khám bệnh ngoại trú của phòng khám đa khoa. Quy trình bám theo Quyết định 1313/QĐ-BYT; tính BHYT theo Luật BHYT và Nghị định 146/2018/NĐ-CP.

| Tài liệu | Nội dung |
|---|---|
| [docs/QUY_TRINH_KHAM_BENH.md](docs/QUY_TRINH_KHAM_BENH.md) | Luồng khám bệnh chi tiết, quy tắc hàng đợi, BHYT, hoàn tiền |
| [docs/bpmn/](docs/bpmn/) | Sơ đồ BPMN 2.0 (`.bpmn` + `.png`) |
| [SRS.md](SRS.md) | Đặc tả yêu cầu phần mềm |
| [deploy/README.md](deploy/README.md) | Triển khai staging bằng Docker Compose |

---

## 1. Tính năng chính

| Vai trò | Chức năng |
|---|---|
| **Bệnh nhân** (web, app Expo) | Đăng ký/OTP; đặt lịch trực tiếp hoặc tư vấn video; đóng cọc qua PayOS; hủy lịch và nhận hoàn cọc; theo dõi số thứ tự, thời gian chờ; hồ sơ bệnh án điện tử; chatbot AI |
| **Lễ tân / Kiosk** | Tiếp nhận, check-in lịch hẹn, cấp số A/B theo ngày; chọn đối tượng ưu tiên; hàng đợi thời gian thực; qua lượt; chuyển bác sĩ khi bác sĩ chậm; màn hình gọi số và TV |
| **Bác sĩ** | Hàng đợi phòng khám; sinh hiệu, khám, chẩn đoán ICD-10; chỉ định cận lâm sàng; kê đơn; in phiếu khám và đơn thuốc; tư vấn video |
| **Kỹ thuật viên** | Nhận chỉ định, lấy mẫu, nhập kết quả, tải ảnh kết quả |
| **Thu ngân** | Thu tạm ứng phí khám trước khi khám; quyết toán có BHYT đúng/trái tuyến; hoàn tạm ứng dư, hoàn cọc; phiếu chi; chốt ca |
| **Dược sĩ** | Kho thuốc theo lô (FEFO); cấp phát khi đã thanh toán; mua hàng, nhập kho, công nợ nhà cung cấp; dự báo nhu cầu bằng ML |
| **Ban giám đốc / Quản trị** | Cấu hình phí khám, cọc, suất mỗi buổi, BHYT; bảng giá; nhân sự, lịch làm việc, chấm công; dashboard, báo cáo; sao lưu, nhật ký |

Điểm nghiệp vụ nổi bật (chi tiết trong [quy trình khám](docs/QUY_TRINH_KHAM_BENH.md)):
- **Thu phí khám trước khi khám:** bệnh nhân chỉ hiện trên màn hình bác sĩ khi đã đóng đủ phần phí của mình. Cấp cứu được miễn thu trước.
- **Hàng đợi có ưu tiên**, xếp lần lượt:
  1. Cấp cứu
  2. Ưu tiên theo luật
  3. Người có lịch hẹn đã đến giờ
  4. Khách vãng lai
- **Qua lượt** khi gọi mà bệnh nhân vắng mặt. Vắng lần thứ 3 thì hủy lượt.
- **Bác sĩ chậm giờ:** báo trễ ở mốc 15 phút; đến 30 phút thì gợi ý chuyển sang bác sĩ khác.
- **Suất tối đa mỗi buổi:** chừa sẵn khung trống để bác sĩ bù giờ.
- **BHYT:** tính mức hưởng theo mã thẻ, kiểm tra hạn thẻ, đúng/trái tuyến, giấy chuyển tuyến và ngưỡng chi phí được BHYT trả 100%.
- **Tư vấn trực tuyến:** ghi nhận người đã vào phòng gọi, làm căn cứ hoàn phí khi ca không diễn ra.
- **An toàn khi chạy nhiều instance backend:** khóa MySQL và bộ đếm mã nằm trong CSDL.

---

## 2. Kiến trúc

```
 frontend (React, :3000)   mobile-patient (Expo)   Kiosk / TV gọi số
              │  HTTPS + Socket.IO
              ▼
 backend (NestJS, :5000)  ──────────────►  MySQL 8
   │ REST /api · WebSocket · Bull (Redis)
   ├──► ai-service      (NestJS, :5002)  — chatbot, RAG, Gemini
   ├──► office-service  (NestJS, :5003)  — chat nội bộ nhân viên
   ├──► python-ml       (FastAPI, :5001) — dự báo lượt khám, phân loại chuyên khoa, khuôn mặt
   └──► PayOS · SMTP
```

| Thư mục | Thành phần |
|---|---|
| `backend/` | API chính (NestJS 10, TypeORM 0.3, MySQL) |
| `frontend/` | Web cho mọi vai trò (React 18, Vite 5, Tailwind 3, Zustand, TanStack Query) |
| `mobile-patient/` | App bệnh nhân (Expo, React Native) |
| `ai-service/` | Dịch vụ AI (Gemini) |
| `office-service/` | Văn phòng số, chat thời gian thực |
| `python-ml/` | Dự báo (FastAPI, pandas, statsmodels, scikit-learn) |
| `database/` | Migration SQL theo ngày (không đưa lên git) |
| `deploy/` | Docker Compose, Caddy, Nginx cho staging |
| `docs/` | Quy trình khám bệnh, BPMN |
| `scripts/` | Bộ Postman, script chạy thử |

Các module backend (`backend/src/modules`): `auth`, `benh-nhan`, `nhan-vien`, `lich-hen`, `payos`, `tiep-nhan` (hàng đợi, WebSocket), `kiosk`, `ho-so-benh-an`, `xet-nghiem`, `nha-thuoc`, `thanh-toan`, `quan-ly`, `cham-cong`, `danh-gia`, `bai-viet`, `thong-bao`, `office`, `ai`.

---

## 3. Cài đặt môi trường phát triển

### 3.1 Yêu cầu
- Node.js 20, npm
- MySQL 8.0
- Redis 7 (hàng đợi Bull)
- Python 3.10+ (chỉ khi chạy `python-ml`)

### 3.2 Cơ sở dữ liệu
File SQL bị `.gitignore` loại khỏi git. Bạn cần lấy bản dump từ người quản lý dự án.

```bash
mysql -u root -p -e "CREATE DATABASE phong_kham CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p phong_kham < phongkham.sql
# Sau đó chạy lần lượt các file database/2026*.sql theo thứ tự ngày.
```

Xem thêm [database/README_import.md](database/README_import.md). Migration mới nhất `20261112_uu_tien_va_suat_buoi.sql` chạy lại nhiều lần vẫn an toàn.

### 3.3 Backend

```bash
cd backend
npm install
# tạo file .env (xem danh sách biến bên dưới)
npm run start:dev          # http://localhost:5000 · Swagger: /api/docs
```

Biến môi trường của `backend/.env`:

| Nhóm | Biến |
|---|---|
| Ứng dụng | `NODE_ENV`, `PORT`, `CLIENT_URL`, `UPLOAD_DIR`, `MAX_FILE_SIZE_MB` |
| CSDL | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Bảo mật | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `APP_ENCRYPTION_KEY` |
| Email / OTP | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`, `OTP_EXPIRES_MINUTES` |
| Redis | `REDIS_HOST`, `REDIS_PORT` |
| Dịch vụ khác | `AI_SERVICE_URL`, `OFFICE_SERVICE_URL`, `GEMINI_API_KEY` |
| PayOS | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` |

> Hệ thống chạy theo giờ Việt Nam. Trên máy chủ, đặt thêm `TZ=Asia/Ho_Chi_Minh`; Dockerfile backend đã đặt sẵn biến này.

### 3.4 Frontend

```bash
cd frontend
npm install
npm run dev                # https://localhost:3000
```

Biến `frontend/.env`: `VITE_API_URL`, `VITE_WS_URL`, `VITE_OFFICE_URL`.

### 3.5 Dịch vụ phụ (tùy chọn)

```bash
cd ai-service && npm install && npm run start:dev        # :5002
cd office-service && npm install && npm run start:dev    # :5003
cd python-ml && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 5001          # :5001
```

---

## 4. Sử dụng

| Vai trò | Đường dẫn | Tài khoản mẫu (tên đăng nhập) |
|---|---|---|
| Quản trị viên cấp cao | `/quan-tri` | `admin` |
| Ban giám đốc | `/ban-giam-doc` | — |
| Lễ tân | `/tiep-tan` | `tieptan` |
| Bác sĩ | `/bac-si` | `bacsi` |
| Thu ngân | `/thu-ngan` | `thungan` |
| Kỹ thuật viên | `/ky-thuat-vien` | — |
| Nhà thuốc | `/nha-thuoc` | — |
| Bệnh nhân | `/benh-nhan`, `/dat-lich` | tự đăng ký tại `/register` |
| Kiosk tự phục vụ | `/kiosk` | không cần đăng nhập |
| Màn hình gọi số / TV | `/man-hinh-goi-so`, `/tv-hang-doi` | — |

Mật khẩu tài khoản mẫu không ghi trong repo; liên hệ quản trị hệ thống.

---

## 5. Triển khai production

| Thành phần | Nơi chạy | Cách cập nhật |
|---|---|---|
| Backend | Render | Push lên nhánh `main` thì Render tự build và deploy |
| Frontend | cPanel | `npm run build` trong `frontend/`, nén nội dung `dist/`, tải lên thư mục web rồi giải nén ghi đè (giữ `.htaccess`) |
| CSDL | Clever Cloud (MySQL) | Chạy file migration mới trong tab SQL của phpMyAdmin **trước** khi deploy backend |

- **CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)): tự chạy khi push/PR, build thử mọi thành phần.
- **Staging Docker** ([deploy-staging.yml](.github/workflows/deploy-staging.yml)): chạy tay, build image lên `ghcr.io`.

---

## 6. Kiểm thử
- Bộ Postman: `scripts/Phong_Kham_API_TestCases.postman_collection.json`.
- Kịch bản đầu-cuối đã kiểm tra luồng chính trên môi trường local, gồm:
  - tiếp nhận và thu phí trước khám;
  - hàng đợi ưu tiên, qua lượt;
  - BHYT đúng/trái tuyến;
  - thu đồng thời;
  - hoàn cọc;
  - tư vấn trực tuyến.
