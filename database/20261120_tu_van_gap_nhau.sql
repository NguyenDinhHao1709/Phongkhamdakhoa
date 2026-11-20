-- Tư vấn trực tuyến: ghi lúc bác sĩ và bệnh nhân lần đầu cùng có mặt trong phòng gọi.
-- Chỉ ca có gap_nhau_luc mới được bác sĩ hoàn tất; giờ đóng phòng tính từ mốc này.
-- CHẠY TRƯỚC khi deploy backend (entity LichHen đã có cột này).
ALTER TABLE lich_hen ADD COLUMN gap_nhau_luc DATETIME NULL AFTER benh_nhan_vao_luc;

-- Sửa ca LH20260094: bị bấm "hoàn tất" lúc 0h dù hai bên không vào phòng.
-- Xóa bệnh án sinh ra từ lần hoàn tất đó, trả lịch về đã xác nhận; tác vụ tự động (5 phút/lần)
-- sẽ xử lý lại theo quy tắc mới (bác sĩ không vào → hủy, yêu cầu hoàn phí).
DELETE FROM benh_an_kham
WHERE hinh_thuc_kham = 'truc_tuyen' AND ghi_chu = 'Ca tư vấn trực tuyến Telehealth (Mã lịch: LH20260094)';

UPDATE lich_hen
SET trang_thai = 'da_xac_nhan',
    ghi_chu = NULLIF(TRIM(SUBSTRING_INDEX(ghi_chu, '[Telehealth Kết luận]', 1)), '')
WHERE ma_lich_hen = 'LH20260094' AND trang_thai = 'hoan_thanh';
