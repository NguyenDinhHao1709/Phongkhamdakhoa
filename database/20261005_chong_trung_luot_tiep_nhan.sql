-- Quy tac tiep nhan: luu thong tin chuyen khoa va ly do tao luot bo sung.
-- Khong tao unique key theo benh nhan/ngay vi benh nhan co the kham nhieu chuyen khoa.

ALTER TABLE luot_tiep_nhan
  ADD COLUMN chuyen_khoa VARCHAR(100) NULL AFTER bac_si_id,
  ADD COLUMN loai_luot VARCHAR(30) NOT NULL DEFAULT 'luot_chinh' AFTER chuyen_khoa,
  ADD COLUMN ly_do_tao_luot VARCHAR(255) NULL AFTER loai_luot,
  ADD COLUMN luot_goc_id INT NULL AFTER ly_do_tao_luot,
  ADD KEY idx_ltn_benhnhan_ngay_khoa (benh_nhan_id, thoi_gian_den, chuyen_khoa),
  ADD KEY idx_ltn_luot_goc (luot_goc_id);
