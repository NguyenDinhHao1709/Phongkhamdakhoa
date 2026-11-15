-- Định mức tồn kho tối thiểu riêng cho từng thuốc: tồn <= định mức thì cảnh báo "sắp hết hàng" / đề xuất nhập.
-- Mặc định 20 = đúng ngưỡng cố định đang dùng, nên dữ liệu cũ không đổi hành vi.
-- PHẢI chạy trên Clever Cloud TRƯỚC khi push code backend lên main
ALTER TABLE thuoc
  ADD COLUMN ton_kho_toi_thieu INT NOT NULL DEFAULT 20 AFTER ton_kho_tong;
