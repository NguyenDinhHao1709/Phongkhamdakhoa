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

/**
 * Kiểm tra xem lịch khám trực tuyến đã đến thời gian mở phòng khám hay chưa.
 * Quy định: Phòng khám và khung chat mở trước giờ hẹn 15 phút.
 */
export const checkTelehealthAccess = (ngay, gio) => {
  if (!ngay || !gio) {
    return { canJoin: true, isTooEarly: false, isExpired: false, statusMessage: 'Sẵn sàng' };
  }

  try {
    const now = new Date();

    // Tách ngày yyyy-mm-dd
    let dateStr = '';
    if (typeof ngay === 'string') {
      dateStr = ngay.slice(0, 10);
    } else if (ngay instanceof Date) {
      dateStr = ngay.toISOString().slice(0, 10);
    }

    // Tách giờ bắt đầu: '15:30:00' -> '15:30:00', '09:00 - 09:30' -> '09:00:00'
    let timePart = String(gio).trim().split('-')[0].trim();
    if (timePart.length === 5) {
      timePart += ':00';
    } else if (timePart.length > 8) {
      timePart = timePart.slice(0, 8);
    }

    // Tạo thời điểm hẹn khám
    const apptDateTime = new Date(`${dateStr}T${timePart}`);
    if (isNaN(apptDateTime.getTime())) {
      return { canJoin: true, isTooEarly: false, isExpired: false, statusMessage: 'Sẵn sàng' };
    }

    // Thời điểm mở phòng: trước giờ khám 15 phút
    const openTime = new Date(apptDateTime.getTime() - 15 * 60 * 1000);
    // Thời điểm đóng phòng: sau giờ hẹn 90 phút
    const closeTime = new Date(apptDateTime.getTime() + 90 * 60 * 1000);

    const diffMs = openTime.getTime() - now.getTime();
    const minutesUntilOpen = Math.ceil(diffMs / (60 * 1000));

    const openTimeText = `${String(openTime.getHours()).padStart(2, '0')}:${String(openTime.getMinutes()).padStart(2, '0')}`;
    const startTimeText = `${String(apptDateTime.getHours()).padStart(2, '0')}:${String(apptDateTime.getMinutes()).padStart(2, '0')}`;

    if (now < openTime) {
      const hoursUntil = Math.floor(minutesUntilOpen / 60);
      const remainingMins = minutesUntilOpen % 60;
      const timeLeftText = hoursUntil > 0 ? `${hoursUntil} giờ ${remainingMins} phút` : `${minutesUntilOpen} phút`;

      return {
        canJoin: false,
        isTooEarly: true,
        isExpired: false,
        openTimeText,
        startTimeText,
        minutesUntilOpen,
        timeLeftText,
        statusMessage: `Phòng khám mở trước 15 phút (lúc ${openTimeText} ngày ${formatDate(dateStr)}). Còn ${timeLeftText} nữa.`,
      };
    }

    if (now > closeTime) {
      return {
        canJoin: false,
        isTooEarly: false,
        isExpired: true,
        openTimeText,
        startTimeText,
        minutesUntilOpen: 0,
        timeLeftText: '0 phút',
        statusMessage: `Ca khám trực tuyến đã qua khung giờ hẹn (lúc ${startTimeText} ngày ${formatDate(dateStr)}).`,
      };
    }

    return {
      canJoin: true,
      isTooEarly: false,
      isExpired: false,
      openTimeText,
      startTimeText,
      minutesUntilOpen: 0,
      timeLeftText: '0 phút',
      statusMessage: 'Phòng khám trực tuyến đang mở. Sẵn sàng vào khám!',
    };
  } catch (err) {
    console.warn('Lỗi kiểm tra thời gian telehealth:', err);
    return { canJoin: true, isTooEarly: false, isExpired: false, statusMessage: 'Sẵn sàng' };
  }
};

