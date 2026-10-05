CREATE TABLE IF NOT EXISTS lich_su_goi_kham (
  id INT NOT NULL AUTO_INCREMENT,
  luot_tiep_nhan_id INT NOT NULL,
  nguoi_thuc_hien_id INT NULL,
  loai_goi VARCHAR(20) NOT NULL,
  lan_goi SMALLINT NOT NULL,
  ket_qua VARCHAR(30) NOT NULL DEFAULT 'cho_benh_nhan',
  ghi_chu TEXT NULL,
  thoi_gian_goi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lsgk_luot_thoi_gian (luot_tiep_nhan_id, thoi_gian_goi),
  CONSTRAINT fk_lsgk_luot
    FOREIGN KEY (luot_tiep_nhan_id) REFERENCES luot_tiep_nhan(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Lich su bac si goi benh nhan vao phong';
