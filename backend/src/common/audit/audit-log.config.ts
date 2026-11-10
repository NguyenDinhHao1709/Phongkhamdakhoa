/**
 * Cấu hình ghi nhật ký tự động (AuditLogInterceptor).
 * Đường dẫn so khớp theo mẫu route (vd: /lich-hen/:id/huy), đã bỏ tiền tố /api.
 */

// Nhóm chức năng hiển thị trên trang Nhật ký, theo module (đoạn đầu của đường dẫn)
export const AUDIT_MODULE_LABELS: Record<string, string> = {
  'auth': 'Xác thực & Bảo mật',
  'lich-hen': 'Lịch hẹn & Đặt khám',
  'tiep-nhan': 'Tiếp đón & Hàng đợi',
  'ho-so-benh-an': 'Khám bệnh & Bệnh án',
  'xet-nghiem': 'Cận lâm sàng & Xét nghiệm',
  'nha-thuoc': 'Nhà thuốc & Kho',
  'thanh-toan': 'Thu ngân & Viện phí',
  'payos': 'Thu ngân & Viện phí',
  'quan-ly': 'Quản trị hệ thống',
  'nhan-vien': 'Nhân sự & Đơn từ',
  'bai-viet': 'Bài viết y khoa',
  'benh-nhan': 'Hồ sơ bệnh nhân',
  'danh-gia': 'Đánh giá dịch vụ',
  'office': 'Office nội bộ',
  'cham-cong': 'Chấm công & Điểm danh',
};

/** Mã hành động cho thao tác ghi tự động: TT_<MODULE>, vd TT_LICH_HEN */
export const auditActionCode = (module: string) => `TT_${module.toUpperCase().replace(/-/g, '_')}`;

/** Ngược lại: TT_LICH_HEN → 'Lịch hẹn & Đặt khám' */
export const auditModuleLabel = (hanhDong: string) =>
  AUDIT_MODULE_LABELS[hanhDong.replace(/^TT_/, '').toLowerCase().replace(/_/g, '-')] || 'Thao tác hệ thống';

// Thao tác lặp lại liên tục / không có giá trị kiểm toán → không ghi
export const AUDIT_SKIP: RegExp[] = [
  /^\/ai\//,                                                     // chat AI, dự báo
  /^\/office\/(rooms\/:id\/(messages|read|pin)|messages\/|upload)/, // tin nhắn, cảm xúc, đã xem, tệp đính kèm
  /^\/thong-bao\//,                                              // đánh dấu đã đọc
  /^\/auth\/(refresh|send-otp|verify-otp)$/,
  /^\/tiep-nhan\/telehealth\/upload$/,                           // gửi video trong chat cuộc gọi
  /^\/quan-ly\/nhat-ky$/,                                        // admin tự ghi log thủ công
];

// Bệnh nhân: chỉ ghi bảo mật tài khoản, lịch hẹn, thanh toán/hoàn cọc, cập nhật hồ sơ
export const AUDIT_PATIENT_ALLOWED: RegExp[] = [
  /^\/auth\/(login|logout|change-password|forgot-password-otp|reset-password)$/,
  /^\/lich-hen\/?$/,
  /^\/lich-hen\/:id\/(huy|chinh-sua|cap-nhat-tk-hoan-coc|xac-nhan-thanh-toan)$/,
  /^\/payos\/tao-link\/:lichHenId$/,
  /^\/thanh-toan\/(vnpay\/tao-url|:id\/xac-nhan|hoa-don\/:id\/(xac-nhan|lua-chon-thuoc))$/,
  /^\/nha-thuoc\/don-thuoc\/:id\/lua-chon-mua$/,
  /^\/benh-nhan\/:id$/,
];

// Thao tác xác thực có mã hành động riêng (đã có nhãn trên trang Nhật ký)
export const AUDIT_AUTH_ACTIONS: Record<string, string> = {
  '/auth/logout': 'DANG_XUAT',
  '/auth/change-password': 'DOI_MAT_KHAU',
  '/auth/forgot-password-otp': 'QUEN_MAT_KHAU',
  '/auth/reset-password': 'DAT_LAI_MAT_KHAU',
};

export const AUDIT_EXPORT_ROUTE = '/quan-ly/nhat-ky/xuat-file';
