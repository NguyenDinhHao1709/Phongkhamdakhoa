-- Migration chạy lại an toàn nhiều lần: mỗi thay đổi kiểm tra information_schema, đã có thì bỏ qua.
-- Chạy toàn bộ file trong tab SQL của phpMyAdmin (dấu phân tách ;).

-- Hóa đơn: tiền hoàn trả phần tạm ứng dư (commit trước)
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hoa_don' AND COLUMN_NAME = 'tien_hoan_tra'),
  'DO 0', 'ALTER TABLE hoa_don ADD COLUMN tien_hoan_tra DECIMAL(14,2) NOT NULL DEFAULT 0');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- Đối tượng ưu tiên khám (lễ tân chọn; trẻ dưới 6 tuổi / người từ 75 tuổi hệ thống tự nhận theo ngày sinh)
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'luot_tiep_nhan' AND COLUMN_NAME = 'doi_tuong_uu_tien'),
  'DO 0', 'ALTER TABLE luot_tiep_nhan ADD COLUMN doi_tuong_uu_tien VARCHAR(30) NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- Qua lượt khi gọi mà bệnh nhân vắng mặt
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'luot_tiep_nhan' AND COLUMN_NAME = 'qua_luot_luc'),
  'DO 0', 'ALTER TABLE luot_tiep_nhan ADD COLUMN qua_luot_luc DATETIME NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'luot_tiep_nhan' AND COLUMN_NAME = 'so_lan_qua_luot'),
  'DO 0', 'ALTER TABLE luot_tiep_nhan ADD COLUMN so_lan_qua_luot TINYINT NOT NULL DEFAULT 0');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- Số lịch hẹn tối đa của 1 bác sĩ mỗi buổi (chừa khung bù giờ); NULL = không giới hạn. Mặc định 3 khung (chỉ đặt khi mới thêm cột)
SET @moi = NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cau_hinh_tien_coc' AND COLUMN_NAME = 'so_lich_hen_toi_da_moi_buoi');
SET @q = IF(@moi, 'ALTER TABLE cau_hinh_tien_coc ADD COLUMN so_lich_hen_toi_da_moi_buoi INT NULL', 'DO 0');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(@moi, 'UPDATE cau_hinh_tien_coc SET so_lich_hen_toi_da_moi_buoi = 3 WHERE loai_hinh_thuc = ''truc_tiep''', 'DO 0');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- Bộ đếm sinh mã nguyên tử (số thứ tự, mã lịch hẹn, hóa đơn, bệnh nhân, hồ sơ): tự khởi tạo ở lần sinh mã đầu tiên
CREATE TABLE IF NOT EXISTS bo_dem_ma (
  ten VARCHAR(50) NOT NULL PRIMARY KEY,
  gia_tri BIGINT NOT NULL DEFAULT 0
);

-- Số thứ tự reset mỗi ngày (A001…): unique theo (ngày đến, số thứ tự) thay cho unique toàn bảng
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'luot_tiep_nhan' AND COLUMN_NAME = 'ngay_den'),
  'DO 0', 'ALTER TABLE luot_tiep_nhan ADD COLUMN ngay_den DATE AS (DATE(thoi_gian_den)) STORED');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'luot_tiep_nhan' AND INDEX_NAME = 'uq_ma_so_thu_tu'),
  'ALTER TABLE luot_tiep_nhan DROP INDEX uq_ma_so_thu_tu', 'DO 0');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'luot_tiep_nhan' AND INDEX_NAME = 'uq_ngay_stt'),
  'DO 0', 'ALTER TABLE luot_tiep_nhan ADD UNIQUE KEY uq_ngay_stt (ngay_den, ma_so_thu_tu)');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- BHYT: hạn thẻ, nơi đăng ký KCB ban đầu, giấy chuyển tuyến
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'benh_nhan' AND COLUMN_NAME = 'bhyt_han_den'),
  'DO 0', 'ALTER TABLE benh_nhan ADD COLUMN bhyt_han_den DATE NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'benh_nhan' AND COLUMN_NAME = 'bhyt_noi_dang_ky'),
  'DO 0', 'ALTER TABLE benh_nhan ADD COLUMN bhyt_noi_dang_ky VARCHAR(10) NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'benh_nhan' AND COLUMN_NAME = 'bhyt_chuyen_tuyen_den'),
  'DO 0', 'ALTER TABLE benh_nhan ADD COLUMN bhyt_chuyen_tuyen_den DATE NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- BHYT: mã cơ sở KCB của phòng khám, % hưởng khi trái tuyến, ngưỡng chi phí BHYT chi trả 100%
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cau_hinh_tien_coc' AND COLUMN_NAME = 'ma_co_so_kcb'),
  'DO 0', 'ALTER TABLE cau_hinh_tien_coc ADD COLUMN ma_co_so_kcb VARCHAR(10) NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cau_hinh_tien_coc' AND COLUMN_NAME = 'ty_le_bhyt_trai_tuyen'),
  'DO 0', 'ALTER TABLE cau_hinh_tien_coc ADD COLUMN ty_le_bhyt_trai_tuyen INT NOT NULL DEFAULT 0');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cau_hinh_tien_coc' AND COLUMN_NAME = 'nguong_bhyt_toan_bo'),
  'DO 0', 'ALTER TABLE cau_hinh_tien_coc ADD COLUMN nguong_bhyt_toan_bo INT NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- Ghi nhận bác sĩ / bệnh nhân vào phòng tư vấn trực tuyến (căn cứ hoàn phí khi ca không diễn ra)
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lich_hen' AND COLUMN_NAME = 'bac_si_vao_luc'),
  'DO 0', 'ALTER TABLE lich_hen ADD COLUMN bac_si_vao_luc DATETIME NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lich_hen' AND COLUMN_NAME = 'benh_nhan_vao_luc'),
  'DO 0', 'ALTER TABLE lich_hen ADD COLUMN benh_nhan_vao_luc DATETIME NULL');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

-- Kiểm tra: phải ra 17 dòng (16 cột + 1 index uq_ngay_stt)
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME, COLUMN_NAME) IN (
  ('hoa_don','tien_hoan_tra'), ('luot_tiep_nhan','doi_tuong_uu_tien'), ('luot_tiep_nhan','qua_luot_luc'), ('luot_tiep_nhan','so_lan_qua_luot'),
  ('luot_tiep_nhan','ngay_den'), ('cau_hinh_tien_coc','so_lich_hen_toi_da_moi_buoi'), ('cau_hinh_tien_coc','ma_co_so_kcb'),
  ('cau_hinh_tien_coc','ty_le_bhyt_trai_tuyen'), ('cau_hinh_tien_coc','nguong_bhyt_toan_bo'), ('benh_nhan','bhyt_han_den'),
  ('benh_nhan','bhyt_noi_dang_ky'), ('benh_nhan','bhyt_chuyen_tuyen_den'), ('lich_hen','bac_si_vao_luc'), ('lich_hen','benh_nhan_vao_luc'),
  ('bo_dem_ma','ten'), ('bo_dem_ma','gia_tri'))
UNION ALL
SELECT DISTINCT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME = 'uq_ngay_stt';
