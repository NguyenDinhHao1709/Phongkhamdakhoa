/**
 * Khoảng ngày cho bộ lọc báo cáo, tính theo giờ Việt Nam (UTC+7, không có giờ mùa hè).
 * Không dùng toISOString() trực tiếp: từ 0h–7h sáng giờ VN nó vẫn trả về ngày hôm trước.
 */

export const ngayVN = (d: Date = new Date()) =>
  new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export const congNgay = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const ngayCuoiThang = (nam: number, thang: number) => new Date(Date.UTC(nam, thang, 0)).getUTCDate(); // thang: 1-12
const pad = (n: number) => String(n).padStart(2, '0');

/** Mốc dùng cho "toàn thời gian" để câu truy vấn BETWEEN không cần nhánh riêng */
export const NGAY_DAU_TIEN = '1900-01-01';
export const NGAY_CUOI_CUNG = '2999-12-31';

/**
 * Nhận cả mã bộ lọc của trang bác sĩ (hom_nay, tuan_nay, thang_nay, quy_nay, custom)
 * và của dashboard giám đốc (7_ngay, nam_nay, tat_ca, tuy_chon).
 * Có tuNgay/denNgay thì luôn ưu tiên (bộ lọc tùy chọn ngày).
 */
export function khoangNgayVN(query: { range?: string; tuNgay?: string; denNgay?: string }, macDinh = 'thang_nay') {
  const today = ngayVN();
  const [y, m] = today.split('-').map(Number);

  if (query.tuNgay || query.denNgay) {
    let fromDate = (query.tuNgay || query.denNgay) as string;
    let toDate = query.denNgay || today;
    if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
    return { fromDate, toDate };
  }

  switch (query.range || macDinh) {
    case 'hom_nay':
      return { fromDate: today, toDate: today };
    case '7_ngay':
      return { fromDate: congNgay(today, -6), toDate: today };
    case 'tuan_nay':
    case '7days': {
      const thu = new Date(`${today}T00:00:00Z`).getUTCDay();
      const thuHai = congNgay(today, thu === 0 ? -6 : 1 - thu);
      return { fromDate: thuHai, toDate: congNgay(thuHai, 6) };
    }
    case 'thang_nay':
    case 'month':
      return { fromDate: `${y}-${pad(m)}-01`, toDate: `${y}-${pad(m)}-${pad(ngayCuoiThang(y, m))}` };
    case 'quy_nay': {
      const thangDau = Math.floor((m - 1) / 3) * 3 + 1;
      return {
        fromDate: `${y}-${pad(thangDau)}-01`,
        toDate: `${y}-${pad(thangDau + 2)}-${pad(ngayCuoiThang(y, thangDau + 2))}`,
      };
    }
    case 'nam_nay':
      return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` };
    case 'tat_ca':
      return { fromDate: NGAY_DAU_TIEN, toDate: NGAY_CUOI_CUNG };
    default:
      // Mã lạ → dùng mặc định; mặc định cũng lạ thì lấy hôm nay (tránh đệ quy vô hạn)
      return query.range && query.range !== macDinh
        ? khoangNgayVN({ range: macDinh })
        : { fromDate: today, toDate: today };
  }
}
