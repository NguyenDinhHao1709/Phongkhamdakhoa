-- Bổ sung các trường chuẩn hóa ERP mua nhập kho y tế
ALTER TABLE yeu_cau_nhap_kho
  ADD COLUMN so_hoa_don_ncc VARCHAR(100) NULL AFTER so_chung_tu_chi,
  ADD COLUMN ngay_hoa_don_ncc DATE NULL AFTER so_hoa_don_ncc,
  ADD COLUMN bien_ban_tra_hang TEXT NULL AFTER ghi_chu,
  ADD COLUMN ket_qua_kiem_nhan VARCHAR(40) NULL AFTER bien_ban_tra_hang,
  ADD COLUMN nguoi_kiem_nhan_id INT NULL AFTER ket_qua_kiem_nhan,
  ADD COLUMN ngay_kiem_nhan DATETIME NULL AFTER nguoi_kiem_nhan_id;

ALTER TABLE yeu_cau_nhap_kho_chi_tiet
  ADD COLUMN ly_do_hong_loi VARCHAR(255) NULL AFTER ghi_chu;
