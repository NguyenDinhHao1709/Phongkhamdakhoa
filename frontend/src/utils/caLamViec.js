// Khớp backend common/utils/ca-lam-viec.util.ts
const phut = (gio) => {
  const [h, m] = String(gio || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hhmm = (p) => `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;

/** Ca qua đêm: giờ kết thúc <= giờ bắt đầu → kết thúc vào ngày hôm sau (VD 17:00 - 08:00) */
export const caQuaDem = (ca) =>
  !!ca?.gioBatDau && !!ca?.gioKetThuc && String(ca.gioKetThuc).slice(0, 5) <= String(ca.gioBatDau).slice(0, 5);

/** Hậu tố hiển thị sau giờ kết thúc của ca qua đêm */
export const hauToHomSau = (ca) => (caQuaDem(ca) ? ' (hôm sau)' : '');

/** Giờ kết thúc của phần ca trong ngày làm: ca qua đêm → 24:00 (lượt khám chỉ đặt trong ngày làm) */
const ketThucTrongNgay = (ca) => (caQuaDem(ca) ? '24:00' : String(ca.gioKetThuc).slice(0, 5));

/** Giờ bắt đầu các lượt khám trong ca: cách nhau thoiLuongPhut, lượt cuối kết thúc trước giờ hết ca (ca qua đêm: trước 24:00) */
export function sinhSlotCa(ca) {
  if (!ca) return [];
  const buoc = Number(ca.thoiLuongPhut) > 0 ? Number(ca.thoiLuongPhut) : 60;
  const ketThuc = phut(ketThucTrongNgay(ca));
  const slots = [];
  for (let p = phut(ca.gioBatDau); p + buoc <= ketThuc; p += buoc) slots.push(hhmm(p));
  return slots;
}

/** Giờ hẹn thuộc ca có id caId (lọc lịch hẹn theo ca); không tìm thấy ca → không lọc */
export function gioThuocCa(gio, caId, dsCa) {
  const ca = dsCa.find((c) => String(c.id) === String(caId));
  if (!ca) return true;
  const g = String(gio || '').slice(0, 5);
  return g >= String(ca.gioBatDau).slice(0, 5) && g < ketThucTrongNgay(ca);
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
