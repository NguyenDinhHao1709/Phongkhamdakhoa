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
  private locks = new Map<string, Promise<any>>();
  private lastMaBnSeq = 0;

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chain = prev.then(() => next);
    this.locks.set(key, chain);

    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(key) === chain) {
        this.locks.delete(key);
      }
    }
  }

  private async generateNextMaBenhNhan(): Promise<string> {
    return this.withLock('seq:ma_benh_nhan', async () => {
      if (this.lastMaBnSeq === 0) {
        const rows: any[] = await this.repo.manager.query(
          `SELECT COALESCE(MAX(CAST(SUBSTRING(ma_benh_nhan, 3) AS UNSIGNED)), 0) AS maxNum,
                  COUNT(*) AS totalCnt
           FROM benh_nhan
           WHERE ma_benh_nhan REGEXP '^BN[0-9]+$'`,
        );
        const maxNum = Number(rows?.[0]?.maxNum || 0);
        const totalCnt = Number(rows?.[0]?.totalCnt || 0);
        this.lastMaBnSeq = Math.max(maxNum, totalCnt);
      }
      this.lastMaBnSeq += 1;
      return MaGeneratorService.generateMaBenhNhan(this.lastMaBnSeq);
    });
  }

  constructor(
    @InjectRepository(BenhNhan)
    private repo: Repository<BenhNhan>,
  ) {}

  // ─── DANH SÁCH + TÌM KIẾM ĐA TẦNG ──────────────────────────────
  async findAll(dto: TimKiemBenhNhanDto) {
    const {
      q, search, tuNgay, denNgay, gioiTinh, doTuoi,
      coDiUng, chuaHoanThien, moiDangKyHomNay, coTaiKhoan,
      page = 1, limit = 20,
    } = dto;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('bn')
      .leftJoin('bn.nguoiDung', 'nd')
      .addSelect(['nd.id', 'nd.tenDangNhap', 'nd.loaiTaiKhoan', 'nd.trangThai']);

    // 1. Tìm kiếm nhanh theo từ khóa (Tên, Mã BN, CCCD, SĐT)
    const keyword = (q || search || '').trim();
    if (keyword !== '') {
      qb.andWhere(
        '(bn.ho_ten LIKE :q OR bn.ma_benh_nhan LIKE :q OR bn.so_cmnd LIKE :q OR bn.so_dien_thoai LIKE :q OR nd.ten_dang_nhap LIKE :q)',
        { q: `%${keyword}%` },
      );
    }

    // Lọc Bệnh nhân đã có tài khoản
    if (coTaiKhoan === 'true' || coTaiKhoan === '1') {
      qb.andWhere('bn.nguoi_dung_id IS NOT NULL');
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

    qb.orderBy('bn.taoLuc', 'DESC').skip(skip).take(limit);

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
    return this.withLock(`create_bn:${dto.soCmnd || dto.soDienThoai || 'new'}`, async () => {
      // Kiểm tra CMND trùng
      if (dto.soCmnd) {
        const existing = await this.repo.findOne({ where: { soCmnd: dto.soCmnd } });
        if (existing) {
          throw new ConflictException({ code: 'CMND_DA_TON_TAI', message: 'Số CMND/CCCD đã được đăng ký' });
        }
      }

      // Sinh mã bệnh nhân nguyên tử tự động
      const maBenhNhan = await this.generateNextMaBenhNhan();

      const payload = { ...dto, diUng: dto.diUng ?? dto.diUngThuoc };
      delete (payload as any).diUngThuoc;

      const bn = this.repo.create({ ...payload, maBenhNhan });
      const saved = await this.repo.save(bn);

      return { data: saved, message: 'Tạo hồ sơ bệnh nhân thành công' };
    });
  }

  // ─── CẬP NHẬT ───────────────────────────────────────────────
  async update(id: number, dto: CapNhatBenhNhanDto) {
    const bn = await this.repo.findOne({ where: { id } });
    if (!bn) throw new NotFoundException({ code: 'BENH_NHAN_KHONG_TON_TAI', message: 'Không tìm thấy bệnh nhân' });

    if (dto.soCmnd && dto.soCmnd !== bn.soCmnd) {
      const existing = await this.repo.findOne({ where: { soCmnd: dto.soCmnd } });
      if (existing) throw new ConflictException({ code: 'CMND_DA_TON_TAI', message: 'Số CMND/CCCD đã được đăng ký' });
    }

    const payload = { ...dto, diUng: dto.diUng ?? dto.diUngThuoc };
    delete (payload as any).diUngThuoc;

    Object.assign(bn, payload);
    const saved = await this.repo.save(bn);
    return { data: saved, message: 'Cập nhật thông tin bệnh nhân thành công' };
  }

  // ─── TRA CỨU THẺ BHYT ─────────────────────────────────────────
  traCuuBhyt(soBhyt: string) {
    const raw = (soBhyt || '').trim().toUpperCase();
    if (raw.length < 10) {
      throw new NotFoundException({ code: 'SO_BHYT_KHONG_HOP_LE', message: 'Mã số thẻ BHYT không đúng định dạng chuẩn' });
    }
    const maDoiTuong = raw.substring(0, 2);
    const mucHuongKyTu = raw.substring(2, 3);
    let tyLeHuong = 80;
    if (mucHuongKyTu === '1' || mucHuongKyTu === '2' || mucHuongKyTu === '5') {
      tyLeHuong = 100;
    } else if (mucHuongKyTu === '3') {
      tyLeHuong = 95;
    } else {
      tyLeHuong = 80;
    }

    return {
      success: true,
      message: 'Tra cứu thông tin thẻ BHYT thành công',
      data: {
        soBhyt: raw,
        maDoiTuong,
        tyLeHuong,
        mucHuong: `${tyLeHuong}%`,
        noiDangKyKCB: 'Phòng khám Đa khoa Quốc tế',
        maKCB: '79-026',
        hanSuDungTu: '2026-01-01',
        hanSuDungDen: '2026-12-31',
        trangThaiThe: 'hop_le',
      },
    };
  }
}

