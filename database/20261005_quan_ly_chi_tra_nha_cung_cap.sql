ALTER TABLE yeu_cau_nhap_kho
  ADD COLUMN so_tien_chi_tra DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER trang_thai_chi_tra,
  ADD COLUMN phuong_thuc_chi VARCHAR(30) NULL AFTER so_tien_chi_tra,
  ADD COLUMN so_chung_tu_chi VARCHAR(50) NULL AFTER phuong_thuc_chi,
  ADD COLUMN ghi_chu_chi TEXT NULL AFTER so_chung_tu_chi;
