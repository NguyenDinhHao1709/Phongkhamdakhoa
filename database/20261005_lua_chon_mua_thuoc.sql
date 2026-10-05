-- Tách chỉ định thuốc khỏi lựa chọn thanh toán và cấp phát tại nhà thuốc.
ALTER TABLE don_thuoc
  ADD COLUMN lua_chon_mua VARCHAR(30) NOT NULL DEFAULT 'chua_chon' AFTER trang_thai,
  ADD COLUMN ma_phieu_nhan_thuoc VARCHAR(30) NULL AFTER lua_chon_mua,
  ADD COLUMN ngay_cap_phat DATETIME NULL AFTER ma_phieu_nhan_thuoc;
