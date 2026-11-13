import { BacSi, CauHinhTienCoc, DichVuXetNghiem, Thuoc } from './entities/clinical.entities';

// Từ khóa phải đứng thành từ riêng (tránh "nhiều" khớp "nhi", "kem" khớp "em")
export function hasWord(text: string, words: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])(${words})(?![\\p{L}\\p{N}])`, 'u').test(text);
}
export const CHILD_WORDS = 'trẻ|bé|nhi|con tôi|sơ sinh|cháu|trẻ em|em bé';

export function normalizeUnaccentedQuery(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase();
  const unaccentedMap: Array<[RegExp, string]> = [
    [/\bdau dau\b/g, 'đau đầu'],
    [/\bchong mat\b/g, 'chóng mặt'],
    [/\bmat ngu\b/g, 'mất ngủ'],
    [/\bdau da day\b/g, 'đau dạ dày'],
    [/\btieu chay\b/g, 'tiêu chảy'],
    [/\bkham online\b/g, 'khám online'],
    [/\bbang gia\b/g, 'bảng giá'],
    [/\bxet nghiem\b/g, 'xét nghiệm'],
    [/\bho dom\b/g, 'ho đờm'],
    [/\bdau hong\b/g, 'đau họng'],
    [/\bdau khop\b/g, 'đau khớp'],
    [/\bdi ung\b/g, 'dị ứng'],
    [/\bdau mat\b/g, 'đau mắt'],
    [/\bngua mat\b/g, 'ngứa mắt'],
    [/\bha sot\b/g, 'hạ sốt'],
    [/\bsot cao\b/g, 'sốt cao'],
    [/\bmen gan\b/g, 'men gan'],
    [/\bduong huyet\b/g, 'đường huyết'],
    [/\bhuyet ap\b/g, 'huyết áp'],
    [/\bbac si\b/g, 'bác sĩ'],
    [/\bphong kham\b/g, 'phòng khám'],
    [/\bbao hiem\b/g, 'bảo hiểm'],
    [/\bbhyt\b/g, 'bhyt'],
    [/\bhuy lich\b/g, 'hủy lịch'],
    [/\bhoan tien\b/g, 'hoàn tiền'],
    [/\bquen uong\b/g, 'quên uống'],
    [/\bmang thai\b/g, 'mang thai'],
    [/\bco thai\b/g, 'có thai'],
    [/\bsuy than\b/g, 'suy thận'],
    [/\bso cuu\b/g, 'sơ cứu'],
    [/\bbong nuoc soi\b/g, 'bỏng nước sôi'],
  ];
  for (const [re, replacement] of unaccentedMap) {
    s = s.replace(re, replacement);
  }
  return s;
}

// ─── Biểu phí khám lấy từ bảng cau_hinh_tien_coc (không viết cứng giá) ───
export type BieuPhi = { trucTiep?: CauHinhTienCoc; trucTuyen?: CauHinhTienCoc };
export const PHI_DANG_CAP_NHAT = 'đang cập nhật (vui lòng xem chi tiết khi đặt lịch)';
export const vnd = (n: number) => `${Number(n || 0).toLocaleString('vi-VN')} VNĐ`;

export function moTaPhiTrucTiep(p?: CauHinhTienCoc): string {
  if (!p) return `Phí khám trực tiếp: ${PHI_DANG_CAP_NHAT}`;
  return `Phí khám trực tiếp: **${vnd(p.phiKhamMacDinh)}/lượt**; đặt lịch trước cần cọc giữ chỗ **${p.phanTramCoc}% = ${vnd(p.soTienCoc)}** (trừ thẳng vào hóa đơn khi đến khám); hủy lịch trước giờ hẹn tối thiểu **${p.thoiGianHuyHoanCocGio} giờ** được hoàn **${p.phanTramHoanCoc}% tiền cọc**`;
}

export function moTaPhiTrucTuyen(p?: CauHinhTienCoc): string {
  if (!p) return `Phí khám online qua Video Call: ${PHI_DANG_CAP_NHAT}`;
  return `Phí khám online qua Video Call 1-1: **${vnd(p.phiKhamMacDinh)}/lượt**, thanh toán trước **${vnd(p.soTienCoc)} (${p.phanTramCoc}%)** qua mã QR PayOS khi đặt lịch; hủy lịch trước giờ hẹn tối thiểu **${p.thoiGianHuyHoanCocGio} giờ** được hoàn **${p.phanTramHoanCoc}% số tiền đã thanh toán**`;
}

/** Dữ liệu phòng khám (thuốc, dịch vụ, bác sĩ, biểu phí) đã nạp sẵn cho chat */
export type NguCanhPhongKham = { fixedText: string; thuocList: Thuoc[]; dichVuList: DichVuXetNghiem[]; bacSiList: BacSi[]; bieuPhi: BieuPhi; expiresAt: number };

export const KHOA_THEO_MA: Record<string, string> = {
  NHI: 'Nhi khoa', HH_TMH: 'Hô hấp / Tai Mũi Họng', CAP_CUU: 'Cấp cứu', TIM: 'Tim mạch', TH: 'Tiêu hóa',
  TK: 'Thần kinh', CXK: 'Cơ xương khớp', DA: 'Da liễu', MAT: 'Mắt', NOI: 'Nội tổng quát',
};
// Dấu hiệu đe dọa tính mạng: luôn trả lời bằng luật ngay, không chờ AI
export const RED_FLAG_RE = /(nguy kịch|co giật|hôn mê|ngất xỉu|ngất|thở khò khè nặng|tím tái|đột quỵ|chảy máu nhiều|nôn ra máu|ho ra máu|đau thắt ngực|thắt ngực|đau ngực dữ dội|ép ngực|liệt nửa người|méo miệng|khó thở dữ dội)/;

/** Bỏ các cụm phủ định ("không mang thai", "chưa có bầu"...) để luật thai kỳ không bắt nhầm */
export function boPhuDinhThaiKy(text: string): string {
  return text.replace(/(không|ko|chưa|khong|chua)\s+(đang\s+|có\s+)?(mang thai|thai|bầu|cho con bú)/g, '');
}

export function boDau(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

/** Khóa cache: chữ thường, bỏ dấu, bỏ ký tự đặc biệt → "Đau đầu?" và "dau dau" trùng nhau */
export function taoKhoaCache(message: string): string {
  return boDau(normalizeUnaccentedQuery(message)).replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 255);
}

export const TU_DUNG = new Set(['thuốc', 'uống', 'giá', 'bao', 'nhiêu', 'của', 'và', 'có', 'không', 'bị', 'tôi', 'mình', 'cho', 'là', 'gì', 'nào', 'thì', 'với', 'được', 'em', 'bác', 'sĩ', 'khám', 'xét', 'nghiệm', 'loại', 'cần', 'nên', 'hay', 'bệnh']);

/** Chọn tối đa `max` mục có nhiều từ trùng với câu hỏi nhất */
export function chonMucLienQuan<T>(items: T[], query: string, getText: (item: T) => string, max = 8): T[] {
  const tach = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2 && !TU_DUNG.has(w));
  const tuHoi = new Set(tach(query));
  if (!tuHoi.size) return [];
  return items
    .map((item) => ({ item, diem: [...new Set(tach(getText(item)))].filter((w) => tuHoi.has(w)).length }))
    .filter((x) => x.diem > 0)
    .sort((a, b) => b.diem - a.diem)
    .slice(0, max)
    .map((x) => x.item);
}
