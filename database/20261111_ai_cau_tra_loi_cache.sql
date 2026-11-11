-- Bộ nhớ đệm câu trả lời AI tư vấn/phân luồng: câu hỏi lặp lại trả lời ngay không gọi Gemini.
-- Đồng thời là dữ liệu huấn luyện (cau_hoi_goc → ma_khoa) cho bộ phân loại chuyên khoa ở python-ml.
CREATE TABLE IF NOT EXISTS ai_cau_tra_loi_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  khoa_cache VARCHAR(255) NOT NULL,
  cau_hoi_goc TEXT NOT NULL,
  ket_qua JSON NOT NULL,
  ma_khoa VARCHAR(20) NULL,
  so_lan_dung INT NOT NULL DEFAULT 0,
  ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ai_cache_khoa (khoa_cache)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
