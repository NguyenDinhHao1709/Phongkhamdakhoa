-- Tạm ứng viện phí: lưu số tiền hoàn trả khi tạm ứng/cọc lớn hơn viện phí thực tế
ALTER TABLE hoa_don
  ADD COLUMN tien_hoan_tra DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER thuc_thu;
