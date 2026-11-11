// Tổng tạm ứng/cọc đã khấu trừ vào hóa đơn quyết toán (dòng chi tiết 'tam_ung' mang số âm)
export const tamUngCuaHoaDon = (hd) =>
  Math.abs((hd?.chiTiet || []).filter((c) => c.loaiPhi === 'tam_ung').reduce((s, c) => s + Number(c.thanhTien || 0), 0));
