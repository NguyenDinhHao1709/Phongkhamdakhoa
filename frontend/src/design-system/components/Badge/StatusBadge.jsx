import { clsx } from 'clsx';

/**
 * Bản đồ màu sắc ngữ nghĩa cho trạng thái
 * Màu thay thế từ ngữ — bác sĩ đọc lướt hiểu ngay
 */
const STATUS_CONFIG = {
  // Lịch hẹn / Tiếp nhận
  cho_kham:      { label: 'Chờ khám',    cls: 'bg-amber-50 text-amber-700 border-amber-200/80 font-semibold' },
  cho_xac_nhan:  { label: 'Chờ xác nhận',cls: 'bg-amber-50 text-amber-700 border-amber-200/80 font-semibold' },
  da_xac_nhan:   { label: 'Đã xác nhận', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold' },
  dang_kham:     { label: 'Đang khám',   cls: 'bg-primary-50 text-primary-700 border-primary-200 font-semibold' },
  hoan_thanh:    { label: 'Hoàn thành',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold' },
  da_huy:        { label: 'Đã hủy',      cls: 'bg-gray-100 text-gray-600 border-gray-200/80 font-semibold' },
  // Xét nghiệm
  cho_lay_mau:   { label: 'Chờ lấy mẫu', cls: 'bg-warning-light text-warning-dark border-warning-main/30' },
  dang_lay_mau:  { label: 'Đang lấy mẫu', cls: 'bg-primary-50 text-primary-700 border-primary-200' },
  dang_xu_ly:    { label: 'Đang xử lý',  cls: 'bg-primary-50 text-primary-600 border-primary-200' },
  co_ket_qua:    { label: 'Có kết quả',  cls: 'bg-success-light text-success-dark border-success-main/30' },
  huy:           { label: 'Hủy',         cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  // Thanh toán
  da_thanh_toan: { label: 'Đã thanh toán', cls: 'bg-success-light text-success-dark border-success-main/30' },
  cho_thanh_toan:{ label: 'Chờ thanh toán', cls: 'bg-warning-light text-warning-dark border-warning-main/30' },
  // Thuốc
  cho_duyet:     { label: 'Chờ duyệt',   cls: 'bg-warning-light text-warning-dark border-warning-main/30' },
  da_duyet:      { label: 'Đã duyệt',    cls: 'bg-primary-50 text-primary-700 border-primary-200' },
  da_cap_phat:   { label: 'Đã cấp phát', cls: 'bg-success-light text-success-dark border-success-main/30' },
  // Khẩn cấp
  khan_cap:      { label: 'Khẩn cấp',    cls: 'bg-danger-light text-danger-dark border-danger-main/30 animate-pulse-danger' },
  // Sinh hiệu
  binh_thuong:   { label: 'Bình thường', cls: 'bg-success-light text-success-dark border-success-main/30' },
  bat_thuong:    { label: 'Bất thường',  cls: 'bg-warning-light text-warning-dark border-warning-main/30' },
  nguy_hiem:     { label: 'Nguy hiểm',   cls: 'bg-danger-light text-danger-dark border-danger-main/30' },
};

const SIZE_CLS = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs font-medium',
  lg: 'px-3 py-1.5 text-sm font-medium',
};

/**
 * StatusBadge — Hiển thị trạng thái bằng màu ngữ nghĩa
 * Không cần đọc chữ, nhìn màu là hiểu ngay
 */
export function StatusBadge({ status, label, size = 'md', className = '' }) {
  const config = STATUS_CONFIG[status] || {
    label: label || status,
    cls: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-medium',
        SIZE_CLS[size],
        config.cls,
        className,
      )}
    >
      {label || config.label}
    </span>
  );
}

