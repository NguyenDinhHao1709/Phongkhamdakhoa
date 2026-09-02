import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { NguoiDung, TrangThaiNguoiDung } from '../auth/entities/nguoi-dung.entity';
import { VaiTro } from '../auth/entities/vai-tro.entity';
import { QuyenHan } from '../auth/entities/quyen-han.entity';
import { VaiTroQuyenHan } from '../auth/entities/vai-tro-quyen-han.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { KyThuatVien } from '../nhan-vien/entities/ky-thuat-vien.entity';

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

    // Check user exists
    const existing = await this.nguoiDungRepo.findOne({ where: { tenDangNhap } });
    if (existing) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại');
    }

    const vaiTro = await this.vaiTroRepo.findOne({ where: { id: vaiTroId } });
    if (!vaiTro) throw new BadRequestException('Vai trò không hợp lệ');

    const hashedPassword = await bcrypt.hash(matKhau, 10);
    
    // Create Nguoi Dung
    const newUser = this.nguoiDungRepo.create({
      tenDangNhap,
      matKhauHash: hashedPassword,
      vaiTroId,
      loaiTaiKhoan: 'noi_bo' as any,
      trangThai: TrangThaiNguoiDung.HOAT_DONG,
    });
    const savedUser = await this.nguoiDungRepo.save(newUser);

    // Create Nhan Vien
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
      const bs = this.bacSiRepo.create({
        nhanVienId: savedNv.id,
        chuyenKhoa: chuyenKhoa || 'Đa khoa',
        bangCap,
        soChungChiHanhNghe,
        moTa: moTaBacSi,
      });
      await this.bacSiRepo.save(bs);
    } else if (vaiTro.maVaiTro === 'ky_thuat_vien') {
      const ktv = this.kyThuatVienRepo.create({
        nhanVienId: savedNv.id,
        chuyenMon: chuyenMon || 'Xét nghiệm',
      });
      await this.kyThuatVienRepo.save(ktv);
    }

    return { message: 'Tạo nhân viên thành công' };
  }

  async getChiTietNhanVien(id: number) {
    const nv = await this.nhanVienRepo.findOne({
      where: { id },
      relations: ['nguoiDung', 'nguoiDung.vaiTro'],
    });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');

    let extraData = {};
    if (nv.nguoiDung?.vaiTro?.maVaiTro === 'bac_si') {
      const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: id } });
      if (bs) {
        extraData = { chuyenKhoa: bs.chuyenKhoa, bangCap: bs.bangCap, soChungChiHanhNghe: bs.soChungChiHanhNghe, moTa: bs.moTa };
      }
    } else if (nv.nguoiDung?.vaiTro?.maVaiTro === 'ky_thuat_vien') {
      const ktv = await this.kyThuatVienRepo.findOne({ where: { nhanVienId: id } });
      if (ktv) {
        extraData = { chuyenMon: ktv.chuyenMon };
      }
    }

    return {
      message: 'Thành công',
      data: { ...nv, ...extraData }
    };
  }

  async capNhatNhanVien(id: number, data: any) {
    const nv = await this.nhanVienRepo.findOne({ where: { id }, relations: ['nguoiDung', 'nguoiDung.vaiTro'] });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');

    // Cập nhật thông tin NhanVien
    await this.nhanVienRepo.update(id, {
      hoTen: data.hoTen,
      email: data.email || null,
      soDienThoai: data.soDienThoai || null,
      gioiTinh: data.gioiTinh || null,
      ngaySinh: data.ngaySinh || null,
      soCmnd: data.soCmnd || null,
      diaChi: data.diaChi || null,
      ngayVaoLam: data.ngayVaoLam || null,
      anhDaiDien: data.anhDaiDien || null,
    });

    // Cập nhật extra info (Upsert: nếu chưa có thì tạo mới)
    const maVaiTro = nv.nguoiDung?.vaiTro?.maVaiTro;
    if (maVaiTro === 'bac_si') {
      let bs = await this.bacSiRepo.findOne({ where: { nhanVienId: id } });
      if (bs) {
        await this.bacSiRepo.update(bs.id, {
          chuyenKhoa: data.chuyenKhoa, bangCap: data.bangCap, soChungChiHanhNghe: data.soChungChiHanhNghe, moTa: data.moTaBacSi
        });
      } else {
        bs = this.bacSiRepo.create({
          nhanVienId: id, chuyenKhoa: data.chuyenKhoa, bangCap: data.bangCap, soChungChiHanhNghe: data.soChungChiHanhNghe, moTa: data.moTaBacSi
        });
        await this.bacSiRepo.save(bs);
      }
    } else if (maVaiTro === 'ky_thuat_vien') {
      let ktv = await this.kyThuatVienRepo.findOne({ where: { nhanVienId: id } });
      if (ktv) {
        await this.kyThuatVienRepo.update(ktv.id, { chuyenMon: data.chuyenMon });
      } else {
        ktv = this.kyThuatVienRepo.create({ nhanVienId: id, chuyenMon: data.chuyenMon });
        await this.kyThuatVienRepo.save(ktv);
      }
    }

    return { message: 'Cập nhật thành công' };
  }

  async xoaNhanVien(id: number) {
    const nv = await this.nhanVienRepo.findOne({ where: { id }, relations: ['nguoiDung'] });
    if (!nv) throw new NotFoundException('Không tìm thấy nhân viên');
    
    // Xóa liên kết (foreign keys ON DELETE CASCADE should handle bac_si and ky_thuat_vien if configured, but let's do it manually just in case)
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
    // Lấy danh sách vai trò (loại trừ bệnh nhân)
    const vaiTros = await this.vaiTroRepo.find({
      where: { maVaiTro: Not('benh_nhan') },
      order: { id: 'ASC' },
    });

    // Lấy danh sách quyền hạn
    const quyenHans = await this.quyenHanRepo.find({
      order: { nhomChucNang: 'ASC', id: 'ASC' },
    });

    // Lấy mapping
    const mappings = await this.vaiTroQuyenHanRepo.find();

    // Tính toán ma trận cho UI frontend
    const matrix = vaiTros.map(vt => {
      const perms = mappings.filter(m => m.vaiTroId === vt.id).map(m => m.quyenHanId);
      return {
        vaiTro: vt,
        quyenHanIds: perms,
      };
    });

    // Gom nhóm quyền hạn
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
    // Không cho đổi quyền của quản trị viên cấp cao (hardcode ID=1 or maVaiTro='quan_tri_vien_cap_cao')
    const role = await this.vaiTroRepo.findOne({ where: { id: vaiTroId } });
    if (!role) throw new NotFoundException('Vai trò không tồn tại');
    if (role.laHeThong) {
      throw new BadRequestException('Không thể chỉnh sửa quyền của vai trò hệ thống này');
    }

    // Xóa hết quyền cũ của vai trò này
    await this.vaiTroQuyenHanRepo.delete({ vaiTroId });

    // Thêm các quyền mới
    if (quyenHanIds && quyenHanIds.length > 0) {
      const newMappings = quyenHanIds.map(qhId => ({
        vaiTroId: vaiTroId,
        quyenHanId: qhId,
      }));
      await this.vaiTroQuyenHanRepo.save(newMappings);
    }

    return { message: 'Cập nhật phân quyền thành công' };
  }
}

