-- Ghi nhận từng lần bác sĩ / bệnh nhân có mặt trong phòng tư vấn trực tuyến
-- (căn cứ chốt ca: ai giữ hẹn, hai bên đã gặp nhau chưa)
CREATE TABLE IF NOT EXISTS phong_goi_co_mat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lich_hen_id INT NOT NULL,
  vai_tro ENUM('bac_si', 'benh_nhan') NOT NULL,
  socket_id VARCHAR(64) NOT NULL,
  vao_luc DATETIME NOT NULL,
  ra_luc DATETIME NULL,
  -- Lần cuối còn thấy kết nối (server sập thì lấy mốc này làm giờ ra)
  cap_nhat_luc DATETIME NOT NULL,
  KEY idx_pgcm_lich_hen (lich_hen_id),
  KEY idx_pgcm_socket_mo (socket_id, ra_luc)
);
