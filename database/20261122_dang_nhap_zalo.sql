-- Đăng nhập bệnh nhân qua Zalo Mini App: lưu Zalo ID (theo app) của tài khoản.
-- Chạy trước khi deploy backend có API /api/auth/zalo.
ALTER TABLE nguoi_dung ADD COLUMN zalo_id VARCHAR(64) NULL AFTER ten_dang_nhap;
ALTER TABLE nguoi_dung ADD UNIQUE KEY uq_nguoi_dung_zalo_id (zalo_id);
