CREATE TABLE IF NOT EXISTS lich_su_hieu_chinh_ket_qua (
  id INT NOT NULL AUTO_INCREMENT,
  ket_qua_id INT NOT NULL,
  chi_dinh_id INT NOT NULL,
  phien_ban INT NOT NULL,
  nhan_xet_cu TEXT NULL,
  nhan_xet_moi TEXT NULL,
  ly_do TEXT NOT NULL,
  nguoi_hieu_chinh_id INT NULL,
  thoi_gian_hieu_chinh DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lshckq_ket_qua (ket_qua_id, phien_ban),
  KEY idx_lshckq_chi_dinh (chi_dinh_id),
  CONSTRAINT fk_lshckq_ket_qua FOREIGN KEY (ket_qua_id)
    REFERENCES ket_qua_xet_nghiem(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Lich su hieu chinh ket qua da phat hanh';
