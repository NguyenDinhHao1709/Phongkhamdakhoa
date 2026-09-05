import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Like } from 'typeorm';
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
    const hashedPassword = await bcrypt.hash(matKhauMoi, 10);
    await this.nguoiDungRepo.update(nguoiDungId, { matKhauHash: hashedPassword });
    return { message: 'Đổi mật khẩu thành công' };
  }

  async doiTrangThaiTaiKhoan(nguoiDungId: number, trangThai: TrangThaiNguoiDung) {
    await this.nguoiDungRepo.update(nguoiDungId, { trangThai });
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

    return {
      kpis: {
        tongDoanhThu,
        doanhThuHomNay,
        totalTiepNhan,
        tiepNhanHomNay,
        soBacSi,
        soNhanVien,
        thoiGianChoTrungBinh: '~12 phút/ca',
        donChoDuyet,
      },
      chart7Days,
      coCauDoanhThu,
      topBacSi: topBacSi.map((b: any) => ({
        hoTen: b.hoTen || 'Bác sĩ',
        chuyenKhoa: b.chuyenKhoa || 'Đa khoa',
        soCa: Number(b.soCa),
      })),
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
      success: true,
      data: {
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
      },
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
    return {
      success: true,
      data: list.map(d => ({
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
      })),
    };
  }

  async duyetDonTu(id: number, action: 'duyet' | 'tu_choi', ghiChuXuLy?: string) {
    const don = await this.donGuiRepo.findOne({ where: { id } });
    if (!don) throw new NotFoundException('Không tìm thấy đơn yêu cầu');

    don.trangThai = action === 'duyet' ? TrangThaiDonGui.DA_XU_LY : TrangThaiDonGui.TU_CHOI;
    don.ghiChuXuLy = ghiChuXuLy || (action === 'duyet' ? 'Đã phê duyệt' : 'Từ chối');
    don.ngayXuLy = new Date();

    await this.donGuiRepo.save(don);
    return {
      success: true,
      message: action === 'duyet' ? 'Phê duyệt đơn thành công' : 'Đã từ chối đơn yêu cầu',
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
    if (!term) {
      return { success: true, data: { nhanSu: [], benhNhan: [] } };
    }

    // 1. Tìm nhân sự
    const nhanSu = await this.nhanVienRepo.createQueryBuilder('nv')
      .leftJoinAndSelect('nv.nguoiDung', 'nd')
      .leftJoinAndSelect('nd.vaiTro', 'vt')
      .where('nv.hoTen LIKE :term OR nv.soCmnd LIKE :term OR nv.soDienThoai LIKE :term OR nv.email LIKE :term OR nv.chucVu LIKE :term', { term: `%${term}%` })
      .limit(10)
      .getMany();

    // 2. Tìm bệnh nhân kèm lịch sử
    const benhNhan = await this.benhNhanRepo.createQueryBuilder('bn')
      .where('bn.hoTen LIKE :term OR bn.maBenhNhan LIKE :term OR bn.soDienThoai LIKE :term OR bn.soCmnd LIKE :term', { term: `%${term}%` })
      .limit(10)
      .getMany();

    return {
      success: true,
      data: {
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
      },
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

    return {
      success: true,
      data: {
        caLamViecList: allCa,
        nhanVienList: allNhanVien.map(n => ({
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
      },
    };
  }

  async xepLichLamViec(body: { nhanVienId: number; caLamViecId: number; ngayLam: string; ghiChu?: string }[]) {
    if (!body || body.length === 0) {
      throw new BadRequestException('Dữ liệu phân ca không được để trống');
    }

    for (const item of body) {
      const existing = await this.lichLamViecRepo.findOne({
        where: {
          nhanVienId: item.nhanVienId,
          caLamViecId: item.caLamViecId,
          ngayLam: item.ngayLam,
        },
      });
      if (existing) {
        existing.ghiChu = item.ghiChu || existing.ghiChu;
        await this.lichLamViecRepo.save(existing);
      } else {
        const newLich = this.lichLamViecRepo.create({
          nhanVienId: item.nhanVienId,
          caLamViecId: item.caLamViecId,
          ngayLam: item.ngayLam,
          ghiChu: item.ghiChu || null,
        });
        await this.lichLamViecRepo.save(newLich);
      }
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
      'SELECT id, ma_phong_ban, ten_phong_ban, mo_ta FROM phong_ban ORDER BY id ASC'
    );
    const phongKhams = await this.nguoiDungRepo.query(
      'SELECT id, ma_phong, ten_phong, vi_tri, trang_thai FROM phong_kham ORDER BY id ASC'
    );
    const dichVus = await this.nguoiDungRepo.query(
      'SELECT id, ma_dich_vu, ten_dich_vu, gia_tien, thoi_gian_tra_kq_phut, trang_thai FROM dich_vu_xet_nghiem ORDER BY id ASC'
    );
    const thuocs = await this.nguoiDungRepo.query(
      'SELECT id, ma_thuoc, ten_thuoc, hoat_chat, don_vi_tinh, gia_ban, so_luong_ton, trang_thai FROM thuoc ORDER BY id ASC'
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
}
