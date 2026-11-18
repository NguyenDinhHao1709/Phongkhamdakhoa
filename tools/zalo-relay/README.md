# Zalo relay (IP Việt Nam)

Zalo chỉ trả tên / số điện thoại cho request từ IP Việt Nam. Backend chạy trên Render (IP nước ngoài) nên đăng nhập Zalo
bị lỗi `-501`. Relay này chạy trên máy có IP Việt Nam và chuyển tiếp lời gọi tới `graph.zalo.me`.

## Chạy
```powershell
cd d:\KLTN\tools\zalo-relay
$env:RELAY_KEY = "mat-khau-dai-ngau-nhien"      # đặt giống ZALO_RELAY_KEY trên Render
$env:ZALO_APP_SECRET = "<khóa bí mật của Zalo App>"
node relay.js
```
Mở ra internet (cửa sổ khác): `ngrok http 8788` (có thể cấu hình tên miền tĩnh miễn phí trong tài khoản ngrok).

## Cấu hình backend (Render)
```
ZALO_GRAPH_BASE_URL=https://<ten-mien-ngrok>/   # không thêm /v2.0
ZALO_RELAY_KEY=<cùng giá trị RELAY_KEY>
```
Bỏ trống 2 biến này thì backend gọi thẳng Zalo như bình thường.
