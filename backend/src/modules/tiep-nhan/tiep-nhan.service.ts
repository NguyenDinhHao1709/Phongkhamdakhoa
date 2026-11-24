import { khoangNgayVN, NGAY_DAU_TIEN } from '../../common/utils/khoang-ngay-vn.util';
import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Not } from 'typeorm';
import { LuotTiepNhan, SinhHieu, TrangThaiTiepNhan } from './entities/tiep-nhan.entity';
import { LichSuGoiKham } from './entities/lich-su-goi-kham.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { soTiepTheo, voiKhoaDb } from '../../common/utils/db-sequence.util';
import { cheTen, timHoacTaoBenhNhan } from '../../common/utils/benh-nhan-theo-sdt.util';
import {
  IsOptional, IsInt, IsPositive, IsString, IsDateString,
  IsNumber, Min, Max, IsEnum,
  IsBoolean, IsIn,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { LichHen, TrangThaiLichHen, MARKER_CHO_DUYET_HOAN, LOAI_DON_DUYET_HOAN_COC } from '../lich-hen/entities/lich-hen.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { DonGui, TrangThaiDonGui } from '../nhan-vien/entities/don-gui.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';
import { OnModuleInit } from '@nestjs/common';
import * as https from 'https';
import { uploadToCloudinary } from '../../common/utils/cloudinary-upload.util';
import { Aes256Transformer } from '../../common/transformers/aes-256.transformer';
import { assertBacSiPhuTrach } from '../../common/utils/bac-si-phu-trach.util';
import { caDangDienRa } from '../../common/utils/ca-lam-viec.util';

// Đối tượng ưu tiên khám theo Luật Khám bệnh, chữa bệnh (cấp cứu luôn trước nhất)
export const DOI_TUONG_UU_TIEN = ['cap_cuu', 'tre_em_duoi_6', 'nguoi_cao_tuoi', 'phu_nu_co_thai', 'khuyet_tat_nang', 'nguoi_co_cong'];
// Câu thử loa của màn hình TV (ManHinhGoiSoPage) — TTS chỉ nhận câu này hoặc câu bắt đầu bằng "Xin mời"
const CAU_THU_LOA = 'Hệ thống loa gọi số tự động phòng khám đã sẵn sàng';
// Gọi vắng mặt đến lần thứ này thì hủy lượt (tạm ứng đã đóng được hoàn)
const SO_LAN_QUA_LUOT_TOI_DA = 3;
// Đến muộn quá số phút này sau giờ hẹn thì mất ưu tiên lịch hẹn (xếp như khách thường theo giờ đến)
const AN_HAN_PHUT = 15;

const pad2 = (n: number) => String(n).padStart(2, '0');
const gioHienTai = (d = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

/** Giờ hẹn hôm nay của lượt (null nếu không có lịch hẹn) */
function gioHenHomNay(l: LuotTiepNhan): Date | null {
  const gio = l.lichHen?.gioHen;
  if (!gio) return null;
  const [h, m] = gio.split(':').map(Number);
  const hen = new Date();
  hen.setHours(h, m, 0, 0);
  return hen;
}

/** Có lịch hẹn và check-in không muộn quá thời gian ân hạn → được ưu tiên theo giờ hẹn */
function denDungHen(l: LuotTiepNhan): boolean {
  const hen = gioHenHomNay(l);
  return !!hen && new Date(l.thoiGianDen).getTime() <= hen.getTime() + AN_HAN_PHUT * 60000;
}

/** Số phút bác sĩ chậm so với giờ hẹn (chỉ tính với bệnh nhân đến đúng hẹn; đến muộn thì 0) */
function soPhutTreHen(l: LuotTiepNhan): number {
  if (!denDungHen(l)) return 0;
  return Math.max(0, Math.floor((Date.now() - gioHenHomNay(l)!.getTime()) / 60000));
}

/** Chuyên khoa của bác sĩ khớp chuyên khoa cần khám (so khớp mềm, như khi tự chọn bác sĩ) */
function khopChuyenKhoa(chuyenKhoaBs: string | undefined, ck: string): boolean {
  const d = (chuyenKhoaBs || '').trim().toLowerCase();
  return !!d && (d === ck || d.includes(ck) || ck.includes(d));
}

/** Tách chuyên khoa ghép ("Nội tổng quát & Tim mạch") thành từng chuyên khoa thành phần */
const tachChuyenKhoa = (ck?: string) =>
  (ck || '').toLowerCase().split(/[&,;/]| và /).map((x) => x.trim()).filter(Boolean);

/** Đối tượng ưu tiên: lễ tân chọn, hoặc hệ thống tự nhận theo tuổi (dưới 6 tuổi, từ 75 tuổi) */
function doiTuongUuTien(l: LuotTiepNhan): string | null {
  if (l.doiTuongUuTien) return l.doiTuongUuTien;
  if (!l.benhNhan?.ngaySinh) return null;
  const ns = new Date(l.benhNhan.ngaySinh);
  const now = new Date();
  const tuoi = now.getFullYear() - ns.getFullYear() - (now < new Date(now.getFullYear(), ns.getMonth(), ns.getDate()) ? 1 : 0);
  return tuoi < 6 ? 'tre_em_duoi_6' : tuoi >= 75 ? 'nguoi_cao_tuoi' : null;
}

/**
 * Bác sĩ thay thế có khám được lượt này không: lượt có ghi chuyên khoa thì bác sĩ phải có đủ chuyên khoa đó,
 * không thì chỉ cần chung một chuyên khoa thành phần với bác sĩ hiện tại.
 */
function cungChuyenKhoa(luot: LuotTiepNhan, bs: BacSi): boolean {
  const ck = tachChuyenKhoa(bs.chuyenKhoa);
  const canCo = tachChuyenKhoa(luot.chuyenKhoa);
  if (canCo.length) return canCo.every((x) => ck.includes(x));
  const cuaBsHienTai = tachChuyenKhoa(luot.bacSi?.chuyenKhoa);
  return !cuaBsHienTai.length || ck.some((x) => cuaBsHienTai.includes(x));
}

// DTO nội tuyến cho module này
/** Check-in lịch hẹn tại quầy (khách vãng lai đi qua POST /tiep-nhan/tai-quay) */
export class TaoTiepNhanDto {
  @ApiProperty() @IsInt() @IsPositive() lichHenId: number;
  /** Không dùng: bệnh nhân, bác sĩ, phòng lấy theo lịch hẹn */
  @ApiPropertyOptional() @IsOptional() @IsInt() benhNhanId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
  @ApiPropertyOptional({ enum: DOI_TUONG_UU_TIEN }) @IsOptional() @IsIn(DOI_TUONG_UU_TIEN) doiTuongUuTien?: string;
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
  @ApiPropertyOptional({ enum: DOI_TUONG_UU_TIEN }) @IsOptional() @IsIn(DOI_TUONG_UU_TIEN) doiTuongUuTien?: string;
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
  @ApiPropertyOptional() @IsOptional() @IsInt() @IsPositive() phongKhamId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bacSiId?: number;
}

/**
 * Bên gây ra việc hủy quyết định tiền cọc đặt lịch: phía phòng khám → hoàn cọc; phía bệnh nhân → mất cọc;
 * tiếp nhận nhầm → chỉ hủy lượt, lịch hẹn giữ nguyên để check-in lại. Tạm ứng TU đã thu luôn được hoàn (chưa khám).
 */
export const LOAI_HUY = ['phong_kham', 'benh_nhan', 'nham'] as const;
export type LoaiHuy = typeof LOAI_HUY[number];
/** Lý do hủy ghi vào ghi chú dạng [..]: bỏ ngoặc vuông để không làm vỡ các marker */
const sachLyDo = (s: string) => s.replace(/[[\]]/g, '').trim();
const NHAN_LOAI_HUY: Record<LoaiHuy, string> = {
  phong_kham: 'Phòng khám hủy',
  benh_nhan: 'Hủy do bệnh nhân',
  nham: 'Tiếp nhận nhầm',
};

export class CapNhatTrangThaiTiepNhanDto {
  @ApiProperty({ enum: ['cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls', 'hoan_thanh', 'da_huy'] })
  @IsEnum(['cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls', 'hoan_thanh', 'da_huy'])
  trangThai: string;
  @ApiPropertyOptional({ enum: LOAI_HUY, description: 'Bắt buộc khi hủy lượt' }) @IsOptional() @IsIn(LOAI_HUY) loaiHuy?: LoaiHuy;
  @ApiPropertyOptional() @IsOptional() @IsString() lyDo?: string;
}

export class HuyLichHenDto {
  @ApiProperty({ enum: LOAI_HUY }) @IsIn(LOAI_HUY) loaiHuy: LoaiHuy;
  @ApiProperty() @IsString() lyDo: string;
}

import { DanhGiaCaKham } from '../danh-gia/entities/danh-gia.entity';
import { QueueGateway } from './queue.gateway';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { ThanhToanService, MA_TAM_UNG_QUAY, MA_PHI_CLS, soTienPhaiThu } from '../thanh-toan/thanh-toan.service';
import { LichHenService } from '../lich-hen/lich-hen.service';

// Lịch hẹn còn hiệu lực (hủy được)
const LICH_CON_HIEU_LUC = [
  TrangThaiLichHen.CHO_THANH_TOAN, TrangThaiLichHen.CHO_XAC_NHAN, TrangThaiLichHen.DA_XAC_NHAN,
  TrangThaiLichHen.DANG_KHAM, TrangThaiLichHen.CHO_DUYET_HUY,
];
// Lượt còn hủy được (chưa kết thúc khám)
const LUOT_HUY_DUOC = [TrangThaiTiepNhan.CHO_KHAM, TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.DANG_CLS, TrangThaiTiepNhan.DA_CO_KQ_CLS];

// Lượt được vào hàng đợi bác sĩ: ca cấp cứu hoặc phiếu tạm ứng tại quầy đã thu (dùng với tham số :maTu).
// Thiếu phiếu thì KHÔNG cho vào (lỗi lập phiếu không được biến thành khám miễn phí)
const DA_DONG_TAM_UNG =
  `(ltn.doi_tuong_uu_tien = 'cap_cuu' OR EXISTS (SELECT 1 FROM hoa_don tu WHERE tu.ma_hoa_don = CONCAT(:maTu, ltn.id) AND tu.trang_thai = 'da_thanh_toan'))`;

@Injectable()
export class TiepNhanService implements OnModuleInit {
  private latestCallEvent: any = null;
  private recentCalls: any[] = [];
  private lastSyncAt = 0;

  /** Số thứ tự trong ngày, mỗi dãy một bộ đếm riêng, reset mỗi ngày: A001… = quầy / check-in lịch hẹn, B001… = kiosk đăng ký mới */
  async generateNextSoThuTu(prefix: 'A' | 'B' = 'A'): Promise<string> {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const so = await soTiepTheo(this.luotRepo.manager, `stt_${prefix}_${today}`,
      `SELECT COALESCE(MAX(CAST(SUBSTRING(ma_so_thu_tu, 2) AS UNSIGNED)), 0) AS maxNum FROM luot_tiep_nhan
       WHERE ma_so_thu_tu REGEXP ? AND DATE(thoi_gian_den) = ?`, [`^${prefix}[0-9]+$`, today]);
    return `${prefix}${String(so).padStart(3, '0')}`;
  }

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
    private readonly thongBaoService: ThongBaoService,
    private readonly thanhToanService: ThanhToanService,
    private readonly lichHenService: LichHenService,
  ) {}

  onModuleInit() {
    this.quetHangDoi().catch((err) =>
      console.error('[TiepNhanScheduler] Không đồng bộ được lịch hẹn:', err.message)
    );
    setInterval(() => {
      this.quetHangDoi().catch((err) =>
        console.error('[TiepNhanScheduler] Không đồng bộ được lịch hẹn:', err.message)
      );
    }, 30 * 1000);
  }

  // ─── HÀNG ĐỢI PHÒNG KHÁM ─────────────────────────────────────
  async hangDoi(phongKhamId?: number, currentUser?: any) {
    await this.quetHangDoi();
    const qb = this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .leftJoinAndSelect('ltn.sinhHieu', 'sh')
      .leftJoinAndSelect('ltn.lichHen', 'lh')
      .where('ltn.trangThai IN (:...tt)', { tt: ['cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls'] })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()');

    if (phongKhamId) qb.andWhere('ltn.phongKhamId = :phongKhamId', { phongKhamId });
    if (currentUser?.vai_tro === 'bac_si') {
      const bacSi = await this.bacSiRepo.findOne({
        where: { nhanVien: { nguoiDungId: currentUser.id || currentUser.userId } },
      });
      if (!bacSi) return { data: [], message: 'Không tìm thấy hồ sơ bác sĩ đang đăng nhập' };
      qb.andWhere('ltn.bac_si_id = :doctorId', { doctorId: bacSi.id });
      // Chưa đóng tạm ứng tại quầy thì bác sĩ chưa thấy để gọi khám
      qb.andWhere(DA_DONG_TAM_UNG, { maTu: MA_TAM_UNG_QUAY });
    }

    const items = await Promise.all(this.sapXepChoKham(await qb.getMany()).map(async (l) => {
      const treHenPhut = l.trangThai === TrangThaiTiepNhan.CHO_KHAM ? soPhutTreHen(l) : 0;
      // Lễ tân: bác sĩ chậm quá 30 phút → gợi ý chuyển sang bác sĩ cùng chuyên khoa đang trực
      const goiYChuyenBacSi = currentUser?.vai_tro !== 'bac_si' && treHenPhut >= 30 ? await this.goiYBacSiThayThe(l) : null;
      return Object.assign(l, { uuTien: doiTuongUuTien(l), treHenPhut, goiYChuyenBacSi });
    }));
    return { data: items, message: 'Lấy hàng đợi thành công' };
  }

  /**
   * Thứ tự chờ khám: cấp cứu → đối tượng ưu tiên theo luật → lịch hẹn đã đến giờ và đến đúng hẹn (theo giờ hẹn)
   * → còn lại theo giờ đến. Người đã qua lượt (gọi vắng mặt) xếp theo thời điểm qua lượt (trừ cấp cứu).
   */
  private sapXepChoKham<T extends LuotTiepNhan>(items: T[]): T[] {
    const bayGio = gioHienTai();
    const key = (l: LuotTiepNhan) => {
      const uuTien = doiTuongUuTien(l);
      if (uuTien === 'cap_cuu') return `0|${new Date(l.thoiGianDen).toISOString()}`;
      // Cùng thời điểm (DATETIME chỉ tới giây) thì người qua lượt xếp sau người mới đến (hậu tố |1)
      if (l.quaLuotLuc) return `3|${new Date(l.quaLuotLuc).toISOString()}|1`;
      const gioDen = new Date(l.thoiGianDen).toISOString();
      if (uuTien) return `1|${gioDen}`;
      const gio = l.lichHen?.gioHen;
      return gio && gio <= bayGio && denDungHen(l) ? `2|${gio}` : `3|${gioDen}|0`;
    };
    return [...items].sort((a, b) => key(a).localeCompare(key(b)) || a.id - b.id);
  }

  /**
   * Bác sĩ cùng chuyên khoa đang trực, ít bệnh nhân chờ nhất (lễ tân chuyển khi bác sĩ hiện tại chậm quá lâu).
   * Lượt có ghi chuyên khoa khám thì bác sĩ thay phải có chuyên khoa đó; không thì chỉ cần chung một chuyên khoa thành phần.
   */
  private async goiYBacSiThayThe(luot: LuotTiepNhan) {
    if (!luot.chuyenKhoa && !luot.bacSi?.chuyenKhoa) return null;
    const cungKhoa = (await this.bacSiRepo.find({ relations: ['nhanVien'] }))
      .filter((d) => d.id !== luot.bacSiId && cungChuyenKhoa(luot, d));
    const dangTruc = await this.locBacSiDangTruc(cungKhoa);
    const chon = dangTruc.length ? await this.chonBacSiItTaiNhat(dangTruc) : null;
    return chon ? { bacSiId: chon.doctor.id, hoTen: chon.doctor.nhanVien?.hoTen, soNguoiCho: chon.total } : null;
  }

  /** Bác sĩ có ca trực đang diễn ra */
  private async locBacSiDangTruc(doctors: BacSi[]) {
    if (!doctors.length) return [];
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const homQua = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const ngayHomQua = `${homQua.getFullYear()}-${pad2(homQua.getMonth() + 1)}-${pad2(homQua.getDate())}`;
    const bayGio = gioHienTai(now);
    // Gồm cả ca qua đêm phân cho hôm qua còn kéo sang sáng nay
    const shifts = await this.lichLamViecRepo.find({ where: { ngayLam: In([today, ngayHomQua]) }, relations: ['caLamViec'] });
    return doctors.filter((doctor) => shifts.some((shift) =>
      shift.nhanVienId === doctor.nhanVienId &&
      shift.caLamViec &&
      caDangDienRa(shift.caLamViec, bayGio, String(shift.ngayLam).slice(0, 10) === today ? 'homNay' : 'homQua')
    ));
  }

  /** Khóa theo lịch hẹn (MySQL GET_LOCK, dùng được khi chạy nhiều instance): quầy và kiosk không tạo trùng lượt */
  voiKhoaLichHen<T>(lichHenId: number, fn: () => Promise<T>): Promise<T> {
    return voiKhoaDb(this.luotRepo.manager.connection, `luot_lich_hen:${lichHenId}`, fn);
  }

  /** Nhịp khám hôm nay của bác sĩ: trung bình khoảng cách giữa các lần gọi bệnh nhân mới (phút) */
  private async nhipKham(bacSiId?: number) {
    const MAC_DINH = 6;
    if (!bacSiId) return { phutMoiLuot: MAC_DINH, phutTuLanGoiCuoi: null as number | null };
    const rows: any[] = await this.luotRepo.manager.query(
      `SELECT g.thoi_gian_goi AS t FROM lich_su_goi_kham g JOIN luot_tiep_nhan l ON l.id = g.luot_tiep_nhan_id
       WHERE l.bac_si_id = ? AND g.loai_goi = 'goi_lan_dau' AND DATE(g.thoi_gian_goi) = CURDATE()
       ORDER BY g.thoi_gian_goi DESC LIMIT 7`,
      [bacSiId],
    );
    const ts = rows.map((r) => new Date(r.t).getTime());
    // Bỏ các khoảng nghỉ dài (> 45 phút) để không làm sai nhịp khám
    const gaps = ts.slice(1).map((t, i) => (ts[i] - t) / 60000).filter((g) => g > 0 && g <= 45);
    const phutMoiLuot = gaps.length
      ? Math.min(30, Math.max(3, Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)))
      : MAC_DINH;
    return { phutMoiLuot, phutTuLanGoiCuoi: ts.length ? (Date.now() - ts[0]) / 60000 : null };
  }

  /** Bệnh nhân chờ khám hôm nay đã đóng tạm ứng (bác sĩ thấy được), theo thứ tự ưu tiên */
  async danhSachChoKham(phongKhamId?: number) {
    const qb = this.luotRepo.createQueryBuilder('ltn')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.lichHen', 'lh')
      .where('ltn.trangThai = :cho', { cho: TrangThaiTiepNhan.CHO_KHAM })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
      .andWhere(DA_DONG_TAM_UNG, { maTu: MA_TAM_UNG_QUAY });
    if (phongKhamId) qb.andWhere('ltn.phongKhamId = :phongKhamId', { phongKhamId });
    return this.sapXepChoKham(await qb.getMany());
  }

  /** Số người chờ trước lượt này trong phòng (lượt chưa đóng tạm ứng thì xếp sau tất cả) */
  async soNguoiPhiaTruoc(luotId: number, phongKhamId?: number) {
    const ds = await this.danhSachChoKham(phongKhamId);
    const idx = ds.findIndex((l) => l.id === luotId);
    return idx >= 0 ? idx : ds.length;
  }

  // ─── THÔNG TIN PHIẾU KHÁM & TIẾN TRÌNH CHO BỆNH NHÂN ────────────
  async getPhieuKhamBenhNhan(currentUser: any) {
    await this.quetHangDoi();

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
      .leftJoinAndSelect('ltn.lichHen', 'lh')
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

    const phongKhamId = luot.phongKhamId;
    const currentServing = await this.luotRepo.createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .andWhere('ltn.phongKhamId = :phongKhamId', { phongKhamId })
      .andWhere('ltn.trangThai = :dk', { dk: TrangThaiTiepNhan.DANG_KHAM })
      .getOne();
    const choKhamTrongPhong = await this.danhSachChoKham(phongKhamId);
    const viTriCuaToi = choKhamTrongPhong.findIndex((l) => l.id === luot.id);
    const waitingBeforeMe = viTriCuaToi >= 0 ? choKhamTrongPhong.slice(0, viTriCuaToi) : choKhamTrongPhong;

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
    // Bác sĩ kết thúc khám → lượt chuyển CHO_THANH_TOAN: phần chuyên môn đã xong, chỉ còn thanh toán / nhận thuốc
    let isCompleted = [TrangThaiTiepNhan.HOAN_THANH, TrangThaiTiepNhan.CHO_THANH_TOAN].includes(luot.trangThai);
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
                kq.ket_qua_chi_tiet as ketQuaChiTiet, kq.file_dinh_kem as fileDinhKem, kq.da_gui_bac_si as daGuiBacSi,
                (SELECT h.trang_thai FROM hoa_don h WHERE h.ma_hoa_don = CONCAT(?, cd.id) LIMIT 1) as trangThaiThuPhi
         FROM chi_dinh_can_lam_sang cd
         LEFT JOIN dich_vu_xet_nghiem dv ON cd.dich_vu_xet_nghiem_id = dv.id
         LEFT JOIN ket_qua_xet_nghiem kq ON kq.chi_dinh_id = cd.id
         WHERE cd.benh_an_kham_id = ? AND cd.trang_thai != 'huy'
         ORDER BY cd.thoi_gian_chi_dinh ASC`,
        [MA_PHI_CLS, benhAnKhamId],
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

        // Chỉ hiển thị theo tiến độ cận lâm sàng thực tế; không ghi DB trong request đọc (tránh đè thao tác của bác sĩ)
        if (!isCompleted && (luot.trangThai === TrangThaiTiepNhan.DANG_KHAM || (isDaCoKqCls && luot.trangThai !== TrangThaiTiepNhan.DA_CO_KQ_CLS))) {
          luot.trangThai = isDaCoKqCls ? TrangThaiTiepNhan.DA_CO_KQ_CLS : TrangThaiTiepNhan.DANG_CLS;
        }
      } else {
        hasCls = false;
        if (!isCompleted && (luot.trangThai === TrangThaiTiepNhan.DANG_CLS || luot.trangThai === TrangThaiTiepNhan.DA_CO_KQ_CLS)) {
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
              hd.so_tien_giam as soTienGiam, hd.thuc_thu as thucThu, hd.tien_hoan_tra as tienHoanTra,
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
        tienHoanTra: Number(hdRows[0].tienHoanTra || 0),
        chiTiet: (ctRows || []).map((c) => ({
          ...c,
          soLuong: Number(c.soLuong),
          donGia: Number(c.donGia),
          thanhTien: Number(c.thanhTien),
        })),
      };
    }

    // Phiếu tạm ứng tại quầy (nếu có): chưa đóng thì bệnh nhân chưa vào hàng đợi bác sĩ
    const tuRows: any[] = await this.luotRepo.manager.query(
      `SELECT ma_hoa_don AS maHoaDon, trang_thai AS trangThai, thuc_thu AS soTien FROM hoa_don WHERE ma_hoa_don = ? LIMIT 1`,
      [`${MA_TAM_UNG_QUAY}${luot.id}`],
    );
    const tamUng = tuRows[0] ? { ...tuRows[0], soTien: Number(tuRows[0].soTien) } : null;

    // Phiếu đang chờ thu (tạm ứng phí khám, phí cận lâm sàng): bệnh nhân chuyển khoản QR ngay trên app hoặc đóng tại quầy
    const choThuRows: any[] = await this.luotRepo.manager.query(
      `SELECT id, ma_hoa_don AS maHoaDon, tong_tien AS tongTien, so_tien_giam AS soTienGiam, ghi_chu AS ghiChu FROM hoa_don
        WHERE trang_thai = 'cho_thanh_toan'
          AND (ma_hoa_don = ? OR ma_hoa_don IN (
            SELECT CONCAT(?, cd.id) FROM chi_dinh_can_lam_sang cd JOIN benh_an_kham bak ON bak.id = cd.benh_an_kham_id
             WHERE bak.luot_tiep_nhan_id = ?))
        ORDER BY id`,
      [`${MA_TAM_UNG_QUAY}${luot.id}`, MA_PHI_CLS, luot.id],
    );
    const phieuChoThu = choThuRows
      .map((r) => ({
        id: Number(r.id),
        maHoaDon: r.maHoaDon,
        soTien: soTienPhaiThu(r),
        moTa: String(r.maHoaDon).startsWith(MA_PHI_CLS)
          ? `Phí cận lâm sàng: ${String(r.ghiChu || '').replace('[PHÍ CẬN LÂM SÀNG] ', '').split(' - lượt khám')[0]}`
          : 'Tạm ứng phí khám',
      }))
      .filter((p) => p.soTien > 0);

    const soDangGoi = currentServing?.maSoThuTu || (choKhamTrongPhong[0]?.maSoThuTu || '-');
    const soNguoiPhiaTruoc = (isDangKham || isCompleted || isDangCls || isDaCoKqCls) ? 0 : waitingBeforeMe.length;
    const nhip = await this.nhipKham(luot.bacSiId);
    const conLaiCaHienTai = currentServing && nhip.phutTuLanGoiCuoi !== null ? Math.max(0, nhip.phutMoiLuot - nhip.phutTuLanGoiCuoi) : 0;
    const uocTinhPhut = (isDangKham || isCompleted || isDangCls || isDaCoKqCls)
      ? 0
      : Math.max(2, Math.round(conLaiCaHienTai + soNguoiPhiaTruoc * nhip.phutMoiLuot));
    // Đã đóng đủ, quá giờ hẹn vì bác sĩ khám ca trước chậm → báo để bệnh nhân yên tâm chờ
    const treHenPhut = luot.trangThai === TrangThaiTiepNhan.CHO_KHAM && tamUng?.trangThai !== 'cho_thanh_toan' ? soPhutTreHen(luot) : 0;
    const thongBaoTre = treHenPhut >= 5
      ? `Bác sĩ đang khám chậm khoảng ${treHenPhut} phút so với giờ hẹn của bạn. Bạn được ưu tiên vào khám ngay khi bác sĩ xong ca hiện tại. Mong bạn thông cảm.`
      : null;

    const phongRows: any[] = phongKhamId
      ? await this.luotRepo.manager.query('SELECT ten_phong FROM phong_kham WHERE id = ? LIMIT 1', [phongKhamId])
      : [];
    const tenPhongKham = phongRows[0]?.ten_phong || 'Phòng khám chuyên khoa';
    const tenBacSi = luot.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách';

    const isHoaDonDone =
      !hoaDon || hoaDon.trangThai === 'da_thanh_toan' || (Number(hoaDon.thucThu) === 0 && !(hoaDon.tienHoanTra > 0));
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
          tamUng,
          phieuChoThu,
          chanDoanXacDinh: bakRows && bakRows.length > 0 ? bakRows[0].chanDoanXacDinh : null,
        },
        queue: {
          soDangGoi,
          soNguoiPhiaTruoc,
          uocTinhPhut,
          treHenPhut,
          thongBaoTre,
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
              : isDangCls && dsChiDinh.some((cd) => cd.trangThaiThuPhi === 'cho_thanh_toan')
              ? `Bác sĩ chỉ định ${dsChiDinh.length} xét nghiệm / CĐHA. Vui lòng đóng phí cận lâm sàng tại quầy thu ngân trước khi thực hiện.`
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

  private async quetHangDoi() {
    const nowMs = Date.now();
    // Throttle 5 giây: hàng chục màn hình TV/bác sĩ gọi cùng lúc chỉ quét 1 lần
    if (nowMs - this.lastSyncAt < 5000) return;

    // Chạy nhiều instance: instance khác đang quét thì bỏ qua lần này
    return voiKhoaDb(this.luotRepo.manager.connection, 'quet:hang_doi', async () => {
      if (Date.now() - this.lastSyncAt < 5000) return;
      this.lastSyncAt = Date.now();

      const now = new Date();
      const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      const hanChot = gioHienTai(new Date(now.getTime() - 15 * 60 * 1000));
      await this.baoBacSiCham(today, hanChot).catch((e) => console.warn('[TiepNhan] Lỗi báo bác sĩ chậm:', e?.message));
      await this.donLuotNgayCu(today).catch((e) => console.warn('[TiepNhan] Lỗi dọn lượt ngày cũ:', e?.message));
    }, 0);
  }

  /**
   * Dọn lượt của ngày trước còn dở: chờ khám (bệnh nhân không quay lại) hoặc đang khám / đang làm CLS mà chưa kết thúc
   * (bệnh nhân bỏ về giữa chừng) → hủy. Hóa đơn quyết toán 0 đ còn treo thì tự quyết toán.
   */
  private async donLuotNgayCu(today: string) {
    const conSot = await this.luotRepo.createQueryBuilder('ltn')
      .where('ltn.trangThai IN (:...tt)', { tt: LUOT_HUY_DUOC })
      .andWhere('DATE(ltn.thoiGianDen) < :today', { today })
      .getMany();
    for (const l of conSot) {
      await this.huyLuotVangMat(l, l.trangThai === TrangThaiTiepNhan.CHO_KHAM
        ? 'hết ngày khám, bệnh nhân không quay lại'
        : 'hết ngày nhưng ca khám chưa kết thúc, bệnh nhân bỏ về giữa chừng');
    }
    const hd0: any[] = await this.luotRepo.manager.query(
      `SELECT ltn.id FROM luot_tiep_nhan ltn JOIN hoa_don hd ON hd.luot_tiep_nhan_id = ltn.id
        WHERE ltn.trang_thai = 'cho_thanh_toan' AND hd.trang_thai = 'cho_thanh_toan'
          AND hd.thuc_thu = 0 AND COALESCE(hd.tien_hoan_tra, 0) = 0`,
    );
    for (const r of hd0) await this.thanhToanService.tuQuyetToanNeuKhongPhaiThu(Number(r.id));
  }

  /**
   * Hủy lượt vì bệnh nhân vắng mặt / bỏ về: dọn CLS, đơn thuốc chờ, hóa đơn nháp; lịch hẹn → vắng mặt (chưa khám) hoặc hủy
   * (đã khám dở); tạm ứng chỉ hoàn khi chưa khám.
   */
  private async huyLuotVangMat(luot: LuotTiepNhan, lyDo: string) {
    const kq = await this.luotRepo.update(
      { id: luot.id, trangThai: In(LUOT_HUY_DUOC) },
      { trangThai: TrangThaiTiepNhan.DA_HUY, ghiChu: `${luot.ghiChu || ''} [Vắng mặt: ${lyDo}]`.trim() },
    );
    if (!kq.affected) return;
    if (this.latestCallEvent?.id === luot.id) this.latestCallEvent = null;
    const { daKham } = await this.donDepKhiHuyLuot(luot.id, `Vắng mặt: ${lyDo}`);
    if (luot.lichHenId) {
      await this.lichHenRepo.update(
        { id: luot.lichHenId, trangThai: In(LICH_CON_HIEU_LUC) },
        { trangThai: daKham ? TrangThaiLichHen.DA_HUY : TrangThaiLichHen.VANG_MAT },
      );
    }
    await this.thanhToanService.xuLyTamUngKhiHuyLuot(luot, `Vắng mặt: ${lyDo}`, !daKham);
  }

  /**
   * Dọn dữ liệu đi kèm khi hủy lượt: đơn thuốc chờ duyệt, hóa đơn nháp, CLS chưa có kết quả. Phí CLS đã thu mà chưa
   * thực hiện thì hoàn; đã lấy mẫu / đang chạy thì giữ. Trả về daKham = bác sĩ đã lập phiếu khám cho lượt.
   */
  private async donDepKhiHuyLuot(luotId: number, lyDo: string) {
    const m = this.luotRepo.manager;
    await m.query(`UPDATE hoa_don SET trang_thai = 'huy' WHERE luot_tiep_nhan_id = ? AND trang_thai = 'cho_thanh_toan'`, [luotId]);
    const [bak]: any[] = await m.query(`SELECT id FROM benh_an_kham WHERE luot_tiep_nhan_id = ? LIMIT 1`, [luotId]);
    if (!bak) return { daKham: false };
    await m.query(`UPDATE don_thuoc SET trang_thai = 'da_huy' WHERE benh_an_kham_id = ? AND trang_thai = 'cho_duyet'`, [bak.id]);
    const cls: any[] = await m.query(
      `SELECT id, trang_thai AS tt FROM chi_dinh_can_lam_sang WHERE benh_an_kham_id = ? AND trang_thai != 'co_ket_qua'`, [bak.id],
    );
    await m.query(`UPDATE chi_dinh_can_lam_sang SET trang_thai = 'huy' WHERE benh_an_kham_id = ? AND trang_thai NOT IN ('co_ket_qua', 'huy')`, [bak.id]);
    const chuaLam = cls.filter((c) => ['cho_lay_mau', 'huy'].includes(c.tt)).map((c) => Number(c.id));
    const dangLam = cls.filter((c) => !['cho_lay_mau', 'huy'].includes(c.tt)).map((c) => Number(c.id));
    await this.thanhToanService.huyPhieuThuCls(chuaLam, lyDo, true);
    await this.thanhToanService.huyPhieuThuCls(dangLam, lyDo, false);
    return { daKham: true };
  }

  /**
   * Bệnh nhân lịch hẹn đã đóng đủ nhưng chờ quá giờ hẹn 15 phút (bác sĩ khám ca trước quá giờ):
   * báo lễ tân xin lỗi + báo bệnh nhân thời gian chậm; quá 30 phút gợi ý chuyển bác sĩ cùng chuyên khoa. Mỗi mốc báo 1 lần.
   */
  private async baoBacSiCham(today: string, hanChot: string) {
    const dangCho = await this.luotRepo.createQueryBuilder('ltn')
      .innerJoinAndSelect('ltn.lichHen', 'lh')
      .leftJoinAndSelect('ltn.benhNhan', 'bn')
      .leftJoinAndSelect('ltn.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('ltn.trangThai = :cho', { cho: TrangThaiTiepNhan.CHO_KHAM })
      .andWhere('lh.ngayHen = :today', { today })
      .andWhere('lh.gioHen <= :hanChot', { hanChot })
      .andWhere(DA_DONG_TAM_UNG, { maTu: MA_TAM_UNG_QUAY })
      .getMany()
      .then((ds) => ds.filter(denDungHen)); // đến muộn thì không phải lỗi bác sĩ chậm
    if (!dangCho.length) return;

    const daBao: any[] = await this.luotRepo.manager.query(
      `SELECT DISTINCT doi_tuong_id AS id, loai FROM thong_bao
       WHERE doi_tuong_bang = 'luot_tiep_nhan' AND loai IN ('tre_hen_15', 'tre_hen_30') AND doi_tuong_id IN (?)`,
      [dangCho.map((l) => l.id)],
    );
    const coRoi = new Set(daBao.map((r) => `${r.id}:${r.loai}`));

    for (const l of dangCho) {
      const tre = soPhutTreHen(l);
      const hoTen = l.benhNhan?.hoTen || 'Bệnh nhân';
      const tenBs = l.bacSi?.nhanVien?.hoTen || 'bác sĩ phụ trách';
      const gio = l.lichHen.gioHen.slice(0, 5);
      const doiTuong = { doiTuongBang: 'luot_tiep_nhan', doiTuongId: l.id };

      if (!coRoi.has(`${l.id}:tre_hen_15`)) {
        await this.thongBaoService.taoThongBaoTheoRole('tiep_tan', {
          tieuDe: `Bác sĩ chậm giờ hẹn: ${hoTen} (${l.maSoThuTu})`,
          noiDung: `${hoTen} hẹn ${gio} với BS. ${tenBs} đã chờ ${tre} phút. Vui lòng xin lỗi và báo thời gian chờ dự kiến cho bệnh nhân.`,
          loai: 'tre_hen_15',
          ...doiTuong,
        });
        if (l.benhNhan?.nguoiDungId) {
          await this.thongBaoService.taoThongBao({
            nguoiNhanId: l.benhNhan.nguoiDungId,
            tieuDe: 'Bác sĩ đang khám chậm so với giờ hẹn',
            noiDung: `BS. ${tenBs} đang khám chậm khoảng ${tre} phút so với giờ hẹn ${gio} của bạn. Bạn được ưu tiên vào khám ngay khi bác sĩ xong ca hiện tại. Mong bạn thông cảm.`,
            loai: 'tre_hen_15',
            ...doiTuong,
          });
        }
      }

      if (tre >= 30 && !coRoi.has(`${l.id}:tre_hen_30`)) {
        const goiY = await this.goiYBacSiThayThe(l);
        await this.thongBaoService.taoThongBaoTheoRole('tiep_tan', {
          tieuDe: `Chậm quá 30 phút: ${hoTen} (${l.maSoThuTu})`,
          noiDung: `${hoTen} hẹn ${gio} với BS. ${tenBs} đã chờ ${tre} phút. ${goiY
            ? `Có thể đề nghị bệnh nhân chuyển sang BS. ${goiY.hoTen} (đang có ${goiY.soNguoiCho} lượt) tại màn hình Hàng đợi.`
            : 'Hiện không có bác sĩ cùng chuyên khoa khác đang trực.'}`,
          loai: 'tre_hen_30',
          ...doiTuong,
        });
      }
    }
  }

  // ─── TẠO LƯỢT TIẾP NHẬN ──────────────────────────────────────
  async createTaiQuay(dto: TiepNhanTaiQuayDto, tiepTanId: number) {
    const specialty = dto.chuyenKhoa.trim().toLowerCase();
    if (!specialty) {
      throw new BadRequestException({ code: 'THIEU_CHUYEN_KHOA', message: 'Phải chọn chuyên khoa trước khi tiếp nhận.' });
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    const selectedDoctor = dto.bacSiId
      ? await this.bacSiRepo.findOne({ where: { id: dto.bacSiId }, relations: ['nhanVien'] })
      : await this.chonBacSiTheoChuyenKhoa(dto.chuyenKhoa);
    if (!selectedDoctor) {
      throw new BadRequestException({ code: 'KHONG_CO_BAC_SI', message: `Hiện chưa có bác sĩ thuộc chuyên khoa ${dto.chuyenKhoa}.` });
    }
    if (dto.bacSiId && !khopChuyenKhoa(selectedDoctor.chuyenKhoa, specialty)) {
      throw new BadRequestException({
        code: 'KHAC_CHUYEN_KHOA',
        message: `BS. ${selectedDoctor.nhanVien?.hoTen || ''} (${selectedDoctor.chuyenKhoa || 'chưa có chuyên khoa'}) không thuộc chuyên khoa ${dto.chuyenKhoa}.`,
      });
    }
    const phongKhamId = dto.phongKhamId ?? await this.phongCuaBacSi(selectedDoctor);

    // Lễ tân đã chọn hồ sơ thì dùng hồ sơ đó; không thì tìm theo SĐT + họ tên (SĐT có thể dùng chung trong gia đình)
    const patient = (dto.benhNhanId && await this.benhNhanRepo.findOne({ where: { id: dto.benhNhanId } }))
      || await voiKhoaDb(this.luotRepo.manager.connection, `bn_phone:${dto.soDienThoai.trim()}`,
        () => timHoacTaoBenhNhan(this.luotRepo.manager, { hoTen: dto.hoTen, soDienThoai: dto.soDienThoai }));

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

      const maSoThuTu = await this.generateNextSoThuTu();
      const luot = manager.getRepository(LuotTiepNhan).create({
        benhNhanId: patient!.id,
        lichHenId: null,
        tiepTanId,
        phongKhamId,
        bacSiId: selectedDoctor.id,
        chuyenKhoa: specialtyName,
        loaiLuot: isSupplementaryVisit ? 'luot_bo_sung' : 'luot_chinh',
        lyDoTaoLuot: duplicateReason || null,
        luotGocId: dto.luotGocId || existing?.id || null,
        doiTuongUuTien: dto.doiTuongUuTien || null,
        maSoThuTu,
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

    // Bệnh nhân đến quầy phải đóng tạm ứng (trừ cấp cứu); bác sĩ được báo khi thu ngân thu xong
    const phieuTu = await this.lapPhieuTamUng(saved, withRelations?.benhNhan?.hoTen);
    this.baoHangDoiThayDoi();

    return {
      data: withRelations,
      message: `Đã tiếp nhận trực tiếp. ${withRelations?.maSoThuTu} — ${withRelations?.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách'}.${phieuTu
        ? ' Mời bệnh nhân sang quầy thu ngân đóng tạm ứng.'
        : saved.doiTuongUuTien === 'cap_cuu'
          ? ' Bệnh nhân cấp cứu được vào khám ngay, thanh toán sau.'
          : ' Bệnh nhân đã vào hàng đợi khám.'}`,
    };
  }

  /**
   * Bác sĩ của chuyên khoa, ít người chờ nhất; ưu tiên người đang trong ca trực.
   * chiDangTruc: không ai đang trực thì trả null (kiosk không xếp bệnh nhân cho bác sĩ vắng mặt).
   */
  async chonBacSiTheoChuyenKhoa(chuyenKhoa: string, chiDangTruc = false): Promise<BacSi | null> {
    const ck = (chuyenKhoa || '').trim().toLowerCase();
    if (!ck) return null;
    const doctors = (await this.bacSiRepo.find({ relations: ['nhanVien'] })).filter((d) => khopChuyenKhoa(d.chuyenKhoa, ck));
    const dangTruc = await this.locBacSiDangTruc(doctors);
    const ungVien = dangTruc.length ? dangTruc : chiDangTruc ? [] : doctors;
    return ungVien.length ? (await this.chonBacSiItTaiNhat(ungVien)).doctor : null;
  }

  /** Phòng khám đang hoạt động cùng chuyên khoa với bác sĩ (null nếu không có) */
  async phongCuaBacSi(bs: BacSi): Promise<number | null> {
    const ck = tachChuyenKhoa(bs.chuyenKhoa);
    const rooms: any[] = await this.luotRepo.manager.query(
      `SELECT id, chuyen_khoa FROM phong_kham WHERE trang_thai = 'hoat_dong' ORDER BY id`,
    );
    return rooms.find((r) => ck.includes((r.chuyen_khoa || '').trim().toLowerCase()))?.id ?? null;
  }

  /** Điều kiện check-in lịch hẹn (dùng chung quầy và kiosk): khám trực tiếp, đã xác nhận, đúng ngày hẹn */
  kiemTraLichHenCheckIn(lh: LichHen) {
    if (lh.hinhThuc === 'truc_tuyen') {
      throw new BadRequestException({ code: 'LICH_HEN_TRUC_TUYEN', message: `Lịch hẹn ${lh.maLichHen} là tư vấn trực tuyến, không check-in tại phòng khám.` });
    }
    if (lh.trangThai !== TrangThaiLichHen.DA_XAC_NHAN) {
      throw new BadRequestException({
        code: lh.trangThai === TrangThaiLichHen.CHO_THANH_TOAN ? 'LICH_HEN_CHUA_THANH_TOAN_COC' : 'LICH_HEN_KHONG_HOP_LE',
        message: lh.trangThai === TrangThaiLichHen.CHO_THANH_TOAN
          ? `Lịch hẹn ${lh.maLichHen} chưa thanh toán tiền cọc.`
          : `Lịch hẹn ${lh.maLichHen} đang ở trạng thái "${lh.trangThai}", không thể check-in.`,
      });
    }
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    if (String(lh.ngayHen).slice(0, 10) !== today) {
      throw new BadRequestException({ code: 'LICH_HEN_KHONG_PHAI_HOM_NAY', message: `Lịch hẹn ${lh.maLichHen} hẹn ngày ${String(lh.ngayHen).slice(0, 10)}, chỉ check-in đúng ngày hẹn.` });
    }
    // Lượt không có bác sĩ thì không bác sĩ nào thấy/gọi được
    if (!lh.bacSiId) {
      throw new BadRequestException({ code: 'LICH_HEN_CHUA_CO_BAC_SI', message: `Lịch hẹn ${lh.maLichHen} chưa có bác sĩ phụ trách, vui lòng phân công bác sĩ tại quầy trước khi check-in.` });
    }
  }

  /**
   * Check-in lịch hẹn (dùng chung quầy và kiosk, gọi trong voiKhoaLichHen): tạo lượt cho bác sĩ của lịch,
   * phòng theo lịch hoặc theo chuyên khoa của bác sĩ, ghi chuyên khoa đã đặt; rồi lập phiếu tạm ứng.
   */
  async taoLuotTuLichHen(lh: LichHen, opts: { tiepTanId?: number | null; doiTuongUuTien?: string; ghiChu?: string }) {
    this.kiemTraLichHenCheckIn(lh);
    const bacSi = lh.bacSi ?? await this.bacSiRepo.findOne({ where: { id: lh.bacSiId! } });
    const saved = await this.luotRepo.save(this.luotRepo.create({
      benhNhanId: lh.benhNhanId,
      lichHenId: lh.id,
      tiepTanId: opts.tiepTanId ?? null,
      bacSiId: lh.bacSiId!,
      phongKhamId: lh.phongKhamId ?? (bacSi ? await this.phongCuaBacSi(bacSi) : null),
      chuyenKhoa: lh.lyDoKham?.match(/\[Chuyên khoa:\s*([^\]]+)\]/i)?.[1].trim() || null,
      doiTuongUuTien: opts.doiTuongUuTien || null,
      maSoThuTu: await this.generateNextSoThuTu(),
      thoiGianDen: new Date(),
      trangThai: TrangThaiTiepNhan.CHO_KHAM,
      ghiChu: opts.ghiChu || null,
    }));
    const luot = (await this.luotRepo.findOne({ where: { id: saved.id }, relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'] }))!;
    // Phải đóng tạm ứng (đủ phí khám trừ cọc) trước khi vào hàng đợi bác sĩ
    const phieuTu = await this.lapPhieuTamUng(saved, luot.benhNhan?.hoTen);
    return { luot, phieuTu };
  }

  /** Lượt còn hiệu lực (chưa hủy) của lịch hẹn */
  luotCuaLichHen(lichHenId: number) {
    return this.luotRepo.findOne({
      where: { lichHenId, trangThai: Not(TrangThaiTiepNhan.DA_HUY) },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
  }

  /**
   * Lập phiếu tạm ứng cho lượt vừa tạo; lỗi thì hủy lượt và báo lỗi để tiếp nhận lại,
   * tránh lượt "mồ côi" không có phiếu (không vào được hàng đợi, cũng không ai thu được).
   */
  async lapPhieuTamUng(luot: LuotTiepNhan, hoTen?: string) {
    let phieu: Awaited<ReturnType<ThanhToanService['taoPhieuTamUngTaiQuay']>>;
    try {
      phieu = await this.thanhToanService.taoPhieuTamUngTaiQuay(luot, hoTen);
    } catch (err) {
      await this.luotRepo.update(luot.id, {
        trangThai: TrangThaiTiepNhan.DA_HUY,
        ghiChu: `${luot.ghiChu || ''} [Hủy: không lập được phiếu tạm ứng]`.trim(),
      });
      throw new BadRequestException({
        code: 'KHONG_LAP_DUOC_TAM_UNG',
        message: `Không lập được phiếu tạm ứng (${(err as any)?.message || 'lỗi hệ thống'}). Vui lòng tiếp nhận lại.`,
      });
    }
    await this.baoBenhNhanDaTiepNhan(luot.id, phieu);
    return phieu;
  }

  /** Bệnh nhân có tài khoản (đặt lịch / đăng ký online): báo số thứ tự, bác sĩ, phòng và khoản tạm ứng cần đóng */
  private async baoBenhNhanDaTiepNhan(luotId: number, phieuTu: Awaited<ReturnType<ThanhToanService['taoPhieuTamUngTaiQuay']>>) {
    try {
      const luot = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['bacSi', 'bacSi.nhanVien'] });
      if (!luot) return;
      const phong: any[] = luot.phongKhamId
        ? await this.luotRepo.manager.query('SELECT ten_phong FROM phong_kham WHERE id = ? LIMIT 1', [luot.phongKhamId])
        : [];
      const tenBs = luot.bacSi?.nhanVien?.hoTen;
      const noiKham = [tenBs && `BS. ${tenBs}`, phong[0]?.ten_phong].filter(Boolean).join(' – ');
      const canThu = phieuTu ? soTienPhaiThu(phieuTu) : 0;
      const tiepTheo = luot.doiTuongUuTien === 'cap_cuu'
        ? 'Bạn là ca cấp cứu, được ưu tiên khám ngay; chi phí thanh toán sau.'
        : canThu > 0
          ? `Vui lòng đóng tạm ứng phí khám ${canThu.toLocaleString('vi-VN')} đ (${phieuTu!.maHoaDon}) tại quầy thu ngân để vào hàng chờ khám.`
          : 'Bạn không phải đóng thêm phí khám (đã có tiền cọc / BHYT), đã vào hàng chờ khám.';
      await this.thanhToanService.baoBenhNhan(luot.benhNhanId, {
        tieuDe: `Đã tiếp nhận lượt khám – số thứ tự ${luot.maSoThuTu}`,
        noiDung: `Bạn đã được tiếp nhận lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}${noiKham ? `, khám với ${noiKham}` : ''}. ${tiepTheo}`,
        loai: canThu > 0 ? 'can_thanh_toan' : 'lich_kham',
        doiTuongBang: 'luot_tiep_nhan',
        doiTuongId: luot.id,
      });
    } catch (e: any) {
      console.warn('Lỗi báo bệnh nhân đã tiếp nhận:', e?.message);
    }
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
    return loads[0];
  }

  async create(dto: TaoTiepNhanDto, tiepTanId: number) {
    const kq = await this.voiKhoaLichHen(dto.lichHenId, () => this.checkInLichHenTaiQuay(dto, tiepTanId));
    this.baoHangDoiThayDoi();
    return kq;
  }

  /**
   * Báo các màn hình hàng đợi (tiếp tân, phòng khám, TV) tải lại qua WebSocket. Trước đây chỉ phát khi
   * gọi loa / đổi ưu tiên / qua lượt nên các trang phải tự hỏi server mỗi 2,5 giây để thấy bệnh nhân mới.
   */
  private baoHangDoiThayDoi() {
    try {
      this.queueGateway.emitQueueUpdate();
    } catch (err) {
      console.warn('Lỗi emit queue update:', (err as any)?.message);
    }
  }

  /** Lễ tân check-in bệnh nhân có lịch hẹn: đã có lượt (vd. check-in ở kiosk) thì dùng lại */
  private async checkInLichHenTaiQuay(dto: TaoTiepNhanDto, tiepTanId: number) {
    const existing = await this.luotCuaLichHen(dto.lichHenId);
    if (existing) {
      return { data: existing, message: `Lịch hẹn đã được tiếp nhận trước đó. Số thứ tự: ${existing.maSoThuTu}.` };
    }
    const lh = await this.lichHenRepo.findOne({ where: { id: dto.lichHenId }, relations: ['bacSi'] });
    if (!lh) throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn.' });

    const { luot, phieuTu } = await this.taoLuotTuLichHen(lh, { tiepTanId, doiTuongUuTien: dto.doiTuongUuTien, ghiChu: dto.ghiChu });
    return {
      data: luot,
      message: `Tiếp nhận thành công. Số thứ tự: ${luot.maSoThuTu}.${phieuTu ? ' Mời bệnh nhân đóng tạm ứng tại quầy thu ngân.' : ''}`,
    };
  }

  // ─── GHI SINH HIỆU ───────────────────────────────────────────
  async ghiSinhHieu(luotId: number, dto: GhiSinhHieuDto, doBoiId: number) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });
    if ([TrangThaiTiepNhan.CHO_THANH_TOAN, TrangThaiTiepNhan.HOAN_THANH, TrangThaiTiepNhan.DA_HUY].includes(luot.trangThai)) {
      throw new BadRequestException({ code: 'LUOT_DA_KET_THUC', message: 'Lượt khám đã kết thúc, không sửa sinh hiệu được.' });
    }

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
    const luot = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['bacSi', 'benhNhan'] });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });
    if (luot.trangThai !== TrangThaiTiepNhan.CHO_KHAM) {
      throw new BadRequestException({ code: 'LUOT_KHONG_CON_CHO', message: 'Chỉ điều phối khi bệnh nhân còn đang chờ khám.' });
    }

    let bsMoi: BacSi | null = null;
    let canhBao = '';
    if (dto.bacSiId && dto.bacSiId !== luot.bacSiId) {
      bsMoi = await this.bacSiRepo.findOne({ where: { id: dto.bacSiId }, relations: ['nhanVien'] });
      if (!bsMoi) throw new BadRequestException({ code: 'BAC_SI_KHONG_TON_TAI', message: 'Không tìm thấy bác sĩ.' });
      if (!cungChuyenKhoa(luot, bsMoi)) {
        throw new BadRequestException({ code: 'KHAC_CHUYEN_KHOA', message: `BS. ${bsMoi.nhanVien?.hoTen || ''} không cùng chuyên khoa với lượt khám.` });
      }
      if (!(await this.locBacSiDangTruc([bsMoi])).length) canhBao = ` Lưu ý: BS. ${bsMoi.nhanVien?.hoTen || ''} hiện không trong ca trực.`;
    }

    await this.luotRepo.update(luotId, {
      phongKhamId: dto.phongKhamId ?? luot.phongKhamId,
      bacSiId: bsMoi?.id ?? luot.bacSiId,
    });

    if (bsMoi?.nhanVien?.nguoiDungId) {
      await this.thongBaoService.taoThongBao({
        nguoiNhanId: bsMoi.nhanVien.nguoiDungId,
        tieuDe: `Điều phối bệnh nhân đến phòng khám: ${luot.benhNhan?.hoTen || 'BN'}`,
        noiDung: `Bệnh nhân ${luot.benhNhan?.hoTen || 'BN'} (STT: ${luot.maSoThuTu}) vừa được điều phối chuyển sang phòng khám của bạn.`,
        loai: 'lich_kham',
        doiTuongBang: 'luot_tiep_nhan',
        doiTuongId: luot.id,
      }).catch((err) => console.warn('Lỗi gửi thông báo dieuPhoiPhong:', err?.message));
    }

    this.baoHangDoiThayDoi();
    const saved = await this.luotRepo.findOne({ where: { id: luotId } });
    return { data: saved, message: `Điều phối thành công.${canhBao}` };
  }

  // ─── CẬP NHẬT TRẠNG THÁI ─────────────────────────────────────
  async capNhatTrangThai(luotId: number, dto: CapNhatTrangThaiTiepNhanDto, user: any) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });
    await assertBacSiPhuTrach(this.luotRepo.manager, user, luot.bacSiId);

    // Nếu trạng thái gửi lên trùng với trạng thái hiện tại -> Idempotent thành công
    if (luot.trangThai === dto.trangThai) {
      const updated = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan', 'bacSi'] });
      return { data: updated, message: 'Lượt khám đã ở trạng thái này' };
    }

    const allowedTransitions: Record<string, string[]> = {
      [TrangThaiTiepNhan.CHO_KHAM]: [TrangThaiTiepNhan.DANG_KHAM, TrangThaiTiepNhan.DA_HUY],
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

    // Gọi vào khám đi chung một đường với nút gọi loa (kiểm tra tạm ứng, lịch hẹn, ghi lịch sử gọi)
    if (dto.trangThai === TrangThaiTiepNhan.DANG_KHAM && luot.trangThai === TrangThaiTiepNhan.CHO_KHAM) {
      const goi = await this.goiSoLoa(luotId, user);
      const updated = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan', 'bacSi'] });
      return { data: updated, callEvent: goi.callEvent, message: goi.message };
    }

    if (dto.trangThai === TrangThaiTiepNhan.DA_HUY) {
      if (!dto.loaiHuy || !dto.lyDo?.trim()) {
        throw new BadRequestException({ code: 'THIEU_LY_DO_HUY', message: 'Hủy lượt khám phải chọn lỗi bên nào và ghi lý do.' });
      }
      const huy = () => this.huyLuot(luotId, dto.loaiHuy!, sachLyDo(dto.lyDo!), user);
      const ketQua = luot.lichHenId
        ? await this.voiKhoaLichHen(luot.lichHenId, huy)
        : await voiKhoaDb(this.luotRepo.manager.connection, `luot:${luotId}`, huy);
      const updated = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan', 'bacSi'] });
      return { data: updated, callEvent: null, message: ketQua };
    }

    const kqCapNhat = await this.luotRepo.update({ id: luotId, trangThai: luot.trangThai }, { trangThai: dto.trangThai as TrangThaiTiepNhan });
    if (!kqCapNhat.affected) {
      throw new ConflictException({ code: 'LUOT_DA_THAY_DOI', message: 'Lượt khám vừa được cập nhật ở nơi khác, vui lòng tải lại.' });
    }

    let callEvent = null;
    if (dto.trangThai === 'dang_kham') {
      callEvent = await this.recordAndEmitCall(luotId);
    } else {
      if (['hoan_thanh', 'dang_cls'].includes(dto.trangThai) && this.latestCallEvent?.id === luotId) {
        this.latestCallEvent = null;
      }
      // Mọi đổi trạng thái khác (chờ khám, có kết quả CLS, chờ thanh toán…) cũng báo hàng đợi
      this.baoHangDoiThayDoi();
    }

    const updated = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan', 'bacSi'] });
    return { data: updated, callEvent, message: 'Cập nhật trạng thái thành công' };
  }

  /**
   * Lễ tân hủy lịch hẹn khám trực tiếp (kèm lượt đã check-in nếu có). Lỗi phía phòng khám → hoàn cọc;
   * phía bệnh nhân → mất cọc; tiếp nhận nhầm → chỉ hủy lượt, lịch giữ nguyên để check-in lại.
   */
  async huyLichHen(lichHenId: number, dto: HuyLichHenDto, user: any) {
    const lyDo = sachLyDo(dto.lyDo || '');
    if (!lyDo) throw new BadRequestException({ code: 'THIEU_LY_DO_HUY', message: 'Phải ghi lý do hủy.' });
    return this.voiKhoaLichHen(lichHenId, async () => {
      const lh = await this.lichHenRepo.findOne({ where: { id: lichHenId } });
      if (!lh) throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn.' });
      if (lh.hinhThuc === 'truc_tuyen') {
        throw new BadRequestException({ code: 'LICH_HEN_TRUC_TUYEN', message: 'Chức năng này chỉ dùng cho lịch khám trực tiếp.' });
      }
      if (!LICH_CON_HIEU_LUC.includes(lh.trangThai)) {
        throw new BadRequestException({ code: 'LICH_HEN_DA_KET_THUC', message: `Lịch hẹn ${lh.maLichHen} đang "${lh.trangThai}", không hủy được.` });
      }
      const luot = await this.luotCuaLichHen(lichHenId);
      if (luot) return { data: { lichHenId }, message: await this.huyLuot(luot.id, dto.loaiHuy, lyDo, user) };
      if (dto.loaiHuy === 'nham') {
        throw new BadRequestException({ code: 'CHUA_CHECK_IN', message: 'Lịch hẹn chưa check-in, không có lượt khám nào để hủy.' });
      }
      return { data: { lichHenId }, message: await this.xuLyLichHenKhiHuy(lh, dto.loaiHuy, lyDo, await this.nguoiHuy(user), null) };
    });
  }

  /**
   * Hủy lượt khám: chặn khi đã quyết toán / đã cấp thuốc / đã kết thúc khám; hủy đơn thuốc chờ, CLS chưa có kết quả,
   * hóa đơn nháp; tạm ứng TU đã thu → chờ hoàn; lịch hẹn xử lý theo lỗi bên nào. Trả về thông báo cho người dùng.
   */
  private async huyLuot(luotId: number, loaiHuy: LoaiHuy, lyDo: string, user: any): Promise<string> {
    // Đọc lại trong khóa: hai lần bấm hủy liên tiếp thì lần sau thấy lượt đã hủy
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'LUOT_KHONG_TON_TAI', message: 'Không tìm thấy lượt tiếp nhận' });
    if (!LUOT_HUY_DUOC.includes(luot.trangThai)) {
      throw new BadRequestException({ code: 'LUOT_KHONG_HUY_DUOC', message: `Lượt ${luot.maSoThuTu} đang "${luot.trangThai}" (đã kết thúc khám hoặc đã hủy), không hủy được.` });
    }
    {
      const paidHdRows: any[] = await this.luotRepo.manager.query(
        `SELECT ma_hoa_don FROM hoa_don WHERE luot_tiep_nhan_id = ? AND trang_thai = 'da_thanh_toan' LIMIT 1`,
        [luotId],
      );
      if (paidHdRows.length > 0) {
        throw new BadRequestException({
          code: 'DA_THANH_TOAN_KHONG_THE_HUY_LUOT',
          message: `Lượt khám này đã được thu tiền viện phí (Hóa đơn ${paidHdRows[0].ma_hoa_don}), không thể hủy lượt khám!`,
        });
      }

      const bakRows: any[] = await this.luotRepo.manager.query(
        `SELECT id FROM benh_an_kham WHERE luot_tiep_nhan_id = ? LIMIT 1`,
        [luotId],
      );
      if (bakRows.length > 0) {
        const bakId = bakRows[0].id;
        const dispensedRows: any[] = await this.luotRepo.manager.query(
          `SELECT ma_don_thuoc FROM don_thuoc WHERE benh_an_kham_id = ? AND trang_thai = 'da_cap_phat' LIMIT 1`,
          [bakId],
        );
        if (dispensedRows.length > 0) {
          throw new BadRequestException({
            code: 'DA_CAP_PHAT_THUOC_KHONG_THE_HUY_LUOT',
            message: `Lượt khám này đã xuất kho cấp phát đơn thuốc (${dispensedRows[0].ma_don_thuoc}), không thể hủy lượt khám!`,
          });
        }
      }
    }

    const nhan = NHAN_LOAI_HUY[loaiHuy];
    const nguoiHuy = await this.nguoiHuy(user);
    const kq = await this.luotRepo.update(
      { id: luotId, trangThai: In(LUOT_HUY_DUOC) },
      { trangThai: TrangThaiTiepNhan.DA_HUY, ghiChu: `${luot.ghiChu || ''} [${nhan}: ${lyDo} - ${nguoiHuy.ten}]`.trim() },
    );
    if (!kq.affected) return `Lượt ${luot.maSoThuTu} đã được xử lý trước đó.`;
    if (this.latestCallEvent?.id === luotId) this.latestCallEvent = null;
    const { daKham } = await this.donDepKhiHuyLuot(luotId, `${nhan}: ${lyDo}`);
    // Tạm ứng phí khám chỉ hoàn khi bệnh nhân chưa được khám; đã khám thì chỉ hoàn khi lỗi phía phòng khám / tiếp nhận nhầm
    const hoanTamUng = !daKham || loaiHuy !== 'benh_nhan';
    await this.thanhToanService.xuLyTamUngKhiHuyLuot(luot, `${nhan}: ${lyDo}`, hoanTamUng);
    this.baoHangDoiThayDoi();

    const lh = luot.lichHenId ? await this.lichHenRepo.findOne({ where: { id: luot.lichHenId } }) : null;
    const message = `Đã hủy lượt ${luot.maSoThuTu}${hoanTamUng ? '' : ' (bệnh nhân đã được khám nên không hoàn tạm ứng phí khám)'}.`;
    if (lh) return `${message} ${await this.xuLyLichHenKhiHuy(lh, loaiHuy, lyDo, nguoiHuy, luotId)}`;
    await this.ghiNhatKyHuy({ lichHenId: null, luotId, nguoiHuy, loaiHuy, lyDo, soTien: 0, trangThaiHoan: 'khong_hoan' });
    return message;
  }

  /** Báo cáo lịch / lượt bị hủy tại quầy cho Ban Giám Đốc: tổng hợp theo nhân viên và chi tiết từng lần hủy */
  async baoCaoHuyLich(query: { tuNgay?: string; denNgay?: string }) {
    const { fromDate, toDate } = khoangNgayVN(query);
    const chiTiet: any[] = await this.luotRepo.manager.query(
      `SELECT nk.id, nk.thoi_gian AS thoiGian, nk.nhan_vien_id AS nhanVienId, nk.ten_nguoi_huy AS tenNguoiHuy,
              nk.loai_huy AS loaiHuy, nk.ly_do AS lyDo, nk.so_tien_hoan_coc AS soTienHoan, nk.trang_thai_hoan AS trangThaiHoan,
              lh.ma_lich_hen AS maLichHen, lh.ngay_hen AS ngayHen, lh.gio_hen AS gioHen, bn.ho_ten AS tenBenhNhan,
              ltn.ma_so_thu_tu AS maSoThuTu
         FROM nhat_ky_huy_lich nk
         LEFT JOIN lich_hen lh ON lh.id = nk.lich_hen_id
         LEFT JOIN luot_tiep_nhan ltn ON ltn.id = nk.luot_tiep_nhan_id
         LEFT JOIN benh_nhan bn ON bn.id = COALESCE(lh.benh_nhan_id, ltn.benh_nhan_id)
        WHERE DATE(nk.thoi_gian) BETWEEN ? AND ?
        ORDER BY nk.thoi_gian DESC`,
      [fromDate, toDate],
    );
    const theoNhanVien = new Map<string, any>();
    for (const r of chiTiet) {
      r.soTienHoan = Number(r.soTienHoan);
      const key = String(r.nhanVienId ?? r.tenNguoiHuy);
      const nv = theoNhanVien.get(key) ?? { nhanVienId: r.nhanVienId, tenNguoiHuy: r.tenNguoiHuy, tong: 0, phong_kham: 0, benh_nhan: 0, nham: 0, tienHoan: 0 };
      nv.tong += 1;
      nv[r.loaiHuy] = (nv[r.loaiHuy] || 0) + 1;
      if (r.trangThaiHoan !== 'tu_choi') nv.tienHoan += r.soTienHoan;
      theoNhanVien.set(key, nv);
    }
    return {
      data: { tuNgay: fromDate, denNgay: toDate, theoNhanVien: [...theoNhanVien.values()].sort((a, b) => b.tong - a.tong), chiTiet },
      message: 'Lấy báo cáo hủy lịch thành công',
    };
  }

  /** Nhân viên thực hiện hủy (ghi vào lịch, lượt và nhật ký hủy) */
  private async nguoiHuy(user: any) {
    const nguoiDungId = user?.id || user?.userId;
    const nv = nguoiDungId ? await this.luotRepo.manager.findOne(NhanVien, { where: { nguoiDungId } }) : null;
    return { nhanVienId: nv?.id ?? null, ten: nv?.hoTen || user?.tenDangNhap || user?.vai_tro || 'không rõ' };
  }

  private async ghiNhatKyHuy(d: {
    lichHenId: number | null; luotId: number | null; nguoiHuy: { nhanVienId: number | null; ten: string };
    loaiHuy: LoaiHuy; lyDo: string; soTien: number; trangThaiHoan: 'khong_hoan' | 'cho_duyet' | 'tu_dong';
  }) {
    await this.luotRepo.manager.query(
      `INSERT INTO nhat_ky_huy_lich (lich_hen_id, luot_tiep_nhan_id, nhan_vien_id, ten_nguoi_huy, loai_huy, ly_do, so_tien_hoan_coc, trang_thai_hoan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.lichHenId, d.luotId, d.nguoiHuy.nhanVienId, d.nguoiHuy.ten, d.loaiHuy, d.lyDo.slice(0, 500), d.soTien, d.trangThaiHoan],
    ).catch((e) => console.warn('Lỗi ghi nhật ký hủy lịch:', e?.message));
  }

  /**
   * Lịch hẹn khi bị hủy (hoặc lượt của nó bị hủy) — tiền cọc theo lỗi bên nào:
   * - phía bệnh nhân: theo quy định hủy của giám đốc (đủ thời hạn → hoàn %; sát giờ / đã check-in rồi bỏ về → không hoàn);
   * - phía phòng khám: hoàn 100% nhưng phải chờ Ban Giám Đốc duyệt mới được chi (chống lễ tân tự ý hoàn);
   * - tiếp nhận nhầm: lịch giữ nguyên.
   * Bệnh nhân luôn được báo (kèm lý do, người hủy) để khiếu nại được nếu bị ghi sai.
   */
  private async xuLyLichHenKhiHuy(
    lh: LichHen, loaiHuy: LoaiHuy, lyDo: string, nguoiHuy: { nhanVienId: number | null; ten: string }, luotId: number | null,
  ): Promise<string> {
    const nhatKy = { lichHenId: lh.id, luotId, nguoiHuy, loaiHuy, lyDo };
    if (loaiHuy === 'nham') {
      await this.lichHenRepo.update({ id: lh.id, trangThai: TrangThaiLichHen.DANG_KHAM }, { trangThai: TrangThaiLichHen.DA_XAC_NHAN });
      await this.ghiNhatKyHuy({ ...nhatKy, soTien: 0, trangThaiHoan: 'khong_hoan' });
      return `Lịch hẹn ${lh.maLichHen} giữ nguyên, có thể check-in lại.`;
    }

    // Cọc thực đã thu qua PayOS (lịch lễ tân đặt không thu cọc thì không có gì để hoàn)
    const maHdCoc = `HDT${lh.maLichHen.replace(/^LH/i, '')}`.slice(0, 20);
    const [coc]: any[] = await this.luotRepo.manager.query(
      `SELECT thuc_thu FROM hoa_don WHERE ma_hoa_don = ? AND trang_thai = 'da_thanh_toan' LIMIT 1`,
      [maHdCoc],
    );
    const tienCoc = Number(coc?.thuc_thu || 0);
    const daCheckIn = luotId !== null;

    let soTienHoan = 0;
    let moTaCoc: string;
    if (loaiHuy === 'benh_nhan') {
      const qd = await this.lichHenService.quyDinhHoanCocKhiBenhNhanHuy(lh);
      if (tienCoc > 0 && !daCheckIn && qd.duHan) soTienHoan = Math.round(tienCoc * qd.phanTramHoan / 100);
      moTaCoc = !(tienCoc > 0)
        ? 'không có tiền cọc'
        : soTienHoan > 0
          ? `hoàn ${qd.phanTramHoan}% cọc (${soTienHoan.toLocaleString('vi-VN')} đ) vì hủy trước giờ hẹn ít nhất ${qd.gioToiThieu} giờ`
          : daCheckIn
            ? 'giữ cọc (đã check-in rồi bỏ về)'
            : qd.duHan ? 'giữ cọc (quy định không hoàn)' : `giữ cọc (hủy sát giờ, dưới ${qd.gioToiThieu} giờ trước giờ hẹn)`;
    } else {
      soTienHoan = tienCoc;
      moTaCoc = tienCoc > 0
        ? `hoàn 100% cọc (${tienCoc.toLocaleString('vi-VN')} đ) sau khi Ban Giám Đốc duyệt`
        : 'không có tiền cọc';
    }
    const canDuyet = loaiHuy === 'phong_kham' && soTienHoan > 0;

    const ghiChu = `${lh.ghiChu || ''}${soTienHoan > 0 ? ` [CHỜ HOÀN CỌC ${soTienHoan.toLocaleString('vi-VN')}đ]` : ''}${canDuyet ? ` ${MARKER_CHO_DUYET_HOAN}` : ''} [${NHAN_LOAI_HUY[loaiHuy]}: ${lyDo} - ${nguoiHuy.ten}]`.trim();
    const kq = await this.lichHenRepo.update(
      { id: lh.id, trangThai: In(LICH_CON_HIEU_LUC) },
      { trangThai: loaiHuy === 'benh_nhan' && daCheckIn ? TrangThaiLichHen.VANG_MAT : TrangThaiLichHen.DA_HUY, ghiChu },
    );
    if (!kq.affected) return `Lịch hẹn ${lh.maLichHen} đã được xử lý trước đó.`;

    if (soTienHoan > 0) {
      await this.lichHenService.yeuCauHoanCocHoaDonTamUng({ ...lh, ghiChu, trangThai: TrangThaiLichHen.DA_HUY }, `${NHAN_LOAI_HUY[loaiHuy]}: ${lyDo}`, undefined, soTienHoan);
      if (canDuyet) {
        await this.luotRepo.manager.query(`UPDATE hoa_don SET ghi_chu = CONCAT(ghi_chu, ' ', ?) WHERE ma_hoa_don = ?`, [MARKER_CHO_DUYET_HOAN, maHdCoc]);
        await this.trinhDuyetHoanCoc(lh, lyDo, nguoiHuy, soTienHoan);
      }
    }
    await this.ghiNhatKyHuy({ ...nhatKy, soTien: soTienHoan, trangThaiHoan: canDuyet ? 'cho_duyet' : soTienHoan > 0 ? 'tu_dong' : 'khong_hoan' });

    await this.baoBenhNhanHuyLich(lh,
      loaiHuy === 'phong_kham' ? `Phòng khám hủy lịch hẹn ${lh.maLichHen}` : `Lịch hẹn ${lh.maLichHen} đã được hủy`,
      `${loaiHuy === 'phong_kham' ? 'Rất xin lỗi, phòng khám' : 'Theo yêu cầu của bạn, phòng khám'} đã hủy lịch hẹn ${lh.maLichHen} ngày ${String(lh.ngayHen).slice(0, 10)} lúc ${String(lh.gioHen).slice(0, 5)}. Lý do: ${lyDo}. Người thực hiện: ${nguoiHuy.ten}. Tiền cọc: ${moTaCoc}.${soTienHoan > 0 ? ' Vui lòng cập nhật tài khoản nhận hoàn trong mục Lịch hẹn hoặc nhận tại quầy thu ngân.' : ''} Nếu thông tin không đúng, vui lòng liên hệ phòng khám.`,
    );
    if (soTienHoan > 0 && !canDuyet) {
      await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
        tieuDe: `Cần hoàn cọc lịch hẹn ${lh.maLichHen}`,
        noiDung: `Bệnh nhân hủy lịch hẹn ${lh.maLichHen} đủ thời hạn: hoàn ${soTienHoan.toLocaleString('vi-VN')} đ tiền cọc.`,
        loai: 'can_thanh_toan',
        doiTuongBang: 'lich_hen',
        doiTuongId: lh.id,
      }).catch((e) => console.warn('Lỗi báo thu ngân hoàn cọc:', e?.message));
    }
    return `Lịch hẹn ${lh.maLichHen} đã hủy; ${moTaCoc}.`;
  }

  /** Đơn trình Ban Giám Đốc duyệt khoản hoàn cọc lễ tân ghi "lỗi phía phòng khám" (duyệt ở trang Phê duyệt đơn) */
  private async trinhDuyetHoanCoc(lh: LichHen, lyDo: string, nguoiHuy: { nhanVienId: number | null; ten: string }, soTien: number) {
    const benhNhan = await this.benhNhanRepo.findOne({ where: { id: lh.benhNhanId } });
    const don = await this.luotRepo.manager.getRepository(DonGui).save({
      nguoiGuiId: nguoiHuy.nhanVienId ?? 1, // tài khoản không gắn nhân viên (quản trị): ghi theo nhân viên mặc định như đơn hủy ca của bác sĩ
      loaiDon: LOAI_DON_DUYET_HOAN_COC,
      noiDung: `[LH_HOAN_COC: ${lh.id}] ${nguoiHuy.ten} hủy lịch hẹn ${lh.maLichHen} (ngày ${String(lh.ngayHen).slice(0, 10)} lúc ${String(lh.gioHen).slice(0, 5)}) của bệnh nhân ${benhNhan?.hoTen || ''} với lý do LỖI PHÍA PHÒNG KHÁM: ${lyDo}. Đề nghị hoàn ${soTien.toLocaleString('vi-VN')} đ tiền cọc. Duyệt: thu ngân được chi; từ chối: không hoàn.`,
      trangThai: TrangThaiDonGui.CHO_XU_LY,
    });
    await this.thongBaoService.taoThongBaoTheoRole('ban_giam_doc', {
      tieuDe: `Duyệt hoàn cọc: ${lh.maLichHen}`,
      noiDung: `${nguoiHuy.ten} hủy lịch ${lh.maLichHen} vì lỗi phía phòng khám (${lyDo}), đề nghị hoàn ${soTien.toLocaleString('vi-VN')} đ.`,
      loai: 'don_tu',
      doiTuongBang: 'don_gui',
      doiTuongId: don.id,
    }).catch((e) => console.warn('Lỗi báo giám đốc duyệt hoàn cọc:', e?.message));
  }

  /** Báo bệnh nhân (thông báo trong app + email) khi lịch hẹn bị hủy tại quầy */
  private async baoBenhNhanHuyLich(lh: LichHen, tieuDe: string, noiDung: string) {
    const benhNhan = await this.benhNhanRepo.findOne({ where: { id: lh.benhNhanId } });
    if (benhNhan?.nguoiDungId) {
      await this.thongBaoService.taoThongBao({
        nguoiNhanId: benhNhan.nguoiDungId, tieuDe, noiDung, loai: 'lich_hen', doiTuongBang: 'lich_hen', doiTuongId: lh.id,
      }).catch((e) => console.warn('Lỗi báo bệnh nhân hủy lịch:', e?.message));
    }
    if (benhNhan?.email) this.lichHenService.guiEmailBenhNhan(benhNhan.email, tieuDe, noiDung);
  }

  // ─── PHÁT ÂM THANH GIỌNG NÓI TIẾNG VIỆT CHUẨN (TTS MP3) ───────
  async streamVietnameseTts(text: string, res: any) {
    if (!text || !text.trim()) {
      return res.status(400).send('Thiếu text');
    }
    const cleanText = text.trim();
    // Endpoint công khai: chỉ đọc câu gọi số / câu thử loa, tránh bị dùng làm proxy TTS miễn phí
    if (cleanText.length > 200 || !(/^Xin mời /i.test(cleanText) || cleanText === CAU_THU_LOA)) {
      return res.status(400).send('Nội dung không hợp lệ');
    }
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

  /**
   * Đổi đối tượng ưu tiên khi bệnh nhân còn chờ khám (vd. trở nặng → cấp cứu).
   * Cấp cứu được khám trước và thu tiền sau nên: bật/bỏ phải ghi lý do, chỉ bác sĩ (hoặc quản trị) được bỏ,
   * bỏ cấp cứu thì lập lại phiếu tạm ứng và bệnh nhân rời hàng đợi đến khi đóng tiền.
   */
  async capNhatUuTien(luotId: number, doiTuongUuTien: string | null, lyDo: string | undefined, user: any) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId }, relations: ['benhNhan'] });
    if (!luot) throw new NotFoundException({ code: 'KHONG_TIM_THAY', message: 'Không tìm thấy lượt tiếp nhận' });
    if (doiTuongUuTien && !DOI_TUONG_UU_TIEN.includes(doiTuongUuTien)) {
      throw new BadRequestException({ code: 'UU_TIEN_KHONG_HOP_LE', message: 'Đối tượng ưu tiên không hợp lệ' });
    }
    if (luot.trangThai !== TrangThaiTiepNhan.CHO_KHAM) {
      throw new BadRequestException({ code: 'LUOT_KHONG_CON_CHO', message: 'Chỉ đổi ưu tiên khi bệnh nhân còn đang chờ khám.' });
    }
    const batCapCuu = doiTuongUuTien === 'cap_cuu' && luot.doiTuongUuTien !== 'cap_cuu';
    const boCapCuu = luot.doiTuongUuTien === 'cap_cuu' && doiTuongUuTien !== 'cap_cuu';
    const lyDoText = (lyDo || '').trim();
    if ((batCapCuu || boCapCuu) && !lyDoText) {
      throw new BadRequestException({ code: 'THIEU_LY_DO', message: 'Phải ghi lý do khi chuyển hoặc bỏ cấp cứu.' });
    }
    if (boCapCuu && !['bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao'].includes(user?.vai_tro)) {
      throw new BadRequestException({ code: 'KHONG_DUOC_BO_CAP_CUU', message: 'Chỉ bác sĩ được bỏ phân loại cấp cứu.' });
    }

    const nguoiThucHien = user?.tenDangNhap || user?.vai_tro || 'không rõ';
    await this.luotRepo.update(luotId, {
      doiTuongUuTien: doiTuongUuTien || null,
      ...(batCapCuu || boCapCuu
        ? { ghiChu: `${luot.ghiChu || ''} [${batCapCuu ? 'Chuyển cấp cứu' : 'Bỏ cấp cứu'}: ${lyDoText} - ${nguoiThucHien}]`.trim() }
        : {}),
    });
    let message = doiTuongUuTien ? `Đã đặt ${luot.maSoThuTu} là đối tượng ưu tiên.` : `Đã bỏ ưu tiên của ${luot.maSoThuTu}.`;
    if (batCapCuu) await this.thanhToanService.chuyenCapCuu(luotId);
    if (boCapCuu) {
      const phieu = await this.thanhToanService.taoPhieuTamUngTaiQuay({ ...luot, doiTuongUuTien: doiTuongUuTien || null }, luot.benhNhan?.hoTen);
      if (phieu?.trangThai === 'cho_thanh_toan') message += ' Bệnh nhân cần đóng tạm ứng trước khi được gọi khám.';
    }
    if (batCapCuu || boCapCuu) {
      await this.thongBaoService.taoThongBaoTheoRole('quan_tri_vien', {
        tieuDe: `${batCapCuu ? 'Chuyển' : 'Bỏ'} cấp cứu: ${luot.benhNhan?.hoTen || ''} (${luot.maSoThuTu})`,
        noiDung: `Lý do: ${lyDoText}. Người thực hiện: ${nguoiThucHien}.`,
        loai: 'phe_duyet',
        doiTuongBang: 'luot_tiep_nhan',
        doiTuongId: luotId,
      }).catch((e) => console.warn('Lỗi báo đổi cấp cứu:', e?.message));
    }
    this.queueGateway.emitQueueUpdate();
    return { data: { id: luotId, doiTuongUuTien: doiTuongUuTien || null }, message };
  }

  /** Gọi mà bệnh nhân không có mặt: trả về hàng chờ, xếp cuối hàng tính từ lúc này; quay lại thì gọi lại bình thường */
  async quaLuot(luotId: number, user: any) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'KHONG_TIM_THAY', message: 'Không tìm thấy lượt tiếp nhận' });
    await assertBacSiPhuTrach(this.luotRepo.manager, user, luot.bacSiId);
    if (luot.trangThai !== TrangThaiTiepNhan.DANG_KHAM) {
      throw new BadRequestException({ code: 'KHONG_THE_QUA_LUOT', message: 'Chỉ qua lượt khi bệnh nhân vừa được gọi vào khám mà không có mặt.' });
    }
    const soLan = (luot.soLanQuaLuot || 0) + 1;
    await this.luotRepo.manager.query(
      `UPDATE lich_su_goi_kham SET ket_qua = 'vang_mat' WHERE luot_tiep_nhan_id = ? ORDER BY id DESC LIMIT 1`,
      [luotId],
    );
    if (this.latestCallEvent?.id === luotId) this.latestCallEvent = null;
    let message: string;
    if (soLan >= SO_LAN_QUA_LUOT_TOI_DA) {
      await this.luotRepo.update(luotId, { soLanQuaLuot: soLan });
      await this.huyLuotVangMat(luot, `gọi ${soLan} lần không có mặt`);
      message = `${luot.maSoThuTu} vắng mặt ${soLan} lần: đã hủy lượt khám. Tạm ứng đã đóng sẽ được thu ngân hoàn lại.`;
    } else {
      await this.luotRepo.update(luotId, { trangThai: TrangThaiTiepNhan.CHO_KHAM, quaLuotLuc: new Date(), soLanQuaLuot: soLan });
      // Bệnh nhân quay lại hàng chờ: lịch hẹn về "đã xác nhận" (gọi lại thì lichHenDangKham đặt lại "đang khám")
      if (luot.lichHenId) {
        await this.lichHenRepo.update({ id: luot.lichHenId, trangThai: TrangThaiLichHen.DANG_KHAM }, { trangThai: TrangThaiLichHen.DA_XAC_NHAN });
      }
      message = `${luot.maSoThuTu} vắng mặt, đã qua lượt (lần ${soLan}/${SO_LAN_QUA_LUOT_TOI_DA}). Bệnh nhân quay lại sẽ được gọi theo thứ tự mới.`;
    }
    this.queueGateway.emitQueueUpdate();
    return { data: { id: luotId, soLanQuaLuot: soLan }, message };
  }

  /** Chưa đóng tạm ứng (và không phải cấp cứu) thì không được gọi vào khám */
  private async kiemTraDaDongTamUng(luot: LuotTiepNhan) {
    if (!(await this.thanhToanService.daDuDieuKienKham(luot))) {
      throw new BadRequestException({
        code: 'CHUA_DONG_TAM_UNG',
        message: `${luot.maSoThuTu} chưa đóng tạm ứng phí khám, chưa thể gọi vào khám.`,
      });
    }
  }

  /** Bệnh nhân có lịch hẹn được gọi vào khám → lịch hẹn "đang khám" */
  private async lichHenDangKham(luot: LuotTiepNhan) {
    if (!luot.lichHenId) return;
    await this.lichHenRepo.update(
      { id: luot.lichHenId, trangThai: TrangThaiLichHen.DA_XAC_NHAN },
      { trangThai: TrangThaiLichHen.DANG_KHAM },
    );
  }

  async goiSoLoa(luotId: number, user: any) {
    const luot = await this.luotRepo.findOne({ where: { id: luotId } });
    if (!luot) throw new NotFoundException({ code: 'KHONG_TIM_THAY', message: 'Không tìm thấy lượt tiếp nhận' });
    await assertBacSiPhuTrach(this.luotRepo.manager, user, luot.bacSiId);
    const nguoiThucHienId = user?.id || user?.userId;

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

    if (luot.trangThai === TrangThaiTiepNhan.CHO_KHAM) await this.kiemTraDaDongTamUng(luot);

    const lanGoi = await this.lichSuGoiRepo.count({ where: { luotTiepNhanId: luotId } }) + 1;
    const loaiGoi = luot.trangThai === TrangThaiTiepNhan.CHO_KHAM ? 'goi_lan_dau' : 'goi_lai';
    if (luot.trangThai === TrangThaiTiepNhan.CHO_KHAM) {
      const kq = await this.luotRepo.update({ id: luotId, trangThai: TrangThaiTiepNhan.CHO_KHAM }, { trangThai: TrangThaiTiepNhan.DANG_KHAM });
      if (!kq.affected) throw new ConflictException({ code: 'LUOT_DA_THAY_DOI', message: 'Lượt khám vừa được cập nhật ở nơi khác, vui lòng tải lại.' });
      await this.lichHenDangKham(luot);
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
    await this.quetHangDoi();

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

    // Hàng chờ đã đóng tạm ứng, theo thứ tự ưu tiên (lịch hẹn đến giờ trước)
    const choKhamAll = await this.danhSachChoKham();

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
      const choKhamList = choKhamAll.filter((c) => roomLuot.some((l) => l.id === c.id));
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
          hoTen: cheTen(chuanBiLuot.benhNhan?.hoTen),
        } : null,
        soNguoiCho: choKhamList.length,
        danhSachCho: choKhamList.map((l) => ({
          id: l.id,
          maSoThuTu: l.maSoThuTu,
          hoTen: cheTen(l.benhNhan?.hoTen),
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

    // Khoảng ngày theo giờ VN (dùng chung với các trang báo cáo khác).
    // Trước đây "7 ngày qua" thực chất lấy 8 ngày; "Toàn thời gian" thì không lọc ngày.
    const { fromDate, toDate } = khoangNgayVN(
      { range: query.khoangThoiGian || 'tat_ca', tuNgay: query.tuNgay, denNgay: query.denNgay },
      'tat_ca',
    );
    const tuNgay = fromDate === NGAY_DAU_TIEN ? null : `${fromDate} 00:00:00`;
    const denNgay = fromDate === NGAY_DAU_TIEN ? null : `${toDate} 23:59:59`;

    if (tuNgay) qb.andWhere('ltn.thoiGianDen >= :tuNgay', { tuNgay });
    if (denNgay) qb.andWhere('ltn.thoiGianDen <= :denNgay', { denNgay });

    // 1. Tổng lượt
    const tongLuot = await qb.getCount();

    // 2. Đặt lịch vs Vãng lai
    const qbDatLich = qb.clone()
      .leftJoin('ltn.lichHen', 'lh')
      .andWhere('lh.nguonDat = :nguon', { nguon: 'benh_nhan_tu_dat' });
    const datLichCount = await qbDatLich.getCount();
    const coLichHenCount = await qb.clone().innerJoin('ltn.lichHen', 'lhAny').getCount();
    const henQuaNhanVienCount = Math.max(0, coLichHenCount - datLichCount);
    const vangLaiCount = Math.max(0, tongLuot - coLichHenCount);

    // 3. Theo trạng thái
    const qbChoKham = qb.clone().andWhere('ltn.trangThai IN (:...st)', { st: ['cho_kham', 'dang_cls', 'da_co_kq_cls'] });
    const choKhamCount = await qbChoKham.getCount();

    const qbDangKham = qb.clone().andWhere('ltn.trangThai = :st', { st: 'dang_kham' });
    const dangKhamCount = await qbDangKham.getCount();

    const qbHoanThanh = qb.clone().andWhere('ltn.trangThai = :st', { st: 'hoan_thanh' });
    const hoanThanhCount = await qbHoanThanh.getCount();

    const qbDaHuy = qb.clone().andWhere('ltn.trangThai = :st', { st: 'da_huy' });
    const daHuyCount = await qbDaHuy.getCount();

    const choThanhToanCount = await qb.clone().andWhere('ltn.trangThai = :st', { st: 'cho_thanh_toan' }).getCount();

    // Lượt đã hủy không đi hết quy trình nên không tính vào mẫu số
    const luotHopLe = tongLuot - daHuyCount;
    const tyLeHoanThanh = luotHopLe > 0 ? Number(((hoanThanhCount / luotHopLe) * 100).toFixed(1)) : null;

    // 4. Phân bổ theo chuyên khoa / phòng khám
    const qbPhong = qb.clone()
      .leftJoin('phong_kham', 'pk', 'pk.id = ltn.phongKhamId')
      .select('COALESCE(pk.ten_phong, "Chưa chỉ định phòng") as tenPhong')
      .addSelect('COALESCE(pk.chuyen_khoa, "Chung") as chuyenKhoa')
      .addSelect('COUNT(ltn.id) as soLuot')
      .groupBy('pk.id, pk.ten_phong, pk.chuyen_khoa')
      .orderBy('soLuot', 'DESC');

    const phongKhamRaw = await qbPhong.getRawMany();
    // Danh sách phòng thật cho bộ lọc (trước đây frontend gán cứng 6 phòng id 1–6)
    const danhSachPhong = (await this.luotRepo.query(
      'SELECT id, ten_phong AS tenPhong, chuyen_khoa AS chuyenKhoa FROM phong_kham ORDER BY ten_phong',
    )).map((r: any) => ({ id: Number(r.id), tenPhong: r.tenPhong, chuyenKhoa: r.chuyenKhoa }));

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
    const ngoaiGio = Object.entries(gioMap)
      .filter(([gio]) => Number(gio) < 7 || Number(gio) >= 19)
      .reduce((a, [, n]) => a + n, 0);
    if (ngoaiGio > 0) khungGioConfig.push({ khung: 'Trước 7h / sau 19h', label: 'Ngoài giờ', count: ngoaiGio });

    // 6. Đối tượng bệnh nhân theo nhóm tuổi & giới tính
    const TUOI = 'TIMESTAMPDIFF(YEAR, bn.ngaySinh, ltn.thoiGianDen)';
    const demTuoi = (dk: string) => qb.clone().leftJoin('ltn.benhNhan', 'bn').andWhere(dk).getCount();
    const treEmCount = await demTuoi(`bn.ngaySinh IS NOT NULL AND ${TUOI} < 16`);
    const caoTuoiCount = await demTuoi(`bn.ngaySinh IS NOT NULL AND ${TUOI} >= 60`);
    const khongRoTuoiCount = await demTuoi('bn.ngaySinh IS NULL');
    const nguoiLonCount = Math.max(0, tongLuot - treEmCount - caoTuoiCount - khongRoTuoiCount);

    // 6b. Thời gian chờ khám TB: từ lúc đến quầy (thoi_gian_den) tới lúc bác sĩ mở phiếu khám (ngay_kham).
    // Bỏ mốc âm và chờ > 4 giờ (dữ liệu nhập sai / lượt bị treo).
    const choParams: any[] = [];
    let choQuery = `
      SELECT AVG(TIMESTAMPDIFF(SECOND, ltn.thoi_gian_den, bak.ngay_kham)) / 60 AS phut, COUNT(*) AS soLuot
        FROM luot_tiep_nhan ltn JOIN benh_an_kham bak ON bak.luot_tiep_nhan_id = ltn.id
       WHERE TIMESTAMPDIFF(SECOND, ltn.thoi_gian_den, bak.ngay_kham) BETWEEN 0 AND 14400
    `;
    if (tuNgay) { choQuery += ' AND ltn.thoi_gian_den >= ?'; choParams.push(tuNgay); }
    if (denNgay) { choQuery += ' AND ltn.thoi_gian_den <= ?'; choParams.push(denNgay); }
    const [choRaw] = await this.luotRepo.query(choQuery, choParams);
    const soLuotDoThoiGianCho = Number(choRaw?.soLuot || 0);
    const thoiGianChoTrungBinhPhut = soLuotDoThoiGianCho > 0 ? Math.round(Number(choRaw.phut)) : null;

    // 7. Thống kê đánh giá của bệnh nhân về tiếp đón & quy trình khám
    let danhGiaList: any[] = [];
    let diemTrungBinhTiepDon: number | null = null;
    let diemTrungBinhChung: number | null = null;
    let diemTrungBinhBacSi: number | null = null;
    let tyLeHaiLongTiepDon: number | null = null;
    let tongSoDanhGia = 0;

    try {
      // Bỏ đánh giá ca khám trực tuyến: ca online không qua quầy tiếp đón, và khi lưu
      // danh-gia.service gán diem_tiep_don = diem_bac_si → trước đây làm sai điểm hài lòng tiếp đón.
      const dgQb = this.danhGiaRepo.createQueryBuilder('dg')
        .leftJoinAndSelect('dg.benhNhan', 'bn')
        .leftJoinAndSelect('dg.bacSi', 'bs')
        .leftJoinAndSelect('bs.nhanVien', 'bsNv')
        .leftJoin('dg.lichHen', 'dgLh')
        .where("(dgLh.id IS NULL OR dgLh.hinhThuc IS NULL OR dgLh.hinhThuc <> 'truc_tuyen')")
        .orderBy('dg.taoLuc', 'DESC');

      if (tuNgay) dgQb.andWhere('dg.taoLuc >= :tuNgay', { tuNgay });
      if (denNgay) dgQb.andWhere('dg.taoLuc <= :denNgay', { denNgay });

      const allDg = await dgQb.getMany();
      tongSoDanhGia = allDg.length;

      if (tongSoDanhGia > 0) {
        const tb = (f: (d: any) => number) =>
          Number((allDg.reduce((acc, cur) => acc + Number(f(cur) || 0), 0) / tongSoDanhGia).toFixed(1));
        diemTrungBinhTiepDon = tb((d) => d.diemTiepDon);
        diemTrungBinhChung = tb((d) => d.diemTrungBinh);
        diemTrungBinhBacSi = tb((d) => d.diemBacSi);
        // Hài lòng = chấm khâu tiếp đón từ 4 sao trở lên
        const soHaiLong = allDg.filter((d) => Number(d.diemTiepDon) >= 4).length;
        tyLeHaiLongTiepDon = Number(((soHaiLong / tongSoDanhGia) * 100).toFixed(1));
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
        henQuaNhanVienCount,
        vangLaiCount,
        choKhamCount,
        dangKhamCount,
        choThanhToanCount,
        hoanThanhCount,
        daHuyCount,
        tyLeHoanThanh,
        thoiGianChoTrungBinhPhut,
        soLuotDoThoiGianCho,
        theoPhongKham,
        danhSachPhong,
        khungGio: khungGioConfig,
        nhomTuoi: {
          treEm: treEmCount,
          nguoiLon: nguoiLonCount,
          caoTuoi: caoTuoiCount,
          khongRo: khongRoTuoiCount,
        },
        danhGia: {
          tongSoDanhGia,
          diemTrungBinhTiepDon,
          diemTrungBinhChung,
          diemTrungBinhBacSi,
          tyLeHaiLongTiepDon,
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
    // Xuất Excel lấy cả kỳ trong 1 lần gọi → cho phép limit lớn nhưng chặn trần để tránh quá tải
    const limit = Math.min(5000, Math.max(1, Number(query.limit) || 15));
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

    // Khoảng ngày theo giờ VN (dùng chung với các trang báo cáo khác).
    // Trước đây "7 ngày qua" thực chất lấy 8 ngày; "Toàn thời gian" thì không lọc ngày.
    const { fromDate, toDate } = khoangNgayVN(
      { range: query.khoangThoiGian || 'tat_ca', tuNgay: query.tuNgay, denNgay: query.denNgay },
      'tat_ca',
    );
    const tuNgay = fromDate === NGAY_DAU_TIEN ? null : `${fromDate} 00:00:00`;
    const denNgay = fromDate === NGAY_DAU_TIEN ? null : `${toDate} 23:59:59`;

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

    // Lọc hình thức tiếp đón — cùng 3 nhóm với thẻ KPI: bệnh nhân tự đặt online / hẹn qua nhân viên / vãng lai.
    // (Trước đây lịch nhân viên đặt hộ bị gộp vào vãng lai, lịch có nguon_dat NULL thì rơi khỏi cả hai nhóm.)
    if (query.loaiTiepNhan === 'dat_lich') {
      qb.andWhere('lh.nguonDat = :nguon', { nguon: 'benh_nhan_tu_dat' });
    } else if (query.loaiTiepNhan === 'hen_nhan_vien') {
      qb.andWhere('ltn.lichHenId IS NOT NULL AND (lh.nguonDat IS NULL OR lh.nguonDat != :nguon)', { nguon: 'benh_nhan_tu_dat' });
    } else if (query.loaiTiepNhan === 'vang_lai') {
      qb.andWhere('ltn.lichHenId IS NULL');
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
      loaiTiepNhan: !i.lichHenId ? 'vang_lai' : i.lichHen?.nguonDat === 'benh_nhan_tu_dat' ? 'dat_lich' : 'hen_nhan_vien',
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

  // Upload video gửi trong chat khám trực tuyến lên Cloudinary, trả về URL
  async uploadTelehealthVideo(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn video hợp lệ');
    return { url: await uploadToCloudinary(file.buffer, 'phongkham/telehealth', 'video') };
  }
}
