-- Gửi thông báo cho bệnh nhân qua Zalo ZNS (nhắc lịch, xác nhận lịch, có kết quả xét nghiệm).

-- Token của Zalo OA: refresh token chỉ dùng được 1 lần, mỗi lần làm mới Zalo trả cặp token mới → phải lưu DB
CREATE TABLE IF NOT EXISTS zalo_oa_token (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  het_han DATETIME NULL,
  cap_nhat_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Lịch sử từng tin đã gửi: tra cứu, gửi lại khi lỗi, chống gửi trùng (khoa_chong_trung)
CREATE TABLE IF NOT EXISTS lich_su_gui_zalo (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  loai VARCHAR(30) NOT NULL,
  khoa_chong_trung VARCHAR(100) NULL,
  lich_hen_id INT NULL,
  benh_nhan_id INT NULL,
  so_dien_thoai VARCHAR(15) NOT NULL,
  template_id VARCHAR(20) NOT NULL,
  trang_thai ENUM('thanh_cong', 'that_bai') NOT NULL,
  ma_loi INT NULL,
  thong_bao_loi VARCHAR(255) NULL,
  msg_id VARCHAR(64) NULL,
  tao_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lsgz_chong_trung (khoa_chong_trung, trang_thai),
  KEY idx_lsgz_tao_luc (tao_luc)
);
