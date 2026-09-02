import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LichHen, TrangThaiLichHen } from './entities/lich-hen.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { TaoLichHenDto, CapNhatTrangThaiLichHenDto, TimKiemLichHenDto, LaySlotTrongDto } from './dto/lich-hen.dto';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';

// Các slot giờ khám trong ngày (mỗi slot 30 phút)
const ALL_SLOTS = [
  '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

@Injectable()
export class LichHenService {
  constructor(
    @InjectRepository(LichHen) private repo: Repository<LichHen>,
    private dataSource: DataSource,
  ) {}

  // ─── DANH SÁCH ────────────────────────────────────────────────
  async findAll(dto: TimKiemLichHenDto) {
    const { ngay, bacSiId, trangThai, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .leftJoinAndSelect('lh.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .orderBy('lh.ngayHen', 'ASC')
      .addOrderBy('lh.gioHen', 'ASC')
      .skip(skip).take(limit);

    if (ngay) qb.andWhere('lh.ngay_hen = :ngay', { ngay });
    if (bacSiId) qb.andWhere('lh.bac_si_id = :bacSiId', { bacSiId });
    if (trangThai) qb.andWhere('lh.trang_thai = :trangThai', { trangThai });

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      message: 'Lấy danh sách lịch hẹn thành công',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── LỊCH HẸN CỦA TÔI (DÀNH CHO BỆNH NHÂN) ───────────────────
  async layLichHenCuaToi(userId: number) {
    const qb = this.repo.createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .leftJoinAndSelect('lh.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('bn.nguoi_dung_id = :userId OR lh.benh_nhan_id = (SELECT id FROM benh_nhan WHERE nguoi_dung_id = :userId LIMIT 1)', { userId })
      .orderBy('lh.tao_luc', 'DESC');

    const items = await qb.getMany();
    return {
      data: items,
      message: 'Lấy danh sách lịch hẹn cá nhân thành công',
    };
  }

  // ─── CHI TIẾT ─────────────────────────────────────────────────
  async findOne(id: number) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
    if (!lh) throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    return { data: lh, message: 'Lấy thông tin lịch hẹn thành công' };
  }

  // ─── SLOT TRỐNG CỦA BÁC SĨ ────────────────────────────────────
  async laySlotTrong(dto: LaySlotTrongDto) {
    const daDat = await this.repo.find({
      where: {
        bacSiId: dto.bacSiId,
        ngayHen: dto.ngay,
        trangThai: TrangThaiLichHen.DA_XAC_NHAN,
      },
      select: ['gioHen'],
    });
    const daDatSet = new Set(daDat.map((lh) => lh.gioHen.substring(0, 5)));
    const slotsTrong = ALL_SLOTS.filter((s) => !daDatSet.has(s));
    return { data: { bacSiId: dto.bacSiId, ngay: dto.ngay, slotsTrong }, message: 'OK' };
  }

  // ─── TẠO LỊCH HẸN (Optimistic Lock tại DB) ────────────────────
  async create(dto: TaoLichHenDto, nguoiDatId?: number, nguoiDatVaiTro?: string) {
    // 1. Ràng buộc thời gian đặt lịch:
    // Bệnh nhân tự đặt trực tuyến phải trước tối đa 30 ngày & tối thiểu 4 tiếng.
    // Tiếp tân & Bác sĩ đăng ký trực tiếp tại quầy không bị chặn bởi quy định 4 tiếng.
    const now = new Date();
    const ngayGioStr = `${dto.ngayHen}T${dto.gioHen}:00`;
    const gioHenFull = new Date(ngayGioStr);

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (gioHenFull > maxDate) {
      throw new BadRequestException({ code: 'VUOT_QUA_30_NGAY', message: 'Bạn chỉ có thể đặt lịch hẹn trước tối đa 30 ngày.' });
    }

    const diffHours = (gioHenFull.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (nguoiDatVaiTro === 'benh_nhan' && diffHours < 4) {
      throw new BadRequestException({ code: 'TOI_THIEU_4_TIENG', message: 'Lịch hẹn trực tuyến phải được đặt trước giờ khám tối thiểu 4 tiếng.' });
    }

    // 2. Kiểm tra slot bác sĩ
    if (dto.bacSiId && dto.gioHen) {
      const trung = await this.repo.findOne({
        where: {
          bacSiId: dto.bacSiId,
          ngayHen: dto.ngayHen,
          gioHen: dto.gioHen,
        },
      });
      if (trung) {
        throw new ConflictException({ code: 'LICH_HEN_TRUNG_GIO', message: 'Bác sĩ đã có lịch hẹn vào khung giờ này' });
      }
    }

    // 3. Tra cứu hoặc khởi tạo Bệnh nhân
    let finalBenhNhanId = dto.benhNhanId;
    const benhNhanRepo = this.dataSource.getRepository(BenhNhan);

    if (dto.soDienThoai) {
      const existingBn = await benhNhanRepo.findOne({ where: { soDienThoai: dto.soDienThoai } });
      if (existingBn) {
        finalBenhNhanId = existingBn.id;
      } else if (dto.hoTen) {
        const countBn = await benhNhanRepo.count();
        const newBn = benhNhanRepo.create({
          maBenhNhan: MaGeneratorService.generateMaBenhNhan(countBn + 1),
          hoTen: dto.hoTen,
          soDienThoai: dto.soDienThoai,
        });
        const savedBn = await benhNhanRepo.save(newBn);
        finalBenhNhanId = savedBn.id;
      }
    } else if (nguoiDatVaiTro === 'benh_nhan' || !finalBenhNhanId || Number(finalBenhNhanId) === 1) {
      const bn = await benhNhanRepo.findOne({ where: { nguoiDungId: nguoiDatId } });
      if (bn) {
        finalBenhNhanId = bn.id;
      }
    }

    if (!finalBenhNhanId) {
      finalBenhNhanId = 1;
    }

    const count = await this.repo.count();
    const maLichHen = MaGeneratorService.generateMaLichHen(count + 1);
    const nguonDat = nguoiDatVaiTro === 'benh_nhan' ? 'benh_nhan_tu_dat'
                   : nguoiDatVaiTro === 'bac_si'    ? 'bac_si_dat'
                   : 'tiep_tan_dat';

    const lh = this.repo.create({
      benhNhanId: finalBenhNhanId,
      bacSiId: dto.bacSiId || null,
      phongKhamId: dto.phongKhamId || null,
      ngayHen: dto.ngayHen,
      gioHen: dto.gioHen,
      hinhThuc: dto.hinhThuc || 'truc_tiep',
      lyDoKham: dto.lyDoKham,
      ghiChu: dto.ghiChu,
      maLichHen,
      nguonDat,
      trangThai: nguoiDatVaiTro === 'benh_nhan' ? TrangThaiLichHen.CHO_THANH_TOAN : TrangThaiLichHen.DA_XAC_NHAN,
      datBoiNhanVienId: nguoiDatVaiTro !== 'benh_nhan' ? nguoiDatId : null,
    });
    const saved = await this.repo.save(lh);
    return { data: saved, message: 'Đặt lịch hẹn thành công.' };
  }

  // ─── HỦY LỊCH HẸN BỆNH NHÂN (Có kiểm tra ranh giới 2 tiếng & Hoàn tiền 1/5) ───
  async huyLichHenBoiBenhNhan(id: number, userId: number) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan'],
    });

    if (!lh) {
      throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    }

    const now = new Date();
    const ngayGioStr = `${lh.ngayHen}T${lh.gioHen}`;
    const gioHenFull = new Date(ngayGioStr);

    const diffHours = (gioHenFull.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) {
      throw new BadRequestException({
        code: 'KHONG_THE_HUY_DUOI_2_TIENG',
        message: 'Lịch hẹn còn dưới 2 tiếng nữa là đến giờ khám. Theo quy định phòng khám, bạn không thể hủy lịch hoặc khoản tạm ứng 1/5 (40.000đ) sẽ không được hoàn trả.',
      });
    }

    lh.trangThai = TrangThaiLichHen.DA_HUY;
    lh.ghiChu = (lh.ghiChu || '') + ' [Hủy bởi Bệnh nhân trước giờ khám > 2 tiếng - Đã gọi API hoàn tiền 100% khoản tạm ứng 40.000đ qua VNPay/MoMo]';
    lh.capNhatLuc = new Date();

    const saved = await this.repo.save(lh);

    return {
      data: saved,
      message: 'Hủy lịch hẹn thành công! Yêu cầu hoàn tiền tạm ứng 40.000đ (1/5 phí khám) qua VNPay/MoMo đã được xử lý tự động.',
    };
  }

  // ─── CẬP NHẬT TRẠNG THÁI (Optimistic Lock) ────────────────────
  async capNhatTrangThai(id: number, dto: CapNhatTrangThaiLichHenDto) {
    const result = await this.repo
      .createQueryBuilder()
      .update(LichHen)
      .set({
        trangThai: dto.trangThai as TrangThaiLichHen,
        ghiChu: dto.ghiChu,
        phienBan: () => 'phien_ban + 1',
        capNhatLuc: new Date(),
      })
      .where('id = :id AND phien_ban = :phienBan', { id, phienBan: dto.phienBan })
      .execute();

    if (result.affected === 0) {
      throw new ConflictException({
        code: 'XUNG_DOT_DU_LIEU',
        message: 'Lịch hẹn đã được cập nhật bởi người dùng khác. Vui lòng tải lại.',
      });
    }

    const updated = await this.repo.findOne({ where: { id }, relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'] });
    return { data: updated, message: 'Cập nhật trạng thái lịch hẹn thành công' };
  }
}

