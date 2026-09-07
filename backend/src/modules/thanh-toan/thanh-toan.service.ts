import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HoaDon } from './entities/hoa-don.entity';
import { HoaDonChiTiet } from './entities/hoa-don-chi-tiet.entity';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';

import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { ChiDinhCanLamSang } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';

@Injectable()
export class ThanhToanService {
  constructor(
    @InjectRepository(HoaDon)
    private readonly hoaDonRepo: Repository<HoaDon>,
    @InjectRepository(HoaDonChiTiet)
    private readonly hoaDonChiTietRepo: Repository<HoaDonChiTiet>,
    @InjectRepository(LuotTiepNhan)
    private readonly tiepNhanRepo: Repository<LuotTiepNhan>,
    @InjectRepository(NhanVien)
    private readonly nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(BenhAnKham)
    private readonly benhAnRepo: Repository<BenhAnKham>,
    @InjectRepository(ChiDinhCanLamSang)
    private readonly clsRepo: Repository<ChiDinhCanLamSang>,
    @InjectRepository(DonThuoc)
    private readonly donThuocRepo: Repository<DonThuoc>,
  ) {}

  /**
   * Lấy danh sách hóa đơn (tìm kiếm, lọc theo trạng thái)
   */
  async getDanhSachHoaDon(query: { trangThai?: string; search?: string }) {
    const qb = this.hoaDonRepo
      .createQueryBuilder('hd')
      .leftJoinAndSelect('hd.benhNhan', 'bn')
      .leftJoinAndSelect('hd.thuNgan', 'tn')
      .leftJoinAndSelect('hd.chiTiet', 'ct')
      .orderBy('hd.ngayTao', 'DESC');

    if (query.trangThai) {
      qb.andWhere('hd.trangThai = :trangThai', { trangThai: query.trangThai });
    }

    if (query.search) {
      const keyword = `%${query.search.trim()}%`;
      qb.andWhere(
        '(hd.maHoaDon LIKE :keyword OR bn.hoTen LIKE :keyword OR bn.soDienThoai LIKE :keyword)',
        { keyword },
      );
    }

    const list = await qb.getMany();

    return {
      message: 'Lấy danh sách hóa đơn thành công',
      data: list.map((hd) => ({
        id: hd.id,
        maHoaDon: hd.maHoaDon,
        benhNhan: {
          id: hd.benhNhan?.id,
          maBenhNhan: hd.benhNhan?.maBenhNhan,
          hoTen: hd.benhNhan?.hoTen,
          soDienThoai: hd.benhNhan?.soDienThoai,
          gioiTinh: hd.benhNhan?.gioiTinh,
        },
        luotTiepNhanId: hd.luotTiepNhanId,
        thuNgan: hd.thuNgan ? hd.thuNgan.hoTen : null,
        tongTien: Number(hd.tongTien),
        soTienGiam: Number(hd.soTienGiam),
        thucThu: Number(hd.thucThu),
        phuongThucThanhToan: hd.phuongThucThanhToan,
        trangThai: hd.trangThai,
        ngayTao: hd.ngayTao,
        ngayThanhToan: hd.ngayThanhToan,
        soLuongItem: hd.chiTiet ? hd.chiTiet.length : 0,
      })),
    };
  }

  /**
   * Chi tiết hóa đơn
   */
  async getChiTietHoaDon(id: number) {
    const hd = await this.hoaDonRepo.findOne({
      where: { id },
      relations: ['benhNhan', 'thuNgan', 'chiTiet'],
    });

    if (!hd) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }

    return {
      message: 'Lấy chi tiết hóa đơn thành công',
      data: {
        ...hd,
        tongTien: Number(hd.tongTien),
        soTienGiam: Number(hd.soTienGiam),
        thucThu: Number(hd.thucThu),
        chiTiet: hd.chiTiet.map((ct) => ({
          ...ct,
          donGia: Number(ct.donGia),
          thanhTien: Number(ct.thanhTien),
        })),
      },
    };
  }

  /**
   * Tự động tạo / cập nhật Hóa đơn từ lượt khám bệnh (Tổng hợp Khám + Cận lâm sàng + Đơn thuốc + BHYT)
   */
  async taoHoacCapNhatTuLuotKham(luotTiepNhanId: number, apDungBhyt?: boolean) {
    const luot = await this.tiepNhanRepo.findOne({
      where: { id: luotTiepNhanId },
      relations: ['benhNhan'],
    });

    if (!luot) {
      throw new NotFoundException('Không tìm thấy lượt tiếp nhận');
    }

    // 1. Kiểm tra hóa đơn đã có chưa
    let hd = await this.hoaDonRepo.findOne({
      where: { luotTiepNhanId },
      relations: ['chiTiet'],
    });

    const count = await this.hoaDonRepo.count();
    const maHoaDon = hd ? hd.maHoaDon : MaGeneratorService.generateMaHoaDon(count + 1);

    if (!hd) {
      hd = this.hoaDonRepo.create({
        maHoaDon,
        benhNhanId: luot.benhNhanId,
        luotTiepNhanId,
        trangThai: 'cho_thanh_toan',
        tongTien: 0,
        soTienGiam: 0,
        thucThu: 0,
        chiTiet: [],
      });
    }

    // 2. Tổng hợp các khoản viện phí từ Phiếu Khám thực tế
    const items: Partial<HoaDonChiTiet>[] = [
      {
        loaiPhi: 'kham_benh',
        moTa: 'Phí khám bệnh chuyên khoa',
        soLuong: 1,
        donGia: 150000,
        thanhTien: 150000,
      },
    ];

    const bak = await this.benhAnRepo.findOne({
      where: { luotTiepNhanId },
    });

    if (bak) {
      // 2.1 Lấy danh sách Chỉ định Cận lâm sàng (Xét nghiệm / CĐHA)
      const clsList = await this.clsRepo.find({
        where: { benhAnKhamId: bak.id },
        relations: ['dichVu'],
      });

      clsList.forEach((cd) => {
        const gia = Number(cd.dichVu?.gia || 80000);
        items.push({
          loaiPhi: cd.dichVu?.loai === 'cdha' ? 'cdha' : 'xet_nghiem',
          moTa: `Dịch vụ CLS: ${cd.dichVu?.tenDichVu || 'Xét nghiệm'}`,
          soLuong: 1,
          donGia: gia,
          thanhTien: gia,
        });
      });

      // 2.2 Lấy danh sách Thuốc kê đơn
      const donThuocList = await this.donThuocRepo.find({
        where: { benhAnKhamId: bak.id },
        relations: ['chiTiet', 'chiTiet.thuoc'],
      });

      donThuocList.forEach((dt) => {
        if (dt.chiTiet && dt.chiTiet.length > 0) {
          dt.chiTiet.forEach((ct) => {
            const donGia = Number(ct.thuoc?.giaBan || 10000);
            const soLuong = Number(ct.soLuong || 1);
            items.push({
              loaiPhi: 'thuoc',
              moTa: `Thuốc: ${ct.thuoc?.tenThuoc || 'Thuốc'} (${ct.soLuong} ${ct.thuoc?.donViTinh || 'đơn vị'})`,
              soLuong,
              donGia,
              thanhTien: donGia * soLuong,
            });
          });
        }
      });
    }

    const tongTien = items.reduce((acc, cur) => acc + (cur.thanhTien || 0), 0);

    // 3. Tính toán BHYT: Mức hưởng 80% chuẩn BHYT Việt Nam
    const coBhyt = apDungBhyt ?? (Boolean(luot.benhNhan?.soCmnd) || (luot.ghiChu || '').toLowerCase().includes('bhyt'));
    const soTienGiam = coBhyt ? Math.round(tongTien * 0.8) : Number(hd.soTienGiam || 0);
    const thucThu = Math.max(0, tongTien - soTienGiam);

    hd.tongTien = tongTien;
    hd.soTienGiam = soTienGiam;
    hd.thucThu = thucThu;
    hd.ghiChu = coBhyt
      ? `BHYT chi trả 80% danh mục viện phí (Giảm ${soTienGiam.toLocaleString('vi-VN')} đ)`
      : (hd.ghiChu || 'Khám dịch vụ tự chi trả');

    // Xóa chi tiết cũ nếu đã lưu
    if (hd.id) {
      await this.hoaDonChiTietRepo.delete({ hoaDonId: hd.id });
    }

    const saved = await this.hoaDonRepo.save(hd);

    const chiTietEntities = items.map((it) =>
      this.hoaDonChiTietRepo.create({
        ...it,
        hoaDonId: saved.id,
      })
    );
    await this.hoaDonChiTietRepo.save(chiTietEntities);

    const fullHd = await this.hoaDonRepo.findOne({
      where: { id: saved.id },
      relations: ['benhNhan', 'chiTiet'],
    });

    return {
      message: 'Tạo hóa đơn tổng hợp viện phí thành công',
      data: fullHd,
    };
  }

  /**
   * Thu ngân Xác nhận Thanh toán (Hỗ trợ BHYT, Tiền mặt, Chuyển khoản, POS)
   */
  async xacNhanThanhToan(
    id: number,
    userId: number,
    dto: { phuongThucThanhToan: string; soTienGiam?: number; ghiChu?: string; apDungBhyt?: boolean },
  ) {
    const hd = await this.hoaDonRepo.findOne({
      where: { id },
      relations: ['benhNhan', 'luotTiepNhan'],
    });
    if (!hd) {
      throw new NotFoundException('Không tìm thấy hóa đơn');
    }

    if (hd.trangThai === 'da_thanh_toan') {
      throw new BadRequestException('Hóa đơn này đã được thanh toán trước đó');
    }

    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });

    const tongTien = Number(hd.tongTien);
    let soTienGiam = Number(dto.soTienGiam);

    // Nếu chọn thanh toán hình thức BHYT hoặc gắn cờ apDungBhyt mà chưa nhập soTienGiam
    if ((dto.phuongThucThanhToan === 'bao_hiem' || dto.apDungBhyt) && (isNaN(soTienGiam) || soTienGiam === 0)) {
      soTienGiam = Math.round(tongTien * 0.8);
    } else if (isNaN(soTienGiam)) {
      soTienGiam = Number(hd.soTienGiam || 0);
    }

    const thucThu = Math.max(0, tongTien - soTienGiam);

    hd.trangThai = 'da_thanh_toan';
    hd.phuongThucThanhToan = dto.phuongThucThanhToan || 'tien_mat';
    hd.soTienGiam = soTienGiam;
    hd.thucThu = thucThu;
    hd.ngayThanhToan = new Date();
    if (nv) hd.thuNganId = nv.id;
    if (dto.ghiChu) {
      hd.ghiChu = dto.ghiChu;
    } else if (dto.phuongThucThanhToan === 'bao_hiem' || dto.apDungBhyt) {
      hd.ghiChu = `Đã khấu trừ BHYT 80% (~${soTienGiam.toLocaleString('vi-VN')} đ). Thu thực tế: ${thucThu.toLocaleString('vi-VN')} đ`;
    }

    const updated = await this.hoaDonRepo.save(hd);

    // Cập nhật trạng thái lượt tiếp nhận sang hoàn thành
    if (hd.luotTiepNhanId) {
      await this.tiepNhanRepo.update(hd.luotTiepNhanId, {
        trangThai: 'hoan_thanh' as any,
      });
    }

    return {
      message: 'Xác nhận thanh toán hóa đơn thành công',
      data: updated,
    };
  }

  /**
   * UC 56: Báo cáo Thống kê Doanh thu Thu ngân
   */
  async getThongKeThuNgan(query: { range?: string; tuNgay?: string; denNgay?: string }) {
    const qb = this.hoaDonRepo.createQueryBuilder('hd')
      .leftJoinAndSelect('hd.benhNhan', 'bn')
      .leftJoinAndSelect('hd.thuNgan', 'tn')
      .leftJoinAndSelect('hd.chiTiet', 'ct')
      .orderBy('hd.ngayThanhToan', 'DESC');

    const now = new Date();

    if (query.tuNgay && query.denNgay) {
      qb.andWhere('hd.ngayThanhToan >= :tuNgay AND hd.ngayThanhToan <= :denNgay', {
        tuNgay: query.tuNgay + ' 00:00:00',
        denNgay: query.denNgay + ' 23:59:59',
      });
    } else {
      let startDate: Date;
      switch (query.range) {
        case 'tuan_nay':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
          break;
        case 'thang_nay':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'hom_nay':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
      }
      qb.andWhere('hd.ngayThanhToan >= :startDate', { startDate });
    }

    const allInvoices = await qb.getMany();

    const daThanhToan = allInvoices.filter(h => h.trangThai === 'da_thanh_toan');
    const tongThucThu = daThanhToan.reduce((s, h) => s + Number(h.thucThu), 0);
    const tongTienGiam = daThanhToan.reduce((s, h) => s + Number(h.soTienGiam || 0), 0);

    const choThanhToanCount = await this.hoaDonRepo.count({ where: { trangThai: 'cho_thanh_toan' } });

    // Theo phương thức thanh toán
    const byPhuongThuc: Record<string, number> = {};
    daThanhToan.forEach(h => {
      const pt = h.phuongThucThanhToan || 'tien_mat';
      byPhuongThuc[pt] = (byPhuongThuc[pt] || 0) + Number(h.thucThu);
    });

    // Biểu đồ theo giờ hôm nay
    const rawHourly = await this.hoaDonRepo.createQueryBuilder('hd')
      .select('HOUR(hd.ngayThanhToan)', 'gio')
      .addSelect('SUM(hd.thucThu)', 'tien')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .andWhere('DATE(hd.ngayThanhToan) = CURDATE()')
      .groupBy('HOUR(hd.ngayThanhToan)')
      .getRawMany();

    const chartTheoGio = Array.from({ length: 10 }, (_, i) => {
      const gio = i + 8; // 8:00 - 17:00
      const found = rawHourly.find(h => Number(h.gio) === gio);
      return {
        gio: `${gio}:00`,
        tien: found ? Number(found.tien) : 0,
      };
    });

    return {
      success: true,
      data: {
        tongThucThu,
        tongTienGiam,
        soHoaDonDaThu: daThanhToan.length,
        soHoaDonChoThu: choThanhToanCount,
        byPhuongThuc,
        chartTheoGio,
        giaoDichGanNhat: daThanhToan.slice(0, 10).map(h => ({
          id: h.id,
          maHoaDon: h.maHoaDon,
          benhNhanTen: h.benhNhan?.hoTen,
          benhNhanSdt: h.benhNhan?.soDienThoai,
          thucThu: Number(h.thucThu),
          phuongThuc: h.phuongThucThanhToan,
          ngayThanhToan: h.ngayThanhToan,
          thuNganTen: h.thuNgan?.hoTen,
        })),
      },
    };
  }
}
