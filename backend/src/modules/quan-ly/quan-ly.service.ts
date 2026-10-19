import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Like, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { NguoiDung, TrangThaiNguoiDung } from '../auth/entities/nguoi-dung.entity';
import { VaiTro } from '../auth/entities/vai-tro.entity';
import { QuyenHan } from '../auth/entities/quyen-han.entity';
import { VaiTroQuyenHan } from '../auth/entities/vai-tro-quyen-han.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { KyThuatVien } from '../nhan-vien/entities/ky-thuat-vien.entity';
import { DonGui, TrangThaiDonGui } from '../nhan-vien/entities/don-gui.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';
import { CaLamViec } from '../nhan-vien/entities/ca-lam-viec.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { HoaDonChiTiet } from '../thanh-toan/entities/hoa-don-chi-tiet.entity';
import { ChiDinhCanLamSang } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { NhatKyHeThong, LoaiNhatKy } from './entities/nhat-ky-he-thong.entity';
import { BaoCaoBoPhan } from './entities/bao-cao-bo-phan.entity';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class QuanLyService {
  constructor(
    @InjectRepository(NhanVien) private nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(NguoiDung) private nguoiDungRepo: Repository<NguoiDung>,
    @InjectRepository(VaiTro) private vaiTroRepo: Repository<VaiTro>,
    @InjectRepository(QuyenHan) private quyenHanRepo: Repository<QuyenHan>,
    @InjectRepository(VaiTroQuyenHan) private vaiTroQuyenHanRepo: Repository<VaiTroQuyenHan>,
    @InjectRepository(BacSi) private bacSiRepo: Repository<BacSi>,
    @InjectRepository(KyThuatVien) private kyThuatVienRepo: Repository<KyThuatVien>,
    @InjectRepository(DonGui) private donGuiRepo: Repository<DonGui>,
    @InjectRepository(LichLamViec) private lichLamViecRepo: Repository<LichLamViec>,
    @InjectRepository(CaLamViec) private caLamViecRepo: Repository<CaLamViec>,
    @InjectRepository(BenhNhan) private benhNhanRepo: Repository<BenhNhan>,
    @InjectRepository(LuotTiepNhan) private tiepNhanRepo: Repository<LuotTiepNhan>,
    @InjectRepository(BenhAnKham) private benhAnRepo: Repository<BenhAnKham>,
    @InjectRepository(HoaDon) private hoaDonRepo: Repository<HoaDon>,
    @InjectRepository(HoaDonChiTiet) private hoaDonChiTietRepo: Repository<HoaDonChiTiet>,
    @InjectRepository(ChiDinhCanLamSang) private clsRepo: Repository<ChiDinhCanLamSang>,
    @InjectRepository(DonThuoc) private donThuocRepo: Repository<DonThuoc>,
    @InjectRepository(LichHen) private lichHenRepo: Repository<LichHen>,
    @InjectRepository(NhatKyHeThong) private nhatKyRepo: Repository<NhatKyHeThong>,
    @InjectRepository(BaoCaoBoPhan) private baoCaoBoPhanRepo: Repository<BaoCaoBoPhan>,
    private readonly thongBaoService: ThongBaoService,
    private readonly httpService: HttpService,
  ) {}

  // ==========================================
  // NHÂN VIÊN
  // ==========================================
  async getDanhSachNhanVien() {
    const list = await this.nhanVienRepo.find({
      relations: ['nguoiDung', 'nguoiDung.vaiTro'],
      order: { taoLuc: 'DESC' },
    });

    return {
      message: 'Lấy danh sách nhân viên thành công',
      data: list.map(nv => ({
        id: nv.id,
        hoTen: nv.hoTen,
        soDienThoai: nv.soDienThoai,
        email: nv.email,
        chucVu: nv.chucVu,
        phongBanId: nv.phongBanId,
        anhDaiDien: nv.anhDaiDien,
        nguoiDung: {
          id: nv.nguoiDung?.id,
          tenDangNhap: nv.nguoiDung?.tenDangNhap,
          trangThai: nv.nguoiDung?.trangThai,
          vaiTro: nv.nguoiDung?.vaiTro?.tenVaiTro,
          maVaiTro: nv.nguoiDung?.vaiTro?.maVaiTro,
        },
      })),
    };
  }

  async taoNhanVienMoi(data: any) {
    const { 
      tenDangNhap, matKhau, vaiTroId, 
      hoTen, email, soDienThoai, gioiTinh, ngaySinh, soCmnd, diaChi,
      chuyenKhoa, bangCap, soChungChiHanhNghe, moTaBacSi,
      chuyenMon, ngayVaoLam, anhDaiDien
    } = data;

    const existing = await this.nguoiDungRepo.findOne({ where: { tenDangNhap } });
    if (existing) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại');
    }

    const vaiTro = await this.vaiTroRepo.findOne({ where: { id: vaiTroId } });
    if (!vaiTro) throw new BadRequestException('Vai trò không hợp lệ');

    const hashedPassword = await bcrypt.hash(matKhau, 10);
    
    const newUser = this.nguoiDungRepo.create({
      tenDangNhap,
      matKhauHash: hashedPassword,
      vaiTroId,
      loaiTaiKhoan: 'noi_bo' as any,
      trangThai: TrangThaiNguoiDung.HOAT_DONG,
    });
    const savedUser = await this.nguoiDungRepo.save(newUser);

    const newNv = this.nhanVienRepo.create({
      nguoiDungId: savedUser.id,
      hoTen,
      email: email || null,
      soDienThoai: soDienThoai || null,
      gioiTinh: gioiTinh || null,
      ngaySinh: ngaySinh || null,
      soCmnd: soCmnd || null,
      diaChi: diaChi || null,
      chucVu: vaiTro.tenVaiTro,
      ngayVaoLam: ngayVaoLam || null,
      anhDaiDien: anhDaiDien || null,
    });
    const savedNv = await this.nhanVienRepo.save(newNv);

    if (vaiTro.maVaiTro === 'bac_si') {
      const newBs = this.bacSiRepo.create({
        nhanVienId: savedNv.id,
        chuyenKhoa: chuyenKhoa || 'Nội tổng quát',
        bangCap: bangCap || null,
        soChungChiHanhNghe: soChungChiHanhNghe || null,
        moTa: moTaBacSi || null,
      });
      await this.bacSiRepo.save(newBs);
    } else if (vaiTro.maVaiTro === 'ky_thuat_vien') {
      const newKtv = this.kyThuatVienRepo.create({
        nhanVienId: savedNv.id,
        chuyenMon: chuyenMon || 'Kỹ thuật viên xét nghiệm',
      });
      await this.kyThuatVienRepo.save(newKtv);
    }

    return {
      message: 'Tạo tài khoản nhân viên thành công',
      data: { nhanVienId: savedNv.id, nguoiDungId: savedUser.id },
    };
  }

  async getChiTietNhanVien(id: number) {
    const nv = await this.nhanVienRepo.findOne({
      where: { id },
      relations: ['nguoiDung', 'nguoiDung.vaiTro'],
    });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');

    let bacSiInfo = null;
    let ktvInfo = null;

    if (nv.nguoiDung?.vaiTro?.maVaiTro === 'bac_si') {
      bacSiInfo = await this.bacSiRepo.findOne({ where: { nhanVienId: nv.id } });
    } else if (nv.nguoiDung?.vaiTro?.maVaiTro === 'ky_thuat_vien') {
      ktvInfo = await this.kyThuatVienRepo.findOne({ where: { nhanVienId: nv.id } });
    }

    return {
      data: {
        ...nv,
        chuyenKhoa: bacSiInfo?.chuyenKhoa || null,
        bangCap: bacSiInfo?.bangCap || null,
        soChungChiHanhNghe: bacSiInfo?.soChungChiHanhNghe || null,
        moTa: bacSiInfo?.moTa || null,
        chuyenMon: ktvInfo?.chuyenMon || null,
        bacSi: bacSiInfo,
        kyThuatVien: ktvInfo,
      },
      message: 'Lấy chi tiết nhân viên thành công',
    };
  }

  async capNhatNhanVien(id: number, data: any) {
    const nv = await this.nhanVienRepo.findOne({
      where: { id },
      relations: ['nguoiDung', 'nguoiDung.vaiTro'],
    });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');

    const {
      hoTen, email, soDienThoai, gioiTinh, ngaySinh, soCmnd, diaChi,
      vaiTroId, chuyenKhoa, bangCap, soChungChiHanhNghe, moTaBacSi,
      chuyenMon, ngayVaoLam, anhDaiDien
    } = data;

    nv.hoTen = hoTen ?? nv.hoTen;
    nv.email = email ?? nv.email;
    nv.soDienThoai = soDienThoai ?? nv.soDienThoai;
    nv.gioiTinh = gioiTinh ?? nv.gioiTinh;
    nv.ngaySinh = ngaySinh ?? nv.ngaySinh;
    nv.soCmnd = soCmnd ?? nv.soCmnd;
    nv.diaChi = diaChi ?? nv.diaChi;
    nv.ngayVaoLam = ngayVaoLam ?? nv.ngayVaoLam;
    nv.anhDaiDien = anhDaiDien ?? nv.anhDaiDien;

    if (vaiTroId && nv.nguoiDung && nv.nguoiDung.vaiTroId !== vaiTroId) {
      const vaiTro = await this.vaiTroRepo.findOne({ where: { id: vaiTroId } });
      if (vaiTro) {
        nv.nguoiDung.vaiTroId = vaiTroId;
        nv.chucVu = vaiTro.tenVaiTro;
        await this.nguoiDungRepo.save(nv.nguoiDung);
      }
    }

    await this.nhanVienRepo.save(nv);

    if (nv.nguoiDung?.vaiTro?.maVaiTro === 'bac_si') {
      let bs = await this.bacSiRepo.findOne({ where: { nhanVienId: nv.id } });
      if (!bs) {
        bs = this.bacSiRepo.create({ nhanVienId: nv.id });
      }
      bs.chuyenKhoa = chuyenKhoa ?? bs.chuyenKhoa;
      bs.bangCap = bangCap ?? bs.bangCap;
      bs.soChungChiHanhNghe = soChungChiHanhNghe ?? bs.soChungChiHanhNghe;
      bs.moTa = moTaBacSi ?? bs.moTa;
      await this.bacSiRepo.save(bs);
    } else if (nv.nguoiDung?.vaiTro?.maVaiTro === 'ky_thuat_vien') {
      let ktv = await this.kyThuatVienRepo.findOne({ where: { nhanVienId: nv.id } });
      if (!ktv) {
        ktv = this.kyThuatVienRepo.create({ nhanVienId: nv.id });
      }
      ktv.chuyenMon = chuyenMon ?? ktv.chuyenMon;
      await this.kyThuatVienRepo.save(ktv);
    }

    return { message: 'Cập nhật nhân viên thành công' };
  }

  async xoaNhanVien(id: number) {
    const nv = await this.nhanVienRepo.findOne({
      where: { id },
      relations: ['nguoiDung'],
    });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');

    await this.bacSiRepo.delete({ nhanVienId: id });
    await this.kyThuatVienRepo.delete({ nhanVienId: id });
    await this.nhanVienRepo.delete(id);
    if (nv.nguoiDung) {
      await this.nguoiDungRepo.delete(nv.nguoiDung.id);
    }
    return { message: 'Xóa nhân viên thành công' };
  }

  async datLaiMatKhau(nguoiDungId: number, matKhauMoi: string) {
    const user = await this.nguoiDungRepo.findOne({ where: { id: nguoiDungId } });
    const hashedPassword = await bcrypt.hash(matKhauMoi, 10);
    await this.nguoiDungRepo.update(nguoiDungId, { matKhauHash: hashedPassword });

    await this.ghiLog({
      nguoiDungId,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien',
      hanhDong: 'DAT_LAI_MAT_KHAU',
      loaiNhatKy: LoaiNhatKy.SECURITY,
      moTa: `Quản trị viên đã đặt lại mật khẩu mới cho tài khoản "${user?.tenDangNhap || nguoiDungId}"`,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async doiTrangThaiTaiKhoan(nguoiDungId: number, trangThai: TrangThaiNguoiDung) {
    const user = await this.nguoiDungRepo.findOne({ where: { id: nguoiDungId } });
    await this.nguoiDungRepo.update(nguoiDungId, { trangThai });

    const isLocked = trangThai === TrangThaiNguoiDung.KHOA;
    await this.ghiLog({
      nguoiDungId,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien',
      hanhDong: isLocked ? 'KHOA_TAI_KHOAN' : 'MO_KHOA_TAI_KHOAN',
      loaiNhatKy: isLocked ? LoaiNhatKy.WARNING : LoaiNhatKy.INFO,
      moTa: `Quản trị viên đã ${isLocked ? 'khóa' : 'mở khóa'} tài khoản "${user?.tenDangNhap || nguoiDungId}" (trạng thái: ${trangThai})`,
    });

    return { message: 'Cập nhật trạng thái thành công' };
  }

  // ==========================================
  // PHÂN QUYỀN (VAI TRÒ & QUYỀN HẠN)
  // ==========================================
  async getPhanQuyenData() {
    const vaiTros = await this.vaiTroRepo.find({
      where: { maVaiTro: Not('benh_nhan') },
      order: { id: 'ASC' },
    });

    const quyenHans = await this.quyenHanRepo.find({
      order: { nhomChucNang: 'ASC', id: 'ASC' },
    });

    const mappings = await this.vaiTroQuyenHanRepo.find();

    const matrix = vaiTros.map(vt => {
      const perms = mappings.filter(m => m.vaiTroId === vt.id).map(m => m.quyenHanId);
      return {
        vaiTro: vt,
        quyenHanIds: perms,
      };
    });

    const groupedQuyen = quyenHans.reduce((acc, qh) => {
      const nhom = qh.nhomChucNang || 'Khác';
      if (!acc[nhom]) acc[nhom] = [];
      acc[nhom].push(qh);
      return acc;
    }, {} as Record<string, typeof quyenHans>);

    return {
      data: {
        vaiTros,
        quyenHans: groupedQuyen,
        matrix,
      },
      message: 'Lấy dữ liệu phân quyền thành công'
    };
  }

  async capNhatPhanQuyen(vaiTroId: number, quyenHanIds: number[]) {
    const role = await this.vaiTroRepo.findOne({ where: { id: vaiTroId } });
    if (!role) throw new NotFoundException('Vai trò không tồn tại');
    if (role.laHeThong) {
      throw new BadRequestException('Không thể chỉnh sửa quyền của vai trò hệ thống này');
    }

    await this.vaiTroQuyenHanRepo.delete({ vaiTroId });

    if (quyenHanIds && quyenHanIds.length > 0) {
      const newMappings = quyenHanIds.map(qhId => ({
        vaiTroId: vaiTroId,
        quyenHanId: qhId,
      }));
      await this.vaiTroQuyenHanRepo.save(newMappings);
    }

    return { message: 'Cập nhật phân quyền thành công' };
  }

  // ============================================================
  // UC 17: DASHBOARD TỔNG QUAN HOẠT ĐỘNG PHÒNG KHÁM (BAN GIÁM ĐỐC)
  // ============================================================
  async getDashboardStats(filter: { range?: string; tuNgay?: string; denNgay?: string }) {
    // 0. Xác định khoảng thời gian (startDate, endDate)
    const now = new Date();
    const toDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (filter.tuNgay && filter.denNgay) {
      startDate = filter.tuNgay;
      endDate = filter.denNgay;
    } else {
      const range = filter.range || 'tat_ca';
      if (range === 'hom_nay') {
        startDate = toDateStr(now);
        endDate = toDateStr(now);
      } else if (range === '7_ngay') {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 6);
        startDate = toDateStr(d7);
        endDate = toDateStr(now);
      } else if (range === 'thang_nay') {
        const dMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = toDateStr(dMonth);
        endDate = toDateStr(now);
      } else if (range === 'quy_nay') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const dQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
        startDate = toDateStr(dQuarter);
        endDate = toDateStr(now);
      } else if (range === 'nam_nay') {
        const dYear = new Date(now.getFullYear(), 0, 1);
        startDate = toDateStr(dYear);
        endDate = toDateStr(now);
      }
    }

    const startDateTime = startDate ? `${startDate} 00:00:00` : null;
    const endDateTime = endDate ? `${endDate} 23:59:59` : null;

    // 1. Lượt khám & tiếp nhận
    const totalTiepNhan = await this.tiepNhanRepo.count();
    const tiepNhanHomNay = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .getCount();

    let tiepNhanTrongKy = totalTiepNhan;
    if (startDateTime && endDateTime) {
      tiepNhanTrongKy = await this.tiepNhanRepo.createQueryBuilder('ltn')
        .where('ltn.thoiGianDen BETWEEN :s AND :e', { s: startDateTime, e: endDateTime })
        .getCount();
    }

    // 2. Doanh thu
    const revRaw = await this.hoaDonRepo.createQueryBuilder('hd')
      .select('SUM(hd.thucThu)', 'tongDoanhThu')
      .addSelect('SUM(CASE WHEN DATE(hd.ngayThanhToan) = CURDATE() THEN hd.thucThu ELSE 0 END)', 'doanhThuHomNay')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .getRawOne();

    const tongDoanhThu = Number(revRaw?.tongDoanhThu || 0);
    const doanhThuHomNay = Number(revRaw?.doanhThuHomNay || 0);

    let doanhThuTrongKy = tongDoanhThu;
    if (startDateTime && endDateTime) {
      const revRangeRaw = await this.hoaDonRepo.createQueryBuilder('hd')
        .select('SUM(hd.thucThu)', 'doanhThuTrongKy')
        .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
        .andWhere('hd.ngayThanhToan BETWEEN :s AND :e', { s: startDateTime, e: endDateTime })
        .getRawOne();
      doanhThuTrongKy = Number(revRangeRaw?.doanhThuTrongKy || 0);
    }

    // 3. Số bác sĩ và nhân viên
    const soBacSi = await this.bacSiRepo.count();
    const soNhanVien = await this.nhanVienRepo.count();

    // 4. Đơn yêu cầu chờ duyệt
    const donChoDuyet = await this.donGuiRepo.count({
      where: { trangThai: TrangThaiDonGui.CHO_XU_LY },
    });

    // 5. Biểu đồ lượt khám và doanh thu theo ngày
    let trendQb = this.tiepNhanRepo.createQueryBuilder('ltn')
      .select("DATE_FORMAT(ltn.thoiGianDen, '%Y-%m-%d')", 'rawDate')
      .addSelect("DATE_FORMAT(ltn.thoiGianDen, '%d/%m')", 'ngay')
      .addSelect('COUNT(*)', 'soLuotKham')
      .groupBy("DATE_FORMAT(ltn.thoiGianDen, '%Y-%m-%d')")
      .addGroupBy("DATE_FORMAT(ltn.thoiGianDen, '%d/%m')")
      .orderBy("rawDate", 'ASC');

    let revTrendQb = this.hoaDonRepo.createQueryBuilder('hd')
      .select("DATE_FORMAT(hd.ngayThanhToan, '%Y-%m-%d')", 'rawDate')
      .addSelect("DATE_FORMAT(hd.ngayThanhToan, '%d/%m')", 'ngay')
      .addSelect('SUM(hd.thucThu)', 'doanhThu')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .groupBy("DATE_FORMAT(hd.ngayThanhToan, '%Y-%m-%d')")
      .addGroupBy("DATE_FORMAT(hd.ngayThanhToan, '%d/%m')")
      .orderBy("rawDate", 'ASC');

    if (startDateTime && endDateTime) {
      trendQb = trendQb.where('ltn.thoiGianDen BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
      revTrendQb = revTrendQb.andWhere('hd.ngayThanhToan BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
    } else if (filter.range === 'tat_ca') {
      // Toàn thời gian: Lấy đầy đủ lịch sử hoạt động, không limit để tránh làm đứt đoạn dữ liệu tháng 9 và 10
    } else {
      trendQb = trendQb.where('ltn.thoiGianDen >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');
      revTrendQb = revTrendQb.andWhere('hd.ngayThanhToan >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');
    }

    const trendData = await trendQb.getRawMany();
    const revTrend = await revTrendQb.getRawMany();

    // Tập hợp và bù ngày liên tục (zero-filling) để biểu đồ luôn liền mạch, thanh mảnh
    const dateMap = new Map<string, { rawDate: string; ngay: string; soLuotKham: number; doanhThu: number }>();

    if (startDate && endDate) {
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      const diffTime = Math.abs(endD.getTime() - startD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 31) {
        for (let i = 0; i <= diffDays; i++) {
          const curr = new Date(startD);
          curr.setDate(curr.getDate() + i);
          const raw = curr.toISOString().slice(0, 10);
          const dd = String(curr.getDate()).padStart(2, '0');
          const mm = String(curr.getMonth() + 1).padStart(2, '0');
          dateMap.set(raw, { rawDate: raw, ngay: `${dd}/${mm}`, soLuotKham: 0, doanhThu: 0 });
        }
      }
    }

    for (const t of trendData) {
      const key = t.rawDate;
      if (dateMap.has(key)) {
        dateMap.get(key)!.soLuotKham = Number(t.soLuotKham || 0);
      } else {
        dateMap.set(key, { rawDate: key, ngay: t.ngay, soLuotKham: Number(t.soLuotKham || 0), doanhThu: 0 });
      }
    }

    for (const r of revTrend) {
      const key = r.rawDate;
      if (dateMap.has(key)) {
        dateMap.get(key)!.doanhThu = Number(r.doanhThu || 0);
      } else {
        dateMap.set(key, { rawDate: key, ngay: r.ngay, soLuotKham: 0, doanhThu: Number(r.doanhThu || 0) });
      }
    }

    // Sắp xếp tăng dần theo rawDate (YYYY-MM-DD)
    const chart7Days = Array.from(dateMap.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // 6. Cơ cấu doanh thu theo loại phí
    let coCauQb = this.hoaDonChiTietRepo.createQueryBuilder('ct')
      .innerJoin('ct.hoaDon', 'hd')
      .select('ct.loaiPhi', 'loaiPhi')
      .addSelect('SUM(ct.thanhTien)', 'tongTien')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .groupBy('ct.loaiPhi');

    if (startDateTime && endDateTime) {
      coCauQb = coCauQb.andWhere('hd.ngayThanhToan BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
    }
    const coCauRaw = await coCauQb.getRawMany();

    const LOAI_PHI_LABEL: Record<string, string> = {
      kham_benh: 'Khám bệnh',
      xet_nghiem: 'Xét nghiệm',
      thuoc: 'Thuốc / Dược',
      cdha: 'Chẩn đoán hình ảnh',
      tam_ung: 'Tạm ứng',
      khac: 'Khác',
    };

    const coCauDoanhThu = coCauRaw.map(c => ({
      name: LOAI_PHI_LABEL[c.loaiPhi] || c.loaiPhi,
      value: Number(c.tongTien),
    }));

    // 7. Top bác sĩ khám nhiều nhất
    let topBacSiQuery = `
      SELECT nv.ho_ten AS hoTen, bs.chuyen_khoa AS chuyenKhoa, COUNT(bak.id) AS soCa
      FROM benh_an_kham bak
      JOIN bac_si bs ON bak.bac_si_id = bs.id
      JOIN nhan_vien nv ON bs.nhan_vien_id = nv.id
    `;
    const params: any[] = [];
    if (startDateTime && endDateTime) {
      topBacSiQuery += ` WHERE bak.ngay_kham BETWEEN ? AND ? `;
      params.push(startDateTime, endDateTime);
    }
    topBacSiQuery += `
      GROUP BY nv.ho_ten, bs.chuyen_khoa
      ORDER BY soCa DESC
      LIMIT 5
    `;
    const topBacSi = await this.benhAnRepo.query(topBacSiQuery, params);

    // 8. Thống kê cận lâm sàng & tỷ lệ hoàn thành
    let clsCountQb = this.clsRepo.createQueryBuilder('cls');
    let donThuocCountQb = this.donThuocRepo.createQueryBuilder('dt');

    if (startDateTime && endDateTime) {
      clsCountQb = clsCountQb.where('cls.thoiGianChiDinh BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
      donThuocCountQb = donThuocCountQb.where('dt.ngayKe BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
    }

    const clsCountRaw = await clsCountQb.getCount();
    const donThuocCountRaw = await donThuocCountQb.getCount();

    // Lấy số ca CLS đã hoàn thành
    let clsDoneQb = this.clsRepo.createQueryBuilder('cls')
      .where('cls.trangThai = :st', { st: 'co_ket_qua' });
    if (startDateTime && endDateTime) {
      clsDoneQb = clsDoneQb.andWhere('cls.thoiGianChiDinh BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
    }
    const clsDoneCount = await clsDoneQb.getCount();
    const tyLeHoanThanhCls = clsCountRaw > 0 ? `${Math.round((clsDoneCount / clsCountRaw) * 100)}%` : '100%';

    // 9. Thống kê Kênh tiếp nhận bệnh nhân thực tế
    let kenhQb = this.tiepNhanRepo.createQueryBuilder('ltn')
      .leftJoin('ltn.lichHen', 'lh')
      .select('COUNT(*)', 'tong')
      .addSelect('SUM(CASE WHEN lh.nguon_dat = "benh_nhan_tu_dat" THEN 1 ELSE 0 END)', 'online')
      .addSelect('SUM(CASE WHEN lh.id IS NULL OR lh.nguon_dat != "benh_nhan_tu_dat" THEN 1 ELSE 0 END)', 'taiQuay');

    if (startDateTime && endDateTime) {
      kenhQb = kenhQb.where('ltn.thoiGianDen BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
    }
    const kenhRaw = await kenhQb.getRawOne();
    const tongKenh = Number(kenhRaw?.tong || 0);
    const onlineCount = Number(kenhRaw?.online || 0);
    const taiQuayCount = Number(kenhRaw?.taiQuay || 0);

    const kenhTiepNhan = tongKenh > 0 ? [
      {
        name: 'Hẹn trước (Trực tuyến / App)',
        value: Math.round((onlineCount / tongKenh) * 100),
        soCa: onlineCount,
        color: '#2563EB',
      },
      {
        name: 'Tiếp nhận trực tiếp tại quầy',
        value: Math.round((taiQuayCount / tongKenh) * 100),
        soCa: taiQuayCount,
        color: '#0D9488',
      },
    ] : [
      { name: 'Hẹn trước (Trực tuyến / App)', value: 50, soCa: 0, color: '#2563EB' },
      { name: 'Tiếp nhận trực tiếp tại quầy', value: 50, soCa: 0, color: '#0D9488' },
    ];

    // 10. Hoạt động Cận lâm sàng chi tiết
    let clsDetailQuery = `
      SELECT dv.ten_dich_vu AS ten,
             COUNT(cls.id) AS tong,
             SUM(CASE WHEN cls.trang_thai = 'co_ket_qua' THEN 1 ELSE 0 END) AS hoanThanh
      FROM chi_dinh_can_lam_sang cls
      JOIN dich_vu_xet_nghiem dv ON cls.dich_vu_xet_nghiem_id = dv.id
    `;
    const clsParams: any[] = [];
    if (startDateTime && endDateTime) {
      clsDetailQuery += ` WHERE cls.thoi_gian_chi_dinh BETWEEN ? AND ? `;
      clsParams.push(startDateTime, endDateTime);
    }
    clsDetailQuery += `
      GROUP BY dv.ten_dich_vu
      ORDER BY tong DESC
      LIMIT 5
    `;
    const clsDetailRaw = await this.clsRepo.query(clsDetailQuery, clsParams);
    const hoatDongCls = clsDetailRaw.map((item: any) => {
      const tong = Number(item.tong || 0);
      const hoanThanh = Number(item.hoanThanh || 0);
      const tyLe = tong > 0 ? `${Math.round((hoanThanh / tong) * 100)}%` : '100%';
      return {
        ten: item.ten,
        tong,
        hoanThanh,
        tyLe,
      };
    });

    return {
      kpis: {
        tongDoanhThu,
        doanhThuHomNay,
        doanhThuTrongKy,
        totalTiepNhan,
        tiepNhanHomNay,
        tiepNhanTrongKy,
        soBacSi,
        soNhanVien,
        donChoDuyet,
        soCaCanLamSang: clsCountRaw,
        soCaHoanThanhCls: clsDoneCount,
        tyLeHoanThanhCls,
        soDonThuoc: donThuocCountRaw,
      },
      chart7Days,
      coCauDoanhThu,
      kenhTiepNhan,
      hoatDongCls,
      topBacSi: topBacSi.map((b: any) => ({
        hoTen: b.hoTen || 'Bác sĩ',
        chuyenKhoa: b.chuyenKhoa || 'Đa khoa',
        soCa: Number(b.soCa),
      })),
      filter: {
        range: filter.range || 'tat_ca',
        startDate,
        endDate,
      },
    };
  }

  // ============================================================
  // UC 18: BÁO CÁO TÀI CHÍNH & DOANH THU CHI TIẾT (BAN GIÁM ĐỐC)
  // ============================================================
  async getBaoCaoTaiChinh(filter: { tuNgay?: string; denNgay?: string; loaiPhi?: string; phuongThuc?: string }) {
    const qb = this.hoaDonRepo.createQueryBuilder('hd')
      .leftJoinAndSelect('hd.benhNhan', 'bn')
      .leftJoinAndSelect('hd.thuNgan', 'tn')
      .leftJoinAndSelect('hd.chiTiet', 'ct')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .orderBy('hd.ngayThanhToan', 'DESC');

    if (filter.tuNgay) {
      qb.andWhere('hd.ngayThanhToan >= :tuNgay', { tuNgay: filter.tuNgay + ' 00:00:00' });
    }
    if (filter.denNgay) {
      qb.andWhere('hd.ngayThanhToan <= :denNgay', { denNgay: filter.denNgay + ' 23:59:59' });
    }
    if (filter.phuongThuc && filter.phuongThuc !== 'all') {
      qb.andWhere('hd.phuongThucThanhToan = :pt', { pt: filter.phuongThuc });
    }

    const hoaDons = await qb.getMany();

    // Summary calculations
    let tongThucThu = 0;
    let tongTienGiam = 0;
    const byPhuongThuc: Record<string, number> = {};
    const byNgay: Record<string, number> = {};

    hoaDons.forEach(h => {
      const tt = Number(h.thucThu);
      tongThucThu += tt;
      tongTienGiam += Number(h.soTienGiam || 0);

      const pt = h.phuongThucThanhToan || 'tien_mat';
      byPhuongThuc[pt] = (byPhuongThuc[pt] || 0) + tt;

      const d = h.ngayThanhToan ? new Date(h.ngayThanhToan).toISOString().slice(0, 10) : 'Khác';
      byNgay[d] = (byNgay[d] || 0) + tt;
    });

    const timelineData = Object.entries(byNgay).map(([ngay, tongTien]) => ({
      ngay,
      tongTien,
    })).sort((a, b) => a.ngay.localeCompare(b.ngay));

    return {
      tongThucThu,
      tongTienGiam,
      tongGiaoDich: hoaDons.length,
      byPhuongThuc,
      timelineData,
      danhSachHoaDon: hoaDons.map(hd => ({
        id: hd.id,
        maHoaDon: hd.maHoaDon,
        benhNhanTen: hd.benhNhan?.hoTen,
        benhNhanSdt: hd.benhNhan?.soDienThoai,
        tongTien: Number(hd.tongTien),
        soTienGiam: Number(hd.soTienGiam),
        thucThu: Number(hd.thucThu),
        phuongThuc: hd.phuongThucThanhToan,
        ngayThanhToan: hd.ngayThanhToan,
        thuNganTen: hd.thuNgan?.hoTen,
        chiTiet: hd.chiTiet?.map(c => ({
          loaiPhi: c.loaiPhi,
          moTa: c.moTa,
          thanhTien: Number(c.thanhTien),
        })),
      })),
    };
  }

  // ============================================================
  // UC BÁO CÁO TOÀN DIỆN BAN GIÁM ĐỐC (LÂM SÀNG, CLS, DƯỢC, TÀI CHÍNH)
  // ============================================================
  async getBaoCaoToanDien(filter: { tuNgay?: string; denNgay?: string; phuongThuc?: string }) {
    // 1. Tài chính cơ sở
    const taiChinh = await this.getBaoCaoTaiChinh(filter);

    let tuNgayStr: string | null = null;
    let denNgayStr: string | null = null;
    if (filter.tuNgay) tuNgayStr = `${filter.tuNgay} 00:00:00`;
    if (filter.denNgay) denNgayStr = `${filter.denNgay} 23:59:59`;

    // 1.1 Thống kê Sổ quỹ & Chi phí hoạt động / Chi trả NCC (Thu ngân & Dược)
    // a. Chi phí mua thuốc nhà cung cấp (từ yeu_cau_nhap_kho)
    let chiNccSql = `
      SELECT 
        COUNT(id) AS tongDonNcc,
        COALESCE(SUM(so_tien_chi_tra), 0) AS chiMuaThuocNcc
      FROM yeu_cau_nhap_kho
      WHERE trang_thai_chi_tra = 'da_chi'
    `;
    const chiNccParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      chiNccSql += ` AND ngay_chi_tra BETWEEN ? AND ? `;
      chiNccParams.push(tuNgayStr, denNgayStr);
    }
    const chiNccRaw = await this.hoaDonRepo.query(chiNccSql, chiNccParams).catch(() => [{ tongDonNcc: 0, chiMuaThuocNcc: 0 }]);
    const chiMuaThuocNcc = Number(chiNccRaw[0]?.chiMuaThuocNcc || 0);
    const tongDonNcc = Number(chiNccRaw[0]?.tongDonNcc || 0);

    // Chi tiết các khoản chi mua thuốc NCC
    let chiNccListSql = `
      SELECT 
        y.id,
        y.ma_yeu_cau AS maPhieu,
        'Chi mua thuốc & vật tư NCC' AS loaiChi,
        'Thanh toán nhập kho dược' AS khoanChi,
        COALESCE(y.so_hoa_don_ncc, 'Hóa đơn NCC') AS nguoiNhan,
        y.so_tien_chi_tra AS soTien,
        COALESCE(y.phuong_thuc_chi, 'chuyen_khoan') AS phuongThucChi,
        y.ngay_chi_tra AS ngayChi,
        COALESCE(nv.ho_ten, 'Dược sĩ / Thủ quỹ') AS nguoiChi,
        COALESCE(y.ghi_chu_chi, y.ghi_chu, '') AS ghiChu
      FROM yeu_cau_nhap_kho y
      LEFT JOIN nhan_vien nv ON y.nguoi_chi_tra_id = nv.id
      WHERE y.trang_thai_chi_tra = 'da_chi'
    `;
    const chiNccListParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      chiNccListSql += ` AND y.ngay_chi_tra BETWEEN ? AND ? `;
      chiNccListParams.push(tuNgayStr, denNgayStr);
    }
    chiNccListSql += ` ORDER BY y.ngay_chi_tra DESC LIMIT 150 `;
    const chiNccListRaw = await this.hoaDonRepo.query(chiNccListSql, chiNccListParams).catch(() => []);

    // b. Chi phí hoạt động vận hành (từ phieu_chi_hoat_dong)
    let opexSql = `
      SELECT 
        COUNT(id) AS tongPhieuOpex,
        COALESCE(SUM(so_tien), 0) AS tongTienOpex
      FROM phieu_chi_hoat_dong
    `;
    const opexParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      opexSql += ` WHERE ngay_chi BETWEEN ? AND ? `;
      opexParams.push(tuNgayStr, denNgayStr);
    }
    const opexRaw = await this.hoaDonRepo.query(opexSql, opexParams).catch(() => [{ tongPhieuOpex: 0, tongTienOpex: 0 }]);
    const tongTienOpex = Number(opexRaw[0]?.tongTienOpex || 0);
    const tongPhieuOpex = Number(opexRaw[0]?.tongPhieuOpex || 0);

    // Chi tiết phiếu chi hoạt động
    let opexListSql = `
      SELECT 
        p.id,
        p.ma_phieu_chi AS maPhieu,
        COALESCE(p.loai_chi, 'Chi phí vận hành') AS loaiChi,
        p.khoan_chi AS khoanChi,
        COALESCE(p.nguoi_nhan, 'Đối tác / Nội bộ') AS nguoiNhan,
        p.so_tien AS soTien,
        COALESCE(p.phuong_thuc_chi, 'tien_mat') AS phuongThucChi,
        p.ngay_chi AS ngayChi,
        COALESCE(nv.ho_ten, 'Kế toán / Thủ quỹ') AS nguoiChi,
        COALESCE(p.ghi_chu, '') AS ghiChu
      FROM phieu_chi_hoat_dong p
      LEFT JOIN nhan_vien nv ON p.nguoi_lap_id = nv.id
    `;
    const opexListParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      opexListSql += ` WHERE p.ngay_chi BETWEEN ? AND ? `;
      opexListParams.push(tuNgayStr, denNgayStr);
    }
    opexListSql += ` ORDER BY p.ngay_chi DESC LIMIT 150 `;
    const opexListRaw = await this.hoaDonRepo.query(opexListSql, opexListParams).catch(() => []);

    // Hợp nhất danh sách chi và sắp xếp theo ngày chi giảm dần
    const danhSachChiPhi = [...chiNccListRaw, ...opexListRaw].sort((a, b) => {
      const timeA = new Date(a.ngayChi || 0).getTime();
      const timeB = new Date(b.ngayChi || 0).getTime();
      return timeB - timeA;
    });

    const tongChiHoatDong = chiMuaThuocNcc + tongTienOpex;
    const tongPhieuChi = tongDonNcc + tongPhieuOpex;
    const thucThuRong = Math.max(0, Number(taiChinh.tongThucThu || 0) - tongChiHoatDong);

    const tienMatTaiKet = Number(taiChinh.byPhuongThuc?.tien_mat || 0);
    // Tổng thanh toán không dùng tiền mặt (Chuyển khoản, Thẻ POS, VNPay, MoMo, BHYT thanh toán)
    const khongDungTienMat = Math.max(0, Number(taiChinh.tongThucThu || 0) - tienMatTaiKet);

    const soQuyStats = {
      tongThuVienPhi: Number(taiChinh.tongThucThu || 0),
      tongChiHoatDong,
      chiMuaThuocNcc,
      tongTienOpex,
      thucThuRong,
      tongPhieuChi,
      tienMatTaiKet,
      chuyenKhoanNganHang: khongDungTienMat,
      danhSachChiPhi,
    };

    // 2. Thống kê Lâm sàng & Tiếp nhận
    let totalTiepNhan = 0;
    let daKham = 0;
    let dangKham = 0;
    let choKham = 0;

    let tnStatsQb = this.tiepNhanRepo.createQueryBuilder('ltn')
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN ltn.trangThai IN ('hoan_thanh', 'hoan_tat', 'da_kham') THEN 1 ELSE 0 END)", 'daKham')
      .addSelect("SUM(CASE WHEN ltn.trangThai = 'dang_kham' THEN 1 ELSE 0 END)", 'dangKham')
      .addSelect("SUM(CASE WHEN ltn.trangThai IN ('cho_kham', 'dang_cho', 'tiep_nhan') THEN 1 ELSE 0 END)", 'choKham');

    if (tuNgayStr && denNgayStr) {
      tnStatsQb = tnStatsQb.where('ltn.thoiGianDen BETWEEN :s AND :e', { s: tuNgayStr, e: denNgayStr });
    }
    const tnStatsRaw = await tnStatsQb.getRawOne().catch(() => null);
    totalTiepNhan = Number(tnStatsRaw?.total || 0);
    daKham = Number(tnStatsRaw?.daKham || 0);
    dangKham = Number(tnStatsRaw?.dangKham || 0);
    choKham = Number(tnStatsRaw?.choKham || 0);

    const tiepNhanHomNay = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .getCount();

    // Phân tích Kênh tiếp nhận bệnh nhân
    let kenhSql = `
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN lh.nguon_dat = 'benh_nhan_tu_dat' THEN 1 ELSE 0 END) AS henTruoc,
        SUM(CASE WHEN lh.id IS NULL OR lh.nguon_dat != 'benh_nhan_tu_dat' THEN 1 ELSE 0 END) AS taiQuay
      FROM luot_tiep_nhan ltn
      LEFT JOIN lich_hen lh ON ltn.lich_hen_id = lh.id
    `;
    const kenhParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      kenhSql += ` WHERE ltn.thoi_gian_den BETWEEN ? AND ? `;
      kenhParams.push(tuNgayStr, denNgayStr);
    }
    const kenhRaw = await this.tiepNhanRepo.query(kenhSql, kenhParams);
    const kTotal = Number(kenhRaw[0]?.total || 0);
    const kHenTruoc = Number(kenhRaw[0]?.henTruoc || 0);
    const kTaiQuay = Number(kenhRaw[0]?.taiQuay || 0);

    const kenhTiepNhan = [
      {
        kenh: 'Hẹn trước (Trực tuyến / App)',
        soLuot: kHenTruoc,
        tyLe: kTotal > 0 ? `${((kHenTruoc / kTotal) * 100).toFixed(1)}%` : '0%',
        moTa: 'Bệnh nhân đặt khám chủ động qua Cổng thông tin / Ứng dụng',
      },
      {
        kenh: 'Tiếp nhận trực tiếp tại quầy',
        soLuot: kTaiQuay,
        tyLe: kTotal > 0 ? `${((kTaiQuay / kTotal) * 100).toFixed(1)}%` : '0%',
        moTa: 'Bệnh nhân đến lấy số thứ tự trực tiếp tại sảnh đón tiếp',
      },
    ];

    // Thống kê theo chuyên khoa
    let chuyenKhoaSql = `
      SELECT 
        bs.chuyen_khoa AS chuyenKhoa,
        nv.ho_ten AS bacSiPhuTrach,
        COUNT(bak.id) AS soCa
      FROM benh_an_kham bak
      JOIN bac_si bs ON bak.bac_si_id = bs.id
      JOIN nhan_vien nv ON bs.nhan_vien_id = nv.id
    `;
    const ckParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      chuyenKhoaSql += ` WHERE bak.ngay_kham BETWEEN ? AND ? `;
      ckParams.push(tuNgayStr, denNgayStr);
    }
    chuyenKhoaSql += `
      GROUP BY bs.chuyen_khoa, nv.ho_ten
      ORDER BY soCa DESC
    `;
    const ckRaw = await this.benhAnRepo.query(chuyenKhoaSql, ckParams);
    const tongSoCaKham = ckRaw.reduce((acc: number, cur: any) => acc + Number(cur.soCa || 0), 0);
    const chuyenKhoaStats = ckRaw.map((r: any) => {
      const soCa = Number(r.soCa || 0);
      return {
        chuyenKhoa: r.chuyenKhoa || 'Đa khoa',
        bacSiPhuTrach: r.bacSiPhuTrach || 'Bác sĩ',
        soCa,
        tyLe: tongSoCaKham > 0 ? `${((soCa / tongSoCaKham) * 100).toFixed(1)}%` : '0%',
        doanhThu: soCa * 150000,
      };
    });

    // Danh sách chi tiết bệnh nhân tiếp nhận khám
    let tnListSql = `
      SELECT 
        ltn.id,
        ltn.ma_so_thu_tu AS maSoThuTu,
        ltn.thoi_gian_den AS thoiGianDen,
        ltn.trang_thai AS trangThai,
        COALESCE(ltn.chuyen_khoa, 'Đa khoa') AS chuyenKhoa,
        COALESCE(bn.ho_ten, 'Vãng lai') AS benhNhanTen,
        COALESCE(bn.so_dien_thoai, '-') AS benhNhanSdt,
        COALESCE(bn.gioi_tinh, 'Khác') AS benhNhanGioiTinh,
        COALESCE(nv_bs.ho_ten, 'Chưa chỉ định') AS bacSiTen,
        COALESCE(pk.ten_phong, 'Phòng tiếp nhận') AS tenPhong,
        CASE WHEN lh.nguon_dat = 'benh_nhan_tu_dat' THEN 'Đặt hẹn online' ELSE 'Tiếp nhận quầy' END AS nguonDonTiep
      FROM luot_tiep_nhan ltn
      LEFT JOIN benh_nhan bn ON ltn.benh_nhan_id = bn.id
      LEFT JOIN bac_si bs ON ltn.bac_si_id = bs.id
      LEFT JOIN nhan_vien nv_bs ON bs.nhan_vien_id = nv_bs.id
      LEFT JOIN phong_kham pk ON ltn.phong_kham_id = pk.id
      LEFT JOIN lich_hen lh ON ltn.lich_hen_id = lh.id
    `;
    const tnListParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      tnListSql += ` WHERE ltn.thoi_gian_den BETWEEN ? AND ? `;
      tnListParams.push(tuNgayStr, denNgayStr);
    }
    tnListSql += ` ORDER BY ltn.thoi_gian_den DESC LIMIT 200 `;
    const danhSachTiepNhan = await this.tiepNhanRepo.query(tnListSql, tnListParams).catch(() => []);

    // 3. Thống kê Cận Lâm Sàng (CLS)
    let clsQb = this.clsRepo.createQueryBuilder('cls');
    if (tuNgayStr && denNgayStr) {
      clsQb = clsQb.where('cls.thoiGianChiDinh BETWEEN :s AND :e', { s: tuNgayStr, e: denNgayStr });
    }
    const clsTong = await clsQb.getCount();

    let clsHoanThanhQb = this.clsRepo.createQueryBuilder('cls')
      .where('cls.trangThai = :st', { st: 'co_ket_qua' });
    if (tuNgayStr && denNgayStr) {
      clsHoanThanhQb = clsHoanThanhQb.andWhere('cls.thoiGianChiDinh BETWEEN :s AND :e', { s: tuNgayStr, e: denNgayStr });
    }
    const clsHoanThanh = await clsHoanThanhQb.getCount();

    let clsDangThucHienQb = this.clsRepo.createQueryBuilder('cls')
      .where('cls.trangThai IN (:...sts)', { sts: ['dang_lay_mau', 'dang_xu_ly'] });
    if (tuNgayStr && denNgayStr) {
      clsDangThucHienQb = clsDangThucHienQb.andWhere('cls.thoiGianChiDinh BETWEEN :s AND :e', { s: tuNgayStr, e: denNgayStr });
    }
    const clsDangThucHien = await clsDangThucHienQb.getCount();

    let clsChoQb = this.clsRepo.createQueryBuilder('cls')
      .where('cls.trangThai = :st', { st: 'cho_lay_mau' });
    if (tuNgayStr && denNgayStr) {
      clsChoQb = clsChoQb.andWhere('cls.thoiGianChiDinh BETWEEN :s AND :e', { s: tuNgayStr, e: denNgayStr });
    }
    const clsCho = await clsChoQb.getCount();

    // Danh mục dịch vụ CLS
    let clsDvSql = `
      SELECT 
        dv.ten_dich_vu AS tenDichVu,
        dv.loai AS loaiRaw,
        dv.gia AS donGia,
        COUNT(cls.id) AS soCa,
        SUM(CASE WHEN cls.trang_thai = 'co_ket_qua' THEN 1 ELSE 0 END) AS soCaXong
      FROM chi_dinh_can_lam_sang cls
      JOIN dich_vu_xet_nghiem dv ON cls.dich_vu_xet_nghiem_id = dv.id
    `;
    const clsDvParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      clsDvSql += ` WHERE cls.thoi_gian_chi_dinh BETWEEN ? AND ? `;
      clsDvParams.push(tuNgayStr, denNgayStr);
    }
    clsDvSql += `
      GROUP BY dv.id, dv.ten_dich_vu, dv.loai, dv.gia
      ORDER BY soCa DESC
    `;
    const clsDvRaw = await this.clsRepo.query(clsDvSql, clsDvParams);
    const danhMucDichVu = clsDvRaw.map((row: any) => {
      const soCa = Number(row.soCa || 0);
      const soCaXong = Number(row.soCaXong || 0);
      const donGia = Number(row.donGia || 0);
      return {
        tenDichVu: row.tenDichVu,
        loai: row.loaiRaw === 'cdha' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm',
        soCa,
        donGia,
        doanhThu: soCa * donGia,
        tyLeHoanThanh: soCa > 0 ? `${Math.round((soCaXong / soCa) * 100)}%` : '100%',
      };
    });

    // Danh sách chi tiết các ca chỉ định cận lâm sàng
    let clsListSql = `
      SELECT 
        cls.id,
        cls.trang_thai AS trangThai,
        cls.thoi_gian_chi_dinh AS thoiGianChiDinh,
        COALESCE(cls.ghi_chu_chi_dinh, '') AS ghiChu,
        dv.ten_dich_vu AS tenDichVu,
        CASE WHEN dv.loai = 'cdha' THEN 'Chẩn đoán hình ảnh' ELSE 'Xét nghiệm' END AS loaiDichVu,
        dv.gia AS donGia,
        COALESCE(bn.ho_ten, 'Bệnh nhân') AS benhNhanTen,
        COALESCE(bn.so_dien_thoai, '-') AS benhNhanSdt,
        COALESCE(nv_bs.ho_ten, 'Bác sĩ') AS bacSiTen,
        COALESCE(nv_ktv.ho_ten, 'Kỹ thuật viên') AS ktvTen
      FROM chi_dinh_can_lam_sang cls
      JOIN dich_vu_xet_nghiem dv ON cls.dich_vu_xet_nghiem_id = dv.id
      JOIN benh_an_kham bak ON cls.benh_an_kham_id = bak.id
      JOIN ho_so_benh_an hs ON bak.ho_so_benh_an_id = hs.id
      JOIN benh_nhan bn ON hs.benh_nhan_id = bn.id
      LEFT JOIN bac_si bs ON cls.bac_si_chi_dinh_id = bs.id
      LEFT JOIN nhan_vien nv_bs ON bs.nhan_vien_id = nv_bs.id
      LEFT JOIN ky_thuat_vien ktv ON cls.ky_thuat_vien_id = ktv.id
      LEFT JOIN nhan_vien nv_ktv ON ktv.nhan_vien_id = nv_ktv.id
    `;
    const clsListParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      clsListSql += ` WHERE cls.thoi_gian_chi_dinh BETWEEN ? AND ? `;
      clsListParams.push(tuNgayStr, denNgayStr);
    }
    clsListSql += ` ORDER BY cls.thoi_gian_chi_dinh DESC LIMIT 200 `;
    const clsListRaw = await this.clsRepo.query(clsListSql, clsListParams).catch(() => []);
    const danhSachChiDinhCls = clsListRaw.map((r: any) => ({
      ...r,
      donGia: Number(r.donGia || 0),
    }));

    const clsStats = {
      tongChiDinh: clsTong,
      daHoanThanh: clsHoanThanh,
      daThucHien: clsHoanThanh,
      dangThucHien: clsDangThucHien,
      choTiepNhan: clsCho,
      choThucHien: clsDangThucHien + clsCho,
      tyLeHoanThanh: clsTong > 0 ? `${((clsHoanThanh / clsTong) * 100).toFixed(1)}%` : '100%',
      thoiGianChoTB: '14.5 phút',
      danhMucDichVu,
      danhSachChiDinhCls,
    };

    // 4. Kho Dược & Nhà Thuốc
    let dtQb = this.donThuocRepo.createQueryBuilder('dt');
    if (tuNgayStr && denNgayStr) {
      dtQb = dtQb.where('dt.ngayKe BETWEEN :s AND :e', { s: tuNgayStr, e: denNgayStr });
    }
    const soDonThuocDaXuat = await dtQb.getCount();

    let topThuocSql = `
      SELECT 
        t.ma_thuoc AS maThuoc,
        t.ten_thuoc AS tenThuoc,
        t.ten_hoat_chat AS hoatChat,
        COALESCE(lt.ten_loai, 'Thuốc kê đơn') AS loai,
        t.don_vi_tinh AS donVi,
        SUM(dtct.so_luong) AS soLuongKe,
        SUM(dtct.so_luong * t.gia_ban) AS doanhThu
      FROM don_thuoc_chi_tiet dtct
      JOIN thuoc t ON dtct.thuoc_id = t.id
      LEFT JOIN loai_thuoc lt ON t.loai_thuoc_id = lt.id
      JOIN don_thuoc dt ON dtct.don_thuoc_id = dt.id
    `;
    const topThuocParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      topThuocSql += ` WHERE dt.ngay_ke BETWEEN ? AND ? `;
      topThuocParams.push(tuNgayStr, denNgayStr);
    }
    topThuocSql += `
      GROUP BY t.id, t.ma_thuoc, t.ten_thuoc, t.ten_hoat_chat, lt.ten_loai, t.don_vi_tinh
      ORDER BY soLuongKe DESC
      LIMIT 10
    `;
    const topThuocRaw = await this.donThuocRepo.query(topThuocSql, topThuocParams);
    const topThuocKeDon = topThuocRaw.map((r: any) => ({
      maThuoc: r.maThuoc,
      tenThuoc: r.tenThuoc,
      hoatChat: r.hoatChat || '-',
      loai: r.loai || 'Thuốc kê đơn',
      donVi: r.donVi || 'Viên',
      soLuongKe: Number(r.soLuongKe || 0),
      doanhThu: Number(r.doanhThu || 0),
    }));

    // Cảnh báo tồn kho & hạn sử dụng (chỉ lấy thuốc tồn <= 100 hoặc hạn dùng <= 90 ngày)
    const tonKhoRaw = await this.donThuocRepo.query(`
      SELECT 
        t.id,
        t.ma_thuoc AS maThuoc,
        t.ten_thuoc AS tenThuoc,
        t.ton_kho_tong AS tonKhoHienTai,
        100 AS tonKhoToiThieu,
        t.don_vi_tinh AS donVi,
        (SELECT MIN(ngay_het_han) FROM lo_thuoc WHERE thuoc_id = t.id AND so_luong_ton > 0) AS hanDung
      FROM thuoc t
      LEFT JOIN lo_thuoc lt ON lt.thuoc_id = t.id
      WHERE t.ton_kho_tong <= 100 
         OR (lt.ngay_het_han IS NOT NULL AND lt.ngay_het_han <= DATE_ADD(NOW(), INTERVAL 90 DAY))
      GROUP BY t.id, t.ma_thuoc, t.ten_thuoc, t.ton_kho_tong, t.don_vi_tinh
      ORDER BY t.ton_kho_tong ASC
      LIMIT 15
    `);

    const now = new Date();
    const canhBaoTonKho = tonKhoRaw.map((r: any) => {
      const tonKho = Number(r.tonKhoHienTai || 0);
      const hanDungDate = r.hanDung ? new Date(r.hanDung) : null;
      let diffDays = 999;
      if (hanDungDate) {
        diffDays = Math.ceil((hanDungDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      let mucDo: 'danger' | 'warning' = 'warning';
      let tinhTrang = 'Sắp hết hàng';

      if (tonKho === 0) {
        mucDo = 'danger';
        tinhTrang = 'Hết hàng - Cần nhập gấp';
      } else if (tonKho < 20) {
        mucDo = 'danger';
        tinhTrang = 'Nguy cấp - Tồn rất thấp';
      } else if (tonKho <= 100) {
        mucDo = 'warning';
        tinhTrang = 'Sắp hết hàng (< 100)';
      } else if (diffDays <= 30) {
        mucDo = 'danger';
        tinhTrang = `Cận date (${diffDays} ngày)`;
      } else if (diffDays <= 90) {
        mucDo = 'warning';
        tinhTrang = `Cận hạn dùng (${diffDays} ngày)`;
      }

      return {
        maThuoc: r.maThuoc,
        tenThuoc: r.tenThuoc,
        tonKhoHienTai: tonKho,
        tonKhoToiThieu: 100,
        donVi: r.donVi || 'Đơn vị',
        hanDung: hanDungDate ? hanDungDate.toLocaleDateString('vi-VN') : 'Đang cập nhật',
        mucDo,
        tinhTrang,
      };
    });

    const tongDoanhThuDuoc = topThuocKeDon.reduce((sum: number, cur: any) => sum + cur.doanhThu, 0);
    const giaTriTrungBinhDon = soDonThuocDaXuat > 0 ? Math.round(tongDoanhThuDuoc / soDonThuocDaXuat) : 0;

    // Tính tổng giá trị tài sản kho dược và số lượng cận date FEFO
    const khoValRaw = await this.donThuocRepo.query(`
      SELECT 
        COUNT(id) AS tongSoMatHang,
        COALESCE(SUM(ton_kho_tong * gia_ban), 0) AS tongGiaTriKho,
        (SELECT COUNT(DISTINCT thuoc_id) FROM lo_thuoc WHERE so_luong_ton > 0 AND ngay_het_han <= DATE_ADD(NOW(), INTERVAL 90 DAY)) AS thuocCanDateFEFO,
        (SELECT COUNT(DISTINCT CONCAT(t.id, '-', COALESCE(lt.id, '0'))) FROM thuoc t LEFT JOIN lo_thuoc lt ON lt.thuoc_id = t.id AND lt.so_luong_ton > 0 WHERE t.ton_kho_tong <= 100 OR lt.so_luong_ton <= 20) AS thuocSapHetHang
      FROM thuoc
    `).catch(() => [{ tongSoMatHang: 0, tongGiaTriKho: 0, thuocCanDateFEFO: 0, thuocSapHetHang: 0 }]);

    // Chi tiết toàn bộ danh mục kho dược theo Lô và Hạn dùng (FEFO)
    const rawTonKhoChiTiet = await this.donThuocRepo.query(`
      SELECT 
        t.id,
        t.ma_thuoc AS maThuoc,
        t.ten_thuoc AS tenThuoc,
        COALESCE(t.ten_hoat_chat, '-') AS tenHoatChat,
        COALESCE(t.don_vi_tinh, 'Viên') AS donViTinh,
        t.ton_kho_tong AS tonKhoTong,
        t.gia_ban AS giaBan,
        COALESCE(lt_loai.ten_loai, 'Thuốc') AS tenLoai,
        COALESCE(lt.ma_lo, 'LO-CHUNG') AS maLo,
        lt.ngay_san_xuat AS ngaySanXuat,
        lt.ngay_het_han AS ngayHetHan,
        COALESCE(lt.so_luong_ton, t.ton_kho_tong) AS tonLo,
        COALESCE(lt.gia_nhap, t.gia_ban * 0.8) AS giaNhap,
        COALESCE(lt.nha_cung_cap, 'Công ty dược phẩm') AS nhaCungCap
      FROM thuoc t
      LEFT JOIN loai_thuoc lt_loai ON t.loai_thuoc_id = lt_loai.id
      LEFT JOIN lo_thuoc lt ON lt.thuoc_id = t.id AND lt.so_luong_ton > 0
      ORDER BY t.ten_thuoc ASC
      LIMIT 300
    `).catch(() => []);

    const danhSachTonKhoChiTiet = rawTonKhoChiTiet.map((r: any) => {
      const expDate = r.ngayHetHan ? new Date(r.ngayHetHan) : null;
      let soNgayHetHan = 999;
      if (expDate) {
        soNgayHetHan = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        ...r,
        tonKhoTong: Number(r.tonKhoTong || 0),
        giaBan: Number(r.giaBan || 0),
        tonLo: Number(r.tonLo || 0),
        giaNhap: Number(r.giaNhap || 0),
        soNgayHetHan,
      };
    });

    // Chi tiết đơn thuốc xuất
    let dtListSql = `
      SELECT 
        dt.id,
        dt.ma_don_thuoc AS maDonThuoc,
        dt.ngay_ke AS ngayKe,
        dt.ngay_cap_phat AS ngayCapPhat,
        dt.trang_thai AS trangThai,
        COALESCE(bn.ho_ten, 'Bệnh nhân') AS benhNhanTen,
        COALESCE(bn.so_dien_thoai, '-') AS benhNhanSdt,
        COALESCE(nv_bs.ho_ten, 'Bác sĩ') AS bacSiTen,
        (SELECT COALESCE(SUM(dtct.so_luong * t.gia_ban), 0) FROM don_thuoc_chi_tiet dtct JOIN thuoc t ON dtct.thuoc_id = t.id WHERE dtct.don_thuoc_id = dt.id) AS tongTien
      FROM don_thuoc dt
      JOIN benh_an_kham bak ON dt.benh_an_kham_id = bak.id
      JOIN ho_so_benh_an hs ON bak.ho_so_benh_an_id = hs.id
      JOIN benh_nhan bn ON hs.benh_nhan_id = bn.id
      LEFT JOIN bac_si bs ON dt.bac_si_ke_id = bs.id
      LEFT JOIN nhan_vien nv_bs ON bs.nhan_vien_id = nv_bs.id
    `;
    const dtListParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      dtListSql += ` WHERE dt.ngay_ke BETWEEN ? AND ? `;
      dtListParams.push(tuNgayStr, denNgayStr);
    }
    dtListSql += ` ORDER BY dt.ngay_ke DESC LIMIT 200 `;
    const dtListRaw = await this.donThuocRepo.query(dtListSql, dtListParams).catch(() => []);
    const danhSachDonThuocXuat = dtListRaw.map((r: any) => ({
      ...r,
      tongTien: Number(r.tongTien || 0),
    }));

    const duocStats = {
      tongDoanhThuDuoc,
      soDonThuocDaXuat,
      giaTriTrungBinhDon,
      tongSoMatHang: Number(khoValRaw[0]?.tongSoMatHang || 0),
      tongSoThuoc: Number(khoValRaw[0]?.tongSoMatHang || 0),
      tongGiaTriKho: Number(khoValRaw[0]?.tongGiaTriKho || 0),
      thuocCanDateFEFO: Number(khoValRaw[0]?.thuocCanDateFEFO || 0),
      sapHetHanCount: Number(khoValRaw[0]?.thuocCanDateFEFO || 0),
      thuocSapHetHang: Number(khoValRaw[0]?.thuocSapHetHang || 0),
      sapHetHangCount: Number(khoValRaw[0]?.thuocSapHetHang || 0),
      topThuocKeDon,
      canhBaoTonKho,
      danhSachTonKhoChiTiet,
      danhSachDonThuocXuat,
    };

    return {
      taiChinh,
      soQuy: soQuyStats,
      lamSang: {
        totalTiepNhan,
        tongTiepNhan: totalTiepNhan,
        daKham,
        dangKham,
        choKham,
        tiepNhanHomNay,
        kenhTiepNhan,
        chuyenKhoaStats,
        danhSachTiepNhan,
      },
      cls: clsStats,
      duoc: duocStats,
    };
  }

  // ============================================================
  // UC 22: DUYỆT YÊU CẦU CỦA NHÂN VIÊN (BAN GIÁM ĐỐC)
  // ============================================================
  async getDanhSachDonTu(filter?: {
    trangThai?: string;
    vaiTro?: string;
    tuNgay?: string;
    denNgay?: string;
    loaiDon?: string;
  }) {
    const qb = this.donGuiRepo.createQueryBuilder('dg')
      .leftJoinAndSelect('dg.nguoiGui', 'nv')
      .leftJoinAndSelect('nv.nguoiDung', 'nd')
      .leftJoinAndSelect('nd.vaiTro', 'vt')
      .orderBy('dg.ngayGui', 'DESC');

    if (filter?.trangThai && filter.trangThai !== 'all') {
      qb.andWhere('dg.trangThai = :st', { st: filter.trangThai });
    }

    if (filter?.loaiDon && filter.loaiDon !== 'all') {
      qb.andWhere('dg.loaiDon = :ld', { ld: filter.loaiDon });
    }

    if (filter?.tuNgay) {
      qb.andWhere('dg.ngayGui >= :tuNgay', { tuNgay: `${filter.tuNgay} 00:00:00` });
    }

    if (filter?.denNgay) {
      qb.andWhere('dg.ngayGui <= :denNgay', { denNgay: `${filter.denNgay} 23:59:59` });
    }

    if (filter?.vaiTro && filter.vaiTro !== 'all') {
      qb.andWhere('(vt.maVaiTro = :vt OR nv.chucVu LIKE :vtLike OR vt.tenVaiTro LIKE :vtLike)', {
        vt: filter.vaiTro,
        vtLike: `%${filter.vaiTro}%`,
      });
    }

    const list = await qb.getMany();
    return list.map(d => ({
      id: d.id,
      loaiDon: d.loaiDon,
      noiDung: d.noiDung,
      fileDinhKem: d.fileDinhKem,
      ngayGui: d.ngayGui,
      trangThai: d.trangThai,
      ghiChuXuLy: d.ghiChuXuLy,
      ngayXuLy: d.ngayXuLy,
      nguoiGui: {
        id: d.nguoiGui?.id,
        hoTen: d.nguoiGui?.hoTen,
        chucVu: d.nguoiGui?.chucVu || d.nguoiGui?.nguoiDung?.vaiTro?.tenVaiTro || 'Nhân viên',
        maVaiTro: d.nguoiGui?.nguoiDung?.vaiTro?.maVaiTro,
        tenVaiTro: d.nguoiGui?.nguoiDung?.vaiTro?.tenVaiTro,
        soDienThoai: d.nguoiGui?.soDienThoai,
        email: d.nguoiGui?.email,
      },
    }));
  }

  async duyetDonTu(id: number, action: 'duyet' | 'tu_choi', ghiChuXuLy?: string) {
    const don = await this.donGuiRepo.findOne({ where: { id } });
    if (!don) throw new NotFoundException('Không tìm thấy đơn yêu cầu');

    don.trangThai = action === 'duyet' ? TrangThaiDonGui.DA_XU_LY : TrangThaiDonGui.TU_CHOI;
    don.ghiChuXuLy = ghiChuXuLy || (action === 'duyet' ? 'Đã phê duyệt' : 'Từ chối');
    don.ngayXuLy = new Date();

    await this.donGuiRepo.save(don);

    // Xử lý logic đặc thù nếu là "Yêu cầu hủy ca khám" của Bác sĩ
    if (don.loaiDon === 'Yêu cầu hủy ca khám' || don.noiDung?.includes('Lịch hẹn ID:')) {
      try {
        const matchLh = don.noiDung?.match(/\[Lịch hẹn ID:\s*(\d+)\]/i);
        const lichHenId = matchLh ? parseInt(matchLh[1], 10) : null;
        if (lichHenId) {
          const lh = await this.lichHenRepo.findOne({
            where: { id: lichHenId },
            relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
          });

          if (lh) {
            if (action === 'duyet') {
              lh.trangThai = TrangThaiLichHen.DA_HUY;
              lh.ghiChu = `${(lh.ghiChu || '').trim()} [CHỜ HOÀN CỌC 40.000đ] [Ban Giám Đốc đã duyệt hủy ca: ${don.ghiChuXuLy}] [Được hoàn tiền 100% tạm ứng 40.000đ]`.trim();
              await this.lichHenRepo.save(lh);

              // Đánh dấu phiếu thu tạm ứng (HDT...) sang trạng thái Chờ Thu ngân hoàn cọc (kèm thông tin nhận hoàn)
              const maHdTamUng = `HDT${(lh.maLichHen || '').replace(/^LH/i, '')}`;
              const pendingNote = `[CHỜ HOÀN CỌC 40.000đ] [TẠM ỨNG ĐẶT LỊCH] [MÃ_LỊCH_HẸN: ${lh.maLichHen}] [TK_HOÀN_TIỀN: chua_cung_cap|Chờ bệnh nhân cập nhật STK hoặc nhận tại quầy||${lh.benhNhan?.hoTen || ''}] [LÝ_DO_HỦY: Ban Giám Đốc phê duyệt hủy ca khám (${don.ghiChuXuLy || 'Theo đề xuất Bác sĩ'})]`;
              await this.lichHenRepo.manager.query(
                `UPDATE hoa_don
                 SET trang_thai = 'da_thanh_toan',
                     ghi_chu = ?
                 WHERE (ma_hoa_don = ? OR ghi_chu LIKE ?)`,
                [pendingNote, maHdTamUng, `%[MÃ_LỊCH_HẸN: ${lh.maLichHen}]%`],
              ).catch(() => {});

              // 1. GỬI THÔNG BÁO CHO BỆNH NHÂN VỀ CA HỦY VÀ HƯỚNG DẪN CẬP NHẬT STK NHẬN HOÀN CỌC
              const bnUserId = lh.benhNhan?.nguoiDungId;
              if (bnUserId) {
                await this.thongBaoService.taoThongBao({
                  nguoiNhanId: bnUserId,
                  tieuDe: `Thông báo hủy ca khám & nhận hoàn cọc 40.000đ: ${lh.maLichHen}`,
                  noiDung: `Ca khám mã ${lh.maLichHen} vào ngày ${lh.ngayHen} lúc ${lh.gioHen} của bạn đã được hủy theo đề xuất của Bác sĩ ${lh.bacSi?.nhanVien?.hoTen || ''} (Ban Giám Đốc đã phê duyệt). Quý khách được hoàn lại 100% tiền tạm ứng (40.000đ). Vui lòng vào mục "Lịch hẹn của tôi" bấm "Cập nhật STK nhận hoàn cọc" hoặc nhận trực tiếp tại Quầy Thu Ngân!`,
                  loai: 'lich_hen',
                  doiTuongBang: 'lich_hen',
                  doiTuongId: lh.id,
                }).catch(() => {});
              }

              // 2. GỬI THÔNG BÁO CHO BÁC SĨ
              const bsUserId = lh.bacSi?.nhanVien?.nguoiDungId;
              if (bsUserId) {
                await this.thongBaoService.taoThongBao({
                  nguoiNhanId: bsUserId,
                  tieuDe: `Ban Giám Đốc đã DUYỆT hủy ca khám [${lh.maLichHen}]`,
                  noiDung: `Yêu cầu hủy ca khám ${lh.maLichHen} (ngày ${lh.ngayHen} lúc ${lh.gioHen}) của bạn đã được Ban Giám Đốc phê duyệt. Hệ thống đã tự động gửi thông báo đến bệnh nhân và hoàn lại tiền tạm ứng.`,
                  loai: 'lich_hen',
                  doiTuongBang: 'lich_hen',
                  doiTuongId: lh.id,
                }).catch(() => {});
              }
            } else {
              // TỪ CHỐI HỦY CA
              lh.trangThai = TrangThaiLichHen.DA_XAC_NHAN;
              lh.ghiChu = `${(lh.ghiChu || '').trim()} [Ban Giám Đốc từ chối hủy ca: ${don.ghiChuXuLy}]`.trim();
              await this.lichHenRepo.save(lh);

              const bsUserId = lh.bacSi?.nhanVien?.nguoiDungId;
              if (bsUserId) {
                await this.thongBaoService.taoThongBao({
                  nguoiNhanId: bsUserId,
                  tieuDe: `Ban Giám Đốc TỪ CHỐI yêu cầu hủy ca khám [${lh.maLichHen}]`,
                  noiDung: `Yêu cầu hủy ca khám ${lh.maLichHen} ngày ${lh.ngayHen} lúc ${lh.gioHen} của bạn đã bị Ban Giám Đốc từ chối. Lý do: ${don.ghiChuXuLy}. Ca khám vẫn giữ nguyên trạng thái xác nhận.`,
                  loai: 'lich_hen',
                  doiTuongBang: 'lich_hen',
                  doiTuongId: lh.id,
                }).catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái lịch hẹn theo duyệt đơn:', err);
      }
    }

    // Xử lý logic nếu là "Đề xuất bổ sung danh mục thuốc", "Phiếu nhập kho thuốc" hoặc "Đề xuất vật tư y tế" của Dược sĩ
    if (don.loaiDon?.includes('thuốc') || don.loaiDon?.includes('Thuốc') || don.loaiDon?.includes('nhập kho') || don.loaiDon === 'Đề xuất vật tư y tế') {
      try {
        if (action === 'duyet') {
          // Kiểm tra nếu có JSON payload đi kèm
          const matchJson = don.noiDung?.match(/\[DATA_JSON:\s*(\{.*?\})\]/s);
          if (matchJson) {
            try {
              const data = JSON.parse(matchJson[1]);
              const soLuongNhap = Number(data.soLuongNhap || data.tonKhoTong || 0);
              const giaNhap = Number(data.giaNhap || (data.giaBan ? Math.round(Number(data.giaBan) * 0.7) : 0));
              const tongChiPhi = Number(data.tongChiPhi || (soLuongNhap * giaNhap));

              // 1. Kiểm tra xem thuốc đã tồn tại trong danh mục chưa (theo thuocId hoặc maThuoc)
              let maThuoc = data.maThuoc?.trim();
              if (!maThuoc && !data.thuocId) {
                const count = await this.donThuocRepo.query(`SELECT COUNT(*) as c FROM thuoc`);
                maThuoc = `TH${String(Number(count[0]?.c || 0) + 1).padStart(3, '0')}`;
              }

              let existing: any[] = [];
              if (data.thuocId) {
                existing = await this.donThuocRepo.query(`SELECT id, ton_kho_tong, ten_thuoc FROM thuoc WHERE id = ?`, [data.thuocId]);
              }
              if ((!existing || existing.length === 0) && maThuoc) {
                existing = await this.donThuocRepo.query(`SELECT id, ton_kho_tong, ten_thuoc FROM thuoc WHERE ma_thuoc = ?`, [maThuoc]);
              }

              let thuocId = 0;
              let tenThuocFinal = data.tenThuoc;

              if (existing && existing.length > 0) {
                thuocId = existing[0].id;
                tenThuocFinal = existing[0].ten_thuoc || data.tenThuoc;
                await this.donThuocRepo.query(
                  `UPDATE thuoc SET ton_kho_tong = ton_kho_tong + ?, trang_thai = 'con_hang' WHERE id = ?`,
                  [soLuongNhap, thuocId]
                );
              } else {
                const res = await this.donThuocRepo.query(
                  `INSERT INTO thuoc (ma_thuoc, ten_thuoc, ten_hoat_chat, don_vi_tinh, ham_luong, duong_dung, gia_ban, ton_kho_tong, mo_ta, trang_thai)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    maThuoc,
                    data.tenThuoc,
                    data.tenHoatChat || null,
                    data.donViTinh || 'Viên',
                    data.hamLuong || null,
                    data.duongDung || 'Uống',
                    Number(data.giaBan || (giaNhap * 1.3)),
                    soLuongNhap,
                    data.moTa || null,
                    soLuongNhap > 0 ? 'con_hang' : 'het_hang',
                  ]
                );
                thuocId = res.insertId;
              }

              // 2. Khởi tạo bản ghi Lô thuốc (Lô hạn sử dụng FEFO)
              if (thuocId > 0 && soLuongNhap > 0) {
                const maLo = data.maLo?.trim() || `L_${maThuoc || 'TH'}_${new Date().getFullYear()}`;
                const ngaySanXuat = data.ngaySanXuat || new Date().toISOString().slice(0, 10);
                const ngayHetHan = data.ngayHetHan || new Date(Date.now() + 365 * 24 * 3600 * 1000 * 2).toISOString().slice(0, 10);
                const nhaCungCap = data.nhaCungCap || 'Dược Hậu Giang (DHG Pharma)';

                await this.donThuocRepo.query(
                  `INSERT INTO lo_thuoc (thuoc_id, ma_lo, ngay_san_xuat, ngay_het_han, so_luong_nhap, so_luong_ton, gia_nhap, nha_cung_cap, trang_thai)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    thuocId,
                    maLo,
                    ngaySanXuat,
                    ngayHetHan,
                    soLuongNhap,
                    soLuongNhap,
                    giaNhap,
                    nhaCungCap,
                    'con_hang',
                  ]
                );
              }

              // Ghi nhận vào nhật ký hệ thống
              await this.donThuocRepo.query(
                `INSERT INTO nhat_ky_he_thong (hanh_dong, doi_tuong, chi_tiet, tao_luc)
                 VALUES (?, ?, ?, NOW())`,
                [
                  'DUYET_NHAP_KHO_THUOC',
                  'KHO_DUOC',
                  `Giám Đốc đã duyệt nhập kho: ${soLuongNhap} ${data.donViTinh || 'đơn vị'} thuốc [${tenThuocFinal}] - Tổng chi phí mua: ${tongChiPhi.toLocaleString('vi-VN')} VNĐ (NCC: ${data.nhaCungCap || 'Chưa rõ'})`,
                ]
              ).catch(() => {});
            } catch (errJson) {
              console.error('Lỗi phân tích JSON dữ liệu thuốc đề xuất:', errJson);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tự động nhập kho thuốc sau khi Giám Đốc duyệt:', err);
      }
    }

    // Thông báo cho người gửi đơn (nếu chưa được gửi qua luồng hủy ca khám)
    if (don.loaiDon !== 'Yêu cầu hủy ca khám') {
      try {
        const nvGui = await this.nhanVienRepo.findOne({ where: { id: don.nguoiGuiId } });
        const targetUserId = nvGui?.nguoiDungId;
        if (targetUserId) {
          const statusText = action === 'duyet' ? 'đã được PHÊ DUYỆT' : 'đã bị TỪ CHỐI';
          await this.thongBaoService.taoThongBao({
            nguoiNhanId: targetUserId,
            tieuDe: `Kết quả phê duyệt yêu cầu: ${don.loaiDon}`,
            noiDung: `Yêu cầu [${don.loaiDon}] của bạn ${statusText}. Ghi chú: ${don.ghiChuXuLy}`,
            loai: 'don_tu',
            doiTuongBang: 'don_gui',
            doiTuongId: don.id,
          });
        }
      } catch (e) {
        console.error('Lỗi gửi thông báo kết quả duyệt đơn:', e);
      }
    }

    return {
      success: true,
      message: action === 'duyet' ? 'Phê duyệt yêu cầu thành công' : 'Đã từ chối yêu cầu',
    };
  }

  // Nhân viên tạo đơn gửi Giám Đốc
  async taoDonTu(userId: number, dto: { loaiDon: string; noiDung: string; fileDinhKem?: string }) {
    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    const nguoiGuiId = nv ? nv.id : userId;

    const don = this.donGuiRepo.create({
      nguoiGuiId,
      loaiDon: dto.loaiDon,
      noiDung: dto.noiDung,
      fileDinhKem: dto.fileDinhKem || null,
      trangThai: TrangThaiDonGui.CHO_XU_LY,
    });

    const saved = await this.donGuiRepo.save(don);

    // Bắn thông báo đến Ban Giám Đốc
    try {
      const senderName = nv ? `${nv.hoTen} (${nv.chucVu || 'Nhân viên'})` : 'Nhân viên';
      await this.thongBaoService.taoThongBaoTheoRole('ban_giam_doc', {
        tieuDe: `Đơn trình Giám đốc mới: ${dto.loaiDon}`,
        noiDung: `${senderName} vừa gửi đơn yêu cầu [${dto.loaiDon}]. Nội dung: ${dto.noiDung.substring(0, 80)}${dto.noiDung.length > 80 ? '...' : ''}`,
        loai: 'don_tu',
        doiTuongBang: 'don_gui',
        doiTuongId: saved.id,
      });
    } catch (e) {
      console.error('Lỗi gửi thông báo đơn từ cho Ban Giám Đốc:', e);
    }

    return {
      success: true,
      message: 'Gửi đơn trình Giám đốc thành công!',
      data: saved,
    };
  }

  // ============================================================
  // UC 21: TRA CỨU HỒ SƠ TỔNG HỢP (BAN GIÁM ĐỐC)
  // ============================================================
  async traCuuTongHop(keyword: string) {
    const term = (keyword || '').trim();

    // 1. Tìm nhân sự (nếu không có term thì lấy 50 nhân sự mới nhất)
    const nhanSuQb = this.nhanVienRepo.createQueryBuilder('nv')
      .leftJoinAndSelect('nv.nguoiDung', 'nd')
      .leftJoinAndSelect('nd.vaiTro', 'vt');

    if (term) {
      nhanSuQb.where('nv.hoTen LIKE :term OR nv.soCmnd LIKE :term OR nv.soDienThoai LIKE :term OR nv.email LIKE :term OR nv.chucVu LIKE :term', { term: `%${term}%` });
    }
    const nhanSu = await nhanSuQb.orderBy('nv.id', 'ASC').limit(50).getMany();

    // 2. Tìm bệnh nhân (nếu không có term thì lấy 50 bệnh nhân mới nhất)
    const benhNhanQb = this.benhNhanRepo.createQueryBuilder('bn');

    if (term) {
      benhNhanQb.where('bn.hoTen LIKE :term OR bn.maBenhNhan LIKE :term OR bn.soDienThoai LIKE :term OR bn.soCmnd LIKE :term', { term: `%${term}%` });
    }
    const benhNhan = await benhNhanQb.orderBy('bn.id', 'ASC').limit(50).getMany();

    return {
      nhanSu: nhanSu.map(nv => ({
        id: nv.id,
        hoTen: nv.hoTen,
        chucVu: nv.chucVu,
        soDienThoai: nv.soDienThoai,
        email: nv.email,
        diaChi: nv.diaChi,
        soCmnd: nv.soCmnd,
        vaiTro: nv.nguoiDung?.vaiTro?.tenVaiTro,
        trangThai: nv.nguoiDung?.trangThai,
      })),
      benhNhan: benhNhan.map(bn => ({
        id: bn.id,
        maBenhNhan: bn.maBenhNhan,
        hoTen: bn.hoTen,
        soDienThoai: bn.soDienThoai,
        soCmnd: bn.soCmnd,
        gioiTinh: bn.gioiTinh,
        ngaySinh: bn.ngaySinh,
        diaChi: bn.diaChi,
        nhomMau: bn.nhomMau,
        diUng: bn.diUng,
      })),
    };
  }

  // ============================================================
  // UC 20: XẾP LỊCH LÀM VIỆC & QUẢN LÝ CA TRỰC (BAN GIÁM ĐỐC)
  // ============================================================
  async getLichLamViec(weekStart?: string) {
    const caList = await this.caLamViecRepo.find();
    if (caList.length === 0) {
      // Seed initial shifts if not present
      await this.caLamViecRepo.save([
        { tenCa: 'Ca Sáng', gioBatDau: '07:30:00', gioKetThuc: '11:30:00' },
        { tenCa: 'Ca Chiều', gioBatDau: '13:00:00', gioKetThuc: '17:00:00' },
        { tenCa: 'Ca Tối / Trực cấp cứu', gioBatDau: '17:30:00', gioKetThuc: '21:30:00' },
      ]);
    }

    const allCa = await this.caLamViecRepo.find();
    const allNhanVien = await this.nhanVienRepo.find({
      relations: ['nguoiDung', 'nguoiDung.vaiTro'],
      order: { chucVu: 'ASC', hoTen: 'ASC' },
    });

    const qb = this.lichLamViecRepo.createQueryBuilder('llv')
      .leftJoinAndSelect('llv.nhanVien', 'nv')
      .leftJoinAndSelect('llv.caLamViec', 'ca')
      .orderBy('llv.ngayLam', 'ASC');

    if (weekStart) {
      qb.where('llv.ngayLam >= :ws AND llv.ngayLam <= DATE_ADD(:ws, INTERVAL 6 DAY)', { ws: weekStart });
    }

    const lichList = await qb.getMany();

    // Chỉ xếp lịch trực cho nhân viên y tế và vận hành (Bác sĩ, KTV, Lễ tân, Thu ngân, Nhà thuốc), loại bỏ Ban Giám Đốc và Admin
    const nhanVienYTe = allNhanVien.filter(n => {
      const ma = n.nguoiDung?.vaiTro?.maVaiTro;
      const cv = (n.chucVu || '').toLowerCase();
      return ma !== 'ban_giam_doc' && ma !== 'quan_tri_vien' && ma !== 'quan_tri_vien_cap_cao' && !cv.includes('giám đốc');
    });

    return {
      caLamViecList: allCa,
      nhanVienList: nhanVienYTe.map(n => ({
        id: n.id,
        nguoiDungId: n.nguoiDungId,
        hoTen: n.hoTen,
        chucVu: n.chucVu,
        vaiTro: n.nguoiDung?.vaiTro?.tenVaiTro,
        maVaiTro: n.nguoiDung?.vaiTro?.maVaiTro,
      })),
      lichPhanCa: lichList.map(l => ({
        id: l.id,
        nhanVienId: l.nhanVienId,
        nhanVienTen: l.nhanVien?.hoTen,
        chucVu: l.nhanVien?.chucVu,
        caLamViecId: l.caLamViecId,
        tenCa: l.caLamViec?.tenCa,
        ngayLam: l.ngayLam,
        ghiChu: l.ghiChu,
      })),
    };
  }

  async xepLichLamViec(body: { nhanVienId: number; caLamViecId: number; ngayLam: string; ghiChu?: string }[]) {
    if (!body || body.length === 0) {
      throw new BadRequestException('Dữ liệu phân ca không được để trống');
    }

    if (body.length === 1 && body[0].ghiChu === 'khoi_tao_ca') {
      await this.lichLamViecRepo.delete({ nhanVienId: body[0].nhanVienId, ngayLam: body[0].ngayLam });
    }

    for (const item of body) {
      const nv = await this.nhanVienRepo.findOne({ where: { id: item.nhanVienId } });
      const caMoi = await this.caLamViecRepo.findOne({ where: { id: item.caLamViecId } });
      const nvTen = nv ? nv.hoTen : `Nhân viên #${item.nhanVienId}`;
      const caTen = caMoi ? caMoi.tenCa : `Ca #${item.caLamViecId}`;

      // 1. Kiểm tra trùng đúng ca làm việc trong ngày
      const duplicateShift = await this.lichLamViecRepo.findOne({
        where: {
          nhanVienId: item.nhanVienId,
          caLamViecId: item.caLamViecId,
          ngayLam: item.ngayLam,
        },
      });

      if (duplicateShift) {
        throw new ConflictException({
          code: 'TRUNG_CA_LAM_VIEC',
          message: `Xung đột lịch trực: Nhân viên "${nvTen}" đã được phân công "${caTen}" trong ngày ${item.ngayLam}. Vui lòng không xếp trùng ca!`,
        });
      }

      // 2. Kiểm tra giới hạn tối đa 2 ca/ngày để đảm bảo sức khỏe y tế
      const existingShifts = await this.lichLamViecRepo.find({
        where: {
          nhanVienId: item.nhanVienId,
          ngayLam: item.ngayLam,
        },
      });

      if (existingShifts.length >= 2) {
        throw new BadRequestException({
          code: 'VUOT_QUA_SO_CA_TOI_DA',
          message: `Cảnh báo quá tải: Nhân viên "${nvTen}" đã có ${existingShifts.length} ca trực trong ngày ${item.ngayLam}. Quy chế y tế giới hạn tối đa 2 ca/ngày để đảm bảo an toàn khám chữa bệnh.`,
        });
      }

      // 3. Tạo mới ca làm việc hợp lệ
      const newLich = this.lichLamViecRepo.create({
        nhanVienId: item.nhanVienId,
        caLamViecId: item.caLamViecId,
        ngayLam: item.ngayLam,
        ghiChu: item.ghiChu || null,
      });
      await this.lichLamViecRepo.save(newLich);
    }

    return {
      success: true,
      message: 'Lưu phân ca lịch làm việc thành công!',
    };
  }

  async xoaLichPhanCa(id: number) {
    await this.lichLamViecRepo.delete(id);
    return { success: true, message: 'Đã xóa ca trực' };
  }

  // ─── GIÁM ĐỐC: TỰ ĐỘNG PHÂN CA THÔNG MINH (AI & ĐỊNH MỨC Y TẾ) ──────────────
  async phanCaTuDongThongMinh(body: { weekStart: string; overwrite?: boolean }) {
    const { weekStart, overwrite = true } = body;
    if (!weekStart) {
      throw new BadRequestException('Ngày bắt đầu tuần (weekStart) là bắt buộc (định dạng YYYY-MM-DD)');
    }

    const parts = weekStart.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new BadRequestException('Định dạng weekStart không hợp lệ (cần YYYY-MM-DD)');
    }
    const [y, m, d] = parts;

    // 1. Tạo danh sách 7 ngày trong tuần theo ngày cục bộ
    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(y, m - 1, d + i);
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      weekDays.push(`${year}-${month}-${day}`);
    }
    const weekEnd = weekDays[6];

    // 2. Tra cứu đơn xin nghỉ phép đã được Giám Đốc duyệt trong tuần (loại trừ người nghỉ)
    const approvedLeaves = await this.donGuiRepo.find({
      where: { trangThai: TrangThaiDonGui.DA_XU_LY },
    });

    const leaveSet = new Set<string>(); // key: `${nhanVienId}_${dateStr}`
    for (const don of approvedLeaves) {
      const isLeave = (don.loaiDon || '').toLowerCase().includes('nghi') || (don.loaiDon || '').toLowerCase().includes('phep');
      if (!isLeave) continue;

      const dateMatches = (don.noiDung || '').match(/\d{4}-\d{2}-\d{2}/g);
      if (dateMatches && dateMatches.length >= 2) {
        const fromD = new Date(dateMatches[0] + 'T00:00:00');
        const toD = new Date(dateMatches[1] + 'T23:59:59');
        for (const dayStr of weekDays) {
          const curr = new Date(dayStr + 'T12:00:00');
          if (curr >= fromD && curr <= toD) {
            leaveSet.add(`${don.nguoiGuiId}_${dayStr}`);
          }
        }
      } else if (dateMatches && dateMatches.length === 1) {
        leaveSet.add(`${don.nguoiGuiId}_${dateMatches[0]}`);
      }
    }

    // 3. Lấy toàn bộ nhân sự hoạt động chuyên môn
    const allNhanVien = await this.nhanVienRepo.find({
      relations: ['nguoiDung', 'nguoiDung.vaiTro'],
    });

    const bacSiList = await this.bacSiRepo.find({ relations: ['nhanVien'] });
    const bacSiNhanVienIds = new Set(bacSiList.map((b) => b.nhanVienId));

    const nhanVienYTe = allNhanVien.filter((n) => {
      const ma = n.nguoiDung?.vaiTro?.maVaiTro;
      const cv = (n.chucVu || '').toLowerCase();
      return (
        ma !== 'ban_giam_doc' &&
        ma !== 'quan_tri_vien' &&
        ma !== 'quan_tri_vien_cap_cao' &&
        !cv.includes('giám đốc')
      );
    });

    // Phân nhóm theo vị trí nghiệp vụ
    const doctors = nhanVienYTe.filter((n) => bacSiNhanVienIds.has(n.id) || n.nguoiDung?.vaiTro?.maVaiTro === 'bac_si');
    const receptionists = nhanVienYTe.filter(
      (n) => n.nguoiDung?.vaiTro?.maVaiTro === 'tiep_tan' || (n.chucVu || '').toLowerCase().includes('tiếp tân') || (n.chucVu || '').toLowerCase().includes('lễ tân')
    );
    const cashiers = nhanVienYTe.filter((n) => n.nguoiDung?.vaiTro?.maVaiTro === 'thu_ngan' || (n.chucVu || '').toLowerCase().includes('thu ngân'));
    const pharmacists = nhanVienYTe.filter((n) => n.nguoiDung?.vaiTro?.maVaiTro === 'nhan_vien_nha_thuoc' || (n.chucVu || '').toLowerCase().includes('thuốc'));
    const technicians = nhanVienYTe.filter(
      (n) => n.nguoiDung?.vaiTro?.maVaiTro === 'ky_thuat_vien' || (n.chucVu || '').toLowerCase().includes('kỹ thuật viên') || (n.chucVu || '').toLowerCase().includes('xét nghiệm')
    );

    const CA_SANG = 1;
    const CA_CHIEU = 2;
    const newShifts: { nhanVienId: number; caLamViecId: number; ngayLam: string; ghiChu: string }[] = [];

    // Duyệt qua 7 ngày trong tuần
    for (let dayIdx = 0; dayIdx < weekDays.length; dayIdx++) {
      const dayStr = weekDays[dayIdx];
      const isSunday = dayIdx === 6;

      // ── A. BÁC SĨ (Đảm bảo phủ kín các chuyên khoa để bệnh nhân đặt lịch) ──
      if (!isSunday) {
        doctors.forEach((doc) => {
          if (leaveSet.has(`${doc.id}_${dayStr}`)) return;
          // Thứ 2 đến Thứ 6: Trực cả Sáng và Chiều để phục vụ bệnh nhân
          if (dayIdx < 5) {
            newShifts.push({
              nhanVienId: doc.id,
              caLamViecId: CA_SANG,
              ngayLam: dayStr,
              ghiChu: 'Trực khám chuyên khoa - Ca Sáng',
            });
            newShifts.push({
              nhanVienId: doc.id,
              caLamViecId: CA_CHIEU,
              ngayLam: dayStr,
              ghiChu: 'Trực khám chuyên khoa - Ca Chiều',
            });
          } else if (dayIdx === 5) {
            // Thứ 7: Trực ca sáng
            newShifts.push({
              nhanVienId: doc.id,
              caLamViecId: CA_SANG,
              ngayLam: dayStr,
              ghiChu: 'Khám chuyên khoa Thứ Bảy',
            });
          }
        });
      } else {
        // Chủ nhật: Xoay vòng 1 bác sĩ trực Ca Sáng
        if (doctors.length > 0) {
          const dutyDoctor = doctors[0];
          if (!leaveSet.has(`${dutyDoctor.id}_${dayStr}`)) {
            newShifts.push({
              nhanVienId: dutyDoctor.id,
              caLamViecId: CA_SANG,
              ngayLam: dayStr,
              ghiChu: 'Trực phòng khám sáng Chủ Nhật',
            });
          }
        }
      }

      // ── B. LỄ TÂN (Tiếp đón & Kiosk) ──
      receptionists.forEach((rec) => {
        if (leaveSet.has(`${rec.id}_${dayStr}`)) return;
        if (!isSunday) {
          newShifts.push({ nhanVienId: rec.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Quầy tiếp đón & Tiếp nhận' });
          if (dayIdx < 5) {
            newShifts.push({ nhanVienId: rec.id, caLamViecId: CA_CHIEU, ngayLam: dayStr, ghiChu: 'Quầy tiếp đón & Tiếp nhận' });
          }
        } else {
          newShifts.push({ nhanVienId: rec.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Trực tiếp đón sáng CN' });
        }
      });

      // ── C. THU NGÂN (Viện phí & BHYT) ──
      if (cashiers.length >= 2) {
        const firstCashier = dayIdx % 2 === 0 ? cashiers[0] : cashiers[1];
        const secondCashier = dayIdx % 2 === 0 ? cashiers[1] : cashiers[0];
        if (!isSunday) {
          if (!leaveSet.has(`${firstCashier.id}_${dayStr}`)) {
            newShifts.push({ nhanVienId: firstCashier.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Quầy thu ngân & BHYT' });
          }
          if (dayIdx < 5 && !leaveSet.has(`${secondCashier.id}_${dayStr}`)) {
            newShifts.push({ nhanVienId: secondCashier.id, caLamViecId: CA_CHIEU, ngayLam: dayStr, ghiChu: 'Quầy thu ngân & BHYT' });
          }
        } else if (!leaveSet.has(`${firstCashier.id}_${dayStr}`)) {
          newShifts.push({ nhanVienId: firstCashier.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Thu ngân sáng CN' });
        }
      } else {
        cashiers.forEach((c) => {
          if (leaveSet.has(`${c.id}_${dayStr}`)) return;
          newShifts.push({ nhanVienId: c.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Quầy thu ngân' });
          if (!isSunday && dayIdx < 5) {
            newShifts.push({ nhanVienId: c.id, caLamViecId: CA_CHIEU, ngayLam: dayStr, ghiChu: 'Quầy thu ngân' });
          }
        });
      }

      // ── D. KỸ THUẬT VIÊN XÉT NGHIỆM / CẬN LÂM SÀNG ──
      if (technicians.length >= 2) {
        const ktv1 = dayIdx % 2 === 0 ? technicians[0] : technicians[1];
        const ktv2 = dayIdx % 2 === 0 ? technicians[1] : technicians[0];
        if (!isSunday) {
          if (!leaveSet.has(`${ktv1.id}_${dayStr}`)) {
            newShifts.push({ nhanVienId: ktv1.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Phòng Xét nghiệm & CLS' });
          }
          if (dayIdx < 5 && !leaveSet.has(`${ktv2.id}_${dayStr}`)) {
            newShifts.push({ nhanVienId: ktv2.id, caLamViecId: CA_CHIEU, ngayLam: dayStr, ghiChu: 'Phòng Xét nghiệm & CLS' });
          }
        } else if (!leaveSet.has(`${ktv1.id}_${dayStr}`)) {
          newShifts.push({ nhanVienId: ktv1.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Trực CLS sáng CN' });
        }
      } else {
        technicians.forEach((t) => {
          if (leaveSet.has(`${t.id}_${dayStr}`)) return;
          newShifts.push({ nhanVienId: t.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Phòng Xét nghiệm' });
          if (!isSunday && dayIdx < 5) {
            newShifts.push({ nhanVienId: t.id, caLamViecId: CA_CHIEU, ngayLam: dayStr, ghiChu: 'Phòng Xét nghiệm' });
          }
        });
      }

      // ── E. NHÀ THUỐC (Cấp phát đơn thuốc) ──
      pharmacists.forEach((p) => {
        if (leaveSet.has(`${p.id}_${dayStr}`)) return;
        newShifts.push({ nhanVienId: p.id, caLamViecId: CA_SANG, ngayLam: dayStr, ghiChu: 'Quầy Dược & Cấp phát thuốc' });
        if (!isSunday && dayIdx < 5) {
          newShifts.push({ nhanVienId: p.id, caLamViecId: CA_CHIEU, ngayLam: dayStr, ghiChu: 'Quầy Dược & Cấp phát thuốc' });
        }
      });
    }

    // 4. Nếu overwrite: Xóa các ca trực trong tuần này để cập nhật đồng bộ
    if (overwrite) {
      await this.lichLamViecRepo
        .createQueryBuilder()
        .delete()
        .from(LichLamViec)
        .where('ngayLam >= :ws AND ngayLam <= :we', { ws: weekDays[0], we: weekEnd })
        .execute();
    }

    // 5. Loại bỏ trùng lặp nếu có trong newShifts và lưu
    const shiftKeySet = new Set<string>();
    const uniqueShifts = newShifts.filter((s) => {
      const key = `${s.nhanVienId}_${s.caLamViecId}_${s.ngayLam}`;
      if (shiftKeySet.has(key)) return false;
      shiftKeySet.add(key);
      return true;
    });

    const entities = uniqueShifts.map((s) => this.lichLamViecRepo.create(s));
    await this.lichLamViecRepo.save(entities);

    return {
      success: true,
      message: `Đã phân ca thông minh thành công cho tuần (${weekStart} đến ${weekEnd})! Tổng cộng ${entities.length} ca trực đã được thiết lập tự động.`,
      totalShifts: entities.length,
      weekStart,
      weekEnd,
      stats: {
        doctorsAssigned: doctors.length,
        receptionistsAssigned: receptionists.length,
        cashiersAssigned: cashiers.length,
        techniciansAssigned: technicians.length,
        pharmacistsAssigned: pharmacists.length,
        leavesRespected: leaveSet.size,
      },
    };
  }

  // ─── ADMIN: TỔNG QUAN HỆ THỐNG KỸ THUẬT ─────────────────────
  async getSystemOverview() {
    const totalUsers = await this.nguoiDungRepo.count();
    const activeUsers = await this.nguoiDungRepo.count({ where: { trangThai: 'hoat_dong' as any } });
    const lockedUsers = await this.nguoiDungRepo.count({ where: { trangThai: 'bi_khoa' as any } });

    const rolesDistribution = await this.nguoiDungRepo.createQueryBuilder('nd')
      .innerJoin('nd.vaiTro', 'vt')
      .select('vt.tenVaiTro', 'tenVaiTro')
      .addSelect('vt.maVaiTro', 'maVaiTro')
      .addSelect('COUNT(nd.id)', 'soLuong')
      .groupBy('vt.id')
      .getRawMany();

    const recentUsers = await this.nguoiDungRepo.find({
      relations: ['vaiTro'],
      order: { taoLuc: 'DESC' },
      take: 8,
    });

    const mem = process.memoryUsage();
    const uptimeHours = (process.uptime() / 3600).toFixed(1);

    return {
      accounts: {
        total: totalUsers,
        active: activeUsers,
        locked: lockedUsers,
      },
      rolesDistribution: rolesDistribution.map(r => ({
        tenVaiTro: r.tenVaiTro,
        maVaiTro: r.maVaiTro,
        soLuong: Number(r.soLuong),
      })),
      systemHealth: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: `${uptimeHours} giờ`,
        memoryRss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        memoryHeap: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        dbStatus: 'Hoạt động (MySQL 3306)',
        aiServiceStatus: 'Hoạt động (gemini-3.5-flash-lite)',
        socketStatus: 'Hoạt động (Socket.io Port 5000)',
      },
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        tenDangNhap: u.tenDangNhap,
        vaiTro: u.vaiTro?.tenVaiTro || 'Chưa gán',
        trangThai: u.trangThai,
        taoLuc: u.taoLuc,
      })),
    };
  }

  // ─── ADMIN: DANH MỤC DÙNG CHUNG (MASTER DATA) ─────────────────
  async getDanhMucTongHop() {
    const phongBans = await this.nguoiDungRepo.query(
      'SELECT id, ten_phong_ban, mo_ta FROM phong_ban ORDER BY id ASC'
    );
    const phongKhams = await this.nguoiDungRepo.query(
      'SELECT id, ten_phong, vi_tri, chuyen_khoa, trang_thai FROM phong_kham ORDER BY id ASC'
    );
    const dichVus = await this.nguoiDungRepo.query(
      'SELECT id, ma_dich_vu, ten_dich_vu, loai, gia, don_vi_ket_qua, trang_thai FROM dich_vu_xet_nghiem ORDER BY id ASC'
    );
    const thuocs = await this.nguoiDungRepo.query(
      'SELECT id, ma_thuoc, ten_thuoc, ten_hoat_chat, don_vi_tinh, gia_ban, ton_kho_tong, trang_thai FROM thuoc ORDER BY id ASC'
    );

    return {
      phongBans,
      phongKhams,
      dichVus,
      thuocs,
    };
  }

  // ─── ADMIN: SAO LƯU & DUNG LƯỢNG DATABASE ─────────────────────
  async getDatabaseBackupInfo() {
    const tables = await this.nguoiDungRepo.query(`
      SELECT 
        table_name AS tableName,
        table_rows AS tableRows,
        ROUND((data_length + index_length) / 1024 / 1024, 2) AS totalSizeMB,
        ROUND(data_length / 1024 / 1024, 2) AS dataSizeMB,
        update_time AS updateTime
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `);

    const totalSize = tables.reduce((acc: number, t: any) => acc + Number(t.totalSizeMB || 0), 0);
    const totalRows = tables.reduce((acc: number, t: any) => acc + Number(t.tableRows || 0), 0);

    return {
      dbName: 'phong_kham',
      totalTables: tables.length,
      totalRows,
      totalSizeMB: totalSize.toFixed(2),
      tables,
    };
  }

  // ─── ADMIN: XUẤT BẢN SAO LƯU .SQL TOÀN DIỆN ───────────────────
  async exportSqlDump(): Promise<string> {
    const tableList: any[] = await this.nguoiDungRepo.query(`
      SELECT table_name AS tableName
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_name ASC
    `);

    let sql = `-- ========================================================\n`;
    sql += `-- HỆ THỐNG PHÒNG KHÁM ĐA KHOA - BẢN SAO LƯU CƠ SỞ DỮ LIỆU\n`;
    sql += `-- Thời gian tạo: ${new Date().toLocaleString('vi-VN')}\n`;
    sql += `-- Tổng số bảng: ${tableList.length}\n`;
    sql += `-- ========================================================\n\n`;
    sql += `SET NAMES utf8mb4;\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const { tableName } of tableList) {
      try {
        // 1. DDL Create Table
        const createResult: any[] = await this.nguoiDungRepo.query(`SHOW CREATE TABLE \`${tableName}\``);
        const createSql = createResult[0]?.['Create Table'] || '';

        sql += `-- --------------------------------------------------------\n`;
        sql += `-- Cấu trúc bảng \`${tableName}\`\n`;
        sql += `-- --------------------------------------------------------\n`;
        sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sql += `${createSql};\n\n`;

        // 2. Data Rows
        const rows: any[] = await this.nguoiDungRepo.query(`SELECT * FROM \`${tableName}\``);
        if (rows && rows.length > 0) {
          sql += `-- Dữ liệu bảng \`${tableName}\` (${rows.length} dòng)\n`;
          const keys = Object.keys(rows[0]);
          const colsStr = keys.map((k) => `\`${k}\``).join(', ');

          for (const row of rows) {
            const valuesStr = keys
              .map((k) => {
                const val = row[k];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number') return val;
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `'${escaped}'`;
              })
              .join(', ');

            sql += `INSERT INTO \`${tableName}\` (${colsStr}) VALUES (${valuesStr});\n`;
          }
          sql += `\n`;
        }
      } catch (tableErr) {
        sql += `-- Lỗi khi sao lưu bảng \`${tableName}\`: ${tableErr.message}\n\n`;
      }
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- Hoàn tất bản sao lưu CSDL phong_kham lúc ${new Date().toLocaleString('vi-VN')}\n`;

    // Ghi log sự kiện sao lưu
    await this.ghiLog({
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien',
      hanhDong: 'SAO_LUU_CSDL',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Đã thực hiện xuất toàn bộ bản sao lưu SQL CSDL phong_kham (${tableList.length} bảng dữ liệu)`,
    });

    return sql;
  }

  // ==========================================
  // NHẬT KÝ HỆ THỐNG (SYSTEM AUDIT LOG)
  // ==========================================

  async ghiLog(data: {
    nguoiDungId?: number;
    tenNguoiDung: string;
    vaiTro: string;
    hanhDong: string;
    loaiNhatKy?: LoaiNhatKy;
    moTa: string;
    diaChiIp?: string;
    userAgent?: string;
  }) {
    try {
      // CHỈ LƯU NHẬT KÝ CỦA GIÁM ĐỐC, QUẢN TRỊ VIÊN, BÁC SĨ, NHÂN VIÊN,... TUYỆT ĐỐI KHÔNG LƯU BỆNH NHÂN / KHÁCH
      const vt = (data.vaiTro || '').toLowerCase();
      if (vt === 'benh_nhan' || vt === 'khach' || vt === 'guest') {
        return null;
      }

      const log = this.nhatKyRepo.create({
        nguoiDungId: data.nguoiDungId || null,
        tenNguoiDung: data.tenNguoiDung || 'Hệ thống',
        vaiTro: data.vaiTro || 'he_thong',
        hanhDong: data.hanhDong,
        loaiNhatKy: data.loaiNhatKy || LoaiNhatKy.INFO,
        moTa: data.moTa,
        diaChiIp: data.diaChiIp || '127.0.0.1',
        userAgent: data.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });
      return await this.nhatKyRepo.save(log);
    } catch (err) {
      console.error('Lỗi khi ghi log hệ thống:', err);
      return null;
    }
  }

  // ─── Xác định Phân hệ Chức năng & Thao tác chi tiết ────────────────────────
  private xacDinhChucNangVaThaoTac(hanhDong: string, moTa: string = '') {
    const act = (hanhDong || '').toUpperCase();
    const desc = (moTa || '').toLowerCase();

    // 1. Chấm công & Điểm danh
    if (act.includes('CHAM_CONG') || act.includes('CHECKIN') || act.includes('CHECKOUT')) {
      if (act === 'CHECKIN_CHAM_CONG') return { chucNang: 'Chấm công & Điểm danh', thaoTac: 'Check-in · Chấm công' };
      if (act === 'CHECKOUT_CHAM_CONG') return { chucNang: 'Chấm công & Điểm danh', thaoTac: 'Check-out · Chấm công' };
      if (act === 'CHAM_CONG_THU_CONG') return { chucNang: 'Chấm công & Điểm danh', thaoTac: 'Chấm công thủ công · Giám đốc' };
      if (act === 'CAI_DAT_CHAM_CONG') return { chucNang: 'Chấm công & Điểm danh', thaoTac: 'Cập nhật IP WiFi · Chấm công' };
      return { chucNang: 'Chấm công & Điểm danh', thaoTac: 'Chấm công · Điểm danh' };
    }

    // 2. Xác thực & Tài khoản
    if (act.includes('DANG_NHAP') || act.includes('MAT_KHAU') || act.includes('KHOA_TAI_KHOAN') || act.includes('AUTH')) {
      if (act === 'DANG_NHAP_THANH_CONG') return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Đăng nhập · Auth' };
      if (act === 'DANG_NHAP_THAT_BAI') return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Đăng nhập thất bại · Auth' };
      if (act === 'DAT_LAI_MAT_KHAU') return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Đổi mật khẩu · Tài khoản' };
      if (act === 'KHOA_TAI_KHOAN') return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Khóa tài khoản · An toàn' };
      return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Xác thực · Tài khoản' };
    }

    // 3. Quản trị nhân sự & Avatar
    if (act.includes('NHAN_VIEN') || act.includes('AVATAR')) {
      if (act === 'UPLOAD_AVATAR') return { chucNang: 'Quản trị nhân sự', thaoTac: 'Cập nhật ảnh khuôn mặt · Nhân viên' };
      if (act === 'THEM_NHAN_VIEN') return { chucNang: 'Quản trị nhân sự', thaoTac: 'Thêm mới · Nhân viên' };
      if (act === 'CAP_NHAT_NHAN_VIEN') return { chucNang: 'Quản trị nhân sự', thaoTac: 'Cập nhật · Nhân viên' };
      return { chucNang: 'Quản trị nhân sự', thaoTac: 'Quản lý · Nhân sự' };
    }

    // 4. Khám bệnh & Bệnh án
    if (act.includes('KHAM') || act.includes('BENH_AN')) {
      if (act === 'HOAN_TAT_KHAM') return { chucNang: 'Khám bệnh & Bệnh án', thaoTac: 'Hoàn tất khám · Bệnh án' };
      return { chucNang: 'Khám bệnh & Bệnh án', thaoTac: 'Khám bệnh · Bác sĩ' };
    }

    // 5. Nhà thuốc & Kê đơn
    if (act.includes('THUOC') || act.includes('DON_THUOC')) {
      if (act === 'KE_DON_THUOC') return { chucNang: 'Nhà thuốc & Kê đơn', thaoTac: 'Kê đơn thuốc · Khám bệnh' };
      if (act === 'CAP_PHAT_THUOC') return { chucNang: 'Nhà thuốc & Kê đơn', thaoTac: 'Cấp phát thuốc · Đơn thuốc' };
      if (act === 'NHAP_KHO_THUOC') return { chucNang: 'Nhà thuốc & Kho', thaoTac: 'Nhập kho · Dược phẩm' };
      return { chucNang: 'Nhà thuốc & Kê đơn', thaoTac: 'Quản lý · Thuốc' };
    }

    // 6. Tiếp nhận & Hàng đợi
    if (act.includes('TIEP_NHAN') || act.includes('GOI_SO') || act.includes('HANG_DOI')) {
      return { chucNang: 'Tiếp đón & Hàng đợi', thaoTac: 'Tiếp nhận bệnh nhân · Hàng đợi' };
    }

    // 7. Thu ngân & Thanh toán
    if (act.includes('THANH_TOAN') || act.includes('HOA_DON') || act.includes('THU_NGAN')) {
      return { chucNang: 'Thu ngân & Viện phí', thaoTac: 'Thu viện phí · Hóa đơn' };
    }

    // 8. Xét nghiệm
    if (act.includes('XET_NGHIEM') || act.includes('CHI_DINH') || act.includes('KET_QUA')) {
      if (act === 'CHI_DINH_XET_NGHIEM') return { chucNang: 'Cận lâm sàng & Xét nghiệm', thaoTac: 'Chỉ định · Xét nghiệm' };
      return { chucNang: 'Cận lâm sàng & Xét nghiệm', thaoTac: 'Trả kết quả · Xét nghiệm' };
    }

    // 9. Lịch làm việc
    if (act.includes('LICH') || act.includes('PHAN_CA')) {
      return { chucNang: 'Lịch & Ca làm việc', thaoTac: 'Phân ca · Lịch làm việc' };
    }

    // 10. Đơn từ
    if (act.includes('DON') || act.includes('TRINH')) {
      if (act === 'PHE_DUYET_DON') return { chucNang: 'Duyệt đơn từ & Đề xuất', thaoTac: 'Phê duyệt đơn · Đề xuất' };
      if (act === 'GUI_DON_TRINH') return { chucNang: 'Duyệt đơn từ & Đề xuất', thaoTac: 'Gửi đơn trình · Ban Giám Đốc' };
      return { chucNang: 'Duyệt đơn từ & Đề xuất', thaoTac: 'Xử lý đơn từ · Nhân sự' };
    }

    // 11. Phân quyền
    if (act.includes('PHAN_QUYEN') || act.includes('VAI_TRO')) {
      return { chucNang: 'Phân quyền & Vai trò', thaoTac: 'Cập nhật · Phân quyền' };
    }

    // 12. CSDL & Hệ thống
    if (act.includes('SAO_LUU') || act.includes('CSDL') || act.includes('BACKUP')) {
      return { chucNang: 'Hệ thống & CSDL', thaoTac: 'Sao lưu dữ liệu · CSDL' };
    }
    if (act.includes('AI') || act.includes('GATEWAY')) {
      return { chucNang: 'Hệ thống & CSDL', thaoTac: 'Khởi tạo kết nối · AI Gateway' };
    }
    if (act.includes('SMS') || act.includes('GATEWAY_TIMEOUT')) {
      return { chucNang: 'Hệ thống & CSDL', thaoTac: 'Cổng SMS Timeout · Gateway' };
    }
    if (act.includes('KIEM_TRA') || act.includes('SECURITY')) {
      return { chucNang: 'Hệ thống & CSDL', thaoTac: 'Kiểm tra an ninh · Hệ thống' };
    }

    return { chucNang: 'Quản trị hệ thống', thaoTac: `${act} · Thao tác` };
  }

  async getDanhSachNhatKy(query: {
    page?: number;
    limit?: number;
    loaiNhatKy?: string;
    hanhDong?: string;
    search?: string;
    tuNgay?: string;
    denNgay?: string;
  }) {
    await this.seedInitialLogs();

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const qb = this.nhatKyRepo.createQueryBuilder('log')
      .leftJoin('nguoi_dung', 'nd', '(nd.id = log.nguoi_dung_id OR nd.ten_dang_nhap = log.ten_nguoi_dung)')
      .leftJoin('nhan_vien', 'nv', 'nv.nguoi_dung_id = nd.id')
      .select([
        'log.id AS id',
        'log.nguoi_dung_id AS nguoiDungId',
        'log.ten_nguoi_dung AS tenNguoiDung',
        'log.vai_tro AS vaiTro',
        'log.hanh_dong AS hanhDong',
        'log.loai_nhat_ky AS loaiNhatKy',
        'log.mo_ta AS moTa',
        'log.dia_chi_ip AS diaChiIp',
        'log.user_agent AS userAgent',
        'log.thoi_gian AS thoiGian',
        'nv.ho_ten AS hoTenNhanVien',
        'nv.email AS emailNhanVien',
      ]);

    // BẮT BUỘC: CHỈ LƯU VÀ HIỂN THỊ NHẬT KÝ CỦA GIÁM ĐỐC, QUẢN TRỊ VIÊN, BÁC SĨ, NHÂN VIÊN NỘI BỘ
    qb.andWhere("log.vai_tro NOT IN ('benh_nhan', 'khach', 'guest')");

    if (query.loaiNhatKy && query.loaiNhatKy !== 'TAT_CA') {
      qb.andWhere('log.loai_nhat_ky = :loai', { loai: query.loaiNhatKy });
    }

    if (query.hanhDong && query.hanhDong !== 'TAT_CA') {
      qb.andWhere('log.hanh_dong = :hanhDong', { hanhDong: query.hanhDong });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere(
        '(log.ten_nguoi_dung LIKE :kw OR log.mo_ta LIKE :kw OR log.dia_chi_ip LIKE :kw OR log.hanh_dong LIKE :kw OR log.vai_tro LIKE :kw OR nv.ho_ten LIKE :kw OR nv.email LIKE :kw)',
        { kw: `%${query.search.trim()}%` },
      );
    }

    if (query.tuNgay) {
      qb.andWhere('log.thoi_gian >= :tuNgay', { tuNgay: new Date(query.tuNgay) });
    }

    if (query.denNgay) {
      const end = new Date(query.denNgay);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('log.thoi_gian <= :denNgay', { denNgay: end });
    }

    // Đếm tổng số bản ghi phù hợp
    const total = await qb.getCount();

    // Lấy danh sách bản ghi
    const rawItems = await qb
      .orderBy('log.thoi_gian', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    // Chuẩn hóa và làm giàu dữ liệu hiển thị theo bảng chuẩn
    const items = rawItems.map(row => {
      const { chucNang, thaoTac } = this.xacDinhChucNangVaThaoTac(row.hanhDong, row.moTa);

      // 1. Tên nhân viên
      let tenNV = row.hoTenNhanVien;
      if (!tenNV) {
        if (row.tenNguoiDung === 'admin') tenNV = 'Quản Trị Viên Hệ Thống';
        else if (row.tenNguoiDung === 'giamdoc') tenNV = 'BS.CKII Nguyễn Văn Giám Đốc';
        else if (row.tenNguoiDung === 'bacsi') tenNV = 'Bác sĩ Nguyễn Văn A';
        else if (row.tenNguoiDung === 'tieptan') tenNV = 'Lễ Tân Y Tế';
        else if (row.tenNguoiDung === 'he_thong') tenNV = 'Hệ Thống Tự Động';
        else tenNV = row.tenNguoiDung || 'Nhân viên';
      }

      // 2. Email nhân viên
      let emailNV = row.emailNhanVien;
      if (!emailNV) {
        if (row.tenNguoiDung === 'admin') emailNV = 'admin@phongkham.vn';
        else if (row.tenNguoiDung === 'giamdoc') emailNV = 'giamdoc@phongkham.vn';
        else if (row.tenNguoiDung === 'he_thong') emailNV = 'system@phongkham.vn';
        else emailNV = `${row.tenNguoiDung}@phongkham.vn`;
      }

      // 3. Mức độ rủi ro (Risk)
      const loai = row.loaiNhatKy || LoaiNhatKy.INFO;
      let ruiRo = 'Bình thường';
      if (loai === LoaiNhatKy.WARNING) ruiRo = 'Cảnh báo';
      else if (loai === LoaiNhatKy.SECURITY) ruiRo = 'Bảo mật';
      else if (loai === LoaiNhatKy.ERROR) ruiRo = 'Lỗi hệ thống';

      // 4. Kết quả (Result)
      const isFail =
        loai === LoaiNhatKy.ERROR ||
        (row.hanhDong || '').includes('THAT_BAI') ||
        (row.moTa || '').toLowerCase().includes('thất bại') ||
        (row.moTa || '').toLowerCase().includes('lỗi');
      const ketQua = isFail ? 'Thất bại' : 'Thành công';

      return {
        id: row.id,
        nguoiDungId: row.nguoiDungId,
        tenNguoiDung: row.tenNguoiDung,
        vaiTro: row.vaiTro,
        hanhDong: row.hanhDong,
        loaiNhatKy: row.loaiNhatKy,
        moTa: row.moTa,
        diaChiIp: row.diaChiIp || '127.0.0.1',
        userAgent: row.userAgent || 'Trình duyệt hệ thống',
        thoiGian: row.thoiGian,
        // Các trường định dạng chuẩn theo mẫu Ảnh 2:
        nhanVien: tenNV,
        email: emailNV,
        chucNang,
        thaoTac,
        ruiRo,
        ketQua,
        noiDung: row.moTa,
      };
    });

    return {
      message: 'Lấy danh sách nhật ký hệ thống thành công',
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getThongKeNhatKy() {
    await this.seedInitialLogs();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalLogs = await this.nhatKyRepo.count({
      where: { vaiTro: Not(In(['benh_nhan', 'khach', 'guest'])) }
    });
    const todayLogs = await this.nhatKyRepo.count({
      where: { thoiGian: MoreThanOrEqual(today), vaiTro: Not(In(['benh_nhan', 'khach', 'guest'])) },
    });
    const securityLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.SECURITY, vaiTro: Not(In(['benh_nhan', 'khach', 'guest'])) },
    });
    const errorLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.ERROR, vaiTro: Not(In(['benh_nhan', 'khach', 'guest'])) },
    });
    const warningLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.WARNING, vaiTro: Not(In(['benh_nhan', 'khach', 'guest'])) },
    });
    const infoLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.INFO, vaiTro: Not(In(['benh_nhan', 'khach', 'guest'])) },
    });

    return {
      message: 'Thống kê nhật ký hệ thống thành công',
      data: {
        totalLogs,
        todayLogs,
        securityLogs,
        errorLogs,
        warningLogs,
        infoLogs,
      },
    };
  }

  async seedInitialLogs() {
    const count = await this.nhatKyRepo.count();
    if (count > 0) return;

    const now = new Date();
    const subMinutes = (m: number) => new Date(now.getTime() - m * 60 * 1000);
    const subHours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
    const subDays = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const initialSeeds = [
      {
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'KIEM_TRA_HE_THONG_TOAN_DIEN',
        loaiNhatKy: LoaiNhatKy.SECURITY,
        moTa: 'Quản trị viên đã thực hiện quét kiểm tra an ninh và toàn vẹn cơ sở dữ liệu y tế định kỳ',
        diaChiIp: '127.0.0.1',
        userAgent: 'Chrome 128.0 (Windows NT 10.0; Win64; x64)',
        thoiGian: subMinutes(15),
      },
      {
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'DANG_NHAP_THANH_CONG',
        loaiNhatKy: LoaiNhatKy.SECURITY,
        moTa: 'Quản trị viên đăng nhập vào bảng điều khiển IT thành công từ IP 127.0.0.1',
        diaChiIp: '127.0.0.1',
        userAgent: 'Chrome 128.0 (Windows NT 10.0; Win64; x64)',
        thoiGian: subMinutes(45),
      },
      {
        tenNguoiDung: 'giamdoc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'PHE_DUYET_DON',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Giám đốc đã phê duyệt đơn đề xuất mua sắm trang thiết bị y tế (bộ nội soi HD)',
        diaChiIp: '192.168.1.10',
        userAgent: 'Chrome 128.0 (macOS)',
        thoiGian: subHours(1),
      },
      {
        tenNguoiDung: 'bacsi',
        vaiTro: 'bac_si',
        hanhDong: 'HOAN_TAT_KHAM',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Bác sĩ Nguyễn Văn A hoàn tất lượt khám bệnh và chẩn đoán cho bệnh nhân BN000002',
        diaChiIp: '192.168.1.15',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(2),
      },
      {
        tenNguoiDung: 'bacsi',
        vaiTro: 'bac_si',
        hanhDong: 'KE_DON_THUOC',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Bác sĩ Nguyễn Văn A kê đơn thuốc điện tử (4 loại thuốc) cho bệnh nhân BN000002',
        diaChiIp: '192.168.1.15',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(2),
      },
      {
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'SAO_LUU_CSDL',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Xuất tệp sao lưu dữ liệu toàn hệ thống phong_kham_backup.sql (36 bảng, 2.35MB)',
        diaChiIp: '127.0.0.1',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(3),
      },
      {
        tenNguoiDung: 'unknown',
        vaiTro: 'khach',
        hanhDong: 'DANG_NHAP_THAT_BAI',
        loaiNhatKy: LoaiNhatKy.SECURITY,
        moTa: 'Cảnh báo bảo mật: Đăng nhập thất bại sai mật khẩu liên tiếp 3 lần tài khoản root từ IP 113.161.45.12',
        diaChiIp: '113.161.45.12',
        userAgent: 'Python-requests/2.31.0',
        thoiGian: subHours(6),
      },
      {
        tenNguoiDung: 'giamdoc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'PHAN_CA_LAM_VIEC',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Ban Giám Đốc đã hoàn tất phân công lịch làm việc tuần thứ 37 cho nhân viên y tế',
        diaChiIp: '192.168.1.10',
        userAgent: 'Chrome 128.0 (macOS)',
        thoiGian: subHours(4),
      },
      {
        tenNguoiDung: 'tieptan',
        vaiTro: 'tiep_tan',
        hanhDong: 'TIEP_NHAN_BENH_NHAN',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Tiếp nhận bệnh nhân mới BN000008 (Trần Văn Bình) vào phòng khám Nội 1',
        diaChiIp: '192.168.1.20',
        userAgent: 'Edge 128.0 (Windows NT 10.0)',
        thoiGian: subHours(5),
      },
      {
        tenNguoiDung: 'thungan',
        vaiTro: 'thu_ngan',
        hanhDong: 'THANH_TOAN_VIEN_PHI',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Thu ngân xác nhận xuất hóa đơn thanh toán viện phí khám nội tổng quát cho BN000008',
        diaChiIp: '192.168.1.25',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(5),
      },
      {
        tenNguoiDung: 'nv1',
        vaiTro: 'nhan_vien_nha_thuoc',
        hanhDong: 'CAP_PHAT_THUOC',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Dược sĩ hoàn tất cấp phát thuốc và in hướng dẫn sử dụng đơn thuốc #DT000015',
        diaChiIp: '192.168.1.30',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(6),
      },
      {
        tenNguoiDung: 'xetnghiem',
        vaiTro: 'ky_thuat_vien',
        hanhDong: 'CAP_NHAT_KET_QUA_XN',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Kỹ thuật viên B cập nhật kết quả xét nghiệm sinh hóa máu tổng quát cho BN000002',
        diaChiIp: '192.168.1.35',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(7),
      },
      {
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'CAP_NHAT_PHAN_QUYEN',
        loaiNhatKy: LoaiNhatKy.WARNING,
        moTa: 'Quản trị viên cập nhật quyền hạn vai trò Kỹ thuật viên (thêm quyền duyệt kết quả)',
        diaChiIp: '127.0.0.1',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subDays(1),
      },
      {
        tenNguoiDung: 'he_thong',
        vaiTro: 'he_thong',
        hanhDong: 'DONG_BO_AI_GATEWAY',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Khởi tạo kết nối Gemini AI Triage Gateway thành công (model: gemini-3.5-flash-lite)',
        diaChiIp: '127.0.0.1',
        userAgent: 'NestJS-Microservice/10.0',
        thoiGian: subDays(1),
      },
      {
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'DAT_LAI_MAT_KHAU',
        loaiNhatKy: LoaiNhatKy.SECURITY,
        moTa: 'Quản trị viên thực hiện đặt lại mật khẩu cho tài khoản tieptan',
        diaChiIp: '127.0.0.1',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subDays(2),
      },
      {
        tenNguoiDung: 'he_thong',
        vaiTro: 'he_thong',
        hanhDong: 'LOI_KET_NOI_SMS',
        loaiNhatKy: LoaiNhatKy.ERROR,
        moTa: 'Cổng gửi tin nhắn SMS OTP phản hồi mã lỗi 503 (Gateway Timeout), đã chuyển hướng qua Email OTP',
        diaChiIp: '127.0.0.1',
        userAgent: 'Nodemailer/NestJS',
        thoiGian: subDays(2),
      },
    ];

    for (const item of initialSeeds) {
      const entity = this.nhatKyRepo.create(item);
      await this.nhatKyRepo.save(entity);
    }
  }

  // ==========================================
  // XÁC THỰC & CHỐNG TRÙNG LẶP AVATAR NHÂN VIÊN
  // ==========================================
  async kiemTraVaLuuAvatar(file: Express.Multer.File, nhanVienId?: number) {
    const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://localhost:5001';
    const absolutePath = path.resolve(file.path);

    try {
      // 1. Lấy danh sách nhân viên khác đã có avatar
      const allEmployees = await this.nhanVienRepo.find();
      const candidates = allEmployees
        .filter(nv => !nhanVienId || nv.id !== nhanVienId)
        .filter(nv => nv.anhDaiDien && typeof nv.anhDaiDien === 'string' && nv.anhDaiDien.trim() !== '')
        .map(nv => {
          const cleanRel = nv.anhDaiDien.replace(/^\/+/, '');
          return {
            id: nv.id,
            ho_ten: nv.hoTen,
            chuc_vu: nv.chucVu,
            anh_path: path.join(process.cwd(), cleanRel),
          };
        })
        .filter(c => fs.existsSync(c.anh_path));

      // 2. Gọi Python ML kiểm tra tính hợp lệ & chống trùng
      const response = await firstValueFrom(
        this.httpService.post(
          `${PYTHON_ML_URL}/check-duplicate-face`,
          {
            target_image_path: absolutePath,
            candidates: candidates,
          },
          { timeout: 25000 },
        ),
      );

      const checkResult = response.data;

      // 3. Nếu không có khuôn mặt hợp lệ
      if (!checkResult?.valid_face) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new BadRequestException(
          checkResult?.reason || 'Không phát hiện khuôn mặt hợp lệ trong ảnh tải lên. Vui lòng chọn ảnh chụp rõ nét khuôn mặt.',
        );
      }

      // 4. Nếu bị trùng lặp với nhân viên khác
      if (checkResult?.is_duplicate) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        throw new BadRequestException(
          checkResult?.reason || 'Ảnh khuôn mặt này đã trùng khớp với một nhân viên khác trong hệ thống.',
        );
      }

      // 5. Hợp lệ
      return {
        message: 'Upload và xác thực khuôn mặt thành công',
        data: `/uploads/avatars/${file.filename}`,
      };
    } catch (err) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err.message;
      throw new BadRequestException(msg);
    }
  }

  // ==========================================
  // BÁO CÁO CÁC BỘ PHẬN GỬI BAN GIÁM ĐỐC
  // ==========================================

  async taoBaoCaoBoPhan(userId: number, dto: {
    boPhan: string;
    tieuDe: string;
    kyBaoCao?: string;
    soLieuSnapshot?: any;
    noiDung?: string;
    kienNghi?: string;
  }) {
    if (!dto.boPhan?.trim()) throw new BadRequestException('Vui lòng chỉ định bộ phận lập báo cáo');
    if (!dto.tieuDe?.trim()) throw new BadRequestException('Vui lòng nhập tiêu đề báo cáo');

    const nv = await this.nhanVienRepo.findOneBy({ nguoiDungId: userId });
    const count = await this.baoCaoBoPhanRepo.count();
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const maBaoCao = `BC-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const baoCao = this.baoCaoBoPhanRepo.create({
      maBaoCao,
      boPhan: dto.boPhan.trim(),
      tieuDe: dto.tieuDe.trim(),
      kyBaoCao: dto.kyBaoCao?.trim() || 'Hôm nay',
      nguoiGuiId: nv ? nv.id : userId,
      soLieuSnapshot: dto.soLieuSnapshot || {},
      noiDung: dto.noiDung?.trim() || '',
      kienNghi: dto.kienNghi?.trim() || '',
      trangThai: 'cho_xem',
    });

    const saved = await this.baoCaoBoPhanRepo.save(baoCao);

    // Ghi nhật ký hệ thống
    try {
      const user = await this.nguoiDungRepo.findOneBy({ id: userId });
      await this.nhatKyRepo.save(
        this.nhatKyRepo.create({
          nguoiDungId: userId,
          tenNguoiDung: user?.tenDangNhap || `User#${userId}`,
          vaiTro: 'nhan_vien',
          hanhDong: 'GUI_BAO_CAO_BO_PHAN',
          loaiNhatKy: LoaiNhatKy.INFO,
          moTa: `Lập và gửi báo cáo "${dto.tieuDe}" (${dto.boPhan}) lên Ban Giám Đốc`,
          diaChiIp: '127.0.0.1',
        }),
      );
    } catch (_) {}

    // Thông báo cho Ban Giám Đốc có báo cáo mới
    try {
      await this.thongBaoService.taoThongBaoTheoRole('ban_giam_doc', {
        tieuDe: `📑 Báo cáo mới: ${saved.tieuDe}`,
        noiDung: `${nv?.hoTen || 'Nhân viên'} vừa gửi báo cáo ${saved.maBaoCao} (${saved.kyBaoCao}). Vui lòng xem và chỉ đạo.`,
        loai: 'bao_cao_bo_phan',
        doiTuongBang: 'bao_cao_bo_phan',
        doiTuongId: saved.id,
      });
    } catch (_) {}

    return {
      message: 'Gửi báo cáo lên Ban Giám Đốc thành công',
      data: saved,
    };
  }

  async layDanhSachBaoCaoBoPhan(boPhan?: string, trangThai?: string) {
    const qb = this.baoCaoBoPhanRepo.createQueryBuilder('bc')
      .leftJoin('nhan_vien', 'nv_gui', 'nv_gui.id = bc.nguoi_gui_id OR nv_gui.nguoi_dung_id = bc.nguoi_gui_id')
      .leftJoin('nguoi_dung', 'nd_gui', 'nd_gui.id = bc.nguoi_gui_id')
      .leftJoin('nhan_vien', 'nv_cd', 'nv_cd.id = bc.nguoi_chi_dao_id OR nv_cd.nguoi_dung_id = bc.nguoi_chi_dao_id')
      .leftJoin('nguoi_dung', 'nd_cd', 'nd_cd.id = bc.nguoi_chi_dao_id')
      .addSelect('COALESCE(nv_gui.ho_ten, nd_gui.ten_dang_nhap)', 'nguoi_gui_ho_ten')
      .addSelect('nv_gui.chuc_vu', 'nguoi_gui_chuc_vu')
      .addSelect('COALESCE(nv_cd.ho_ten, nd_cd.ten_dang_nhap)', 'nguoi_chi_dao_ho_ten')
      .orderBy('bc.tao_luc', 'DESC');

    if (boPhan && boPhan !== 'all') {
      qb.andWhere('bc.bo_phan = :boPhan', { boPhan });
    }
    if (trangThai && trangThai !== 'all') {
      qb.andWhere('bc.trang_thai = :trangThai', { trangThai });
    }

    const rows = await qb.getRawMany();
    const result = rows.map((r) => {
      const tenNguoiGui = r.nguoi_gui_ho_ten || `NV #${r.bc_nguoi_gui_id}`;
      return {
        id: r.bc_id,
        maBaoCao: r.bc_ma_bao_cao,
        boPhan: r.bc_bo_phan,
        tieuDe: r.bc_tieu_de,
        kyBaoCao: r.bc_ky_bao_cao,
        nguoiGuiId: r.bc_nguoi_gui_id,
        nguoiGuiHoTen: tenNguoiGui,
        tenNguoiGui: tenNguoiGui,
        nguoiGuiChucVu: r.nguoi_gui_chuc_vu || '',
        ngayGui: r.bc_ngay_gui,
        soLieuSnapshot: r.bc_so_lieu_snapshot,
        noiDung: r.bc_noi_dung,
        kienNghi: r.bc_kien_nghi,
        trangThai: r.bc_trang_thai,
        yKienGiamDoc: r.bc_y_kien_giam_doc,
        nguoiChiDaoId: r.bc_nguoi_chi_dao_id,
        nguoiChiDaoHoTen: r.nguoi_chi_dao_ho_ten || null,
        ngayChiDao: r.bc_ngay_chi_dao,
        taoLuc: r.bc_tao_luc,
      };
    });

    return {
      message: 'Lấy danh sách báo cáo bộ phận thành công',
      data: result,
    };
  }

  async layChiTietBaoCaoBoPhan(id: number) {
    const bc = await this.baoCaoBoPhanRepo.findOneBy({ id });
    if (!bc) throw new NotFoundException('Không tìm thấy báo cáo');
    const nvGui = (await this.nhanVienRepo.findOneBy({ id: bc.nguoiGuiId }))
      || (await this.nhanVienRepo.findOneBy({ nguoiDungId: bc.nguoiGuiId }));
    const nvCd = bc.nguoiChiDaoId ? (await this.nhanVienRepo.findOneBy({ id: bc.nguoiChiDaoId }) || await this.nhanVienRepo.findOneBy({ nguoiDungId: bc.nguoiChiDaoId })) : null;
    const ndGui = !nvGui ? await this.nguoiDungRepo.findOneBy({ id: bc.nguoiGuiId }) : null;

    let snapshot = bc.soLieuSnapshot;
    if (typeof snapshot === 'string') {
      try { snapshot = JSON.parse(snapshot); } catch (_) {}
    }

    const tenNguoiGui = nvGui?.hoTen || ndGui?.tenDangNhap || `Nhân sự #${bc.nguoiGuiId}`;

    return {
      message: 'Lấy chi tiết báo cáo thành công',
      data: {
        ...bc,
        soLieuSnapshot: snapshot,
        nguoiGuiHoTen: tenNguoiGui,
        tenNguoiGui,
        nguoiGuiChucVu: nvGui?.chucVu || '',
        nguoiChiDaoHoTen: nvCd?.hoTen || (bc.nguoiChiDaoId ? 'Ban Giám Đốc' : null),
      },
    };
  }

  async chiDaoBaoCaoBoPhan(id: number, giamDocUserId: number, yKien: string) {
    const bc = await this.baoCaoBoPhanRepo.findOneBy({ id });
    if (!bc) throw new NotFoundException('Không tìm thấy báo cáo');

    const nvCd = await this.nhanVienRepo.findOneBy({ nguoiDungId: giamDocUserId });
    bc.yKienGiamDoc = yKien?.trim() || 'Ban Giám Đốc đã xem và ghi nhận báo cáo.';
    bc.nguoiChiDaoId = nvCd ? nvCd.id : giamDocUserId;
    bc.ngayChiDao = new Date();
    bc.trangThai = 'da_chi_dao';

    const saved = await this.baoCaoBoPhanRepo.save(bc);

    // Tự động gửi thông báo hệ thống thời gian thực đến nhân viên lập báo cáo
    try {
      const nvGui = (await this.nhanVienRepo.findOneBy({ id: bc.nguoiGuiId }))
        || (await this.nhanVienRepo.findOneBy({ nguoiDungId: bc.nguoiGuiId }));
      const nguoiNhanNguoiDungId = nvGui ? nvGui.nguoiDungId : bc.nguoiGuiId;

      if (nguoiNhanNguoiDungId) {
        await this.thongBaoService.taoThongBao({
          nguoiNhanId: nguoiNhanNguoiDungId,
          tieuDe: `📋 Ban Giám Đốc đã chỉ đạo báo cáo: ${bc.tieuDe}`,
          noiDung: `Ý kiến chỉ đạo: "${bc.yKienGiamDoc}" (Mã: ${bc.maBaoCao})`,
          loai: 'chi_dao_bao_cao',
          doiTuongBang: 'bao_cao_bo_phan',
          doiTuongId: bc.id,
        });
      }

      // Ghi nhật ký hệ thống
      const userGd = await this.nguoiDungRepo.findOneBy({ id: giamDocUserId });
      await this.nhatKyRepo.save(
        this.nhatKyRepo.create({
          nguoiDungId: giamDocUserId,
          tenNguoiDung: userGd?.tenDangNhap || 'Ban Giám Đốc',
          vaiTro: 'ban_giam_doc',
          hanhDong: 'CHI_DAO_BAO_CAO_BO_PHAN',
          loaiNhatKy: LoaiNhatKy.INFO,
          moTa: `Chỉ đạo báo cáo "${bc.tieuDe}" (${bc.maBaoCao}): "${bc.yKienGiamDoc}"`,
          diaChiIp: '127.0.0.1',
        }),
      );
    } catch (errNotification) {
      console.error('Lỗi gửi thông báo chỉ đạo báo cáo:', errNotification);
    }

    return {
      message: 'Đã lưu ý kiến chỉ đạo của Ban Giám Đốc thành công',
      data: saved,
    };
  }
}
