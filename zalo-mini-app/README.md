# Zalo Mini App – Cổng bệnh nhân

Mini App chạy trong Zalo cho bệnh nhân: đăng nhập bằng Zalo, đặt lịch khám, thanh toán cọc qua PayOS, xem/hủy lịch hẹn, xem kết quả khám, đơn thuốc và bật nhận thông báo từ phòng khám.

Mini App gọi thẳng các API có sẵn của `backend/`. Phía backend chỉ thêm một API mới là `POST /api/auth/zalo`.

## Cấu trúc

```
zalo-mini-app/
├── app-config.json        # Tiêu đề, màu thanh điều hướng của Mini App
├── vite.config.mjs
├── .env                   # VITE_API_URL, VITE_ZALO_OA_ID, VITE_HOTLINE
└── src/
    ├── app.jsx            # Điểm vào
    ├── components/        # layout (router + thanh tab), ui (card, badge, chip...)
    ├── lib/
    │   ├── api.js         # fetch + tự làm mới token khi gặp 401
    │   ├── zalo.js        # Đăng nhập Zalo, quan tâm OA, xin quyền thông báo, gọi/nhắn tin
    │   ├── thanh-toan.js  # Tạo link PayOS, kiểm tra thanh toán
    │   └── storage.js     # Lưu phiên (nativeStorage của Zalo / localStorage khi chạy web)
    └── pages/             # login, home, booking, appointments, records, profile
```

## Luồng đăng nhập bằng Zalo

1. Mini App gọi `getAccessToken()` rồi gửi `POST /api/auth/zalo { accessToken }`.
2. Backend gọi `graph.zalo.me/v2.0/me` để lấy Zalo ID. Nếu ID đã liên kết với một tài khoản thì trả JWT luôn.
3. Lần đầu, backend trả lỗi `CAN_SO_DIEN_THOAI`. Mini App gọi `getPhoneNumber()` (Zalo hiện hộp thoại xin quyền) và gửi lại kèm `phoneToken`.
4. Backend dùng `ZALO_APP_SECRET` để giải mã số điện thoại, rồi xử lý theo một trong ba trường hợp:
   - Số trùng hồ sơ bệnh nhân đã có tài khoản: gắn Zalo ID vào tài khoản đó.
   - Số trùng hồ sơ do lễ tân tạo nhưng chưa có tài khoản: tạo tài khoản cho hồ sơ đó.
   - Chưa có hồ sơ: tạo mới cả tài khoản lẫn hồ sơ bệnh nhân.

Số điện thoại do Zalo xác thực nên backend không cần gửi OTP.

## Cài đặt lần đầu

### 1. Backend
- Chạy migration [database/20261122_dang_nhap_zalo.sql](../database/20261122_dang_nhap_zalo.sql) (thêm cột `nguoi_dung.zalo_id`).
- Thêm biến môi trường `ZALO_APP_SECRET` (lấy ở developers.zalo.me → app của bạn → Secret key).
- Backend mặc định cho phép CORS từ `https://h5.zdn.vn` và `https://h5.zadn.vn` (domain Zalo chạy Mini App). Đổi bằng biến `ZALO_MINI_APP_ORIGINS` nếu cần.

### 2. Đăng ký Mini App
1. Vào https://mini.zalo.me, tạo Mini App (cần một Zalo Official Account làm chủ sở hữu).
2. Trong phần cấu hình, khai báo:
   - **Quyền** (permission): *Thông tin người dùng*, *Số điện thoại*. Quyền số điện thoại phải gửi lý do sử dụng để Zalo duyệt.
   - **Whitelist domain**: domain backend (HTTPS), ví dụ `https://<backend>.onrender.com`.
3. Liên kết Mini App với app trên developers.zalo.me để có Secret key dùng cho bước giải mã số điện thoại.

### 3. Chạy thử
```bash
cd zalo-mini-app
npm install
cp .env.example .env              # sửa VITE_API_URL nếu cần

# Xem nhanh trên trình duyệt: các API của Zalo không chạy,
# đăng nhập bằng "tài khoản phòng khám" (email/SĐT + mật khẩu)
npm run dev

# Chạy giả lập Zalo / quét QR để mở trên điện thoại (đăng nhập Zalo chạy được)
npm install -g zmp-cli
zmp login
npm start
```

### 4. Deploy
```bash
zmp deploy      # chọn phiên bản Development/Testing, sau đó gửi duyệt trên mini.zalo.me
```

## Lưu ý khi Zalo duyệt Mini App
- Thanh toán cọc đang mở trang PayOS trong webview (`openWebview`). Nếu Zalo yêu cầu dùng cổng thanh toán của họ, phải chuyển sang Checkout SDK (`Payment.createOrder` trong `zmp-sdk`).
- Phải có chính sách quyền riêng tư và điều khoản sử dụng vì app xử lý dữ liệu sức khỏe.
- Bấm "Bật thông báo" trong app chỉ xin quyền (`requestSendNotification`) và mời quan tâm OA. Tin nhắn thật do backend gửi qua ZNS (xem phần dưới).

## Thông báo Zalo (ZNS) từ backend

Backend tự gửi 3 loại tin tới số điện thoại của bệnh nhân. Bệnh nhân không cần mở Mini App hay quan tâm OA.

| Loại | Gửi khi nào | Biến chứa ID mẫu tin | Tham số mẫu (tên phải khớp khi tạo mẫu) |
|---|---|---|---|
| Nhắc lịch | Đợt quét 30 phút/lần cho lịch hôm nay và ngày mai | `ZNS_TEMPLATE_NHAC_LICH` | `ten_benh_nhan`, `ma_lich_hen`, `ngay_hen`, `gio_hen`, `bac_si`, `dia_diem` |
| Xác nhận lịch | Lịch chuyển sang "đã xác nhận" (thanh toán cọc xong hoặc lễ tân duyệt) | `ZNS_TEMPLATE_XAC_NHAN_LICH` | giống nhắc lịch |
| Có kết quả | Mọi chỉ định cận lâm sàng của lượt khám đều đã có kết quả | `ZNS_TEMPLATE_CO_KET_QUA` | `ten_benh_nhan`, `ngay_kham`, `dich_vu` |

- Nhắc lịch: gửi Zalo trước. Nếu Zalo lỗi hoặc chưa cấu hình thì gửi email như trước đây. Tin xác nhận lịch gửi cả Zalo lẫn email.
- Mỗi tin chỉ gửi một lần cho mỗi lịch hẹn hoặc lượt khám. Lịch sử gửi lưu trong bảng `lich_su_gui_zalo`.
- Để trống ID mẫu của loại nào thì loại đó không gửi Zalo. Lỗi gửi Zalo không làm hỏng việc đặt lịch hay gửi email.

### Cài đặt
1. Chạy [database/20261123_thong_bao_zalo_zns.sql](../database/20261123_thong_bao_zalo_zns.sql).
2. Tạo các mẫu tin ZNS trên trang quản lý ZNS (account.zalo.cloud), chờ Zalo duyệt rồi lấy `template_id`.
3. Đặt các biến `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZNS_TEMPLATE_*`. Đặt `ZNS_MODE=development` khi demo; ở chế độ này tin chỉ đến được số của quản trị viên OA và không tính phí.
4. Lấy refresh token của OA bằng công cụ API Explorer trên developers.zalo.me (chọn loại token OA), rồi nhập bằng một trong hai cách:
   - Gọi `POST /api/thong-bao/zalo/token { "refreshToken": "..." }` với tài khoản quản trị viên, hoặc
   - Đặt biến `ZALO_OA_REFRESH_TOKEN` (chỉ dùng cho lần đầu).

   Sau đó hệ thống tự làm mới token và lưu vào DB. Refresh token chỉ dùng được một lần, nên không cần sửa lại biến môi trường nữa.
5. Kiểm tra cấu hình:
   - `GET /api/thong-bao/zalo/trang-thai`: xem cấu hình hiện tại.
   - `POST /api/thong-bao/zalo/gui-thu { "soDienThoai": "09...", "loai": "nhac_lich" }`: gửi thử một tin.
   - `GET /api/thong-bao/zalo/lich-su`: xem lịch sử gửi.

   Cả ba API này chỉ dành cho quản trị viên.
