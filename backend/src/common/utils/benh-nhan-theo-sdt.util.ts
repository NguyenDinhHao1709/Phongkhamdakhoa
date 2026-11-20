import { EntityManager } from 'typeorm';
import { BenhNhan } from '../../modules/benh-nhan/entities/benh-nhan.entity';
import { maBenhNhanTiepTheo } from './db-sequence.util';

/** Chuẩn hóa họ tên để so khớp: bỏ dấu, chữ thường, gộp khoảng trắng */
export function chuanHoaTen(ten?: string | null): string {
  return (ten || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Che họ tên trên màn hình công khai: "Nguyễn Văn An" → "Nguyễn V. A." */
export function cheTen(ten?: string | null): string {
  const phan = (ten || '').trim().split(/\s+/).filter(Boolean);
  if (phan.length <= 1) return phan[0] ? `${phan[0][0]}.` : '';
  return [phan[0], ...phan.slice(1).map((p) => `${p[0]}.`)].join(' ');
}

/**
 * Tìm hồ sơ theo SĐT + họ tên; chưa có thì tạo mới. Một SĐT có thể dùng chung cho nhiều người
 * (trẻ em dùng số cha mẹ) nên chỉ dùng lại hồ sơ khi trùng cả họ tên.
 * Người gọi phải giữ khóa `bn_phone:<sđt>` để hai quầy không tạo trùng hồ sơ.
 */
export async function timHoacTaoBenhNhan(
  manager: EntityManager,
  thongTin: { hoTen: string; soDienThoai: string } & Partial<BenhNhan>,
): Promise<BenhNhan> {
  const repo = manager.getRepository(BenhNhan);
  const soDienThoai = thongTin.soDienThoai.trim();
  const hoTen = thongTin.hoTen.trim();
  const cungSdt = await repo.find({ where: { soDienThoai } });
  const trung = cungSdt.find((bn) => chuanHoaTen(bn.hoTen) === chuanHoaTen(hoTen));
  if (trung) return trung;
  return repo.save(repo.create({
    ...thongTin,
    hoTen,
    soDienThoai,
    maBenhNhan: await maBenhNhanTiepTheo(manager),
  }));
}
