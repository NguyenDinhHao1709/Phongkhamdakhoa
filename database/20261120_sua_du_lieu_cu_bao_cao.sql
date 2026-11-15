-- ============================================================================
-- Sửa dữ liệu CŨ bị ghi sai trước các bản sửa ngày 15/11/2026 (không đổi cấu trúc bảng).
-- Chạy tay trên Clever Cloud. Code mới KHÔNG phụ thuộc migration này: thứ tự chạy với lúc deploy không quan trọng.
-- An toàn khi chạy lại nhiều lần (mỗi bước chỉ chạm các dòng còn sai).
--
-- KHÔNG sửa giờ biên bản chốt ca: backend đặt TZ=Asia/Ho_Chi_Minh (main.ts, Dockerfile) nên giờ ca trực
-- đã được lưu đúng giờ VN từ trước; chỉ mã CC-yyyymmdd tạo trước 7h sáng có thể mang ngày hôm trước (vô hại).
--
-- Nên chạy phần "XEM TRƯỚC" trước để biết sẽ sửa bao nhiêu dòng, rồi mới chạy phần "SỬA".
-- ============================================================================


-- ─────────────────────────────── XEM TRƯỚC ───────────────────────────────

-- 2. Báo cáo bộ phận ghi sai người gửi: lấy người gửi thật từ nhật ký GUI_BAO_CAO_BO_PHAN (cùng tiêu đề,
--    cùng bộ phận, ghi trong vòng 2 phút).
SELECT bc.id, bc.ma_bao_cao, bc.nguoi_gui_id AS dang_luu, nv.id AS nhan_vien_dung, nv.ho_ten
  FROM bao_cao_bo_phan bc
  JOIN nhat_ky_he_thong nk
    ON nk.hanh_dong = 'GUI_BAO_CAO_BO_PHAN'
   AND nk.mo_ta = CONCAT('Lập và gửi báo cáo "', bc.tieu_de, '" (', bc.bo_phan, ') lên Ban Giám Đốc')
   AND ABS(TIMESTAMPDIFF(SECOND, nk.thoi_gian, bc.tao_luc)) <= 120
  JOIN nhan_vien nv ON nv.nguoi_dung_id = nk.nguoi_dung_id
 WHERE bc.nguoi_gui_id <> nv.id;

-- 3. Người chỉ đạo: tương tự, từ nhật ký CHI_DAO_BAO_CAO_BO_PHAN.
SELECT bc.id, bc.ma_bao_cao, bc.nguoi_chi_dao_id AS dang_luu, nv.id AS nhan_vien_dung, nv.ho_ten
  FROM bao_cao_bo_phan bc
  JOIN nhat_ky_he_thong nk
    ON nk.hanh_dong = 'CHI_DAO_BAO_CAO_BO_PHAN'
   AND nk.mo_ta LIKE CONCAT('Chỉ đạo báo cáo "', bc.tieu_de, '" (', bc.ma_bao_cao, '):%')
  LEFT JOIN nhan_vien nv ON nv.nguoi_dung_id = nk.nguoi_dung_id
 WHERE bc.nguoi_chi_dao_id IS NOT NULL AND NOT (bc.nguoi_chi_dao_id <=> nv.id);

-- 4. Chấm công thủ công chưa có dấu "[Chấm công thủ công…]" + lý do trên bản ghi (trước đây chỉ lưu vào nhật ký).
SELECT cc.id, nv.ho_ten, cc.ngay_cham, nk.mo_ta
  FROM cham_cong cc
  JOIN nhan_vien nv ON nv.id = cc.nhan_vien_id
  JOIN nhat_ky_he_thong nk
    ON nk.hanh_dong = 'CHAM_CONG_THU_CONG'
   AND nk.mo_ta LIKE CONCAT('% cho nhân viên "', nv.ho_ten, '" ngày ', DATE_FORMAT(cc.ngay_cham, '%Y-%m-%d'), ' %')
 WHERE cc.ghi_chu IS NULL OR cc.ghi_chu = '';

-- 5. Nhật ký giả do hàm seedInitialLogs (đã xóa) chèn khi bảng nhật ký rỗng: các sự kiện chưa từng xảy ra.
SELECT id, hanh_dong, mo_ta, thoi_gian FROM nhat_ky_he_thong
 WHERE (hanh_dong, mo_ta) IN (
  ('KIEM_TRA_HE_THONG_TOAN_DIEN', 'Quản trị viên đã thực hiện quét kiểm tra an ninh và toàn vẹn cơ sở dữ liệu y tế định kỳ'),
  ('DANG_NHAP_THANH_CONG', 'Quản trị viên đăng nhập vào bảng điều khiển IT thành công từ IP 127.0.0.1'),
  ('PHE_DUYET_DON', 'Giám đốc đã phê duyệt đơn đề xuất mua sắm trang thiết bị y tế (bộ nội soi HD)'),
  ('HOAN_TAT_KHAM', 'Bác sĩ Nguyễn Văn A hoàn tất lượt khám bệnh và chẩn đoán cho bệnh nhân BN000002'),
  ('KE_DON_THUOC', 'Bác sĩ Nguyễn Văn A kê đơn thuốc điện tử (4 loại thuốc) cho bệnh nhân BN000002'),
  ('SAO_LUU_CSDL', 'Xuất tệp sao lưu dữ liệu toàn hệ thống phong_kham_backup.sql (36 bảng, 2.35MB)'),
  ('DANG_NHAP_THAT_BAI', 'Cảnh báo bảo mật: Đăng nhập thất bại sai mật khẩu liên tiếp 3 lần tài khoản root từ IP 113.161.45.12'),
  ('PHAN_CA_LAM_VIEC', 'Ban Giám Đốc đã hoàn tất phân công lịch làm việc tuần thứ 37 cho nhân viên y tế'),
  ('TIEP_NHAN_BENH_NHAN', 'Tiếp nhận bệnh nhân mới BN000008 (Trần Văn Bình) vào phòng khám Nội 1'),
  ('THANH_TOAN_VIEN_PHI', 'Thu ngân xác nhận xuất hóa đơn thanh toán viện phí khám nội tổng quát cho BN000008'),
  ('CAP_PHAT_THUOC', 'Dược sĩ hoàn tất cấp phát thuốc và in hướng dẫn sử dụng đơn thuốc #DT000015'),
  ('CAP_NHAT_KET_QUA_XN', 'Kỹ thuật viên B cập nhật kết quả xét nghiệm sinh hóa máu tổng quát cho BN000002'),
  ('CAP_NHAT_PHAN_QUYEN', 'Quản trị viên cập nhật quyền hạn vai trò Kỹ thuật viên (thêm quyền duyệt kết quả)'),
  ('DONG_BO_AI_GATEWAY', 'Khởi tạo kết nối Gemini AI Triage Gateway thành công (model: gemini-3.5-flash-lite)'),
  ('DAT_LAI_MAT_KHAU', 'Quản trị viên thực hiện đặt lại mật khẩu cho tài khoản tieptan'),
  ('LOI_KET_NOI_SMS', 'Cổng gửi tin nhắn SMS OTP phản hồi mã lỗi 503 (Gateway Timeout), đã chuyển hướng qua Email OTP')
 );

-- 6. Nhật ký mang IP / trình duyệt ghi cứng (máy chủ production không bao giờ nhận request từ 127.0.0.1).
SELECT COUNT(*) AS so_dong_ip_gia FROM nhat_ky_he_thong WHERE dia_chi_ip = '127.0.0.1';
SELECT COUNT(*) AS so_dong_ua_gia FROM nhat_ky_he_thong WHERE user_agent = 'Trình duyệt hệ thống';


-- ────────────────────────────────── SỬA ──────────────────────────────────
START TRANSACTION;

-- 2. Người gửi báo cáo bộ phận = id nhân viên thật
UPDATE bao_cao_bo_phan bc
  JOIN nhat_ky_he_thong nk
    ON nk.hanh_dong = 'GUI_BAO_CAO_BO_PHAN'
   AND nk.mo_ta = CONCAT('Lập và gửi báo cáo "', bc.tieu_de, '" (', bc.bo_phan, ') lên Ban Giám Đốc')
   AND ABS(TIMESTAMPDIFF(SECOND, nk.thoi_gian, bc.tao_luc)) <= 120
  JOIN nhan_vien nv ON nv.nguoi_dung_id = nk.nguoi_dung_id
   SET bc.nguoi_gui_id = nv.id
 WHERE bc.nguoi_gui_id <> nv.id;

-- 3. Người chỉ đạo = id nhân viên thật; tài khoản giám đốc không có hồ sơ nhân viên → NULL (hiện "Ban Giám Đốc")
UPDATE bao_cao_bo_phan bc
  JOIN nhat_ky_he_thong nk
    ON nk.hanh_dong = 'CHI_DAO_BAO_CAO_BO_PHAN'
   AND nk.mo_ta LIKE CONCAT('Chỉ đạo báo cáo "', bc.tieu_de, '" (', bc.ma_bao_cao, '):%')
  LEFT JOIN nhan_vien nv ON nv.nguoi_dung_id = nk.nguoi_dung_id
   SET bc.nguoi_chi_dao_id = nv.id
 WHERE bc.nguoi_chi_dao_id IS NOT NULL AND NOT (bc.nguoi_chi_dao_id <=> nv.id);

-- 4. Gắn dấu chấm công thủ công + lý do lấy từ nhật ký (chỉ dòng chưa có ghi chú, không ghi đè ghi chú sẵn có)
UPDATE cham_cong cc
  JOIN nhan_vien nv ON nv.id = cc.nhan_vien_id
  JOIN nhat_ky_he_thong nk
    ON nk.hanh_dong = 'CHAM_CONG_THU_CONG'
   AND nk.mo_ta LIKE CONCAT('% cho nhân viên "', nv.ho_ten, '" ngày ', DATE_FORMAT(cc.ngay_cham, '%Y-%m-%d'), ' %')
   SET cc.ghi_chu = CONCAT(
         '[Chấm công thủ công bởi ', SUBSTRING_INDEX(nk.mo_ta, ' thực hiện chấm công thủ công', 1), ']',
         IF(LOCATE(' - Lý do: ', nk.mo_ta) > 0, SUBSTRING(nk.mo_ta, LOCATE(' - Lý do: ', nk.mo_ta)), '')
       )
 WHERE cc.ghi_chu IS NULL OR cc.ghi_chu = '';

-- 5. Xóa nhật ký giả
DELETE FROM nhat_ky_he_thong
 WHERE (hanh_dong, mo_ta) IN (
  ('KIEM_TRA_HE_THONG_TOAN_DIEN', 'Quản trị viên đã thực hiện quét kiểm tra an ninh và toàn vẹn cơ sở dữ liệu y tế định kỳ'),
  ('DANG_NHAP_THANH_CONG', 'Quản trị viên đăng nhập vào bảng điều khiển IT thành công từ IP 127.0.0.1'),
  ('PHE_DUYET_DON', 'Giám đốc đã phê duyệt đơn đề xuất mua sắm trang thiết bị y tế (bộ nội soi HD)'),
  ('HOAN_TAT_KHAM', 'Bác sĩ Nguyễn Văn A hoàn tất lượt khám bệnh và chẩn đoán cho bệnh nhân BN000002'),
  ('KE_DON_THUOC', 'Bác sĩ Nguyễn Văn A kê đơn thuốc điện tử (4 loại thuốc) cho bệnh nhân BN000002'),
  ('SAO_LUU_CSDL', 'Xuất tệp sao lưu dữ liệu toàn hệ thống phong_kham_backup.sql (36 bảng, 2.35MB)'),
  ('DANG_NHAP_THAT_BAI', 'Cảnh báo bảo mật: Đăng nhập thất bại sai mật khẩu liên tiếp 3 lần tài khoản root từ IP 113.161.45.12'),
  ('PHAN_CA_LAM_VIEC', 'Ban Giám Đốc đã hoàn tất phân công lịch làm việc tuần thứ 37 cho nhân viên y tế'),
  ('TIEP_NHAN_BENH_NHAN', 'Tiếp nhận bệnh nhân mới BN000008 (Trần Văn Bình) vào phòng khám Nội 1'),
  ('THANH_TOAN_VIEN_PHI', 'Thu ngân xác nhận xuất hóa đơn thanh toán viện phí khám nội tổng quát cho BN000008'),
  ('CAP_PHAT_THUOC', 'Dược sĩ hoàn tất cấp phát thuốc và in hướng dẫn sử dụng đơn thuốc #DT000015'),
  ('CAP_NHAT_KET_QUA_XN', 'Kỹ thuật viên B cập nhật kết quả xét nghiệm sinh hóa máu tổng quát cho BN000002'),
  ('CAP_NHAT_PHAN_QUYEN', 'Quản trị viên cập nhật quyền hạn vai trò Kỹ thuật viên (thêm quyền duyệt kết quả)'),
  ('DONG_BO_AI_GATEWAY', 'Khởi tạo kết nối Gemini AI Triage Gateway thành công (model: gemini-3.5-flash-lite)'),
  ('DAT_LAI_MAT_KHAU', 'Quản trị viên thực hiện đặt lại mật khẩu cho tài khoản tieptan'),
  ('LOI_KET_NOI_SMS', 'Cổng gửi tin nhắn SMS OTP phản hồi mã lỗi 503 (Gateway Timeout), đã chuyển hướng qua Email OTP')
 );

-- 6. Bỏ IP / trình duyệt ghi cứng (giao diện hiện "—" thay vì một giá trị không có thật)
UPDATE nhat_ky_he_thong SET dia_chi_ip = NULL WHERE dia_chi_ip = '127.0.0.1';
UPDATE nhat_ky_he_thong SET user_agent = NULL WHERE user_agent = 'Trình duyệt hệ thống';

-- 7. Cột IP không còn mặc định '127.0.0.1' (khớp entity mới)
ALTER TABLE nhat_ky_he_thong ALTER COLUMN dia_chi_ip DROP DEFAULT;

COMMIT;
