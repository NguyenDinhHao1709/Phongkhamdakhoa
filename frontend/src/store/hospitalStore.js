import { create } from 'zustand';
import { apiGet } from '../services/api';

const DEFAULT_HOSPITAL_INFO = {
  tenBenhVien: 'PHÒNG KHÁM ĐA KHOA',
  slogan: 'TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO',
  moTa: 'Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt của Bộ Y Tế.',
  soGiayPhep: '08922/BYT-GPHĐ',
  diaChi: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
  tongDai: '1900 8888',
  gioLamViec: '07:00 – 20:00 (Thứ 2 - CN)',
  email: 'hotro@phongkhamdakhoa.vn',
  tieuDeCapCuu: 'CẤP CỨU 24/24',
  hotlineCapCuu: '1900 8888',
  khauHieuCapCuu: 'Luôn sẵn sàng tiếp nhận & xử trí y tế',
  dichVuNoiBat: [
    'Khám bệnh Nội tổng quát & Tim mạch',
    'Khám Tai Mũi Họng & Nội soi',
    'Khám Nhi khoa & Dinh dưỡng',
    'Chẩn đoán hình ảnh & Xét nghiệm Laser',
    'Khám tư vấn từ xa (Telehealth)',
  ],
  banQuyen: '© 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa. Bản quyền thuộc về Phòng Khám Đa Khoa.',
};

export const useHospitalStore = create((set, get) => ({
  hospitalInfo: DEFAULT_HOSPITAL_INFO,
  isLoaded: false,
  isLoading: false,

  fetchHospitalInfo: async (force = false) => {
    if (get().isLoaded && !force) return get().hospitalInfo;
    set({ isLoading: true });
    try {
      const res = await apiGet('/quan-ly/thong-tin-benh-vien');
      if (res?.data) {
        const merged = {
          ...DEFAULT_HOSPITAL_INFO,
          ...res.data,
          dichVuNoiBat: Array.isArray(res.data.dichVuNoiBat) && res.data.dichVuNoiBat.length > 0
            ? res.data.dichVuNoiBat
            : DEFAULT_HOSPITAL_INFO.dichVuNoiBat,
        };
        set({ hospitalInfo: merged, isLoaded: true, isLoading: false });
        return merged;
      }
    } catch (e) {
      console.warn('Không thể tải thông tin bệnh viện từ máy chủ, dùng cấu hình mặc định:', e);
    }
    set({ isLoaded: true, isLoading: false });
    return get().hospitalInfo;
  },

  setHospitalInfo: (newInfo) => {
    set((state) => ({
      hospitalInfo: {
        ...state.hospitalInfo,
        ...newInfo,
      },
      isLoaded: true,
    }));
  },
}));

export default useHospitalStore;

