import { create } from 'zustand';

export const useTelehealthStore = create((set, get) => ({
  isOpen: false,
  isMinimized: false,
  participantName: '',
  role: 'doctor', // 'doctor' | 'patient'
  appointmentInfo: {},

  // Khởi chạy cuộc gọi
  startCall: ({ participantName, role, appointmentInfo }) => {
    set({
      isOpen: true,
      isMinimized: false,
      participantName: participantName || (role === 'doctor' ? 'Bệnh nhân' : 'Bác sĩ'),
      role: role || 'doctor',
      appointmentInfo: appointmentInfo || {},
    });
  },

  // Thu nhỏ cuộc gọi thành cửa sổ nổi (Floating Mini Call / PiP)
  minimizeCall: () => {
    set({ isMinimized: true });
  },

  // Phóng to lại toàn màn hình
  maximizeCall: () => {
    set({ isMinimized: false });
  },

  // Đảo trạng thái thu nhỏ / phóng to
  toggleMinimize: () => {
    set((state) => ({ isMinimized: !state.isMinimized }));
  },

  // Kết thúc cuộc gọi và dọn dẹp
  endCall: () => {
    set({
      isOpen: false,
      isMinimized: false,
      participantName: '',
      appointmentInfo: {},
    });
  },
}));

export default useTelehealthStore;
