-- Thu hồi JWT khi đăng xuất / đổi mật khẩu: token mang số phiên bản cũ sẽ bị từ chối
-- PHẢI chạy trên Clever Cloud TRƯỚC khi push code backend lên main
ALTER TABLE nguoi_dung
  ADD COLUMN phien_ban_token INT NOT NULL DEFAULT 0 AFTER lan_dang_nhap_cuoi;
