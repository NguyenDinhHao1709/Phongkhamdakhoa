import { format, formatDistance, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

/** 01/09/2026 */
export const formatDate = (date) => {
  if (!date) return '—';
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd/MM/yyyy', { locale: vi });
};

/** 01/09/2026 09:30 */
export const formatDateTime = (date) => {
  if (!date) return '—';
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd/MM/yyyy HH:mm', { locale: vi });
};

/** 09:30 */
export const formatTime = (date) => {
  if (!date) return '—';
  return format(typeof date === 'string' ? parseISO(date) : date, 'HH:mm', { locale: vi });
};

/** "3 giờ trước", "2 ngày trước" */
export const timeAgo = (date) => {
  if (!date) return '—';
  return formatDistance(typeof date === 'string' ? parseISO(date) : date, new Date(), {
    addSuffix: true,
    locale: vi,
  });
};

/** Tính tuổi từ ngày sinh (Chuẩn y tế: Tính theo tháng nếu dưới 1 tuổi, bắt lỗi tương lai và dữ liệu trống) */
export const tinhTuoi = (ngaySinh) => {
  if (!ngaySinh) return '';
  try {
    const birth = typeof ngaySinh === 'string' ? parseISO(ngaySinh) : ngaySinh;
    if (isNaN(birth.getTime())) return '';
    const today = new Date();

    // Nếu ngày sinh trong tương lai
    if (birth > today) return 'Lỗi dữ liệu';

    let ageYears = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      ageYears--;
    }

    // Nếu bệnh nhi dưới 1 tuổi -> Hiển thị theo tháng
    if (ageYears < 1) {
      let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      if (today.getDate() < birth.getDate()) months--;
      if (months <= 0) return 'Dưới 1 tháng';
      return `${months} tháng`;
    }

    return `${ageYears} tuổi`;
  } catch {
    return '';
  }
};

export const calculateAge = tinhTuoi;

