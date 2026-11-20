-- Từ nay bác sĩ chỉ thấy lượt có phiếu tạm ứng TU<id> ĐÃ THU (hoặc ca cấp cứu).
-- Lượt đang mở tạo trước bản cập nhật mà không có phiếu TU (cọc đã đủ phí khám) được bù phiếu 0 đ "đã thu",
-- để không biến mất khỏi hàng đợi bác sĩ. Chạy một lần, ngay khi deploy (chạy lại không sinh trùng).
INSERT INTO hoa_don (ma_hoa_don, benh_nhan_id, trang_thai, tong_tien, so_tien_giam, thuc_thu, ngay_thanh_toan, ghi_chu)
SELECT CONCAT('TU', ltn.id), ltn.benh_nhan_id, 'da_thanh_toan', 0, 0, 0, NOW(),
       CONCAT('[TẠM ỨNG TẠI QUẦY] Lượt khám ', COALESCE(ltn.ma_so_thu_tu, ltn.id), ' - không phải thu thêm (cọc/BHYT đã đủ phí khám)')
FROM luot_tiep_nhan ltn
LEFT JOIN hoa_don tu ON tu.ma_hoa_don = CONCAT('TU', ltn.id)
WHERE tu.id IS NULL
  AND ltn.trang_thai IN ('cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls')
  AND DATE(ltn.thoi_gian_den) = CURDATE()
  AND (ltn.doi_tuong_uu_tien IS NULL OR ltn.doi_tuong_uu_tien != 'cap_cuu');
