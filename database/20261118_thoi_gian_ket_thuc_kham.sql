-- Lưu thời điểm bác sĩ kết thúc phiếu khám để tính "Thời gian khám TB" thật
-- (bắt đầu = ngay_kham, kết thúc = thoi_gian_ket_thuc). Ca cũ để NULL, không tính vào trung bình.
-- PHẢI chạy trên Clever Cloud TRƯỚC khi push code backend lên main
ALTER TABLE benh_an_kham
  ADD COLUMN thoi_gian_ket_thuc DATETIME NULL AFTER trang_thai;
