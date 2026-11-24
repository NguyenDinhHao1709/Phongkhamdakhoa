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

export const phutCuaGio = (gio: string) => {
  const [h, m] = (gio || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hhmm = (p: number) => `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;

/** Ca qua đêm: giờ kết thúc <= giờ bắt đầu → kết thúc vào ngày hôm sau (VD 17:00 - 08:00) */
export const caQuaDem = (ca: Pick<CaKham, 'gioBatDau' | 'gioKetThuc'>) =>
  (ca.gioKetThuc || '').slice(0, 5) <= (ca.gioBatDau || '').slice(0, 5);

/**
 * Giờ kết thúc của phần ca nằm trong ngày làm (ngày được phân ca): ca qua đêm → '24:00'.
 * Lịch hẹn lưu theo ngày + giờ, nên lượt khám đặt được của ca chỉ nằm trong ngày làm.
 */
export const gioKetThucTrongNgay = (ca: Pick<CaKham, 'gioBatDau' | 'gioKetThuc'>) =>
  caQuaDem(ca) ? '24:00' : (ca.gioKetThuc || '').slice(0, 5);

/** Phút kết thúc tính từ 0h ngày làm (ca qua đêm > 1440) */
export const phutKetThucCa = (ca: Pick<CaKham, 'gioBatDau' | 'gioKetThuc'>) =>
  phutCuaGio(ca.gioKetThuc) + (caQuaDem(ca) ? 1440 : 0);

/** Giờ bắt đầu các lượt khám trong ca: cách nhau thoiLuongPhut, lượt cuối kết thúc trước giờ hết ca (ca qua đêm: trước 24:00) */
export function sinhSlotCa(ca: CaKham): string[] {
  const buoc = Number(ca.thoiLuongPhut) > 0 ? Number(ca.thoiLuongPhut) : THOI_LUONG_MAC_DINH;
  const ketThuc = phutCuaGio(gioKetThucTrongNgay(ca));
  const slots: string[] = [];
  for (let p = phutCuaGio(ca.gioBatDau); p + buoc <= ketThuc; p += buoc) slots.push(hhmm(p));
  return slots;
}

/** Giờ hẹn (HH:mm) trong ngày làm nằm trong khoảng [giờ bắt đầu, giờ kết thúc) của ca */
export const gioTrongCa = (gio: string, ca: CaKham) => {
  const g = (gio || '').slice(0, 5);
  return g >= (ca.gioBatDau || '').slice(0, 5) && g < gioKetThucTrongNgay(ca);
};

export const timCaCuaGio = <T extends CaKham>(gio: string, dsCa: T[]): T | undefined =>
  dsCa.find((ca) => gioTrongCa(gio, ca));

/**
 * Ca đang diễn ra lúc `gio` (HH:mm hoặc HH:mm:ss): `homNay` = ca phân cho hôm nay, `homQua` = ca phân cho hôm qua
 * (chỉ ca qua đêm còn kéo sang sáng nay).
 */
export const caDangDienRa = (ca: Pick<CaKham, 'gioBatDau' | 'gioKetThuc'>, gio: string, ngay: 'homNay' | 'homQua') => {
  const g = (gio || '').slice(0, 5);
  if (ngay === 'homQua') return caQuaDem(ca) && g < (ca.gioKetThuc || '').slice(0, 5);
  return g >= (ca.gioBatDau || '').slice(0, 5) && g < gioKetThucTrongNgay(ca);
};

/** Nhãn hiển thị: "Ca Sáng (08:00 - 12:00)", ca qua đêm: "Ca Tối (17:00 - 08:00 hôm sau)" */
export const nhanCa = (ca?: CaKham) =>
  ca
    ? `${ca.tenCa} (${ca.gioBatDau.slice(0, 5)} - ${ca.gioKetThuc.slice(0, 5)}${caQuaDem(ca) ? ' hôm sau' : ''})`
    : 'ngoài giờ làm việc';
