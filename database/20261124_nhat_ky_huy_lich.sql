-- Nhật ký lễ tân hủy lịch hẹn / lượt khám trực tiếp: ai hủy, lỗi bên nào, số tiền hoàn.
-- Dùng cho báo cáo "Lịch hủy tại quầy" của Ban Giám Đốc. Chạy TRƯỚC khi push code.
CREATE TABLE nhat_ky_huy_lich (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lich_hen_id INT NULL,
  luot_tiep_nhan_id INT NULL,
  nhan_vien_id INT NULL,
  ten_nguoi_huy VARCHAR(150) NULL,
  loai_huy VARCHAR(20) NOT NULL,           -- phong_kham | benh_nhan | nham
  ly_do VARCHAR(500) NOT NULL,
  so_tien_hoan_coc DECIMAL(12,0) NOT NULL DEFAULT 0,
  trang_thai_hoan VARCHAR(20) NOT NULL DEFAULT 'khong_hoan', -- khong_hoan | cho_duyet | da_duyet | tu_choi | tu_dong
  thoi_gian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nkhl_thoi_gian (thoi_gian),
  INDEX idx_nkhl_lich_hen (lich_hen_id)
);
