// Khớp backend common/utils/ca-lam-viec.util.ts
const phut = (gio) => {
  const [h, m] = String(gio || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hhmm = (p) => `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;

/** Giờ bắt đầu các lượt khám trong ca: cách nhau thoiLuongPhut, lượt cuối kết thúc trước giờ hết ca */
export function sinhSlotCa(ca) {
  if (!ca) return [];
  const buoc = Number(ca.thoiLuongPhut) > 0 ? Number(ca.thoiLuongPhut) : 60;
  const ketThuc = phut(ca.gioKetThuc);
  const slots = [];
  for (let p = phut(ca.gioBatDau); p + buoc <= ketThuc; p += buoc) slots.push(hhmm(p));
  return slots;
}

/** Giờ hẹn thuộc ca có id caId (lọc lịch hẹn theo ca); không tìm thấy ca → không lọc */
export function gioThuocCa(gio, caId, dsCa) {
  const ca = dsCa.find((c) => String(c.id) === String(caId));
  if (!ca) return true;
  const g = String(gio || '').slice(0, 5);
  return g >= String(ca.gioBatDau).slice(0, 5) && g < String(ca.gioKetThuc).slice(0, 5);
}

/** Gom các lượt khám trả về từ /lich-hen/bac-si-ca-trong theo ca (giữ thứ tự giờ) */
export function nhomSlotTheoCa(slots = []) {
  const nhom = new Map();
  for (const s of slots) {
    if (!nhom.has(s.ca)) nhom.set(s.ca, { ca: s.ca, tenCa: s.tenCa, slots: [] });
    nhom.get(s.ca).slots.push(s);
  }
  return [...nhom.values()];
}
