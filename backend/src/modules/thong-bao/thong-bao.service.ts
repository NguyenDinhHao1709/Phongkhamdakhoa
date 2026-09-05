import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThongBao } from './entities/thong-bao.entity';

@Injectable()
export class ThongBaoService {
  constructor(
    @InjectRepository(ThongBao)
    private readonly tbRepo: Repository<ThongBao>,
  ) {}

  // Lấy danh sách thông báo của người dùng
  async layDanhSach(nguoiDungId: number, limit = 20) {
    const items = await this.tbRepo.find({
      where: { nguoiNhanId: nguoiDungId },
      order: { taoLuc: 'DESC' },
      take: limit,
    });
    const unreadCount = await this.tbRepo.count({
      where: { nguoiNhanId: nguoiDungId, daDoc: false },
    });
    return {
      items,
      unreadCount,
    };
  }

  // Đánh dấu 1 thông báo là đã đọc
  async danhDauDaDoc(id: number, nguoiDungId: number) {
    await this.tbRepo.update({ id, nguoiNhanId: nguoiDungId }, { daDoc: true });
    return { success: true };
  }

  // Đánh dấu tất cả thông báo của người dùng là đã đọc
  async danhDauTatCaDaDoc(nguoiDungId: number) {
    await this.tbRepo.update({ nguoiNhanId: nguoiDungId, daDoc: false }, { daDoc: true });
    return { success: true };
  }

  // Tạo thông báo mới và lưu CSDL
  async taoThongBao(data: {
    nguoiNhanId: number;
    tieuDe: string;
    noiDung?: string;
    loai: string;
    doiTuongBang?: string;
    doiTuongId?: number;
  }) {
    const entity = this.tbRepo.create({
      nguoiNhanId: data.nguoiNhanId,
      tieuDe: data.tieuDe,
      noiDung: data.noiDung || '',
      loai: data.loai,
      doiTuongBang: data.doiTuongBang,
      doiTuongId: data.doiTuongId,
      daDoc: false,
    });
    return this.tbRepo.save(entity);
  }

  // Gửi thông báo cho vai trò cụ thể (ví dụ: ban_giam_doc)
  async taoThongBaoTheoRole(
    maVaiTro: string,
    data: {
      tieuDe: string;
      noiDung?: string;
      loai: string;
      doiTuongBang?: string;
      doiTuongId?: number;
    },
  ) {
    const users = await this.tbRepo.manager.query(
      `SELECT nd.id FROM nguoi_dung nd
       JOIN vai_tro vt ON nd.vai_tro_id = vt.id
       WHERE vt.ma_vai_tro = ?`,
      [maVaiTro],
    );
    if (!users || users.length === 0) return [];

    const entities = users.map((u) =>
      this.tbRepo.create({
        nguoiNhanId: u.id,
        tieuDe: data.tieuDe,
        noiDung: data.noiDung || '',
        loai: data.loai,
        doiTuongBang: data.doiTuongBang,
        doiTuongId: data.doiTuongId,
        daDoc: false,
      }),
    );
    return this.tbRepo.save(entities);
  }
}
