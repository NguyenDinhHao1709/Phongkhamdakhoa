-- Lịch sử chat AI (trang chủ + bệnh nhân): giữ ngữ cảnh qua các lần service khởi động lại,
-- đồng thời là số liệu vận hành (nguồn trả lời, độ trễ, đánh giá 👍/👎, lượt bấm đặt lịch từ chat).
CREATE TABLE IF NOT EXISTS ai_chat_tin_nhan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  khoa_phien VARCHAR(160) NOT NULL,          -- 'guest_<sessionId>' | 'patient_<nguoiDungId>'
  loai VARCHAR(20) NOT NULL,                 -- 'trang_chu' | 'benh_nhan'
  nguoi_dung_id INT NULL,
  vai_tro VARCHAR(10) NOT NULL,              -- 'user' | 'model' | 'reset' | 'su_kien'
  noi_dung TEXT NULL,                        -- mã hóa AES-256 (cùng khóa với hồ sơ bệnh án)
  nguon VARCHAR(30) NULL,                    -- model: gemini/cache/...; su_kien: 'dat_lich'
  do_tre_ms INT NULL,
  danh_gia TINYINT NULL,                     -- 1 = hữu ích, -1 = chưa hữu ích
  ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ai_chat_phien (khoa_phien, id),
  KEY idx_ai_chat_ngay (ngay_tao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
