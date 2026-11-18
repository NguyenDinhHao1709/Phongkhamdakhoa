/** Ca làm việc dùng chung cho mọi nhân viên (bảng ca_lam_viec, giám đốc cấu hình) */
export interface CaKham {
  id: number;
  tenCa: string;
  gioBatDau: string;
  gioKetThuc: string;
  thoiLuongPhut?: number;
}

export const THOI_LUONG_MAC_DINH = 60;
export const CACHE_DS_CA = 'master:ca_lam_viec';

const phut = (gio: string) => {
  const [h, m] = (gio || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hhmm = (p: number) => `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;

/** Giờ bắt đầu các lượt khám trong ca: cách nhau thoiLuongPhut, lượt cuối kết thúc trước giờ hết ca */
export function sinhSlotCa(ca: CaKham): string[] {
  const buoc = Number(ca.thoiLuongPhut) > 0 ? Number(ca.thoiLuongPhut) : THOI_LUONG_MAC_DINH;
  const ketThuc = phut(ca.gioKetThuc);
  const slots: string[] = [];
  for (let p = phut(ca.gioBatDau); p + buoc <= ketThuc; p += buoc) slots.push(hhmm(p));
  return slots;
}

/** Giờ hẹn (HH:mm) nằm trong khoảng [giờ bắt đầu, giờ kết thúc) của ca */
export const gioTrongCa = (gio: string, ca: CaKham) => {
  const g = (gio || '').slice(0, 5);
  return g >= (ca.gioBatDau || '').slice(0, 5) && g < (ca.gioKetThuc || '').slice(0, 5);
};

export const timCaCuaGio = <T extends CaKham>(gio: string, dsCa: T[]): T | undefined =>
  dsCa.find((ca) => gioTrongCa(gio, ca));

/** Nhãn hiển thị: "Ca Sáng (08:00 - 12:00)" */
export const nhanCa = (ca?: CaKham) =>
  ca ? `${ca.tenCa} (${ca.gioBatDau.slice(0, 5)} - ${ca.gioKetThuc.slice(0, 5)})` : 'ngoài giờ làm việc';
