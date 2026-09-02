import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Or, ILike } from 'typeorm';
import { BenhNhan } from './entities/benh-nhan.entity';
import { TaoBenhNhanDto, CapNhatBenhNhanDto, TimKiemBenhNhanDto } from './dto/benh-nhan.dto';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';

@Injectable()
export class BenhNhanService {
  constructor(
    @InjectRepository(BenhNhan)
    private repo: Repository<BenhNhan>,
  ) {}

  // ─── DANH SÁCH + TÌM KIẾM ─────────────────────────────────────
  async findAll(dto: TimKiemBenhNhanDto) {
    const { q, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('bn');

    if (q) {
      qb.where(
        'bn.ho_ten LIKE :q OR bn.ma_benh_nhan LIKE :q OR bn.so_cmnd LIKE :q OR bn.so_dien_thoai LIKE :q',
        { q: `%${q}%` },
      );
    }

    qb.orderBy('bn.tao_luc', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      message: 'Lấy danh sách bệnh nhân thành công',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── CHI TIẾT ────────────────────────────────────────────────
  async findOne(id: number) {
    const bn = await this.repo.findOne({ where: { id } });
    if (!bn) throw new NotFoundException({ code: 'BENH_NHAN_KHONG_TON_TAI', message: 'Không tìm thấy bệnh nhân' });
    return { data: bn, message: 'Lấy thông tin bệnh nhân thành công' };
  }

  async findByMa(maBenhNhan: string) {
    const bn = await this.repo.findOne({ where: { maBenhNhan } });
    if (!bn) throw new NotFoundException({ code: 'BENH_NHAN_KHONG_TON_TAI', message: 'Không tìm thấy bệnh nhân' });
    return { data: bn, message: 'Lấy thông tin bệnh nhân thành công' };
  }

  // ─── TẠO MỚI ────────────────────────────────────────────────
  async create(dto: TaoBenhNhanDto) {
    // Kiểm tra CMND trùng
    if (dto.soCmnd) {
      const existing = await this.repo.findOne({ where: { soCmnd: dto.soCmnd } });
      if (existing) {
        throw new ConflictException({ code: 'CMND_DA_TON_TAI', message: 'Số CMND/CCCD đã được đăng ký' });
      }
    }

    // Sinh mã bệnh nhân tự động
    const count = await this.repo.count();
    const maBenhNhan = MaGeneratorService.generateMaBenhNhan(count + 1);

    const bn = this.repo.create({ ...dto, maBenhNhan });
    const saved = await this.repo.save(bn);

    return { data: saved, message: 'Tạo hồ sơ bệnh nhân thành công' };
  }

  // ─── CẬP NHẬT ───────────────────────────────────────────────
  async update(id: number, dto: CapNhatBenhNhanDto) {
    const bn = await this.repo.findOne({ where: { id } });
    if (!bn) throw new NotFoundException({ code: 'BENH_NHAN_KHONG_TON_TAI', message: 'Không tìm thấy bệnh nhân' });

    if (dto.soCmnd && dto.soCmnd !== bn.soCmnd) {
      const existing = await this.repo.findOne({ where: { soCmnd: dto.soCmnd } });
      if (existing) throw new ConflictException({ code: 'CMND_DA_TON_TAI', message: 'Số CMND/CCCD đã được đăng ký' });
    }

    Object.assign(bn, dto);
    const saved = await this.repo.save(bn);
    return { data: saved, message: 'Cập nhật thông tin bệnh nhân thành công' };
  }
}

