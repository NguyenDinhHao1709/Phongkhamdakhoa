/** Khung giờ phòng tư vấn trực tuyến — dùng chung cho phòng gọi (queue.gateway) và tác vụ tự động (lich-hen) */
export const MO_PHONG_TRUOC_MS = 15 * 60 * 1000;
export const THOI_LUONG_CA_MS = 60 * 60 * 1000;

/** Mốc giờ hẹn (ms) theo giờ Việt Nam; ngayHen 'YYYY-MM-DD', gioHen 'HH:mm[:ss]' */
export function mocGioHen(ngayHen: string, gioHen: string): number {
  let gio = String(gioHen || '').trim().slice(0, 8);
  if (gio.length === 5) gio += ':00';
  return new Date(`${String(ngayHen).slice(0, 10)}T${gio}+07:00`).getTime();
}

type MocVaoPhong = { gapNhauLuc?: Date | null; bacSiVaoLuc?: Date | null; benhNhanVaoLuc?: Date | null };

/**
 * Phòng đóng sau 60 phút tính từ giờ hẹn, hoặc từ lúc hai bên gặp nhau nếu gặp muộn.
 * Chưa có gap_nhau_luc mà cả hai đã từng vào (ca đang gọi khi backend khởi động lại, mất trạng thái phòng)
 * → tạm lấy lúc người vào sau làm mốc, để hai bên kết nối lại được và hệ thống ghi được mốc gặp nhau.
 */
export function gioDongPhong(gioHenMs: number, lh: MocVaoPhong): number {
  const ms = (d?: Date | null) => (d ? new Date(d).getTime() : 0);
  const mocGap = lh.gapNhauLuc
    ? ms(lh.gapNhauLuc)
    : lh.bacSiVaoLuc && lh.benhNhanVaoLuc ? Math.max(ms(lh.bacSiVaoLuc), ms(lh.benhNhanVaoLuc)) : 0;
  return Math.max(gioHenMs + THOI_LUONG_CA_MS, mocGap ? mocGap + THOI_LUONG_CA_MS : 0);
}
