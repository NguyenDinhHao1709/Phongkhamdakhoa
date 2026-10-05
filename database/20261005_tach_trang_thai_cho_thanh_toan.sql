-- Tách trạng thái hoàn tất chuyên môn khỏi trạng thái đã thu viện phí.
-- Bác sĩ kết thúc chuyên môn: cho_thanh_toan.
-- Thu ngân xác nhận thu tiền: hoan_thanh.

ALTER TABLE luot_tiep_nhan
  MODIFY COLUMN trang_thai ENUM(
    'cho_kham',
    'dang_kham',
    'dang_cls',
    'da_co_kq_cls',
    'cho_thanh_toan',
    'hoan_thanh',
    'da_huy'
  ) NOT NULL DEFAULT 'cho_kham';
