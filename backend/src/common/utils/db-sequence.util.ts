import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * Số tiếp theo của bộ đếm `ten` trong bảng bo_dem_ma, khóa dòng bằng FOR UPDATE nên an toàn khi
 * nhiều instance / nhiều service cùng sinh một loại mã. Lần đầu khởi tạo từ seedSql (trả về cột maxNum).
 * daDungSql (tham số ? = số): số đã có bản ghi dùng thì bỏ qua, để bộ đếm không bị kéo theo mã cũ sinh ngẫu nhiên.
 */
export async function soTiepTheo(manager: EntityManager, ten: string, seedSql: string, seedParams: any[] = [], daDungSql?: string): Promise<number> {
  return manager.transaction(async (m) => {
    const lay = () => m.query('SELECT gia_tri FROM bo_dem_ma WHERE ten = ? FOR UPDATE', [ten]);
    let rows: any[] = await lay();
    if (!rows.length) {
      const seed: any[] = await m.query(seedSql, seedParams);
      await m.query('INSERT IGNORE INTO bo_dem_ma (ten, gia_tri) VALUES (?, ?)', [ten, Number(seed[0]?.maxNum || 0)]);
      rows = await lay();
    }
    let next = Number(rows[0].gia_tri) + 1;
    while (daDungSql && (await m.query(daDungSql, [next])).length) next++;
    await m.query('UPDATE bo_dem_ma SET gia_tri = ? WHERE ten = ?', [next, ten]);
    return next;
  });
}

/** Mã bệnh nhân BNxxxxxx từ bộ đếm dùng chung cho mọi nơi tạo hồ sơ (đăng ký, tiếp nhận, kiosk, đặt lịch, quản lý) */
export async function maBenhNhanTiepTheo(manager: EntityManager): Promise<string> {
  const so = await soTiepTheo(manager, 'ma_benh_nhan',
    `SELECT COUNT(*) AS maxNum FROM benh_nhan WHERE ma_benh_nhan REGEXP '^BN[0-9]{6}$'`, [],
    `SELECT 1 FROM benh_nhan WHERE ma_benh_nhan = CONCAT('BN', LPAD(?, 6, '0')) LIMIT 1`);
  return `BN${String(so).padStart(6, '0')}`;
}

/** Mã hồ sơ bệnh án HSxxxxxx từ bộ đếm dùng chung (module hồ sơ và kết luận tư vấn trực tuyến) */
export async function maHoSoTiepTheo(manager: EntityManager): Promise<string> {
  const so = await soTiepTheo(manager, 'ma_ho_so',
    `SELECT COUNT(*) AS maxNum FROM ho_so_benh_an WHERE ma_ho_so REGEXP '^HS[0-9]{6}$'`, [],
    `SELECT 1 FROM ho_so_benh_an WHERE ma_ho_so = CONCAT('HS', LPAD(?, 6, '0')) LIMIT 1`);
  return `HS${String(so).padStart(6, '0')}`;
}

/**
 * Khóa có tên của MySQL (GET_LOCK): dùng chung giữa các instance backend.
 * choToiDaGiay = 0: không chờ — instance khác đang giữ khóa thì bỏ qua (trả undefined), dùng cho tác vụ quét định kỳ.
 */
export async function voiKhoaDb<T>(dataSource: DataSource, ten: string, fn: () => Promise<T>, choToiDaGiay = 15): Promise<T> {
  const key = ten.slice(0, 64);
  // Xếp hàng trong RAM trước khi lấy kết nối: người chờ GET_LOCK không giữ kết nối pool,
  // tránh N request cùng khóa chiếm hết pool khiến người giữ khóa không còn kết nối để chạy fn
  const truoc = hangDoiKhoa.get(key);
  if (truoc && choToiDaGiay === 0) return undefined as T;
  let moCua!: () => void;
  const cua = new Promise<void>((r) => (moCua = r));
  const duoi = (truoc ?? Promise.resolve()).then(() => cua);
  hangDoiKhoa.set(key, duoi);
  // Chỉ dọn khi cả chuỗi phía trước đã xong (người chờ hết giờ thoát sớm không được xóa hàng đợi)
  duoi.then(() => { if (hangDoiKhoa.get(key) === duoi) hangDoiKhoa.delete(key); });
  try {
    if (truoc) await choLuot(truoc, choToiDaGiay);
    const qr = dataSource.createQueryRunner();
    const theo = { key, tu: Date.now() };
    khoaDangGiu.add(theo);
    try {
      await qr.connect();
      return await chayTrongKhoa(qr, key, fn, choToiDaGiay);
    } finally {
      khoaDangGiu.delete(theo);
    }
  } finally {
    moCua();
  }
}

const hangDoiKhoa = new Map<string, Promise<void>>();

async function choLuot(truoc: Promise<void>, giay: number) {
  let timer: NodeJS.Timeout | undefined;
  const hetGio = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ServiceUnavailableException('Hệ thống đang bận, vui lòng thử lại.')), giay * 1000);
  });
  try {
    await Promise.race([truoc, hetGio]);
  } finally {
    clearTimeout(timer);
  }
}

/** Khóa voiKhoaDb đang chạy (mỗi khóa chiếm 1 kết nối pool suốt thời gian fn chạy) — /api/health báo ra để chẩn đoán pool cạn */
const khoaDangGiu = new Set<{ key: string; tu: number }>();
export function khoaDbDangGiu() {
  const now = Date.now();
  return [...khoaDangGiu].map((k) => ({ key: k.key, giay: Math.round((now - k.tu) / 1000) }));
}

async function chayTrongKhoa<T>(qr: QueryRunner, key: string, fn: () => Promise<T>, choToiDaGiay: number): Promise<T> {
  try {
    const [r] = await qr.query('SELECT GET_LOCK(?, ?) AS ok', [key, choToiDaGiay]);
    if (Number(r?.ok) !== 1) {
      if (choToiDaGiay === 0) return undefined as T;
      throw new ServiceUnavailableException('Hệ thống đang bận, vui lòng thử lại.');
    }
    try {
      return await fn();
    } finally {
      await qr.query('SELECT RELEASE_LOCK(?)', [key]);
    }
  } finally {
    await qr.release();
  }
}
