-- Cho phép lưu nhiều ảnh/PDF kết quả trong một bản ghi dưới dạng JSON array.
ALTER TABLE ket_qua_xet_nghiem
  MODIFY COLUMN file_dinh_kem TEXT NULL;
