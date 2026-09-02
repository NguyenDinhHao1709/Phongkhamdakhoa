import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HoSoBenhAn, BenhAnKham, TrangThaiBenhAnKham } from './entities/ho-so-benh-an.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';
import {
  IsInt, IsPositive, IsOptional, IsString, IsEnum, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ──── DTOs ──────────────────────────────────────────────────
export class TaoBenhAnKhamDto {
  @ApiProperty() @IsInt() @IsPositive() luotTiepNhanId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() trieuChung?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chanDoanSoBo?: string;
  @ApiPropertyOptional({ enum: ['truc_tiep', 'truc_tuyen'] })
  @IsOptional() @IsEnum(['truc_tiep', 'truc_tuyen']) hinhThucKham?: string;
}

export class CapNhatBenhAnKhamDto {
  @ApiPropertyOptional() @IsOptional() @IsString() trieuChung?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chanDoanSoBo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chanDoanXacDinh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ketQuaKham?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phuongPhapDieuTri?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() taiKham?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
}

export class KetThucKhamDto {
  @ApiPropertyOptional() @IsOptional() @IsString() chanDoanXacDinh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ketQuaKham?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phuongPhapDieuTri?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() taiKham?: string;
}

// ──── SERVICE ──────────────────────────────────────────────
@Injectable()
export class HoSoBenhAnService {
  constructor(
    @InjectRepository(HoSoBenhAn)   private hoSoRepo: Repository<HoSoBenhAn>,
    @InjectRepository(BenhAnKham)   private benhAnRepo: Repository<BenhAnKham>,
  ) {}

  // ─── Lấy/tạo hồ sơ bệnh án cho bệnh nhân ────────────────
  async getOrCreateHoSo(benhNhanId: number) {
    let hoSo = await this.hoSoRepo.findOne({ where: { benhNhanId } });
    if (!hoSo) {
      const count = await this.hoSoRepo.count();
      hoSo = this.hoSoRepo.create({
        maHoSo: MaGeneratorService.generateMaHoSo(count + 1),
        benhNhanId,
      });
      hoSo = await this.hoSoRepo.save(hoSo);
    }
    return hoSo;
  }

  // ─── Xem lịch sử khám của bệnh nhân ──────────────────────
  async lichSuKham(benhNhanId: number) {
    const hoSo = await this.hoSoRepo.findOne({
      where: { benhNhanId },
      relations: ['dsBenhAnKham'],
    });
    if (!hoSo) return { data: [], message: 'Chưa có hồ sơ bệnh án' };

    const dsBenhAn = await this.benhAnRepo.find({
      where: { hoSoBenhAnId: hoSo.id },
      order: { ngayKham: 'DESC' },
    });
    return { data: dsBenhAn, message: 'OK' };
  }

  // ─── Tạo phiếu khám mới ──────────────────────────────────
  async taoBenhAnKham(nguoiDungId: number, benhNhanId: number, dto: TaoBenhAnKhamDto) {
    const hoSo = await this.getOrCreateHoSo(benhNhanId);

    // Nếu lượt tiếp nhận đã có phiếu khám thì trả về phiếu hiện tại
    let bak = await this.benhAnRepo.findOne({ where: { luotTiepNhanId: dto.luotTiepNhanId } });
    if (bak) {
      return { data: bak, message: 'Lấy phiếu khám hiện tại thành công' };
    }

    let bacSiTableId: number | null = null;
    if (nguoiDungId) {
      const nv = await this.benhAnRepo.manager.getRepository(NhanVien).findOne({ where: { nguoiDungId } });
      if (nv) {
        const bs = await this.benhAnRepo.manager.getRepository(BacSi).findOne({ where: { nhanVienId: nv.id } });
        if (bs) bacSiTableId = bs.id;
        else bacSiTableId = nv.id;
      }
    }

    bak = this.benhAnRepo.create({
      hoSoBenhAnId: hoSo.id,
      luotTiepNhanId: dto.luotTiepNhanId,
      bacSiId: bacSiTableId || nguoiDungId,
      trieuChung: dto.trieuChung,
      chanDoanSoBo: dto.chanDoanSoBo,
      hinhThucKham: dto.hinhThucKham || 'truc_tiep',
    });
    const saved = await this.benhAnRepo.save(bak);
    return { data: saved, message: 'Tạo phiếu khám thành công' };
  }

  // ─── Lấy chi tiết phiếu khám ─────────────────────────────
  async chiTietBenhAnKham(id: number) {
    const bak = await this.benhAnRepo.findOne({ where: { id } });
    if (!bak) throw new NotFoundException({ code: 'BENH_AN_KHONG_TON_TAI', message: 'Không tìm thấy phiếu khám' });
    return { data: bak, message: 'OK' };
  }

  // ─── Cập nhật phiếu khám (đang khám) ─────────────────────
  async capNhatBenhAnKham(id: number, dto: CapNhatBenhAnKhamDto) {
    const bak = await this.benhAnRepo.findOne({ where: { id } });
    if (!bak) throw new NotFoundException({ code: 'BENH_AN_KHONG_TON_TAI', message: 'Không tìm thấy phiếu khám' });
    if (bak.trangThai === TrangThaiBenhAnKham.DA_HOAN_THANH) {
      throw new ConflictException({ code: 'DA_HOAN_THANH', message: 'Phiếu khám đã hoàn thành, không thể sửa' });
    }
    Object.assign(bak, dto);
    const saved = await this.benhAnRepo.save(bak);
    return { data: saved, message: 'Cập nhật phiếu khám thành công' };
  }

  // ─── Kết thúc khám → trạng thái da_hoan_thanh ────────────
  async ketThucKham(id: number, dto: KetThucKhamDto) {
    const bak = await this.benhAnRepo.findOne({ where: { id } });
    if (!bak) throw new NotFoundException({ code: 'BENH_AN_KHONG_TON_TAI', message: 'Không tìm thấy phiếu khám' });

    Object.assign(bak, dto, { trangThai: TrangThaiBenhAnKham.DA_HOAN_THANH });
    const saved = await this.benhAnRepo.save(bak);
    return { data: saved, message: 'Kết thúc khám thành công' };
  }
}
