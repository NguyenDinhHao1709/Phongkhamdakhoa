# 🏥 Hệ Thống Quản Lý Phòng Khám Đa Khoa

> **Phiên bản:** 1.0.0 · **Cập nhật:** 2026-09
> Đồ án tốt nghiệp — Hệ thống quản lý phòng khám đa khoa tuân theo **Quyết định 1313/QĐ-BYT** của Bộ Y Tế Việt Nam.

---

## 📋 Mục Lục

1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Công nghệ sử dụng](#3-công-nghệ-sử-dụng)
4. [Chức năng đã hoàn thành](#4-chức-năng-đã-hoàn-thành)
5. [Chức năng chưa hoàn thành](#5-chức-năng-chưa-hoàn-thành)
6. [Hướng dẫn cài đặt](#6-hướng-dẫn-cài-đặt)
7. [Hướng dẫn sử dụng](#7-hướng-dẫn-sử-dụng)
8. [Quy trình khám bệnh chuẩn](#8-quy-trình-khám-bệnh-chuẩn)
9. [Cấu trúc thư mục](#9-cấu-trúc-thư-mục)
10. [API Documentation](#10-api-documentation)
11. [Lộ trình phát triển tiếp theo](#11-lộ-trình-phát-triển-tiếp-theo)

---

## 1. Giới Thiệu Dự Án

Hệ thống phần mềm quản lý phòng khám đa khoa toàn diện, hỗ trợ **7 nhóm người dùng** với các nghiệp vụ y tế khép kín: từ đặt lịch hẹn, tiếp nhận, khám lâm sàng, xét nghiệm, kê đơn, cấp phát thuốc đến thanh toán và lưu trữ hồ sơ y tế điện tử (EMR).

### Điểm nổi bật

- ✅ Quy trình khám bệnh theo chuẩn **Quyết định 1313/QĐ-BYT**
- ✅ Hồ sơ y tế điện tử (EMR) — bệnh nhân tự tra cứu
- ✅ Chẩn đoán theo mã **ICD-10**
- ✅ Thông báo real-time qua **WebSocket**
- ✅ AI triage & chatbot hỗ trợ bệnh nhân (Gemini API)
- ✅ Dự báo nhu cầu thuốc bằng Machine Learning
- ✅ Dashboard thống kê dành cho Ban giám đốc

---

## 2. Kiến Trúc Hệ Thống

```
+----------------------------------------------------------+
|                      CLIENT LAYER                         |
|   React 18 + Vite       <->    Socket.IO Client           |
|   Port 3000                                               |
+-----------------------------+----------------------------+
                              | HTTP / WebSocket
+-----------------------------v----------------------------+
|                       API LAYER                          |
|   NestJS 10 (TypeScript)    Port 5000                    |
|   REST API | WebSocket Gateway | BullMQ Queue            |
+------+-----+----------+----------+----------+-----------+
       |                |                     |
+------v------+  +-------v------+  +----------v----------+
|   MySQL 8   |  |   Redis 7    |  |  Python Flask ML    |
|  Port 3306  |  |  Port 6379   |  |     Port 5001       |
|  phong_kham |  |  Queue/Cache |  | Gemini AI + ML      |
+-------------+  +--------------+  +---------------------+
```

### Modules Backend (NestJS)

| Module | Đường dẫn | Mô tả |
|--------|-----------|-------|
| `auth` | `/api/auth` | Xác thực JWT, OTP email, refresh token |
| `benh-nhan` | `/api/benh-nhan` | CRUD bệnh nhân, tìm kiếm |
| `nhan-vien` | `/api/nhan-vien` | CRUD nhân viên (bác sĩ, KTV, dược sĩ...) |
| `tiep-nhan` | `/api/tiep-nhan` | Tiếp nhận, tạo lượt khám, hàng đợi |
| `ho-so-benh-an` | `/api/ho-so-benh-an` | Phiếu khám, EMR, kết thúc khám |
| `xet-nghiem` | `/api/xet-nghiem` | Chỉ định CLS, lấy mẫu, nhập kết quả |
| `nha-thuoc` | `/api/nha-thuoc` | Quản lý kho thuốc, đơn thuốc, cấp phát |
| `thanh-toan` | `/api/thanh-toan` | Hóa đơn, thanh toán, in phiếu |
| `lich-hen` | `/api/lich-hen` | Đặt lịch, xác nhận, nhắc lịch |
| `quan-ly` | `/api/quan-ly` | Dashboard, báo cáo, phân quyền |
| `thong-bao` | `/api/thong-bao` | Thông báo, WebSocket gateway |
| `ai` | `/api/ai` | AI chatbot, AI triage, dự báo ML |

---

## 3. Công Nghệ Sử Dụng

### Backend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **NestJS** | 10.x | Framework backend chính (TypeScript) |
| **TypeORM** | 0.3.x | ORM kết nối MySQL |
| **MySQL** | 8.x | Cơ sở dữ liệu chính (31 bảng) |
| **Passport.js** | - | JWT + Local authentication strategy |
| **bcryptjs** | - | Mã hóa mật khẩu (salt rounds=10) |
| **Socket.IO** | 4.x | Real-time notifications |
| **BullMQ** | - | Job queue (gửi email OTP, nhắc lịch) |
| **Redis** | 7.x | Message broker cho BullMQ |
| **Nodemailer** | - | Gửi email OTP, thông báo |
| **class-validator** | 0.14 | Validation DTO |
| **Swagger** | 7.x | Tự động tạo API docs tại `/api/docs` |

### Frontend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **React** | 18.x | UI framework |
| **Vite** | 5.x | Build tool, dev server |
| **TailwindCSS** | 3.x | Utility-first CSS (Medical Blue theme) |
| **React Router** | 6.x | Client-side routing, role-based |
| **TanStack Query** | 5.x | Server state management, caching |
| **Zustand** | 4.x | Client state (auth store) |
| **Axios** | - | HTTP client với interceptor JWT |
| **React Hook Form** | 7.x | Form management |
| **Zod** | 3.x | Schema validation |
| **Recharts** | 2.x | Biểu đồ thống kê |
| **Lucide React** | - | Icon library |
| **Socket.IO Client** | 4.x | Real-time notifications |
| **date-fns** | 3.x | Xử lý ngày tháng |
| **headlessui** | 2.x | UI primitives (Dialog, Combobox...) |

### AI / ML

| Công nghệ | Mục đích |
|-----------|----------|
| **Python Flask** | Microservice AI (Port 5001) |
| **Google Gemini API** | Chatbot tư vấn, AI triage phân luồng |
| **scikit-learn** | Dự báo nhu cầu thuốc |

---

## 4. Chức Năng Đã Hoàn Thành

### 👤 Bệnh nhân (Patient Portal)

- [x] Đăng ký tài khoản / đăng nhập bằng email + OTP
- [x] Đặt lịch khám online (chọn bác sĩ, chuyên khoa, ngày giờ)
- [x] Xem & quản lý lịch hẹn (hủy, xem trạng thái)
- [x] Hồ sơ y tế điện tử cá nhân (EMR): xem lịch sử khám, chẩn đoán ICD-10, kết quả xét nghiệm, đơn thuốc
- [x] Chat AI tư vấn sức khỏe (Gemini API)
- [x] Nhận thông báo real-time (xác nhận lịch, nhắc khám)

### 🏥 Lễ tân / Tiếp tân (Receptionist Portal)

- [x] Tiếp nhận bệnh nhân: tìm kiếm, tạo mới nếu chưa có hồ sơ
- [x] Tạo lượt khám mới, gán bác sĩ, phân loại ưu tiên
- [x] Quản lý hàng đợi real-time (hiển thị trạng thái từng bệnh nhân)
- [x] Xác nhận / hủy lịch hẹn, chuyển đổi lịch → lượt khám
- [x] AI Triage: phân loại mức độ ưu tiên tự động dựa trên triệu chứng
- [x] Quản lý danh sách bệnh nhân (tìm kiếm, xem hồ sơ)
- [x] Thống kê lượt khám trong ngày

### 👨‍⚕️ Bác sĩ (Doctor Portal)

- [x] Phòng khám: giao diện khám bệnh đầy đủ
  - [x] Ghi nhận sinh hiệu (mạch, nhiệt độ, huyết áp, SPO2, cân nặng, chiều cao)
  - [x] Khám lâm sàng: triệu chứng, chẩn đoán sơ bộ
  - [x] Chỉ định cận lâm sàng (xét nghiệm, siêu âm, X-quang...)
  - [x] Xem kết quả xét nghiệm trả về
  - [x] Chẩn đoán xác định theo mã ICD-10 (quick-select chips)
  - [x] Kê đơn thuốc (tìm thuốc, liều dùng, số lượng, ghi chú)
  - [x] Kết thúc khám (ghi hướng điều trị, lịch tái khám)
- [x] Lịch hẹn: xem lịch làm việc, lịch hẹn bệnh nhân
- [x] Khám trực tuyến: giao diện video call (UI skeleton)
- [x] Thống kê bệnh nhân cá nhân

### 🔬 Kỹ thuật viên (Lab Portal)

- [x] Danh sách chỉ định cận lâm sàng cần xử lý
- [x] Lấy mẫu / xác nhận bắt đầu xét nghiệm
- [x] Nhập kết quả xét nghiệm (giá trị, đơn vị, giá trị tham chiếu, nhận xét)
- [x] Gửi kết quả về cho bác sĩ
- [x] Thống kê xét nghiệm (số lượng, loại xét nghiệm)

### 💊 Dược sĩ / Nhà thuốc (Pharmacy Portal)

- [x] Quản lý kho thuốc (CRUD thuốc, số lượng tồn kho, cảnh báo hết hàng)
- [x] Danh sách đơn thuốc chờ cấp phát
- [x] Cấp phát thuốc: xác nhận, trừ tồn kho
- [x] Thống kê nhà thuốc (doanh thu, thuốc bán chạy)

### 💰 Thu ngân (Cashier Portal)

- [x] Danh sách hóa đơn chờ thanh toán
- [x] Thanh toán (tiền mặt / chuyển khoản)
- [x] In hóa đơn (PDF / print)
- [x] Thống kê doanh thu theo ngày/tháng/năm

### 🏢 Quản lý / Ban giám đốc (Management Portal)

- [x] Quản lý nhân viên (CRUD, phân công vai trò)
- [x] Phân quyền hệ thống (vai trò → quyền hạn)
- [x] Xét duyệt yêu cầu (nghỉ phép, bổ sung...)
- [x] Xếp lịch làm việc nhân viên
- [x] Danh mục dùng chung (chuyên khoa, loại xét nghiệm...)
- [x] Sao lưu dữ liệu
- [x] Tra cứu tổng hợp
- [x] Dashboard tổng quan (KPI: lượt khám, doanh thu, bệnh nhân mới)
- [x] Báo cáo tài chính
- [x] Dự báo nhu cầu thuốc bằng AI/ML
- [x] Biểu đồ thống kê nâng cao

---

## 5. Tình Trạng Hoàn Thiện Các Chức Năng

### 🟢 Đã hoàn thành 100% (Được triển khai & tích hợp toàn diện)

| Chức năng | Trạng thái | Giải pháp đã triển khai | Module |
|-----------|------------|------------------------|--------|
| **Khám trực tuyến (Telemedicine)** | ✅ Hoàn thành 100% | Tích hợp WebRTC video call, mic/camera controls, timer, local & remote view, chat trực tuyến | `TelehealthVideoModal`, `Doctor/KhamTrucTuyen`, `Patient/LichHen` |
| **Nhắc lịch tự động qua email** | ✅ Hoàn thành 100% | Scheduler tự động quét lịch hẹn trong 24h tới, gửi email HTML chuẩn y tế, nút quét thủ công trên UI tiếp tân | `lich-hen.service.ts`, `LichHenQuanLyPage` |
| **Thanh toán BHYT & Trọn gói** | ✅ Hoàn thành 100% | Tự động gộp Phí khám + CLS + Thuốc, chiết khấu 80% BHYT chuẩn Việt Nam, tự động chuyển lượt khám sang `hoan_thanh` | `thanh-toan.service.ts`, `ThanhToanModal` |
| **Upload ảnh kết quả XN / CĐHA** | ✅ Hoàn thành 100% | Multer upload file, static serve `/uploads/*`, preview ảnh chụp cho KTV, xem ảnh thumbnail & phóng to cho Bác sĩ và Bệnh nhân | `xet-nghiem.controller.ts`, `XetNghiemListPage`, `PhongKhamPage`, `HoSoYTeBenhNhanPage` |
| **In phiếu khám & Đơn thuốc** | ✅ Hoàn thành 100% | Mẫu in A4 chuẩn Bộ Y Tế: Phiếu khám bệnh ngoại trú & Đơn thuốc (Thông tư 52/2017/TT-BYT) kèm chữ ký bác sĩ | `InPhieuKhamModal`, `InDonThuocModal`, `PhongKhamPage`, `HoSoYTeBenhNhanPage` |
| **Dự báo nhu cầu thuốc ML** | ✅ Hoàn thành 100% | Thuật toán Holt-Winters Demand Forecasting (`python-ml` :5001) kết hợp tốc độ xuất kho và tăng trưởng bệnh nhân, widget phân tích 14 ngày | `python-ml/main.py`, `nha-thuoc.service.ts`, `ThongKeNhaThuocPage` |
| **Thống kê bác sĩ CSDL thực tế** | ✅ Hoàn thành 100% | Truy vấn TypeORM trực tiếp từ bảng `benh_an_kham` và `lich_hen`, thống kê số ca khám, hoàn thành, doanh số | `ho-so-benh-an.service.ts`, `ThongKeBacSiPage` |
| **Sao lưu CSDL thực tế (.sql)** | ✅ Hoàn thành 100% | Kết xuất toàn bộ cấu trúc DDL và Data của tất cả các bảng MySQL thành file `.sql` hoàn chỉnh, nút tải trực tiếp trên UI | `quan-ly.service.ts`, `quan-ly.controller.ts`, `SaoLuuDuLieuPage` |
| **Xếp lịch làm việc tránh trùng ca** | ✅ Hoàn thành 100% | Backend trả 409 Conflict khi trùng ca, 400 khi làm quá 2 ca/ngày; Client pre-validation cảnh báo ngay lập tức | `quan-ly.service.ts`, `XepLichLamViecPage` |
| **Tích hợp OTP SMS Gateway** | ✅ Hoàn thành 100% | Dispatcher hỗ trợ gửi OTP song song qua SMS Brandname và Email, hỗ trợ đăng ký & xác thực bằng cả Email và Số điện thoại | `auth.service.ts`, `auth.dto.ts` |

### 💡 Hướng phát triển tiếp theo (Định hướng mở rộng)

| Vấn đề | Định hướng phát triển tương lai |
|--------|---------------------------------|
| **Đa nền tảng di động (Mobile App)** | Xây dựng ứng dụng Flutter / React Native cho Bác sĩ và Bệnh nhân |
| **Ký số điện tử (Digital Signature)** | Tích hợp USB Token / SmartCA của VNPT / Viettel để ký số bệnh án và đơn thuốc |
| **Liên thông cổng dữ liệu BYT** | Chuẩn hóa định dạng XML gửi lên Cổng Giám định BHYT Quốc gia |
| **CI/CD & Kubernetes** | Thiết lập Docker Compose, Helm chart và GitHub Actions tự động kiểm thử & triển khai |

---

## 6. Hướng Dẫn Cài Đặt

### Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu |
|----------|---------------------|
| Node.js | 18.x LTS trở lên |
| npm | 9.x trở lên |
| MySQL | 8.0 trở lên |
| Redis | 7.x trở lên |
| Python | 3.10 trở lên |

### Bước 1 — Clone repository

```bash
git clone <repo-url> KLTN
cd KLTN
```

### Bước 2 — Cài đặt cơ sở dữ liệu

```sql
CREATE DATABASE phong_kham CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
mysql -u root -p phong_kham < phong_kham_schema_v2.sql
```

### Bước 3 — Cài đặt Backend

```bash
cd backend
npm install
cp .env.example .env
# Chỉnh sửa .env với thông tin DB, JWT, Mail, Redis của bạn
npm run build
npm run start
```

Backend: `http://localhost:5000`  
Swagger Docs: `http://localhost:5000/api/docs`

### Bước 4 — Cài đặt Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

### Bước 5 — Cài đặt Python ML (Tùy chọn)

```bash
cd python-ml
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
# Thêm GEMINI_API_KEY vào .env
python main.py
```

### Bước 6 — Khởi động Redis

```bash
redis-server
# Hoặc dùng Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

### File .env Backend (Mẫu)

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=phong_kham
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=30d
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=Phong Kham <no-reply@phongkham.vn>
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:3000
```

---

## 7. Hướng Dẫn Sử Dụng

### Tài khoản mặc định

| Role | Email | Mật khẩu |
|------|-------|----------|
| Quản trị viên cấp cao | admin@phongkham.vn | Admin@123 |
| Bác sĩ | bacsi@phongkham.vn | Doctor@123 |
| Lễ tân | tieptan@phongkham.vn | Staff@123 |
| Kỹ thuật viên | ktv@phongkham.vn | Staff@123 |
| Dược sĩ | duocsi@phongkham.vn | Staff@123 |
| Thu ngân | thungan@phongkham.vn | Staff@123 |
| Bệnh nhân | benhnhan@gmail.com | Patient@123 |

> ⚠️ Hãy đổi mật khẩu sau khi đăng nhập lần đầu!

### Truy cập theo Role

| Role | URL |
|------|-----|
| Lễ tân | `http://localhost:3000/tiep-tan` |
| Bác sĩ | `http://localhost:3000/bac-si` |
| Kỹ thuật viên | `http://localhost:3000/ky-thuat-vien` |
| Nhà thuốc | `http://localhost:3000/nha-thuoc` |
| Thu ngân | `http://localhost:3000/thu-ngan` |
| Quản lý / Admin | `http://localhost:3000/quan-ly` |
| Bệnh nhân | `http://localhost:3000/benh-nhan` |

---

## 8. Quy Trình Khám Bệnh Chuẩn

> Theo **Quyết định 1313/QĐ-BYT** — Quy trình khám bệnh ngoại trú

```
BỆNH NHÂN ĐẾN
      |
      v
[BƯỚC 1] LỄ TÂN — Tiếp nhận
  • Tìm kiếm / tạo hồ sơ bệnh nhân
  • Chọn bác sĩ / chuyên khoa
  • Tạo lượt khám -> vào hàng đợi
      |
      v
[BƯỚC 2] BÁC SĨ — Khám lâm sàng
  • Đo sinh hiệu (mạch, HA, nhiệt độ, SpO2...)
  • Hỏi bệnh sử, khám thực thể
  • Ghi triệu chứng, chẩn đoán sơ bộ
      |
      +---- Cần xét nghiệm? -----------+
      |                                |
      |                  [BƯỚC 3] KỸ THUẬT VIÊN
      |                   • Nhận chỉ định CLS
      |                   • Lấy mẫu / thực hiện XN
      |                   • Nhập kết quả -> gửi bác sĩ
      |                                |
      <--------------------------------+
      | Nhận kết quả XN
      v
[BƯỚC 4] BÁC SĨ — Chẩn đoán & điều trị
  • Đọc kết quả xét nghiệm
  • Chẩn đoán xác định (mã ICD-10)
  • Kê đơn thuốc
  • Ghi hướng điều trị, lịch tái khám
  • Kết thúc khám -> Cập nhật EMR
      |
      v
[BƯỚC 5] NHÀ THUỐC — Cấp phát thuốc
  • Nhận đơn thuốc
  • Kiểm tra tồn kho
  • Cấp phát thuốc, dặn dò bệnh nhân
      |
      v
[BƯỚC 6] THU NGÂN — Thanh toán
  • Tổng hợp chi phí (khám + XN + thuốc)
  • Tính BHYT (nếu có)
  • Thanh toán & in hóa đơn
      |
      v
HOÀN THÀNH — Bệnh nhân về
(EMR được lưu, bệnh nhân có thể tra cứu qua app)
```

---

## 9. Cấu Trúc Thư Mục

```
KLTN/
├── backend/                    # NestJS API Server
│   ├── src/
│   │   ├── main.ts             # Bootstrap (Swagger, CORS, Validation)
│   │   ├── app.module.ts       # Root module
│   │   ├── config/             # Database, JWT, Mail config
│   │   ├── common/
│   │   │   ├── decorators/     # @CurrentUser, @Roles, @Public
│   │   │   ├── guards/         # JwtAuthGuard, RolesGuard
│   │   │   ├── interceptors/   # ResponseTransformInterceptor
│   │   │   ├── filters/        # HttpExceptionFilter
│   │   │   └── utils/          # MaGenerator, Hash utils
│   │   └── modules/
│   │       ├── auth/           # Login, OTP, JWT, Refresh token
│   │       ├── benh-nhan/      # CRUD bệnh nhân
│   │       ├── nhan-vien/      # Nhân viên, Bác sĩ, KTV
│   │       ├── tiep-nhan/      # Lượt khám, hàng đợi
│   │       ├── ho-so-benh-an/  # Phiếu khám, EMR, kết thúc khám
│   │       ├── xet-nghiem/     # Chỉ định CLS, kết quả XN
│   │       ├── nha-thuoc/      # Kho thuốc, đơn thuốc
│   │       ├── thanh-toan/     # Hóa đơn, thanh toán
│   │       ├── lich-hen/       # Lịch hẹn, nhắc lịch
│   │       ├── quan-ly/        # Báo cáo, phân quyền
│   │       ├── thong-bao/      # Notifications, WebSocket gateway
│   │       └── ai/             # AI Triage, ML proxy
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx             # Router + role-based routing
│   │   ├── design-system/      # Shared UI components
│   │   ├── services/           # Axios API calls
│   │   ├── stores/             # Zustand stores (auth)
│   │   ├── hooks/              # Custom React hooks
│   │   └── pages/
│   │       ├── Login/
│   │       ├── Doctor/         # PhongKham, LichHen, ThongKe
│   │       ├── Receptionist/   # TiepNhan, HangDoi, AI Triage
│   │       ├── Lab/            # XetNghiem
│   │       ├── Pharmacy/       # KhoThuoc, DonThuoc
│   │       ├── Cashier/        # HoaDon, ThanhToan
│   │       ├── Management/     # Dashboard, BaoCao, NhanVien
│   │       └── Patient/        # EMR, DatLich, ChatAI
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── python-ml/                  # Flask AI/ML Microservice
│   ├── main.py
│   ├── services/
│   ├── requirements.txt
│   └── .env
│
├── phong_kham_schema_v2.sql    # Database schema (31 bảng)
└── README.md
```

---

## 10. API Documentation

Swagger UI: **`http://localhost:5000/api/docs`**

> 📄 **Tài liệu Đặc tả & Toàn bộ Test Cases Backend:** Xem chi tiết tại [SRS.md](file:///d:/KLTN/SRS.md) (Bao quát 12 phân hệ: Auth, Tiếp Nhận, Bệnh Nhân, Lịch Hẹn, Bệnh Án, Cận Lâm Sàng, Nhà Thuốc, Thanh Toán, Quản Trị, Nhân Sự, WebSocket, AI Triaging & Forecasting).

### Các endpoint quan trọng

```
# Auth
POST   /api/auth/login                    Đăng nhập, nhận JWT
POST   /api/auth/send-otp                 Gửi OTP xác thực email
POST   /api/auth/verify-otp               Xác thực OTP
POST   /api/auth/refresh                  Làm mới access token

# Tiếp nhận
POST   /api/tiep-nhan                     Tạo lượt khám mới
GET    /api/tiep-nhan/hang-doi            Danh sách hàng đợi hôm nay

# Hồ sơ bệnh án
POST   /api/ho-so-benh-an                 Tạo phiếu khám (bắt đầu khám)
PUT    /api/ho-so-benh-an/:id/sinh-hieu   Cập nhật sinh hiệu
PUT    /api/ho-so-benh-an/:id/ket-thuc    Kết thúc khám
GET    /api/ho-so-benh-an/cua-toi         EMR của bệnh nhân đang đăng nhập

# Xét nghiệm (Kỹ thuật viên)
GET    /api/xet-nghiem                    Danh sách chỉ định cần xử lý
PUT    /api/xet-nghiem/:id/lay-mau        Xác nhận lấy mẫu
POST   /api/xet-nghiem/:id/ket-qua        Nhập kết quả xét nghiệm

# Nhà thuốc
GET    /api/nha-thuoc/don-thuoc           Danh sách đơn thuốc chờ cấp phát
POST   /api/nha-thuoc/cap-phat/:id        Cấp phát thuốc

# Thanh toán
GET    /api/thanh-toan                    Danh sách hóa đơn chờ
POST   /api/thanh-toan/:id                Xác nhận thanh toán
```

---

## 11. Lộ Trình Phát Triển Tiếp Theo

### Phase 2 — Tính năng thiết yếu (Ưu tiên cao)

**1. Telemedicine (Khám trực tuyến)**
- Tích hợp WebRTC (hoặc Agora/Jitsi API)
- Giao diện video call cho bác sĩ + bệnh nhân
- Chat và chia sẻ file trong phiên khám

**2. Thanh toán BHYT hoàn chỉnh**
- Tích hợp tra cứu thẻ BHYT (API của BHXH)
- Tự động tính tỷ lệ thanh toán theo mức hưởng
- Xuất hóa đơn BHYT đúng chuẩn

**3. Nhắc lịch tự động**
- BullMQ cron job: 24h, 2h trước lịch khám
- Gửi email + SMS (Twilio/Esms.vn)
- Bệnh nhân xác nhận/hủy qua link email

**4. Upload ảnh kết quả XN**
- Endpoint upload ảnh DICOM/JPEG/PDF
- Hiển thị ảnh trong phiếu kết quả
- Lưu trữ trên cloud (AWS S3 / GCS)

### Phase 3 — Mở rộng

**5. Mobile App (React Native)**
- App bệnh nhân: đặt lịch, xem EMR, chat AI
- Push notifications (FCM)
- QR Code check-in

**6. Báo cáo & BI nâng cao**
- Xuất báo cáo Excel/PDF theo chuẩn Bộ Y Tế
- Dashboard real-time (WebSocket)
- Dự báo nhu cầu nhân lực

**7. Tích hợp thiết bị y tế**
- Đọc dữ liệu từ máy đo huyết áp, glucose tự động
- Giao thức HL7 FHIR cho trao đổi dữ liệu y tế

### Phase 4 — Bảo mật & Deployment

**8. Bảo mật nâng cao**
- Mã hóa dữ liệu nhạy cảm (AES-256)
- Audit log (ai thay đổi gì, lúc nào)
- 2FA (TOTP - Google Authenticator)
- Rate limiting, DDoS protection

**9. Deployment Production**
- Docker Compose (backend + frontend + MySQL + Redis)
- HTTPS/SSL (Let's Encrypt)
- Nginx reverse proxy
- CI/CD với GitHub Actions
- Backup tự động hàng ngày

**10. Testing**
- Unit tests (Jest) cho backend services
- Integration tests cho API endpoints
- E2E tests (Playwright) cho critical flows
- Load testing (k6)

---

*Hệ thống phát triển như đồ án tốt nghiệp — Khoa Công nghệ Thông tin*
