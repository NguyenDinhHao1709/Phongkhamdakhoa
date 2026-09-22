import { create } from 'zustand';

export const useQueueStore = create((set) => ({
  activeTicket: {
    soThuTu: 'A-104',
    phongKham: 'Phòng 102 - Nội Tổng Quát',
    bacSi: 'BS.CKII Nguyễn Văn Dũng',
    chuyenKhoa: 'Nội Tổng Quát',
    thoiGianCap: '08:15 - Hôm nay',
    trangThai: 'dang_doi', // 'dang_doi' | 'dang_kham' | 'chuyen_cls' | 'hoan_thanh'
    soNguoiTruoc: 2,
    uocTinhPhut: 12,
    // Dynamic Queue Routing Steps
    routingSteps: [
      { id: 1, name: 'Khám Lâm Sàng', room: 'P.102 (Nội)', status: 'in_progress', note: 'Đang đợi tới lượt (Còn 2 người)' },
      { id: 2, name: 'Xét Nghiệm Máu', room: 'P.201 (Huyết học)', status: 'pending', note: 'Tự động điều phối phòng vắng nhất' },
      { id: 3, name: 'Siêu Âm Bụng Tổng Quát', room: 'P.205 (CĐHA)', status: 'pending', note: 'Sau khi lấy mẫu xét nghiệm' },
      { id: 4, name: 'Bác Sĩ Kết Luận & Kê Đơn', room: 'P.102 (Nội)', status: 'pending', note: 'Tổng hợp kết quả & cấp toa thuốc' }
    ]
  },
  
  setTicket: (ticket) => set({ activeTicket: ticket }),
  updateStepStatus: (stepId, status) => set((state) => ({
    activeTicket: {
      ...state.activeTicket,
      routingSteps: state.activeTicket.routingSteps.map((s) =>
        s.id === stepId ? { ...s, status } : s
      )
    }
  }))
}));

export default useQueueStore;

