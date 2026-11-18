# Zalo relay (IP Việt Nam)

Zalo chỉ trả tên / số điện thoại cho request từ IP Việt Nam. Backend chạy trên Render (IP nước ngoài) nên đăng nhập Zalo
bị lỗi `-501`. Relay này chạy trên máy có IP Việt Nam và chuyển tiếp lời gọi tới `graph.zalo.me`.

## Chạy
Lần đầu: copy `.env.example` thành `.env` rồi điền `RELAY_KEY` (giống `ZALO_RELAY_KEY` trên Render) và `ZALO_APP_SECRET`.
File `.env` không được đưa lên Git.

Mỗi lần dùng: **bấm đúp `chay-relay.bat`** → mở 2 cửa sổ (relay + ngrok). Đóng 2 cửa sổ đó để tắt.
Kiểm tra: mở `https://<ten-mien-ngrok>/health` thấy `{"ok":true}`.

Chỉ cần relay lúc bấm "Đăng nhập bằng Zalo"; đăng nhập xong, phiên được làm mới qua backend, không qua relay.

## Cấu hình backend (Render)
```
ZALO_GRAPH_BASE_URL=https://<ten-mien-ngrok>/   # không thêm /v2.0
ZALO_RELAY_KEY=<cùng giá trị RELAY_KEY>
```
Bỏ trống 2 biến này thì backend gọi thẳng Zalo như bình thường.
