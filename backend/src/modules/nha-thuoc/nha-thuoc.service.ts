import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Thuoc } from './entities/thuoc.entity';
import { LoThuoc } from './entities/lo-thuoc.entity';
import { DonThuoc } from './entities/don-thuoc.entity';
import { DonThuocChiTiet } from './entities/don-thuoc-chi-tiet.entity';

@Injectable()
export class NhaThuocService {
  constructor(
    @InjectRepository(Thuoc)
    private readonly thuocRepo: Repository<Thuoc>,
    @InjectRepository(LoThuoc)
    private readonly loThuocRepo: Repository<LoThuoc>,
    @InjectRepository(DonThuoc)
    private readonly donThuocRepo: Repository<DonThuoc>,
    @InjectRepository(DonThuocChiTiet)
    private readonly donThuocChiTietRepo: Repository<DonThuocChiTiet>,
  ) {}

  /**
   * Lấy danh sách danh mục thuốc & tồn kho
   */
  async getDanhSachThuoc(search?: string) {
    const qb = this.thuocRepo.createQueryBuilder('t');

    if (search) {
      const keyword = `%${search.trim()}%`;
      qb.where('t.tenThuoc LIKE :keyword OR t.maThuoc LIKE :keyword OR t.tenHoatChat LIKE :keyword', { keyword });
    }

    const list = await qb.orderBy('t.tenThuoc', 'ASC').getMany();

    return {
      message: 'Lấy danh sách thuốc thành công',
      data: list.map((item) => ({
        ...item,
        giaBan: Number(item.giaBan),
      })),
    };
  }

  /**
   * Thêm thuốc mới
   */
  async taoThuoc(data: any) {
    const count = await this.thuocRepo.count();
    const maThuoc = data.maThuoc?.trim() || `TH${String(count + 1).padStart(3, '0')}`;

    const newThuoc = this.thuocRepo.create({
      maThuoc,
      tenThuoc: data.tenThuoc,
      tenHoatChat: data.tenHoatChat || null,
      donViTinh: data.donViTinh || 'Viên',
      hamLuong: data.hamLuong || null,
      duongDung: data.duongDung || 'Uống',
      giaBan: Number(data.giaBan || 0),
      tonKhoTong: Number(data.tonKhoTong || 0),
      moTa: data.moTa || null,
      trangThai: Number(data.tonKhoTong || 0) > 0 ? 'con_hang' : 'het_hang',
    });

    const saved = await this.thuocRepo.save(newThuoc);
    return { message: 'Thêm thuốc mới thành công', data: saved };
  }

  /**
   * Cập nhật thông tin thuốc
   */
  async capNhatThuoc(id: number, data: any) {
    const thuoc = await this.thuocRepo.findOne({ where: { id } });
    if (!thuoc) throw new NotFoundException('Không tìm thấy thuốc');

    const tonKhoTong = data.tonKhoTong !== undefined ? Number(data.tonKhoTong) : thuoc.tonKhoTong;

    await this.thuocRepo.update(id, {
      tenThuoc: data.tenThuoc,
      tenHoatChat: data.tenHoatChat || null,
      donViTinh: data.donViTinh || 'Viên',
      hamLuong: data.hamLuong || null,
      duongDung: data.duongDung || null,
      giaBan: Number(data.giaBan || 0),
      tonKhoTong,
      moTa: data.moTa || null,
      trangThai: tonKhoTong > 0 ? 'con_hang' : 'het_hang',
    });

    return { message: 'Cập nhật thông tin thuốc thành công' };
  }

  /**
   * Xóa thuốc khỏi danh mục
   */
  async xoaThuoc(id: number) {
    const thuoc = await this.thuocRepo.findOne({ where: { id } });
    if (!thuoc) throw new NotFoundException('Không tìm thấy thuốc');

    await this.thuocRepo.delete(id);
    return { message: 'Xóa thuốc thành công' };
  }

  /**
   * Lấy danh sách đơn thuốc từ bác sĩ kê
   */
  async getDanhSachDonThuoc(query: { trangThai?: string; search?: string }) {
    const qb = this.donThuocRepo
      .createQueryBuilder('dt')
      .leftJoinAndSelect('dt.bacSiKe', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .leftJoinAndSelect('dt.chiTiet', 'ct')
      .leftJoinAndSelect('ct.thuoc', 't')
      .orderBy('dt.ngayKe', 'DESC');

    if (query.trangThai) {
      qb.andWhere('dt.trangThai = :trangThai', { trangThai: query.trangThai });
    }

    if (query.search) {
      const keyword = `%${query.search.trim()}%`;
      qb.andWhere('(dt.maDonThuoc LIKE :keyword OR nv.hoTen LIKE :keyword)', { keyword });
    }

    const list = await qb.getMany();

    return {
      message: 'Lấy danh sách đơn thuốc thành công',
      data: list.map((dt) => ({
        id: dt.id,
        maDonThuoc: dt.maDonThuoc,
        bacSi: dt.bacSiKe?.nhanVien?.hoTen || 'Bác sĩ',
        ngayKe: dt.ngayKe,
        trangThai: dt.trangThai,
        soLuongMon: dt.chiTiet ? dt.chiTiet.length : 0,
      })),
    };
  }

  /**
   * Chi tiết đơn thuốc & tính toán lô xuất theo FEFO (First-Expired-First-Out)
   */
  async getChiTietDonThuoc(id: number) {
    const dt = await this.donThuocRepo.findOne({
      where: { id },
      relations: ['bacSiKe', 'bacSiKe.nhanVien', 'chiTiet', 'chiTiet.thuoc'],
    });

    if (!dt) {
      throw new NotFoundException('Không tìm thấy đơn thuốc');
    }

    // Tra cứu FEFO cho từng món thuốc trong đơn
    const chiTietCoLo = await Promise.all(
      dt.chiTiet.map(async (ct) => {
        // Lấy lô còn hạn dùng sớm nhất (FEFO)
        const availableBatches = await this.loThuocRepo
          .createQueryBuilder('lo')
          .where('lo.thuocId = :thuocId', { thuocId: ct.thuocId })
          .andWhere('lo.soLuongTon > 0')
          .andWhere('lo.ngayHetHan >= CURRENT_DATE()')
          .orderBy('lo.ngayHetHan', 'ASC')
          .getMany();

        return {
          id: ct.id,
          thuocId: ct.thuocId,
          tenThuoc: ct.thuoc?.tenThuoc,
          donViTinh: ct.thuoc?.donViTinh,
          giaBan: Number(ct.thuoc?.giaBan || 0),
          soLuong: ct.soLuong,
          lieuDung: ct.lieuDung,
          soNgayDung: ct.soNgayDung,
          thanhTien: Number(ct.thuoc?.giaBan || 0) * ct.soLuong,
          loThuocGợiÝ: availableBatches[0]
            ? {
                id: availableBatches[0].id,
                maLo: availableBatches[0].maLo,
                ngayHetHan: availableBatches[0].ngayHetHan,
                soLuongTon: availableBatches[0].soLuongTon,
              }
            : null,
          duTonKho: (availableBatches[0]?.soLuongTon || 0) >= ct.soLuong,
        };
      }),
    );

    return {
      message: 'Lấy chi tiết đơn thuốc thành công',
      data: {
        id: dt.id,
        maDonThuoc: dt.maDonThuoc,
        bacSi: dt.bacSiKe?.nhanVien?.hoTen,
        ngayKe: dt.ngayKe,
        trangThai: dt.trangThai,
        ghiChu: dt.ghiChu,
        chiTiet: chiTietCoLo,
        tongTienDonThuoc: chiTietCoLo.reduce((sum, item) => sum + item.thanhTien, 0),
      },
    };
  }

  /**
   * Duyệt & Xuất kho cấp phát thuốc theo thuật toán FEFO
   */
  async capPhatDonThuoc(id: number) {
    const dt = await this.donThuocRepo.findOne({
      where: { id },
      relations: ['chiTiet', 'chiTiet.thuoc'],
    });

    if (!dt) {
      throw new NotFoundException('Không tìm thấy đơn thuốc');
    }

    if (dt.trangThai === 'da_cap_phat') {
      throw new BadRequestException('Đơn thuốc này đã được cấp phát trước đó');
    }

    // Xử lý từng thuốc trong đơn
    for (const ct of dt.chiTiet) {
      let cantTru = ct.soLuong;

      // Lấy danh sách lô thuốc theo thứ tự hết hạn sớm nhất (FEFO)
      const loList = await this.loThuocRepo
        .createQueryBuilder('lo')
        .where('lo.thuocId = :thuocId', { thuocId: ct.thuocId })
        .andWhere('lo.soLuongTon > 0')
        .andWhere('lo.ngayHetHan >= CURRENT_DATE()')
        .orderBy('lo.ngayHetHan', 'ASC')
        .getMany();

      for (const lo of loList) {
        if (cantTru <= 0) break;

        const tru = Math.min(lo.soLuongTon, cantTru);
        lo.soLuongTon -= tru;
        cantTru -= tru;

        await this.loThuocRepo.save(lo);
        ct.loThuocId = lo.id;
      }

      await this.donThuocChiTietRepo.save(ct);

      // Cập nhật tồn kho tổng trong bảng `thuoc`
      const totalStock = await this.loThuocRepo
        .createQueryBuilder('lo')
        .where('lo.thuocId = :thuocId', { thuocId: ct.thuocId })
        .select('SUM(lo.soLuongTon)', 'sum')
        .getRawOne();

      await this.thuocRepo.update(ct.thuocId, {
        tonKhoTong: Number(totalStock?.sum || 0),
      });
    }

    dt.trangThai = 'da_cap_phat';
    const updated = await this.donThuocRepo.save(dt);

    return {
      message: 'Cấp phát đơn thuốc thành công',
      data: updated,
    };
  }

  /**
   * Bác sĩ lập đơn thuốc điện tử
   */
  async taoDonThuoc(body: {
    benhAnKhamId: number;
    bacSiId?: number;
    ghiChu?: string;
    chiTiet: Array<{
      thuocId: number;
      soLuong: number;
      lieuDung?: string;
      soNgayDung?: number;
      ghiChu?: string;
    }>;
  }) {
    if (!body.benhAnKhamId || !body.chiTiet || !body.chiTiet.length) {
      throw new BadRequestException('Vui lòng cung cấp phiếu khám và ít nhất 1 thuốc');
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.donThuocRepo.count();
    const maDonThuoc = `DT${todayStr}${String(count + 1).padStart(4, '0')}`;

    const dt = this.donThuocRepo.create({
      maDonThuoc,
      benhAnKhamId: body.benhAnKhamId,
      bacSiKeId: body.bacSiId || 1,
      trangThai: 'cho_duyet',
      ghiChu: body.ghiChu,
    });

    const savedDon = await this.donThuocRepo.save(dt);

    const chiTietEntities = body.chiTiet.map((item) =>
      this.donThuocChiTietRepo.create({
        donThuocId: savedDon.id,
        thuocId: item.thuocId,
        soLuong: item.soLuong,
        lieuDung: item.lieuDung || '',
        soNgayDung: item.soNgayDung || 1,
        ghiChu: item.ghiChu || '',
      })
    );

    await this.donThuocChiTietRepo.save(chiTietEntities);

    const result = await this.donThuocRepo.findOne({
      where: { id: savedDon.id },
      relations: ['chiTiet', 'chiTiet.thuoc'],
    });

    return {
      message: 'Kê đơn thuốc thành công',
      data: result,
    };
  }
}

