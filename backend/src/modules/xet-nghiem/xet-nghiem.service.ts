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
      }
    }

    const entities = dto.dsChiDinh.map((item) =>
      this.cdRepo.create({
        benhAnKhamId: dto.benhAnKhamId,
        dichVuXetNghiemId: item.dichVuXetNghiemId,
        bacSiChiDinhId: bacSiId || 1,
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
      .leftJoinAndSelect('cd.benhAnKham', 'bak')
      .leftJoinAndSelect('bak.hoSoBenhAn', 'hs')
      .leftJoinAndSelect('hs.benhNhan', 'bn')
      .orderBy('cd.thoiGianChiDinh', 'DESC')
      .skip((page - 1) * limit).take(limit);

    if (trangThai) qb.andWhere('cd.trangThai = :trangThai', { trangThai });
    else qb.andWhere('cd.trangThai != :huy', { huy: 'huy' });

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      message: 'OK',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── CHI TIẾT 1 CHỈ ĐỊNH + KẾT QUẢ ────────────────────────
  async chiTietChiDinh(id: number) {
    const cd = await this.cdRepo.findOne({
      where: { id },
      relations: ['dichVu', 'benhAnKham', 'benhAnKham.hoSoBenhAn', 'benhAnKham.hoSoBenhAn.benhNhan'],
    });
    if (!cd) throw new NotFoundException({ code: 'CHI_DINH_KHONG_TON_TAI', message: 'Không tìm thấy chỉ định' });
    const kq = await this.kqRepo.findOne({ where: { chiDinhId: id } });
    return { data: { chiDinh: cd, ketQua: kq }, message: 'OK' };
  }

  // ─── CẬP NHẬT TRẠNG THÁI CHỈ ĐỊNH ─────────────────────────
  async capNhatTrangThaiChiDinh(id: number, dto: CapNhatTrangThaiChiDinhDto, nguoiDungId?: number) {
    const cd = await this.cdRepo.findOne({ where: { id } });
    if (!cd) throw new NotFoundException({ code: 'CHI_DINH_KHONG_TON_TAI', message: 'Không tìm thấy chỉ định' });

    let ktvTableId: number | null = null;
    if (nguoiDungId) {
      const nv = await this.cdRepo.manager.getRepository(NhanVien).findOne({ where: { nguoiDungId } });
      if (nv) {
        const ktv = await this.cdRepo.manager.query('SELECT id FROM ky_thuat_vien WHERE nhan_vien_id = ? LIMIT 1', [nv.id]);
        if (ktv && ktv.length > 0) {
          ktvTableId = ktv[0].id;
        }
      }
    }

    const updates: any = { trangThai: dto.trangThai };

    if (dto.trangThai === 'dang_lay_mau') {
      updates.thoiGianLayMau = new Date();
      if (ktvTableId) updates.kyThuatVienId = ktvTableId;
    }
    if (dto.trangThai === 'co_ket_qua') {
      updates.thoiGianCoKetQua = new Date();
    }

    await this.cdRepo.update(id, updates);
    const updated = await this.cdRepo.findOne({
      where: { id },
      relations: ['dichVu', 'benhAnKham', 'benhAnKham.hoSoBenhAn', 'benhAnKham.hoSoBenhAn.benhNhan'],
    });
    return { data: updated, message: 'Cập nhật trạng thái thành công' };
  }

  // ─── NHẬP KẾT QUẢ XÉT NGHIỆM ──────────────────────────────
  async nhapKetQua(chiDinhId: number, dto: NhapKetQuaDto, nguoiDungId: number) {
    const cd = await this.cdRepo.findOne({ where: { id: chiDinhId } });
    if (!cd) throw new NotFoundException({ code: 'CHI_DINH_KHONG_TON_TAI', message: 'Không tìm thấy chỉ định' });

    let ktvTableId: number | null = null;
    if (nguoiDungId) {
      const nv = await this.cdRepo.manager.getRepository(NhanVien).findOne({ where: { nguoiDungId } });
      if (nv) {
        const ktv = await this.cdRepo.manager.query('SELECT id FROM ky_thuat_vien WHERE nhan_vien_id = ? LIMIT 1', [nv.id]);
        if (ktv && ktv.length > 0) {
          ktvTableId = ktv[0].id;
        }
      }
    }

    const nhapBoiId = ktvTableId || null;

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

  // ─── THỐNG KÊ XÉT NGHIỆM ──────────────────────────────────
  async getThongKeXetNghiem(query: { range?: string; tuNgay?: string; denNgay?: string }) {
    const { range, tuNgay, denNgay } = query;
    const qb = this.cdRepo.createQueryBuilder('cd')
      .leftJoinAndSelect('cd.dichVu', 'dv')
      .orderBy('cd.thoiGianChiDinh', 'DESC');

    if (range === 'hom_nay') {
      qb.andWhere('DATE(cd.thoiGianChiDinh) = CURDATE()');
    } else if (range === '7days' || range === 'tuan_nay') {
      qb.andWhere('cd.thoiGianChiDinh >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');
    } else if (range === 'thang_nay') {
      qb.andWhere('MONTH(cd.thoiGianChiDinh) = MONTH(CURDATE()) AND YEAR(cd.thoiGianChiDinh) = YEAR(CURDATE())');
    } else if (tuNgay && denNgay) {
      qb.andWhere('DATE(cd.thoiGianChiDinh) BETWEEN :tuNgay AND :denNgay', { tuNgay, denNgay });
    }

    const items = await qb.getMany();
    const tongChiDinh = items.length;
    const coKetQua = items.filter(i => i.trangThai === TrangThaiChiDinh.CO_KET_QUA).length;
    const dangXuLy = items.filter(i => i.trangThai === TrangThaiChiDinh.DANG_XU_LY || i.trangThai === TrangThaiChiDinh.CHO_LAY_MAU).length;

    // Phân bố theo loại dịch vụ
    const phanBoLoai: Record<string, number> = {};
    items.forEach(i => {
      const loai = i.dichVu?.loai || 'khac';
      phanBoLoai[loai] = (phanBoLoai[loai] || 0) + 1;
    });

    return {
      data: {
        tongChiDinh,
        coKetQua,
        dangXuLy,
        hoanThanh: coKetQua,
        tyLeHoanThanh: tongChiDinh > 0 ? Math.round((coKetQua / tongChiDinh) * 100) : 0,
        phanBoLoai: Object.entries(phanBoLoai).map(([loai, count]) => ({
          loai: loai === 'xet_nghiem' ? 'Xét nghiệm máu' : loai === 'cdha' ? 'Chẩn đoán hình ảnh' : 'Khác',
          count,
          pct: tongChiDinh > 0 ? Math.round((count / tongChiDinh) * 100) : 0,
        })),
        dsChiDinh: items.slice(0, 50),
      },
      message: 'OK',
    };
  }
}

