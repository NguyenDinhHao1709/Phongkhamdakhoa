-- Migration: Bổ sung trường nhận ca và trạng thái đã nhận ca cho chốt ca thu ngân
ALTER TABLE chot_ca_thu_ngan 
  MODIFY COLUMN trang_thai ENUM('da_chot', 'da_ban_giao', 'da_nhan_ca') NOT NULL DEFAULT 'da_chot',
  ADD COLUMN thoi_gian_nhan_ca DATETIME NULL AFTER trang_thai;

