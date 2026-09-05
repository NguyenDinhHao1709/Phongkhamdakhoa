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
    let items = await this.dvRepo.find({ where, order: { tenDichVu: 'ASC' } });

    if (items.length === 0) {
      const initialServices = [
        { maDichVu: 'XN001', tenDichVu: 'Công thức máu toàn phần (CBC)', loai: 'xet_nghiem', gia: 120000, donViKetQua: 'G/L', giaTriBinhThuong: '4.0 - 10.0' },
        { maDichVu: 'XN002', tenDichVu: 'Sinh hóa máu (Đường huyết, Men gan, Ure, Creatinine)', loai: 'xet_nghiem', gia: 250000, donViKetQua: 'mmol/L', giaTriBinhThuong: '3.9 - 6.4' },
        { maDichVu: 'CD001', tenDichVu: 'X-Quang ngực thẳng', loai: 'cdha', gia: 150000, donViKetQua: 'Hình ảnh', giaTriBinhThuong: 'Bình thường' },
        { maDichVu: 'CD002', tenDichVu: 'Siêu âm ổ bụng tổng quát', loai: 'cdha', gia: 200000, donViKetQua: 'Hình ảnh', giaTriBinhThuong: 'Bình thường' },
        { maDichVu: 'XN003', tenDichVu: 'Điện tâm đồ (ECG)', loai: 'xet_nghiem', gia: 100000, donViKetQua: 'Nhịp tim', giaTriBinhThuong: '60 - 100 bpm' },
      ];
      await this.dvRepo.save(this.dvRepo.create(initialServices));
      items = await this.dvRepo.find({ where, order: { tenDichVu: 'ASC' } });
    }

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

  // ─── UC 47: THỐNG KÊ BÁO CÁO KẾT QUẢ XÉT NGHIỆM ─────────
  async getThongKeXetNghiem(query: { range?: string; tuNgay?: string; denNgay?: string }) {
    const qb = this.cdRepo.createQueryBuilder('cd')
      .leftJoinAndSelect('cd.dichVu', 'dv')
      .orderBy('cd.thoiGianChiDinh', 'DESC');

    const now = new Date();

    if (query.tuNgay && query.denNgay) {
      qb.andWhere('cd.thoiGianChiDinh >= :tuNgay AND cd.thoiGianChiDinh <= :denNgay', {
        tuNgay: query.tuNgay + ' 00:00:00',
        denNgay: query.denNgay + ' 23:59:59',
      });
    } else {
      let startDate: Date;
      switch (query.range) {
        case 'tuan_nay':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
          break;
        case 'thang_nay':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'hom_nay':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
      }
      qb.andWhere('cd.thoiGianChiDinh >= :startDate', { startDate });
    }

    const list = await qb.getMany();

    const tongChiDinh = list.length;
    const daHoanThanh = list.filter(c => c.trangThai === TrangThaiChiDinh.CO_KET_QUA).length;
    const dangXuLy = list.filter(c => c.trangThai === TrangThaiChiDinh.DANG_XU_LY || c.trangThai === TrangThaiChiDinh.DANG_LAY_MAU).length;
    const choLayMau = list.filter(c => c.trangThai === TrangThaiChiDinh.CHO_LAY_MAU).length;

    // Phân loại xét nghiệm máu vs chẩn đoán hình ảnh
    const soXetNghiem = list.filter(c => c.dichVu?.loai === 'xet_nghiem').length;
    const soCdha = list.filter(c => c.dichVu?.loai === 'cdha').length;
    const soKhac = tongChiDinh - soXetNghiem - soCdha;

    // Top 5 dịch vụ chỉ định nhiều nhất
    const dvCounts: Record<string, { ten: string; count: number }> = {};
    list.forEach(c => {
      const ten = c.dichVu?.tenDichVu || 'Khác';
      if (!dvCounts[ten]) dvCounts[ten] = { ten, count: 0 };
      dvCounts[ten].count++;
    });

    const topDichVu = Object.values(dvCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      success: true,
      data: {
        tongChiDinh,
        daHoanThanh,
        dangXuLy,
        choLayMau,
        tyLeHoanThanh: tongChiDinh > 0 ? `${Math.round((daHoanThanh / tongChiDinh) * 100)}%` : '0%',
        coCauLoai: [
          { name: 'Xét nghiệm sinh hóa / máu', value: soXetNghiem },
          { name: 'Chẩn đoán hình ảnh (X-Quang, Siêu âm)', value: soCdha },
          { name: 'Khác', value: soKhac },
        ],
        topDichVu,
        danhSachMoiNhat: list.slice(0, 10).map(c => ({
          id: c.id,
          tenDichVu: c.dichVu?.tenDichVu,
          loai: c.dichVu?.loai,
          trangThai: c.trangThai,
          thoiGianChiDinh: c.thoiGianChiDinh,
          thoiGianCoKetQua: c.thoiGianCoKetQua,
        })),
      },
    };
  }
}

