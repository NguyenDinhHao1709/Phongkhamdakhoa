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
import { ThongBaoService } from '../thong-bao/thong-bao.service';

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
    private readonly thongBaoService: ThongBaoService,
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
    // 1. Lượt khám & tiếp nhận
    const totalTiepNhan = await this.tiepNhanRepo.count();
    const tiepNhanHomNay = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .getCount();

    // 2. Doanh thu
    const revRaw = await this.hoaDonRepo.createQueryBuilder('hd')
      .select('SUM(hd.thucThu)', 'tongDoanhThu')
      .addSelect('SUM(CASE WHEN DATE(hd.ngayThanhToan) = CURDATE() THEN hd.thucThu ELSE 0 END)', 'doanhThuHomNay')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .getRawOne();

    const tongDoanhThu = Number(revRaw?.tongDoanhThu || 0);
    const doanhThuHomNay = Number(revRaw?.doanhThuHomNay || 0);

    // 3. Số bác sĩ và nhân viên
    const soBacSi = await this.bacSiRepo.count();
    const soNhanVien = await this.nhanVienRepo.count();

    // 4. Đơn yêu cầu chờ duyệt
    const donChoDuyet = await this.donGuiRepo.count({
      where: { trangThai: TrangThaiDonGui.CHO_XU_LY },
    });

    // 5. Biểu đồ lượt khám và doanh thu 7 ngày gần nhất
    const trendData = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .select("DATE_FORMAT(ltn.thoiGianDen, '%d/%m')", 'ngay')
      .addSelect('COUNT(*)', 'soLuotKham')
      .where('ltn.thoiGianDen >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
      .groupBy("DATE_FORMAT(ltn.thoiGianDen, '%d/%m')")
      .orderBy("MIN(ltn.thoiGianDen)", 'ASC')
      .getRawMany();

    const revTrend = await this.hoaDonRepo.createQueryBuilder('hd')
      .select("DATE_FORMAT(hd.ngayThanhToan, '%d/%m')", 'ngay')
      .addSelect('SUM(hd.thucThu)', 'doanhThu')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .andWhere('hd.ngayThanhToan >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
      .groupBy("DATE_FORMAT(hd.ngayThanhToan, '%d/%m')")
      .orderBy("MIN(hd.ngayThanhToan)", 'ASC')
      .getRawMany();

    // Merge trend
    const chart7Days = trendData.map(t => {
      const matchRev = revTrend.find(r => r.ngay === t.ngay);
      return {
        ngay: t.ngay,
        soLuotKham: Number(t.soLuotKham),
        doanhThu: matchRev ? Number(matchRev.doanhThu) : 0,
      };
    });

    // 6. Cơ cấu doanh thu theo loại phí
    const coCauRaw = await this.hoaDonChiTietRepo.createQueryBuilder('ct')
      .innerJoin('ct.hoaDon', 'hd')
      .select('ct.loaiPhi', 'loaiPhi')
      .addSelect('SUM(ct.thanhTien)', 'tongTien')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .groupBy('ct.loaiPhi')
      .getRawMany();

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
    const topBacSi = await this.benhAnRepo.query(`
      SELECT nv.ho_ten AS hoTen, bs.chuyen_khoa AS chuyenKhoa, COUNT(bak.id) AS soCa
      FROM benh_an_kham bak
      JOIN bac_si bs ON bak.bac_si_id = bs.id
      JOIN nhan_vien nv ON bs.nhan_vien_id = nv.id
      GROUP BY nv.ho_ten, bs.chuyen_khoa
      ORDER BY soCa DESC
      LIMIT 5
    `);

    // 8. Thống kê cận lâm sàng, dược, công suất phòng & giường bệnh
    const clsCountRaw = await this.clsRepo.count();
    const donThuocCountRaw = await this.donThuocRepo.count();

    return {
      kpis: {
        tongDoanhThu,
        doanhThuHomNay,
        totalTiepNhan,
        tiepNhanHomNay,
        soBacSi,
        soNhanVien,
        thoiGianChoTrungBinh: 'Chưa có dữ liệu',
        donChoDuyet,
        soCaCanLamSang: clsCountRaw,
        soDonThuoc: donThuocCountRaw,
        congSuatPhongKham: 'Chưa có dữ liệu',
        congSuatGiuong: 'Chưa có dữ liệu',
        phongMoDangChay: 'Chưa có dữ liệu',
      },
      chart7Days,
      coCauDoanhThu,
      kenhTiepNhan: [],
      hoatDongCls: [],
      topBacSi: topBacSi.map((b: any) => ({
        hoTen: b.hoTen || 'Bác sĩ',
        chuyenKhoa: b.chuyenKhoa || 'Đa khoa',
        soCa: Number(b.soCa),
      })),
      phongMoGiuong: null,
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
  // UC BÁO CÁO TOÀN DIỆN BAN GIÁM ĐỐC (LÂM SÀNG, CLS, DƯỢC, PHÒNG/GIƯỜNG, TÀI CHÍNH)
  // ============================================================
  async getBaoCaoToanDien(filter: { tuNgay?: string; denNgay?: string; phuongThuc?: string }) {
    // 1. Tài chính cơ sở
    const taiChinh = await this.getBaoCaoTaiChinh(filter);

    // 2. Thống kê Lâm sàng & Tiếp nhận
    const totalTiepNhan = await this.tiepNhanRepo.count();
    const tiepNhanHomNay = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .getCount();

    const kenhTiepNhan = [];

    const chuyenKhoaStats = [];

    // 3. Thống kê Cận Lâm Sàng (CLS)
    const clsTong = await this.clsRepo.count();
    const clsHoanThanh = await this.clsRepo.count({ where: { trangThai: 'co_ket_qua' as any } });
    const clsDangThucHien = await this.clsRepo.count({ where: [{ trangThai: 'dang_lay_mau' as any }, { trangThai: 'dang_xu_ly' as any }] });
    const clsCho = await this.clsRepo.count({ where: { trangThai: 'cho_lay_mau' as any } });
    const clsStats = {
      tongChiDinh: clsTong,
      daHoanThanh: clsHoanThanh,
      dangThucHien: clsDangThucHien,
      choTiepNhan: clsCho,
      tyLeHoanThanh: clsTong ? `${((clsHoanThanh / clsTong) * 100).toFixed(1)}%` : null,
      thoiGianChoTB: null,
      danhMucDichVu: [],
    };

    // 4. Kho Dược & Nhà Thuốc
    const duocStats = { tongDoanhThuDuoc: 0, soDonThuocDaXuat: await this.donThuocRepo.count(), giaTriTrungBinhDon: null, topThuocKeDon: [], canhBaoTonKho: [] };

    // 5. Vận Hành Khoa Phòng, Phòng Mổ & Giường Bệnh
    const vanHanhStats = {};

    return {
      taiChinh,
      lamSang: {
        totalTiepNhan,
        tiepNhanHomNay,
        kenhTiepNhan,
        chuyenKhoaStats,
      },
      cls: clsStats,
      duoc: duocStats,
      vanHanh: vanHanhStats,
    };
  }

  // ============================================================
  // UC 22: DUYỆT YÊU CẦU CỦA NHÂN VIÊN (BAN GIÁM ĐỐC)
  // ============================================================
  async getDanhSachDonTu(filter?: { trangThai?: string }) {
    const qb = this.donGuiRepo.createQueryBuilder('dg')
      .leftJoinAndSelect('dg.nguoiGui', 'nv')
      .orderBy('dg.ngayGui', 'DESC');

    if (filter?.trangThai && filter.trangThai !== 'all') {
      qb.andWhere('dg.trangThai = :st', { st: filter.trangThai });
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
        chucVu: d.nguoiGui?.chucVu,
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
              lh.ghiChu = `${(lh.ghiChu || '').trim()} [Ban Giám Đốc đã duyệt hủy ca: ${don.ghiChuXuLy}] [Hệ thống đã hoàn tiền 100% tạm ứng 40.000đ cho bệnh nhân]`.trim();
              await this.lichHenRepo.save(lh);

              // 1. GỬI THÔNG BÁO CHO BỆNH NHÂN VỀ CA HỦY VÀ HOÀN TIỀN
              const bnUserId = lh.benhNhan?.nguoiDungId;
              if (bnUserId) {
                await this.thongBaoService.taoThongBao({
                  nguoiNhanId: bnUserId,
                  tieuDe: `Thông báo hủy ca khám và hoàn tiền: ${lh.maLichHen}`,
                  noiDung: `Ca khám mã ${lh.maLichHen} vào ngày ${lh.ngayHen} lúc ${lh.gioHen} của bạn đã được hủy theo đề xuất của Bác sĩ ${lh.bacSi?.nhanVien?.hoTen || ''} (Ban Giám Đốc đã phê duyệt). Tiền tạm ứng 40.000đ đã được hoàn lại 100% vào tài khoản thanh toán của bạn. Xin thứ lỗi vì sự bất tiện này!`,
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
        hoTen: n.hoTen,
        chucVu: n.chucVu,
        vaiTro: n.nguoiDung?.vaiTro?.tenVaiTro,
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

    const qb = this.nhatKyRepo.createQueryBuilder('log');

    if (query.loaiNhatKy && query.loaiNhatKy !== 'TAT_CA') {
      qb.andWhere('log.loaiNhatKy = :loai', { loai: query.loaiNhatKy });
    }

    if (query.hanhDong && query.hanhDong !== 'TAT_CA') {
      qb.andWhere('log.hanhDong = :hanhDong', { hanhDong: query.hanhDong });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere(
        '(log.tenNguoiDung LIKE :kw OR log.moTa LIKE :kw OR log.diaChiIp LIKE :kw OR log.hanhDong LIKE :kw OR log.vaiTro LIKE :kw)',
        { kw: `%${query.search.trim()}%` },
      );
    }

    if (query.tuNgay) {
      qb.andWhere('log.thoiGian >= :tuNgay', { tuNgay: new Date(query.tuNgay) });
    }

    if (query.denNgay) {
      const end = new Date(query.denNgay);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('log.thoiGian <= :denNgay', { denNgay: end });
    }

    qb.orderBy('log.thoiGian', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

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

    const totalLogs = await this.nhatKyRepo.count();
    const todayLogs = await this.nhatKyRepo.count({
      where: { thoiGian: MoreThanOrEqual(today) },
    });
    const securityLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.SECURITY },
    });
    const errorLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.ERROR },
    });
    const warningLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.WARNING },
    });
    const infoLogs = await this.nhatKyRepo.count({
      where: { loaiNhatKy: LoaiNhatKy.INFO },
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
    const subHours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
    const subDays = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const initialSeeds = [
      {
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'DANG_NHAP_THANH_CONG',
        loaiNhatKy: LoaiNhatKy.SECURITY,
        moTa: 'Quản trị viên đăng nhập vào bảng điều khiển IT thành công từ IP 127.0.0.1',
        diaChiIp: '127.0.0.1',
        userAgent: 'Chrome 128.0 (Windows NT 10.0; Win64; x64)',
        thoiGian: subHours(1),
      },
      {
        tenNguoiDung: 'giamdoc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'PHE_DUYET_DON',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Giám đốc đã phê duyệt đơn đề xuất mua sắm trang thiết bị y tế (bộ nội soi HD)',
        diaChiIp: '192.168.1.10',
        userAgent: 'Chrome 128.0 (macOS)',
        thoiGian: subHours(2),
      },
      {
        tenNguoiDung: 'bacsi',
        vaiTro: 'bac_si',
        hanhDong: 'GUI_DON_TRINH',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Bác sĩ Nguyễn Văn A gửi đơn đề xuất mua sắm trang thiết bị tới Ban Giám Đốc',
        diaChiIp: '192.168.1.15',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(3),
      },
      {
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'SAO_LUU_CSDL',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Xuất tệp sao lưu dữ liệu toàn hệ thống phong_kham_backup.sql (36 bảng, 2.35MB)',
        diaChiIp: '127.0.0.1',
        userAgent: 'Chrome 128.0 (Windows NT 10.0)',
        thoiGian: subHours(4),
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
        thoiGian: subHours(8),
      },
      {
        tenNguoiDung: 'tieptan',
        vaiTro: 'tiep_tan',
        hanhDong: 'TIEP_NHAN_BENH_NHAN',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: 'Tiếp nhận bệnh nhân mới BN000008 (Trần Văn Bình) vào phòng khám Nội 1',
        diaChiIp: '192.168.1.20',
        userAgent: 'Edge 128.0 (Windows NT 10.0)',
        thoiGian: subHours(10),
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
}
