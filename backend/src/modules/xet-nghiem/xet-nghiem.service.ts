import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DichVuXetNghiem, ChiDinhCanLamSang, KetQuaXetNghiem,
  TrangThaiChiDinh,
} from './entities/xet-nghiem.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import {
  IsInt, IsPositive, IsOptional, IsString, IsEnum, IsArray,
  ValidateNested, IsNumber, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ──── DTOs ──────────────────────────────────────────────────
class ChiDinhItem {
  @ApiProperty() @IsInt() dichVuXetNghiemId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChuChiDinh?: string;
}

export class TaoChiDinhDto {
  @ApiProperty() @IsInt() @IsPositive() benhAnKhamId: number;
  @ApiProperty({ type: [ChiDinhItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChiDinhItem)
  dsChiDinh: ChiDinhItem[];
}

export class CapNhatTrangThaiChiDinhDto {
  @ApiProperty({ enum: ['cho_lay_mau', 'dang_lay_mau', 'dang_xu_ly', 'co_ket_qua', 'huy'] })
  @IsEnum(['cho_lay_mau', 'dang_lay_mau', 'dang_xu_ly', 'co_ket_qua', 'huy'])
  trangThai: string;
}

export class NhapKetQuaDto {
  @ApiPropertyOptional() @IsOptional() @IsString() giaTri?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() donVi?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nhanXet?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileDinhKem?: string;
}

export class TimKiemChiDinhDto {
  @ApiPropertyOptional() @IsOptional() @IsString() trangThai?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) limit?: number = 20;
}

// ──── SERVICE ──────────────────────────────────────────────
@Injectable()
export class XetNghiemService {
  constructor(
    @InjectRepository(DichVuXetNghiem)    private dvRepo: Repository<DichVuXetNghiem>,
    @InjectRepository(ChiDinhCanLamSang)  private cdRepo: Repository<ChiDinhCanLamSang>,
    @InjectRepository(KetQuaXetNghiem)    private kqRepo: Repository<KetQuaXetNghiem>,
  ) {}

  // ─── DANH MỤC DỊCH VỤ ─────────────────────────────────────
  async danhMucDichVu(loai?: string) {
    const where: any = { trangThai: 'hoat_dong' };
    if (loai) where.loai = loai;
    const items = await this.dvRepo.find({ where, order: { tenDichVu: 'ASC' } });
    return { data: items, message: 'OK' };
  }

  // ─── BÁC SĨ CHỈ ĐỊNH XÉT NGHIỆM ──────────────────────────
  async taoChiDinh(nguoiDungId: number, dto: TaoChiDinhDto) {
    let bacSiId: number | null = null;
    if (nguoiDungId) {
      const nv = await this.cdRepo.manager.getRepository(NhanVien).findOne({ where: { nguoiDungId } });
      if (nv) {
        const bs = await this.cdRepo.manager.getRepository(BacSi).findOne({ where: { nhanVienId: nv.id } });
        if (bs) bacSiId = bs.id;
        else bacSiId = nv.id;
      }
    }

    const entities = dto.dsChiDinh.map((item) =>
      this.cdRepo.create({
        benhAnKhamId: dto.benhAnKhamId,
        dichVuXetNghiemId: item.dichVuXetNghiemId,
        bacSiChiDinhId: bacSiId || nguoiDungId,
        ghiChuChiDinh: item.ghiChuChiDinh,
      }),
    );
    const saved = await this.cdRepo.save(entities);
    return { data: saved, message: `Đã chỉ định ${saved.length} xét nghiệm thành công` };
  }

  // ─── DANH SÁCH CHỈ ĐỊNH (cho KTV) ──────────────────────────
  async danhSachChiDinh(dto: TimKiemChiDinhDto) {
    const { trangThai, page = 1, limit = 20 } = dto;
    const qb = this.cdRepo.createQueryBuilder('cd')
      .leftJoinAndSelect('cd.dichVu', 'dv')
      .orderBy('cd.thoi_gian_chi_dinh', 'DESC')
      .skip((page - 1) * limit).take(limit);

    if (trangThai) qb.andWhere('cd.trang_thai = :trangThai', { trangThai });
    else qb.andWhere('cd.trang_thai != :huy', { huy: 'huy' });

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      message: 'OK',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── CHI TIẾT 1 CHỈ ĐỊNH + KẾT QUẢ ────────────────────────
  async chiTietChiDinh(id: number) {
    const cd = await this.cdRepo.findOne({ where: { id }, relations: ['dichVu'] });
    if (!cd) throw new NotFoundException({ code: 'CHI_DINH_KHONG_TON_TAI', message: 'Không tìm thấy chỉ định' });
    const kq = await this.kqRepo.findOne({ where: { chiDinhId: id } });
    return { data: { chiDinh: cd, ketQua: kq }, message: 'OK' };
  }

  // ─── CẬP NHẬT TRẠNG THÁI CHỈ ĐỊNH ─────────────────────────
  async capNhatTrangThaiChiDinh(id: number, dto: CapNhatTrangThaiChiDinhDto, kyThuatVienId?: number) {
    const cd = await this.cdRepo.findOne({ where: { id } });
    if (!cd) throw new NotFoundException({ code: 'CHI_DINH_KHONG_TON_TAI', message: 'Không tìm thấy chỉ định' });

    const updates: any = { trangThai: dto.trangThai };

    if (dto.trangThai === 'dang_lay_mau') {
      updates.thoiGianLayMau = new Date();
      if (kyThuatVienId) updates.kyThuatVienId = kyThuatVienId;
    }
    if (dto.trangThai === 'co_ket_qua') {
      updates.thoiGianCoKetQua = new Date();
    }

    await this.cdRepo.update(id, updates);
    const updated = await this.cdRepo.findOne({ where: { id }, relations: ['dichVu'] });
    return { data: updated, message: 'Cập nhật trạng thái thành công' };
  }

  // ─── NHẬP KẾT QUẢ XÉT NGHIỆM ──────────────────────────────
  async nhapKetQua(chiDinhId: number, dto: NhapKetQuaDto, nhapBoiId: number) {
    const cd = await this.cdRepo.findOne({ where: { id: chiDinhId } });
    if (!cd) throw new NotFoundException({ code: 'CHI_DINH_KHONG_TON_TAI', message: 'Không tìm thấy chỉ định' });

    // Upsert kết quả
    let kq = await this.kqRepo.findOne({ where: { chiDinhId } });
    if (kq) {
      Object.assign(kq, dto, { nhapBoiId });
    } else {
      kq = this.kqRepo.create({ ...dto, chiDinhId, nhapBoiId });
    }
    const saved = await this.kqRepo.save(kq);

    // Tự động chuyển trạng thái chỉ định → co_ket_qua
    await this.cdRepo.update(chiDinhId, {
      trangThai: TrangThaiChiDinh.CO_KET_QUA,
      thoiGianCoKetQua: new Date(),
    });

    return { data: saved, message: 'Nhập kết quả xét nghiệm thành công' };
  }

  // ─── GỬI KẾT QUẢ CHO BÁC SĨ (đánh dấu) ──────────────────
  async guiKetQuaChoBacSi(chiDinhId: number) {
    const kq = await this.kqRepo.findOne({ where: { chiDinhId } });
    if (!kq) throw new NotFoundException({ code: 'CHUA_CO_KET_QUA', message: 'Chưa có kết quả để gửi' });
    kq.daGuiBacSi = true;
    await this.kqRepo.save(kq);
    return { data: kq, message: 'Đã gửi kết quả cho bác sĩ' };
  }

  // ─── XEM KẾT QUẢ XÉT NGHIỆM CỦA 1 PHIẾU KHÁM ───────────
  async ketQuaTheoBenhAnKham(benhAnKhamId: number) {
    const dsChiDinh = await this.cdRepo.find({
      where: { benhAnKhamId },
      relations: ['dichVu'],
      order: { thoiGianChiDinh: 'ASC' },
    });

    const results = await Promise.all(
      dsChiDinh.map(async (cd) => {
        const kq = await this.kqRepo.findOne({ where: { chiDinhId: cd.id } });
        return { chiDinh: cd, ketQua: kq };
      }),
    );

    return { data: results, message: 'OK' };
  }
}

