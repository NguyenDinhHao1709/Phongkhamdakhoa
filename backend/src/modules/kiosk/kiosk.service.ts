import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { LuotTiepNhan, TrangThaiTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { LichHen } from '../lich-hen/entities/lich-hen.entity';
import { TiepNhanService } from '../tiep-nhan/tiep-nhan.service';
import { voiKhoaDb } from '../../common/utils/db-sequence.util';
import { cheTen, timHoacTaoBenhNhan } from '../../common/utils/benh-nhan-theo-sdt.util';

export class KioskDangKyMoiDto {
  @IsString() @IsNotEmpty() @MaxLength(100) hoTen: string;
  @Matches(/^0\d{9,10}$/, { message: 'Số điện thoại không hợp lệ' }) soDienThoai: string;
  @Type(() => Number) @IsInt() @Min(1900) @Max(new Date().getFullYear()) namSinh: number;
  @IsOptional() @IsIn(['nam', 'nu', 'khac']) gioiTinh?: string;
  @IsOptional() @IsString() @MaxLength(500) trieuChung?: string;
  @IsOptional() @IsString() @MaxLength(100) chuyenKhoa?: string;
  /** Bệnh nhân tự khai tại kiosk (cấp cứu do nhân viên xác định, không chọn ở kiosk) */
  @IsOptional() @IsString() doiTuongUuTien?: string;
}

const UU_TIEN_TU_KHAI_KIOSK = ['phu_nu_co_thai', 'khuyet_tat_nang', 'nguoi_co_cong'];
const CHUYEN_KHOA_MAC_DINH = 'Nội tổng quát';
// Phân luồng theo triệu chứng tự khai (không khớp thì khám Nội tổng quát)
const PHAN_LUONG: Array<{ tuKhoa: string[]; chuyenKhoa: string }> = [
  { tuKhoa: ['ngực', 'tim', 'huyết áp', 'khó thở', 'hồi hộp'], chuyenKhoa: 'Tim mạch' },
  { tuKhoa: ['bé', 'trẻ', 'nhi', 'mọc răng'], chuyenKhoa: 'Nhi khoa' },
  { tuKhoa: ['vết thương', 'gãy', 'bong gân', 'khâu', 'áp xe'], chuyenKhoa: 'Ngoại khoa' },
];

@Injectable()
export class KioskService {

  constructor(
    @InjectRepository(LuotTiepNhan)
    private readonly luotRepo: Repository<LuotTiepNhan>,
    @InjectRepository(LichHen)
    private readonly lichHenRepo: Repository<LichHen>,
    private readonly tiepNhanService: TiepNhanService,
  ) {}

  private async thongTinPhong(phongKhamId?: number | null) {
    const rows: any[] = phongKhamId
      ? await this.luotRepo.manager.query(`SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ? LIMIT 1`, [phongKhamId])
      : [];
    return {
      id: rows[0]?.id ?? null,
      tenPhong: rows[0]?.ten_phong || 'Phòng khám chuyên khoa',
      viTri: rows[0]?.vi_tri || 'Hỏi quầy tiếp đón',
      chuyenKhoa: rows[0]?.chuyen_khoa || 'Chuyên khoa',
    };
  }

  /**
   * 1. Tra cứu lịch hẹn HÔM NAY tại Kiosk bằng SĐT hoặc Mã lịch hẹn.
   * Màn hình công khai: chỉ trả lịch hôm nay và che họ tên (không dò được lịch sử khám của người khác).
   */
  async traCuuLichHen(search: string) {
    const term = (search || '').trim();
    if (!term) {
      throw new BadRequestException('Vui lòng nhập Số điện thoại hoặc Mã lịch hẹn để tra cứu.');
    }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const list = await this.lichHenRepo
      .createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .leftJoinAndSelect('lh.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('(bn.soDienThoai = :search OR lh.maLichHen = :search)', { search: term })
      .andWhere('lh.ngayHen = :today', { today })
      .andWhere('lh.trangThai NOT IN (:...cancelled)', { cancelled: ['da_huy', 'tu_choi'] })
      .orderBy('lh.gioHen', 'ASC')
      .getMany();

    if (!list.length) {
      return { success: false, message: 'Không tìm thấy lịch hẹn hôm nay phù hợp với thông tin đã nhập.', data: [] };
    }

    const result = await Promise.all(list.map(async (lh) => {
      const luot = await this.tiepNhanService.luotCuaLichHen(lh.id);
      return {
        id: lh.id,
        maLichHen: lh.maLichHen,
        ngayHen: lh.ngayHen,
        gioHen: lh.gioHen,
        trangThai: lh.trangThai,
        isToday: true,
        daCheckIn: !!luot,
        maSoThuTu: luot?.maSoThuTu ?? null,
        benhNhan: { hoTen: cheTen(lh.benhNhan?.hoTen) },
        bacSi: {
          id: lh.bacSi?.id,
          hoTen: lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ chuyên khoa',
          chuyenKhoa: lh.bacSi?.chuyenKhoa,
        },
        phongKham: await this.thongTinPhong(lh.phongKhamId),
      };
    }));
    return { success: true, message: `Tìm thấy ${result.length} lịch hẹn hôm nay.`, data: result };
  }

  /** Vé số thứ tự in ra cho bệnh nhân */
  private async taoVe(luot: LuotTiepNhan, thongTin: {
    hoTen: string; soDienThoai: string; bacSi?: string; loai: string; qrCode: string; trieuChung?: string;
  }) {
    const phong = await this.thongTinPhong(luot.phongKhamId);
    return {
      maSoThuTu: luot.maSoThuTu,
      hoTen: thongTin.hoTen,
      soDienThoai: thongTin.soDienThoai,
      tenPhong: phong.tenPhong,
      viTri: phong.viTri,
      chuyenKhoa: luot.chuyenKhoa || phong.chuyenKhoa,
      ...(thongTin.trieuChung !== undefined ? { trieuChung: thongTin.trieuChung } : {}),
      bacSi: thongTin.bacSi || 'Bác sĩ phụ trách',
      gioDangKy: new Date(luot.thoiGianDen).toLocaleTimeString('vi-VN'),
      loai: thongTin.loai,
      soNguoiDangDoi: await this.tiepNhanService.soNguoiPhiaTruoc(luot.id, luot.phongKhamId),
      qrCode: thongTin.qrCode,
    };
  }

  /**
   * 2. Bệnh nhân bấm Check-in tại Kiosk -> Sinh STT thật & đưa vào hàng đợi (cùng điều kiện với check-in tại quầy)
   */
  async checkInLichHen(lichHenId: number, search: string) {
    return this.tiepNhanService.voiKhoaLichHen(lichHenId, async () => {
      const lh = await this.lichHenRepo.findOne({
        where: { id: lichHenId },
        relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
      });

      // Kiosk public: bắt buộc khớp SĐT / mã lịch hẹn đã tra cứu để không dò được bằng ID
      const term = (search || '').trim();
      if (!lh || !term || (lh.maLichHen !== term && lh.benhNhan?.soDienThoai !== term)) {
        throw new NotFoundException('Không tìm thấy thông tin lịch hẹn.');
      }
      const thongTinVe = (luot: LuotTiepNhan) => ({
        hoTen: lh.benhNhan?.hoTen,
        soDienThoai: lh.benhNhan?.soDienThoai,
        bacSi: lh.bacSi?.nhanVien?.hoTen,
        loai: 'Đã đặt lịch hẹn trước',
        qrCode: `CHECKIN:${luot.maSoThuTu}:${lh.maLichHen}`,
      });

      // Đã lấy số (lượt còn hiệu lực) thì in lại vé cũ; lượt đã hủy thì được lấy số mới
      const existingLuot = await this.tiepNhanService.luotCuaLichHen(lh.id);
      if (existingLuot) {
        return {
          success: true,
          message: 'Bệnh nhân đã lấy số trước đó. Đang in lại vé STT.',
          ticket: await this.taoVe(existingLuot, thongTinVe(existingLuot)),
        };
      }
      // Đóng đủ phí khám (trừ cọc) tại quầy thu ngân rồi mới vào hàng đợi bác sĩ
      const { luot: savedLuot } = await this.tiepNhanService.taoLuotTuLichHen(lh, {
        ghiChu: `Check-in tự động Kiosk lúc ${new Date().toLocaleTimeString('vi-VN')}. Lịch hẹn: ${lh.maLichHen}`,
      });
      await this.lichHenRepo.update(lh.id, {
        ghiChu: `${lh.ghiChu || ''} [ĐÃ_CHECKIN_KIOSK: ${savedLuot.maSoThuTu}]`.trim(),
      });

      return {
        success: true,
        message: 'Check-in thành công! Chúc bạn buổi khám thuận lợi.',
        ticket: await this.taoVe(savedLuot, thongTinVe(savedLuot)),
      };
    });
  }

  /**
   * 3. Đăng ký mới tại Kiosk: phân luồng chuyên khoa theo triệu chứng / tuổi, xếp cho bác sĩ đang trực ít người chờ nhất
   */
  async dangKyMoiTaiKiosk(dto: KioskDangKyMoiDto) {
    const hoTen = dto.hoTen.trim();
    const soDienThoai = dto.soDienThoai.trim();
    const tuoi = new Date().getFullYear() - dto.namSinh;

    const tc = `${dto.trieuChung || ''} ${dto.chuyenKhoa || ''}`.toLowerCase();
    const chuyenKhoa = dto.chuyenKhoa?.trim()
      || PHAN_LUONG.find((r) => r.tuKhoa.some((k) => tc.includes(k)))?.chuyenKhoa
      || (tuoi < 16 ? 'Nhi khoa' : CHUYEN_KHOA_MAC_DINH);
    const bacSi = await this.tiepNhanService.chonBacSiTheoChuyenKhoa(chuyenKhoa, true)
      ?? (chuyenKhoa !== CHUYEN_KHOA_MAC_DINH ? await this.tiepNhanService.chonBacSiTheoChuyenKhoa(CHUYEN_KHOA_MAC_DINH, true) : null);
    if (!bacSi) {
      throw new BadRequestException('Hiện chưa có bác sĩ đang trực phù hợp. Vui lòng liên hệ quầy tiếp đón.');
    }
    const phongKhamId = await this.tiepNhanService.phongCuaBacSi(bacSi);

    return voiKhoaDb(this.luotRepo.manager.connection, `bn_phone:${soDienThoai}`, async () => {
      // SĐT có thể dùng chung trong gia đình: chỉ dùng lại hồ sơ khi trùng cả họ tên
      const benhNhan = await timHoacTaoBenhNhan(this.luotRepo.manager, {
        hoTen,
        soDienThoai,
        ngaySinh: `${dto.namSinh}-01-01` as any,
        gioiTinh: dto.gioiTinh === 'nu' ? 'nu' : 'nam',
        diaChi: 'Đăng ký tại Kiosk phòng khám',
      });
      const thongTinVe = (luot: LuotTiepNhan) => ({
        hoTen: benhNhan.hoTen,
        soDienThoai: benhNhan.soDienThoai,
        trieuChung: dto.trieuChung || 'Khám sức khỏe tổng quát',
        bacSi: bacSi.nhanVien?.hoTen,
        loai: 'Tiếp nhận trực tiếp tại quầy Kiosk',
        qrCode: `KIOSK_WALKIN:${luot.maSoThuTu}:${benhNhan.id}`,
      });

      // Chống bấm đúp / lấy số trùng: đã có lượt còn hoạt động hôm nay cùng chuyên khoa thì in lại phiếu (như ở quầy)
      const daCo = await this.luotRepo
        .createQueryBuilder('ltn')
        .where('ltn.benhNhanId = :bnId', { bnId: benhNhan.id })
        .andWhere('ltn.chuyenKhoa = :ck', { ck: chuyenKhoa })
        .andWhere('ltn.trangThai IN (:...st)', {
          st: [TrangThaiTiepNhan.CHO_KHAM, TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.DANG_CLS, TrangThaiTiepNhan.DA_CO_KQ_CLS],
        })
        .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
        .orderBy('ltn.id', 'DESC')
        .getOne();
      if (daCo) {
        return {
          success: true,
          message: 'Bệnh nhân đã có lượt khám hôm nay ở chuyên khoa này. Đang in lại phiếu tiếp nhận.',
          ticket: await this.taoVe(daCo, thongTinVe(daCo)),
        };
      }

      const savedLuot = await this.luotRepo.save(this.luotRepo.create({
        maSoThuTu: await this.tiepNhanService.generateNextSoThuTu('B'),
        benhNhanId: benhNhan.id,
        phongKhamId,
        bacSiId: bacSi.id,
        chuyenKhoa,
        doiTuongUuTien: UU_TIEN_TU_KHAI_KIOSK.includes(dto.doiTuongUuTien) ? dto.doiTuongUuTien : null,
        thoiGianDen: new Date(),
        trangThai: TrangThaiTiepNhan.CHO_KHAM,
        ghiChu: `[Kiosk tự động] Đăng ký mới. Triệu chứng: ${dto.trieuChung || 'Khám lâm sàng'}`,
      }));
      // Đóng tạm ứng tại quầy thu ngân rồi mới vào hàng đợi bác sĩ
      await this.tiepNhanService.lapPhieuTamUng(savedLuot, benhNhan.hoTen);

      return {
        success: true,
        message: 'Đăng ký thành công! Đang in phiếu số thứ tự tiếp nhận.',
        ticket: await this.taoVe(savedLuot, thongTinVe(savedLuot)),
      };
    });
  }

  /**
   * 4. Bảng trạng thái phòng khám Live cho Kiosk
   */
  async getPhongKhamLive() {
    const rooms = await this.luotRepo.manager.query(
      `SELECT pk.id, pk.ten_phong as tenPhong, pk.vi_tri as viTri, pk.chuyen_khoa as chuyenKhoa, pk.trang_thai as trangThai
       FROM phong_kham pk
       WHERE pk.trang_thai = 'hoat_dong'
       ORDER BY pk.id ASC`,
    );

    // Đếm số người đang chờ ở từng phòng hôm nay
    const queueCounts = await this.luotRepo.manager.query(
      `SELECT phong_kham_id as phongKhamId, COUNT(*) as count
       FROM luot_tiep_nhan
       WHERE trang_thai IN ('cho_kham', 'dang_kham') AND DATE(thoi_gian_den) = CURDATE()
       GROUP BY phong_kham_id`,
    );

    const countMap = new Map<number, number>();
    queueCounts.forEach((r: any) => {
      countMap.set(Number(r.phongKhamId), Number(r.count));
    });

    const result = rooms.map((room: any) => ({
      id: room.id,
      tenPhong: room.tenPhong,
      viTri: room.viTri,
      chuyenKhoa: room.chuyenKhoa,
      soNguoiDangCho: countMap.get(room.id) || 0,
    }));

    return {
      success: true,
      data: result,
    };
  }
}
