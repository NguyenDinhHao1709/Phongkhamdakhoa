# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) & BỘ TEST CASES TOÀN BỘ BACKEND
## HỆ THỐNG QUẢN LÝ PHÒNG KHÁM ĐA KHOA QUỐC TẾ (SMART CLINIC MANAGEMENT SYSTEM)

- **Mã dự án:** KLTN-PKDK-2026
- **Tiêu chuẩn áp dụng:** IEEE 830 / ISO/IEC/IEEE 29148 & Chuẩn an toàn thông tin y tế
- **Kiến trúc Backend:** NestJS 10, TypeORM, MySQL 8.0, Redis, BullMQ, Socket.io, Python FastAPI ML Microservice
- **Phiên bản tài liệu:** v2.0 (Đầy đủ 12 phân hệ backend)
- **Ngày cập nhật:** 07/09/2026

---

## MỤC LỤC
1. [TỔNG QUAN HỆ THỐNG & MÔI TRƯỜNG KIỂM THỬ](#1-tổng-quan-hệ-thống--môi-trường-kiểm-thử)
2. [QUY ƯỚC ĐẶT MÃ & TIÊU CHÍ TEST CASE](#2-quy-ước-đặt-mã--tiêu-chí-test-case)
3. [MA TRẬN KIỂM THỬ 12 PHÂN HỆ BACKEND](#3-ma-trận-kiểm-thử-12-phân-hệ-backend)
   - [Module 1: Xác Thực & Quản Lý Truy Cập (Auth, OTP & SMS Gateway)](#module-1-xác-thực--quản-lý-truy-cập-auth-otp--sms-gateway)
   - [Module 2: Tiếp Nhận Bệnh Nhân, Hàng Đợi & Sinh Hiệu (TiepNhan)](#module-2-tiếp-nhận-bệnh-nhân-hàng-đợi--sinh-hiệu-tiepnhan)
   - [Module 3: Quản Lý Hồ Sơ Bệnh Nhân (BenhNhan)](#module-3-quản-lý-hồ-sơ-bệnh-nhân-benhnhan)
   - [Module 4: Quản Lý Lịch Hẹn & Nhắc Lịch Tự Động (LichHen)](#module-4-quản-lý-lịch-hẹn--nhắc-lịch-tự-động-lichhen)
   - [Module 5: Hồ Sơ Bệnh Án & Khám Lâm Sàng (HoSoBenhAn)](#module-5-hồ-sơ-bệnh-án--khám-lâm-sàng-hosobenhan)
   - [Module 6: Cận Lâm Sàng, Xét Nghiệm & Upload Tệp Ảnh (XetNghiem)](#module-6-cận-lâm-sàng-xét-nghiệm--upload-tệp-ảnh-xetnghiem)
   - [Module 7: Quản Lý Nhà Thuốc, Kho Dược FEFO & Dự Báo ML (NhaThuoc)](#module-7-quản-lý-nhà-thuốc-kho-dược-fefo--dự-báo-ml-nhathuoc)
   - [Module 8: Viện Phí, BHYT & Cổng Thanh Toán (ThanhToan)](#module-8-viện-phí-bhyt--cổng-thanh-toán-thanhtoan)
   - [Module 9: Quản Trị Hệ Thống, Xếp Lịch Trực & Sao Lưu Dữ Liệu (QuanLy)](#module-9-quản-trị-hệ-thống-xếp-lịch-trực--sao-lưu-dữ-liệu-quanly)
   - [Module 10: Nhân Sự & Đơn Từ Nội Bộ (NhanVien)](#module-10-nhân-sự--đơn-từ-nội-bộ-nhanvien)
   - [Module 11: Thông Báo & Đồng Bộ Thời Gian Thực (ThongBao - WebSocket)](#module-11-thông-báo--đồng-bộ-thời-gian-thực-thongbao---websocket)
   - [Module 12: Trí Tuệ Nhân Tạo & Phân Luồng Động (AI Triage & Dynamic Queue)](#module-12-trí-tuệ-nhân-tạo--phân-luồng-động-ai-triage--dynamic-queue)
4. [MA TRẬN TRUY XUẤT YÊU CẦU (TRACEABILITY MATRIX)](#4-ma-trận-truy-xuất-yêu-cầu-traceability-matrix)
5. [HƯỚNG DẪN THỰC THI KIỂM THỬ TỰ ĐỘNG](#5-hướng-dẫn-thực-thi-kiểm-thử-tự-động)

---

## 1. TỔNG QUAN HỆ THỐNG & MÔI TRƯỜNG KIỂM THỬ

### 1.1 Mục tiêu kiểm thử
Xác minh tính đúng đắn về mặt logic nghiệp vụ, tính toàn vẹn dữ liệu y tế, hiệu năng phản hồi và khả năng bảo mật của toàn bộ các API Endpoints thuộc hệ thống Quản lý Phòng khám Đa khoa.

### 1.2 Môi trường thực thi (Test Environment)
- **Base API URL:** `http://localhost:5000/api`
- **Python ML API URL:** `http://localhost:5001`
- **Database Engine:** MySQL 8.0 Community Server (CSDL `phong_kham`)
- **Queue & Cache:** Redis 7.x (Port 6379)
- **Cơ chế xác thực:** JWT Bearer Token (Header: `Authorization: Bearer <token>`)
- **Phân quyền RBAC:** `quan_tri_vien`, `ban_giam_doc`, `bac_si`, `ky_thuat_vien`, `nhan_vien_nha_thuoc`, `thu_ngan`, `tiep_tan`, `benh_nhan`.

---

## 2. QUY ƯỚC ĐẶT MÃ & TIÊU CHÍ TEST CASE

- **Mã Test Case:** `TC-[MODULE]-[STT]` (Ví dụ: `TC-AUTH-01`, `TC-LH-04`, `TC-TT-02`)
- **Loại kiểm thử (Type):**
  - **Happy Path (HP):** Kiểm tra kịch bản chuẩn với dữ liệu hợp lệ.
  - **Negative / Edge Case (NEG):** Kiểm tra ngoại lệ, dữ liệu biên, dữ liệu không hợp lệ.
  - **Security (SEC):** Kiểm tra xác thực token, phân quyền vai trò (401, 403), injection, rate limit.
  - **Concurrency / Lock (CON):** Kiểm tra xung đột dữ liệu (Optimistic Lock 409).
- **Trạng thái kỳ vọng:** Mã phản hồi HTTP (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`).

---

## 3. MA TRẬN KIỂM THỬ 12 PHÂN HỆ BACKEND

```
+-----------------------------------------------------------------------------------+
|                           BACKEND TEST CASES COVERAGE                             |
|                                                                                   |
|  [Auth]             [TiepNhan]         [BenhNhan]         [LichHen]               |
|  TC-AUTH: 10 TCs    TC-TN: 8 TCs       TC-BN: 6 TCs       TC-LH: 9 TCs            |
|                                                                                   |
|  [HoSoBenhAn]       [XetNghiem]        [NhaThuoc]         [ThanhToan]             |
|  TC-HSBA: 8 TCs     TC-CLS: 8 TCs      TC-NT: 9 TCs       TC-TT: 8 TCs            |
|                                                                                   |
|  [QuanLy]           [NhanVien]         [ThongBao]         [AI & ML]               |
|  TC-QL: 10 TCs      TC-NV: 5 TCs       TC-TB: 4 TCs       TC-AI: 6 TCs            |
+-----------------------------------------------------------------------------------+
```

---

### MODULE 1: XÁC THỰC & QUẢN LÝ TRUY CẬP (AUTH, OTP & SMS GATEWAY)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-AUTH-01** | `POST /auth/login` | Đăng nhập tài khoản Bác sĩ hợp lệ | HP | `{"tenDangNhap": "bacsi_hung", "matKhau": "123456"}` | Trả về `accessToken`, `refreshToken`, user object (role: `bac_si`) | `200` |
| **TC-AUTH-02** | `POST /auth/login` | Đăng nhập với mật khẩu không chính xác | NEG | `{"tenDangNhap": "bacsi_hung", "matKhau": "sai_mat_khau"}` | `code: "DANG_NHAP_THAT_BAI"`, thông báo lỗi rõ ràng | `401` |
| **TC-AUTH-03** | `POST /auth/login` | Đăng nhập với tài khoản bị khóa | NEG | `{"tenDangNhap": "user_khoa", "matKhau": "123456"}` | `code: "TAI_KHOAN_BI_KHOA"` | `403` |
| **TC-AUTH-04** | `POST /auth/register-patient` | Đăng ký tài khoản bệnh nhân tự do hợp lệ | HP | `{"email": "patient.test@gmail.com", "matKhau": "Pass@123", "hoTen": "Trần Văn A", "soDienThoai": "0912345678"}` | Tạo tài khoản trạng thái `cho_xac_thuc`, tự động kích hoạt gửi OTP | `201` |
| **TC-AUTH-05** | `POST /auth/register-patient` | Đăng ký với Email đã tồn tại trong CSDL | NEG | `{"email": "patient.test@gmail.com", ...}` | `code: "USERNAME_EXISTS"`, báo lỗi email trùng | `409` |
| **TC-AUTH-06** | `POST /auth/send-otp` | Gửi mã OTP xác thực qua Email & SMS đồng thời | HP | `{"email": "patient.test@gmail.com", "soDienThoai": "0912345678"}` | Lưu mã OTP 6 số vào DB (hạn 10 phút), log SMS Dispatcher & gửi Mail | `201` |
| **TC-AUTH-07** | `POST /auth/verify-otp` | Xác thực OTP chính xác và kích hoạt tài khoản | HP | `{"email": "patient.test@gmail.com", "maOtp": "123456"}` | Đánh dấu `daSuDung = 1`, kích hoạt `trangThai = "hoat_dong"` | `200` |
| **TC-AUTH-08** | `POST /auth/verify-otp` | Nhập sai mã OTP quá 5 lần liên tiếp | SEC | `{"email": "patient.test@gmail.com", "maOtp": "000000"}` x5 | `code: "OTP_QUA_NHIEU_LAN_THU"`, khóa mã OTP | `400` |
| **TC-AUTH-09** | `POST /auth/refresh` | Làm mới Access Token bằng Refresh Token hợp lệ | HP | `{"refreshToken": "<valid_refresh_token>"}` | Trả về bộ access token & refresh token mới | `200` |
| **TC-AUTH-10** | `POST /auth/change-password` | Đổi mật khẩu tài khoản đang đăng nhập | SEC | Auth Header + `{"matKhauCu": "123456", "matKhauMoi": "NewPass@2026"}` | Cập nhật `matKhauHash` mới, vô hiệu hóa token cũ | `200` |

---

### MODULE 2: TIẾP NHẬN BỆNH NHÂN, HÀNG ĐỢI & SINH HIỆU (TIEPNHAN)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-TN-01** | `GET /tiep-nhan/hang-doi` | Lấy danh sách hàng đợi khám bệnh hôm nay | HP | Auth Header (Tiếp tân/Bác sĩ) | Danh sách lượt khám phân loại theo phòng: `cho_kham`, `dang_kham`, `dang_cls` | `200` |
| **TC-TN-02** | `POST /tiep-nhan` | Tiếp nhận bệnh nhân mới vào phòng khám | HP | `{"benhNhanId": 1, "phongKhamId": 2, "bacSiId": 1, "lyDoKham": "Đau bụng cấp"}` | Tạo lượt khám, sinh mã `LK2026xxxx`, sinh STT hàng đợi tự tăng theo ngày | `201` |
| **TC-TN-03** | `POST /tiep-nhan` | Tiếp nhận thiếu trường `phongKhamId` bắt buộc | NEG | `{"benhNhanId": 1, "lyDoKham": "Khám tổng quát"}` | ValidationPipe trả về lỗi thiếu `phongKhamId` | `400` |
| **TC-TN-04** | `POST /tiep-nhan/:id/sinh-hieu` | Đo và ghi nhận chỉ số sinh hiệu bệnh nhân | HP | `id: 1`, payload: `{"mach": 80, "huyetApTamThu": 120, "huyetApTamTruong": 80, "nhietDoC": 37.0, "spo2": 98}` | Lưu bản ghi sinh hiệu liên kết với lượt tiếp nhận, tính tự động BMI | `201` |
| **TC-TN-05** | `POST /tiep-nhan/:id/sinh-hieu` | Cảnh báo sinh hiệu bất thường (Huyết áp nguy kịch) | EDGE | `{"huyetApTamThu": 190, "huyetApTamTruong": 120}` | Lưu thành công và trả cờ cảnh báo ưu tiên cấp cứu (`priority: "khan_cap"`) | `201` |
| **TC-TN-06** | `GET /tiep-nhan/:id/sinh-hieu` | Lấy thông số sinh hiệu của lượt tiếp nhận | HP | `id: 1` | Trả về đầy đủ mạch, huyết áp, nhiệt độ, chiều cao, cân nặng, SpO2 | `200` |
| **TC-TN-07** | `PATCH /tiep-nhan/:id/trang-thai` | Chuyển trạng thái lượt khám sang `dang_cls` | HP | `id: 1`, payload: `{"trangThai": "dang_cls"}` | Cập nhật trạng thái và broadcast WebSocket sự kiện `queue:update` | `200` |
| **TC-TN-08** | `PATCH /tiep-nhan/:id/trang-thai` | Chuyển trạng thái lượt khám không tồn tại | NEG | `id: 999999`, payload: `{"trangThai": "dang_kham"}` | Trả về mã lỗi `404 Not Found` | `404` |

---

### MODULE 3: QUẢN LÝ HỒ SƠ BỆNH NHÂN (BENHNHAN)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-BN-01** | `GET /benh-nhan` | Tìm kiếm bệnh nhân theo tên hoặc SĐT | HP | Query: `?keyword=Nguyễn Văn&page=1&limit=10` | Danh sách bệnh nhân thỏa điều kiện kèm phân trang | `200` |
| **TC-BN-02** | `GET /benh-nhan/:id` | Xem chi tiết hồ sơ bệnh nhân kèm tiền sử bệnh | HP | `id: 1` | Trả về thông tin cá nhân, CCCD, số BHYT, tiền sử dị ứng thuốc | `200` |
| **TC-BN-03** | `POST /benh-nhan` | Tạo hồ sơ bệnh nhân mới | HP | `{"hoTen": "Lê Thị Lan", "ngaySinh": "1992-03-15", "gioiTinh": "nu", "soDienThoai": "0987654321", "soBhyt": "DN4791234567890"}` | Sinh mã `BN000xxx`, lưu CSDL thành công | `201` |
| **TC-BN-04** | `POST /benh-nhan` | Tạo bệnh nhân có số điện thoại sai định dạng | NEG | `{"hoTen": "Lê Văn B", "soDienThoai": "123"}` | Báo lỗi `soDienThoai` không hợp lệ | `400` |
| **TC-BN-05** | `PATCH /benh-nhan/:id` | Cập nhật thông tin dị ứng và địa chỉ bệnh nhân | HP | `id: 1`, payload: `{"diUng": "Dị ứng kháng sinh Penicillin", "diaChi": "Quận 1, TP.HCM"}` | Cập nhật dữ liệu thành công | `200` |
| **TC-BN-06** | `GET /benh-nhan/tra-cuu-bhyt/:soBhyt` | Kiểm tra tính hợp lệ của mã thẻ BHYT | HP | `soBhyt: "GD4791234567890"` | Trả về thông tin hạn thẻ BHYT và mức hưởng (80% / 100%) | `200` |

---

### MODULE 4: QUẢN LÝ LỊCH HẸN & NHẮC LỊCH TỰ ĐỘNG (LICHHEN)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-LH-01** | `GET /lich-hen` | Lọc danh sách lịch hẹn theo ngày và bác sĩ | HP | `?ngay=2026-09-08&bacSiId=2&trangThai=da_xac_nhan` | Danh sách ca hẹn phù hợp tiêu chí lọc | `200` |
| **TC-LH-02** | `GET /lich-hen/cua-toi` | Bệnh nhân xem danh sách lịch khám của chính mình | HP | Auth Header (Bệnh nhân) | Trả về danh sách lịch hẹn liên kết với `nguoiDungId` của token | `200` |
| **TC-LH-03** | `GET /lich-hen/slot-trong` | Xem các khung giờ còn trống của bác sĩ trong ngày | HP | `?bacSiId=1&ngayHen=2026-09-10` | Mảng các slot còn rảnh (loại bỏ các slot đã được đặt trước) | `200` |
| **TC-LH-04** | `POST /lich-hen` | Đặt lịch khám trực tiếp có tạm ứng 1/5 | HP | `{"benhNhanId": 1, "bacSiId": 1, "ngayHen": "2026-09-10", "gioHen": "08:30", "lyDoKham": "Đau nửa đầu"}` | Tạo lịch hẹn `LH2026xxxx`, trạng thái `cho_xac_nhan`, cọc 40.000đ | `201` |
| **TC-LH-05** | `POST /lich-hen` | Đặt lịch hẹn vào khung giờ đã có người khác đặt | NEG | `{"bacSiId": 1, "ngayHen": "2026-09-10", "gioHen": "08:30", ...}` | `code: "SLOT_DA_DUOC_DAT"`, báo lỗi 409 Conflict | `409` |
| **TC-LH-06** | `PATCH /lich-hen/:id/huy` | Bệnh nhân hủy lịch khám trước giờ hẹn > 2 tiếng | HP | `id: 1` (giờ khám cách hiện tại > 2h) | Hủy thành công, ghi chú hoàn trả 100% tiền cọc 40.000đ qua VNPay/MoMo | `200` |
| **TC-LH-07** | `PATCH /lich-hen/:id/huy` | Bệnh nhân cố tình hủy lịch khám khi còn dưới 2 tiếng | NEG | `id: 2` (giờ khám cách hiện tại < 2h) | `code: "KHONG_THE_HUY_DUOI_2_TIENG"`, không hoàn cọc | `400` |
| **TC-LH-08** | `PATCH /lich-hen/:id/trang-thai` | Cập nhật trạng thái ca hẹn với Optimistic Locking | CON | `id: 1`, payload: `{"trangThai": "da_xac_nhan", "phienBan": 0}` | Tăng `phienBan` lên 1, cập nhật trạng thái | `200` |
| **TC-LH-09** | `POST /lich-hen/nhac-lich-tu-dong` | Kích hoạt quét và gửi email nhắc hẹn trước 24h | HP | Auth Header (Tiếp tân/Quản trị viên) | Quét các ca hẹn ngày mai, gửi email template HTML chuẩn, gắn cờ `[ĐÃ_NHẮC_LỊCH]` | `201` |

---

### MODULE 5: HỒ SƠ BỆNH ÁN & KHÁM LÂM SÀNG (HOSOBENHAN)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-HSBA-01** | `POST /ho-so-benh-an/benh-an-kham/:benhNhanId` | Khởi tạo phiếu khám bệnh mới cho lượt tiếp nhận | HP | `benhNhanId: 1`, payload: `{"luotTiepNhanId": 1, "hinhThucKham": "truc_tiep"}` | Tạo phiếu khám bệnh, gán bác sĩ phụ trách từ phiên đăng nhập | `201` |
| **TC-HSBA-02** | `GET /ho-so-benh-an/benh-an-kham/luot/:luotId` | Lấy dữ liệu phiếu khám hiện thời theo lượt tiếp nhận | HP | `luotId: 1` | Trả về triệu chứng, chẩn đoán, diễn tiến bệnh án | `200` |
| **TC-HSBA-03** | `PATCH /ho-so-benh-an/benh-an-kham/:id` | Bác sĩ lưu nháp thông tin khám bệnh | HP | `id: 1`, payload: `{"trieuChung": "Sốt nhẹ, rát họng", "chanDoanSoBo": "Theo dõi Viêm họng cấp"}` | Lưu tạm thời vào DB mà không bắt buộc nhập ICD-10 | `200` |
| **TC-HSBA-04** | `PATCH /ho-so-benh-an/benh-an-kham/:id/ket-thuc` | Hoàn tất ca khám với đầy đủ chẩn đoán xác định | HP | `id: 1`, payload: `{"chanDoanXacDinh": "Viêm amidan cấp (J03)", "phuongPhapDieuTri": "Ngoại trú, kháng sinh đường uống"}` | Chuyển trạng thái sang `da_hoan_thanh`, cập nhật EMR bệnh nhân | `200` |
| **TC-HSBA-05** | `PATCH /ho-so-benh-an/benh-an-kham/:id/ket-thuc` | Bấm kết thúc khám nhưng bỏ trống chẩn đoán xác định | NEG | `id: 1`, payload: `{"chanDoanXacDinh": ""}` | Báo lỗi `CHUA_NHAP_CHAN_DOAN_XAC_DINH`, ngăn kết thúc | `400` |
| **TC-HSBA-06** | `GET /ho-so-benh-an/lich-su/:benhNhanId` | Xem toàn bộ lịch sử các lần khám bệnh trước đây | HP | `benhNhanId: 1` | Trả về danh sách timeline các lần khám, bác sĩ khám, đơn thuốc | `200` |
| **TC-HSBA-07** | `GET /ho-so-benh-an/thong-ke-bac-si` | Bác sĩ xem báo cáo thống kê khám chữa bệnh cá nhân | HP | Auth Header (Bác sĩ) | Số ca đã khám, tỷ lệ hoàn thành, doanh thu tạo ra từ CSDL thực tế | `200` |
| **TC-HSBA-08** | `GET /ho-so-benh-an/cua-toi` | Bệnh nhân xem hồ sơ sức khỏe điện tử EMR cá nhân | HP | Auth Header (Bệnh nhân) | Trả về toàn bộ lịch sử chẩn đoán, sinh hiệu, đơn thuốc của bệnh nhân | `200` |

---

### MODULE 6: CẬN LÂM SÀNG, XÉT NGHIỆM & UPLOAD TỆP ẢNH (XETNGHIEM)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-CLS-01** | `GET /xet-nghiem/dich-vu` | Lấy danh mục dịch vụ cận lâm sàng (XN, Siêu âm, X-Quang) | HP | Không tham số | Danh sách dịch vụ kèm mã, tên, đơn giá niêm yết CSDL | `200` |
| **TC-CLS-02** | `POST /xet-nghiem/chi-dinh` | Bác sĩ tạo phiếu chỉ định nhiều dịch vụ cận lâm sàng | HP | `{"benhAnKhamId": 1, "dsChiDinh": [{"dichVuXetNghiemId": 1}, {"dichVuXetNghiemId": 3}]}` | Tạo danh sách chỉ định trạng thái `cho_thuc_hien`, tính viện phí | `201` |
| **TC-CLS-03** | `GET /xet-nghiem/danh-sach-cho` | KTV lấy danh sách các mẫu đang chờ làm xét nghiệm | HP | Auth Header (Kỹ thuật viên) | Danh sách chỉ định phân nhóm theo phòng xét nghiệm | `200` |
| **TC-CLS-04** | `POST /xet-nghiem/upload` | Upload hình ảnh kết quả xét nghiệm / X-Quang thực tế | HP | Multipart FormData: `file: <chest_xray.png>` | Lưu file vào `uploads/`, trả về URL tĩnh `/uploads/xxxx.png` | `201` |
| **TC-CLS-05** | `POST /xet-nghiem/upload` | Upload file không hợp lệ (file thực thi .exe) | SEC | Multipart FormData: `file: <malicious.exe>` | Multer FileFilter từ chối, trả về lỗi định dạng tệp | `400` |
| **TC-CLS-06** | `POST /xet-nghiem/ket-qua/:chiDinhId` | KTV nhập trị số kết quả và gắn kèm file ảnh vừa upload | HP | `chiDinhId: 1`, payload: `{"giaTri": "5.2", "donVi": "mmol/L", "nhanXet": "Đường huyết ổn định", "fileDinhKem": "/uploads/kq1.png"}` | Cập nhật `trangThai = "co_ket_qua"`, gửi thông báo Realtime tới Bác sĩ | `201` |
| **TC-CLS-07** | `GET /xet-nghiem/benh-an-kham/:id` | Bác sĩ xem toàn bộ kết quả CLS đã có của ca khám | HP | `id: 1` | Trả về danh sách dịch vụ, trị số, nhận xét và ảnh chụp đính kèm | `200` |
| **TC-CLS-08** | `GET /uploads/:filename` | Truy cập tệp hình ảnh xét nghiệm qua static route | HP | `GET /uploads/chest_xray.png` | Server trả về file ảnh binary với Content-Type `image/png` | `200` |

---

### MODULE 7: QUẢN LÝ NHÀ THUỐC, KHO DƯỢC FEFO & DỰ BÁO ML (NHATHUOC)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-NT-01** | `GET /nha-thuoc/thuoc` | Tra cứu danh mục thuốc và số lượng tồn kho khả dụng | HP | `?search=Paracetamol` | Danh sách thuốc, số lô, hạn dùng gần nhất, tồn kho tổng | `200` |
| **TC-NT-02** | `POST /nha-thuoc/thuoc` | Dược sĩ tạo mới thuốc vào danh mục | HP | `{"maThuoc": "TH099", "tenThuoc": "Augmentin 1g", "donViTinh": "viên", "giaBan": 25000}` | Tạo bản ghi thuốc mới vào CSDL | `201` |
| **TC-NT-03** | `POST /nha-thuoc/don-thuoc` | Bác sĩ kê đơn thuốc điện tử cho bệnh nhân | HP | `{"benhAnKhamId": 1, "chiTiet": [{"thuocId": 1, "soLuong": 20, "lieuDung": "Ngày 2 lần"}]}` | Tạo đơn thuốc mã `DT2026xxxx`, trạng thái `cho_cap_phat` | `201` |
| **TC-NT-04** | `POST /nha-thuoc/don-thuoc` | Kê đơn thuốc khi số lượng kê vượt quá tồn kho thực tế | NEG | `{"chiTiet": [{"thuocId": 1, "soLuong": 999999}]}` | Cảnh báo không đủ thuốc trong kho để kê đơn | `400` |
| **TC-NT-05** | `POST /nha-thuoc/don-thuoc/:id/cap-phat` | Dược sĩ cấp phát thuốc theo nguyên tắc FEFO | HP | `id: 1` | Trừ số lượng ở lô có hạn dùng gần nhất trước, đánh dấu `da_cap_phat` | `201` |
| **TC-NT-06** | `POST /nha-thuoc/don-thuoc/:id/cap-phat` | Cấp phát lại đơn thuốc đã được xuất kho trước đó | NEG | `id: 1` (đã cấp phát) | Báo lỗi đơn thuốc đã được cấp phát, không được trừ kho lần 2 | `400` |
| **TC-NT-07** | `GET /nha-thuoc/thong-ke` | Thống kê doanh số nhà thuốc, thuốc sắp hết hàng, cận date | HP | `?khoangThoiGian=7days` | Báo cáo doanh số, số đơn đã xuất, danh sách thuốc tồn dưới định mức | `200` |
| **TC-NT-08** | `GET /nha-thuoc/du-bao-nhu-cau` | Dự báo nhu cầu thuốc 14 ngày tới bằng ML Holt-Winters | HP | `?horizonDays=14` | Kết nối Python ML, trả về dự báo nhu cầu 7d/14d, ngày tồn còn lại, đề xuất nhập | `200` |
| **TC-NT-09** | `GET /nha-thuoc/du-bao-nhu-cau` | Kiểm tra cơ chế tự động Fallback khi Python ML offline | EDGE | Dừng service Python port 5001 | Hệ thống tự chuyển sang NestJS Integrated Forecaster mà không bị crash | `200` |

---

### MODULE 8: VIỆN PHÍ, BHYT & CỔNG THANH TOÁN (THANHTOAN)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-TT-01** | `GET /thanh-toan/hoa-don/luot-kham/:luotId` | Tính tổng viện phí trọn gói (Khám + CLS + Thuốc) | HP | `luotId: 1` | Gộp tự động các khoản phí, hiển thị tổng tiền viện phí | `200` |
| **TC-TT-02** | `POST /thanh-toan/hoa-don` | Tạo hóa đơn thanh toán thông thường không BHYT | HP | `{"luotKhamId": 1, "phuongThuc": "tien_mat", "apDungBhyt": false}` | Tính đúng 100% viện phí, tạo mã hóa đơn `HD2026xxxx` | `201` |
| **TC-TT-03** | `POST /thanh-toan/hoa-don` | Thanh toán áp dụng chiết khấu BHYT 80% thực tế | HP | `{"luotKhamId": 1, "apDungBhyt": true, "tyLeBhyt": 80}` | BHYT chi trả 80% danh mục hợp lệ, bệnh nhân đồng chi trả 20% | `201` |
| **TC-TT-04** | `PATCH /thanh-toan/hoa-don/:id/xac-nhan` | Xác nhận thu tiền thành công và hoàn tất lượt khám | HP | `id: 1`, payload: `{"soTienNhan": 200000}` | Cập nhật hóa đơn `da_thanh_toan`, chuyển lượt khám sang `hoan_thanh` | `200` |
| **TC-TT-05** | `POST /thanh-toan/vnpay/tao-url` | Tạo đường dẫn thanh toán qua cổng VNPay điện tử | HP | `{"hoaDonId": 1, "soTien": 150000, "nganHang": "NCB"}` | Trả về URL thanh toán VNPay Sandbox có checksum SHA512 hợp lệ | `201` |
| **TC-TT-06** | `GET /thanh-toan/vnpay/callback` | Tiếp nhận IPN Webhook callback từ VNPay | HP | Query params chứa mã giao dịch `vnp_ResponseCode=00` | Cập nhật tự động trạng thái hóa đơn thành công | `200` |
| **TC-TT-07** | `GET /thanh-toan/vnpay/callback` | Webhook với chữ ký số (vnp_SecureHash) giả mạo | SEC | Query params với checksum sai | Từ chối cập nhật, trả về `code: "CHU_KY_KHONG_HOP_LE"` | `400` |
| **TC-TT-08** | `GET /thanh-toan/in-hoa-don/:id` | Xuất dữ liệu in biên lai tài chính song ngữ | HP | `id: 1` | Đầy đủ thông tin người nộp, cơ quan thu, chi tiết khoản viện phí | `200` |

---

### MODULE 9: QUẢN TRỊ HỆ THỐNG, XẾP LỊCH TRỰC & SAO LƯU DỮ LIỆU (QUANLY)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-QL-01** | `GET /quan-ly/system-overview` | Xem thông số kỹ thuật hệ thống (RAM, CPU, Uptime, DB size) | HP | Auth Header (`quan_tri_vien`) | Trả về cấu hình máy chủ, số bảng DB, số người dùng trực tuyến | `200` |
| **TC-QL-02** | `GET /quan-ly/system-overview` | Nhân viên Tiếp tân cố truy cập trang Quản trị kỹ thuật | SEC | Auth Header (`tiep_tan`) | RolesGuard chặn truy cập, trả về lỗi `403 Forbidden` | `403` |
| **TC-QL-03** | `GET /quan-ly/backup-info` | Lấy danh sách 31 bảng CSDL và dung lượng từng bảng | HP | Auth Header (`quan_tri_vien`) | Trả về mảng bảng CSDL, tổng số dòng và dung lượng MB | `200` |
| **TC-QL-04** | `GET /quan-ly/export-sql-dump` | Tải về bản sao lưu toàn diện CSDL định dạng `.sql` | HP | Auth Header (`quan_tri_vien`) | Header `Content-Type: application/sql`, đính kèm DDL và Data toàn bộ DB | `200` |
| **TC-QL-05** | `GET /quan-ly/lich-lam-viec` | Lấy bảng phân ca trực nhân viên y tế trong tuần | HP | `?weekStart=2026-09-07` | Lưới phân ca thứ 2 đến chủ nhật của Bác sĩ, KTV, Dược sĩ, Tiếp tân | `200` |
| **TC-QL-06** | `POST /quan-ly/lich-lam-viec` | Phân ca làm việc hợp lệ cho nhân viên | HP | `[{"nhanVienId": 2, "caLamViecId": 1, "ngayLam": "2026-09-08"}]` | Lưu lịch phân ca thành công | `201` |
| **TC-QL-07** | `POST /quan-ly/lich-lam-viec` | Xếp trùng ca trực của cùng nhân viên trong một ngày | NEG | `[{"nhanVienId": 2, "caLamViecId": 1, "ngayLam": "2026-09-08"}]` (đã có) | Báo lỗi `409 ConflictException` (trùng ca trực) | `409` |
| **TC-QL-08** | `POST /quan-ly/lich-lam-viec` | Xếp quá 2 ca trực trong một ngày cho cùng một nhân viên | NEG | Thêm ca thứ 3 trong cùng ngày | Báo lỗi `400 BadRequestException` (vi phạm an toàn lao động y tế) | `400` |
| **TC-QL-09** | `DELETE /quan-ly/lich-lam-viec/:id` | Xóa một ca trực khỏi lịch làm việc | HP | `id: 5` | Xóa thành công bản ghi phân ca | `200` |
| **TC-QL-10** | `GET /quan-ly/dashboard-stats` | Ban giám đốc xem chỉ số KPI tài chính và lượt khám | HP | Auth Header (`ban_giam_doc`) | Doanh thu thực, số lượt tiếp nhận, biểu đồ tăng trưởng bệnh nhân | `200` |

---

### MODULE 10: NHÂN SỰ & ĐƠN TỪ NỘI BỘ (NHANVIEN)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-NV-01** | `GET /nhan-vien/ho-so-ca-nhan` | Nhân viên xem thông tin hồ sơ và bằng cấp cá nhân | HP | Auth Header (Nhân viên bất kỳ) | Trả về họ tên, chứng chỉ hành nghề, chức vụ, khoa phòng | `200` |
| **TC-NV-02** | `PATCH /nhan-vien/ho-so-ca-nhan` | Nhân viên cập nhật số điện thoại và địa chỉ liên lạc | HP | `{"soDienThoai": "0911223344", "diaChi": "TP. Thủ Đức"}` | Cập nhật thông tin thành công | `200` |
| **TC-NV-03** | `POST /nhan-vien/don-tu` | Nhân viên gửi đơn xin nghỉ phép lên Ban giám đốc | HP | `{"loaiDon": "nghi_phep", "tuNgay": "2026-09-15", "denNgay": "2026-09-16", "lyDo": "Việc gia đình"}` | Tạo đơn từ trạng thái `cho_duyet` | `201` |
| **TC-NV-04** | `GET /nhan-vien/don-tu/danh-sach` | Ban giám đốc xem danh sách các đơn từ cần xét duyệt | HP | Auth Header (`ban_giam_doc`) | Danh sách đơn nghỉ phép, đề xuất vật tư cần phê duyệt | `200` |
| **TC-NV-05** | `PATCH /nhan-vien/don-tu/:id/duyet` | Ban giám đốc phê duyệt hoặc từ chối đơn | HP | `id: 1`, payload: `{"trangThai": "da_duyet", "yKien": "Đồng ý nghỉ"}` | Cập nhật trạng thái và gửi thông báo Realtime đến người làm đơn | `200` |

---

### MODULE 11: THÔNG BÁO & ĐỒNG BỘ THỜI GIAN THỰC (THONGBAO - WEBSOCKET)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-TB-01** | `WS connect /` | Kết nối WebSocket Gateway với JWT Bearer Token | HP | Handshake query: `?token=<valid_jwt>` | Kết nối thành công, join vào các room cá nhân và room khoa phòng | `101` |
| **TC-TB-02** | `WS connect /` | Kết nối WebSocket không truyền Token hoặc Token hết hạn | SEC | Handshake không có token hợp lệ | Gateway từ chối kết nối (`Disconnect`) | `401` |
| **TC-TB-03** | `WS event: xn:result_ready` | KTV hoàn tất XN -> Bác sĩ nhận sự kiện Realtime | HP | Trigger từ `POST /xet-nghiem/ket-qua` | Bác sĩ nhận gói tin thông báo kết quả XN trong thời gian < 100ms | N/A |
| **TC-TB-04** | `GET /thong-bao` | Lấy danh sách các thông báo chưa đọc của người dùng | HP | Auth Header | Mảng thông báo, đếm số lượng `unreadCount` | `200` |

---

### MODULE 12: TRÍ TUỆ NHÂN TẠO & PHÂN LUỒNG ĐỘNG (AI TRIAGE & DYNAMIC QUEUE)

| ID | Endpoint & Method | Mô tả kịch bản | Loại | Đầu vào (Payload / Headers) | Kỳ vọng kết quả (Expected Output) | HTTP |
|---|---|---|---|---|---|---|
| **TC-AI-01** | `POST /ai/triage` | Phân loại triệu chứng bệnh nhân bằng Gemini AI | HP | `{"trieuChung": "Đau ngực trái dữ dội lan ra cánh tay, vã mồ hôi"}` | Khuyến nghị chuyên khoa Tim Mạch, mức độ khẩn cấp Cấp cứu đỏ | `200` |
| **TC-AI-02** | `POST /ai/triage` | Gửi chuỗi triệu chứng rỗng | NEG | `{"trieuChung": ""}` | Trả về thông báo yêu cầu mô tả triệu chứng cụ thể | `400` |
| **TC-AI-03** | `GET /ai/dynamic-queue/:benhAnId` | Thuật toán Python Min-Wait tối ưu lộ trình CLS | HP | `benhAnId: 1` (có chỉ định Máu + X-Quang) | Trả về lộ trình tối ưu (phòng vắng làm trước), ước tính thời gian tiết kiệm | `200` |
| **TC-AI-04** | `POST /ai/forecast` | Dự báo lưu lượng bệnh nhân 7 ngày tới (Holt-Winters) | HP | `{"horizon": 7, "history_days": 90}` | Dự báo số ca từng ngày, độ tin cậy, MAPE, heatmap khung giờ cao điểm | `200` |
| **TC-AI-05** | `POST /ai/forecast-medicine` | Dự báo nhu cầu thuốc 14 ngày tới từ Python Microservice | HP | `{"horizon_days": 14, "items": [{"maThuoc": "TH001", "tonKhoTong": 50}]}` | Tốc độ xuất/ngày, dự báo 7d/14d, cảnh báo điểm đặt hàng lại | `200` |
| **TC-AI-06** | `GET /ai/health` | Kiểm tra kết nối dịch vụ Python FastAPI ML (:5001) | HP | Không tham số | Trả về `{"status": "ok", "service": "PhongKham ML Forecasting"}` | `200` |

---

## 4. MA TRẬN TRUY XUẤT YÊU CẦU (TRACEABILITY MATRIX)

| Mã Yêu Cầu SRS | Mô Tả Nghiệp Vụ Y Tế | Các Test Case Tương Ứng | Kết Quả Đạt Được |
|---|---|---|---|
| **REQ-AUTH-01** | Đăng nhập an toàn, cấp phát JWT & phân quyền 8 vai trò | TC-AUTH-01, 02, 03, 09, 10 | Đạt chuẩn bảo mật OWASP |
| **REQ-AUTH-02** | Đăng ký & xác thực bệnh nhân qua Email + SMS song song | TC-AUTH-04, 05, 06, 07, 08 | Tích hợp SMS Gateway |
| **REQ-QUEUE-01** | Cấp STT tiếp nhận, quản lý hàng đợi và phân luồng phòng khám | TC-TN-01, 02, 03, 07, 08 | Đồng bộ Realtime WebSocket |
| **REQ-VITALS-01**| Ghi nhận sinh hiệu, tính BMI, tự động cảnh báo huyết áp nguy kịch | TC-TN-04, 05, 06 | Phân luồng ưu tiên cấp cứu |
| **REQ-PATIENT-01**| Quản lý thông tin định danh bệnh nhân, thẻ BHYT & tiền sử dị ứng | TC-BN-01, 02, 03, 04, 05, 06 | Tuân thủ hồ sơ y tế điện tử |
| **REQ-BOOKING-01**| Đặt lịch khám, tính cọc 1/5, quy tắc hủy trước 2h hoàn cọc | TC-LH-01, 02, 03, 04, 05, 06, 07 | Tự động xử lý hoàn cọc VNPay |
| **REQ-REMIND-01** | Quét lịch tự động trước 24h & gửi email nhắc nhở kèm dặn dò | TC-LH-09 | Cron Scheduler 30 phút/lần |
| **REQ-CLINICAL-01**| Bác sĩ khám bệnh, bắt buộc mã ICD-10 khi kết thúc, xem EMR | TC-HSBA-01, 02, 03, 04, 05, 06, 08 | Chuẩn hóa danh mục ICD-10 |
| **REQ-LAB-01** | Chỉ định cận lâm sàng, KTV upload ảnh/PDF, trả kết quả Realtime | TC-CLS-01, 02, 03, 04, 05, 06, 07, 08 | Lưu trữ tệp tĩnh an toàn |
| **REQ-PHARM-01** | Kê đơn điện tử, xuất kho FEFO (First-Expired, First-Out) | TC-NT-01, 02, 03, 04, 05, 06, 07 | Trừ kho tự động theo lô |
| **REQ-PHARM-02** | Dự báo nhu cầu thuốc 14 ngày bằng AI/ML Holt-Winters | TC-NT-08, 09, TC-AI-05 | Có cơ chế Fallback tự động |
| **REQ-BILLING-01**| Gộp viện phí trọn gói, chiết khấu BHYT 80%, cổng VNPay | TC-TT-01, 02, 03, 04, 05, 06, 07, 08 | Kiểm tra chữ ký SHA512 |
| **REQ-ROSTER-01** | Phân ca làm việc, chặn xếp trùng ca (409) và quá tải 2 ca/ngày | TC-QL-05, 06, 07, 08, 09 | 2 tầng kiểm tra (Client + Server) |
| **REQ-BACKUP-01** | Giám sát dung lượng CSDL & Xuất tệp sao lưu `.sql` toàn diện | TC-QL-03, 04 | Hỗ trợ phục hồi thảm họa |
| **REQ-AI-01** | Sàng lọc triệu chứng thông minh & Định tuyến hàng đợi Min-Wait | TC-AI-01, 02, 03, 04, 06 | Giảm thời gian chờ đợi BN |

---

## 5. HƯỚNG DẪN THỰC THI KIỂM THỬ TỰ ĐỘNG

### 5.1 Chạy Unit / E2E Tests bằng Jest & Supertest (Backend)
```bash
cd d:\KLTN\backend

# Chạy toàn bộ kiểm thử tích hợp (Integration / E2E Tests)
npm run test:e2e

# Chạy kiểm thử đơn vị các Service
npm run test

# Kiểm tra độ bao phủ mã nguồn (Code Coverage)
npm run test:cov
```

### 5.2 Kịch bản kiểm thử API nhanh bằng cURL

#### 1. Kiểm tra Health Check Backend & AI
```bash
# Kiểm tra NestJS API Gateway
curl -X GET http://localhost:5000/api/quan-ly/system-overview -H "Authorization: Bearer <ADMIN_TOKEN>"

# Kiểm tra Python ML Microservice
curl -X GET http://localhost:5001/health
```

#### 2. Kiểm thử Endpoint Nhắc Lịch Khám Tự Động (TC-LH-09)
```bash
curl -X POST http://localhost:5000/api/lich-hen/nhac-lich-tu-dong \
  -H "Authorization: Bearer <TIEPTAN_TOKEN>" \
  -H "Content-Type: application/json"
```

#### 3. Kiểm thử Tải Xuất Bản Sao Lưu CSDL .SQL (TC-QL-04)
```bash
curl -X GET http://localhost:5000/api/quan-ly/export-sql-dump \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -o backup_test.sql
```

#### 4. Kiểm thử Dự Báo Nhu Cầu Thuốc ML (TC-NT-08)
```bash
curl -X GET "http://localhost:5000/api/nha-thuoc/du-bao-nhu-cau?horizonDays=14" \
  -H "Authorization: Bearer <PHARMACY_TOKEN>"
```

#### 5. Kiểm thử Chống Trùng Ca Làm Việc (TC-QL-07)
```bash
curl -X POST http://localhost:5000/api/quan-ly/lich-lam-viec \
  -H "Authorization: Bearer <DIRECTOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '[{"nhanVienId": 2, "caLamViecId": 1, "ngayLam": "2026-09-08"}]'
# Kỳ vọng lần 1: 201 Created
# Gửi lại lần 2: 409 Conflict với mã lỗi TRUNG_CA_LAM_VIEC
```

---
*Tài liệu SRS và Ma trận Kiểm thử Backend này được tạo tự động nhằm phục vụ đánh giá nghiệm thu KLTN, kiểm toán chất lượng phần mềm y tế và quy trình CI/CD.*

