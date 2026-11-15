import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { HoSoBenhAn, BenhAnKham, TrangThaiBenhAnKham } from './entities/ho-so-benh-an.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { maHoSoTiepTheo, voiKhoaDb } from '../../common/utils/db-sequence.util';
import {
  IsInt, IsPositive, IsOptional, IsString, IsEnum, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ChiDinhCanLamSang, KetQuaXetNghiem, TrangThaiChiDinh } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { LuotTiepNhan, SinhHieu, TrangThaiTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { ThanhToanService } from '../thanh-toan/thanh-toan.service';

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
  @ApiPropertyOptional() @IsOptional() @IsString() trieuChung?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chanDoanSoBo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chanDoanXacDinh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ketQuaKham?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phuongPhapDieuTri?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() taiKham?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ghiChu?: string;
}

// ──── SERVICE ──────────────────────────────────────────────
@Injectable()
export class HoSoBenhAnService {
  /** Mã hồ sơ từ bộ đếm trong DB (không trùng khi chạy nhiều instance) */
  private generateNextMaHoSo(): Promise<string> {
    return maHoSoTiepTheo(this.hoSoRepo.manager);
  }

  constructor(
    @InjectRepository(HoSoBenhAn)        private hoSoRepo: Repository<HoSoBenhAn>,
    @InjectRepository(BenhAnKham)        private benhAnRepo: Repository<BenhAnKham>,
    @InjectRepository(NhanVien)          private nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(BacSi)             private bacSiRepo: Repository<BacSi>,
    @InjectRepository(ChiDinhCanLamSang) private clsRepo: Repository<ChiDinhCanLamSang>,
    @InjectRepository(KetQuaXetNghiem)  private ketQuaClsRepo: Repository<KetQuaXetNghiem>,
    @InjectRepository(DonThuoc)          private donThuocRepo: Repository<DonThuoc>,
    @InjectRepository(LichHen)           private lichHenRepo: Repository<LichHen>,
    @InjectRepository(LuotTiepNhan)      private tiepNhanRepo: Repository<LuotTiepNhan>,
    @InjectRepository(BenhNhan)          private benhNhanRepo: Repository<BenhNhan>,
    @InjectRepository(HoaDon)            private hoaDonRepo: Repository<HoaDon>,
    private readonly thanhToanService: ThanhToanService,
  ) {}

  /**
   * Thống kê & Báo cáo hiệu suất Bác sĩ. Chỉ số nào chưa đủ dữ liệu trả về null (frontend hiện "—").
   */
  async getThongKeBacSi(userId: number, filter: { range?: string; hinhThuc?: string; tuNgay?: string; denNgay?: string }) {
    // Người dùng không gắn với bác sĩ nào → không có dữ liệu (trước đây rơi về số liệu của bác sĩ id=1)
    let bacSiId = -1;
    let thongTinBacSi = {
      id: 0,
      hoTen: 'Bác sĩ',
      chuyenKhoa: '',
      maBacSi: '',
      soDienThoai: '',
      email: '',
    };

    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    if (nv) {
      const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: nv.id } });
      if (bs) {
        bacSiId = bs.id;
        thongTinBacSi = {
          id: bs.id,
          hoTen: nv.hoTen,
          chuyenKhoa: bs.chuyenKhoa || 'Đa Khoa',
          maBacSi: 'BS' + String(bs.id).padStart(3, '0'),
          soDienThoai: nv.soDienThoai || '',
          email: nv.email || '',
        };
      }
    }

    // 1. Khoảng ngày theo giờ Việt Nam (UTC+7, không có giờ mùa hè).
    // Không dùng toISOString() trực tiếp: từ 0h–7h sáng giờ VN nó vẫn trả về ngày hôm trước.
    const ngayVN = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
    const congNgay = (ymd: string, n: number) => {
      const d = new Date(`${ymd}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const ngayCuoiThang = (nam: number, thang: number) => new Date(Date.UTC(nam, thang, 0)).getUTCDate(); // thang: 1-12
    const pad = (n: number) => String(n).padStart(2, '0');

    const today = ngayVN(new Date());
    const [y, m] = today.split('-').map(Number);
    let fromDate = today;
    let toDate = today;

    const range = filter.range || 'thang_nay';
    if (range === 'hom_nay') {
      fromDate = today;
      toDate = today;
    } else if (range === 'tuan_nay' || range === '7days') {
      const thu = new Date(`${today}T00:00:00Z`).getUTCDay();
      fromDate = congNgay(today, thu === 0 ? -6 : 1 - thu); // Thứ Hai
      toDate = congNgay(fromDate, 6); // Chủ nhật
    } else if (range === 'thang_nay' || range === 'month') {
      fromDate = `${y}-${pad(m)}-01`;
      toDate = `${y}-${pad(m)}-${pad(ngayCuoiThang(y, m))}`;
    } else if (range === 'quy_nay') {
      const thangDau = Math.floor((m - 1) / 3) * 3 + 1;
      fromDate = `${y}-${pad(thangDau)}-01`;
      toDate = `${y}-${pad(thangDau + 2)}-${pad(ngayCuoiThang(y, thangDau + 2))}`;
    } else if (filter.tuNgay || filter.denNgay) {
      fromDate = (filter.tuNgay || filter.denNgay) as string;
      toDate = filter.denNgay || today;
      if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
    }

    const hinhThuc = filter.hinhThuc && filter.hinhThuc !== 'all' ? filter.hinhThuc : null;
    const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : null);

    // 2. Phiếu khám của bác sĩ trong kỳ
    const qbBak = this.benhAnRepo.createQueryBuilder('bak')
      .leftJoinAndSelect('bak.hoSoBenhAn', 'hsba')
      .leftJoinAndSelect('hsba.benhNhan', 'bn')
      .where('bak.bacSiId = :bacSiId', { bacSiId })
      .andWhere('DATE(bak.ngayKham) BETWEEN :fromDate AND :toDate', { fromDate, toDate });
    if (hinhThuc) qbBak.andWhere('bak.hinhThucKham = :hinhThuc', { hinhThuc });
    const allRecords = await qbBak.orderBy('bak.ngayKham', 'DESC').getMany();

    // 3. Lịch hẹn của bác sĩ trong kỳ
    const qbLh = this.lichHenRepo.createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .where('lh.bacSiId = :bacSiId', { bacSiId })
      .andWhere('DATE(lh.ngayHen) BETWEEN :fromDate AND :toDate', { fromDate, toDate });
    if (hinhThuc) qbLh.andWhere('lh.hinhThuc = :hinhThuc', { hinhThuc });
    const appointments = await qbLh.orderBy('lh.ngayHen', 'DESC').addOrderBy('lh.gioHen', 'DESC').getMany();

    // Lịch hẹn nào đã có phiếu khám: qua lượt tiếp nhận (khám trực tiếp) hoặc mã lịch trong ghi chú (Telehealth)
    const luotIds = allRecords.map(r => r.luotTiepNhanId).filter((id): id is number => !!id);
    const luotSangLichHen = new Map<number, number>();
    if (luotIds.length) {
      const luots = await this.tiepNhanRepo.createQueryBuilder('tn')
        .select(['tn.id', 'tn.lichHenId'])
        .where('tn.id IN (:...ids)', { ids: luotIds })
        .getMany();
      luots.forEach(t => { if (t.lichHenId) luotSangLichHen.set(t.id, t.lichHenId); });
    }
    const lichHenCuaPhieu = (r: BenhAnKham) => appointments.find(l =>
      (!!r.luotTiepNhanId && l.id === luotSangLichHen.get(r.luotTiepNhanId)) ||
      (!!l.maLichHen && !!r.ghiChu?.includes(l.maLichHen)));
    const lichHenDaCoPhieu = new Set<number>();
    allRecords.forEach(r => { const lh = lichHenCuaPhieu(r); if (lh) lichHenDaCoPhieu.add(lh.id); });

    // Lần khám đầu tiên của từng bệnh nhân tại phòng khám → phân biệt Khám mới / Tái khám.
    // (Cột tai_kham là NGÀY HẸN tái khám lần sau, không cho biết ca này có phải tái khám hay không.)
    const benhNhanIds = [...new Set([
      ...allRecords.map(r => r.hoSoBenhAn?.benhNhan?.id),
      ...appointments.map(l => l.benhNhanId),
    ].filter((id): id is number => !!id))];
    const lanKhamDau = new Map<number, { minId: number; ngayDau: string }>();
    if (benhNhanIds.length) {
      const rows = await this.benhAnRepo.manager.query(
        `SELECT hs.benh_nhan_id AS bnId, MIN(bak.id) AS minId, MIN(bak.ngay_kham) AS ngayDau
           FROM benh_an_kham bak JOIN ho_so_benh_an hs ON hs.id = bak.ho_so_benh_an_id
          WHERE hs.benh_nhan_id IN (?) GROUP BY hs.benh_nhan_id`,
        [benhNhanIds],
      );
      rows.forEach((x: any) => lanKhamDau.set(Number(x.bnId), { minId: Number(x.minId), ngayDau: ngayVN(new Date(x.ngayDau)) }));
    }

    const tinhTuoi = (ngaySinh: any, ngayKham: string): number | null => {
      if (!ngaySinh) return null;
      const ns = ngaySinh instanceof Date ? ngayVN(ngaySinh) : String(ngaySinh).slice(0, 10);
      const [y1, m1, d1] = ns.split('-').map(Number);
      const [y2, m2, d2] = ngayKham.split('-').map(Number);
      if (!y1) return null;
      let tuoi = y2 - y1;
      if (m2 < m1 || (m2 === m1 && d2 < d1)) tuoi--;
      return tuoi >= 0 ? tuoi : null;
    };

    // 4. Danh sách ca khám
    const danhSachCaKham: any[] = [];
    allRecords.forEach((r) => {
      const bn = r.hoSoBenhAn?.benhNhan;
      const ngayKham = ngayVN(new Date(r.ngayKham));
      const lh = lichHenCuaPhieu(r);
      const gioKham = lh?.gioHen
        ? String(lh.gioHen).substring(0, 5)
        : new Date(r.ngayKham).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
      const isOnline = r.hinhThucKham === 'truc_tuyen';
      const chanDoan = r.chanDoanXacDinh || r.chanDoanSoBo || '';
      const dau = bn?.id ? lanKhamDau.get(bn.id) : undefined;

      danhSachCaKham.push({
        id: r.id,
        maCa: r.hoSoBenhAn?.maHoSo || `BA${String(r.id).padStart(6, '0')}`,
        maBenhNhan: bn?.maBenhNhan || '',
        tenBenhNhan: bn?.hoTen || 'Bệnh nhân',
        tuoi: tinhTuoi(bn?.ngaySinh, ngayKham),
        gioiTinh: bn?.gioiTinh === 'nu' ? 'Nữ' : 'Nam',
        ngayKham,
        gioKham,
        hinhThuc: isOnline ? 'Khám trực tuyến (Telehealth)' : 'Khám trực tiếp',
        hinhThucKham: isOnline ? 'truc_tuyen' : 'truc_tiep',
        chanDoan: chanDoan || 'Chưa ghi chẩn đoán',
        coChanDoan: !!chanDoan,
        maIcd10: r.maIcd10 || null,
        trangThai: r.trangThai === TrangThaiBenhAnKham.DA_HOAN_THANH ? 'Hoàn thành' : 'Đang khám',
        taiKham: dau && dau.minId < r.id ? 'Tái khám' : 'Khám mới',
      });
    });

    // Lịch hẹn chưa có phiếu khám. Bỏ lịch đã hủy / vắng mặt / chưa thanh toán: đó không phải ca khám.
    const trangThaiLichHenText: Partial<Record<TrangThaiLichHen, string>> = {
      [TrangThaiLichHen.HOAN_THANH]: 'Hoàn thành',
      [TrangThaiLichHen.DANG_KHAM]: 'Đang khám',
      [TrangThaiLichHen.DA_XAC_NHAN]: 'Đã xác nhận',
      [TrangThaiLichHen.CHO_XAC_NHAN]: 'Chờ xác nhận',
    };
    appointments.forEach((lh) => {
      const ttText = trangThaiLichHenText[lh.trangThai];
      if (!ttText || lichHenDaCoPhieu.has(lh.id)) return;
      const bn = lh.benhNhan;
      const ngayKham = String(lh.ngayHen).substring(0, 10);
      const isOnline = lh.hinhThuc === 'truc_tuyen' || lh.hinhThuc === 'online';
      const dau = lh.benhNhanId ? lanKhamDau.get(lh.benhNhanId) : undefined;

      danhSachCaKham.push({
        id: lh.id,
        maCa: lh.maLichHen || `LH${String(lh.id).padStart(6, '0')}`,
        maBenhNhan: bn?.maBenhNhan || '',
        tenBenhNhan: bn?.hoTen || 'Bệnh nhân',
        tuoi: tinhTuoi(bn?.ngaySinh, ngayKham),
        gioiTinh: bn?.gioiTinh === 'nu' ? 'Nữ' : 'Nam',
        ngayKham,
        gioKham: String(lh.gioHen).substring(0, 5),
        hinhThuc: isOnline ? 'Khám trực tuyến (Telehealth)' : 'Khám trực tiếp',
        hinhThucKham: isOnline ? 'truc_tuyen' : 'truc_tiep',
        // Lý do khám do bệnh nhân khai, không phải chẩn đoán → không đưa vào cơ cấu bệnh lý
        chanDoan: lh.lyDoKham ? `Lý do khám: ${lh.lyDoKham}` : 'Chưa ghi chẩn đoán',
        coChanDoan: false,
        maIcd10: null,
        trangThai: ttText,
        taiKham: dau && dau.ngayDau < ngayKham ? 'Tái khám' : 'Khám mới',
      });
    });

    danhSachCaKham.sort((a, b) => `${b.ngayKham} ${b.gioKham}`.localeCompare(`${a.ngayKham} ${a.gioKham}`));
    danhSachCaKham.forEach((c, i) => { c.stt = i + 1; });

    // 5. Chỉ số tổng quan: chỉ tính ca đã khám xong; mẫu số tỷ lệ hoàn thành bỏ lịch hẹn chưa tới ngày
    const caDaKham = danhSachCaKham.filter(c => c.trangThai === 'Hoàn thành');
    const countCompleted = caDaKham.length;
    const caDaDenNgay = danhSachCaKham.filter(c => c.ngayKham <= today);
    const tyLeHoanThanh = pct(countCompleted, caDaDenNgay.length);

    // Đang chờ khám: số liệu tức thời của HÔM NAY, không phụ thuộc kỳ lọc
    let dangChoKham = 0;
    if (hinhThuc !== 'truc_tuyen') {
      dangChoKham += await this.tiepNhanRepo.createQueryBuilder('tn')
        .where('tn.bacSiId = :bacSiId', { bacSiId })
        .andWhere('tn.trangThai = :trangThai', { trangThai: TrangThaiTiepNhan.CHO_KHAM })
        .andWhere('DATE(tn.thoiGianDen) = :today', { today })
        .getCount();
    }
    if (hinhThuc !== 'truc_tiep') {
      dangChoKham += await this.lichHenRepo.createQueryBuilder('lh')
        .where('lh.bacSiId = :bacSiId', { bacSiId })
        .andWhere('lh.hinhThuc = :ht', { ht: 'truc_tuyen' })
        .andWhere('lh.trangThai IN (:...trangThais)', { trangThais: [TrangThaiLichHen.CHO_XAC_NHAN, TrangThaiLichHen.DA_XAC_NHAN, TrangThaiLichHen.DANG_KHAM] })
        .andWhere('lh.ngayHen = :today', { today })
        .getCount();
    }

    // Chỉ định CLS (bỏ phiếu đã hủy) và đơn thuốc, theo đúng hình thức khám của phiếu khám gốc
    const qbCls = this.clsRepo.createQueryBuilder('cls')
      .where('cls.bacSiChiDinhId = :bacSiId', { bacSiId })
      .andWhere('cls.trangThai != :huy', { huy: TrangThaiChiDinh.HUY })
      .andWhere('DATE(cls.thoiGianChiDinh) BETWEEN :fromDate AND :toDate', { fromDate, toDate });
    if (hinhThuc) {
      qbCls.innerJoin(BenhAnKham, 'bakCls', 'bakCls.id = cls.benhAnKhamId')
        .andWhere('bakCls.hinhThucKham = :hinhThuc', { hinhThuc });
    }
    const tongChiDinhCLS = await qbCls.getCount();

    const qbDt = this.donThuocRepo.createQueryBuilder('dt')
      .where('dt.bacSiKeId = :bacSiId', { bacSiId })
      .andWhere('DATE(dt.ngayKe) BETWEEN :fromDate AND :toDate', { fromDate, toDate });
    if (hinhThuc) {
      qbDt.innerJoin(BenhAnKham, 'bakDt', 'bakDt.id = dt.benhAnKhamId')
        .andWhere('bakDt.hinhThucKham = :hinhThuc', { hinhThuc });
    }
    const tongDonThuocKe = await qbDt.getCount();

    // 6. Cơ cấu bệnh lý: chỉ ca đã khám có chẩn đoán của bác sĩ, gộp theo mã ICD-10 nếu có
    const benhLyCount = new Map<string, { name: string; count: number }>();
    caDaKham.filter(c => c.coChanDoan).forEach((c) => {
      const text = String(c.chanDoan).replace(/^\[Chuyên khoa:\s*[^\]]+\]\s*/i, '').trim();
      const icd = c.maIcd10 ? String(c.maIcd10).toUpperCase() : null;
      const key = icd ? `icd:${icd}` : `txt:${text.toLowerCase()}`;
      const name = icd && !text.toUpperCase().startsWith(icd) ? `${c.maIcd10} - ${text}` : text;
      const cur = benhLyCount.get(key);
      if (cur) cur.count++;
      else benhLyCount.set(key, { name, count: 1 });
    });
    const colors = ['#2563EB', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6'];
    const totalBenhCount = [...benhLyCount.values()].reduce((a, b) => a + b.count, 0);
    const coCauBenhLy = [...benhLyCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ name, count }, index) => ({
        name,
        count,
        value: count,
        percentage: pct(count, totalBenhCount) || '0.0%',
        color: colors[index % colors.length],
      }));

    // 7. Cơ cấu độ tuổi (tuổi tại ngày khám; không có ngày sinh → nhóm "Không rõ")
    const tapThongKe = caDaKham;
    const totalDemographic = tapThongKe.length;
    const nhom = (pred: (c: any) => boolean) => {
      const count = tapThongKe.filter(pred).length;
      return { count, pct: pct(count, totalDemographic) || '0.0%' };
    };
    const coCauDoTuoi = {
      treEm: nhom(c => c.tuoi !== null && c.tuoi < 16),
      truongThanh: nhom(c => c.tuoi !== null && c.tuoi >= 16 && c.tuoi < 60),
      nguoiCaoTuoi: nhom(c => c.tuoi !== null && c.tuoi >= 60),
      khongRo: nhom(c => c.tuoi === null),
    };

    // 8. Bệnh nhân mới vs tái khám
    const benhNhanMoiVsTaiKham = {
      khamMoi: nhom(c => c.taiKham === 'Khám mới'),
      taiKham: nhom(c => c.taiKham === 'Tái khám'),
    };

    // 9. Khung giờ cao điểm
    const hourSlots: Record<string, { trucTiep: number; trucTuyen: number; benhNhan: number }> = {
      '08:00 - 09:00': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
      '09:00 - 10:00': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
      '10:00 - 11:00': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
      '11:00 - 12:00': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
      '13:30 - 14:30': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
      '14:30 - 15:30': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
      '15:30 - 16:30': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
      '16:30 - 17:30': { trucTiep: 0, trucTuyen: 0, benhNhan: 0 },
    };
    const getSlotKey = (hour: number) => {
      if (hour < 9) return '08:00 - 09:00';
      if (hour < 10) return '09:00 - 10:00';
      if (hour < 11) return '10:00 - 11:00';
      if (hour < 13) return '11:00 - 12:00';
      if (hour < 14) return '13:30 - 14:30';
      if (hour < 15) return '14:30 - 15:30';
      if (hour < 16) return '15:30 - 16:30';
      return '16:30 - 17:30';
    };
    tapThongKe.forEach(c => {
      const hour = parseInt(String(c.gioKham).split(':')[0], 10);
      if (Number.isNaN(hour)) return;
      const slot = hourSlots[getSlotKey(hour)];
      if (c.hinhThucKham === 'truc_tuyen') slot.trucTuyen++;
      else slot.trucTiep++;
      slot.benhNhan++;
    });
    const khungGioCaoDiem = Object.entries(hourSlots).map(([gio, data]) => ({
      gio,
      ...data,
      congSuat: data.benhNhan >= 5 ? 'Đỉnh điểm' : data.benhNhan >= 3 ? 'Cao' : data.benhNhan > 0 ? 'Bình thường' : 'Thấp',
    }));

    // 10. No-show = vắng mặt / lịch hẹn đã tới ngày (không tính lịch đã hủy hoặc chưa thanh toán).
    // Tỷ lệ hủy lịch báo riêng vì hủy trước không phải "không đến".
    const khongTinhNoShow = [TrangThaiLichHen.DA_HUY, TrangThaiLichHen.CHO_DUYET_HUY, TrangThaiLichHen.CHO_THANH_TOAN];
    const lichDaDenNgay = appointments.filter(a =>
      String(a.ngayHen).substring(0, 10) <= today && !khongTinhNoShow.includes(a.trangThai));
    const soVangMat = lichDaDenNgay.filter(a => a.trangThai === TrangThaiLichHen.VANG_MAT).length;
    const tyLeNoShow = pct(soVangMat, lichDaDenNgay.length);
    const tyLeHuyLich = pct(appointments.filter(a => a.trangThai === TrangThaiLichHen.DA_HUY).length, appointments.length);

    // 11. CSAT trong kỳ lọc; chưa có đánh giá thì trả null thay vì 5.0 giả
    const [dgResult] = await this.benhAnRepo.manager.query(
      `SELECT AVG(diem_bac_si) AS avgScore, COUNT(*) AS totalReviews
         FROM danh_gia_ca_kham WHERE bac_si_id = ? AND DATE(tao_luc) BETWEEN ? AND ?`,
      [bacSiId, fromDate, toDate],
    );
    const diemHaiLongCSAT = Number(dgResult?.totalReviews) > 0
      ? `${Number(dgResult.avgScore).toFixed(1)} / 5.0 ⭐`
      : null;

    // 12. Thời gian khám TB = từ lúc mở phiếu khám (ngay_kham) đến lúc bác sĩ bấm kết thúc (thoi_gian_ket_thuc).
    // Chỉ tính ca có đủ 2 mốc; ca cũ / ca bị đóng tự động khi thanh toán không có mốc kết thúc nên bỏ qua.
    // Loại ca > 4 giờ: phiếu bị bỏ ngỏ rồi mới đóng, không phản ánh thời gian khám.
    const thoiLuongCa = allRecords
      .filter(r => r.trangThai === TrangThaiBenhAnKham.DA_HOAN_THANH && r.ngayKham && r.thoiGianKetThuc)
      .map(r => (new Date(r.thoiGianKetThuc as Date).getTime() - new Date(r.ngayKham).getTime()) / 60000)
      .filter(mins => mins > 0 && mins <= 240);
    const soCaDoThoiGian = thoiLuongCa.length;
    const thoiGianKhamTrungBinh = soCaDoThoiGian > 0
      ? `${(thoiLuongCa.reduce((a, b) => a + b, 0) / soCaDoThoiGian).toFixed(1)} phút/ca`
      : null;

    return {
      message: 'OK',
      data: {
        thongTinBacSi,
        kyBaoCao: { tuNgay: fromDate, denNgay: toDate },
        tongBenhNhanDaKham: countCompleted,
        dangChoKham,
        thoiGianKhamTrungBinh,
        soCaDoThoiGian,
        tongChiDinhCLS,
        tongDonThuocKe,
        tyLeHoanThanh,
        coCauBenhLy,
        coCauDoTuoi,
        benhNhanMoiVsTaiKham,
        danhSachCaKham,
        khungGioCaoDiem,
        tyLeNoShow,
        tyLeHuyLich,
        tyLeTaiKham: totalDemographic > 0 ? benhNhanMoiVsTaiKham.taiKham.pct : null,
        diemHaiLongCSAT,
      },
    };
  }

  // ─── EMR Bệnh nhân cá nhân ──────────────────────────────
  async emrCuaToi(userId: number) {
    let bn = await this.benhNhanRepo.findOne({ where: { nguoiDungId: userId } });
    if (!bn) {
      const u = await this.benhAnRepo.manager.getRepository(NguoiDung).findOne({ where: { id: userId } });
      if (u) {
        bn = await this.benhNhanRepo.findOne({
          where: [{ email: u.tenDangNhap }, { soDienThoai: u.tenDangNhap }],
        });
      }
    }
    if (!bn) {
      return {
        data: { benhNhan: null, lichSuKham: [] },
        message: 'Chưa có thông tin bệnh nhân liên kết',
      };
    }

    const hoSo = await this.hoSoRepo.findOne({ where: { benhNhanId: bn.id } });
    if (!hoSo) {
      return {
        data: { benhNhan: bn, lichSuKham: [] },
        message: 'Chưa có hồ sơ bệnh án',
      };
    }

    const dsKham = await this.benhAnRepo.createQueryBuilder('bak')
      .leftJoinAndSelect('bak.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('bak.hoSoBenhAnId = :hoSoId', { hoSoId: hoSo.id })
      .orderBy('bak.ngayKham', 'DESC')
      .getMany();

    const lichSuKham = await this.napChiTietLichSuKham(dsKham);

    return {
      data: {
        benhNhan: bn,
        maHoSo: hoSo.maHoSo,
        lichSuKham,
      },
      message: 'OK',
    };
  }

  // ─── Helper nạp chi tiết cận lâm sàng, kết quả, đơn thuốc, sinh hiệu, hóa đơn ───
  private async napChiTietLichSuKham(dsKham: BenhAnKham[]) {
    return Promise.all(
      dsKham.map(async (bak) => {
        const xn = await this.clsRepo.find({
          where: { benhAnKhamId: bak.id, trangThai: Not(TrangThaiChiDinh.HUY) },
          relations: ['dichVu'],
        });
        const xnWithResults = await Promise.all(
          xn.map(async (chiDinh) => ({
            ...chiDinh,
            ketQua: await this.ketQuaClsRepo.findOne({
              where: { chiDinhId: chiDinh.id },
            }),
          })),
        );
        const dt = await this.donThuocRepo.find({
          where: { benhAnKhamId: bak.id },
          relations: ['chiTiet', 'chiTiet.thuoc'],
        });
        const sh = bak.luotTiepNhanId
          ? await this.tiepNhanRepo.manager.getRepository(SinhHieu).findOne({ where: { luotTiepNhanId: bak.luotTiepNhanId } })
          : null;

        // Lấy lichHenId từ LuotTiepNhan hoặc parse từ ghiChu ca khám trực tuyến
        let lichHenId = null;
        let luotTN = null;
        if (bak.luotTiepNhanId) {
          luotTN = await this.tiepNhanRepo.findOne({
            where: { id: bak.luotTiepNhanId },
            select: ['id', 'lichHenId', 'trangThai'],
          });
          lichHenId = luotTN?.lichHenId || null;
        } else if (bak.hinhThucKham === 'truc_tuyen' && bak.ghiChu) {
          const matchMaLh = bak.ghiChu.match(/Mã lịch:\s*([A-Za-z0-9]+)/i);
          if (matchMaLh && matchMaLh[1]) {
            const lhFound = await this.lichHenRepo.findOne({ where: { maLichHen: matchMaLh[1] }, select: ['id'] });
            lichHenId = lhFound?.id || null;
          }
        }

        let hd = bak.luotTiepNhanId
          ? await this.hoaDonRepo.findOne({
              where: { luotTiepNhanId: bak.luotTiepNhanId },
              relations: ['chiTiet'],
            })
          : null;

        if (!hd && bak.luotTiepNhanId) {
          try {
            const res = await this.thanhToanService.taoHoacCapNhatTuLuotKham(bak.luotTiepNhanId);
            hd = res?.data || null;
          } catch (e) {
            console.warn('[napChiTietLichSuKham] Auto create invoice:', e?.message);
          }
        }

        // Tự động đồng bộ trạng thái: nếu lượt tiếp nhận đã hoàn thành hoặc viện phí đã thanh toán thì xem như ca khám đã hoàn tất
        let effectiveTrangThai = bak.trangThai;
        if (luotTN?.trangThai === 'hoan_thanh' || hd?.trangThai === 'da_thanh_toan') {
          effectiveTrangThai = TrangThaiBenhAnKham.DA_HOAN_THANH;
          if (bak.trangThai !== TrangThaiBenhAnKham.DA_HOAN_THANH) {
            this.benhAnRepo.update({ id: bak.id }, { trangThai: TrangThaiBenhAnKham.DA_HOAN_THANH }).catch(() => {});
          }
        }

        const dtWithAliases = dt.map((d) => ({
          ...d,
          chiTietDonThuoc: d.chiTiet,
        }));

        const bacSiTen = bak.bacSi?.nhanVien?.hoTen || 'Bác sĩ điều trị';
        return {
          ...bak,
          trangThai: effectiveTrangThai,
          lichHenId,
          luotTiepNhanId: bak.luotTiepNhanId,
          luotTiepNhan: luotTN,
          benhAn: {
            ...bak,
            trangThai: effectiveTrangThai,
          },
          benhAnKham: {
            ...bak,
            trangThai: effectiveTrangThai,
          },
          bacSi: bak.bacSi,
          bacSiTen,
          xetNghiem: xnWithResults,
          canLamSang: xnWithResults,
          donThuoc: dtWithAliases,
          sinhHieu: sh,
          hoaDon: hd
            ? {
                id: hd.id,
                maHoaDon: hd.maHoaDon,
                tongTien: Number(hd.tongTien),
                soTienGiam: Number(hd.soTienGiam),
                thucThu: Number(hd.thucThu),
                phuongThucThanhToan: hd.phuongThucThanhToan,
                trangThai: hd.trangThai,
                ngayThanhToan: hd.ngayThanhToan,
                ghiChu: hd.ghiChu,
                chiTiet: hd.chiTiet
                  ? hd.chiTiet.map((c) => ({
                      ...c,
                      donGia: Number(c.donGia),
                      thanhTien: Number(c.thanhTien),
                    }))
                  : [],
              }
            : null,
        };
      })
    );
  }

  // ─── Lấy/tạo hồ sơ bệnh án cho bệnh nhân ────────────────
  async getOrCreateHoSo(benhNhanId: number): Promise<HoSoBenhAn> {
    return voiKhoaDb(this.hoSoRepo.manager.connection, `hoso:bn:${benhNhanId}`, async () => {
      let hoSo = await this.hoSoRepo.findOne({ where: { benhNhanId } });
      if (!hoSo) {
        const maHoSo = await this.generateNextMaHoSo();
        hoSo = this.hoSoRepo.create({
          maHoSo,
          benhNhanId,
        });
        hoSo = await this.hoSoRepo.save(hoSo);
      }
      return hoSo;
    });
  }

  // ─── Xem lịch sử khám của bệnh nhân (Bác sĩ tra cứu EMR) ────
  async lichSuKham(benhNhanId: number) {
    const hoSo = await this.hoSoRepo.findOne({
      where: { benhNhanId },
    });
    if (!hoSo) return { data: [], message: 'Chưa có hồ sơ bệnh án' };

    const dsKham = await this.benhAnRepo.createQueryBuilder('bak')
      .leftJoinAndSelect('bak.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('bak.hoSoBenhAnId = :hoSoId', { hoSoId: hoSo.id })
      .orderBy('bak.ngayKham', 'DESC')
      .getMany();

    const lichSu = await this.napChiTietLichSuKham(dsKham);
    return { data: lichSu, message: 'OK' };
  }

  // ─── Tạo phiếu khám mới ──────────────────────────────────
  async taoBenhAnKham(nguoiDungId: number, benhNhanId: number, dto: TaoBenhAnKhamDto) {
    return voiKhoaDb(this.hoSoRepo.manager.connection, `bak:visit:${dto.luotTiepNhanId}`, async () => {
      const hoSo = await this.getOrCreateHoSo(benhNhanId);

      // Nếu lượt tiếp nhận đã có phiếu khám thì trả về phiếu hiện tại
      let bak = await this.benhAnRepo.findOne({ where: { luotTiepNhanId: dto.luotTiepNhanId } });
      if (bak) {
        return { data: bak, message: 'Lấy phiếu khám hiện tại thành công' };
      }

      let bacSiTableId: number | null = null;
      if (nguoiDungId) {
        const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId } });
        if (nv) {
          const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: nv.id } });
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
    });
  }

  // ─── Lấy phiếu khám theo lượt tiếp nhận ──────────────────
  async layBenhAnTheoLuot(luotTiepNhanId: number) {
    const bak = await this.benhAnRepo.findOne({
      where: { luotTiepNhanId },
      relations: ['hoSoBenhAn', 'hoSoBenhAn.benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
    return { data: bak, message: 'OK' };
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

    const chanDoan = (dto.chanDoanXacDinh || bak.chanDoanXacDinh || '').trim();
    if (!chanDoan) {
      throw new BadRequestException({
        code: 'CHUA_NHAP_CHAN_DOAN_XAC_DINH',
        message: 'Bác sĩ bắt buộc phải nhập Chẩn đoán xác định (kèm mã chuẩn ICD-10) trước khi kết thúc ca khám.',
      });
    }

    // Chốt chặn an toàn lâm sàng: Kiểm tra các chỉ định Cận lâm sàng (Xét nghiệm/CĐHA) chưa có kết quả
    const dsCls = await this.clsRepo.find({
      where: { benhAnKhamId: bak.id },
      relations: ['dichVu'],
    });
    const clsChuaXong = dsCls.filter(
      (c) => ![TrangThaiChiDinh.CO_KET_QUA, TrangThaiChiDinh.HUY].includes(c.trangThai as TrangThaiChiDinh),
    );
    if (clsChuaXong.length > 0) {
      const tenDv = clsChuaXong.map((c) => c.dichVu?.tenDichVu || `CLS #${c.id}`).join(', ');
      throw new BadRequestException({
        code: 'CON_CHI_DINH_CLS_CHUA_CO_KET_QUA',
        message: `Chưa thể kết thúc khám vì còn ${clsChuaXong.length} chỉ định Cận lâm sàng chưa trả kết quả (${tenDv}). Vui lòng chờ Kỹ thuật viên trả kết quả hoặc hủy chỉ định nếu không thực hiện.`,
      });
    }

    Object.assign(bak, dto, {
      chanDoanXacDinh: chanDoan,
      trangThai: TrangThaiBenhAnKham.DA_HOAN_THANH,
      thoiGianKetThuc: new Date(),
    });
    const saved = await this.benhAnRepo.save(bak);

    // 1. Kết thúc chuyên môn nhưng chờ thu ngân xác nhận viện phí
    if (bak.luotTiepNhanId) {
      try {
        await this.tiepNhanRepo.update(
          { id: bak.luotTiepNhanId },
          { trangThai: TrangThaiTiepNhan.CHO_THANH_TOAN }
        );
      } catch (e) {
        console.warn('[ketThucKham] Cập nhật trạng thái chờ thanh toán:', e?.message);
      }

      // 2. Tự động tính toán và tạo/cập nhật hóa đơn viện phí trọn gói (Khám + Cận lâm sàng + Đơn thuốc + BHYT)
      try {
        await this.thanhToanService.taoHoacCapNhatTuLuotKham(bak.luotTiepNhanId);
      } catch (err) {
        console.warn('[ketThucKham] Tự động tổng hợp hóa đơn viện phí thất bại:', err?.message);
      }
    }

    return { data: saved, message: 'Kết thúc khám thành công. Hóa đơn viện phí và đơn thuốc đã được tổng hợp cho quầy thu ngân và bệnh nhân.' };
  }
}
