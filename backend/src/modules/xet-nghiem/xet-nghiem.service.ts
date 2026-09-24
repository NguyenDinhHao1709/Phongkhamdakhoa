import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  DichVuXetNghiem, ChiDinhCanLamSang, KetQuaXetNghiem,
  TrangThaiChiDinh,
} from './entities/xet-nghiem.entity';
import { DanhGiaCaKham } from '../danh-gia/entities/danh-gia.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { LuotTiepNhan, TrangThaiTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import {
  IsInt, IsPositive, IsOptional, IsString, IsEnum, IsArray, ArrayMinSize,
  ValidateNested, IsNumber, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ──── DTOs ──────────────────────────────────────────────────
class ChiDinhItem {
  @ApiProperty() @IsInt() @IsPositive() dichVuXetNghiemId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChuChiDinh?: string;
}

export class TaoChiDinhDto {
  @ApiProperty() @IsInt() @IsPositive() benhAnKhamId: number;
  @ApiProperty({ type: [ChiDinhItem] })
  @IsArray()
  @ArrayMinSize(1)
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
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tuNgay?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() denNgay?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() loaiDichVu?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number = 50;
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
    if (!bacSiId) {
      throw new BadRequestException('Không xác định được bác sĩ chỉ định từ tài khoản hiện tại');
    }

    if (!dto.dsChiDinh || dto.dsChiDinh.length === 0) {
      throw new BadRequestException('Danh sách chỉ định cận lâm sàng không được để trống');
    }

    // 1. Kiểm tra trùng lặp ngay trong danh sách gửi lên
    const seenIds = new Set<number>();
    for (const item of dto.dsChiDinh) {
      if (seenIds.has(item.dichVuXetNghiemId)) {
        throw new BadRequestException('Danh sách chỉ định có dịch vụ bị chọn trùng nhau');
      }
      seenIds.add(item.dichVuXetNghiemId);
    }

    // 2. Kiểm tra các dịch vụ đã chỉ định trước đó cho phiếu khám này
    const existingOrders = await this.cdRepo.find({
      where: {
        benhAnKhamId: dto.benhAnKhamId,
        trangThai: Not(TrangThaiChiDinh.HUY),
      },
      relations: ['dichVu'],
    });

    const existingMap = new Map<number, string>();
    for (const ord of existingOrders) {
      existingMap.set(ord.dichVuXetNghiemId, ord.dichVu?.tenDichVu || `Mã ${ord.dichVuXetNghiemId}`);
    }

    for (const item of dto.dsChiDinh) {
      if (existingMap.has(item.dichVuXetNghiemId)) {
        const tenDichVu = existingMap.get(item.dichVuXetNghiemId);
        throw new BadRequestException(
          `Dịch vụ cận lâm sàng "${tenDichVu}" đã được chỉ định trong đợt khám này. Không được chỉ định trùng dịch vụ!`,
        );
      }
    }

    const entities = dto.dsChiDinh.map((item) =>
      this.cdRepo.create({
        benhAnKhamId: dto.benhAnKhamId,
        dichVuXetNghiemId: item.dichVuXetNghiemId,
        bacSiChiDinhId: bacSiId,
        ghiChuChiDinh: item.ghiChuChiDinh,
      }),
    );
    const saved = await this.cdRepo.save(entities);

    // 3. Tự động chuyển trạng thái của lượt tiếp nhận liên quan sang "dang_cls"
    try {
      const bak = await this.cdRepo.manager.getRepository(BenhAnKham).findOne({
        where: { id: dto.benhAnKhamId },
      });
      if (bak?.luotTiepNhanId) {
        await this.cdRepo.manager.getRepository(LuotTiepNhan).update(
          { id: bak.luotTiepNhanId },
          { trangThai: TrangThaiTiepNhan.DANG_CLS },
        );
      }
    } catch (err) {
      console.warn('[taoChiDinh] Không thể tự động cập nhật trạng thái dang_cls cho lượt tiếp nhận:', err);
    }

    return { data: saved, message: `Đã chỉ định ${saved.length} xét nghiệm thành công` };
  }

  // ─── DANH SÁCH CHỈ ĐỊNH (cho KTV) ──────────────────────────
  async danhSachChiDinh(dto: TimKiemChiDinhDto) {
    const { trangThai, page = 1, limit = 50, search, tuNgay, denNgay, loaiDichVu } = dto;
    const qb = this.cdRepo.createQueryBuilder('cd')
      .leftJoinAndSelect('cd.dichVu', 'dv')
      .leftJoinAndSelect('cd.benhAnKham', 'bak')
      .leftJoinAndSelect('bak.hoSoBenhAn', 'hs')
      .leftJoinAndSelect('hs.benhNhan', 'bn')
      .orderBy('cd.thoiGianChiDinh', 'DESC')
      .skip((page - 1) * limit).take(limit);

    if (trangThai && trangThai !== 'all') {
      qb.andWhere('cd.trangThai = :trangThai', { trangThai });
    } else {
      qb.andWhere('cd.trangThai != :huy', { huy: 'huy' });
    }

    if (loaiDichVu && loaiDichVu !== 'all') {
      qb.andWhere('dv.loai = :loaiDichVu', { loaiDichVu });
    }

    if (tuNgay) {
      qb.andWhere('cd.thoiGianChiDinh >= :tuNgay', { tuNgay: `${tuNgay} 00:00:00` });
    }

    if (denNgay) {
      qb.andWhere('cd.thoiGianChiDinh <= :denNgay', { denNgay: `${denNgay} 23:59:59` });
    }

    if (search) {
      qb.andWhere(
        '(bn.hoTen LIKE :kw OR bn.soDienThoai LIKE :kw OR bn.maBenhNhan LIKE :kw OR dv.tenDichVu LIKE :kw OR CAST(cd.id AS CHAR) LIKE :kw)',
        { kw: `%${search}%` },
      );
    }

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

    const transitions: Record<string, string[]> = {
      [TrangThaiChiDinh.CHO_LAY_MAU]: [TrangThaiChiDinh.DANG_LAY_MAU, TrangThaiChiDinh.HUY],
      [TrangThaiChiDinh.DANG_LAY_MAU]: [TrangThaiChiDinh.DANG_XU_LY, TrangThaiChiDinh.HUY],
      [TrangThaiChiDinh.DANG_XU_LY]: [TrangThaiChiDinh.CO_KET_QUA, TrangThaiChiDinh.HUY],
      [TrangThaiChiDinh.CO_KET_QUA]: [],
      [TrangThaiChiDinh.HUY]: [],
    };
    if (!transitions[cd.trangThai]?.includes(dto.trangThai)) {
      throw new BadRequestException({
        code: 'CHUYEN_TRANG_THAI_CLS_KHONG_HOP_LE',
        message: `Không thể chuyển chỉ định từ "${cd.trangThai}" sang "${dto.trangThai}".`,
      });
    }

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
    if (cd.trangThai === TrangThaiChiDinh.HUY) {
      throw new BadRequestException('Không thể nhập kết quả cho chỉ định đã hủy');
    }
    if (cd.trangThai !== TrangThaiChiDinh.DANG_XU_LY) {
      throw new BadRequestException('Chỉ được nhập kết quả khi chỉ định đang ở trạng thái xử lý');
    }

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

    // Kiểm tra nếu tất cả chỉ định của phiếu khám này đã có kết quả -> cập nhật lượt khám sang da_co_kq_cls
    try {
      const allOrders = await this.cdRepo.find({
        where: { benhAnKhamId: cd.benhAnKhamId, trangThai: Not(TrangThaiChiDinh.HUY) },
      });
      const allDone = allOrders.every(
        (o) => o.id === chiDinhId || o.trangThai === TrangThaiChiDinh.CO_KET_QUA,
      );
      if (allDone && allOrders.length > 0) {
        const bak = await this.cdRepo.manager.getRepository(BenhAnKham).findOne({
          where: { id: cd.benhAnKhamId },
        });
        if (bak?.luotTiepNhanId) {
          await this.cdRepo.manager.getRepository(LuotTiepNhan).update(
            { id: bak.luotTiepNhanId },
            { trangThai: TrangThaiTiepNhan.DA_CO_KQ_CLS },
          );
        }
      }
    } catch (err) {
      console.warn('[nhapKetQua] Không thể tự động cập nhật trạng thái da_co_kq_cls:', err);
    }

    return { data: saved, message: 'Nhập kết quả xét nghiệm thành công' };
  }

  // ─── HỦY CHỈ ĐỊNH CẬN LÂM SÀNG ────────────────────────────
  async huyChiDinh(id: number) {
    const cd = await this.cdRepo.findOne({ where: { id } });
    if (!cd) throw new NotFoundException('Không tìm thấy chỉ định');
    if (cd.trangThai === TrangThaiChiDinh.CO_KET_QUA) {
      throw new BadRequestException('Chỉ định cận lâm sàng này đã có kết quả xét nghiệm, không thể xóa hoặc hủy trực tiếp');
    }

    const benhAnKhamId = cd.benhAnKhamId;

    // 1. Xóa kết quả xét nghiệm liên quan nếu có
    await this.kqRepo.delete({ chiDinhId: id });

    // 2. Xóa bản ghi chỉ định để biến mất hoàn toàn khỏi danh sách
    await this.cdRepo.delete(id);

    // Đồng bộ lại trạng thái lượt tiếp nhận nếu đã hủy hết hoặc đã hoàn tất các xét nghiệm còn lại
    try {
      const remaining = await this.cdRepo.find({
        where: { benhAnKhamId, trangThai: Not(TrangThaiChiDinh.HUY) },
      });
      const bak = await this.cdRepo.manager.getRepository(BenhAnKham).findOne({
        where: { id: benhAnKhamId },
      });
      if (bak?.luotTiepNhanId) {
        if (remaining.length === 0) {
          // Hủy hết -> quay về đang khám lâm sàng
          await this.cdRepo.manager.getRepository(LuotTiepNhan).update(
            { id: bak.luotTiepNhanId },
            { trangThai: TrangThaiTiepNhan.DANG_KHAM },
          );
        } else if (remaining.every((o) => o.trangThai === TrangThaiChiDinh.CO_KET_QUA)) {
          await this.cdRepo.manager.getRepository(LuotTiepNhan).update(
            { id: bak.luotTiepNhanId },
            { trangThai: TrangThaiTiepNhan.DA_CO_KQ_CLS },
          );
        }
      }
    } catch (e) {
      console.warn('[huyChiDinh] Sync queue status error:', e);
    }

    return { message: 'Đã hủy và xóa chỉ định cận lâm sàng thành công' };
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
      where: { benhAnKhamId, trangThai: Not(TrangThaiChiDinh.HUY) },
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
  async getThongKeXetNghiem(user: any, query: { range?: string; tuNgay?: string; denNgay?: string; scope?: string }) {
    const { range, tuNgay, denNgay, scope = 'all' } = query;
    const qb = this.cdRepo.createQueryBuilder('cd')
      .leftJoinAndSelect('cd.dichVu', 'dv')
      .leftJoinAndSelect('cd.benhAnKham', 'bak')
      .leftJoinAndSelect('bak.hoSoBenhAn', 'hs')
      .leftJoinAndSelect('hs.benhNhan', 'bn')
      .orderBy('cd.thoiGianChiDinh', 'DESC');

    let isKtv = false;
    let ktvChuyenMon: string | null = null;
    let tenKtv: string | null = null;

    if (user?.id) {
      const nv = await this.cdRepo.manager.getRepository(NhanVien).findOne({ where: { nguoiDungId: user.id } });
      if (nv) {
        tenKtv = nv.hoTen;
        const ktvRows = await this.cdRepo.manager.query(
          'SELECT id, chuyen_mon FROM ky_thuat_vien WHERE nhan_vien_id = ? LIMIT 1',
          [nv.id],
        );
        if (ktvRows && ktvRows.length > 0) {
          isKtv = true;
          const ktv = ktvRows[0];
          ktvChuyenMon = ktv.chuyen_mon;

          // Nếu chọn lọc theo phạm vi cá nhân
          if (scope === 'ca_nhan') {
            const cmLower = (ktv.chuyen_mon || '').toLowerCase();
            const isCdha = cmLower.includes('siêu âm') || cmLower.includes('hình ảnh') || cmLower.includes('x-quang') || cmLower.includes('cdha');
            const loaiLinhVuc = isCdha ? 'cdha' : 'xet_nghiem';
            qb.andWhere(
              '(cd.kyThuatVienId = :ktvId OR (cd.kyThuatVienId IS NULL AND dv.loai = :loaiLinhVuc))',
              { ktvId: ktv.id, loaiLinhVuc },
            );
          }
        }
      }
    }

    if (range === 'hom_nay') {
      qb.andWhere('DATE(cd.thoiGianChiDinh) = CURDATE()');
    } else if (range === '7days' || range === 'tuan_nay') {
      qb.andWhere('cd.thoiGianChiDinh >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');
    } else if (range === 'thang_nay') {
      qb.andWhere('MONTH(cd.thoiGianChiDinh) = MONTH(CURDATE()) AND YEAR(cd.thoiGianChiDinh) = YEAR(CURDATE())');
    } else if (tuNgay && denNgay) {
      qb.andWhere('DATE(cd.thoiGianChiDinh) BETWEEN :tuNgay AND :denNgay', { tuNgay, denNgay });
    } else if (tuNgay) {
      qb.andWhere('DATE(cd.thoiGianChiDinh) >= :tuNgay', { tuNgay });
    } else if (denNgay) {
      qb.andWhere('DATE(cd.thoiGianChiDinh) <= :denNgay', { denNgay });
    }

    const items = await qb.getMany();
    const tongChiDinh = items.length;
    const choLayMau = items.filter(i => i.trangThai === TrangThaiChiDinh.CHO_LAY_MAU || i.trangThai === TrangThaiChiDinh.DANG_LAY_MAU).length;
    const dangXuLy = items.filter(i => i.trangThai === TrangThaiChiDinh.DANG_XU_LY).length;
    const coKetQua = items.filter(i => i.trangThai === TrangThaiChiDinh.CO_KET_QUA).length;
    const daHuy = items.filter(i => i.trangThai === TrangThaiChiDinh.HUY).length;
    const tyLeHoanThanhVal = tongChiDinh > 0 ? Math.round((coKetQua / tongChiDinh) * 100) : 0;

    // Top 5 dịch vụ được chỉ định nhiều nhất
    const dichVuMap = new Map<string, { ten: string; loai: string; count: number }>();
    items.forEach((item) => {
      const name = item.dichVu?.tenDichVu || 'Dịch vụ khác';
      const loai = item.dichVu?.loai || 'xet_nghiem';
      const curr = dichVuMap.get(name) || { ten: name, loai, count: 0 };
      curr.count += 1;
      dichVuMap.set(name, curr);
    });

    const topDichVu = Array.from(dichVuMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Phân loại cơ cấu dịch vụ (Xét nghiệm máu vs Chẩn đoán hình ảnh)
    let countXN = 0;
    let countCDHA = 0;
    items.forEach((item) => {
      if (item.dichVu?.loai === 'cdha') countCDHA += 1;
      else countXN += 1;
    });

    const coCauLoai = [
      { name: 'Xét nghiệm máu & Sinh hóa', value: countXN, count: countXN },
      { name: 'Chẩn đoán hình ảnh (CĐHA)', value: countCDHA, count: countCDHA },
    ].filter((c) => c.value > 0);

    // Thống kê theo dòng thời gian (theo từng ngày)
    const timelineMap = new Map<string, { ngay: string; tong: number; hoanThanh: number; dangXuLy: number }>();
    items.forEach((item) => {
      if (item.thoiGianChiDinh) {
        const dStr = String(item.thoiGianChiDinh).substring(0, 10);
        const dayFormatted = dStr.split('-').reverse().slice(0, 2).join('/'); // dd/mm

        const curr = timelineMap.get(dayFormatted) || { ngay: dayFormatted, tong: 0, hoanThanh: 0, dangXuLy: 0 };
        curr.tong += 1;
        if (item.trangThai === TrangThaiChiDinh.CO_KET_QUA) curr.hoanThanh += 1;
        if (item.trangThai === TrangThaiChiDinh.DANG_XU_LY || item.trangThai === TrangThaiChiDinh.CHO_LAY_MAU || item.trangThai === TrangThaiChiDinh.DANG_LAY_MAU) {
          curr.dangXuLy += 1;
        }
        timelineMap.set(dayFormatted, curr);
      }
    });

    const timelineData = Array.from(timelineMap.values()).reverse().slice(-7);

    // Danh sách chỉ định mới nhất
    const danhSachMoiNhat = items.slice(0, 15).map((c) => ({
      id: c.id,
      tenDichVu: c.dichVu?.tenDichVu || 'Dịch vụ cận lâm sàng',
      loai: c.dichVu?.loai,
      trangThai: c.trangThai,
      thoiGianChiDinh: c.thoiGianChiDinh,
      thoiGianLayMau: c.thoiGianLayMau,
      thoiGianCoKetQua: c.thoiGianCoKetQua,
      benhNhan: {
        hoTen: c.benhAnKham?.hoSoBenhAn?.benhNhan?.hoTen || 'Bệnh nhân',
        maBenhNhan: c.benhAnKham?.hoSoBenhAn?.benhNhan?.maBenhNhan || '',
        soDienThoai: c.benhAnKham?.hoSoBenhAn?.benhNhan?.soDienThoai || '',
      },
    }));

    // ── THỐNG KÊ ĐÁNH GIÁ & MỨC ĐỘ HÀI LÒNG CỦA BỆNH NHÂN (CSAT CLS) ──
    const dgQb = this.cdRepo.manager.getRepository(DanhGiaCaKham).createQueryBuilder('dg')
      .leftJoinAndSelect('dg.benhNhan', 'bn')
      .orderBy('dg.taoLuc', 'DESC');

    if (range === 'hom_nay') {
      dgQb.andWhere('DATE(dg.taoLuc) = CURDATE()');
    } else if (range === '7days' || range === 'tuan_nay') {
      dgQb.andWhere('dg.taoLuc >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');
    } else if (range === 'thang_nay') {
      dgQb.andWhere('MONTH(dg.taoLuc) = MONTH(CURDATE()) AND YEAR(dg.taoLuc) = YEAR(CURDATE())');
    } else if (tuNgay && denNgay) {
      dgQb.andWhere('DATE(dg.taoLuc) BETWEEN :tuNgay AND :denNgay', { tuNgay, denNgay });
    } else if (tuNgay) {
      dgQb.andWhere('DATE(dg.taoLuc) >= :tuNgay', { tuNgay });
    } else if (denNgay) {
      dgQb.andWhere('DATE(dg.taoLuc) <= :denNgay', { denNgay });
    }

    const allDanhGia = await dgQb.getMany();
    // Lọc các bản ghi có điểm CLS hoặc dùng toàn bộ đánh giá ca khám
    const danhGiaClsList = allDanhGia.filter((d) => d.diemCls != null && Number(d.diemCls) > 0);
    const effectiveList = danhGiaClsList.length > 0 ? danhGiaClsList : allDanhGia;

    const tongDanhGia = effectiveList.length;
    let diemClsTB = 5.0;
    let tyLeHaiLong = '100%';
    const phanBoSao = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const tieuChiCounts: Record<string, number> = {};

    if (tongDanhGia > 0) {
      let sumScore = 0;
      let countHaiLong = 0;
      effectiveList.forEach((d) => {
        const score = d.diemCls ? Number(d.diemCls) : Math.round(Number(d.diemTrungBinh) || 5);
        sumScore += score;
        if (score >= 4) countHaiLong++;
        if (score >= 1 && score <= 5) {
          phanBoSao[score as 1 | 2 | 3 | 4 | 5] = (phanBoSao[score as 1 | 2 | 3 | 4 | 5] || 0) + 1;
        }
        if (Array.isArray(d.tieuChiHaiLong)) {
          d.tieuChiHaiLong.forEach((tc) => {
            if (typeof tc === 'string' && tc.trim()) {
              tieuChiCounts[tc.trim()] = (tieuChiCounts[tc.trim()] || 0) + 1;
            }
          });
        }
      });
      diemClsTB = Math.round((sumScore / tongDanhGia) * 10) / 10;
      tyLeHaiLong = `${Math.round((countHaiLong / tongDanhGia) * 100)}%`;
    }

    const topTieuChi = Object.entries(tieuChiCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const danhSachNhanXet = effectiveList.slice(0, 15).map((d) => ({
      id: d.id,
      diemCls: d.diemCls || Math.round(Number(d.diemTrungBinh) || 5),
      diemTrungBinh: Number(d.diemTrungBinh) || 5,
      tieuChiHaiLong: d.tieuChiHaiLong || [],
      nhanXet: d.nhanXet,
      anDanh: d.anDanh,
      phanHoiGiamDoc: d.phanHoiGiamDoc,
      taoLuc: d.taoLuc,
      tenBenhNhan: d.anDanh ? 'Bệnh nhân (Ẩn danh)' : d.benhNhan?.hoTen || 'Bệnh nhân',
      maBenhNhan: d.anDanh ? '***' : d.benhNhan?.maBenhNhan || '',
    }));

    return {
      data: {
        isCaNhan: isKtv,
        chuyenMon: ktvChuyenMon,
        tenKtv,
        tongChiDinh,
        choLayMau,
        dangXuLy,
        coKetQua,
        daHoanThanh: coKetQua,
        daHuy,
        tyLeHoanThanh: `${tyLeHoanThanhVal}%`,
        tyLeHoanThanhVal,
        topDichVu,
        coCauLoai: coCauLoai.length > 0 ? coCauLoai : [{ name: 'Chưa có chỉ định', value: 1, count: 0 }],
        timelineData,
        danhSachMoiNhat,
        dsChiDinh: items.slice(0, 50),
        // Thông tin Đánh giá Bệnh nhân
        danhGia: {
          tongDanhGia,
          diemClsTB,
          tyLeHaiLong,
          phanBoSao,
          topTieuChi,
          danhSachNhanXet,
        },
      },
      message: 'OK',
    };
  }
}
