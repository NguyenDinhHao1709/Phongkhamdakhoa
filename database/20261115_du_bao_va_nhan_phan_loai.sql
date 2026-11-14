-- 1) Lưu dự báo lưu lượng mỗi ngày để đối chiếu với số thực tế sau đó (theo dõi sai số thật theo thời gian).
--    ai-service ghi khi trang dự báo được mở và Python ML trả kết quả; mỗi (ngày lập, ngày được dự báo) một dòng.
CREATE TABLE IF NOT EXISTS du_bao_luu_luong (
  ngay_lap DATE NOT NULL,                    -- ngày chạy mô hình (giờ Việt Nam)
  ngay_du_bao DATE NOT NULL,                 -- ngày được dự báo
  du_bao INT NOT NULL,
  ci_thap INT NULL,
  ci_cao INT NULL,
  model VARCHAR(80) NOT NULL,
  PRIMARY KEY (ngay_lap, ngay_du_bao),
  KEY idx_du_bao_ngay (ngay_du_bao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Nhãn chuyên khoa do lễ tân xác nhận/sửa trên trang Phân luồng nhanh.
--    Là nhãn của người (đáng tin hơn nhãn Gemini): python-ml dùng để huấn luyện bộ phân loại,
--    và là số liệu độ chính xác của AI theo từng khoa cho quản lý.
CREATE TABLE IF NOT EXISTS ai_phan_loai_nhan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cau_hoi TEXT NOT NULL,                     -- mô tả triệu chứng lễ tân đã nhập (không kèm thông tin bệnh nhân)
  ma_khoa_ai VARCHAR(20) NULL,               -- chuyên khoa AI gợi ý (NULL nếu AI không xác định được)
  ma_khoa_dung VARCHAR(20) NOT NULL,         -- chuyên khoa lễ tân xác nhận là đúng
  nguon_ai VARCHAR(30) NULL,                 -- ml / gemini / cache / rule
  nguoi_dung_id INT NULL,
  ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_phan_loai_ngay (ngay_tao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
