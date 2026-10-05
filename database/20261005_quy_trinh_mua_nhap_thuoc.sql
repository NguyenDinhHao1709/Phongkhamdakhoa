CREATE TABLE IF NOT EXISTS nha_cung_cap (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_nha_cung_cap VARCHAR(30) NOT NULL UNIQUE,
  ten_nha_cung_cap VARCHAR(200) NOT NULL,
  ma_so_thue VARCHAR(30) NULL,
  nguoi_lien_he VARCHAR(120) NULL,
  so_dien_thoai VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  dia_chi VARCHAR(300) NULL,
  dieu_khoan_thanh_toan VARCHAR(200) NULL,
  trang_thai VARCHAR(30) NOT NULL DEFAULT 'dang_hop_tac',
  tao_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS yeu_cau_nhap_kho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_yeu_cau VARCHAR(30) NOT NULL UNIQUE,
  nguoi_lap_id INT NOT NULL,
  trang_thai VARCHAR(40) NOT NULL DEFAULT 'cho_duyet',
  tong_du_toan DECIMAL(14,2) NOT NULL DEFAULT 0,
  tong_thuc_te DECIMAL(14,2) NOT NULL DEFAULT 0,
  ghi_chu TEXT NULL,
  ly_do_tu_choi TEXT NULL,
  nguoi_duyet_id INT NULL,
  ngay_duyet DATETIME NULL,
  nguoi_chi_tra_id INT NULL,
  ngay_chi_tra DATETIME NULL,
  trang_thai_chi_tra VARCHAR(30) NOT NULL DEFAULT 'chua_chi',
  tao_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_yc_nhap_trang_thai (trang_thai),
  INDEX idx_yc_nhap_chi_tra (trang_thai_chi_tra)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS yeu_cau_nhap_kho_chi_tiet (
  id INT AUTO_INCREMENT PRIMARY KEY,
  yeu_cau_id INT NOT NULL,
  thuoc_id INT NULL,
  nha_cung_cap_id INT NULL,
  so_luong_dat INT NOT NULL DEFAULT 0,
  so_luong_giao INT NOT NULL DEFAULT 0,
  so_luong_dat_chat_luong INT NOT NULL DEFAULT 0,
  so_luong_hong INT NOT NULL DEFAULT 0,
  so_luong_thieu INT NOT NULL DEFAULT 0,
  don_gia_bao DECIMAL(12,2) NOT NULL DEFAULT 0,
  don_gia_chon DECIMAL(12,2) NOT NULL DEFAULT 0,
  ma_lo VARCHAR(50) NULL,
  ngay_het_han DATE NULL,
  ghi_chu TEXT NULL,
  INDEX idx_ycct_yeu_cau (yeu_cau_id),
  CONSTRAINT fk_ycct_yc FOREIGN KEY (yeu_cau_id) REFERENCES yeu_cau_nhap_kho(id) ON DELETE CASCADE,
  CONSTRAINT fk_ycct_thuoc FOREIGN KEY (thuoc_id) REFERENCES thuoc(id) ON DELETE SET NULL,
  CONSTRAINT fk_ycct_ncc FOREIGN KEY (nha_cung_cap_id) REFERENCES nha_cung_cap(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
