-- Giám đốc cấu hình ca làm việc (thêm ca tối, chỉnh giờ, thời lượng mỗi lượt khám).
-- Khung giờ đặt lịch được sinh từ giờ ca thay cho 8 slot cố định.
ALTER TABLE ca_lam_viec ADD COLUMN thoi_luong_phut SMALLINT NOT NULL DEFAULT 60;

-- Giữ nguyên giờ khám cũ: sáng 08:00, 09:00, 10:00, 11:00 · chiều 13:30, 14:30, 15:30, 16:30
UPDATE ca_lam_viec SET gio_bat_dau = '08:00:00', gio_ket_thuc = '12:00:00' WHERE id = 1;
UPDATE ca_lam_viec SET gio_bat_dau = '13:30:00', gio_ket_thuc = '17:30:00' WHERE id = 2;
