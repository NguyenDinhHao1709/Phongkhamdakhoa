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

/** Tính tuổi từ ngày sinh */
export const tinhTuoi = (ngaySinh) => {
  if (!ngaySinh) return null;
  const birth = typeof ngaySinh === 'string' ? parseISO(ngaySinh) : ngaySinh;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

