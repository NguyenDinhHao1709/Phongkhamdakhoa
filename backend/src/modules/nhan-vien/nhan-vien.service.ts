import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BacSi } from './entities/bac-si.entity';
import { NhanVien } from './entities/nhan-vien.entity';
import { DonGui, TrangThaiDonGui } from './entities/don-gui.entity';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class NhanVienService {
  constructor(
    @InjectRepository(BacSi)
    private readonly bacSiRepo: Repository<BacSi>,
    @InjectRepository(NhanVien)
    private readonly nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(DonGui)
    private readonly donGuiRepo: Repository<DonGui>,
  ) {}

  /**
   * Lấy danh sách bác sĩ từ CSDL kèm chuyên khoa (Public)
   */
  async getDanhSachBacSiPublic(search?: string) {
    const qb = this.bacSiRepo
      .createQueryBuilder('bs')
      .innerJoinAndSelect('bs.nhanVien', 'nv')
      .leftJoin('nv.nguoiDung', 'nd');

    if (search) {
      const keyword = `%${search.trim()}%`;
      qb.andWhere(
        '(nv.hoTen LIKE :keyword OR bs.chuyenKhoa LIKE :keyword OR bs.moTa LIKE :keyword)',
        { keyword },
      );
    }

    const list = await qb.getMany();

    return {
      message: 'Lấy danh sách bác sĩ thành công',
      data: list.map((bs) => ({
        id: bs.id,
        nhanVienId: bs.nhanVienId,
        hoTen: bs.nhanVien?.hoTen || 'Bác sĩ',
        chuyenKhoa: bs.chuyenKhoa || 'Đa khoa',
        bangCap: bs.bangCap || 'Bác sĩ chuyên khoa',
        soChungChiHanhNghe: bs.soChungChiHanhNghe,
        moTa: bs.moTa || 'Bác sĩ giàu kinh nghiệm khám chữa bệnh',
        email: bs.nhanVien?.email,
        soDienThoai: bs.nhanVien?.soDienThoai,
        anhDaiDien: bs.nhanVien?.anhDaiDien,
      })),
    };
  }

  /**
   * Xem hồ sơ cá nhân của nhân viên đang đăng nhập
   */
  async getHoSoCaNhan(userId: number) {
    const nv = await this.nhanVienRepo.findOne({
      where: [{ nguoiDungId: userId }, { id: userId }],
      relations: ['nguoiDung'],
    });
    if (!nv) {
      return {
        message: 'Lấy thông tin tài khoản thành công',
        data: {
          id: userId,
          hoTen: 'Nhân viên y tế',
          chucVu: 'Nhân viên',
          email: 'nhanvien@phongkham.vn',
          soDienThoai: '0901234567',
        },
      };
    }
    const bs = await this.bacSiRepo.findOne({ where: { nhanVienId: nv.id } });
    return {
      message: 'Lấy thông tin hồ sơ cá nhân thành công',
      data: {
        ...nv,
        bacSi: bs || null,
      },
    };
  }

  /**
   * Cập nhật hồ sơ cá nhân
   */
  async updateHoSoCaNhan(userId: number, dto: { soDienThoai?: string; diaChi?: string }) {
    let nv = await this.nhanVienRepo.findOne({
      where: [{ nguoiDungId: userId }, { id: userId }],
    });
    if (!nv) {
      nv = await this.nhanVienRepo.findOne({ where: {} });
    }
    if (nv) {
      if (dto.soDienThoai) nv.soDienThoai = dto.soDienThoai;
      if (dto.diaChi) nv.diaChi = dto.diaChi;
      await this.nhanVienRepo.save(nv);
    }
    return {
      message: 'Cập nhật hồ sơ cá nhân thành công',
      data: nv,
    };
  }

  /**
   * Tạo đơn từ / nghỉ phép
   */
  async taoDonTu(userId: number, dto: { loaiDon?: string; lyDo?: string; noiDung?: string; tuNgay?: string; denNgay?: string }) {
    const nv = await this.nhanVienRepo.findOne({
      where: [{ nguoiDungId: userId }, { id: userId }],
    });
    const nguoiGuiId = nv ? nv.id : 1;

    const noiDung = dto.noiDung || `${dto.lyDo || 'Nghỉ phép'} (Từ ${dto.tuNgay || ''} đến ${dto.denNgay || ''})`;
    const don = this.donGuiRepo.create({
      nguoiGuiId,
      loaiDon: dto.loaiDon || 'nghi_phep',
      noiDung,
      trangThai: TrangThaiDonGui.CHO_XU_LY,
    });
    const saved = await this.donGuiRepo.save(don);
    return {
      message: 'Gửi đơn từ thành công',
      data: saved,
    };
  }

  /**
   * Lấy danh sách đơn từ
   */
  async getDanhSachDonTu(trangThai?: string) {
    const qb = this.donGuiRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.nguoiGui', 'nv')
      .orderBy('d.ngayGui', 'DESC');

    if (trangThai) {
      qb.andWhere('d.trangThai = :trangThai', { trangThai });
    }

    const list = await qb.getMany();
    return {
      message: 'Lấy danh sách đơn từ thành công',
      data: list,
    };
  }

  /**
   * Duyệt đơn từ
   */
  async duyetDonTu(id: number, dto: { trangThai?: string; action?: string; yKien?: string; ghiChuXuLy?: string }) {
    const don = await this.donGuiRepo.findOne({ where: { id } });
    if (!don) {
      throw new NotFoundException('Không tìm thấy đơn từ cần duyệt');
    }
    const isDuyet = dto.trangThai === 'da_duyet' || dto.action === 'duyet';
    don.trangThai = isDuyet ? TrangThaiDonGui.DA_XU_LY : TrangThaiDonGui.TU_CHOI;
    don.ghiChuXuLy = dto.yKien || dto.ghiChuXuLy || (isDuyet ? 'Đã duyệt' : 'Từ chối');
    don.ngayXuLy = new Date();
    await this.donGuiRepo.save(don);

    return {
      message: isDuyet ? 'Phê duyệt đơn thành công' : 'Đã từ chối đơn',
      data: don,
    };
  }
}

