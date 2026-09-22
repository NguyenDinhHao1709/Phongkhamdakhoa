import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  DichVuXetNghiem, ChiDinhCanLamSang, KetQuaXetNghiem,
  TrangThaiChiDinh,
} from './entities/xet-nghiem.entity';
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
  async getThongKeXetNghiem(user: any, query: { range?: string; tuNgay?: string; denNgay?: string }) {
    const { range, tuNgay, denNgay } = query;
    const qb = this.cdRepo.createQueryBuilder('cd')
      .leftJoinAndSelect('cd.dichVu', 'dv')
      .orderBy('cd.thoiGianChiDinh', 'DESC');

    let isKtv = false;
    let ktvChuyenMon: string | null = null;
    let tenKtv: string | null = null;

    if (user?.vai_tro === 'ky_thuat_vien' && user?.id) {
      isKtv = true;
      const nv = await this.cdRepo.manager.getRepository(NhanVien).findOne({ where: { nguoiDungId: user.id } });
      if (nv) {
        tenKtv = nv.hoTen;
        const ktvRows = await this.cdRepo.manager.query(
          'SELECT id, chuyen_mon FROM ky_thuat_vien WHERE nhan_vien_id = ? LIMIT 1',
          [nv.id]
        );
        if (ktvRows && ktvRows.length > 0) {
          const ktv = ktvRows[0];
          ktvChuyenMon = ktv.chuyen_mon;
          const cmLower = (ktv.chuyen_mon || '').toLowerCase();
          const isCdha = cmLower.includes('siêu âm') || cmLower.includes('hình ảnh') || cmLower.includes('x-quang') || cmLower.includes('cdha');
          const loaiLinhVuc = isCdha ? 'cdha' : 'xet_nghiem';

          // Chỉ lấy các chỉ định: do KTV này trực tiếp thực hiện (cd.kyThuatVienId = ktv.id)
          // HOẶC chỉ định thuộc đúng chuyên môn của KTV mà chưa ai nhận (cd.kyThuatVienId IS NULL && dv.loai = loaiLinhVuc)
          // Tuyệt đối không lấy chỉ định của KTV khác!
          qb.andWhere(
            '(cd.kyThuatVienId = :ktvId OR (cd.kyThuatVienId IS NULL AND dv.loai = :loaiLinhVuc))',
            { ktvId: ktv.id, loaiLinhVuc }
          );
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
        isCaNhan: isKtv,
        chuyenMon: ktvChuyenMon,
        tenKtv,
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
