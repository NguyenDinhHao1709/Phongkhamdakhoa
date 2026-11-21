-- Bệnh nhân xác nhận một lần cách trả phần viện phí còn lại (chuyển khoản / tại quầy) cùng lựa chọn mua thuốc.
-- NULL = chưa xác nhận. Chạy TRƯỚC khi deploy code mới.
ALTER TABLE hoa_don
  ADD COLUMN lua_chon_thanh_toan VARCHAR(20) NULL AFTER phuong_thuc_thanh_toan;
