-- Khung tư vấn online do giám đốc cấu hình trên từng ca trực của bác sĩ: slot có giờ bắt đầu trong [online_tu, online_den)
-- chỉ nhận lịch online; NULL = cả ca khám trực tiếp.
-- Chạy 1 lần (tài khoản Clever không đọc được information_schema nên không dùng kiểm tra tồn tại).
ALTER TABLE lich_lam_viec
  ADD COLUMN online_tu TIME NULL,
  ADD COLUMN online_den TIME NULL;

-- Kiểm tra: phải ra 2 dòng
SHOW COLUMNS FROM lich_lam_viec LIKE 'online_%';
