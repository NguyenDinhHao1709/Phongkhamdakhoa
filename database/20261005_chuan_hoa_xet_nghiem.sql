-- Chuẩn hóa danh mục CLS và kết quả chi tiết.
-- Chạy một lần trên CSDL hiện tại trước khi triển khai backend/frontend mới.

ALTER TABLE dich_vu_xet_nghiem
  ADD COLUMN bo_phan_thuc_hien VARCHAR(100) NULL AFTER gia_tri_binh_thuong,
  ADD COLUMN mau_benh_pham VARCHAR(100) NULL AFTER bo_phan_thuc_hien,
  ADD COLUMN cau_hinh_ket_qua TEXT NULL AFTER mau_benh_pham;

ALTER TABLE ket_qua_xet_nghiem
  ADD COLUMN ket_qua_chi_tiet TEXT NULL AFTER nhan_xet;

UPDATE dich_vu_xet_nghiem
SET bo_phan_thuc_hien = CASE
    WHEN ma_dich_vu IN ('XN001', 'XN002', 'XN004') THEN 'Khoa Xét nghiệm'
    WHEN ma_dich_vu IN ('CD001', 'CD002') THEN 'Khoa Chẩn đoán hình ảnh'
    WHEN ma_dich_vu = 'XN003' THEN 'Phòng Thăm dò chức năng'
    ELSE bo_phan_thuc_hien
  END,
  mau_benh_pham = CASE
    WHEN ma_dich_vu IN ('XN001', 'XN002') THEN 'Máu tĩnh mạch'
    WHEN ma_dich_vu = 'XN004' THEN 'Nước tiểu giữa dòng'
    ELSE mau_benh_pham
  END;

UPDATE dich_vu_xet_nghiem
SET cau_hinh_ket_qua = CASE ma_dich_vu
  WHEN 'XN001' THEN '[{"key":"Hồng cầu RBC","label":"Hồng cầu RBC","unit":"T/L","reference":"Nam 4.5-5.9; Nữ 4.0-5.2"},{"key":"Hemoglobin HGB","label":"Hemoglobin HGB","unit":"g/dL","reference":"Nam 13-17; Nữ 12-16"},{"key":"Bạch cầu WBC","label":"Bạch cầu WBC","unit":"G/L","reference":"4.0-10.0"},{"key":"Tiểu cầu PLT","label":"Tiểu cầu PLT","unit":"G/L","reference":"150-450"}]'
  WHEN 'XN002' THEN '[{"key":"Glucose","label":"Glucose","unit":"mmol/L","reference":"3.9-6.4 lúc đói"},{"key":"AST","label":"AST","unit":"U/L","reference":"Nam < 40; Nữ < 35"},{"key":"ALT","label":"ALT","unit":"U/L","reference":"Nam < 41; Nữ < 35"},{"key":"Ure","label":"Ure","unit":"mmol/L","reference":"2.5-7.5"},{"key":"Creatinine","label":"Creatinine","unit":"µmol/L","reference":"Nam 62-115; Nữ 44-97"}]'
  WHEN 'XN003' THEN '[{"key":"Nhịp tim","label":"Nhịp tim","unit":"lần/phút","reference":"60-100"},{"key":"Nhịp","label":"Nhịp","unit":"","reference":"Đều/xoang"},{"key":"Khoảng PR","label":"Khoảng PR","unit":"ms","reference":"120-200"},{"key":"QRS","label":"QRS","unit":"ms","reference":"< 120"}]'
  WHEN 'XN004' THEN '[{"key":"Tỷ trọng","label":"Tỷ trọng","unit":"","reference":"1.005-1.030"},{"key":"pH","label":"pH","unit":"","reference":"5.0-8.0"},{"key":"Protein","label":"Protein","unit":"","reference":"Âm tính"},{"key":"Glucose","label":"Glucose","unit":"","reference":"Âm tính"},{"key":"Ketone","label":"Ketone","unit":"","reference":"Âm tính"},{"key":"Hồng cầu","label":"Hồng cầu","unit":"","reference":"Âm tính"},{"key":"Bilirubin","label":"Bilirubin","unit":"","reference":"Âm tính"},{"key":"Urobilinogen","label":"Urobilinogen","unit":"","reference":"0.2-1.0 mg/dL"},{"key":"Nitrite","label":"Nitrite","unit":"","reference":"Âm tính"},{"key":"Bạch cầu","label":"Bạch cầu","unit":"","reference":"Âm tính"}]'
  WHEN 'CD001' THEN '[{"key":"Phổi phải","label":"Phổi phải","unit":"","reference":"Mô tả hình ảnh"},{"key":"Phổi trái","label":"Phổi trái","unit":"","reference":"Mô tả hình ảnh"},{"key":"Tim-trung thất","label":"Tim - trung thất","unit":"","reference":"Mô tả hình ảnh"},{"key":"Kết luận","label":"Kết luận","unit":"","reference":"Kết luận CĐHA"}]'
  WHEN 'CD002' THEN '[{"key":"Gan","label":"Gan","unit":"","reference":"Mô tả hình ảnh"},{"key":"Mật","label":"Mật","unit":"","reference":"Mô tả hình ảnh"},{"key":"Tụy-lách","label":"Tụy - lách","unit":"","reference":"Mô tả hình ảnh"},{"key":"Thận-tiết niệu","label":"Thận - tiết niệu","unit":"","reference":"Mô tả hình ảnh"},{"key":"Kết luận","label":"Kết luận","unit":"","reference":"Kết luận CĐHA"}]'
  ELSE cau_hinh_ket_qua
END;

INSERT INTO dich_vu_xet_nghiem
  (ma_dich_vu, ten_dich_vu, loai, gia, don_vi_ket_qua, gia_tri_binh_thuong,
   bo_phan_thuc_hien, mau_benh_pham, cau_hinh_ket_qua, mo_ta, trang_thai)
SELECT 'XN004', 'Tổng phân tích nước tiểu (10 thông số)', 'xet_nghiem', 100000,
       'Định tính/định lượng', 'Theo từng thông số',
       'Khoa Xét nghiệm', 'Nước tiểu giữa dòng',
       '[{"key":"Tỷ trọng","label":"Tỷ trọng","unit":"","reference":"1.005-1.030"},{"key":"pH","label":"pH","unit":"","reference":"5.0-8.0"},{"key":"Protein","label":"Protein","unit":"","reference":"Âm tính"},{"key":"Glucose","label":"Glucose","unit":"","reference":"Âm tính"},{"key":"Ketone","label":"Ketone","unit":"","reference":"Âm tính"},{"key":"Hồng cầu","label":"Hồng cầu","unit":"","reference":"Âm tính"},{"key":"Bilirubin","label":"Bilirubin","unit":"","reference":"Âm tính"},{"key":"Urobilinogen","label":"Urobilinogen","unit":"","reference":"0.2-1.0 mg/dL"},{"key":"Nitrite","label":"Nitrite","unit":"","reference":"Âm tính"},{"key":"Bạch cầu","label":"Bạch cầu","unit":"","reference":"Âm tính"}]',
       'Mẫu nước tiểu giữa dòng, đọc theo từng thông số trên que thử/phân tích viên.', 'hoat_dong'
WHERE NOT EXISTS (
  SELECT 1 FROM dich_vu_xet_nghiem WHERE ma_dich_vu = 'XN004'
);
