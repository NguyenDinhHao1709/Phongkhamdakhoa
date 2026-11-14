import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Like, MoreThanOrEqual, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { NguoiDung, TrangThaiNguoiDung, LoaiTaiKhoan } from '../auth/entities/nguoi-dung.entity';
import { VaiTro } from '../auth/entities/vai-tro.entity';
import { QuyenHan } from '../auth/entities/quyen-han.entity';
import { VaiTroQuyenHan } from '../auth/entities/vai-tro-quyen-han.entity';
import { maBenhNhanTiepTheo } from '../../common/utils/db-sequence.util';
import { slotHopHinhThuc, moKhungOnlineChoTrucTiep, layMinNgayDatOnline } from '../../common/utils/khung-online.util';
import { withColdStartRetry, isServiceWakingUp } from '../../common/utils/cold-start-retry.util';
import { PYTHON_ML_URL } from '../../common/utils/python-ml-url.util';
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
import { ChiDinhCanLamSang, DichVuXetNghiem } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { NhatKyHeThong, LoaiNhatKy } from './entities/nhat-ky-he-thong.entity';
import { auditModuleLabel } from '../../common/audit/audit-log.config';
import { BaoCaoBoPhan } from './entities/bao-cao-bo-phan.entity';
import { CauHinhTienCoc } from './entities/cau-hinh-tien-coc.entity';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { Aes256Transformer } from '../../common/transformers/aes-256.transformer';

function toDateOnly(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
import { v2 as cloudinary } from 'cloudinary';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, NHOM_CHUC_NANG_ORDER } from '../auth/rbac-defaults';

// Kênh tiếp nhận: alias ltn = luot_tiep_nhan, lh = lich_hen (LEFT JOIN)
const KENH_SQL = {
  online: "SUM(CASE WHEN lh.nguon_dat = 'benh_nhan_tu_dat' THEN 1 ELSE 0 END)",
  quaNhanVien: "SUM(CASE WHEN lh.id IS NOT NULL AND (lh.nguon_dat IS NULL OR lh.nguon_dat != 'benh_nhan_tu_dat') THEN 1 ELSE 0 END)",
  vangLai: 'SUM(CASE WHEN lh.id IS NULL THEN 1 ELSE 0 END)',
};

function tinhKenhTiepNhan(raw: any) {
  const kenh = [
    { kenh: 'Đặt lịch online (bệnh nhân tự đặt)', soLuot: Number(raw?.online || 0), color: '#2563EB', moTa: 'Bệnh nhân tự đặt khám qua website / ứng dụng' },
    { kenh: 'Hẹn qua nhân viên (tiếp tân, tái khám)', soLuot: Number(raw?.quaNhanVien || 0), color: '#7C3AED', moTa: 'Lịch hẹn do tiếp tân đặt hộ hoặc bác sĩ hẹn tái khám' },
    { kenh: 'Vãng lai tại quầy', soLuot: Number(raw?.vangLai || 0), color: '#0D9488', moTa: 'Bệnh nhân đến lấy số trực tiếp, không có lịch hẹn' },
  ];
  const tong = kenh.reduce((s, k) => s + k.soLuot, 0);
  return kenh.map((k) => ({ ...k, tyLe: tong > 0 ? Math.round((k.soLuot / tong) * 1000) / 10 : 0 }));
}

@Injectable()
export class QuanLyService implements OnModuleInit {
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
    @InjectRepository(DichVuXetNghiem) private dichVuRepo: Repository<DichVuXetNghiem>,
    @InjectRepository(DonThuoc) private donThuocRepo: Repository<DonThuoc>,
    @InjectRepository(LichHen) private lichHenRepo: Repository<LichHen>,
    @InjectRepository(NhatKyHeThong) private nhatKyRepo: Repository<NhatKyHeThong>,
    @InjectRepository(BaoCaoBoPhan) private baoCaoBoPhanRepo: Repository<BaoCaoBoPhan>,
    @InjectRepository(CauHinhTienCoc) private tienCocRepo: Repository<CauHinhTienCoc>,
    private readonly thongBaoService: ThongBaoService,
    private readonly httpService: HttpService,
    private readonly cache: MemoryCacheService,
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

    let defaultPhongBanId: number | null = null;
    if (vaiTro.maVaiTro === 'bac_si') defaultPhongBanId = 1;
    else if (vaiTro.maVaiTro === 'ky_thuat_vien') defaultPhongBanId = 2;
    else if (vaiTro.maVaiTro === 'nhan_vien_nha_thuoc' || vaiTro.maVaiTro === 'nha_thuoc') defaultPhongBanId = 3;
    else if (vaiTro.maVaiTro === 'thu_ngan') defaultPhongBanId = 4;
    else if (vaiTro.maVaiTro === 'tiep_tan') defaultPhongBanId = 5;

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
      phongBanId: defaultPhongBanId,
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

    // Chốt chặn ERP Y Tế: Không cho phép xóa cứng nhân viên nếu đã phát sinh lịch sử khám/hóa đơn/đơn thuốc
    const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: id } });
    if (bs) {
      const [lhCount, bakCount] = await Promise.all([
        this.lichHenRepo.count({ where: { bacSiId: bs.id } }),
        this.benhAnRepo.count({ where: { bacSiId: bs.id } }),
      ]);
      if (lhCount > 0 || bakCount > 0) {
        throw new BadRequestException({
          code: 'NHAN_VIEN_CO_HO_SO_PHAP_LY_Y_TE',
          message: `Bác sĩ "${nv.hoTen}" đã có ${bakCount} bệnh án khám và ${lhCount} lịch hẹn lưu trữ trong hệ thống. Theo chuẩn lưu trữ hồ sơ y tế, không được xóa cứng nhân sự này — vui lòng chuyển trạng thái sang "Khóa tài khoản"!`,
        });
      }
    }

    const hdCount = await this.hoaDonRepo.count({ where: { thuNganId: id } });
    if (hdCount > 0) {
      throw new BadRequestException({
        code: 'NHAN_VIEN_CO_CHUNG_TU_TAI_CHINH',
        message: `Nhân viên "${nv.hoTen}" đã đứng tên trên ${hdCount} hóa đơn tài chính. Không được xóa cứng — vui lòng sử dụng chức năng "Khóa tài khoản"!`,
      });
    }

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
  // QUẢN LÝ TÀI KHOẢN BỆNH NHÂN (ADMIN)
  // ==========================================
  async getDanhSachTaiKhoanBenhNhan(params: {
    page?: number;
    limit?: number;
    search?: string;
    trangThai?: string;
    coTaiKhoan?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 12;
    const skip = (page - 1) * limit;

    const qb = this.benhNhanRepo.createQueryBuilder('bn')
      .leftJoin('bn.nguoiDung', 'nd')
      .addSelect([
        'nd.id',
        'nd.tenDangNhap',
        'nd.loaiTaiKhoan',
        'nd.trangThai',
        'nd.lanDangNhapCuoi',
        'nd.taoLuc',
      ]);

    const keyword = (params.search || '').trim();
    if (keyword) {
      qb.andWhere(
        '(bn.ho_ten LIKE :kw OR bn.ma_benh_nhan LIKE :kw OR bn.so_cmnd LIKE :kw OR bn.so_dien_thoai LIKE :kw OR bn.email LIKE :kw OR nd.ten_dang_nhap LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    if (params.coTaiKhoan === 'co') {
      qb.andWhere('bn.nguoi_dung_id IS NOT NULL');
    } else if (params.coTaiKhoan === 'chua') {
      qb.andWhere('bn.nguoi_dung_id IS NULL');
    }

    if (params.trangThai && params.trangThai !== 'TAT_CA') {
      if (params.trangThai === 'chua_co_tai_khoan') {
        qb.andWhere('bn.nguoi_dung_id IS NULL');
      } else {
        qb.andWhere('nd.trang_thai = :st', { st: params.trangThai });
      }
    }

    qb.orderBy('bn.taoLuc', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Thống kê nhanh
    const totalPatients = await this.benhNhanRepo.count();
    const withAccountCount = await this.benhNhanRepo.count({
      where: { nguoiDungId: Not(IsNull()) as any },
    });
    const activeAccountCount = await this.nguoiDungRepo.count({
      where: { loaiTaiKhoan: LoaiTaiKhoan.BENH_NHAN, trangThai: TrangThaiNguoiDung.HOAT_DONG },
    });
    const lockedAccountCount = await this.nguoiDungRepo.count({
      where: { loaiTaiKhoan: LoaiTaiKhoan.BENH_NHAN, trangThai: TrangThaiNguoiDung.KHOA },
    });

    return {
      message: 'Lấy danh sách tài khoản bệnh nhân thành công',
      data: items,
      stats: {
        total: totalPatients,
        withAccount: withAccountCount,
        active: activeAccountCount,
        locked: lockedAccountCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async taoTaiKhoanBenhNhan(dto: {
    hoTen: string;
    soDienThoai?: string;
    email?: string;
    tenDangNhap?: string;
    matKhau: string;
    ngaySinh?: string;
    gioiTinh?: string;
    soCmnd?: string;
    soBhyt?: string;
    diaChi?: string;
    nhomMau?: string;
    diUng?: string;
    tienSuBenh?: string;
  }) {
    const role = await this.vaiTroRepo.findOne({ where: { maVaiTro: 'benh_nhan' } });
    if (!role) throw new NotFoundException('Vai trò bệnh nhân không tồn tại');

    const username = (dto.tenDangNhap || dto.email || dto.soDienThoai || '').trim();
    if (!username) throw new BadRequestException('Vui lòng cung cấp email, SĐT hoặc tên đăng nhập');

    const existingUser = await this.nguoiDungRepo.findOne({ where: { tenDangNhap: username } });
    if (existingUser) throw new ConflictException('Tên đăng nhập / Email này đã được sử dụng');

    const hashedPassword = await bcrypt.hash(dto.matKhau || '123456', 10);
    const newUser = this.nguoiDungRepo.create({
      tenDangNhap: username,
      matKhauHash: hashedPassword,
      vaiTroId: role.id,
      loaiTaiKhoan: LoaiTaiKhoan.BENH_NHAN,
      trangThai: TrangThaiNguoiDung.HOAT_DONG,
      emailDaXacThuc: true as any,
    });
    const savedUser = await this.nguoiDungRepo.save(newUser);

    const newPatient = this.benhNhanRepo.create({
      maBenhNhan: await maBenhNhanTiepTheo(this.benhNhanRepo.manager),
      nguoiDungId: savedUser.id,
      hoTen: dto.hoTen,
      soDienThoai: dto.soDienThoai,
      email: dto.email,
      ngaySinh: dto.ngaySinh || '1995-01-01',
      gioiTinh: (dto.gioiTinh || 'nam') as any,
      soCmnd: dto.soCmnd,
      soBhyt: dto.soBhyt,
      diaChi: dto.diaChi,
      nhomMau: dto.nhomMau,
      diUng: dto.diUng,
      tienSuBenh: dto.tienSuBenh,
    });
    const savedPatient = await this.benhNhanRepo.save(newPatient);

    await this.ghiLog({
      nguoiDungId: savedUser.id,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien',
      hanhDong: 'TAO_TAI_KHOAN_BENH_NHAN',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Quản trị viên đã tạo tài khoản bệnh nhân "${username}" cho ${dto.hoTen} (${savedPatient.maBenhNhan})`,
    });

    return { message: 'Tạo tài khoản bệnh nhân thành công', data: savedPatient };
  }

  async capTaiKhoanChoBenhNhan(benhNhanId: number, dto: { tenDangNhap: string; matKhau: string }) {
    const patient = await this.benhNhanRepo.findOne({ where: { id: benhNhanId } });
    if (!patient) throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân');
    if (patient.nguoiDungId) throw new BadRequestException('Bệnh nhân này đã có tài khoản đăng nhập');

    const role = await this.vaiTroRepo.findOne({ where: { maVaiTro: 'benh_nhan' } });
    if (!role) throw new NotFoundException('Vai trò bệnh nhân không tồn tại');

    const username = dto.tenDangNhap.trim();
    const existing = await this.nguoiDungRepo.findOne({ where: { tenDangNhap: username } });
    if (existing) throw new ConflictException('Tên đăng nhập đã tồn tại trong hệ thống');

    const hashedPassword = await bcrypt.hash(dto.matKhau || '123456', 10);
    const newUser = this.nguoiDungRepo.create({
      tenDangNhap: username,
      matKhauHash: hashedPassword,
      vaiTroId: role.id,
      loaiTaiKhoan: LoaiTaiKhoan.BENH_NHAN,
      trangThai: TrangThaiNguoiDung.HOAT_DONG,
      emailDaXacThuc: true as any,
    });
    const savedUser = await this.nguoiDungRepo.save(newUser);

    patient.nguoiDungId = savedUser.id;
    await this.benhNhanRepo.save(patient);

    await this.ghiLog({
      nguoiDungId: savedUser.id,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien',
      hanhDong: 'CAP_TAI_KHOAN_BENH_NHAN',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Quản trị viên cấp tài khoản "${username}" cho bệnh nhân ${patient.hoTen} (${patient.maBenhNhan})`,
    });

    return { message: 'Cấp tài khoản thành công', data: patient };
  }

  async xoaTaiKhoanBenhNhan(benhNhanId: number) {
    const patient = await this.benhNhanRepo.findOne({ where: { id: benhNhanId } });
    if (!patient) throw new NotFoundException('Không tìm thấy bệnh nhân');

    if (patient.nguoiDungId) {
      const uId = patient.nguoiDungId;
      patient.nguoiDungId = null as any;
      await this.benhNhanRepo.save(patient);
      await this.nguoiDungRepo.delete(uId);
    }
    await this.benhNhanRepo.delete(benhNhanId);

    await this.ghiLog({
      nguoiDungId: 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien',
      hanhDong: 'XOA_BENH_NHAN',
      loaiNhatKy: LoaiNhatKy.WARNING,
      moTa: `Quản trị viên đã xóa hồ sơ / tài khoản bệnh nhân ${patient.hoTen} (${patient.maBenhNhan})`,
    });

    return { message: 'Xóa bệnh nhân thành công' };
  }

  // ==========================================
  // PHÂN QUYỀN (VAI TRÒ & QUYỀN HẠN)
  // ==========================================

  // Seed danh mục quyền chuẩn: chỉ thêm quyền còn thiếu & gán mặc định cho quyền mới,
  // không ghi đè cấu hình Admin đã chỉnh. Lần nâng cấp đầu tiên (chưa có 'he_thong.phan_quyen')
  // sẽ chuẩn hóa toàn bộ vai trò về bộ quyền mặc định mới.
  async onModuleInit() {
    try {
      const existing = await this.quyenHanRepo.find();
      const byMa = new Map(existing.map(q => [q.maQuyen, q]));
      const isFirstUpgrade = !byMa.has('he_thong.phan_quyen');
      const newCodes = new Set<string>();

      for (const p of DEFAULT_PERMISSIONS) {
        const cur = byMa.get(p.maQuyen);
        if (!cur) {
          byMa.set(p.maQuyen, await this.quyenHanRepo.save(this.quyenHanRepo.create(p)));
          newCodes.add(p.maQuyen);
        } else if (cur.tenQuyen !== p.tenQuyen || cur.nhomChucNang !== p.nhomChucNang) {
          await this.quyenHanRepo.update(cur.id, { tenQuyen: p.tenQuyen, nhomChucNang: p.nhomChucNang });
        }
      }

      const vaiTros = await this.vaiTroRepo.find();
      for (const vt of vaiTros) {
        const preset = DEFAULT_ROLE_PERMISSIONS[vt.maVaiTro];
        if (!preset || vt.laHeThong) continue;
        if (isFirstUpgrade) {
          await this.ganQuyenTheoMa(vt.id, preset);
        } else {
          const toAdd = preset.filter(ma => newCodes.has(ma)).map(ma => byMa.get(ma)!.id);
          if (toAdd.length) {
            await this.vaiTroQuyenHanRepo.save(toAdd.map(quyenHanId => ({ vaiTroId: vt.id, quyenHanId })));
          }
        }
      }
      if (newCodes.size) new Logger('RBAC').log(`Đã bổ sung ${newCodes.size} quyền hạn mới vào danh mục`);
    } catch (e) {
      new Logger('RBAC').warn(`Không thể seed danh mục quyền: ${e?.message}`);
    }
  }

  private async ganQuyenTheoMa(vaiTroId: number, maQuyens: string[]) {
    const perms = maQuyens.length ? await this.quyenHanRepo.find({ where: { maQuyen: In(maQuyens) } }) : [];
    await this.vaiTroQuyenHanRepo.delete({ vaiTroId });
    if (perms.length) {
      await this.vaiTroQuyenHanRepo.save(perms.map(p => ({ vaiTroId, quyenHanId: p.id })));
    }
    return perms.length;
  }

  private async ghiNhatKyPhanQuyen(currentUserId: number | undefined, hanhDong: string, moTa: string) {
    try {
      const actor = currentUserId ? await this.nguoiDungRepo.findOne({ where: { id: currentUserId } }) : null;
      await this.nhatKyRepo.save(
        this.nhatKyRepo.create({
          nguoiDungId: currentUserId || null,
          tenNguoiDung: actor?.tenDangNhap || 'Quản trị viên',
          vaiTro: 'quan_tri_vien',
          hanhDong,
          loaiNhatKy: LoaiNhatKy.INFO,
          moTa,
          diaChiIp: '127.0.0.1',
        }),
      );
    } catch (e) {
      // Ignore
    }
  }

  private async layVaiTroChinhSua(vaiTroId: number) {
    const role = await this.vaiTroRepo.findOne({ where: { id: vaiTroId } });
    if (!role) throw new NotFoundException('Vai trò không tồn tại');
    if (role.laHeThong) {
      throw new BadRequestException('Không thể chỉnh sửa vai trò hệ thống gốc');
    }
    return role;
  }

  async getPhanQuyenData() {
    const vaiTros = await this.vaiTroRepo.find({
      where: { maVaiTro: Not('benh_nhan') },
      order: { id: 'ASC' },
    });

    const quyenHans = await this.quyenHanRepo.find({
      order: { nhomChucNang: 'ASC', id: 'ASC' },
    });

    const mappings = await this.vaiTroQuyenHanRepo.find();

    // Lấy số lượng nhân sự của từng vai trò
    const userCounts = await this.nguoiDungRepo.createQueryBuilder('nd')
      .select('nd.vaiTroId', 'vaiTroId')
      .addSelect('COUNT(nd.id)', 'soNhanSu')
      .groupBy('nd.vaiTroId')
      .getRawMany();
    const countMap = new Map(userCounts.map(u => [Number(u.vaiTroId), Number(u.soNhanSu)]));

    const vaiTroDtos = vaiTros.map(vt => ({
      id: vt.id,
      maVaiTro: vt.maVaiTro,
      tenVaiTro: vt.tenVaiTro,
      moTa: vt.moTa,
      laHeThong: Boolean(vt.laHeThong),
      soNhanSu: countMap.get(vt.id) || 0,
      coMacDinh: Boolean(DEFAULT_ROLE_PERMISSIONS[vt.maVaiTro]),
    }));

    const matrix = vaiTroDtos.map(vt => ({
      vaiTro: vt,
      quyenHanIds: vt.maVaiTro === 'quan_tri_vien_cap_cao'
        ? quyenHans.map(q => q.id)
        : mappings.filter(m => m.vaiTroId === vt.id).map(m => m.quyenHanId),
    }));

    // Nhóm quyền theo thứ tự nghiệp vụ chuẩn, nhóm tự tạo xếp cuối
    const groupedQuyen: Record<string, typeof quyenHans> = {};
    const nhoms = [...new Set([...NHOM_CHUC_NANG_ORDER, ...quyenHans.map(q => q.nhomChucNang || 'Khác')])];
    nhoms.forEach(nhom => {
      const list = quyenHans.filter(q => (q.nhomChucNang || 'Khác') === nhom);
      if (list.length) groupedQuyen[nhom] = list;
    });

    return {
      data: {
        vaiTros: vaiTroDtos,
        quyenHans: groupedQuyen,
        allQuyenHans: quyenHans,
        nhomChucNangs: nhoms,
        matrix,
      },
      message: 'Lấy dữ liệu phân quyền thành công'
    };
  }

  async capNhatPhanQuyen(vaiTroId: number, quyenHanIds: number[], currentUserId?: number) {
    const role = await this.layVaiTroChinhSua(vaiTroId);

    await this.vaiTroQuyenHanRepo.delete({ vaiTroId });

    if (quyenHanIds && quyenHanIds.length > 0) {
      const newMappings = quyenHanIds.map(qhId => ({
        vaiTroId: vaiTroId,
        quyenHanId: qhId,
      }));
      await this.vaiTroQuyenHanRepo.save(newMappings);
    }

    await this.ghiNhatKyPhanQuyen(
      currentUserId,
      'CAP_NHAT_PHAN_QUYEN',
      `Điều chỉnh phân quyền vai trò "${role.tenVaiTro}" (${role.maVaiTro}): Đã cấp ${quyenHanIds?.length || 0} quyền hạn.`,
    );

    return { message: 'Cập nhật phân quyền thành công' };
  }

  async capNhatThongTinVaiTro(vaiTroId: number, dto: { tenVaiTro?: string; moTa?: string }, currentUserId?: number) {
    const role = await this.layVaiTroChinhSua(vaiTroId);
    const tenVaiTro = dto.tenVaiTro?.trim();
    if (dto.tenVaiTro !== undefined && !tenVaiTro) {
      throw new BadRequestException('Tên vai trò không được để trống');
    }
    if (tenVaiTro) role.tenVaiTro = tenVaiTro;
    if (dto.moTa !== undefined) role.moTa = dto.moTa.trim();
    await this.vaiTroRepo.save(role);

    await this.ghiNhatKyPhanQuyen(currentUserId, 'CAP_NHAT_VAI_TRO', `Cập nhật thông tin vai trò "${role.tenVaiTro}" (${role.maVaiTro}).`);
    return { message: 'Cập nhật thông tin vai trò thành công' };
  }

  async khoiPhucQuyenMacDinh(vaiTroId: number, currentUserId?: number) {
    const role = await this.layVaiTroChinhSua(vaiTroId);
    const preset = DEFAULT_ROLE_PERMISSIONS[role.maVaiTro];
    if (!preset) {
      throw new BadRequestException('Vai trò này chưa có bộ quyền chuẩn mặc định');
    }
    const soQuyen = await this.ganQuyenTheoMa(vaiTroId, preset);

    await this.ghiNhatKyPhanQuyen(
      currentUserId,
      'KHOI_PHUC_PHAN_QUYEN',
      `Khôi phục bộ quyền chuẩn mặc định cho vai trò "${role.tenVaiTro}" (${role.maVaiTro}): ${soQuyen} quyền hạn.`,
    );
    return { message: `Đã khôi phục ${soQuyen} quyền chuẩn mặc định` };
  }

  async taoQuyenHan(dto: { maQuyen: string; tenQuyen: string; nhomChucNang: string }, currentUserId?: number) {
    const maQuyen = (dto.maQuyen || '').trim().toLowerCase();
    const tenQuyen = (dto.tenQuyen || '').trim();
    const nhomChucNang = (dto.nhomChucNang || '').trim();
    if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(maQuyen)) {
      throw new BadRequestException('Mã quyền phải có dạng "phan_he.hanh_dong" (chữ thường, số, dấu gạch dưới)');
    }
    if (!tenQuyen || !nhomChucNang) {
      throw new BadRequestException('Vui lòng nhập đầy đủ tên quyền và nhóm chức năng');
    }
    if (await this.quyenHanRepo.findOne({ where: { maQuyen } })) {
      throw new ConflictException(`Mã quyền "${maQuyen}" đã tồn tại`);
    }
    const saved = await this.quyenHanRepo.save(this.quyenHanRepo.create({ maQuyen, tenQuyen, nhomChucNang }));

    await this.ghiNhatKyPhanQuyen(currentUserId, 'TAO_QUYEN_HAN', `Tạo quyền hạn mới "${tenQuyen}" (${maQuyen}) thuộc nhóm ${nhomChucNang}.`);
    return { data: saved, message: 'Đã thêm quyền hạn mới' };
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
      .select('SUM(hd.thucThu - hd.tienHoanTra)', 'tongDoanhThu')
      .addSelect('SUM(CASE WHEN DATE(hd.ngayThanhToan) = CURDATE() THEN hd.thucThu - hd.tienHoanTra ELSE 0 END)', 'doanhThuHomNay')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .getRawOne();

    const tongDoanhThu = Number(revRaw?.tongDoanhThu || 0);
    const doanhThuHomNay = Number(revRaw?.doanhThuHomNay || 0);

    let doanhThuTrongKy = tongDoanhThu;
    if (startDateTime && endDateTime) {
      const revRangeRaw = await this.hoaDonRepo.createQueryBuilder('hd')
        .select('SUM(hd.thucThu - hd.tienHoanTra)', 'doanhThuTrongKy')
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
      .addSelect('SUM(hd.thucThu - hd.tienHoanTra)', 'doanhThu')
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
      .select(KENH_SQL.online, 'online')
      .addSelect(KENH_SQL.quaNhanVien, 'quaNhanVien')
      .addSelect(KENH_SQL.vangLai, 'vangLai');

    if (startDateTime && endDateTime) {
      kenhQb = kenhQb.where('ltn.thoiGianDen BETWEEN :s AND :e', { s: startDateTime, e: endDateTime });
    }
    const kenhTiepNhan = tinhKenhTiepNhan(await kenhQb.getRawOne()).map((k) => ({
      name: k.kenh, value: k.tyLe, soCa: k.soLuot, color: k.color,
    }));

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
      const tt = Number(h.thucThu) - Number(h.tienHoanTra || 0); // trừ phần hoàn trả tạm ứng dư
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
      .addSelect("SUM(CASE WHEN ltn.trangThai = 'hoan_thanh' THEN 1 ELSE 0 END)", 'daKham')
      .addSelect("SUM(CASE WHEN ltn.trangThai IN ('dang_kham', 'dang_cls', 'da_co_kq_cls', 'cho_thanh_toan') THEN 1 ELSE 0 END)", 'dangKham')
      .addSelect("SUM(CASE WHEN ltn.trangThai = 'cho_kham' THEN 1 ELSE 0 END)", 'choKham');

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
      SELECT ${KENH_SQL.online} AS online, ${KENH_SQL.quaNhanVien} AS quaNhanVien, ${KENH_SQL.vangLai} AS vangLai
      FROM luot_tiep_nhan ltn
      LEFT JOIN lich_hen lh ON ltn.lich_hen_id = lh.id
    `;
    const kenhParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      kenhSql += ` WHERE ltn.thoi_gian_den BETWEEN ? AND ? `;
      kenhParams.push(tuNgayStr, denNgayStr);
    }
    const kenhRaw = await this.tiepNhanRepo.query(kenhSql, kenhParams);
    const kenhTiepNhan = tinhKenhTiepNhan(kenhRaw[0]).map(({ kenh, soLuot, tyLe, moTa }) => ({
      kenh, soLuot, tyLe: `${tyLe}%`, moTa,
    }));

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
        CASE WHEN lh.nguon_dat = 'benh_nhan_tu_dat' THEN 'Đặt hẹn online'
             WHEN lh.id IS NOT NULL THEN 'Hẹn qua nhân viên' ELSE 'Vãng lai tại quầy' END AS nguonDonTiep
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

    // Thời gian chờ CLS TB: từ lúc chỉ định đến lúc lấy mẫu (hoặc có kết quả nếu không lấy mẫu)
    let choSql = `
      SELECT AVG(TIMESTAMPDIFF(SECOND, thoi_gian_chi_dinh, COALESCE(thoi_gian_lay_mau, thoi_gian_co_ket_qua))) / 60 AS phut
      FROM chi_dinh_can_lam_sang
      WHERE COALESCE(thoi_gian_lay_mau, thoi_gian_co_ket_qua) >= thoi_gian_chi_dinh
    `;
    const choParams: any[] = [];
    if (tuNgayStr && denNgayStr) {
      choSql += ` AND thoi_gian_chi_dinh BETWEEN ? AND ? `;
      choParams.push(tuNgayStr, denNgayStr);
    }
    const [choRow] = await this.clsRepo.query(choSql, choParams).catch(() => [{}]);
    const phutCho = choRow?.phut == null ? null : Number(choRow.phut);

    const clsStats = {
      tongChiDinh: clsTong,
      daHoanThanh: clsHoanThanh,
      daThucHien: clsHoanThanh,
      dangThucHien: clsDangThucHien,
      choTiepNhan: clsCho,
      choThucHien: clsDangThucHien + clsCho,
      tyLeHoanThanh: clsTong > 0 ? `${((clsHoanThanh / clsTong) * 100).toFixed(1)}%` : '100%',
      thoiGianChoTB: phutCho == null ? '—' : `${phutCho.toFixed(1)} phút`,
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
        let targetUserId = nvGui?.nguoiDungId;
        if (!targetUserId && don.nguoiGuiId) {
          const ndDirect = await this.nguoiDungRepo.findOne({ where: { id: don.nguoiGuiId } });
          if (ndDirect) targetUserId = ndDirect.id;
        }
        const statusText = action === 'duyet' ? 'đã được PHÊ DUYỆT' : 'đã bị TỪ CHỐI';
        const tieuDe = `Kết quả phê duyệt yêu cầu: ${don.loaiDon}`;
        const noiDung = `Yêu cầu [${don.loaiDon}] của bạn ${statusText}. Ghi chú: ${don.ghiChuXuLy}`;

        if (targetUserId) {
          await this.thongBaoService.taoThongBao({
            nguoiNhanId: targetUserId,
            tieuDe,
            noiDung,
            loai: 'don_tu',
            doiTuongBang: 'don_gui',
            doiTuongId: don.id,
          });
        }
        // Nếu là đơn về thuốc / nhập kho thuốc thì thông báo cho bộ phận nhà thuốc
        if (don.loaiDon?.toLowerCase().includes('thuốc') || don.loaiDon?.toLowerCase().includes('nhập kho')) {
          const pharmacyList = await this.thongBaoService.taoThongBaoTheoRole('nhan_vien_nha_thuoc', {
            tieuDe,
            noiDung,
            loai: 'don_tu',
            doiTuongBang: 'don_gui',
            doiTuongId: don.id,
          });
          // Tránh trùng nếu targetUserId đã nằm trong nhóm nhan_vien_nha_thuoc
          void pharmacyList;
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
        ngayLam: toDateOnly(l.ngayLam),
        ghiChu: l.ghiChu,
        onlineTu: l.onlineTu,
        onlineDen: l.onlineDen,
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

      // 2. Kiểm tra giới hạn tối đa 3 ca/ngày để cho phép đủ ca sáng, chiều và tối
      const existingShifts = await this.lichLamViecRepo.find({
        where: {
          nhanVienId: item.nhanVienId,
          ngayLam: item.ngayLam,
        },
      });

      if (existingShifts.length >= 3) {
        const existingShiftNames = existingShifts
          .map((shift) => shift.caLamViecId)
          .join(', ');
        throw new BadRequestException({
          code: 'VUOT_QUA_SO_CA_TOI_DA',
          message: `Không thể phân công ca "${caTen}": Nhân viên "${nvTen}" đã có đủ 3 ca trong ngày ${item.ngayLam} (ca đã có: ${existingShiftNames}). Hệ thống không cho phép vượt quá 3 ca/ngày.`,
        });
      }

      // 3. Tạo mới ca làm việc hợp lệ
      const newLich = this.lichLamViecRepo.create({
        nhanVienId: item.nhanVienId,
        caLamViecId: item.caLamViecId,
        ngayLam: item.ngayLam,
        ghiChu: item.ghiChu || null,
      });
      const savedLich = await this.lichLamViecRepo.save(newLich);

      if (nv?.nguoiDungId) {
        await this.thongBaoService.taoThongBao({
          nguoiNhanId: nv.nguoiDungId,
          tieuDe: `Phân ca làm việc mới: ${caTen}`,
          noiDung: `Ban Giám Đốc vừa xếp lịch trực [${caTen}] cho bạn vào ngày ${item.ngayLam}.`,
          loai: 'phan_ca',
          doiTuongBang: 'lich_lam_viec',
          doiTuongId: savedLich.id,
        }).catch(() => {});
      }
    }

    return {
      success: true,
      message: 'Lưu phân ca lịch làm việc thành công!',
    };
  }

  /**
   * Giám đốc cấu hình khung tư vấn online trên ca trực của bác sĩ (tu/den null = cả ca khám trực tiếp).
   * Không cho đổi nếu lịch hẹn đã đặt sẽ nằm sai khung — hệ thống không tự dời lịch của bệnh nhân.
   */
  async capNhatKhungOnline(body: { ids: number[]; onlineTu?: string | null; onlineDen?: string | null }) {
    const ids = [...new Set((body?.ids || []).map(Number).filter((x) => x > 0))];
    if (!ids.length) throw new BadRequestException('Chưa chọn ca trực cần cấu hình');
    const tu = body.onlineTu ? String(body.onlineTu).slice(0, 5) : null;
    const den = body.onlineDen ? String(body.onlineDen).slice(0, 5) : null;
    if (!tu !== !den || (tu && tu >= den)) {
      throw new BadRequestException({ code: 'KHUNG_ONLINE_KHONG_HOP_LE', message: 'Giờ bắt đầu khung online phải trước giờ kết thúc.' });
    }

    const dsCa = await this.lichLamViecRepo.find({ where: { id: In(ids) }, relations: ['caLamViec', 'nhanVien'] });
    if (dsCa.length !== ids.length) throw new NotFoundException('Không tìm thấy ca trực cần cấu hình');

    const homNay = toDateOnly(new Date());
    const minNgayDatOnline = await layMinNgayDatOnline(this.lichHenRepo.manager);
    const khungMoi = { onlineTu: tu, onlineDen: den };
    const loi: string[] = [];
    const bacSiNhanTin = new Map<number, number>();

    for (const ca of dsCa) {
      const ngay = toDateOnly(ca.ngayLam);
      const batDau = (ca.caLamViec?.gioBatDau || '00:00').slice(0, 5);
      const ketThuc = (ca.caLamViec?.gioKetThuc || '23:59').slice(0, 5);
      const ten = `${ca.nhanVien?.hoTen} – ${ca.caLamViec?.tenCa} ${ngay}`;

      const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: ca.nhanVienId } });
      if (!bs) { loi.push(`${ten}: không phải bác sĩ, không có khung online.`); continue; }
      if (ngay < homNay) { loi.push(`${ten}: ca trực đã qua, không thể thay đổi.`); continue; }
      if (tu && (tu < batDau || den > ketThuc)) { loi.push(`${ten}: khung online phải nằm trong giờ ca ${batDau}–${ketThuc}.`); continue; }

      const lichHen = await this.lichHenRepo.find({
        where: { bacSiId: bs.id, ngayHen: ngay, trangThai: Not(In([TrangThaiLichHen.DA_HUY, TrangThaiLichHen.HOAN_THANH])) },
        select: ['maLichHen', 'gioHen', 'hinhThuc'],
      });
      const moKhungOnline = moKhungOnlineChoTrucTiep(ngay, minNgayDatOnline);
      const saiKhung = lichHen.filter((lh) => {
        const gio = (lh.gioHen || '').slice(0, 5);
        return gio >= batDau && gio < ketThuc && !slotHopHinhThuc(gio, [khungMoi], lh.hinhThuc, moKhungOnline);
      });
      if (saiKhung.length) {
        const ds = saiKhung.map((lh) => `${lh.maLichHen} (${lh.gioHen.slice(0, 5)}, ${lh.hinhThuc === 'truc_tuyen' ? 'online' : 'trực tiếp'})`).join(', ');
        loi.push(`${ten}: lịch hẹn ${ds} sẽ nằm sai khung. Vui lòng đổi lịch các ca này trước.`);
        continue;
      }
      if (ca.nhanVien?.nguoiDungId) bacSiNhanTin.set(ca.nhanVien.nguoiDungId, ca.id);
    }
    if (loi.length) throw new ConflictException({ code: 'KHUNG_ONLINE_XUNG_DOT', message: loi.join('\n') });

    await this.lichLamViecRepo.update({ id: In(ids) }, { onlineTu: tu && `${tu}:00`, onlineDen: den && `${den}:00` });

    const moTa = tu ? `khung tư vấn online ${tu}–${den}` : 'bỏ khung tư vấn online (cả ca khám trực tiếp)';
    for (const [nguoiNhanId, caId] of bacSiNhanTin) {
      await this.thongBaoService.taoThongBao({
        nguoiNhanId,
        tieuDe: 'Cập nhật khung tư vấn online',
        noiDung: `Ban Giám Đốc vừa cập nhật ca trực của bạn: ${moTa}.`,
        loai: 'phan_ca',
        doiTuongBang: 'lich_lam_viec',
        doiTuongId: caId,
      }).catch(() => {});
    }
    return { success: true, message: `Đã cập nhật ${moTa} cho ${ids.length} ca trực.` };
  }

  async xoaLichPhanCa(id: number) {
    const shift = await this.lichLamViecRepo.findOne({
      where: { id },
      relations: ['caLamViec', 'nhanVien'],
    });
    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca trực cần xóa');
    }

    // Chốt chặn ERP Y Tế: Kiểm tra nếu ca trực là của Bác sĩ đang có bệnh nhân đặt lịch hẹn hoặc đang chờ khám
    const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: shift.nhanVienId } });
    if (bs && shift.ngayLam) {
      const ngayStr =
        typeof shift.ngayLam === 'string'
          ? shift.ngayLam.slice(0, 10)
          : new Date(shift.ngayLam).toISOString().slice(0, 10);

      // Xác định khung giờ ca trực (Ca sáng < 12:30, Ca chiều >= 12:30)
      const tenCa = (shift.caLamViec?.tenCa || '').toLowerCase();
      const gioBatDau = shift.caLamViec?.gioBatDau || '07:00:00';
      const isMorningShift = tenCa.includes('sáng') || gioBatDau < '12:00:00';
      const isAfternoonShift = tenCa.includes('chiều') || (gioBatDau >= '12:00:00' && gioBatDau < '17:30:00');

      let timeCondition = '';
      if (isMorningShift && !isAfternoonShift) {
        timeCondition = ` AND gio_hen < '12:30:00'`;
      } else if (isAfternoonShift && !isMorningShift) {
        timeCondition = ` AND gio_hen >= '12:30:00'`;
      }

      const activeAppointments: any[] = await this.lichHenRepo.query(
        `SELECT COUNT(*) AS cnt FROM lich_hen
         WHERE bac_si_id = ?
           AND DATE(ngay_hen) = ?
           AND trang_thai IN ('cho_thanh_toan', 'cho_xac_nhan', 'da_xac_nhan', 'da_den')
           ${timeCondition}`,
        [bs.id, ngayStr],
      );
      const soLichHen = Number(activeAppointments?.[0]?.cnt || 0);

      const activeQueue: any[] = await this.tiepNhanRepo.query(
        `SELECT COUNT(*) AS cnt FROM luot_tiep_nhan
         WHERE bac_si_id = ?
           AND DATE(thoi_gian_den) = ?
           AND trang_thai IN ('cho_kham', 'dang_kham', 'dang_cls', 'da_co_kq_cls')`,
        [bs.id, ngayStr],
      );
      const soDangKham = Number(activeQueue?.[0]?.cnt || 0);

      if (soLichHen > 0 || soDangKham > 0) {
        throw new BadRequestException({
          code: 'CA_TRUC_CO_BENH_NHAN_DAT_HEN',
          message: `Không thể xóa ca trực của BS. ${shift.nhanVien?.hoTen || ''} ngày ${ngayStr} vì đang có ${soLichHen} lịch hẹn đặt trước và ${soDangKham} lượt bệnh nhân chờ/đang khám! Vui lòng điều phối chuyển bác sĩ cho bệnh nhân trước khi hủy ca trực.`,
        });
      }
    }

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

    // 4. Bảo toàn các ca trực của bác sĩ đã có bệnh nhân đặt lịch hẹn trước trong tuần này (Chốt chặn ERP Y Tế)
    const bookedDoctorShifts: any[] = await this.lichHenRepo.query(
      `SELECT DISTINCT bs.nhan_vien_id AS nhanVienId,
              DATE_FORMAT(lh.ngay_hen, '%Y-%m-%d') AS ngayLam,
              CASE WHEN lh.gio_hen < '12:30:00' THEN 1 ELSE 2 END AS caLamViecId
       FROM lich_hen lh
       JOIN bac_si bs ON bs.id = lh.bac_si_id
       WHERE DATE(lh.ngay_hen) >= ? AND DATE(lh.ngay_hen) <= ?
         AND lh.trang_thai IN ('cho_thanh_toan', 'cho_xac_nhan', 'da_xac_nhan', 'da_den')`,
      [weekDays[0], weekEnd],
    );
    for (const bShift of bookedDoctorShifts) {
      newShifts.push({
        nhanVienId: Number(bShift.nhanVienId),
        caLamViecId: Number(bShift.caLamViecId),
        ngayLam: String(bShift.ngayLam),
        ghiChu: 'Bảo toàn ca trực đã có bệnh nhân đặt lịch hẹn',
      });
    }

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
    // 1. Phân loại tài khoản người dùng
    const totalUsers = await this.nguoiDungRepo.count();
    const activeUsers = await this.nguoiDungRepo.count({ where: { trangThai: TrangThaiNguoiDung.HOAT_DONG } });
    const lockedUsers = await this.nguoiDungRepo.count({ where: { trangThai: TrangThaiNguoiDung.KHOA } });

    // Tách biệt nhân sự nội bộ vs bệnh nhân trực tuyến
    const staffUsers = await this.nguoiDungRepo.createQueryBuilder('nd')
      .innerJoin('nd.vaiTro', 'vt')
      .where("vt.ma_vai_tro != 'benh_nhan'")
      .getCount();
    const patientUsers = totalUsers - staffUsers;

    // 2. Phân bổ theo 8 vai trò hệ thống
    const rolesDistribution = await this.nguoiDungRepo.createQueryBuilder('nd')
      .innerJoin('nd.vaiTro', 'vt')
      .select('vt.tenVaiTro', 'tenVaiTro')
      .addSelect('vt.maVaiTro', 'maVaiTro')
      .addSelect('COUNT(nd.id)', 'soLuong')
      .groupBy('vt.id')
      .getRawMany();

    // 3. Cơ sở dữ liệu & Dung lượng
    let dbInfo = { totalTables: 0, totalRows: 0, totalSizeMB: '0.00' };
    try {
      const tables: any[] = await this.nguoiDungRepo.query(`
        SELECT 
          COUNT(*) as tableCount,
          SUM(table_rows) as totalRows,
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as totalSizeMB
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `);
      if (tables && tables[0]) {
        dbInfo = {
          totalTables: Number(tables[0].tableCount || 0),
          totalRows: Number(tables[0].totalRows || 0),
          totalSizeMB: (Number(tables[0].totalSizeMB || 0)).toFixed(2),
        };
      }
    } catch (e) {
      // Fallback
    }

    // 4. Kiểm toán an ninh & Nhật ký hệ thống
    const today = new Date().toISOString().slice(0, 10);
    const todayLogsCount = await this.nhatKyRepo.createQueryBuilder('nk')
      .where('DATE(nk.thoiGian) = :today', { today })
      .getCount();
    const errorLogsCount = await this.nhatKyRepo.createQueryBuilder('nk')
      .where('DATE(nk.thoiGian) = :today AND nk.loaiNhatKy = :err', { today, err: LoaiNhatKy.ERROR })
      .getCount();
    const warnLogsCount = await this.nhatKyRepo.createQueryBuilder('nk')
      .where('DATE(nk.thoiGian) = :today AND nk.loaiNhatKy = :warn', { today, warn: LoaiNhatKy.WARNING })
      .getCount();

    const recentLogs = await this.nhatKyRepo.find({
      order: { thoiGian: 'DESC' },
      take: 6,
    });

    // 5. Danh sách tài khoản tạo gần nhất
    const recentUsers = await this.nguoiDungRepo.find({
      relations: ['vaiTro'],
      order: { taoLuc: 'DESC' },
      take: 6,
    });

    const mem = process.memoryUsage();
    const uptimeHours = (process.uptime() / 3600).toFixed(1);

    // 6. Danh mục giám sát dịch vụ cốt lõi (Service Health Monitor)
    const services = [
      {
        id: 'api',
        name: 'NestJS REST API Core',
        type: 'Ứng dụng chính',
        status: 'online',
        badge: 'Port 5000 · HTTP/JSON',
        details: `Node.js ${process.version} · Platform ${process.platform}`,
      },
      {
        id: 'database',
        name: 'Cơ Sở Dữ Liệu MySQL',
        type: 'Lưu trữ CSDL',
        status: 'online',
        badge: 'Port 3306 · InnoDB UTF8MB4',
        details: `${dbInfo.totalTables} bảng · ${dbInfo.totalSizeMB} MB dung lượng`,
      },
      {
        id: 'websocket',
        name: 'WebSocket Realtime Gateway',
        type: 'Thời gian thực',
        status: 'online',
        badge: 'Socket.io Server (5000)',
        details: 'Phát sóng hàng đợi, màn hình TV, Kiosk & Chatbot',
      },
      {
        id: 'ai',
        name: 'Google Gemini 2.5 Flash Gateway',
        type: 'Trí tuệ nhân tạo',
        status: 'online',
        badge: 'gemini-2.5-flash',
        details: 'Phân luồng khám bệnh (AI Triage) & Trợ lý bệnh nhân',
      },
      {
        id: 'payment',
        name: 'Cổng Thanh Toán Trực Tuyến PayOS',
        type: 'Thanh toán & Cọc',
        status: 'online',
        badge: 'PayOS API Connected',
        details: 'Tạo link thanh toán QR & đồng bộ trạng thái cọc khám',
      },
      {
        id: 'email',
        name: 'Dịch Vụ Gửi Thư Điện Tử (SMTP)',
        type: 'Thông báo & OTP',
        status: 'online',
        badge: 'Gmail SMTP Port 587',
        details: 'Gửi mã OTP xác thực, xác nhận lịch hẹn & hóa đơn',
      },
    ];

    return {
      accounts: {
        total: totalUsers,
        staffTotal: staffUsers,
        patientTotal: patientUsers,
        active: activeUsers,
        locked: lockedUsers,
      },
      database: {
        dbName: 'phong_kham',
        totalTables: dbInfo.totalTables,
        totalRows: dbInfo.totalRows,
        totalSizeMB: dbInfo.totalSizeMB,
        status: 'MySQL 3306 (utf8mb4 - Hoạt động)',
      },
      services,
      auditStats: {
        todayTotal: todayLogsCount,
        todayError: errorLogsCount,
        todayWarn: warnLogsCount,
        todayInfo: todayLogsCount - errorLogsCount - warnLogsCount,
        recentLogs: recentLogs.map(l => ({
          id: l.id,
          tenNguoiDung: l.tenNguoiDung,
          vaiTro: l.vaiTro,
          hanhDong: l.hanhDong,
          loaiNhatKy: l.loaiNhatKy,
          moTa: l.moTa,
          diaChiIp: l.diaChiIp,
          thoiGian: l.thoiGian,
        })),
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
        aiServiceStatus: 'Hoạt động (gemini-2.5-flash)',
        socketStatus: 'Hoạt động (Socket.io Port 5000)',
      },
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        tenDangNhap: u.tenDangNhap,
        vaiTro: u.vaiTro?.tenVaiTro || 'Chưa gán',
        maVaiTro: u.vaiTro?.maVaiTro,
        trangThai: u.trangThai,
        taoLuc: u.taoLuc,
      })),
    };
  }

  // ─── ADMIN: DANH MỤC DÙNG CHUNG (MASTER DATA) ─────────────────
  async getDanhMucTongHop() {
    const phongBans = await this.nguoiDungRepo.query(`
      SELECT pb.id, pb.ten_phong_ban, pb.mo_ta,
             (SELECT COUNT(*) FROM nhan_vien nv WHERE nv.phong_ban_id = pb.id) AS so_nhan_su,
             (SELECT COUNT(*) FROM phong_kham pk WHERE pk.phong_ban_id = pb.id) AS so_phong_kham
      FROM phong_ban pb
      ORDER BY pb.id ASC
    `);

    const phongKhams = await this.nguoiDungRepo.query(`
      SELECT pk.id, pk.ten_phong, pk.vi_tri, pk.chuyen_khoa, pk.trang_thai, pk.phong_ban_id,
             pb.ten_phong_ban
      FROM phong_kham pk
      LEFT JOIN phong_ban pb ON pb.id = pk.phong_ban_id
      ORDER BY pk.id ASC
    `);

    return {
      phongBans,
      phongKhams,
    };
  }

  async taoPhongBan(dto: { tenPhongBan: string; moTa?: string }, userId?: number) {
    if (!dto.tenPhongBan?.trim()) {
      throw new BadRequestException('Tên khoa / phòng ban không được để trống');
    }
    await this.nguoiDungRepo.query(
      'INSERT INTO phong_ban (ten_phong_ban, mo_ta, tao_luc) VALUES (?, ?, NOW())',
      [dto.tenPhongBan.trim(), dto.moTa?.trim() || null],
    );
    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'THEM_PHONG_BAN',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Thêm mới khoa / phòng ban: "${dto.tenPhongBan.trim()}"`,
    });
    return { message: 'Thêm khoa / phòng ban thành công' };
  }

  async capNhatPhongBan(id: number, dto: { tenPhongBan: string; moTa?: string }, userId?: number) {
    if (!dto.tenPhongBan?.trim()) {
      throw new BadRequestException('Tên khoa / phòng ban không được để trống');
    }
    const [existing] = await this.nguoiDungRepo.query('SELECT id, ten_phong_ban FROM phong_ban WHERE id = ?', [id]);
    if (!existing) throw new NotFoundException('Không tìm thấy khoa / phòng ban');

    await this.nguoiDungRepo.query(
      'UPDATE phong_ban SET ten_phong_ban = ?, mo_ta = ? WHERE id = ?',
      [dto.tenPhongBan.trim(), dto.moTa?.trim() || null, id],
    );
    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'CAP_NHAT_PHONG_BAN',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Cập nhật khoa / phòng ban: "${dto.tenPhongBan.trim()}"`,
    });
    return { message: 'Cập nhật khoa / phòng ban thành công' };
  }

  async xoaPhongBan(id: number, userId?: number) {
    const [existing] = await this.nguoiDungRepo.query('SELECT id, ten_phong_ban FROM phong_ban WHERE id = ?', [id]);
    if (!existing) throw new NotFoundException('Không tìm thấy khoa / phòng ban');

    const [{ cntNV }] = await this.nguoiDungRepo.query('SELECT COUNT(*) AS cntNV FROM nhan_vien WHERE phong_ban_id = ?', [id]);
    const [{ cntPK }] = await this.nguoiDungRepo.query('SELECT COUNT(*) AS cntPK FROM phong_kham WHERE phong_ban_id = ?', [id]);

    if (Number(cntNV) > 0 || Number(cntPK) > 0) {
      throw new BadRequestException(`Không thể xóa "${existing.ten_phong_ban}" vì đang có ${cntNV} nhân sự và ${cntPK} phòng khám trực thuộc. Vui lòng điều chuyển trước.`);
    }

    await this.nguoiDungRepo.query('DELETE FROM phong_ban WHERE id = ?', [id]);
    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'XOA_PHONG_BAN',
      loaiNhatKy: LoaiNhatKy.WARNING,
      moTa: `Xóa khoa / phòng ban: "${existing.ten_phong_ban}" (ID: ${id})`,
    });
    return { message: 'Đã xóa khoa / phòng ban thành công' };
  }

  async taoPhongKham(dto: { tenPhong: string; viTri?: string; chuyenKhoa?: string; trangThai?: string; phongBanId?: number }, userId?: number) {
    if (!dto.tenPhong?.trim()) {
      throw new BadRequestException('Tên phòng khám không được để trống');
    }
    const status = dto.trangThai || 'hoat_dong';
    await this.nguoiDungRepo.query(
      'INSERT INTO phong_kham (ten_phong, vi_tri, chuyen_khoa, trang_thai, phong_ban_id) VALUES (?, ?, ?, ?, ?)',
      [dto.tenPhong.trim(), dto.viTri?.trim() || null, dto.chuyenKhoa?.trim() || null, status, dto.phongBanId || null],
    );
    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'THEM_PHONG_KHAM',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Thêm mới phòng khám: "${dto.tenPhong.trim()}" (${dto.chuyenKhoa || 'Chuyên khoa'})`,
    });
    return { message: 'Thêm phòng khám thành công' };
  }

  async capNhatPhongKham(id: number, dto: { tenPhong: string; viTri?: string; chuyenKhoa?: string; trangThai?: string; phongBanId?: number }, userId?: number) {
    if (!dto.tenPhong?.trim()) {
      throw new BadRequestException('Tên phòng khám không được để trống');
    }
    const [existing] = await this.nguoiDungRepo.query('SELECT id, ten_phong FROM phong_kham WHERE id = ?', [id]);
    if (!existing) throw new NotFoundException('Không tìm thấy phòng khám');

    await this.nguoiDungRepo.query(
      'UPDATE phong_kham SET ten_phong = ?, vi_tri = ?, chuyen_khoa = ?, trang_thai = ?, phong_ban_id = ? WHERE id = ?',
      [dto.tenPhong.trim(), dto.viTri?.trim() || null, dto.chuyenKhoa?.trim() || null, dto.trangThai || 'hoat_dong', dto.phongBanId || null, id],
    );
    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'CAP_NHAT_PHONG_KHAM',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Cập nhật phòng khám: "${dto.tenPhong.trim()}" (ID: ${id})`,
    });
    return { message: 'Cập nhật phòng khám thành công' };
  }

  async doiTrangThaiPhongKham(id: number, trangThai: string, userId?: number) {
    const [existing] = await this.nguoiDungRepo.query('SELECT id, ten_phong FROM phong_kham WHERE id = ?', [id]);
    if (!existing) throw new NotFoundException('Không tìm thấy phòng khám');

    await this.nguoiDungRepo.query('UPDATE phong_kham SET trang_thai = ? WHERE id = ?', [trangThai, id]);
    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'DOI_TRANG_THAI_PHONG_KHAM',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Đổi trạng thái phòng khám "${existing.ten_phong}" thành "${trangThai}"`,
    });
    return { message: 'Đổi trạng thái phòng khám thành công' };
  }

  async xoaPhongKham(id: number, userId?: number) {
    const [existing] = await this.nguoiDungRepo.query('SELECT id, ten_phong FROM phong_kham WHERE id = ?', [id]);
    if (!existing) throw new NotFoundException('Không tìm thấy phòng khám');

    const [{ cntLH }] = await this.nguoiDungRepo.query('SELECT COUNT(*) AS cntLH FROM lich_hen WHERE phong_kham_id = ?', [id]);
    const [{ cntTN }] = await this.nguoiDungRepo.query('SELECT COUNT(*) AS cntTN FROM luot_tiep_nhan WHERE phong_kham_id = ?', [id]);

    if (Number(cntLH) > 0 || Number(cntTN) > 0) {
      await this.nguoiDungRepo.query('UPDATE phong_kham SET trang_thai = "dong_cua" WHERE id = ?', [id]);
      return {
        message: `Phòng khám "${existing.ten_phong}" đã có lịch sử khám (${cntLH} lịch hẹn, ${cntTN} lượt tiếp nhận). Hệ thống đã chuyển trạng thái sang "Đóng cửa" để bảo toàn lịch sử y tế.`,
      };
    }

    await this.nguoiDungRepo.query('DELETE FROM phong_kham WHERE id = ?', [id]);
    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'XOA_PHONG_KHAM',
      loaiNhatKy: LoaiNhatKy.WARNING,
      moTa: `Xóa phòng khám: "${existing.ten_phong}" (ID: ${id})`,
    });
    return { message: 'Đã xóa phòng khám thành công' };
  }

  // ─── ADMIN: THÔNG TIN BỆNH VIỆN & CƠ SỞ Y TẾ ──────────────────
  async getThongTinBenhVien() {
    const defaultData = {
      tenBenhVien: 'PHÒNG KHÁM ĐA KHOA',
      slogan: 'TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO',
      moTa: 'Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt của Bộ Y Tế.',
      soGiayPhep: 'Giấy phép hoạt động số 08922/BYT-GPHĐ',
      diaChi: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
      tongDai: '1900 8888',
      gioLamViec: '07:00 – 20:00 (Thứ 2 - CN)',
      email: 'hotro@phongkhamdakhoa.vn',
      tieuDeCapCuu: 'CẤP CỨU 24/24',
      hotlineCapCuu: '1900 8888',
      khauHieuCapCuu: 'Luôn sẵn sàng tiếp nhận & xử trí y tế',
      dichVuNoiBat: [
        'Khám bệnh Nội tổng quát & Tim mạch',
        'Khám Tai Mũi Họng & Nội soi',
        'Khám Nhi khoa & Dinh dưỡng',
        'Chẩn đoán hình ảnh & Xét nghiệm Laser',
        'Khám tư vấn từ xa (Telehealth)',
      ],
      banQuyen: '© 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa. Bản quyền thuộc về Phòng Khám Đa Khoa.',
      chinhSachBaoMat: {
        tieuDeTrang: 'Chính Sách Bảo Mật & Bảo Vệ Dữ Liệu Y Tế Cá Nhân',
        ngayCapNhat: '05/11/2026',
        nhanHero: 'QUY CHUẨN AN TOÀN & BẢO VỆ DỮ LIỆU Y TẾ',
        tieuDeMucLienHe: 'Đơn Vị Phụ Trách & Tiếp Nhận Yêu Cầu Dữ Liệu Cá Nhân',
        moTaMucLienHe: 'Mọi thắc mắc, phản ánh liên quan đến chính sách bảo mật hoặc yêu cầu thực thi quyền của chủ thể dữ liệu (trích xuất sao y bệnh án, khiếu nại, cải chính thông tin), xin vui lòng liên hệ:',
        hoTroTieuDe: 'Hỗ Trợ Quyền Riêng Tư 24/7',
        hoTroMoTa: 'Người bệnh có quyền gửi yêu cầu giải trình, cập nhật hoặc thu hồi dữ liệu bất cứ lúc nào.',
        moTaMoDau: 'Phòng khám cam kết bảo vệ tuyệt đối thông tin sức khỏe, hồ sơ bệnh án điện tử (EMR) và quyền riêng tư của mọi bệnh nhân theo chuẩn Nghị định 13/2023/NĐ-CP và Luật Khám bệnh, chữa bệnh.',
        tieuChuanTuanThu: [
          'Nghị định 13/2023/NĐ-CP',
          'Luật Khám bệnh, chữa bệnh 2023',
          'Thông tư 54/2017/TT-BYT',
          'Mã hóa AES-256 & TLS 1.3',
        ],
        camKetCotLoi: [
          {
            tieuDe: 'Bảo mật Bệnh án Điện tử (EMR)',
            moTa: 'Dữ liệu chẩn đoán, toa thuốc và cận lâm sàng được lưu trữ phân quyền nghiêm ngặt theo đúng mã định danh y tế.',
          },
          {
            tieuDe: 'Không chia sẻ thương mại',
            moTa: 'Cam kết không cung cấp, mua bán hoặc tiết lộ thông tin bệnh nhân cho bất kỳ bên thứ ba vì mục đích tiếp thị.',
          },
          {
            tieuDe: 'Quyền làm chủ dữ liệu',
            moTa: 'Người bệnh có quyền tra cứu, trích xuất lịch sử khám bệnh hoặc yêu cầu cập nhật, thu hồi thông tin theo luật định.',
          },
        ],
        danhSachDieuKhoan: [
          {
            id: 'muc-dich-thu-thap',
            tieuDe: '1. Mục đích và Phạm vi Thu thập Dữ liệu',
            noiDung: 'Chúng tôi chỉ thu thập các dữ liệu cần thiết phục vụ trực tiếp cho công tác khám chữa bệnh, chăm sóc sức khỏe và quản lý tài chính y tế hợp pháp.',
            danhSachChiTiet: [
              'Họ và tên, ngày sinh, giới tính, số CCCD/Định danh cá nhân, số thẻ BHYT.',
              'Số điện thoại liên hệ, địa chỉ cư trú, thông tin thân nhân trong trường hợp khẩn cấp.',
              'Tiền sử bệnh lý, tiền sử dị ứng thuốc, triệu chứng lâm sàng và chỉ số sinh tồn.',
              'Kết quả chẩn đoán hình ảnh, xét nghiệm cận lâm sàng, hồ sơ toa thuốc và lịch sử phẫu thuật/thủ thuật.',
            ],
          },
          {
            id: 'pham-vi-su-dung',
            tieuDe: '2. Phạm vi Sử dụng Thông tin',
            noiDung: 'Thông tin cá nhân và dữ liệu y tế chỉ được sử dụng trong phạm vi quy định nhằm mang lại trải nghiệm khám chữa bệnh an toàn nhất.',
            danhSachChiTiet: [
              'Chỉ định chẩn đoán, kê đơn thuốc và theo dõi tiến trình hồi phục của bệnh nhân.',
              'Xác nhận lịch hẹn khám, nhắc lịch tái khám và gửi kết quả cận lâm sàng qua kênh liên lạc được người bệnh chấp thuận.',
              'Thực hiện giám định chi phí khám chữa bệnh BHYT và nghĩa vụ báo cáo y tế thống kê theo quy định của Bộ Y Tế.',
              'Phục vụ nghiên cứu khoa học y tế khi và chỉ khi dữ liệu đã được mã hóa, khử định danh hoàn toàn (anonymized).',
            ],
          },
          {
            id: 'an-toan-bao-mat',
            tieuDe: '3. Biện pháp An toàn và Bảo vệ Kỹ thuật',
            noiDung: 'Hệ thống ERP y tế áp dụng kiến trúc an toàn thông tin đa lớp nhằm phòng chống truy cập trái phép, rò rỉ hay mất mát dữ liệu.',
            danhSachChiTiet: [
              'Toàn bộ dữ liệu truyền tải giữa trình duyệt, Kiosk và máy chủ được mã hóa qua giao thức HTTPS / TLS 1.3.',
              'Dữ liệu bệnh án lưu trữ trong CSDL được bảo vệ bằng cơ chế phân quyền RBAC và mã hóa cột nhạy cảm.',
              'Mọi thao tác xem, sửa, in phiếu của nhân viên y tế đều được ghi nhật ký hệ thống (Audit Log) chống chối bỏ.',
              'Sao lưu dự phòng tự động định kỳ, cách ly môi trường và kiểm tra rà soát lỗ hổng bảo mật liên tục.',
            ],
          },
          {
            id: 'quyen-cua-nguoi-benh',
            tieuDe: '4. Quyền của Người bệnh đối với Dữ liệu Cá nhân',
            noiDung: 'Theo Nghị định 13/2023/NĐ-CP và Luật Khám bệnh, chữa bệnh, quý người bệnh có toàn quyền đối với dữ liệu cá nhân của mình.',
            danhSachChiTiet: [
              'Quyền được biết rõ loại dữ liệu y tế được thu thập và cách thức xử lý.',
              'Quyền tra cứu, trích xuất tóm tắt hồ sơ bệnh án hoặc tải kết quả xét nghiệm qua tài khoản cá nhân.',
              'Quyền yêu cầu chỉnh sửa thông tin hành chính khi có sự sai lệch hoặc cập nhật.',
              'Quyền khiếu nại, phản ánh hoặc yêu cầu tạm ngưng nhận thông báo tiếp thị, chăm sóc qua tin nhắn/email.',
            ],
          },
          {
            id: 'thoi-gian-luu-tru',
            tieuDe: '5. Thời hạn Lưu trữ Hồ sơ Y tế',
            noiDung: 'Thời hạn lưu trữ hồ sơ bệnh án được thực hiện nghiêm ngặt theo Điều 69 Luật Khám bệnh, chữa bệnh 2023 và quy định của Bộ Y Tế (tối thiểu 10 năm đối với bệnh án ngoại trú, 20 năm đối với nội trú/tai nạn và lưu vĩnh viễn theo chỉ định pháp luật đặc biệt). Sau thời hạn luật định, dữ liệu được hủy hoặc khử định danh theo quy trình tiêu hủy an toàn.',
          },
        ],
        thongTinLienHeBaoMat: {
          donViPhuTrach: 'Ban Bảo Vệ Dữ Liệu Cá Nhân & Phòng Công Nghệ Thông Tin',
          email: 'dpo@phongkhamdakhoa.vn',
          hotline: '1900 8888 (Nhánh 4)',
          diaChiTiepNhan: 'Phòng Tiếp Dân & Pháp Chế Y Tế - Tầng 1, Khu A',
        },
      },
    };

    const rows = await this.nguoiDungRepo.query(
      'SELECT gia_tri FROM cai_dat_he_thong WHERE khoa_cai_dat = "THONG_TIN_BENH_VIEN" LIMIT 1',
    );
    if (!rows || rows.length === 0 || !rows[0].gia_tri) {
      return defaultData;
    }
    const val = typeof rows[0].gia_tri === 'string' ? JSON.parse(rows[0].gia_tri) : rows[0].gia_tri;
    return {
      ...defaultData,
      ...val,
      chinhSachBaoMat: {
        ...defaultData.chinhSachBaoMat,
        ...(val?.chinhSachBaoMat || {}),
      },
    };
  }

  async capNhatThongTinBenhVien(dto: any, userId?: number) {
    const existing = await this.nguoiDungRepo.query(
      'SELECT id FROM cai_dat_he_thong WHERE khoa_cai_dat = "THONG_TIN_BENH_VIEN" LIMIT 1',
    );
    const jsonStr = JSON.stringify(dto);
    if (existing && existing.length > 0) {
      await this.nguoiDungRepo.query(
        'UPDATE cai_dat_he_thong SET gia_tri = ?, cap_nhat_luc = NOW() WHERE khoa_cai_dat = "THONG_TIN_BENH_VIEN"',
        [jsonStr],
      );
    } else {
      await this.nguoiDungRepo.query(
        'INSERT INTO cai_dat_he_thong (khoa_cai_dat, gia_tri, ghi_chu, cap_nhat_luc) VALUES ("THONG_TIN_BENH_VIEN", ?, "Thông tin bệnh viện & liên hệ", NOW())',
        [jsonStr],
      );
    }

    // Invalidate cache if exists
    try {
      this.cache.del('thong_tin_benh_vien');
    } catch (_) {}

    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'CAP_NHAT_THONG_TIN_BENH_VIEN',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Cập nhật thông tin bệnh viện / chính sách bảo mật: "${dto.tenBenhVien || 'Phòng khám'}"`,
    });

    return {
      message: 'Cập nhật thông tin bệnh viện thành công',
      data: dto,
    };
  }

  // ─── ADMIN: DANH MỤC CHUYÊN KHOA Y TẾ CHUẨN ───────────────────
  async getDanhMucChuyenKhoa() {
    const defaultData = [
      { id: 'noi_tong_quat', ma: 'CK_NTQ', ten: 'Nội Tổng Quát', moTa: 'Tiếp nhận, khám và điều trị các bệnh lý nội khoa người lớn', trangThai: 'hoat_dong', icon: 'Stethoscope' },
      { id: 'nhi_khoa', ma: 'CK_NK', ten: 'Nhi Khoa', moTa: 'Khám chữa bệnh, tư vấn dinh dưỡng và chăm sóc sức khỏe trẻ em', trangThai: 'hoat_dong', icon: 'Baby' },
      { id: 'tim_mach', ma: 'CK_TM', ten: 'Tim Mạch', moTa: 'Chẩn đoán, điều trị tăng huyết áp, rối loạn nhịp tim và bệnh mạch vành', trangThai: 'hoat_dong', icon: 'HeartPulse' },
      { id: 'tai_mui_hong', ma: 'CK_TMH', ten: 'Tai Mũi Họng', moTa: 'Khám và nội soi điều trị viêm họng, viêm amidan, xoang mũi', trangThai: 'hoat_dong', icon: 'Ear' },
      { id: 'da_lieu', ma: 'CK_DL', ten: 'Da Liễu', moTa: 'Khám và chăm sóc điều trị các bệnh da mạn tính, dị ứng và thẩm mỹ', trangThai: 'hoat_dong', icon: 'Sparkles' },
      { id: 'san_phu_khoa', ma: 'CK_SPK', ten: 'Sản Phụ Khoa', moTa: 'Chăm sóc sức khỏe phụ nữ, khám thai kỳ và phụ khoa định kỳ', trangThai: 'hoat_dong', icon: 'HeartHandshake' },
      { id: 'can_lam_sang', ma: 'CK_CLS', ten: 'Cận Lâm Sàng & Xét Nghiệm', moTa: 'Chẩn đoán hình ảnh X-Quang, siêu âm và phân tích sinh hóa y khoa', trangThai: 'hoat_dong', icon: 'FlaskConical' },
    ];

    const rows = await this.nguoiDungRepo.query(
      'SELECT gia_tri FROM cai_dat_he_thong WHERE khoa_cai_dat = "DANH_MUC_CHUYEN_KHOA" LIMIT 1',
    );
    if (!rows || rows.length === 0 || !rows[0].gia_tri) {
      return defaultData;
    }
    const val = typeof rows[0].gia_tri === 'string' ? JSON.parse(rows[0].gia_tri) : rows[0].gia_tri;
    return Array.isArray(val) && val.length > 0 ? val : defaultData;
  }

  async capNhatDanhMucChuyenKhoa(danhSach: any[], userId?: number) {
    if (!Array.isArray(danhSach)) {
      throw new BadRequestException('Dữ liệu danh mục chuyên khoa phải là mảng hợp lệ');
    }
    const existing = await this.nguoiDungRepo.query(
      'SELECT id FROM cai_dat_he_thong WHERE khoa_cai_dat = "DANH_MUC_CHUYEN_KHOA" LIMIT 1',
    );
    const jsonStr = JSON.stringify(danhSach);
    if (existing && existing.length > 0) {
      await this.nguoiDungRepo.query(
        'UPDATE cai_dat_he_thong SET gia_tri = ?, cap_nhat_luc = NOW() WHERE khoa_cai_dat = "DANH_MUC_CHUYEN_KHOA"',
        [jsonStr],
      );
    } else {
      await this.nguoiDungRepo.query(
        'INSERT INTO cai_dat_he_thong (khoa_cai_dat, gia_tri, ghi_chu, cap_nhat_luc) VALUES ("DANH_MUC_CHUYEN_KHOA", ?, "Danh mục chuyên khoa y tế dùng chung", NOW())',
        [jsonStr],
      );
    }

    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'CAP_NHAT_CHUYEN_KHOA',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Cập nhật danh mục chuyên khoa y tế (${danhSach.length} chuyên khoa)`,
    });

    return { message: 'Cập nhật danh mục chuyên khoa y tế thành công', data: danhSach };
  }

  // ─── ADMIN: DANH MỤC DƯỢC & ĐƠN VỊ TÍNH DÙNG CHUNG ─────────────
  async getDanhMucDuoc() {
    const defaultData = {
      donViTinh: ['Viên', 'Vỉ', 'Hộp', 'Chai', 'Lọ', 'Gói', 'Ống', 'Tuýp', 'Bút tiêm', 'Túi dịch truyền', 'Bình xịt'],
      duongDung: ['Uống', 'Tiêm bắp', 'Tiêm tĩnh mạch', 'Bôi ngoài da', 'Nhỏ mắt', 'Nhỏ tai', 'Khí dung', 'Đặt dưới lưỡi', 'Đặt hậu môn'],
      nhomDuocLy: [
        { id: 'khang_sinh', ten: 'Kháng sinh & Kháng khuẩn', moTa: 'Diệt khuẩn, điều trị nhiễm khuẩn đường hô hấp, tiêu hóa, tiết niệu' },
        { id: 'giam_dau_ha_sot', ten: 'Giảm đau & Hạ sốt (NSAID)', moTa: 'Paracetamol, Ibuprofen, chống viêm và giảm đau các thể' },
        { id: 'tim_mach_huyet_ap', ten: 'Tim mạch & Hạ huyết áp', moTa: 'Điều hòa huyết áp, trợ tim, chống đông máu' },
        { id: 'tieu_hoa', ten: 'Tiêu hóa & Dạ dày', moTa: 'Chống loét dạ dày tá tràng, men vi sinh, hỗ trợ tiêu hóa' },
        { id: 'ho_hap_di_ung', ten: 'Hô hấp & Kháng dị ứng', moTa: 'Giảm ho, long đờm, giãn phế quản, kháng histamin' },
        { id: 'vitamin_khoang_chat', ten: 'Vitamin & Khoáng chất', moTa: 'Bổ sung dinh dưỡng, tăng cường sức đề kháng, phục hồi thể lực' },
        { id: 'da_lieu_ngoai_da', ten: 'Thuốc da liễu & bôi ngoài', moTa: 'Sát trùng, kem trị nấm, kháng viêm bôi ngoài da' },
      ],
    };

    const rows = await this.nguoiDungRepo.query(
      'SELECT gia_tri FROM cai_dat_he_thong WHERE khoa_cai_dat = "DANH_MUC_DUOC" LIMIT 1',
    );
    if (!rows || rows.length === 0 || !rows[0].gia_tri) {
      return defaultData;
    }
    const val = typeof rows[0].gia_tri === 'string' ? JSON.parse(rows[0].gia_tri) : rows[0].gia_tri;
    return {
      donViTinh: Array.isArray(val?.donViTinh) && val.donViTinh.length > 0 ? val.donViTinh : defaultData.donViTinh,
      duongDung: Array.isArray(val?.duongDung) && val.duongDung.length > 0 ? val.duongDung : defaultData.duongDung,
      nhomDuocLy: Array.isArray(val?.nhomDuocLy) && val.nhomDuocLy.length > 0 ? val.nhomDuocLy : defaultData.nhomDuocLy,
    };
  }

  async capNhatDanhMucDuoc(dto: any, userId?: number) {
    const existing = await this.nguoiDungRepo.query(
      'SELECT id FROM cai_dat_he_thong WHERE khoa_cai_dat = "DANH_MUC_DUOC" LIMIT 1',
    );
    const jsonStr = JSON.stringify(dto);
    if (existing && existing.length > 0) {
      await this.nguoiDungRepo.query(
        'UPDATE cai_dat_he_thong SET gia_tri = ?, cap_nhat_luc = NOW() WHERE khoa_cai_dat = "DANH_MUC_DUOC"',
        [jsonStr],
      );
    } else {
      await this.nguoiDungRepo.query(
        'INSERT INTO cai_dat_he_thong (khoa_cai_dat, gia_tri, ghi_chu, cap_nhat_luc) VALUES ("DANH_MUC_DUOC", ?, "Danh mục dược, đơn vị tính và nhóm dược lý", NOW())',
        [jsonStr],
      );
    }

    await this.ghiLog({
      nguoiDungId: userId || 1,
      tenNguoiDung: 'admin',
      vaiTro: 'quan_tri_vien_cap_cao',
      hanhDong: 'CAP_NHAT_DANH_MUC_DUOC',
      loaiNhatKy: LoaiNhatKy.INFO,
      moTa: `Cập nhật danh mục dược dùng chung (${dto.donViTinh?.length || 0} ĐVT, ${dto.duongDung?.length || 0} đường dùng)`,
    });

    return { message: 'Cập nhật danh mục dược dùng chung thành công', data: dto };
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

    // 0. Ghi tự động (AuditLogInterceptor): moTa = "<thao tác> · <kết quả> · <METHOD đường dẫn>"
    if (act.startsWith('TT_')) return { chucNang: auditModuleLabel(act), thaoTac: (moTa || '').split(' · ')[0] || act };
    if (act === 'XUAT_FILE') return { chucNang: 'Xuất dữ liệu', thaoTac: (moTa || '').split(' · ')[0] || 'Xuất file' };
    if (act === 'DANG_XUAT') return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Đăng xuất · Auth' };
    if (act === 'DOI_MAT_KHAU') return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Đổi mật khẩu · Tài khoản' };
    if (act === 'QUEN_MAT_KHAU') return { chucNang: 'Xác thực & Bảo mật', thaoTac: 'Quên mật khẩu (gửi OTP) · Tài khoản' };

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
    loaiNguoiDung?: string; // NHAN_VIEN (mặc định) | BENH_NHAN | TAT_CA
  }) {
    await this.seedInitialLogs();

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const qb = this.nhatKyRepo.createQueryBuilder('log')
      .leftJoin('nguoi_dung', 'nd', '(nd.id = log.nguoi_dung_id OR nd.ten_dang_nhap = log.ten_nguoi_dung)')
      .leftJoin('nhan_vien', 'nv', 'nv.nguoi_dung_id = nd.id')
      .leftJoin('benh_nhan', 'bn', 'bn.nguoi_dung_id = nd.id')
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
        'bn.ho_ten AS hoTenBenhNhan',
        'bn.email AS emailBenhNhan',
      ]);

    // Mặc định chỉ hiện nhật ký nội bộ (nhân viên, bác sĩ, giám đốc, admin); bệnh nhân xem riêng qua bộ lọc
    if (query.loaiNguoiDung === 'BENH_NHAN') {
      qb.andWhere("log.vai_tro = 'benh_nhan'");
    } else if (query.loaiNguoiDung !== 'TAT_CA') {
      qb.andWhere("log.vai_tro NOT IN ('benh_nhan', 'khach', 'guest')");
    }

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
      let tenNV = row.hoTenNhanVien || row.hoTenBenhNhan;
      if (!tenNV) {
        if (row.tenNguoiDung === 'admin') tenNV = 'Quản Trị Viên Hệ Thống';
        else if (row.tenNguoiDung === 'giamdoc') tenNV = 'BS.CKII Nguyễn Văn Giám Đốc';
        else if (row.tenNguoiDung === 'bacsi') tenNV = 'Bác sĩ Nguyễn Văn A';
        else if (row.tenNguoiDung === 'tieptan') tenNV = 'Lễ Tân Y Tế';
        else if (row.tenNguoiDung === 'he_thong') tenNV = 'Hệ Thống Tự Động';
        else tenNV = row.tenNguoiDung || 'Nhân viên';
      }

      // 2. Email nhân viên
      let emailNV = row.emailNhanVien || row.emailBenhNhan;
      if (!emailNV) {
        if (row.tenNguoiDung === 'admin') emailNV = 'admin@phongkham.vn';
        else if (row.tenNguoiDung === 'giamdoc') emailNV = 'giamdoc@phongkham.vn';
        else if (row.tenNguoiDung === 'he_thong') emailNV = 'system@phongkham.vn';
        else if ((row.tenNguoiDung || '').includes('@')) emailNV = row.tenNguoiDung;
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
    const absolutePath = path.resolve(file.path);
    const cloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
    );

    if (!cloudinaryConfigured) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestException('Chưa cấu hình Cloudinary trên backend');
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadToCloudinary = () =>
      new Promise<string>((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            folder: 'phongkham/avatars',
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result?.secure_url) {
              reject(error || new Error('Cloudinary không trả về URL ảnh'));
              return;
            }
            resolve(result.secure_url);
          },
        );
        upload.end(file.buffer || fs.readFileSync(absolutePath));
      });

    try {
      // 1. Lấy danh sách nhân viên khác đã có avatar
      const allEmployees = await this.nhanVienRepo.find();
      // Embedding đã lưu lúc chấm công (bảng chưa tạo → coi như chưa có, so bằng ảnh như cũ)
      const daLuu: Array<{ nhan_vien_id: number; anh: string; embedding: any }> = await this.nhanVienRepo
        .query('SELECT nhan_vien_id, anh, embedding FROM nhan_vien_khuon_mat')
        .catch(() => []);
      const embeddingTheoNv = new Map(daLuu.map((r) => [r.nhan_vien_id, r]));
      const candidates = (await Promise.all(allEmployees
        .filter(nv => !nhanVienId || nv.id !== nhanVienId)
        .filter(nv => nv.anhDaiDien && typeof nv.anhDaiDien === 'string' && nv.anhDaiDien.trim() !== '')
        .map(async nv => {
          const luu = embeddingTheoNv.get(nv.id);
          if (luu?.anh === nv.anhDaiDien) {
            try {
              // Embedding lưu dạng mã hóa AES-256 (xem cham-cong.service)
              const embedding: number[] = JSON.parse(new Aes256Transformer().from(luu.embedding));
              return { id: nv.id, ho_ten: nv.hoTen, chuc_vu: nv.chucVu, embedding, anh_base64: undefined as string | undefined };
            } catch {
              // không giải mã được → so bằng ảnh như bên dưới
            }
          }
          const cleanRel = nv.anhDaiDien.replace(/^\/+/, '');
          const avatarPath = path.join(process.cwd(), cleanRel);
          let anhBase64: string | undefined;
          if (nv.anhDaiDien.startsWith('http')) {
            try {
              const response = await axios.get(nv.anhDaiDien, { responseType: 'arraybuffer', timeout: 10000 });
              anhBase64 = Buffer.from(response.data).toString('base64');
            } catch {
              anhBase64 = undefined;
            }
          } else if (fs.existsSync(avatarPath)) {
            anhBase64 = fs.readFileSync(avatarPath).toString('base64');
          }
          return {
            id: nv.id,
            ho_ten: nv.hoTen,
            chuc_vu: nv.chucVu,
            embedding: undefined as number[] | undefined,
            anh_base64: anhBase64,
          };
        }))).filter(candidate => candidate.embedding || candidate.anh_base64);

      // 2. Gọi Python ML kiểm tra tính hợp lệ & chống trùng
      let checkResult: any = null;
      try {
        const targetImageBase64 = fs.readFileSync(absolutePath).toString('base64');
        // Python ML trên Render free cần ~50s để thức dậy → chờ & thử lại thay vì bỏ qua đối soát
        const response = await withColdStartRetry(() => firstValueFrom(
          this.httpService.post(
            `${PYTHON_ML_URL}/check-duplicate-face`,
            { target_image_base64: targetImageBase64, candidates },
            { timeout: 75000, headers: { 'x-internal-key': process.env.AI_INTERNAL_KEY || '' } },
          ),
        ));
        checkResult = response.data;
      } catch (mlErr: any) {
        const errMsg = String(mlErr?.message || '');
        const isConnErr =
          isServiceWakingUp(mlErr) ||
          mlErr?.code === 'ECONNREFUSED' ||
          mlErr?.code === 'ETIMEDOUT' ||
          mlErr?.code === 'ECONNRESET' ||
          errMsg.includes('ECONNREFUSED') ||
          errMsg.includes('timeout');

        if (isConnErr) {
          console.warn('[AvatarUpload] Dịch vụ Python ML (cổng 5001) tạm thời chưa phản hồi, lưu ảnh theo chế độ dự phòng:', errMsg);
          return {
            message: 'Đã cập nhật ảnh nhân sự thành công (Lưu ý: Dịch vụ AI nhận diện khuôn mặt đang tạm tắt nên chưa đối soát sinh trắc học).',
            data: await uploadToCloudinary(),
            warning: true,
          };
        }
        throw mlErr;
      }

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
      const avatarUrl = await uploadToCloudinary();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return {
        message: 'Upload và xác thực khuôn mặt thành công',
        data: avatarUrl,
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

  // ==========================================
  // QUẢN LÝ BẢNG GIÁ DỊCH VỤ KHÁM CHỮA BỆNH & CẬN LÂM SÀNG
  // ==========================================

  // 1. Lấy danh sách dịch vụ cho khách / bệnh nhân (Công khai)
  async getBangGiaPublic(query?: { loai?: string; tuKhoa?: string }) {
    const cacheKey = `public:bang_gia:${query?.loai || 'ALL'}:${(query?.tuKhoa || '').trim().toLowerCase()}`;
    return this.cache.getOrSet(cacheKey, 15_000, async () => {
      const qb = this.dichVuRepo
        .createQueryBuilder('dv')
        .where('dv.trang_thai = :status', { status: 'hoat_dong' });

      if (query?.loai && query.loai !== 'tat_ca') {
        qb.andWhere('dv.loai = :loai', { loai: query.loai });
      }

      if (query?.tuKhoa && query.tuKhoa.trim()) {
        const keyword = `%${query.tuKhoa.trim()}%`;
        qb.andWhere(
          '(dv.ten_dich_vu LIKE :kw OR dv.ma_dich_vu LIKE :kw OR dv.bo_phan_thuc_hien LIKE :kw)',
          { kw: keyword },
        );
      }

      qb.orderBy(
        'CASE dv.loai WHEN "kham_benh" THEN 1 WHEN "xet_nghiem" THEN 2 WHEN "cdha" THEN 3 ELSE 4 END',
        'ASC',
      ).addOrderBy('dv.gia', 'ASC');

      const data = await qb.getMany();
      return {
        success: true,
        total: data.length,
        data,
      };
    });
  }

  // 2. Lấy danh sách đầy đủ cho Ban Giám Đốc / Quản trị viên (Kèm thống kê KPI)
  async getDanhSachDichVuQuanLy(query?: { loai?: string; trangThai?: string; tuKhoa?: string }) {
    const qb = this.dichVuRepo.createQueryBuilder('dv');

    if (query?.loai && query.loai !== 'tat_ca') {
      qb.andWhere('dv.loai = :loai', { loai: query.loai });
    }

    if (query?.trangThai && query.trangThai !== 'tat_ca') {
      qb.andWhere('dv.trang_thai = :trangThai', { trangThai: query.trangThai });
    }

    if (query?.tuKhoa && query.tuKhoa.trim()) {
      const keyword = `%${query.tuKhoa.trim()}%`;
      qb.andWhere('(dv.ten_dich_vu LIKE :kw OR dv.ma_dich_vu LIKE :kw OR dv.bo_phan_thuc_hien LIKE :kw)', { kw: keyword });
    }

    qb.orderBy('dv.id', 'DESC');
    const items = await qb.getMany();

    // Thống kê nhanh KPI cho Ban Giám Đốc
    const all = await this.dichVuRepo.find();
    const stats = {
      tongDichVu: all.length,
      hoatDong: all.filter(x => x.trangThai === 'hoat_dong').length,
      tamNgung: all.filter(x => x.trangThai === 'ngung').length,
      khamBenh: all.filter(x => x.loai === 'kham_benh').length,
      xetNghiem: all.filter(x => x.loai === 'xet_nghiem').length,
      cdha: all.filter(x => x.loai === 'cdha').length,
      khac: all.filter(x => x.loai === 'khac').length,
      giaThapNhat: all.length > 0 ? Math.min(...all.map(x => Number(x.gia) || 0)) : 0,
      giaCaoNhat: all.length > 0 ? Math.max(...all.map(x => Number(x.gia) || 0)) : 0,
    };

    return {
      success: true,
      stats,
      total: items.length,
      data: items,
    };
  }

  // 3. Tạo mới dịch vụ khám / cận lâm sàng
  async taoDichVuKhamChuaBenh(userId: number, dto: {
    maDichVu: string;
    tenDichVu: string;
    loai: string;
    gia: number;
    donViKetQua?: string;
    giaTriBinhThuong?: string;
    boPhanThucHien?: string;
    mauBenhPham?: string;
    moTa?: string;
    trangThai?: string;
  }) {
    if (!dto.maDichVu || !dto.tenDichVu || dto.gia === undefined || dto.gia === null) {
      throw new BadRequestException('Mã dịch vụ, tên dịch vụ và giá là bắt buộc');
    }

    const tonTai = await this.dichVuRepo.findOneBy({ maDichVu: dto.maDichVu.trim().toUpperCase() });
    if (tonTai) {
      throw new ConflictException(`Mã dịch vụ "${dto.maDichVu.trim().toUpperCase()}" đã tồn tại trong hệ thống`);
    }

    const dv = this.dichVuRepo.create({
      maDichVu: dto.maDichVu.trim().toUpperCase(),
      tenDichVu: dto.tenDichVu.trim(),
      loai: dto.loai || 'kham_benh',
      gia: Number(dto.gia) || 0,
      donViKetQua: dto.donViKetQua?.trim() || null,
      giaTriBinhThuong: dto.giaTriBinhThuong?.trim() || null,
      boPhanThucHien: dto.boPhanThucHien?.trim() || null,
      mauBenhPham: dto.mauBenhPham?.trim() || null,
      moTa: dto.moTa?.trim() || null,
      trangThai: dto.trangThai || 'hoat_dong',
    });

    const saved = await this.dichVuRepo.save(dv);

    // Ghi nhật ký hệ thống
    const user = await this.nguoiDungRepo.findOneBy({ id: userId });
    await this.nhatKyRepo.save(
      this.nhatKyRepo.create({
        nguoiDungId: userId,
        tenNguoiDung: user?.tenDangNhap || 'Ban Giám Đốc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'TAO_DICH_VU_KHAM_CHUA_BENH',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `Thêm dịch vụ "${saved.tenDichVu}" (${saved.maDichVu}) - Đơn giá: ${new Intl.NumberFormat('vi-VN').format(saved.gia)} VNĐ`,
        diaChiIp: '127.0.0.1',
      }),
    );

    return {
      message: 'Thêm mới dịch vụ thành công',
      data: saved,
    };
  }

  // 4. Cập nhật thông tin và đơn giá dịch vụ
  async capNhatDichVuKhamChuaBenh(id: number, userId: number, dto: Partial<{
    tenDichVu: string;
    loai: string;
    gia: number;
    donViKetQua: string;
    giaTriBinhThuong: string;
    boPhanThucHien: string;
    mauBenhPham: string;
    moTa: string;
    trangThai: string;
  }>) {
    const dv = await this.dichVuRepo.findOneBy({ id });
    if (!dv) {
      throw new NotFoundException(`Không tìm thấy dịch vụ với ID ${id}`);
    }

    const giaCu = dv.gia;
    if (dto.tenDichVu !== undefined) dv.tenDichVu = dto.tenDichVu.trim();
    if (dto.loai !== undefined) dv.loai = dto.loai;
    if (dto.gia !== undefined) dv.gia = Number(dto.gia) || 0;
    if (dto.donViKetQua !== undefined) dv.donViKetQua = dto.donViKetQua?.trim() || null;
    if (dto.giaTriBinhThuong !== undefined) dv.giaTriBinhThuong = dto.giaTriBinhThuong?.trim() || null;
    if (dto.boPhanThucHien !== undefined) dv.boPhanThucHien = dto.boPhanThucHien?.trim() || null;
    if (dto.mauBenhPham !== undefined) dv.mauBenhPham = dto.mauBenhPham?.trim() || null;
    if (dto.moTa !== undefined) dv.moTa = dto.moTa?.trim() || null;
    if (dto.trangThai !== undefined) dv.trangThai = dto.trangThai;

    const saved = await this.dichVuRepo.save(dv);

    // Tự động đồng bộ sang cấu hình tiền cọc nếu điều chỉnh dịch vụ khám chính
    try {
      if (saved.maDichVu === 'KB002' || saved.maDichVu === 'KB001') {
        const hinhThucTarget = saved.maDichVu === 'KB002' ? 'truc_tuyen' : 'truc_tiep';
        const cocItem = await this.tienCocRepo.findOneBy({ loaiHinhThuc: hinhThucTarget });
        if (cocItem) {
          cocItem.phiKhamMacDinh = Number(saved.gia);
          cocItem.soTienCoc = Math.round((cocItem.phiKhamMacDinh * cocItem.phanTramCoc) / 100);
          await this.tienCocRepo.save(cocItem);
        }
      }
    } catch (errSync) {
      console.error('Lỗi tự động đồng bộ tiền cọc khi sửa giá khám:', errSync);
    }

    // Ghi nhật ký hệ thống
    const user = await this.nguoiDungRepo.findOneBy({ id: userId });
    await this.nhatKyRepo.save(
      this.nhatKyRepo.create({
        nguoiDungId: userId,
        tenNguoiDung: user?.tenDangNhap || 'Ban Giám Đốc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'CAP_NHAT_BANG_GIA_DICH_VU',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `Cập nhật dịch vụ "${saved.tenDichVu}" (${saved.maDichVu}). Giá cũ: ${new Intl.NumberFormat('vi-VN').format(giaCu)}đ -> Giá mới: ${new Intl.NumberFormat('vi-VN').format(saved.gia)}đ`,
        diaChiIp: '127.0.0.1',
      }),
    );

    return {
      message: 'Cập nhật bảng giá dịch vụ thành công',
      data: saved,
    };
  }

  // 5. Bật / Tắt trạng thái hoạt động dịch vụ
  async toggleTrangThaiDichVu(id: number, userId: number, trangThai?: string) {
    const dv = await this.dichVuRepo.findOneBy({ id });
    if (!dv) {
      throw new NotFoundException(`Không tìm thấy dịch vụ với ID ${id}`);
    }

    dv.trangThai = trangThai || (dv.trangThai === 'hoat_dong' ? 'ngung' : 'hoat_dong');
    const saved = await this.dichVuRepo.save(dv);

    const user = await this.nguoiDungRepo.findOneBy({ id: userId });
    await this.nhatKyRepo.save(
      this.nhatKyRepo.create({
        nguoiDungId: userId,
        tenNguoiDung: user?.tenDangNhap || 'Ban Giám Đốc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'DOI_TRANG_THAI_DICH_VU',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `Đổi trạng thái dịch vụ "${saved.tenDichVu}" (${saved.maDichVu}) thành: ${saved.trangThai === 'hoat_dong' ? 'Hoạt động' : 'Tạm ngừng'}`,
        diaChiIp: '127.0.0.1',
      }),
    );

    return {
      message: `Đã ${saved.trangThai === 'hoat_dong' ? 'kích hoạt' : 'tạm ngừng'} dịch vụ thành công`,
      data: saved,
    };
  }

  // 6. Xóa dịch vụ
  async xoaDichVuKhamChuaBenh(id: number, userId: number) {
    const dv = await this.dichVuRepo.findOneBy({ id });
    if (!dv) {
      throw new NotFoundException(`Không tìm thấy dịch vụ với ID ${id}`);
    }

    // Kiểm tra xem dịch vụ đã có chỉ định cận lâm sàng chưa
    const daChiDinh = await this.clsRepo.count({ where: { dichVuXetNghiemId: id } });
    if (daChiDinh > 0) {
      // Nếu đã có chỉ định thực tế, tự động chuyển sang tạm ngừng để bảo toàn hồ sơ bệnh án
      dv.trangThai = 'ngung';
      await this.dichVuRepo.save(dv);
      return {
        message: `Dịch vụ đã phát sinh ${daChiDinh} lượt chỉ định trong hồ sơ y tế nên hệ thống đã tự động chuyển trạng thái sang "Tạm ngừng" để bảo toàn lịch sử dữ liệu.`,
        data: dv,
      };
    }

    await this.dichVuRepo.delete(id);

    const user = await this.nguoiDungRepo.findOneBy({ id: userId });
    await this.nhatKyRepo.save(
      this.nhatKyRepo.create({
        nguoiDungId: userId,
        tenNguoiDung: user?.tenDangNhap || 'Ban Giám Đốc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'XOA_DICH_VU_KHAM_CHUA_BENH',
        loaiNhatKy: LoaiNhatKy.WARNING,
        moTa: `Xóa dịch vụ "${dv.tenDichVu}" (${dv.maDichVu})`,
        diaChiIp: '127.0.0.1',
      }),
    );

    return {
      message: 'Đã xóa dịch vụ thành công',
      data: { id },
    };
  }

  // ==========================================
  // QUẢN LÝ TIỀN CỌC & CHÍNH SÁCH ĐẶT LỊCH TRƯỚC
  // ==========================================

  // 1. Lấy thông tin cấu hình tiền cọc công khai (Cho Bệnh nhân & Khách vãng lai xem khi đặt lịch)
  async getCauHinhTienCocPublic() {
    return this.cache.getOrSet('public:cau_hinh_tien_coc', 15_000, async () => {
      let items = await this.tienCocRepo.find();
      if (!items || items.length === 0) {
        await this.tienCocRepo.save([
          {
            loaiHinhThuc: 'truc_tiep',
            tenHinhThuc: 'Đặt lịch khám trực tiếp tại phòng khám',
            phiKhamMacDinh: 200000,
            phanTramCoc: 20,
            soTienCoc: 40000,
            thoiGianHuyHoanCocGio: 2,
            phanTramHoanCoc: 100,
            choPhepDatTruocNgayMin: 1,
            choPhepDatTruocNgayMax: 30,
            apDungTuDong: true,
            moTa: 'Bệnh nhân tạm ứng 20% tiền khám (40.000đ) để giữ chỗ và phân bổ bác sĩ theo khung giờ hẹn.',
            ghiChuHoanCoc:
              'Hủy lịch trước > 2 tiếng: Tự động hoàn lại 100% tiền cọc. Hủy dưới 2 tiếng hoặc vắng mặt không hoàn cọc.',
          },
          {
            loaiHinhThuc: 'truc_tuyen',
            tenHinhThuc: 'Tư vấn khám bệnh từ xa Telehealth (Video Call 1-1)',
            phiKhamMacDinh: 200000,
            phanTramCoc: 100,
            soTienCoc: 200000,
            thoiGianHuyHoanCocGio: 24,
            phanTramHoanCoc: 100,
            choPhepDatTruocNgayMin: 1,
            choPhepDatTruocNgayMax: 30,
            apDungTuDong: true,
            moTa: 'Thanh toán 100% chi phí tư vấn Telehealth để bác sĩ hội chẩn và mở phòng họp trực tuyến.',
            ghiChuHoanCoc:
              'Hủy lịch trước > 24 tiếng: Hoàn trả 100% phí tư vấn. Hủy trong vòng 24 tiếng được hoàn 50% hoặc bảo lưu lịch hẹn.',
          },
        ]);
        items = await this.tienCocRepo.find();
      }
      return {
        message: 'Lấy cấu hình tiền cọc thành công',
        data: items,
      };
    });
  }

  // 2. Ban Giám Đốc lấy danh sách cấu hình tiền cọc
  async getDanhSachCauHinhTienCoc() {
    return this.getCauHinhTienCocPublic();
  }

  // 3. Ban Giám Đốc cập nhật mức tiền cọc & chính sách hoàn cọc
  async capNhatCauHinhTienCoc(id: number, userId: number, dto: Partial<{
    tenHinhThuc: string;
    phiKhamMacDinh: number;
    phanTramCoc: number;
    soTienCoc: number;
    thoiGianHuyHoanCocGio: number;
    phanTramHoanCoc: number;
    choPhepDatTruocNgayMin: number;
    choPhepDatTruocNgayMax: number;
    soLichHenToiDaMoiBuoi: number | null;
    maCoSoKcb: string | null;
    tyLeBhytTraiTuyen: number;
    nguongBhytToanBo: number | null;
    apDungTuDong: boolean;
    moTa: string;
    ghiChuHoanCoc: string;
  }>) {
    const item = await this.tienCocRepo.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy cấu hình tiền cọc ID ${id}`);
    }

    const giaCu = item.soTienCoc;

    if (dto.tenHinhThuc !== undefined) item.tenHinhThuc = dto.tenHinhThuc.trim();
    if (dto.phiKhamMacDinh !== undefined) item.phiKhamMacDinh = Number(dto.phiKhamMacDinh) || 0;
    if (dto.phanTramCoc !== undefined) item.phanTramCoc = Number(dto.phanTramCoc) || 0;
    
    // Tự động tính số tiền cọc theo phần trăm nếu không nhập số tiền cụ thể
    if (dto.soTienCoc !== undefined) {
      item.soTienCoc = Number(dto.soTienCoc) || 0;
    } else if (dto.phanTramCoc !== undefined && item.phiKhamMacDinh > 0) {
      item.soTienCoc = Math.round((item.phiKhamMacDinh * item.phanTramCoc) / 100);
    }

    if (dto.thoiGianHuyHoanCocGio !== undefined) item.thoiGianHuyHoanCocGio = Number(dto.thoiGianHuyHoanCocGio) || 0;
    if (dto.phanTramHoanCoc !== undefined) item.phanTramHoanCoc = Number(dto.phanTramHoanCoc) || 0;
    if (dto.choPhepDatTruocNgayMin !== undefined) {
      const val = Number(dto.choPhepDatTruocNgayMin);
      item.choPhepDatTruocNgayMin = Number.isNaN(val) ? 0 : Math.max(0, val);
    }
    if (dto.choPhepDatTruocNgayMax !== undefined) {
      const val = Number(dto.choPhepDatTruocNgayMax);
      item.choPhepDatTruocNgayMax = Number.isNaN(val) ? 30 : Math.max(1, val);
    }
    if (dto.soLichHenToiDaMoiBuoi !== undefined) {
      const val = Number(dto.soLichHenToiDaMoiBuoi);
      item.soLichHenToiDaMoiBuoi = dto.soLichHenToiDaMoiBuoi === null || !(val > 0) ? null : Math.floor(val);
    }
    if (dto.maCoSoKcb !== undefined) item.maCoSoKcb = dto.maCoSoKcb?.trim() || null;
    if (dto.tyLeBhytTraiTuyen !== undefined) item.tyLeBhytTraiTuyen = Math.min(100, Math.max(0, Number(dto.tyLeBhytTraiTuyen) || 0));
    if (dto.nguongBhytToanBo !== undefined) item.nguongBhytToanBo = Number(dto.nguongBhytToanBo) > 0 ? Math.floor(Number(dto.nguongBhytToanBo)) : null;
    if (dto.apDungTuDong !== undefined) item.apDungTuDong = Boolean(dto.apDungTuDong);
    if (dto.moTa !== undefined) item.moTa = dto.moTa?.trim() || null;
    if (dto.ghiChuHoanCoc !== undefined) item.ghiChuHoanCoc = dto.ghiChuHoanCoc?.trim() || null;

    const saved = await this.tienCocRepo.save(item);
    this.cache.invalidatePrefix('public:');
    this.cache.invalidatePrefix('master:');

    // Tự động đồng bộ ngược sang bảng giá dịch vụ
    try {
      const maDvTarget = saved.loaiHinhThuc === 'truc_tuyen' ? 'KB002' : 'KB001';
      const dv = await this.dichVuRepo.findOneBy({ maDichVu: maDvTarget });
      if (dv && saved.phiKhamMacDinh > 0) {
        dv.gia = saved.phiKhamMacDinh;
        await this.dichVuRepo.save(dv);
      }
    } catch (errSync) {
      console.error('Lỗi tự động đồng bộ sang bảng giá dịch vụ:', errSync);
    }

    // Ghi nhật ký kiểm toán hệ thống
    const user = await this.nguoiDungRepo.findOneBy({ id: userId });
    await this.nhatKyRepo.save(
      this.nhatKyRepo.create({
        nguoiDungId: userId,
        tenNguoiDung: user?.tenDangNhap || 'Ban Giám Đốc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'CAP_NHAT_CAU_HINH_TIEN_COC',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `Điều chỉnh cấu hình tiền cọc "${saved.tenHinhThuc}" (${saved.loaiHinhThuc}): Cọc cũ ${new Intl.NumberFormat('vi-VN').format(giaCu)}đ -> Cọc mới: ${new Intl.NumberFormat('vi-VN').format(saved.soTienCoc)}đ (${saved.phanTramCoc}% phí khám)`,
        diaChiIp: '127.0.0.1',
      }),
    );

    return {
      message: 'Cập nhật cấu hình bảng giá tiền cọc thành công',
      data: saved,
    };
  }
}
