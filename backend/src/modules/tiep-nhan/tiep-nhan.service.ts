import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LuotTiepNhan, SinhHieu, TrangThaiTiepNhan } from './entities/tiep-nhan.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
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
}

export class GhiSinhHieuDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() chieuCaoCm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() chieuCao?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() canNangKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() canNang?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() nhietDoC?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() nhietDo?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() huyetApTamThu?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() huyetApTamTruong?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() nhipTim?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() mach?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() nhipTho?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() spo2?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
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
    private dataSource: DataSource,
  ) {}

  // ─── HÀNG ĐỢI PHÒNG KHÁM ─────────────────────────────────────
  async hangDoi(phongKhamId?: number) {
    const qb = this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('ltn.trangThai IN (:...st)', { st: ['cho_kham', 'dang_kham'] })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()');

    if (phongKhamId) {
      qb.andWhere('ltn.phongKhamId = :phongKhamId', { phongKhamId });
    }

    const list = await qb
      .orderBy("CASE ltn.trangThai WHEN 'dang_kham' THEN 1 ELSE 2 END", 'ASC')
      .addOrderBy('ltn.thoiGianDen', 'ASC')
      .getMany();

    return { data: list, message: 'Lấy hàng đợi thành công' };
  }

  // ─── TẠO LƯỢT TIẾP NHẬN BỆNH NHÂN ────────────────────────────
  async create(dto: TaoTiepNhanDto, tiepTanId?: number) {
    const todayCount = await this.luotRepo
      .createQueryBuilder('l')
      .where('DATE(l.thoiGianDen) = CURDATE()')
      .getCount();

    const maSoThuTu = MaGeneratorService.generateSoThuTu(todayCount + 1);

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
  async ghiSinhHieu(luotId: number, dto: GhiSinhHieuDto, nguoiDungId: number) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });

    let doBoiId: number | null = null;
    if (nguoiDungId) {
      const nv = await this.dataSource.getRepository(NhanVien).findOne({ where: { nguoiDungId } });
      if (nv) doBoiId = nv.id;
    }

    const chieuCaoCm = dto.chieuCaoCm ?? dto.chieuCao;
    const canNangKg = dto.canNangKg ?? dto.canNang;
    const nhietDoC = dto.nhietDoC ?? dto.nhietDo;
    const nhipTim = dto.nhipTim ?? dto.mach;

    // Upsert sinh hiệu không đè null lên dữ liệu cũ
    let sh = await this.sinhHieuRepo.findOne({ where: { luotTiepNhanId: luotId } });
    if (!sh) {
      sh = this.sinhHieuRepo.create({ luotTiepNhanId: luotId });
    }

    if (chieuCaoCm !== undefined && chieuCaoCm !== null && chieuCaoCm !== ('' as any)) sh.chieuCaoCm = Number(chieuCaoCm);
    if (canNangKg !== undefined && canNangKg !== null && canNangKg !== ('' as any)) sh.canNangKg = Number(canNangKg);
    if (nhietDoC !== undefined && nhietDoC !== null && nhietDoC !== ('' as any)) sh.nhietDoC = Number(nhietDoC);
    if (dto.huyetApTamThu !== undefined && dto.huyetApTamThu !== null && dto.huyetApTamThu !== ('' as any)) sh.huyetApTamThu = Number(dto.huyetApTamThu);
    if (dto.huyetApTamTruong !== undefined && dto.huyetApTamTruong !== null && dto.huyetApTamTruong !== ('' as any)) sh.huyetApTamTruong = Number(dto.huyetApTamTruong);
    if (nhipTim !== undefined && nhipTim !== null && nhipTim !== ('' as any)) sh.nhipTim = Number(nhipTim);
    if (dto.nhipTho !== undefined && dto.nhipTho !== null && dto.nhipTho !== ('' as any)) sh.nhipTho = Number(dto.nhipTho);
    if (dto.spo2 !== undefined && dto.spo2 !== null && dto.spo2 !== ('' as any)) sh.spo2 = Number(dto.spo2);
    if (dto.ghiChu !== undefined && dto.ghiChu !== null) sh.ghiChu = dto.ghiChu;
    if (doBoiId) sh.doBoiId = doBoiId;
    sh.doLuc = new Date();

    const saved = await this.sinhHieuRepo.save(sh);
    return this.xemSinhHieu(luotId);
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

    // Khi chuyển sang trạng thái "Đang khám": tự động chuyển các lượt khác đang "dang_kham" của cùng bác sĩ/phòng khám sang "cho_kham"
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
    if (!sh) return { data: null, message: 'Chưa có sinh hiệu' };

    const formattedData = {
      ...sh,
      chieuCaoCm: sh.chieuCaoCm ? Number(sh.chieuCaoCm) : null,
      canNangKg: sh.canNangKg ? Number(sh.canNangKg) : null,
      nhietDoC: sh.nhietDoC ? Number(sh.nhietDoC) : null,
      huyetApTamThu: sh.huyetApTamThu ? Number(sh.huyetApTamThu) : null,
      huyetApTamTruong: sh.huyetApTamTruong ? Number(sh.huyetApTamTruong) : null,
      nhipTim: sh.nhipTim ? Number(sh.nhipTim) : null,
      mach: sh.nhipTim ? Number(sh.nhipTim) : null,
      nhipTho: sh.nhipTho ? Number(sh.nhipTho) : null,
      spo2: sh.spo2 ? Number(sh.spo2) : null,
    };

    return {
      data: formattedData,
      message: 'OK',
    };
  }
}
