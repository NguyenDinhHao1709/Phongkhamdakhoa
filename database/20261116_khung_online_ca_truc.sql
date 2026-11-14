-- Migration chạy lại an toàn nhiều lần. Chạy toàn bộ file trong tab SQL của phpMyAdmin.
-- Khung tư vấn online do giám đốc cấu hình trên từng ca trực của bác sĩ: slot có giờ bắt đầu trong [online_tu, online_den)
-- chỉ nhận lịch online; NULL = cả ca khám trực tiếp.

SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lich_lam_viec' AND COLUMN_NAME = 'online_tu'),
  'DO 0', 'ALTER TABLE lich_lam_viec ADD COLUMN online_tu TIME NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lich_lam_viec' AND COLUMN_NAME = 'online_den'),
  'DO 0', 'ALTER TABLE lich_lam_viec ADD COLUMN online_den TIME NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- Kiểm tra: phải ra 2 dòng
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lich_lam_viec' AND COLUMN_NAME IN ('online_tu', 'online_den');
