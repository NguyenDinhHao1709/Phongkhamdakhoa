import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BacSi } from './entities/bac-si.entity';
import { NhanVien } from './entities/nhan-vien.entity';

@Injectable()
export class NhanVienService {
  constructor(
    @InjectRepository(BacSi)
    private readonly bacSiRepo: Repository<BacSi>,
    @InjectRepository(NhanVien)
    private readonly nhanVienRepo: Repository<NhanVien>,
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
}

