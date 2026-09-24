import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DanhGiaCaKham } from './entities/danh-gia.entity';
import { TaoDanhGiaDto, PhanHoiGiamDocDto } from './dto/danh-gia.dto';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { LuotTiepNhan, TrangThaiTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { BenhAnKham, TrangThaiBenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';

@Injectable()
export class DanhGiaService {
  constructor(
    @InjectRepository(DanhGiaCaKham)
    private readonly danhGiaRepo: Repository<DanhGiaCaKham>,
    @InjectRepository(LichHen)
    private readonly lichHenRepo: Repository<LichHen>,
    @InjectRepository(BenhNhan)
    private readonly benhNhanRepo: Repository<BenhNhan>,
    @InjectRepository(BacSi)
    private readonly bacSiRepo: Repository<BacSi>,
    @InjectRepository(NhanVien)
    private readonly nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(LuotTiepNhan)
    private readonly luotTiepNhanRepo: Repository<LuotTiepNhan>,
    @InjectRepository(BenhAnKham)
    private readonly benhAnRepo: Repository<BenhAnKham>,
  ) {}

  /**
   * Bệnh nhân gửi đánh giá cho 1 ca khám đã hoàn thành
   */
  async taoDanhGia(userId: number, dto: TaoDanhGiaDto) {
    const benhNhan = await this.benhNhanRepo.findOne({ where: { nguoiDungId: userId } });
    if (!benhNhan) {
      throw new BadRequestException('Không tìm thấy thông tin bệnh nhân tương ứng với tài khoản này');
    }

    if (!dto.lichHenId && !dto.luotTiepNhanId) {
      throw new BadRequestException('Cần cung cấp mã lịch hẹn hoặc mã lượt tiếp nhận để đánh giá');
    }

    let bacSiId: number | null = null;
    let targetLichHenId: number | null = null;
    let targetLuotTiepNhanId: number | null = dto.luotTiepNhanId || null;

    let lichHen: LichHen | null = null;
    let luotTN: LuotTiepNhan | null = null;
    let bak: BenhAnKham | null = null;

    // 1. Tìm thông tin từ lịch hẹn nếu có
    if (dto.lichHenId) {
      lichHen = await this.lichHenRepo.findOne({
        where: { id: dto.lichHenId },
        relations: ['bacSi', 'bacSi.nhanVien'],
      });
      if (lichHen) {
        if (lichHen.benhNhanId !== benhNhan.id) {
          throw new ForbiddenException('Bạn chỉ có thể đánh giá ca khám của chính mình');
        }
        targetLichHenId = lichHen.id;
        bacSiId = lichHen.bacSiId;

        // Tìm lượt tiếp nhận và bệnh án liên quan
        luotTN = await this.luotTiepNhanRepo.findOne({ where: { lichHenId: lichHen.id } });
        if (luotTN) {
          targetLuotTiepNhanId = luotTN.id;
          if (!bacSiId && luotTN.bacSiId) bacSiId = luotTN.bacSiId;
          bak = await this.benhAnRepo.findOne({ where: { luotTiepNhanId: luotTN.id } });
        }
      }
    }

    // 2. Tìm thông tin từ lượt tiếp nhận nếu chưa tìm thấy hoặc cần bổ sung
    if (!luotTN && dto.luotTiepNhanId) {
      luotTN = await this.luotTiepNhanRepo.findOne({
        where: { id: dto.luotTiepNhanId },
        relations: ['bacSi', 'bacSi.nhanVien'],
      });
      if (luotTN) {
        if (luotTN.benhNhanId !== benhNhan.id) {
          throw new ForbiddenException('Bạn chỉ có thể đánh giá ca khám của chính mình');
        }
        targetLuotTiepNhanId = luotTN.id;
        if (!bacSiId && luotTN.bacSiId) bacSiId = luotTN.bacSiId;

        if (!lichHen && luotTN.lichHenId) {
          lichHen = await this.lichHenRepo.findOne({
            where: { id: luotTN.lichHenId },
            relations: ['bacSi', 'bacSi.nhanVien'],
          });
          if (lichHen) {
            targetLichHenId = lichHen.id;
            if (!bacSiId) bacSiId = lichHen.bacSiId;
          }
        }

        if (!bak) {
          bak = await this.benhAnRepo.findOne({ where: { luotTiepNhanId: luotTN.id } });
        }
      }
    }

    if (!lichHen && !luotTN) {
      throw new NotFoundException('Không tìm thấy thông tin ca khám cần đánh giá');
    }

    if (bak && !bacSiId) {
      bacSiId = bak.bacSiId;
    }

    // 3. Kiểm tra xem ca khám đã hoàn tất hay chưa
    // Ca khám hoàn thành khi:
    // - Lịch hẹn ở trạng thái hoan_thanh
    // - HOẶC Lượt tiếp nhận ở trạng thái hoan_thanh
    // - HOẶC Phiếu khám (bệnh án) ở trạng thái da_hoan_thanh
    const isCompleted =
      lichHen?.trangThai === 'hoan_thanh' ||
      luotTN?.trangThai === 'hoan_thanh' ||
      bak?.trangThai === TrangThaiBenhAnKham.DA_HOAN_THANH;

    if (!isCompleted) {
      throw new BadRequestException('Chỉ có thể đánh giá ca khám sau khi đã hoàn tất (trạng thái hoàn thành)');
    }

    // Tự động đồng bộ trạng thái hoan_thanh nếu ca khám đã hoàn tất
    if (lichHen && lichHen.trangThai !== 'hoan_thanh') {
      try {
        await this.lichHenRepo.update({ id: lichHen.id }, { trangThai: TrangThaiLichHen.HOAN_THANH });
      } catch (e) {
        console.warn('Lỗi đồng bộ trạng thái lịch hẹn:', e?.message);
      }
    }
    if (luotTN && luotTN.trangThai !== 'hoan_thanh') {
      try {
        await this.luotTiepNhanRepo.update({ id: luotTN.id }, { trangThai: TrangThaiTiepNhan.HOAN_THANH });
      } catch (e) {
        console.warn('Lỗi đồng bộ trạng thái lượt tiếp nhận:', e?.message);
      }
    }

    // 4. Kiểm tra xem đã đánh giá trước đó chưa
    const checkConditions: any[] = [];
    if (targetLichHenId) checkConditions.push({ lichHenId: targetLichHenId });
    if (targetLuotTiepNhanId) checkConditions.push({ luotTiepNhanId: targetLuotTiepNhanId });

    if (checkConditions.length > 0) {
      const existing = await this.danhGiaRepo.findOne({ where: checkConditions });
      if (existing) {
        throw new BadRequestException('Ca khám này đã được gửi đánh giá trước đó');
      }
    }

    if (!bacSiId) {
      throw new BadRequestException('Không xác định được bác sĩ phụ trách ca khám');
    }

    // Tính điểm trung bình
    let diemTrungBinh: number;
    if (dto.diemCls && dto.diemCls > 0) {
      diemTrungBinh = Math.round(((dto.diemBacSi * 2 + dto.diemCls + dto.diemTiepDon) / 4) * 100) / 100;
    } else {
      diemTrungBinh = Math.round(((dto.diemBacSi * 2 + dto.diemTiepDon) / 3) * 100) / 100;
    }

    const danhGia = this.danhGiaRepo.create({
      lichHenId: targetLichHenId,
      luotTiepNhanId: dto.luotTiepNhanId || null,
      benhNhanId: benhNhan.id,
      bacSiId,
      diemBacSi: dto.diemBacSi,
      diemCls: dto.diemCls || null,
      diemTiepDon: dto.diemTiepDon,
      diemTrungBinh,
      tieuChiHaiLong: dto.tieuChiHaiLong || [],
      nhanXet: dto.nhanXet || null,
      anDanh: Boolean(dto.anDanh),
    });

    const saved = await this.danhGiaRepo.save(danhGia);

    return {
      message: 'Cảm ơn bạn đã gửi đánh giá trải nghiệm khám bệnh! Ý kiến của bạn giúp nâng cao chất lượng dịch vụ.',
      data: saved,
    };
  }

  /**
   * Lấy thông tin đánh giá theo lịch hẹn hoặc lượt tiếp nhận
   */
  async layDanhGiaTheoLichHen(id: number, userId?: number) {
    const dg = await this.danhGiaRepo.findOne({
      where: [{ lichHenId: id }, { luotTiepNhanId: id }],
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });

    if (!dg) {
      return { daDanhGia: false, data: null };
    }

    return {
      daDanhGia: true,
      data: {
        id: dg.id,
        lichHenId: dg.lichHenId,
        diemBacSi: dg.diemBacSi,
        diemCls: dg.diemCls,
        diemTiepDon: dg.diemTiepDon,
        diemTrungBinh: Number(dg.diemTrungBinh),
        tieuChiHaiLong: dg.tieuChiHaiLong,
        nhanXet: dg.nhanXet,
        anDanh: dg.anDanh,
        phanHoiGiamDoc: dg.phanHoiGiamDoc,
        taoLuc: dg.taoLuc,
        tenBacSi: dg.bacSi?.nhanVien?.hoTen,
      },
    };
  }

  /**
   * Bác sĩ xem thống kê đánh giá & danh sách nhận xét của chính mình
   */
  async thongKeDanhGiaBacSi(user: any, query: { range?: string; tuNgay?: string; denNgay?: string }) {
    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: user.id } });
    if (!nv) {
      return { message: 'OK', data: { tongDanhGia: 0, diemBacSiTB: 5.0, diemTrungBinhChung: 5.0, tyLeHaiLong: '100%', phanBoSao: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, danhSachNhanXet: [] } };
    }

    const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: nv.id } });
    if (!bs) {
      return { message: 'OK', data: { tongDanhGia: 0, diemBacSiTB: 5.0, diemTrungBinhChung: 5.0, tyLeHaiLong: '100%', phanBoSao: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, danhSachNhanXet: [] } };
    }

    const qb = this.danhGiaRepo.createQueryBuilder('dg')
      .leftJoinAndSelect('dg.benhNhan', 'bn')
      .leftJoinAndSelect('dg.lichHen', 'lh')
      .where('dg.bacSiId = :bacSiId', { bacSiId: bs.id })
      .orderBy('dg.taoLuc', 'DESC');

    const list = await qb.getMany();
    const tongDanhGia = list.length;

    if (tongDanhGia === 0) {
      return {
        message: 'OK',
        data: {
          tongDanhGia: 0,
          diemBacSiTB: 5.0,
          diemTrungBinhChung: 5.0,
          tyLeHaiLong: '100%',
          phanBoSao: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          danhSachNhanXet: [],
        },
      };
    }

    const tongDiemBacSi = list.reduce((sum, item) => sum + Number(item.diemBacSi), 0);
    const tongDiemTB = list.reduce((sum, item) => sum + Number(item.diemTrungBinh), 0);
    const diemBacSiTB = Math.round((tongDiemBacSi / tongDanhGia) * 10) / 10;
    const diemTrungBinhChung = Math.round((tongDiemTB / tongDanhGia) * 10) / 10;

    const soLuotHaiLong = list.filter(item => Number(item.diemBacSi) >= 4).length;
    const tyLeHaiLong = `${Math.round((soLuotHaiLong / tongDanhGia) * 100)}%`;

    const phanBoSao = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach(item => {
      const sao = item.diemBacSi;
      if (phanBoSao[sao] !== undefined) phanBoSao[sao]++;
    });

    const danhSachNhanXet = list.map(item => ({
      id: item.id,
      diemBacSi: item.diemBacSi,
      diemCls: item.diemCls,
      diemTiepDon: item.diemTiepDon,
      diemTrungBinh: Number(item.diemTrungBinh),
      tieuChiHaiLong: item.tieuChiHaiLong || [],
      nhanXet: item.nhanXet,
      anDanh: item.anDanh,
      tenBenhNhan: item.anDanh ? 'Bệnh nhân ẩn danh' : (item.benhNhan?.hoTen || 'Bệnh nhân'),
      ngayHen: item.lichHen?.ngayHen,
      gioHen: item.lichHen?.gioHen,
      taoLuc: item.taoLuc,
      phanHoiGiamDoc: item.phanHoiGiamDoc,
    }));

    return {
      message: 'OK',
      data: {
        tongDanhGia,
        diemBacSiTB,
        diemTrungBinhChung,
        tyLeHaiLong,
        phanBoSao,
        danhSachNhanXet,
      },
    };
  }

  /**
   * Giám đốc xem CSAT toàn viện, bảng xếp hạng Bác sĩ, và cảnh báo phản hồi thấp
   */
  async thongKeDanhGiaGiamDoc(query: { range?: string; tuNgay?: string; denNgay?: string }) {
    const qb = this.danhGiaRepo.createQueryBuilder('dg')
      .leftJoinAndSelect('dg.benhNhan', 'bn')
      .leftJoinAndSelect('dg.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'bsNv')
      .leftJoinAndSelect('dg.lichHen', 'lh')
      .orderBy('dg.taoLuc', 'DESC');

    const list = await qb.getMany();
    const tongDanhGia = list.length;

    if (tongDanhGia === 0) {
      return {
        message: 'OK',
        data: {
          tongDanhGia: 0,
          diemCSATToanVien: 5.0,
          diemBacSiTB: 5.0,
          diemClsTB: 5.0,
          diemTiepDonTB: 5.0,
          tyLeHaiLong: '100%',
          bxhBacSi: [],
          canhBaoDanhGiaThap: [],
          danhSachMoiNhat: [],
        },
      };
    }

    const tongCSAT = list.reduce((sum, item) => sum + Number(item.diemTrungBinh), 0);
    const tongBacSi = list.reduce((sum, item) => sum + Number(item.diemBacSi), 0);
    const listCls = list.filter(item => item.diemCls !== null && item.diemCls !== undefined);
    const tongCls = listCls.reduce((sum, item) => sum + Number(item.diemCls), 0);
    const tongTiepDon = list.reduce((sum, item) => sum + Number(item.diemTiepDon), 0);

    const diemCSATToanVien = Math.round((tongCSAT / tongDanhGia) * 10) / 10;
    const diemBacSiTB = Math.round((tongBacSi / tongDanhGia) * 10) / 10;
    const diemClsTB = listCls.length > 0 ? Math.round((tongCls / listCls.length) * 10) / 10 : 5.0;
    const diemTiepDonTB = Math.round((tongTiepDon / tongDanhGia) * 10) / 10;

    const soHaiLong = list.filter(item => Number(item.diemTrungBinh) >= 4.0).length;
    const tyLeHaiLong = `${Math.round((soHaiLong / tongDanhGia) * 100)}%`;

    // Bảng xếp hạng bác sĩ
    const bsMap: Record<number, { bacSiId: number; tenBacSi: string; chuyenKhoa: string; tongDiem: number; count: number; soHaiLong: number }> = {};
    list.forEach(item => {
      const bId = item.bacSiId;
      if (!bsMap[bId]) {
        bsMap[bId] = {
          bacSiId: bId,
          tenBacSi: item.bacSi?.nhanVien?.hoTen || `Bác sĩ #${bId}`,
          chuyenKhoa: item.bacSi?.chuyenKhoa || 'Đa khoa',
          tongDiem: 0,
          count: 0,
          soHaiLong: 0,
        };
      }
      bsMap[bId].tongDiem += Number(item.diemBacSi);
      bsMap[bId].count += 1;
      if (Number(item.diemBacSi) >= 4) {
        bsMap[bId].soHaiLong += 1;
      }
    });

    const bxhBacSi = Object.values(bsMap)
      .map(b => ({
        bacSiId: b.bacSiId,
        tenBacSi: b.tenBacSi,
        chuyenKhoa: b.chuyenKhoa,
        soLuotDanhGia: b.count,
        diemTB: Math.round((b.tongDiem / b.count) * 10) / 10,
        tyLeHaiLong: `${Math.round((b.soHaiLong / b.count) * 100)}%`,
      }))
      .sort((a, b) => b.diemTB - a.diemTB || b.soLuotDanhGia - a.soLuotDanhGia);

    // Cảnh báo đánh giá thấp (<= 3 sao)
    const canhBaoDanhGiaThap = list
      .filter(item => Number(item.diemTrungBinh) <= 3.0 || item.diemBacSi <= 3)
      .map(item => ({
        id: item.id,
        diemTrungBinh: Number(item.diemTrungBinh),
        diemBacSi: item.diemBacSi,
        diemCls: item.diemCls,
        diemTiepDon: item.diemTiepDon,
        nhanXet: item.nhanXet,
        tieuChiHaiLong: item.tieuChiHaiLong || [],
        tenBenhNhan: item.anDanh ? 'Bệnh nhân ẩn danh' : (item.benhNhan?.hoTen || 'Bệnh nhân'),
        tenBacSi: item.bacSi?.nhanVien?.hoTen || `Bác sĩ #${item.bacSiId}`,
        chuyenKhoa: item.bacSi?.chuyenKhoa || 'Đa khoa',
        taoLuc: item.taoLuc,
        phanHoiGiamDoc: item.phanHoiGiamDoc,
      }));

    const danhSachMoiNhat = list.slice(0, 20).map(item => ({
      id: item.id,
      diemTrungBinh: Number(item.diemTrungBinh),
      diemBacSi: item.diemBacSi,
      diemCls: item.diemCls,
      diemTiepDon: item.diemTiepDon,
      nhanXet: item.nhanXet,
      tieuChiHaiLong: item.tieuChiHaiLong || [],
      tenBenhNhan: item.anDanh ? 'Bệnh nhân ẩn danh' : (item.benhNhan?.hoTen || 'Bệnh nhân'),
      tenBacSi: item.bacSi?.nhanVien?.hoTen || `Bác sĩ #${item.bacSiId}`,
      chuyenKhoa: item.bacSi?.chuyenKhoa || 'Đa khoa',
      taoLuc: item.taoLuc,
      phanHoiGiamDoc: item.phanHoiGiamDoc,
    }));

    return {
      message: 'OK',
      data: {
        tongDanhGia,
        diemCSATToanVien,
        diemBacSiTB,
        diemClsTB,
        diemTiepDonTB,
        tyLeHaiLong,
        bxhBacSi,
        canhBaoDanhGiaThap,
        danhSachMoiNhat,
      },
    };
  }

  /**
   * Giám đốc phản hồi nhận xét đánh giá của bệnh nhân
   */
  async phanHoiDanhGia(id: number, dto: PhanHoiGiamDocDto) {
    const dg = await this.danhGiaRepo.findOne({ where: { id } });
    if (!dg) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    dg.phanHoiGiamDoc = dto.phanHoiGiamDoc;
    await this.danhGiaRepo.save(dg);

    return {
      message: 'Đã lưu phản hồi của Giám Đốc thành công',
      data: dg,
    };
  }
}

