import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { LuotTiepNhan, SinhHieu, TrangThaiTiepNhan } from './entities/tiep-nhan.entity';
import { LichSuGoiKham } from './entities/lich-su-goi-kham.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';
import {
  IsOptional, IsInt, IsPositive, IsString, IsDateString,
  IsNumber, Min, Max, IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';
import { OnModuleInit } from '@nestjs/common';
import * as https from 'https';
import { Aes256Transformer } from '../../common/transformers/aes-256.transformer';

// DTO nội tuyến cho module này
export class TaoTiepNhanDto {
  @ApiProperty() @IsInt() @IsPositive() benhNhanId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() lichHenId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() phongKhamId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bacSiId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lyDoKham?: string;
}

export class TiepNhanTaiQuayDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() benhNhanId?: number;
  @ApiProperty() @IsString() hoTen: string;
  @ApiProperty() @IsString() soDienThoai: string;
  @ApiProperty() @IsString() chuyenKhoa: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() bacSiId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() phongKhamId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lyDoTaoLuot?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() loaiLuot?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() luotGocId?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() choPhepTrung?: boolean;
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
  @ApiProperty({ enum: ['cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls', 'hoan_thanh', 'da_huy'] })
  @IsEnum(['cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls', 'hoan_thanh', 'da_huy'])
  trangThai: string;
}

import { DanhGiaCaKham } from '../danh-gia/entities/danh-gia.entity';
import { QueueGateway } from './queue.gateway';

@Injectable()
export class TiepNhanService implements OnModuleInit {
  private latestCallEvent: any = null;
  private recentCalls: any[] = [];

  constructor(
    @InjectRepository(LuotTiepNhan) private luotRepo: Repository<LuotTiepNhan>,
    @InjectRepository(SinhHieu) private sinhHieuRepo: Repository<SinhHieu>,
    @InjectRepository(LichHen) private lichHenRepo: Repository<LichHen>,
    @InjectRepository(BacSi) private bacSiRepo: Repository<BacSi>,
    @InjectRepository(BenhNhan) private benhNhanRepo: Repository<BenhNhan>,
    @InjectRepository(LichLamViec) private lichLamViecRepo: Repository<LichLamViec>,
    @InjectRepository(DanhGiaCaKham) private danhGiaRepo: Repository<DanhGiaCaKham>,
    @InjectRepository(LichSuGoiKham) private lichSuGoiRepo: Repository<LichSuGoiKham>,
    private readonly queueGateway: QueueGateway,
  ) {}

  onModuleInit() {
    this.syncLichHenDenGio().catch((err) =>
      console.error('[TiepNhanScheduler] Không đồng bộ được lịch hẹn:', err.message)
    );
    setInterval(() => {
      this.syncLichHenDenGio().catch((err) =>
        console.error('[TiepNhanScheduler] Không đồng bộ được lịch hẹn:', err.message)
      );
    }, 30 * 1000);
  }

  // ─── HÀNG ĐỢI PHÒNG KHÁM ─────────────────────────────────────
  async hangDoi(phongKhamId?: number, currentUser?: any) {
    await this.syncLichHenDenGio();
    const qb = this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .leftJoinAndSelect('ltn.sinhHieu', 'sh')
      .where('ltn.trangThai IN (:...tt)', { tt: ['cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls'] })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
      .orderBy('ltn.thoiGianDen', 'ASC');

    if (phongKhamId) qb.andWhere('ltn.phongKhamId = :phongKhamId', { phongKhamId });
    if (currentUser?.vai_tro === 'bac_si') {
      const bacSi = await this.bacSiRepo.findOne({
        where: { nhanVien: { nguoiDungId: currentUser.id || currentUser.userId } },
      });
      if (!bacSi) return { data: [], message: 'Không tìm thấy hồ sơ bác sĩ đang đăng nhập' };
      qb.andWhere('ltn.bac_si_id = :doctorId', { doctorId: bacSi.id });
    }

    const items = await qb.getMany();
    return { data: items, message: 'Lấy hàng đợi thành công' };
  }

  // ─── THÔNG TIN PHIẾU KHÁM & TIẾN TRÌNH CHO BỆNH NHÂN ────────────
  async getPhieuKhamBenhNhan(currentUser: any) {
    await this.syncLichHenDenGio();

    let benhNhan = null;
    const userId = currentUser?.id || currentUser?.userId;
    if (currentUser?.benhNhanId) {
      benhNhan = await this.benhNhanRepo.findOne({ where: { id: currentUser.benhNhanId } });
    }
    if (!benhNhan && userId) {
      benhNhan = await this.benhNhanRepo.findOne({ where: { nguoiDungId: userId } });
    }

    if (!benhNhan) {
      return {
        data: null,
        message: 'Không tìm thấy hồ sơ bệnh nhân tương ứng',
      };
    }

    // Tìm lượt tiếp nhận hôm nay
    const luot = await this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('ltn.benhNhanId = :bnId', { bnId: benhNhan.id })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
      .andWhere('ltn.trangThai != :daHuy', { daHuy: TrangThaiTiepNhan.DA_HUY })
      .orderBy('ltn.id', 'DESC')
      .getOne();

    if (!luot) {
      return {
        data: null,
        message: 'Chưa có phiếu khám trong ngày',
      };
    }

    const phongKhamId = luot.phongKhamId || 101;
    const allWaitingInRoom = await this.luotRepo.createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .andWhere('ltn.phongKhamId = :phongKhamId', { phongKhamId })
      .andWhere('ltn.trangThai IN (:...tt)', { tt: [TrangThaiTiepNhan.CHO_KHAM, TrangThaiTiepNhan.DANG_KHAM] })
      .orderBy('ltn.id', 'ASC')
      .getMany();

    const currentServing = allWaitingInRoom.find((l) => l.trangThai === TrangThaiTiepNhan.DANG_KHAM);
    const waitingBeforeMe = allWaitingInRoom.filter(
      (l) => l.trangThai === TrangThaiTiepNhan.CHO_KHAM && l.id < luot.id
    );

    // ── Kiểm tra các chỉ định Cận lâm sàng & Xét nghiệm thực tế trong lần khám này ──
    const bakRows: any[] = await this.luotRepo.manager.query(
      `SELECT bak.id, bak.trang_thai as trangThai, bak.chan_doan_xac_dinh as chanDoanXacDinh
       FROM benh_an_kham bak
       WHERE bak.luot_tiep_nhan_id = ?
       ORDER BY bak.id DESC LIMIT 1`,
      [luot.id],
    );

    const aesTransformer = new Aes256Transformer();
    if (bakRows && bakRows.length > 0 && bakRows[0].chanDoanXacDinh) {
      bakRows[0].chanDoanXacDinh = aesTransformer.from(bakRows[0].chanDoanXacDinh);
    }

    let dsChiDinh: any[] = [];
    let hasCls = false;
    let donThuoc: any = null;
    let hoaDon: any = null;
    let isCompleted = luot.trangThai === TrangThaiTiepNhan.HOAN_THANH;
    let isDangKham = luot.trangThai === TrangThaiTiepNhan.DANG_KHAM;
    let isDangCls = luot.trangThai === TrangThaiTiepNhan.DANG_CLS;
    let isDaCoKqCls = luot.trangThai === TrangThaiTiepNhan.DA_CO_KQ_CLS;

    if (bakRows && bakRows.length > 0) {
      const benhAnKhamId = bakRows[0].id;
      dsChiDinh = await this.luotRepo.manager.query(
        `SELECT cd.id, cd.trang_thai as trangThai, cd.thoi_gian_chi_dinh as thoiGianChiDinh,
                cd.ghi_chu_chi_dinh as ghiChuChiDinh,
                dv.id as dichVuId, dv.ma_dich_vu as maDichVu, dv.ten_dich_vu as tenDichVu, dv.loai, dv.gia,
                dv.cau_hinh_ket_qua as cauHinhKetQua, dv.gia_tri_binh_thuong as giaTriBinhThuong, dv.don_vi_ket_qua as donViKetQua,
                kq.id as ketQuaId, kq.gia_tri as giaTri, kq.don_vi as donVi, kq.nhan_xet as nhanXet, kq.thoi_gian_nhap as thoiGianNhap,
                kq.ket_qua_chi_tiet as ketQuaChiTiet, kq.file_dinh_kem as fileDinhKem, kq.da_gui_bac_si as daGuiBacSi
         FROM chi_dinh_can_lam_sang cd
         LEFT JOIN dich_vu_xet_nghiem dv ON cd.dich_vu_xet_nghiem_id = dv.id
         LEFT JOIN ket_qua_xet_nghiem kq ON kq.chi_dinh_id = cd.id
         WHERE cd.benh_an_kham_id = ? AND cd.trang_thai != 'huy'
         ORDER BY cd.thoi_gian_chi_dinh ASC`,
        [benhAnKhamId],
      );

      // Tra cứu Đơn thuốc
      const dtRows: any[] = await this.luotRepo.manager.query(
        `SELECT dt.id, dt.ma_don_thuoc as maDonThuoc, dt.trang_thai as trangThai, dt.ghi_chu as ghiChu, dt.ngay_ke as ngayKe
         FROM don_thuoc dt
         WHERE dt.benh_an_kham_id = ?
         ORDER BY dt.id DESC LIMIT 1`,
        [benhAnKhamId],
      );

      if (dtRows && dtRows.length > 0) {
        const ctRows: any[] = await this.luotRepo.manager.query(
          `SELECT ct.id, ct.so_luong as soLuong, ct.lieu_dung as lieuDung, ct.so_ngay_dung as soNgayDung,
                  t.ten_thuoc as tenThuoc, t.don_vi_tinh as donViTinh, t.gia_ban as giaBan
           FROM don_thuoc_chi_tiet ct
           LEFT JOIN thuoc t ON ct.thuoc_id = t.id
           WHERE ct.don_thuoc_id = ?`,
          [dtRows[0].id],
        );
        donThuoc = {
          ...dtRows[0],
          chiTiet: ctRows || [],
          soLuongMon: ctRows?.length || 0,
        };
      }

      if (dsChiDinh.length > 0) {
        hasCls = true;
        const allCompleted = dsChiDinh.every((cd) => cd.trangThai === 'co_ket_qua');
        if (allCompleted) {
          isDaCoKqCls = true;
          isDangCls = false;
        } else {
          isDangCls = true;
          isDaCoKqCls = false;
        }

        // Tự động đồng bộ trạng thái luot nếu đang bị lệch trên CSDL
        if (!isCompleted && (luot.trangThai === TrangThaiTiepNhan.DANG_KHAM || (isDaCoKqCls && luot.trangThai !== TrangThaiTiepNhan.DA_CO_KQ_CLS))) {
          const newStatus = isDaCoKqCls ? TrangThaiTiepNhan.DA_CO_KQ_CLS : TrangThaiTiepNhan.DANG_CLS;
          await this.luotRepo.update({ id: luot.id }, { trangThai: newStatus });
          luot.trangThai = newStatus;
        }
      } else {
        hasCls = false;
        if (!isCompleted && (luot.trangThai === TrangThaiTiepNhan.DANG_CLS || luot.trangThai === TrangThaiTiepNhan.DA_CO_KQ_CLS)) {
          await this.luotRepo.update({ id: luot.id }, { trangThai: TrangThaiTiepNhan.DANG_KHAM });
          luot.trangThai = TrangThaiTiepNhan.DANG_KHAM;
          isDangKham = true;
          isDangCls = false;
          isDaCoKqCls = false;
        }
      }
    }

    // Tra cứu Hóa đơn viện phí
    const hdRows: any[] = await this.luotRepo.manager.query(
      `SELECT hd.id, hd.ma_hoa_don as maHoaDon, hd.tong_tien as tongTien,
              hd.so_tien_giam as soTienGiam, hd.thuc_thu as thucThu,
              hd.trang_thai as trangThai, hd.phuong_thuc_thanh_toan as phuongThucThanhToan,
              hd.ngay_thanh_toan as ngayThanhToan, hd.ghi_chu as ghiChu
       FROM hoa_don hd
       WHERE hd.luot_tiep_nhan_id = ?
       ORDER BY hd.id DESC LIMIT 1`,
      [luot.id],
    );
    if (hdRows && hdRows.length > 0) {
      const ctRows: any[] = await this.luotRepo.manager.query(
        `SELECT ct.id, ct.loai_phi as loaiPhi, ct.mo_ta as moTa, ct.so_luong as soLuong,
                ct.don_gia as donGia, ct.thanh_tien as thanhTien
         FROM hoa_don_chi_tiet ct
         WHERE ct.hoa_don_id = ?
         ORDER BY ct.id ASC`,
        [hdRows[0].id],
      );
      hoaDon = {
        ...hdRows[0],
        tongTien: Number(hdRows[0].tongTien),
        soTienGiam: Number(hdRows[0].soTienGiam),
        thucThu: Number(hdRows[0].thucThu),
        chiTiet: (ctRows || []).map((c) => ({
          ...c,
          soLuong: Number(c.soLuong),
          donGia: Number(c.donGia),
          thanhTien: Number(c.thanhTien),
        })),
      };
    }

    const soDangGoi = currentServing?.maSoThuTu || (allWaitingInRoom.length > 0 ? allWaitingInRoom[0].maSoThuTu : '-');
    const soNguoiPhiaTruoc = (isDangKham || isCompleted || isDangCls || isDaCoKqCls) ? 0 : waitingBeforeMe.length;
    const uocTinhPhut = isCompleted ? 0 : Math.max(2, soNguoiPhiaTruoc * 6);

    const tenPhongKham = phongKhamId === 101 ? 'Phòng 101 - Khám Nội Tổng Quát' : `Phòng ${phongKhamId} - Khám Chuyên Khoa`;
    const tenBacSi = luot.bacSi?.nhanVien?.hoTen || 'BS. CKI Trần Văn Nam';

    const isHoaDonDone = !hoaDon || hoaDon.trangThai === 'da_thanh_toan' || Number(hoaDon.thucThu) === 0;
    const isDonThuocDone = !donThuoc || donThuoc.trangThai === 'da_cap_phat' || (donThuoc.chiTiet && donThuoc.chiTiet.length === 0) || donThuoc.soLuongMon === 0;
    const isAllFullyCompleted = isCompleted && isHoaDonDone && isDonThuocDone;

    if (isAllFullyCompleted) {
      return {
        data: {
          isAllCompleted: true,
          ticket: null,
          completedVisit: {
            lichHenId: luot.lichHenId,
            luotTiepNhanId: luot.id,
            soThuTu: luot.maSoThuTu,
            maYTe: benhNhan.maBenhNhan,
            hoTen: benhNhan.hoTen,
            phongKham: tenPhongKham,
            bacSi: tenBacSi,
            chanDoanXacDinh: bakRows && bakRows.length > 0 ? bakRows[0].chanDoanXacDinh : null,
            thoiGianDen: luot.thoiGianDen,
            thoiGianHoanThanh: new Date(),
            hoaDon,
            donThuoc,
          },
        },
        message: 'Lượt khám hôm nay đã hoàn tất toàn bộ các bước quy trình',
      };
    }

    return {
      data: {
        ticket: {
          lichHenId: luot.lichHenId,
          luotTiepNhanId: luot.id,
          soThuTu: luot.maSoThuTu,
          trangThai: luot.trangThai,
          maYTe: benhNhan.maBenhNhan,
          hoTen: benhNhan.hoTen,
          thoiGianLaySo: new Date(luot.thoiGianDen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          phongKham: tenPhongKham,
          bacSi: tenBacSi,
          dsChiDinh,
          hasCls,
          donThuoc,
          hoaDon,
          chanDoanXacDinh: bakRows && bakRows.length > 0 ? bakRows[0].chanDoanXacDinh : null,
        },
        queue: {
          soDangGoi,
          soNguoiPhiaTruoc,
          uocTinhPhut,
          phongKham: tenPhongKham,
        },
        progress: [
          {
            step: 1,
            title: '1. Đăng ký & Tiếp nhận',
            desc: `Đã tiếp nhận và cấp số thứ tự vào phòng khám chuyên khoa (${new Date(luot.thoiGianDen).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}).`,
            status: 'COMPLETED',
            statusLabel: 'Đã hoàn thành',
          },
          {
            step: 2,
            title: '2. Khám lâm sàng ban đầu',
            desc: isCompleted
              ? `Bác sĩ đã hoàn tất khám lâm sàng và chẩn đoán bệnh án tại ${tenPhongKham}.`
              : (hasCls || isDangCls || isDaCoKqCls)
              ? `Bác sĩ đã hoàn tất khám lâm sàng ban đầu và chỉ định ${dsChiDinh.length} cận lâm sàng.`
              : isDangKham
              ? `Đang trong phòng khám ${tenPhongKham} với bác sĩ.`
              : soNguoiPhiaTruoc === 0
              ? `Đến lượt bạn! Bác sĩ đang mời số ${luot.maSoThuTu} vào ${tenPhongKham}.`
              : `Bác sĩ đang khám bệnh nhân số ${soDangGoi}. Bạn là số ${luot.maSoThuTu} (còn ${soNguoiPhiaTruoc} người phía trước).`,
            status: isCompleted || hasCls || isDangCls || isDaCoKqCls ? 'COMPLETED' : isDangKham ? 'IN_PROGRESS' : 'WAITING',
            statusLabel: isCompleted || hasCls || isDangCls || isDaCoKqCls ? 'Đã hoàn thành' : isDangKham ? 'Đang khám trong phòng' : 'Đang chờ gọi tên',
          },
          {
            step: 3,
            title: '3. Thực hiện Cận lâm sàng (Nếu có)',
            desc: isCompleted
              ? 'Đã hoàn tất các chỉ định cận lâm sàng (hoặc không chỉ định thêm).'
              : isDaCoKqCls
              ? `Đã có đầy đủ kết quả ${dsChiDinh.length} xét nghiệm/CĐHA gửi về phòng bác sĩ.`
              : isDangCls
              ? `Đang thực hiện ${dsChiDinh.length} xét nghiệm / CĐHA theo chỉ định của bác sĩ. Vui lòng làm theo chỉ dẫn của nhân viên y tế.`
              : 'Hệ thống sẽ tự động đề xuất lộ trình phòng khám vắng nhất để bạn không phải xếp hàng lâu.',
            status: isCompleted || isDaCoKqCls ? 'LAB_COMPLETED' : isDangCls ? 'WAITING_LAB' : 'PENDING',
            statusLabel: isCompleted || isDaCoKqCls ? 'Đã hoàn thành' : isDangCls ? 'Đang thực hiện' : 'Theo chỉ định của bác sĩ',
            dsChiDinh,
          },
          {
            step: 4,
            title: '4. Kết luận & Nhận đơn thuốc',
            desc: isCompleted
              ? 'Bác sĩ đã kết luận bệnh án, tư vấn phác đồ và cấp đơn thuốc điện tử. Lượt khám đã hoàn tất.'
              : isDaCoKqCls
              ? 'Bác sĩ đang tiếp nhận kết quả cận lâm sàng để kết luận bệnh án và kê đơn thuốc.'
              : 'Bác sĩ đưa ra kết luận bệnh án, tư vấn phác đồ và cấp đơn thuốc điện tử.',
            status: isCompleted ? 'COMPLETED' : isDaCoKqCls ? 'WAITING_DOCTOR' : 'PENDING',
            statusLabel: isCompleted ? 'Đã hoàn thành' : isDaCoKqCls ? 'Bác sĩ đang xem KQ' : 'Chưa bắt đầu',
            donThuoc,
            hoaDon,
          },
        ],
      },
      message: 'Lấy tiến trình phiếu khám thành công',
    };
  }

  private async syncLichHenDenGio() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    const appointments = await this.lichHenRepo.find({
      where: {
        ngayHen: today,
        trangThai: TrangThaiLichHen.DA_XAC_NHAN,
        hinhThuc: 'truc_tiep',
      },
    });

    for (const appointment of appointments) {
      if (appointment.hinhThuc === 'truc_tuyen') continue;
      if (appointment.gioHen > currentTime) continue;
      const existing = await this.luotRepo.findOne({ where: { lichHenId: appointment.id } });
      if (existing) continue;
      const totalCount = await this.luotRepo.count();
      const luot = this.luotRepo.create({
        benhNhanId: appointment.benhNhanId,
        lichHenId: appointment.id,
        phongKhamId: appointment.phongKhamId,
        bacSiId: appointment.bacSiId,
        maSoThuTu: MaGeneratorService.generateSoThuTu(totalCount + 1),
        thoiGianDen: new Date(),
        trangThai: TrangThaiTiepNhan.CHO_KHAM,
        ghiChu: 'Tự động đưa vào hàng đợi khi đến giờ hẹn',
      });
      await this.luotRepo.save(luot);
    }
  }

  // ─── TẠO LƯỢT TIẾP NHẬN ──────────────────────────────────────
  async createTaiQuay(dto: TiepNhanTaiQuayDto, tiepTanId: number) {
    const specialty = dto.chuyenKhoa.trim().toLowerCase();
    if (!specialty) {
      throw new BadRequestException({ code: 'THIEU_CHUYEN_KHOA', message: 'Phải chọn chuyên khoa trước khi tiếp nhận.' });
    }

    const allDoctors = await this.bacSiRepo.find({ relations: ['nhanVien'] });
    const doctors = allDoctors.filter((doctor) => {
      const docSpec = doctor.chuyenKhoa?.trim().toLowerCase() || '';
      return docSpec === specialty || docSpec.includes(specialty) || specialty.includes(docSpec);
    });

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    let selectedDoctor = dto.bacSiId
      ? allDoctors.find((doctor) => doctor.id === dto.bacSiId)
      : null;

    if (!selectedDoctor) {
      if (!doctors.length) {
        throw new BadRequestException({ code: 'KHONG_CO_BAC_SI', message: `Hiện chưa có bác sĩ thuộc chuyên khoa ${dto.chuyenKhoa}.` });
      }
      const shifts = await this.lichLamViecRepo.find({
        where: { ngayLam: today },
        relations: ['caLamViec'],
      });
      const onDuty = doctors.filter((doctor) => shifts.some((shift) =>
        shift.nhanVienId === doctor.nhanVienId &&
        shift.caLamViec.gioBatDau <= currentTime &&
        shift.caLamViec.gioKetThuc > currentTime
      ));
      const candidates = onDuty.length ? onDuty : doctors;
      selectedDoctor = await this.chonBacSiItTaiNhat(candidates);
    }

    if (!selectedDoctor) {
      throw new BadRequestException({ code: 'BAC_SI_KHONG_HOP_LE', message: 'Không tìm thấy bác sĩ phù hợp.' });
    }

    let patient: BenhNhan | null = null;
    if (dto.benhNhanId) {
      patient = await this.benhNhanRepo.findOne({ where: { id: dto.benhNhanId } });
    }
    if (!patient && dto.soDienThoai) {
      patient = await this.benhNhanRepo.findOne({ where: { soDienThoai: dto.soDienThoai.trim() } });
    }
    if (!patient) {
      const patientCount = await this.benhNhanRepo.count();
      patient = await this.benhNhanRepo.save(this.benhNhanRepo.create({
        maBenhNhan: MaGeneratorService.generateMaBenhNhan(patientCount + 1),
        hoTen: dto.hoTen.trim(),
        soDienThoai: dto.soDienThoai.trim(),
      }));
    }

    const activeStatuses = [
      TrangThaiTiepNhan.CHO_KHAM,
      TrangThaiTiepNhan.DANG_KHAM,
      TrangThaiTiepNhan.DANG_CLS,
      TrangThaiTiepNhan.DA_CO_KQ_CLS,
    ];
    const specialtyName = dto.chuyenKhoa.trim();
    const normalizedSpecialty = specialtyName.toLowerCase();
    const duplicateReason = dto.lyDoTaoLuot?.trim();
    const isSupplementaryVisit = dto.loaiLuot === 'luot_bo_sung' || Boolean(duplicateReason);

    const saved = await this.luotRepo.manager.transaction(async (manager) => {
      // Lock the patient row so two reception desks cannot create the same visit concurrently.
      await manager.getRepository(BenhNhan).findOne({
        where: { id: patient!.id },
        lock: { mode: 'pessimistic_write' },
      });

      const existingVisits = await manager.getRepository(LuotTiepNhan)
        .createQueryBuilder('ltn')
        .where('ltn.benh_nhan_id = :patientId', { patientId: patient!.id })
        .andWhere('DATE(ltn.thoi_gian_den) = :today', { today })
        .andWhere('ltn.trang_thai IN (:...statuses)', { statuses: activeStatuses })
        .andWhere(
          '(LOWER(TRIM(ltn.chuyen_khoa)) = :specialty OR (ltn.chuyen_khoa IS NULL AND LOWER(ltn.ghi_chu) LIKE :legacySpecialty))',
          {
            specialty: normalizedSpecialty,
            legacySpecialty: `%[chuyên khoa: ${normalizedSpecialty}]%`,
          },
        )
        .orderBy('ltn.id', 'DESC')
        .getMany();

      const existing = existingVisits[0];
      if (existing && !dto.choPhepTrung && !isSupplementaryVisit) {
        throw new ConflictException({
          code: 'LUOT_KHAM_DANG_HOAT_DONG',
          message: `Bệnh nhân đã có lượt khám ${specialtyName} hôm nay (${existing.maSoThuTu}), trạng thái "${existing.trangThai}". Có thể mở lại lượt này hoặc tạo lượt bổ sung với lý do nghiệp vụ.`,
          existingVisitId: existing.id,
          existingVisitNumber: existing.maSoThuTu,
        });
      }

      const totalCount = await manager.getRepository(LuotTiepNhan).count();
      const luot = manager.getRepository(LuotTiepNhan).create({
        benhNhanId: patient!.id,
        lichHenId: null,
        tiepTanId,
        phongKhamId: dto.phongKhamId,
        bacSiId: selectedDoctor!.id,
        chuyenKhoa: specialtyName,
        loaiLuot: isSupplementaryVisit ? 'luot_bo_sung' : 'luot_chinh',
        lyDoTaoLuot: duplicateReason || null,
        luotGocId: dto.luotGocId || existing?.id || null,
        maSoThuTu: MaGeneratorService.generateSoThuTu(totalCount + 1),
        thoiGianDen: new Date(),
        trangThai: TrangThaiTiepNhan.CHO_KHAM,
        ghiChu: `${dto.ghiChu || 'Khám trực tiếp tại quầy'} [Chuyên khoa: ${specialtyName}]`,
      });
      return manager.getRepository(LuotTiepNhan).save(luot);
    });
    const withRelations = await this.luotRepo.findOne({
      where: { id: saved.id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
    return {
      data: withRelations,
      message: `Đã tiếp nhận trực tiếp. ${withRelations?.maSoThuTu} — ${withRelations?.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách'}.`,
    };
  }

  private async chonBacSiItTaiNhat(doctors: BacSi[]) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const loads = await Promise.all(doctors.map(async (doctor) => ({
      doctor,
      total: await this.luotRepo.count({
        where: {
          bacSiId: doctor.id,
          thoiGianDen: Between(start, end),
          trangThai: In([TrangThaiTiepNhan.CHO_KHAM, TrangThaiTiepNhan.DANG_KHAM]),
        },
      }),
    })));
    loads.sort((a, b) => a.total - b.total || a.doctor.id - b.doctor.id);
    return loads[0]?.doctor;
  }

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
    if (mappedData.nhietDoC != null && (mappedData.nhietDoC < 25 || mappedData.nhietDoC > 45)) {
      throw new BadRequestException('Nhiệt độ phải trong khoảng 25–45°C');
    }
    if (mappedData.spo2 != null && (mappedData.spo2 < 0 || mappedData.spo2 > 100)) {
      throw new BadRequestException('SpO2 phải trong khoảng 0–100%');
    }
    if (mappedData.huyetApTamThu != null && (mappedData.huyetApTamThu < 40 || mappedData.huyetApTamThu > 300)) {
      throw new BadRequestException('Huyết áp tâm thu không hợp lệ');
    }
    if (mappedData.huyetApTamTruong != null && (mappedData.huyetApTamTruong < 20 || mappedData.huyetApTamTruong > 200)) {
      throw new BadRequestException('Huyết áp tâm trương không hợp lệ');
    }

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

    // Nếu trạng thái gửi lên trùng với trạng thái hiện tại -> Idempotent thành công
    if (luot.trangThai === dto.trangThai) {
      const updated = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan', 'bacSi'] });
      return { data: updated, message: 'Lượt khám đã ở trạng thái này' };
    }

    const allowedTransitions: Record<string, string[]> = {
      [TrangThaiTiepNhan.CHO_KHAM]: [TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.DANG_CLS, TrangThaiTiepNhan.DA_HUY],
      [TrangThaiTiepNhan.DANG_KHAM]: [TrangThaiTiepNhan.DANG_CLS, TrangThaiTiepNhan.CHO_THANH_TOAN, TrangThaiTiepNhan.DA_HUY],
      [TrangThaiTiepNhan.DANG_CLS]: [TrangThaiTiepNhan.DA_CO_KQ_CLS, TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.DA_HUY],
      [TrangThaiTiepNhan.DA_CO_KQ_CLS]: [TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.CHO_THANH_TOAN, TrangThaiTiepNhan.DA_HUY],
      [TrangThaiTiepNhan.CHO_THANH_TOAN]: [],
      [TrangThaiTiepNhan.HOAN_THANH]: [],
      [TrangThaiTiepNhan.DA_HUY]: [],
    };
    if (!allowedTransitions[luot.trangThai]?.includes(dto.trangThai)) {
      throw new BadRequestException({
        code: 'CHUYEN_TRANG_THAI_KHONG_HOP_LE',
        message: `Không thể chuyển lượt khám từ "${luot.trangThai}" sang "${dto.trangThai}".`,
      });
    }

    luot.trangThai = dto.trangThai as TrangThaiTiepNhan;
    await this.luotRepo.save(luot);

    let callEvent = null;
    if (dto.trangThai === 'dang_kham') {
      callEvent = await this.recordAndEmitCall(luotId);
    } else if (['hoan_thanh', 'da_huy', 'dang_cls'].includes(dto.trangThai)) {
      if (this.latestCallEvent?.id === luotId) {
        this.latestCallEvent = null;
      }
      try {
        this.queueGateway.emitQueueUpdate();
      } catch (err) {
        console.warn('Lỗi emit queue update:', err);
      }
    }

    const updated = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan', 'bacSi'] });
    return { data: updated, callEvent, message: 'Cập nhật trạng thái thành công' };
  }

  // ─── PHÁT ÂM THANH GIỌNG NÓI TIẾNG VIỆT CHUẨN (TTS MP3) ───────
  async streamVietnameseTts(text: string, res: any) {
    if (!text || !text.trim()) {
      return res.status(400).send('Thiếu text');
    }
    const cleanText = text.trim().slice(0, 250);
    const encoded = encodeURIComponent(cleanText);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=vi&client=tw-ob`;

    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (stream) => {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        stream.pipe(res);
      })
      .on('error', (err) => {
        console.error('Lỗi stream TTS:', err);
        res.status(500).send('Lỗi phát âm thanh');
      });
  }

  // ─── PHÁT LOA GỌI SỐ THỨ TỰ (TV DISPLAY & AUDIO) ─────────────
  async recordAndEmitCall(luotId: number) {
    const luot = await this.luotRepo.findOne({
      where: { id: luotId },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
    if (!luot) return null;

    let tenPhong = 'Phòng khám đa khoa';
    let viTri = 'Tầng 1';
    let chuyenKhoa = 'Đa khoa';

    if (luot.phongKhamId) {
      try {
        const rooms: any[] = await this.luotRepo.manager.query(
          'SELECT ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ? LIMIT 1',
          [luot.phongKhamId]
        );
        if (rooms && rooms.length > 0) {
          tenPhong = rooms[0].ten_phong;
          viTri = rooms[0].vi_tri;
          chuyenKhoa = rooms[0].chuyen_khoa;
        }
      } catch (e) {
        console.warn('Lỗi lấy thông tin phòng khám khi gọi số:', e);
      }
    }

    const callEvent = {
      id: luot.id,
      maSoThuTu: luot.maSoThuTu,
      hoTen: luot.benhNhan?.hoTen || 'Bệnh nhân',
      gioiTinh: luot.benhNhan?.gioiTinh || 'khac',
      namSinh: luot.benhNhan?.ngaySinh ? new Date(luot.benhNhan.ngaySinh).getFullYear() : null,
      phongKhamId: luot.phongKhamId,
      tenPhong,
      viTri,
      chuyenKhoa,
      bacSi: luot.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách',
      thoiGianGoi: new Date().toLocaleTimeString('vi-VN'),
      timestamp: Date.now(),
    };

    this.latestCallEvent = callEvent;
    this.recentCalls = [callEvent, ...this.recentCalls.filter((c) => c.id !== luot.id)].slice(0, 10);

    try {
      this.queueGateway.emitQueueCall(callEvent);
    } catch (err) {
      console.warn('Lỗi emit queue call:', err);
    }

    return callEvent;
  }

  async goiSoLoa(luotId: number, nguoiThucHienId?: number) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'KHONG_TIM_THAY', message: 'Không tìm thấy lượt tiếp nhận' });

    if (![TrangThaiTiepNhan.CHO_KHAM, TrangThaiTiepNhan.DANG_KHAM].includes(luot.trangThai)) {
      throw new BadRequestException({
        code: 'KHONG_THE_GOI_LUOT',
        message: luot.trangThai === TrangThaiTiepNhan.DANG_CLS
          ? 'Bệnh nhân đang làm cận lâm sàng, không thể gọi lại như lượt chờ khám.'
          : luot.trangThai === TrangThaiTiepNhan.DA_CO_KQ_CLS
            ? 'Bệnh nhân đã có kết quả cận lâm sàng, hãy chọn Tiếp tục khám.'
            : 'Lượt khám đã kết thúc hoặc bị hủy, không thể gọi.',
      });
    }

    const lanGoi = await this.lichSuGoiRepo.count({ where: { luotTiepNhanId: luotId } }) + 1;
    const loaiGoi = luot.trangThai === TrangThaiTiepNhan.CHO_KHAM ? 'goi_lan_dau' : 'goi_lai';
    if (luot.trangThai === TrangThaiTiepNhan.CHO_KHAM) {
      luot.trangThai = TrangThaiTiepNhan.DANG_KHAM;
      await this.luotRepo.save(luot);
    }

    const callEvent = await this.recordAndEmitCall(luotId);
    await this.lichSuGoiRepo.save(this.lichSuGoiRepo.create({
      luotTiepNhanId: luotId,
      nguoiThucHienId,
      loaiGoi,
      lanGoi,
      ketQua: 'cho_benh_nhan',
    }));
    return {
      success: true,
      message: `${loaiGoi === 'goi_lan_dau' ? 'Đã gọi bệnh nhân' : 'Đã gọi lại bệnh nhân'} ${callEvent?.hoTen} (STT: ${callEvent?.maSoThuTu})`,
      callEvent,
      loaiGoi,
      lanGoi,
    };
  }

  // ─── DỮ LIỆU MÀN HÌNH TV SẢNH CHỜ TRUNG TÂM ───────────────────
  async getManHinhTVSanhCho() {
    await this.syncLichHenDenGio();

    // 1. Lấy danh sách các phòng khám hoạt động
    const rooms: any[] = await this.luotRepo.manager.query(
      `SELECT id, ten_phong, vi_tri, chuyen_khoa 
       FROM phong_kham 
       WHERE trang_thai = 'hoat_dong' OR trang_thai = 1 
       ORDER BY id ASC`
    );

    // 2. Lấy tất cả lượt tiếp nhận hôm nay
    const luotList = await this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .orderBy('ltn.id', 'ASC')
      .getMany();

    // 3. Phân bổ dữ liệu từng phòng khám
    const phongKhamList = rooms.map((room) => {
      const roomLuot = luotList.filter((l) => {
        if (l.phongKhamId) return l.phongKhamId === room.id;
        // Nếu phongKhamId bị null, đối chiếu theo chuyên khoa của bác sĩ
        if (l.bacSi?.chuyenKhoa && room.chuyen_khoa) {
          const docSpec = l.bacSi.chuyenKhoa.toLowerCase();
          const roomSpec = room.chuyen_khoa.toLowerCase();
          return docSpec.includes(roomSpec) || roomSpec.includes(docSpec);
        }
        return false;
      });

      // Bệnh nhân đang khám bao gồm: DANG_KHAM, DANG_CLS, DA_CO_KQ_CLS
      const dangKhamLuot = roomLuot.find((l) =>
        l.trangThai === TrangThaiTiepNhan.DANG_KHAM ||
        l.trangThai === TrangThaiTiepNhan.DANG_CLS ||
        l.trangThai === TrangThaiTiepNhan.DA_CO_KQ_CLS
      );
      const choKhamList = roomLuot.filter((l) => l.trangThai === TrangThaiTiepNhan.CHO_KHAM);
      const chuanBiLuot = choKhamList.length > 0 ? choKhamList[0] : null;

      // Tìm tên bác sĩ trực nếu có
      const doctorName = roomLuot.find((l) => l.bacSi?.nhanVien?.hoTen)?.bacSi?.nhanVien?.hoTen || 'Bác sĩ trực';

      return {
        id: room.id,
        tenPhong: room.ten_phong,
        viTri: room.vi_tri,
        chuyenKhoa: room.chuyen_khoa,
        bacSiTruc: doctorName,
        dangKham: dangKhamLuot ? {
          id: dangKhamLuot.id,
          maSoThuTu: dangKhamLuot.maSoThuTu,
          hoTen: dangKhamLuot.benhNhan?.hoTen,
          trangThai: dangKhamLuot.trangThai,
        } : null,
        chuanBi: chuanBiLuot ? {
          id: chuanBiLuot.id,
          maSoThuTu: chuanBiLuot.maSoThuTu,
          hoTen: chuanBiLuot.benhNhan?.hoTen,
        } : null,
        soNguoiCho: choKhamList.length,
        danhSachCho: choKhamList.map((l) => ({
          id: l.id,
          maSoThuTu: l.maSoThuTu,
          hoTen: l.benhNhan?.hoTen,
        })),
      };
    });

    // 4. Lấy lượt gọi số hiện tại:
    // Kiểm tra xem latestCallEvent có còn hợp lệ không:
    // Nếu latestCallEvent trỏ tới một lượt đã HOÀN THÀNH hoặc ĐÃ HỦY, hủy bỏ ngay.
    let currentCall = this.latestCallEvent;
    if (currentCall) {
      const matched = luotList.find((l) => l.id === currentCall.id);
      if (matched && [TrangThaiTiepNhan.HOAN_THANH, TrangThaiTiepNhan.DA_HUY].includes(matched.trangThai)) {
        currentCall = null;
        this.latestCallEvent = null;
      }
    }

    if (!currentCall) {
      const latestActive = luotList.slice().reverse().find((l) =>
        [TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.DANG_CLS, TrangThaiTiepNhan.DA_CO_KQ_CLS].includes(l.trangThai)
      );
      if (latestActive) {
        let room = rooms.find((r) => r.id === latestActive.phongKhamId);
        if (!room && latestActive.bacSi?.chuyenKhoa) {
          const docSpec = latestActive.bacSi.chuyenKhoa.toLowerCase();
          room = rooms.find((r) => r.chuyen_khoa && (docSpec.includes(r.chuyen_khoa.toLowerCase()) || r.chuyen_khoa.toLowerCase().includes(docSpec)));
        }
        currentCall = {
          id: latestActive.id,
          maSoThuTu: latestActive.maSoThuTu,
          hoTen: latestActive.benhNhan?.hoTen || 'Bệnh nhân',
          gioiTinh: latestActive.benhNhan?.gioiTinh || 'khac',
          namSinh: latestActive.benhNhan?.ngaySinh ? new Date(latestActive.benhNhan.ngaySinh).getFullYear() : null,
          phongKhamId: latestActive.phongKhamId || room?.id,
          tenPhong: room?.ten_phong || 'Phòng khám',
          viTri: room?.vi_tri || 'Tầng 1',
          chuyenKhoa: room?.chuyen_khoa || 'Đa khoa',
          bacSi: latestActive.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách',
          thoiGianGoi: new Date().toLocaleTimeString('vi-VN'),
          timestamp: Date.now(),
        };
      }
    }

    const summary = {
      tongTiepNhan: luotList.length,
      dangKham: luotList.filter((l) => [TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.DANG_CLS, TrangThaiTiepNhan.DA_CO_KQ_CLS].includes(l.trangThai)).length,
      dangCho: luotList.filter((l) => l.trangThai === TrangThaiTiepNhan.CHO_KHAM).length,
      daHoanThanh: luotList.filter((l) => l.trangThai === TrangThaiTiepNhan.HOAN_THANH).length,
    };

    return {
      currentCall,
      recentCalls: this.recentCalls,
      phongKhamList,
      summary,
      serverTime: new Date().toISOString(),
    };
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
    const qbDatLich = qb.clone()
      .leftJoin('ltn.lichHen', 'lh')
      .andWhere('lh.nguonDat = :nguon', { nguon: 'benh_nhan_tu_dat' });
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

    // 7. Thống kê đánh giá của bệnh nhân về tiếp đón & quy trình khám
    let danhGiaList: any[] = [];
    let diemTrungBinhTiepDon = 5.0;
    let diemTrungBinhChung = 5.0;
    let tongSoDanhGia = 0;

    try {
      const dgQb = this.danhGiaRepo.createQueryBuilder('dg')
        .leftJoinAndSelect('dg.benhNhan', 'bn')
        .leftJoinAndSelect('dg.bacSi', 'bs')
        .leftJoinAndSelect('bs.nhanVien', 'bsNv')
        .orderBy('dg.taoLuc', 'DESC');

      if (tuNgay) dgQb.andWhere('dg.taoLuc >= :tuNgay', { tuNgay });
      if (denNgay) dgQb.andWhere('dg.taoLuc <= :denNgay', { denNgay });

      const allDg = await dgQb.getMany();
      tongSoDanhGia = allDg.length;

      if (tongSoDanhGia > 0) {
        const sumTiepDon = allDg.reduce((acc, cur) => acc + Number(cur.diemTiepDon || 5), 0);
        const sumTB = allDg.reduce((acc, cur) => acc + Number(cur.diemTrungBinh || 5), 0);
        diemTrungBinhTiepDon = Number((sumTiepDon / tongSoDanhGia).toFixed(1));
        diemTrungBinhChung = Number((sumTB / tongSoDanhGia).toFixed(1));
      }

      danhGiaList = allDg.map((dg) => ({
        id: dg.id,
        diemTiepDon: Number(dg.diemTiepDon || 5),
        diemBacSi: Number(dg.diemBacSi || 5),
        diemTrungBinh: Number(dg.diemTrungBinh || 5),
        tieuChiHaiLong: dg.tieuChiHaiLong || [],
        nhanXet: dg.nhanXet || '',
        anDanh: Boolean(dg.anDanh),
        phanHoiGiamDoc: dg.phanHoiGiamDoc || '',
        taoLuc: dg.taoLuc,
        benhNhan: dg.anDanh
          ? { hoTen: 'Bệnh nhân ẩn danh', maBenhNhan: '***' }
          : {
              hoTen: dg.benhNhan?.hoTen || 'Bệnh nhân',
              maBenhNhan: dg.benhNhan?.maBenhNhan || '',
              soDienThoai: dg.benhNhan?.soDienThoai || '',
            },
        bacSi: dg.bacSi?.nhanVien?.hoTen || 'Bác sĩ',
      }));
    } catch (e) {
      console.warn('[BaoCaoTiepTan] Lỗi khi lấy dữ liệu đánh giá:', e.message);
    }

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
        danhGia: {
          tongSoDanhGia,
          diemTrungBinhTiepDon,
          diemTrungBinhChung,
          danhSach: danhGiaList,
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

    // Lọc loại tiếp nhận (đặt trước qua App/Web vs vãng lai / trực tiếp tại quầy)
    if (query.loaiTiepNhan === 'dat_lich') {
      qb.andWhere('lh.nguonDat = :nguon', { nguon: 'benh_nhan_tu_dat' });
    } else if (query.loaiTiepNhan === 'vang_lai') {
      qb.andWhere('(ltn.lichHenId IS NULL OR lh.nguonDat != :nguon)', { nguon: 'benh_nhan_tu_dat' });
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
      loaiTiepNhan: (i.lichHen && i.lichHen.nguonDat === 'benh_nhan_tu_dat') ? 'dat_lich' : 'vang_lai',
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
