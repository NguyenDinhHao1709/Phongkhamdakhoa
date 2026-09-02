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

  // ─── DANH SÁCH + TÌM KIẾM ĐA TẦNG ──────────────────────────────
  async findAll(dto: TimKiemBenhNhanDto) {
    const {
      q, tuNgay, denNgay, gioiTinh, doTuoi,
      coDiUng, chuaHoanThien, moiDangKyHomNay,
      page = 1, limit = 20,
    } = dto;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('bn');

    // 1. Tìm kiếm nhanh theo từ khóa (Tên, Mã BN, CCCD, SĐT)
    if (q && q.trim() !== '') {
      qb.andWhere(
        '(bn.ho_ten LIKE :q OR bn.ma_benh_nhan LIKE :q OR bn.so_cmnd LIKE :q OR bn.so_dien_thoai LIKE :q)',
        { q: `%${q.trim()}%` },
      );
    }

    // 2. Lọc Mới đăng ký hôm nay
    if (moiDangKyHomNay === 'true' || moiDangKyHomNay === '1') {
      qb.andWhere('DATE(bn.tao_luc) = CURDATE()');
    }

    // 3. Lọc Theo Khoảng Thời Gian Tạo Hồ Sơ
    if (tuNgay) {
      qb.andWhere('DATE(bn.tao_luc) >= :tuNgay', { tuNgay });
    }
    if (denNgay) {
      qb.andWhere('DATE(bn.tao_luc) <= :denNgay', { denNgay });
    }

    // 4. Lọc Giới Tính
    if (gioiTinh && gioiTinh !== '') {
      qb.andWhere('bn.gioi_tinh = :gioiTinh', { gioiTinh });
    }

    // 5. Lọc Nhóm Tuổi (Nhi <15t, Trưởng thành 15-60t, Cao tuổi >60t)
    if (doTuoi && doTuoi !== '') {
      const currentYear = new Date().getFullYear();
      if (doTuoi === 'nhi') {
        qb.andWhere('YEAR(bn.ngay_sinh) >= :minYearNhi', { minYearNhi: currentYear - 15 });
      } else if (doTuoi === 'truong_thanh') {
        qb.andWhere('YEAR(bn.ngay_sinh) BETWEEN :minYearTT AND :maxYearTT', {
          minYearTT: currentYear - 60,
          maxYearTT: currentYear - 15,
        });
      } else if (doTuoi === 'cao_tuoi') {
        qb.andWhere('YEAR(bn.ngay_sinh) < :maxYearCaoTuoi', { maxYearCaoTuoi: currentYear - 60 });
      }
    }

    // 6. Lọc Bệnh Nhân Có Dị Ứng
    if (coDiUng === 'true' || coDiUng === '1') {
      qb.andWhere('bn.di_ung IS NOT NULL AND bn.di_ung != ""');
    }

    // 7. Lọc Hồ Sơ Chưa Hoàn Thiện (Thiếu ngày sinh hoặc thiếu CMND/CCCD)
    if (chuaHoanThien === 'true' || chuaHoanThien === '1') {
      qb.andWhere('(bn.ngay_sinh IS NULL OR bn.so_cmnd IS NULL OR bn.so_cmnd = "")');
    }

    qb.orderBy('bn.tao_luc', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      message: 'Lấy danh sách bệnh nhân thành công',
      pagination: {
        page: Number(page),
        limit: Number(limit),
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

