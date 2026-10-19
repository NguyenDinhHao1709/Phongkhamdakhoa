-- Bổ sung trường quản lý bảng giá Excel cho Nhà cung cấp Dược
ALTER TABLE nha_cung_cap
  ADD COLUMN file_bang_gia_ten VARCHAR(255) NULL AFTER dieu_khoan_thanh_toan,
  ADD COLUMN ngay_cap_nhat_bang_gia DATETIME NULL AFTER file_bang_gia_ten,
  ADD COLUMN bang_gia_data JSON NULL AFTER ngay_cap_nhat_bang_gia;

