import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LuotTiepNhan, SinhHieu, TrangThaiTiepNhan } from './entities/tiep-nhan.entity';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';
import {
  IsOptional, IsInt, IsPositive, IsString, IsDateString,
  IsNumber, Min, Max, IsEnum,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

// DTO nội tuyến cho module này
export class TaoTiepNhanDto {
  @ApiProperty() @IsInt() @IsPositive() benhNhanId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() lichHenId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() phongKhamId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bacSiId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lyDoKham?: string;
}

export class GhiSinhHieuDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() chieuCaoCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() canNangKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() nhietDoC?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() huyetApTamThu?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() huyetApTamTruong?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() nhipTim?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() nhipTho?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() spo2?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mach?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() nhietDo?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() chieuCao?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() canNang?: number;
}

export class DieuPhoiPhongDto {
  @ApiProperty() @IsInt() @IsPositive() phongKhamId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bacSiId?: number;
}

export class CapNhatTrangThaiTiepNhanDto {
  @ApiProperty({ enum: ['cho_kham', 'dang_kham', 'hoan_thanh', 'da_huy'] })
  @IsEnum(['cho_kham', 'dang_kham', 'hoan_thanh', 'da_huy'])
  trangThai: string;
}

@Injectable()
export class TiepNhanService {
  constructor(
    @InjectRepository(LuotTiepNhan) private luotRepo: Repository<LuotTiepNhan>,
    @InjectRepository(SinhHieu) private sinhHieuRepo: Repository<SinhHieu>,
  ) {}

  // ─── HÀNG ĐỢI PHÒNG KHÁM ─────────────────────────────────────
  async hangDoi(phongKhamId?: number) {
    const qb = this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .leftJoinAndSelect('ltn.sinhHieu', 'sh')
      .where('ltn.trangThai IN (:...tt)', { tt: ['cho_kham', 'dang_kham'] })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
      .orderBy('ltn.thoiGianDen', 'ASC');

    if (phongKhamId) qb.andWhere('ltn.phongKhamId = :phongKhamId', { phongKhamId });

    const items = await qb.getMany();
    return { data: items, message: 'Lấy hàng đợi thành công' };
  }

  // ─── TẠO LƯỢT TIẾP NHẬN ──────────────────────────────────────
  async create(dto: TaoTiepNhanDto, tiepTanId: number) {
    // Đếm tổng số lượt để tạo số thứ tự duy nhất không trùng DB constraint
    const totalCount = await this.luotRepo.count();
    const maSoThuTu = MaGeneratorService.generateSoThuTu(totalCount + 1);

    const luot = this.luotRepo.create({
      ...dto,
      maSoThuTu,
      tiepTanId,
      thoiGianDen: new Date(),
    });

    const saved = await this.luotRepo.save(luot);
    const withRelations = await this.luotRepo.findOne({
      where: { id: saved.id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });

    return { data: withRelations, message: `Tiếp nhận thành công. Số thứ tự: ${maSoThuTu}` };
  }

  // ─── GHI SINH HIỆU ───────────────────────────────────────────
  async ghiSinhHieu(luotId: number, dto: GhiSinhHieuDto, doBoiId: number) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });

    const mappedData = {
      chieuCaoCm: dto.chieuCaoCm ?? dto.chieuCao,
      canNangKg: dto.canNangKg ?? dto.canNang,
      nhietDoC: dto.nhietDoC ?? dto.nhietDo,
      huyetApTamThu: dto.huyetApTamThu,
      huyetApTamTruong: dto.huyetApTamTruong,
      nhipTim: dto.nhipTim ?? dto.mach,
      nhipTho: dto.nhipTho,
      spo2: dto.spo2,
      ghiChu: dto.ghiChu,
    };

    // Upsert sinh hiệu
    let sh = await this.sinhHieuRepo.findOne({ where: { luotTiepNhanId: luotId } });
    if (sh) {
      Object.assign(sh, mappedData, { doBoiId, doLuc: new Date() });
    } else {
      sh = this.sinhHieuRepo.create({
        ...mappedData,
        luotTiepNhanId: luotId,
        doBoiId,
        doLuc: new Date(),
      });
    }

    const saved = await this.sinhHieuRepo.save(sh);
    return { data: saved, message: 'Ghi sinh hiệu thành công' };
  }

  // ─── ĐIỀU PHỐI PHÒNG ─────────────────────────────────────────
  async dieuPhoiPhong(luotId: number, dto: DieuPhoiPhongDto) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });

    Object.assign(luot, { phongKhamId: dto.phongKhamId, bacSiId: dto.bacSiId });
    const saved = await this.luotRepo.save(luot);
    return { data: saved, message: 'Điều phối phòng thành công' };
  }

  // ─── CẬP NHẬT TRẠNG THÁI ─────────────────────────────────────
  async capNhatTrangThai(luotId: number, dto: CapNhatTrangThaiTiepNhanDto) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });

    // Khi chuyển sang trạng thái "Đang khám": tự động chuyển các lượt khác đang "dang_kham" của cùng bác sĩ/phòng khám sang "cho_ket_qua"
    if (dto.trangThai === 'dang_kham') {
      const query = this.luotRepo.createQueryBuilder('luot')
        .where('luot.trangThai = :st', { st: 'dang_kham' })
        .andWhere('luot.id != :id', { id: luotId });

      if (luot.bacSiId) {
        query.andWhere('luot.bacSiId = :bacSiId', { bacSiId: luot.bacSiId });
      } else if (luot.phongKhamId) {
        query.andWhere('luot.phongKhamId = :phongKhamId', { phongKhamId: luot.phongKhamId });
      }

      const existingDangKham = await query.getMany();
      for (const prev of existingDangKham) {
        prev.trangThai = TrangThaiTiepNhan.CHO_KHAM;
        await this.luotRepo.save(prev);
      }
    }

    luot.trangThai = dto.trangThai as TrangThaiTiepNhan;
    await this.luotRepo.save(luot);

    const updated = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan', 'bacSi'] });
    return { data: updated, message: 'Cập nhật trạng thái thành công' };
  }

  // ─── XEM SINH HIỆU ───────────────────────────────────────────
  async xemSinhHieu(luotId: number) {
    const sh = await this.sinhHieuRepo.findOne({ where: { luotTiepNhanId: luotId } });
    return { data: sh || null, message: sh ? 'OK' : 'Chưa có sinh hiệu' };
  }

  // ─── BÁO CÁO & DASHBOARD THỐNG KÊ TIẾP NHẬN ─────────────────
  async getThongKeBaoCao(query: {
    khoangThoiGian?: string;
    tuNgay?: string;
    denNgay?: string;
  }) {
    const qb = this.luotRepo.createQueryBuilder('ltn');

    // Xác định khoảng ngày
    let tuNgay: Date | null = null;
    let denNgay: Date | null = null;

    const now = new Date();
    if (query.tuNgay) {
      tuNgay = new Date(query.tuNgay);
      tuNgay.setHours(0, 0, 0, 0);
    }
    if (query.denNgay) {
      denNgay = new Date(query.denNgay);
      denNgay.setHours(23, 59, 59, 999);
    }

    if (!tuNgay && !denNgay) {
      if (query.khoangThoiGian === 'hom_nay') {
        tuNgay = new Date();
        tuNgay.setHours(0, 0, 0, 0);
        denNgay = new Date();
        denNgay.setHours(23, 59, 59, 999);
      } else if (query.khoangThoiGian === '7_ngay') {
        tuNgay = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        tuNgay.setHours(0, 0, 0, 0);
      } else if (query.khoangThoiGian === 'thang_nay') {
        tuNgay = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      // 'tat_ca': không giới hạn ngày
    }

    if (tuNgay) qb.andWhere('ltn.thoiGianDen >= :tuNgay', { tuNgay });
    if (denNgay) qb.andWhere('ltn.thoiGianDen <= :denNgay', { denNgay });

    // 1. Tổng lượt
    const tongLuot = await qb.getCount();

    // 2. Đặt lịch vs Vãng lai
    const qbDatLich = qb.clone().andWhere('ltn.lichHenId IS NOT NULL');
    const datLichCount = await qbDatLich.getCount();
    const vangLaiCount = Math.max(0, tongLuot - datLichCount);

    // 3. Theo trạng thái
    const qbChoKham = qb.clone().andWhere('ltn.trangThai IN (:...st)', { st: ['cho_kham', 'dang_cls', 'da_co_kq_cls'] });
    const choKhamCount = await qbChoKham.getCount();

    const qbDangKham = qb.clone().andWhere('ltn.trangThai = :st', { st: 'dang_kham' });
    const dangKhamCount = await qbDangKham.getCount();

    const qbHoanThanh = qb.clone().andWhere('ltn.trangThai = :st', { st: 'hoan_thanh' });
    const hoanThanhCount = await qbHoanThanh.getCount();

    const qbDaHuy = qb.clone().andWhere('ltn.trangThai = :st', { st: 'da_huy' });
    const daHuyCount = await qbDaHuy.getCount();

    const tyLeHoanThanh = tongLuot > 0 ? Number(((hoanThanhCount / tongLuot) * 100).toFixed(1)) : 0;

    // 4. Phân bổ theo chuyên khoa / phòng khám
    const qbPhong = qb.clone()
      .leftJoin('phong_kham', 'pk', 'pk.id = ltn.phongKhamId')
      .select('COALESCE(pk.ten_phong, "Chưa chỉ định phòng") as tenPhong')
      .addSelect('COALESCE(pk.chuyen_khoa, "Chung") as chuyenKhoa')
      .addSelect('COUNT(ltn.id) as soLuot')
      .groupBy('pk.id, pk.ten_phong, pk.chuyen_khoa')
      .orderBy('soLuot', 'DESC');

    const phongKhamRaw = await qbPhong.getRawMany();
    const theoPhongKham = phongKhamRaw.map((p) => ({
      tenPhong: p.tenPhong,
      chuyenKhoa: p.chuyenKhoa,
      soLuot: Number(p.soLuot),
      tyLe: tongLuot > 0 ? Number(((Number(p.soLuot) / tongLuot) * 100).toFixed(1)) : 0,
    }));

    // 5. Lưu lượng theo khung giờ trong ngày
    const qbGio = qb.clone()
      .select('HOUR(ltn.thoiGianDen) as gio')
      .addSelect('COUNT(ltn.id) as soLuot')
      .groupBy('HOUR(ltn.thoiGianDen)')
      .orderBy('gio', 'ASC');

    const gioRaw = await qbGio.getRawMany();
    const gioMap: Record<number, number> = {};
    for (const g of gioRaw) {
      gioMap[Number(g.gio)] = Number(g.soLuot);
    }

    const khungGioConfig = [
      { khung: '07:00 - 09:00', label: 'Sáng sớm', count: (gioMap[7] || 0) + (gioMap[8] || 0) },
      { khung: '09:00 - 11:00', label: 'Cao điểm sáng', count: (gioMap[9] || 0) + (gioMap[10] || 0) },
      { khung: '11:00 - 13:00', label: 'Trưa', count: (gioMap[11] || 0) + (gioMap[12] || 0) },
      { khung: '13:00 - 15:00', label: 'Đầu giờ chiều', count: (gioMap[13] || 0) + (gioMap[14] || 0) },
      { khung: '15:00 - 17:00', label: 'Cuối giờ chiều', count: (gioMap[15] || 0) + (gioMap[16] || 0) },
      { khung: '17:00 - 19:00', label: 'Ca tối', count: (gioMap[17] || 0) + (gioMap[18] || 0) },
    ];

    // 6. Đối tượng bệnh nhân theo nhóm tuổi & giới tính
    const qbTreEm = qb.clone()
      .leftJoin('ltn.benhNhan', 'bn')
      .andWhere('YEAR(CURDATE()) - YEAR(bn.ngaySinh) < 16');
    const treEmCount = await qbTreEm.getCount();

    const qbNguoiCaoTuoi = qb.clone()
      .leftJoin('ltn.benhNhan', 'bn')
      .andWhere('YEAR(CURDATE()) - YEAR(bn.ngaySinh) >= 60');
    const caoTuoiCount = await qbNguoiCaoTuoi.getCount();

    const nguoiLonCount = Math.max(0, tongLuot - treEmCount - caoTuoiCount);

    return {
      message: 'Lấy dữ liệu thống kê dashboard tiếp nhận thành công',
      data: {
        tongLuot,
        datLichCount,
        vangLaiCount,
        choKhamCount,
        dangKhamCount,
        hoanThanhCount,
        daHuyCount,
        tyLeHoanThanh,
        theoPhongKham,
        khungGio: khungGioConfig,
        nhomTuoi: {
          treEm: treEmCount,
          nguoiLon: nguoiLonCount,
          caoTuoi: caoTuoiCount,
        },
      },
    };
  }

  // ─── DANH SÁCH BÁO CÁO TIẾP NHẬN ĐẦY ĐỦ ────────────────────
  async getDanhSachBaoCao(query: {
    page?: number;
    limit?: number;
    search?: string;
    phongKhamId?: number;
    trangThai?: string;
    loaiTiepNhan?: string;
    khoangThoiGian?: string;
    tuNgay?: string;
    denNgay?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 15);
    const skip = (page - 1) * limit;

    const qb = this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'bsNv')
      .leftJoinAndSelect('ltn.sinhHieu', 'sh')
      .leftJoinAndSelect('ltn.lichHen', 'lh')
      .leftJoinAndSelect('ltn.tiepTan', 'tt')
      .leftJoin('phong_kham', 'pk', 'pk.id = ltn.phongKhamId')
      .addSelect(['pk.id', 'pk.ten_phong', 'pk.chuyen_khoa']);

    // Xác định khoảng thời gian
    const now = new Date();
    let tuNgay: Date | null = null;
    let denNgay: Date | null = null;

    if (query.tuNgay) {
      tuNgay = new Date(query.tuNgay);
      tuNgay.setHours(0, 0, 0, 0);
    }
    if (query.denNgay) {
      denNgay = new Date(query.denNgay);
      denNgay.setHours(23, 59, 59, 999);
    }

    if (!tuNgay && !denNgay) {
      if (query.khoangThoiGian === 'hom_nay') {
        tuNgay = new Date();
        tuNgay.setHours(0, 0, 0, 0);
        denNgay = new Date();
        denNgay.setHours(23, 59, 59, 999);
      } else if (query.khoangThoiGian === '7_ngay') {
        tuNgay = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        tuNgay.setHours(0, 0, 0, 0);
      } else if (query.khoangThoiGian === 'thang_nay') {
        tuNgay = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    if (tuNgay) qb.andWhere('ltn.thoiGianDen >= :tuNgay', { tuNgay });
    if (denNgay) qb.andWhere('ltn.thoiGianDen <= :denNgay', { denNgay });

    // Tìm kiếm
    if (query.search && query.search.trim()) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere(
        '(bn.hoTen LIKE :kw OR bn.soDienThoai LIKE :kw OR bn.maBenhNhan LIKE :kw OR ltn.maSoThuTu LIKE :kw)',
        { kw },
      );
    }

    // Lọc phòng khám
    if (query.phongKhamId) {
      qb.andWhere('ltn.phongKhamId = :pkId', { pkId: query.phongKhamId });
    }

    // Lọc trạng thái
    if (query.trangThai && query.trangThai !== 'TAT_CA') {
      qb.andWhere('ltn.trangThai = :st', { st: query.trangThai });
    }

    // Lọc loại tiếp nhận (đặt trước vs vãng lai)
    if (query.loaiTiepNhan === 'dat_lich') {
      qb.andWhere('ltn.lichHenId IS NOT NULL');
    } else if (query.loaiTiepNhan === 'vang_lai') {
      qb.andWhere('ltn.lichHenId IS NULL');
    }

    qb.orderBy('ltn.thoiGianDen', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Query thêm thông tin phòng khám cho từng lượt
    const roomIds = Array.from(new Set(items.map((i) => i.phongKhamId).filter(Boolean)));
    let roomMap: Record<number, any> = {};
    if (roomIds.length > 0) {
      const rooms: any[] = await this.luotRepo.query(
        `SELECT id, ten_phong, chuyen_khoa FROM phong_kham WHERE id IN (${roomIds.join(',')})`
      );
      for (const r of rooms) {
        roomMap[r.id] = r;
      }
    }

    const mappedItems = items.map((i) => ({
      ...i,
      phongKham: roomMap[i.phongKhamId] || null,
      loaiTiepNhan: i.lichHenId ? 'dat_lich' : 'vang_lai',
    }));

    return {
      message: 'Lấy danh sách báo cáo tiếp nhận thành công',
      data: mappedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}


