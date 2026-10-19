-- Migration Kế toán Thu ngân ERP: Phiếu chi hoạt động OPEX & Chốt ca bàn giao két tiền
CREATE TABLE IF NOT EXISTS phieu_chi_hoat_dong (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_phieu_chi VARCHAR(30) NOT NULL UNIQUE,
  loai_chi ENUM('dien_nuoc', 'rac_y_te', 'van_phong_pham', 'vat_tu_tieu_hao', 'sua_chua_tb', 'tiep_khach', 'khac') NOT NULL DEFAULT 'khac',
  khoan_chi VARCHAR(255) NOT NULL,
  nguoi_nhan VARCHAR(150) NOT NULL,
  so_tien DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  phuong_thuc_chi ENUM('tien_mat', 'chuyen_khoan', 'the') NOT NULL DEFAULT 'tien_mat',
  ngay_chi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nguoi_lap_id INT NULL,
  chung_tu_goc VARCHAR(150) NULL,
  ghi_chu TEXT NULL,
  tao_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cap_nhat_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (nguoi_lap_id) REFERENCES nhan_vien(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chot_ca_thu_ngan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_chot_ca VARCHAR(30) NOT NULL UNIQUE,
  thu_ngan_id INT NOT NULL,
  nguoi_nhan_ca_id INT NULL,
  thoi_gian_bat_dau DATETIME NOT NULL,
  thoi_gian_ket_thuc DATETIME NOT NULL,
  tien_mat_he_thong DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tien_mat_thuc_te DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  chenh_lech DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  chi_tiet_menh_gia JSON NULL,
  tong_thu_chuyen_khoan DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tong_chi_tien_mat DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tong_thuc_thu DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tong_thuc_chi DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  so_luong_phieu_thu INT NOT NULL DEFAULT 0,
  so_luong_phieu_chi INT NOT NULL DEFAULT 0,
  ghi_chu TEXT NULL,
  trang_thai ENUM('da_chot', 'da_ban_giao') NOT NULL DEFAULT 'da_chot',
  tao_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thu_ngan_id) REFERENCES nhan_vien(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_nhan_ca_id) REFERENCES nhan_vien(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

