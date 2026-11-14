export interface CaCoKhungOnline {
  onlineTu?: string | null;
  onlineDen?: string | null;
}

/** Slot (giờ bắt đầu HH:mm) nằm trong khung online [onlineTu, onlineDen) của ca trực */
export const trongKhungOnline = (gio: string, ca: CaCoKhungOnline) =>
  !!ca.onlineTu && !!ca.onlineDen && gio >= ca.onlineTu.slice(0, 5) && gio < ca.onlineDen.slice(0, 5);

/**
 * Slot online còn trống được mở cho khám trực tiếp khi bệnh nhân không thể tự đặt online cho ngày đó nữa
 * (hôm nay + số ngày đặt trước tối thiểu của online > ngày khám). Ngày khám luôn được mở, để lễ tân xếp bệnh nhân vãng lai.
 */
export function moKhungOnlineChoTrucTiep(ngay: string, minNgayDatOnline: number): boolean {
  const han = new Date();
  han.setDate(han.getDate() + Math.max(minNgayDatOnline, 1));
  const hanStr = `${han.getFullYear()}-${String(han.getMonth() + 1).padStart(2, '0')}-${String(han.getDate()).padStart(2, '0')}`;
  return ngay < hanStr;
}

/** Slot có nhận được lịch hẹn theo hình thức này không */
export function slotHopHinhThuc(gio: string, caTruc: CaCoKhungOnline[], hinhThuc: string, moKhungOnline: boolean): boolean {
  const laSlotOnline = caTruc.some((ca) => trongKhungOnline(gio, ca));
  return hinhThuc === 'truc_tuyen' ? laSlotOnline : !laSlotOnline || moKhungOnline;
}

export async function layMinNgayDatOnline(ds: { query: (sql: string) => Promise<any> }): Promise<number> {
  const rows: any[] = await ds.query(
    `SELECT cho_phep_dat_truoc_ngay_min AS n FROM cau_hinh_tien_coc WHERE loai_hinh_thuc = 'truc_tuyen' LIMIT 1`,
  );
  return Number(rows[0]?.n) || 0;
}
