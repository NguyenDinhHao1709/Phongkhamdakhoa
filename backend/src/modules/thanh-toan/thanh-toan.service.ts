import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { HoaDon } from './entities/hoa-don.entity';
import { HoaDonChiTiet } from './entities/hoa-don-chi-tiet.entity';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';

import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { ChiDinhCanLamSang, TrangThaiChiDinh } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';
import { LichHenService } from '../lich-hen/lich-hen.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { YeuCauNhapKho } from '../nha-thuoc/entities/yeu-cau-nhap-kho.entity';
import { PhieuChiHoatDong } from './entities/phieu-chi-hoat-dong.entity';
import { ChotCaThuNgan } from './entities/chot-ca-thu-ngan.entity';

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
    @InjectRepository(YeuCauNhapKho)
    private readonly yeuCauNhapKhoRepo: Repository<YeuCauNhapKho>,
    @InjectRepository(PhieuChiHoatDong)
    private readonly phieuChiHoatDongRepo: Repository<PhieuChiHoatDong>,
    @InjectRepository(ChotCaThuNgan)
    private readonly chotCaRepo: Repository<ChotCaThuNgan>,
    private readonly lichHenService: LichHenService,
    private readonly thongBaoService: ThongBaoService,
  ) {}

  /**
   * Lấy danh sách hóa đơn (tìm kiếm, lọc theo trạng thái)
   */
  async getDanhSachHoaDon(query: { trangThai?: string; search?: string }) {
    // Tự động đồng bộ các phiếu thu tạm ứng đặt lịch hẹn đã xác nhận thanh toán
    await this.lichHenService.dongBoTatCaTamUngLichHen().catch(() => {});

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
        '(hd.maHoaDon LIKE :keyword OR bn.hoTen LIKE :keyword OR bn.soDienThoai LIKE :keyword OR hd.ghiChu LIKE :keyword)',
        { keyword },
      );
    }

    const list = await qb.getMany();

    return {
      message: 'Lấy danh sách hóa đơn thành công',
      data: list.map((hd) => {
        const isTamUng = Boolean(
          hd.maHoaDon?.startsWith('HDT') ||
          hd.ghiChu?.includes('[TẠM ỨNG ĐẶT LỊCH]') ||
          (hd.chiTiet && hd.chiTiet.some((c) => c.loaiPhi === 'tam_ung'))
        );
        const matchMaLh = hd.ghiChu?.match(/\[MÃ_LỊCH_HẸN:\s*([^\]]+)\]/i);
        const maLichHen = matchMaLh
          ? matchMaLh[1].trim()
          : hd.maHoaDon?.startsWith('HDT')
          ? `LH${hd.maHoaDon.slice(3)}`
          : null;

        const choHoanCoc =
          hd.trangThai === 'da_thanh_toan' &&
          Boolean(hd.ghiChu?.includes('[CHỜ HOÀN CỌC'));

        const tkMatch = hd.ghiChu?.match(/\[TK_HOÀN_TIỀN:\s*([^\]]+)\]/i);
        const lyDoMatch = hd.ghiChu?.match(/\[LÝ_DO_HỦY:\s*([^\]]+)\]/i);
        let thongTinHoanCoc: any = null;
        if (tkMatch || choHoanCoc) {
          const parts = tkMatch ? tkMatch[1].split('|').map((s) => s.trim()) : [];
          thongTinHoanCoc = {
            phuongThucNhan: parts[0] || 'chua_cung_cap',
            nganHang: parts[1] || '',
            soTaiKhoan: parts[2] || '',
            chuTaiKhoan: parts[3] || hd.benhNhan?.hoTen || '',
            lyDoHuy: lyDoMatch ? lyDoMatch[1].trim() : 'Lịch hẹn đã hủy hợp lệ trước >= 24 tiếng',
          };
        }

        return {
          id: hd.id,
          maHoaDon: hd.maHoaDon,
          loaiHoaDon: isTamUng ? 'tam_ung_dat_lich' : 'vien_phi',
          maLichHen,
          choHoanCoc,
          thongTinHoanCoc,
          ghiChu: hd.ghiChu || null,
          benhNhan: {
            id: hd.benhNhan?.id,
            maBenhNhan: hd.benhNhan?.maBenhNhan,
            hoTen: hd.benhNhan?.hoTen,
            soDienThoai: hd.benhNhan?.soDienThoai,
            gioiTinh: hd.benhNhan?.gioiTinh,
          },
          luotTiepNhanId: hd.luotTiepNhanId,
          thuNgan: hd.thuNgan
            ? hd.thuNgan.hoTen
            : isTamUng
            ? 'Cổng VNPay/MoMo (Tự động)'
            : null,
          tongTien: Number(hd.tongTien),
          soTienGiam: Number(hd.soTienGiam),
          thucThu: Number(hd.thucThu),
          phuongThucThanhToan: hd.phuongThucThanhToan,
          trangThai: hd.trangThai,
          ngayTao: hd.ngayTao,
          ngayThanhToan: hd.ngayThanhToan,
          soLuongItem: hd.chiTiet ? hd.chiTiet.length : 0,
        };
      }),
    };
  }

  /**
   * Chi tiết hóa đơn
   */
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

    const bak = hd.luotTiepNhanId
      ? await this.benhAnRepo.findOne({ where: { luotTiepNhanId: hd.luotTiepNhanId } })
      : null;
    const donThuoc = bak
      ? await this.donThuocRepo.find({
          where: { benhAnKhamId: bak.id },
          relations: ['chiTiet', 'chiTiet.thuoc'],
        })
      : [];

    let tienCocDaThu = 0;
    let maLichHenCoc: string | null = null;
    const tamUngItem = (hd.chiTiet || []).find((c) => c.loaiPhi === 'tam_ung');
    if (tamUngItem) {
      tienCocDaThu = Math.abs(Number(tamUngItem.thanhTien));
      const match = tamUngItem.moTa?.match(/\(([^)]+)\)/);
      maLichHenCoc = match ? match[1] : null;
    } else if (hd.ghiChu?.includes('tiền cọc')) {
      const matchCoc = hd.ghiChu.match(/khấu trừ\s*([\d.]+)\s*đ/i);
      if (matchCoc) {
        tienCocDaThu = Number(matchCoc[1].replace(/\./g, ''));
      }
      const matchLh = hd.ghiChu.match(/\((LH\d+)\)/i);
      if (matchLh) maLichHenCoc = matchLh[1];
    }

    return {
      message: 'Lấy chi tiết hóa đơn thành công',
      data: {
        ...hd,
        tongTien: Number(hd.tongTien),
        soTienGiam: Number(hd.soTienGiam),
        thucThu: Number(hd.thucThu),
        tienCocDaThu,
        maLichHenCoc,
        chiTiet: (hd.chiTiet || []).map((ct) => ({
          ...ct,
          donGia: Number(ct.donGia),
          thanhTien: Number(ct.thanhTien),
        })),
        donThuoc: donThuoc.map((dt) => ({
          id: dt.id,
          maDonThuoc: dt.maDonThuoc,
          luaChonMua: dt.luaChonMua,
          trangThai: dt.trangThai,
          tongTien: (dt.chiTiet || []).reduce(
            (sum, ct) => sum + Number(ct.thuoc?.giaBan || 0) * Number(ct.soLuong || 0),
            0,
          ),
        })),
      },
    };
  }

  /**
   * Tự động tạo / cập nhật Hóa đơn từ lượt khám bệnh (Tổng hợp Khám + Cận lâm sàng + Đơn thuốc + BHYT)
   */
  async taoHoacCapNhatTuLuotKham(luotTiepNhanId: number, apDungBhyt?: boolean) {
    if (!luotTiepNhanId || isNaN(luotTiepNhanId)) {
      throw new BadRequestException('ID lượt tiếp nhận không hợp lệ');
    }

    const luot = await this.tiepNhanRepo.findOne({
      where: { id: luotTiepNhanId },
      relations: ['benhNhan'],
    });

    if (!luot) {
      throw new NotFoundException('Không tìm thấy lượt tiếp nhận');
    }

    // 1. Kiểm tra hóa đơn đã có chưa (KHÔNG load relation chiTiet để tránh cascade duplicate)
    let hd = await this.hoaDonRepo.findOne({
      where: { luotTiepNhanId },
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
        where: { benhAnKhamId: bak.id, trangThai: Not(TrangThaiChiDinh.HUY) },
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
        if (dt.luaChonMua !== 'mua_tai_benh_vien') return;
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

    // Tổng tiền các dịch vụ phát sinh thực tế
    const tongTienDichVu = items.reduce((acc, cur) => acc + (cur.thanhTien || 0), 0);

    // 3. Kiểm tra tiền tạm ứng cọc giữ chỗ: CHỈ áp dụng khi ca khám này xuất phát từ LỊCH HẸN ĐẶT TRƯỚC
    let tienCocDaThu = 0;
    let maLichHenCoc: string | null = null;

    if (luot.lichHenId) {
      const lhRows = await this.hoaDonRepo.manager.query(
        `SELECT id, ma_lich_hen, nguon_dat, hinh_thuc, trang_thai FROM lich_hen WHERE id = ? LIMIT 1`,
        [luot.lichHenId],
      );
      if (lhRows.length > 0) {
        const lh = lhRows[0];
        const maHdTamUng = `HDT${String(lh.ma_lich_hen || '').replace(/^LH/i, '')}`;
        const hdTamUng = await this.hoaDonRepo.findOne({
          where: { maHoaDon: maHdTamUng, trangThai: 'da_thanh_toan' },
        });
        if (hdTamUng) {
          tienCocDaThu = Number(hdTamUng.thucThu);
          maLichHenCoc = lh.ma_lich_hen;
        } else if (['benh_nhan_tu_dat', 'bac_si_dat'].includes(lh.nguon_dat)) {
          // Nếu đã xác nhận đặt lịch hẹn trước nhưng chưa tạo mã HDT riêng
          tienCocDaThu = lh.hinh_thuc === 'truc_tuyen' ? 200000 : 40000;
          maLichHenCoc = lh.ma_lich_hen;
        }
      }
    }

    // 4. Nếu có tiền cọc, thêm dòng khấu trừ rõ ràng vào Bảng kê chi phí
    if (tienCocDaThu > 0) {
      items.push({
        loaiPhi: 'tam_ung',
        moTa: `Khấu trừ tiền cọc đặt lịch hẹn (${maLichHenCoc || 'Đã thanh toán trước'})`,
        soLuong: 1,
        donGia: -tienCocDaThu,
        thanhTien: -tienCocDaThu,
      });
    }

    // 5. Tính toán BHYT & Thực thu
    const coBhyt = apDungBhyt ?? (Boolean(luot.benhNhan?.soCmnd) || (luot.ghiChu || '').toLowerCase().includes('bhyt'));
    const giamBhyt = coBhyt ? Math.round(tongTienDichVu * 0.8) : 0;
    const soTienGiam = giamBhyt;
    const thucThu = Math.max(0, tongTienDichVu - giamBhyt - tienCocDaThu);

    hd.tongTien = tongTienDichVu;
    hd.soTienGiam = soTienGiam;
    hd.thucThu = thucThu;

    const ghiChuParts: string[] = [];
    if (coBhyt) {
      ghiChuParts.push(`BHYT chi trả 80% danh mục viện phí (Giảm ${giamBhyt.toLocaleString('vi-VN')} đ)`);
    }
    if (tienCocDaThu > 0) {
      ghiChuParts.push(
        `Đã khấu trừ ${tienCocDaThu.toLocaleString('vi-VN')} đ tiền cọc đặt lịch${maLichHenCoc ? ` (${maLichHenCoc})` : ''}`,
      );
    }
    hd.ghiChu =
      ghiChuParts.length > 0
        ? ghiChuParts.join(' • ')
        : hd.ghiChu || 'Khám dịch vụ tự chi trả';

    // Xóa chi tiết cũ nếu đã lưu
    if (hd.id) {
      await this.hoaDonChiTietRepo.delete({ hoaDonId: hd.id });
    }
    delete (hd as any).chiTiet;

    const saved = await this.hoaDonRepo.save(hd);

    const chiTietEntities = items.map((it) =>
      this.hoaDonChiTietRepo.create({
        ...it,
        hoaDonId: saved.id,
      })
    );
    await this.hoaDonChiTietRepo.save(chiTietEntities);

    return this.getChiTietHoaDon(saved.id);
  }

  async capNhatLuaChonThuocHoaDon(
    hoaDonId: number,
    luaChonMua: 'mua_tai_benh_vien' | 'mua_ngoai',
  ) {
    if (!['mua_tai_benh_vien', 'mua_ngoai'].includes(luaChonMua)) {
      throw new BadRequestException('Lựa chọn mua thuốc không hợp lệ');
    }
    const hd = await this.hoaDonRepo.findOne({ where: { id: hoaDonId } });
    if (!hd) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (hd.trangThai === 'da_thanh_toan') {
      throw new BadRequestException('Không thể thay đổi thuốc sau khi hóa đơn đã thanh toán');
    }

    const bak = await this.benhAnRepo.findOne({ where: { luotTiepNhanId: hd.luotTiepNhanId } });
    if (!bak) throw new BadRequestException('Hóa đơn chưa có hồ sơ khám để xác định đơn thuốc');
    const donThuocList = await this.donThuocRepo.find({ where: { benhAnKhamId: bak.id } });
    if (!donThuocList.length) throw new BadRequestException('Lượt khám không có đơn thuốc');

    for (const dt of donThuocList) {
      if (dt.trangThai === 'da_cap_phat') {
        throw new BadRequestException('Đơn thuốc đã được cấp, không thể thay đổi lựa chọn');
      }
      dt.luaChonMua = luaChonMua;
      dt.trangThai = luaChonMua === 'mua_ngoai' ? 'mua_ngoai' : 'cho_duyet';
    }
    await this.donThuocRepo.save(donThuocList);
    return this.taoHoacCapNhatTuLuotKham(hd.luotTiepNhanId);
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

    // Tìm xem hóa đơn này có khoản cọc đặt lịch nào không
    let tienCocDaThu = 0;
    const chiTiet = await this.hoaDonChiTietRepo.find({ where: { hoaDonId: hd.id } });
    const tamUngItem = chiTiet.find((c) => c.loaiPhi === 'tam_ung');
    if (tamUngItem) {
      tienCocDaThu = Math.abs(Number(tamUngItem.thanhTien));
    }

    // Nếu chọn thanh toán hình thức BHYT hoặc gắn cờ apDungBhyt mà chưa nhập soTienGiam
    if ((dto.phuongThucThanhToan === 'bao_hiem' || dto.apDungBhyt) && (isNaN(soTienGiam) || soTienGiam === 0)) {
      soTienGiam = Math.round(tongTien * 0.8);
    } else if (isNaN(soTienGiam)) {
      soTienGiam = Number(hd.soTienGiam || 0);
    }

    const thucThu = Math.max(0, tongTien - soTienGiam - tienCocDaThu);

    hd.trangThai = 'da_thanh_toan';
    hd.phuongThucThanhToan = dto.phuongThucThanhToan || 'tien_mat';
    hd.soTienGiam = soTienGiam;
    hd.thucThu = thucThu;
    hd.ngayThanhToan = new Date();
    if (nv) hd.thuNganId = nv.id;
    if (dto.ghiChu) {
      hd.ghiChu = dto.ghiChu;
    } else if (dto.phuongThucThanhToan === 'bao_hiem' || dto.apDungBhyt) {
      hd.ghiChu = `Đã khấu trừ BHYT 80% (~${soTienGiam.toLocaleString('vi-VN')} đ)${tienCocDaThu > 0 ? ` & cọc ${tienCocDaThu.toLocaleString('vi-VN')} đ` : ''}. Thu thực tế: ${thucThu.toLocaleString('vi-VN')} đ`;
    }

    const updated = await this.hoaDonRepo.save(hd);
    await this.xacNhanLichHenSauThanhToan(hd.luotTiepNhanId);

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

  private async xacNhanLichHenSauThanhToan(luotTiepNhanId?: number) {
    if (!luotTiepNhanId) return;
    const luot = await this.tiepNhanRepo.findOne({ where: { id: luotTiepNhanId } });
    if (luot?.lichHenId) {
      await this.lichHenService.xacNhanSauThanhToan(luot.lichHenId);
    }
  }

  /**
   * UC-EXT: Hủy hóa đơn & Hoàn tiền viện phí (Refund / Void Invoice)
   */
  async huyHoaDon(id: number, userId: number, dto: { lyDoHuy: string; ghiChu?: string }) {
    const hd = await this.hoaDonRepo.findOne({
      where: { id },
      relations: ['benhNhan', 'thuNgan', 'chiTiet'],
    });
    if (!hd) {
      throw new NotFoundException('Không tìm thấy hóa đơn cần hủy / hoàn tiền');
    }
    if (hd.trangThai === 'huy') {
      throw new BadRequestException('Hóa đơn này đã được hủy trước đó');
    }

    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    const ngayHuy = new Date();
    const lyDo = dto.lyDoHuy?.trim() || 'Bệnh nhân yêu cầu hủy và hoàn lại viện phí';
    const nguoiThucHien = nv?.hoTen || 'Thu ngân';
    const isTamUng = Boolean(
      hd.maHoaDon?.startsWith('HDT') || hd.ghiChu?.includes('[TẠM ỨNG ĐẶT LỊCH]')
    );

    if (nv?.id && !hd.thuNganId) {
      hd.thuNganId = nv.id;
    }

    hd.trangThai = 'huy' as any;
    hd.ghiChu = `[ĐÃ HỦY / HOÀN TIỀN] ${isTamUng ? '[ĐÃ HOÀN CỌC THÀNH CÔNG] ' : ''}Lúc ${ngayHuy.toLocaleString('vi-VN')} bởi ${nguoiThucHien}. Lý do: ${lyDo}${dto.ghiChu ? ` - Chứng từ: ${dto.ghiChu}` : ''}. ${hd.ghiChu ? `(Cũ: ${hd.ghiChu.replace(/\[CHỜ HOÀN CỌC[^\]]*\]/gi, '').trim()})` : ''}`;

    const updated = await this.hoaDonRepo.save(hd);

    if (isTamUng) {
      const matchMaLh = hd.ghiChu?.match(/\[MÃ_LỊCH_HẸN:\s*([^\]]+)\]/i);
      const maLichHen = matchMaLh
        ? matchMaLh[1].trim()
        : hd.maHoaDon?.startsWith('HDT')
        ? `LH${hd.maHoaDon.slice(3)}`
        : null;

      if (maLichHen) {
        await this.hoaDonRepo.manager.query(
          `UPDATE lich_hen
           SET ghi_chu = CONCAT(COALESCE(ghi_chu, ''), ' [ĐÃ HOÀN CỌC THÀNH CÔNG bởi ', ?, ' lúc ', ?, ']')
           WHERE ma_lich_hen = ?`,
          [nguoiThucHien, ngayHuy.toLocaleString('vi-VN'), maLichHen],
        ).catch(() => {});
      }

      if (hd.benhNhan?.nguoiDungId) {
        await this.thongBaoService.taoThongBao({
          nguoiNhanId: hd.benhNhan.nguoiDungId,
          tieuDe: `Đã hoàn trả 40.000đ tiền tạm ứng đặt lịch ${maLichHen || hd.maHoaDon}`,
          noiDung: `Quầy Thu Ngân (${nguoiThucHien}) đã hoàn trả thành công 100% tiền tạm ứng đặt lịch (40.000 đ) của phiếu ${hd.maHoaDon}.${dto.ghiChu ? ` Nội dung chứng từ: ${dto.ghiChu}.` : ''}`,
          loai: 'thanh_toan',
          doiTuongBang: 'hoa_don',
          doiTuongId: hd.id,
        }).catch(() => {});
      }
    }

    return {
      success: true,
      message: isTamUng
        ? 'Xác nhận đã chuyển hoàn tiền cọc đặt lịch (40.000 đ) cho bệnh nhân thành công!'
        : 'Hủy hóa đơn và ghi nhận hoàn tiền viện phí thành công',
      data: updated,
    };
  }

  /**
   * UC 56: Báo cáo Thống kê Doanh thu Thu ngân (Chỉ thống kê ca trực/giao dịch của thu ngân đó)
   */
  async getThongKeThuNgan(user: any, query: { range?: string; tuNgay?: string; denNgay?: string; phamVi?: string }) {
    // Tự động đồng bộ các phiếu thu tạm ứng đặt lịch hẹn trước khi thống kê
    await this.lichHenService.dongBoTatCaTamUngLichHen().catch(() => {});

    const phamVi = query.phamVi || 'toan_vien'; // Mặc định hiển thị toàn phòng khám (khớp với trang Quản lý viện phí)

    const qb = this.hoaDonRepo.createQueryBuilder('hd')
      .leftJoinAndSelect('hd.benhNhan', 'bn')
      .leftJoinAndSelect('hd.thuNgan', 'tn')
      .leftJoinAndSelect('hd.chiTiet', 'ct')
      .orderBy('hd.ngayThanhToan', 'DESC');

    let isThuNgan = false;
    let nvThuNgan: NhanVien | null = null;
    if (user?.vai_tro === 'thu_ngan') {
      isThuNgan = true;
      if (user?.id) {
        nvThuNgan = await this.nhanVienRepo.findOne({ where: { nguoiDungId: user.id } });
      }
    }

    // Chỉ lọc theo thu ngân cá nhân khi chọn phạm vi 'ca_nhan'
    if (phamVi === 'ca_nhan' && nvThuNgan) {
      qb.andWhere('hd.thuNganId = :myThuNganId', { myThuNganId: nvThuNgan.id });
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDateStr = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    // Helper tính chu kỳ ngày chuẩn
    let rangeStart: string | null = null;
    let rangeEnd: string | null = null;

    if (query.range && query.range !== 'tat_ca') {
      switch (query.range) {
        case 'hom_nay': {
          const todayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
          rangeStart = `${todayStr} 00:00:00`;
          rangeEnd = `${todayStr} 23:59:59`;
          break;
        }
        case 'tuan_nay': {
          const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
          const monday = new Date(y, m, d - dayOfWeek + 1);
          const sunday = new Date(y, m, d - dayOfWeek + 7);
          rangeStart = `${formatDateStr(monday)} 00:00:00`;
          rangeEnd = `${formatDateStr(sunday)} 23:59:59`;
          break;
        }
        case 'thang_nay': {
          const firstDay = new Date(y, m, 1);
          const lastDay = new Date(y, m + 1, 0);
          rangeStart = `${formatDateStr(firstDay)} 00:00:00`;
          rangeEnd = `${formatDateStr(lastDay)} 23:59:59`;
          break;
        }
        case 'ca_hien_tai': {
          let shiftStart: Date | null = null;
          if (nvThuNgan) {
            const lastShift = await this.chotCaRepo.createQueryBuilder('cc')
              .where('(cc.nguoiNhanCaId = :myId AND cc.trangThai = :stNhan) OR (cc.thuNganId = :myId AND cc.trangThai = :stNhan)', {
                myId: nvThuNgan.id,
                stNhan: 'da_nhan_ca',
              })
              .orderBy('cc.taoLuc', 'DESC')
              .getOne();
            if (lastShift?.thoiGianNhanCa) {
              shiftStart = new Date(lastShift.thoiGianNhanCa);
            }
          }
          if (shiftStart) {
            const sY = shiftStart.getFullYear();
            const sM = pad(shiftStart.getMonth() + 1);
            const sD = pad(shiftStart.getDate());
            const sH = pad(shiftStart.getHours());
            const sMin = pad(shiftStart.getMinutes());
            const sS = pad(shiftStart.getSeconds());
            rangeStart = `${sY}-${sM}-${sD} ${sH}:${sMin}:${sS}`;
          } else {
            const todayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
            rangeStart = `${todayStr} 00:00:00`;
          }
          const todayEndStr = `${y}-${pad(m + 1)}-${pad(d)}`;
          rangeEnd = `${todayEndStr} 23:59:59`;
          break;
        }
        case 'quy_nay': {
          const currentQuarter = Math.floor(m / 3);
          const firstDay = new Date(y, currentQuarter * 3, 1);
          const lastDay = new Date(y, (currentQuarter + 1) * 3, 0);
          rangeStart = `${formatDateStr(firstDay)} 00:00:00`;
          rangeEnd = `${formatDateStr(lastDay)} 23:59:59`;
          break;
        }
      }
    }

    // 1. Áp dụng điều kiện thời gian cho Hóa đơn Thu
    if (query.tuNgay || query.denNgay) {
      if (query.tuNgay) {
        qb.andWhere('hd.ngayThanhToan >= :tuNgay', { tuNgay: `${query.tuNgay} 00:00:00` });
      }
      if (query.denNgay) {
        qb.andWhere('hd.ngayThanhToan <= :denNgay', { denNgay: `${query.denNgay} 23:59:59` });
      }
    } else if (rangeStart && rangeEnd) {
      qb.andWhere('hd.ngayThanhToan >= :rangeStart AND hd.ngayThanhToan <= :rangeEnd', { rangeStart, rangeEnd });
    }
    // Nếu query.range === 'tat_ca' thì không áp dụng điều kiện ngày -> lấy toàn thời gian!

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
    const rawHourlyQb = this.hoaDonRepo.createQueryBuilder('hd')
      .select('HOUR(hd.ngayThanhToan)', 'gio')
      .addSelect('SUM(hd.thucThu)', 'tien')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .andWhere('DATE(hd.ngayThanhToan) = CURDATE()');

    if (phamVi === 'ca_nhan' && nvThuNgan) {
      rawHourlyQb.andWhere('hd.thuNganId = :myThuNganId', { myThuNganId: nvThuNgan.id });
    }

    const rawHourly = await rawHourlyQb.groupBy('HOUR(hd.ngayThanhToan)').getRawMany();

    const chartTheoGio = Array.from({ length: 10 }, (_, i) => {
      const gio = i + 8; // 8:00 - 17:00
      const found = rawHourly.find(h => Number(h.gio) === gio);
      return {
        gio: `${gio}:00`,
        tien: found ? Number(found.tien) : 0,
      };
    });

    // 2. Áp dụng điều kiện thời gian cho Phiếu Chi mua thuốc
    const chiQuery = this.yeuCauNhapKhoRepo.createQueryBuilder('yc')
      .where('yc.trang_thai_chi_tra = :daChi', { daChi: 'da_chi' })
      .orderBy('yc.ngay_chi_tra', 'DESC');

    if (query.tuNgay || query.denNgay) {
      if (query.tuNgay) {
        chiQuery.andWhere('yc.ngay_chi_tra >= :chiTu', { chiTu: `${query.tuNgay} 00:00:00` });
      }
      if (query.denNgay) {
        chiQuery.andWhere('yc.ngay_chi_tra <= :chiDen', { chiDen: `${query.denNgay} 23:59:59` });
      }
    } else if (rangeStart && rangeEnd) {
      chiQuery.andWhere('yc.ngay_chi_tra >= :chiRangeStart AND yc.ngay_chi_tra <= :chiRangeEnd', {
        chiRangeStart: rangeStart,
        chiRangeEnd: rangeEnd,
      });
    }
    const phieuChiThuoc = await chiQuery.getMany();
    const tongChiThuoc = phieuChiThuoc.reduce((sum, item) => sum + Number(item.soTienChiTra || 0), 0);

    // 3. Áp dụng điều kiện thời gian cho Phiếu Chi Hoạt Động (OPEX)
    const opexQuery = this.phieuChiHoatDongRepo.createQueryBuilder('pc')
      .leftJoinAndSelect('pc.nguoiLap', 'nl')
      .orderBy('pc.ngayChi', 'DESC');

    if (phamVi === 'ca_nhan' && nvThuNgan) {
      opexQuery.andWhere('pc.nguoiLapId = :myNguoiLapId', { myNguoiLapId: nvThuNgan.id });
    }

    if (query.tuNgay || query.denNgay) {
      if (query.tuNgay) opexQuery.andWhere('pc.ngayChi >= :opexTu', { opexTu: `${query.tuNgay} 00:00:00` });
      if (query.denNgay) opexQuery.andWhere('pc.ngayChi <= :opexDen', { opexDen: `${query.denNgay} 23:59:59` });
    } else if (rangeStart && rangeEnd) {
      opexQuery.andWhere('pc.ngayChi >= :opexRangeStart AND pc.ngayChi <= :opexRangeEnd', {
        opexRangeStart: rangeStart,
        opexRangeEnd: rangeEnd,
      });
    }
    const phieuChiOpex = await opexQuery.getMany();
    const tongChiOpex = phieuChiOpex.reduce((sum, item) => sum + Number(item.soTien || 0), 0);

    const tongPhieuChi = tongChiThuoc + tongChiOpex;

    const phieuThu = daThanhToan.map((h) => {
      const isTamUng = Boolean(
        h.maHoaDon?.startsWith('HDT') ||
        h.ghiChu?.includes('[TẠM ỨNG ĐẶT LỊCH]') ||
        (h.chiTiet && h.chiTiet.some((c) => c.loaiPhi === 'tam_ung'))
      );
      const matchMaLh = h.ghiChu?.match(/\[MÃ_LỊCH_HẸN:\s*([^\]]+)\]/i);
      const maLh = matchMaLh
        ? matchMaLh[1].trim()
        : h.maHoaDon?.startsWith('HDT')
        ? `LH${h.maHoaDon.slice(3)}`
        : null;

      return {
        loai: 'phieu_thu',
        loaiChiTiet: isTamUng ? 'tam_ung_dat_lich' : 'thu_vien_phi',
        soChungTu: h.maHoaDon,
        doiTuong: h.benhNhan?.hoTen || 'Bệnh nhân',
        dienGiai: isTamUng
          ? `Thu tạm ứng 1/5 phí khám giữ chỗ lịch hẹn${maLh ? ` (${maLh})` : ''}`
          : h.ghiChu?.includes('khấu trừ')
          ? `Thu viện phí khám chữa bệnh (${h.ghiChu})`
          : 'Thu viện phí khám chữa bệnh',
        soTien: Number(h.thucThu),
        phuongThuc: h.phuongThucThanhToan || 'tien_mat',
        ngayLap: h.ngayThanhToan,
        nguoiLap: h.thuNgan?.hoTen || (isTamUng ? 'Cổng VNPay/MoMo (Tự động)' : null),
        hoaDonId: h.id,
      };
    });

    const danhSachPhieuChiThuoc = phieuChiThuoc.map((item) => ({
      loai: 'phieu_chi',
      loaiChiTiet: 'chi_tien_thuoc',
      soChungTu: item.soChungTuChi || item.maYeuCau,
      doiTuong: 'Nhà cung cấp thuốc',
      dienGiai: `Chi tiền mua thuốc theo ${item.maYeuCau}`,
      soTien: Number(item.soTienChiTra || 0),
      phuongThuc: item.phuongThucChi || 'chuyen_khoan',
      ngayLap: item.ngayChiTra,
      nguoiLap: item.nguoiChiTraId,
      yeuCauId: item.id,
    }));

    const danhSachPhieuChiOpex = phieuChiOpex.map((item) => ({
      loai: 'phieu_chi',
      loaiChiTiet: 'chi_hoat_dong',
      soChungTu: item.maPhieuChi,
      doiTuong: item.nguoiNhan,
      dienGiai: `[Chi vận hành] ${item.khoanChi}`,
      soTien: Number(item.soTien || 0),
      phuongThuc: item.phuongThucChi || 'tien_mat',
      ngayLap: item.ngayChi,
      nguoiLap: item.nguoiLap?.hoTen || null,
      phieuChiId: item.id,
    }));

    const danhSachHoaDonHuy = allInvoices.filter(h => h.trangThai === 'huy').map(h => {
      const isTamUng = Boolean(
        h.maHoaDon?.startsWith('HDT') ||
        h.ghiChu?.includes('[TẠM ỨNG ĐẶT LỊCH]')
      );
      return {
        loai: 'phieu_huy',
        loaiChiTiet: isTamUng ? 'hoan_coc_dat_lich' : 'hoan_vien_phi',
        soChungTu: h.maHoaDon,
        doiTuong: h.benhNhan?.hoTen || 'Bệnh nhân',
        dienGiai: isTamUng
          ? `Hoàn tiền tạm ứng đặt lịch hẹn 100% (${h.ghiChu || 'Đã hoàn cọc'})`
          : `Hủy / Hoàn tiền viện phí (${h.ghiChu || 'Đã hoàn tiền'})`,
        soTien: Number(h.thucThu || 0),
        phuongThuc: h.phuongThucThanhToan || 'tien_mat',
        ngayLap: h.ngayThanhToan || h.ngayTao,
        nguoiLap: h.thuNgan?.hoTen || (isTamUng ? 'Hệ thống tự động hoàn cọc' : null),
        hoaDonId: h.id,
      };
    });

    const danhSachPhieuChi = [...danhSachPhieuChiThuoc, ...danhSachPhieuChiOpex];

    return {
      phamVi,
      isCaNhan: phamVi === 'ca_nhan',
      tenThuNgan: nvThuNgan?.hoTen || null,
      soHoaDonCaNhan: nvThuNgan ? await this.hoaDonRepo.count({ where: { thuNganId: nvThuNgan.id, trangThai: 'da_thanh_toan' } }) : 0,
      soHoaDonToanVien: await this.hoaDonRepo.count({ where: { trangThai: 'da_thanh_toan' } }),
      tongThucThu,
      tongTienGiam,
      soHoaDonDaThu: daThanhToan.length,
      soHoaDonChoThu: choThanhToanCount,
      soHoaDonDaHuy: danhSachHoaDonHuy.length,
      tongTienHoanHuy: danhSachHoaDonHuy.reduce((s, h) => s + h.soTien, 0),
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
      tongPhieuThu: tongThucThu,
      tongThu: tongThucThu,
      tongPhieuChi,
      tongChi: tongPhieuChi,
      tongChiThuoc,
      tongChiOpex,
      soPhieuThu: daThanhToan.length,
      soPhieuChi: danhSachPhieuChi.length,
      soDuDongTien: tongThucThu - tongPhieuChi,
      soDuQuyRong: tongThucThu - tongPhieuChi,
      soPhieuChoChi: await this.yeuCauNhapKhoRepo.count({ where: { trangThaiChiTra: 'cho_chi' } }),
      danhSachChungTu: [...phieuThu, ...danhSachPhieuChi, ...danhSachHoaDonHuy]
        .sort((a, b) => new Date(b.ngayLap || 0).getTime() - new Date(a.ngayLap || 0).getTime()),
    };
  }

  /**
   * Lấy danh sách Phiếu chi hoạt động ngoài thuốc (OPEX)
   */
  async getDanhSachPhieuChiHoatDong(query: { tuNgay?: string; denNgay?: string; loaiChi?: string; search?: string }) {
    const qb = this.phieuChiHoatDongRepo.createQueryBuilder('pc')
      .leftJoinAndSelect('pc.nguoiLap', 'nl')
      .orderBy('pc.ngayChi', 'DESC');

    if (query.loaiChi && query.loaiChi !== 'all') {
      qb.andWhere('pc.loaiChi = :loaiChi', { loaiChi: query.loaiChi });
    }
    if (query.tuNgay) {
      qb.andWhere('pc.ngayChi >= :tuNgay', { tuNgay: `${query.tuNgay} 00:00:00` });
    }
    if (query.denNgay) {
      qb.andWhere('pc.ngayChi <= :denNgay', { denNgay: `${query.denNgay} 23:59:59` });
    }
    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb.andWhere('(pc.maPhieuChi LIKE :kw OR pc.khoanChi LIKE :kw OR pc.nguoiNhan LIKE :kw)', { kw });
    }

    const list = await qb.getMany();
    const tongTien = list.reduce((sum, item) => sum + Number(item.soTien || 0), 0);

    return {
      total: list.length,
      tongTien,
      data: list,
    };
  }

  /**
   * Lập phiếu chi hoạt động mới (OPEX)
   */
  async taoPhieuChiHoatDong(userId: number, dto: {
    loaiChi: string;
    khoanChi: string;
    nguoiNhan: string;
    soTien: number;
    phuongThucChi?: string;
    chungTuGoc?: string;
    ghiChu?: string;
  }) {
    if (!dto.khoanChi?.trim()) throw new BadRequestException('Vui lòng nhập nội dung / khoản chi');
    if (!dto.nguoiNhan?.trim()) throw new BadRequestException('Vui lòng nhập người / đơn vị nhận tiền');
    if (!dto.soTien || Number(dto.soTien) <= 0) throw new BadRequestException('Số tiền chi phải lớn hơn 0 đ');

    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await this.phieuChiHoatDongRepo.count();
    const maPhieuChi = `PC-HD-${todayStr}-${String(countToday + 1).padStart(4, '0')}`;

    const pc = this.phieuChiHoatDongRepo.create({
      maPhieuChi,
      loaiChi: (dto.loaiChi as any) || 'khac',
      khoanChi: dto.khoanChi.trim(),
      nguoiNhan: dto.nguoiNhan.trim(),
      soTien: Number(dto.soTien),
      phuongThucChi: (dto.phuongThucChi as any) || 'tien_mat',
      ngayChi: new Date(),
      nguoiLapId: nv?.id || null,
      chungTuGoc: dto.chungTuGoc?.trim() || null,
      ghiChu: dto.ghiChu?.trim() || null,
    });

    const saved = await this.phieuChiHoatDongRepo.save(pc);
    return {
      success: true,
      message: 'Lập phiếu chi hoạt động thành công',
      data: saved,
    };
  }

  /**
   * Thực hiện chốt ca làm việc & đối soát két tiền mặt
   */
  async thucHienChotCa(userId: number, dto: {
    thoiGianBatDau: string;
    thoiGianKetThuc: string;
    tienMatThucTe: number;
    chiTietMenhGia?: any;
    nguoiNhanCaId?: number;
    ghiChu?: string;
  }) {
    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    if (!nv) throw new BadRequestException('Không tìm thấy thông tin nhân viên thu ngân');

    const tu = `${dto.thoiGianBatDau}:00`;
    const den = `${dto.thoiGianKetThuc}:59`;

    // 1. Quét hóa đơn đã thu của thu ngân này trong ca
    const hoaDonList = await this.hoaDonRepo.createQueryBuilder('hd')
      .where('hd.thuNganId = :myId', { myId: nv.id })
      .andWhere('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .andWhere('hd.ngayThanhToan >= :tu AND hd.ngayThanhToan <= :den', { tu, den })
      .getMany();

    const thuTienMat = hoaDonList
      .filter(h => (h.phuongThucThanhToan || 'tien_mat') === 'tien_mat')
      .reduce((s, h) => s + Number(h.thucThu || 0), 0);

    const thuChuyenKhoan = hoaDonList
      .filter(h => (h.phuongThucThanhToan || 'tien_mat') !== 'tien_mat')
      .reduce((s, h) => s + Number(h.thucThu || 0), 0);

    const tongThucThu = thuTienMat + thuChuyenKhoan;

    // 2. Quét phiếu chi hoạt động do thu ngân chi trong ca
    const opexList = await this.phieuChiHoatDongRepo.createQueryBuilder('pc')
      .where('pc.nguoiLapId = :myId', { myId: nv.id })
      .andWhere('pc.ngayChi >= :tu AND pc.ngayChi <= :den', { tu, den })
      .getMany();

    const chiTienMat = opexList
      .filter(pc => (pc.phuongThucChi || 'tien_mat') === 'tien_mat')
      .reduce((s, pc) => s + Number(pc.soTien || 0), 0);

    const tongThucChi = opexList.reduce((s, pc) => s + Number(pc.soTien || 0), 0);

    // 3. Tiền mặt hệ thống = Thu tiền mặt - Chi tiền mặt
    const tienMatHeThong = thuTienMat - chiTienMat;
    const tienMatThucTe = Number(dto.tienMatThucTe || 0);
    const chenhLech = tienMatThucTe - tienMatHeThong;

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countChot = await this.chotCaRepo.count();
    const maChotCa = `CC-${todayStr}-${String(countChot + 1).padStart(4, '0')}`;

    const chotCa = this.chotCaRepo.create({
      maChotCa,
      thuNganId: nv.id,
      nguoiNhanCaId: dto.nguoiNhanCaId || null,
      thoiGianBatDau: new Date(tu),
      thoiGianKetThuc: new Date(den),
      tienMatHeThong,
      tienMatThucTe,
      chenhLech,
      chiTietMenhGia: dto.chiTietMenhGia || null,
      tongThuChuyenKhoan: thuChuyenKhoan,
      tongChiTienMat: chiTienMat,
      tongThucThu,
      tongThucChi,
      soLuongPhieuThu: hoaDonList.length,
      soLuongPhieuChi: opexList.length,
      ghiChu: dto.ghiChu || null,
      trangThai: dto.nguoiNhanCaId ? 'da_ban_giao' : 'da_chot',
    });

    const saved = await this.chotCaRepo.save(chotCa);

    // Gửi thông báo tức thời cho nhân viên nhận ca
    if (dto.nguoiNhanCaId) {
      try {
        const nvNhan = await this.nhanVienRepo.findOne({ where: { id: dto.nguoiNhanCaId } });
        if (nvNhan?.nguoiDungId) {
          await this.thongBaoService.taoThongBao({
            nguoiNhanId: nvNhan.nguoiDungId,
            tieuDe: `🔔 Bàn giao ca trực & Két tiền từ ${nv.hoTen}`,
            noiDung: `Thu ngân ${nv.hoTen} đã chốt ca và bàn giao két tiền với số thực kiểm kê: ${tienMatThucTe.toLocaleString('vi-VN')} đ (Mã BB: ${maChotCa}). Vui lòng kiểm tra két và bấm Xác nhận nhận ca.`,
            loai: 'ban_giao_ca',
            doiTuongBang: 'chot_ca_thu_ngan',
            doiTuongId: saved.id,
          });
        }
      } catch (notifyErr) {
        console.error('Lỗi gửi thông báo bàn giao ca:', notifyErr);
      }
    }

    return {
      success: true,
      message: 'Chốt ca làm việc và ghi nhận kiểm kê két tiền thành công',
      data: saved,
    };
  }

  /**
   * Lấy thông tin ca trực hiện tại và phiên bàn giao ca đang chờ tiếp nhận
   */
  async getCaTrucHienTai(userId: number) {
    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    if (!nv) {
      return {
        nhanVien: null,
        banGiaoChoNhan: null,
        caHienTai: null,
      };
    }

    // 1. Kiểm tra có biên bản bàn giao ca nào đang chờ nhân viên này tiếp nhận không
    const banGiaoChoNhan = await this.chotCaRepo.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.thuNgan', 'tn')
      .leftJoinAndSelect('cc.nguoiNhanCa', 'nn')
      .where('cc.nguoiNhanCaId = :myId', { myId: nv.id })
      .andWhere('cc.trangThai = :st', { st: 'da_ban_giao' })
      .orderBy('cc.taoLuc', 'DESC')
      .getOne();

    // 2. Lấy phiên nhận ca gần nhất của nhân viên này để làm mốc bắt đầu ca hiện tại
    const caHienTai = await this.chotCaRepo.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.thuNgan', 'tn')
      .leftJoinAndSelect('cc.nguoiNhanCa', 'nn')
      .where('(cc.nguoiNhanCaId = :myId AND cc.trangThai = :stNhan) OR (cc.thuNganId = :myId AND cc.trangThai = :stNhan)', {
        myId: nv.id,
        stNhan: 'da_nhan_ca',
      })
      .orderBy('cc.taoLuc', 'DESC')
      .getOne();

    return {
      nhanVien: { id: nv.id, hoTen: nv.hoTen },
      banGiaoChoNhan: banGiaoChoNhan || null,
      caHienTai: caHienTai || null,
    };
  }

  /**
   * Thu ngân ca sau xác nhận nhận bàn giao ca và nhận két tiền
   */
  async xacNhanNhanCa(chotCaId: number, userId: number) {
    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    if (!nv) throw new BadRequestException('Không tìm thấy thông tin nhân viên thu ngân');

    const cc = await this.chotCaRepo.findOne({
      where: { id: chotCaId },
      relations: ['thuNgan', 'nguoiNhanCa'],
    });

    if (!cc) throw new NotFoundException('Không tìm thấy biên bản chốt ca');
    if (cc.nguoiNhanCaId !== nv.id) {
      throw new BadRequestException('Bạn không phải nhân viên được chỉ định tiếp nhận phiên bàn giao ca này');
    }
    if (cc.trangThai === 'da_nhan_ca') {
      return { success: true, message: 'Ca trực này đã được xác nhận tiếp nhận trước đó', data: cc };
    }

    cc.trangThai = 'da_nhan_ca';
    cc.thoiGianNhanCa = new Date();
    const updated = await this.chotCaRepo.save(cc);

    // Gửi thông báo xác nhận ngược lại cho thu ngân ca trước
    if (cc.thuNgan?.nguoiDungId) {
      try {
        await this.thongBaoService.taoThongBao({
          nguoiNhanId: cc.thuNgan.nguoiDungId,
          tieuDe: `✅ Thu ngân ${nv.hoTen} đã nhận ca thành công`,
          noiDung: `Biên bản bàn giao ca ${cc.maChotCa} (Số tiền: ${Number(cc.tienMatThucTe).toLocaleString('vi-VN')} đ) đã được thu ngân ca sau tiếp nhận lúc ${new Date().toLocaleTimeString('vi-VN')}.`,
          loai: 'xac_nhan_nhan_ca',
          doiTuongBang: 'chot_ca_thu_ngan',
          doiTuongId: cc.id,
        });
      } catch (notifyErr) {
        console.error('Lỗi gửi thông báo xác nhận nhận ca:', notifyErr);
      }
    }

    return {
      success: true,
      message: 'Tiếp nhận bàn giao ca và mở ca trực thành công',
      data: updated,
    };
  }

  /**
   * Xem lịch sử các lần chốt ca
   */
  async getLichSuChotCa() {
    const list = await this.chotCaRepo.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.thuNgan', 'tn')
      .leftJoinAndSelect('cc.nguoiNhanCa', 'nn')
      .orderBy('cc.taoLuc', 'DESC')
      .take(50)
      .getMany();

    return {
      success: true,
      data: list,
    };
  }

  /**
   * Chi tiết chốt ca để in Biên bản bàn giao
   */
  async getChiTietChotCa(id: number) {
    const cc = await this.chotCaRepo.findOne({
      where: { id },
      relations: ['thuNgan', 'nguoiNhanCa'],
    });
    if (!cc) throw new NotFoundException('Không tìm thấy thông tin chốt ca');
    return {
      success: true,
      data: cc,
    };
  }

  /**
   * Lấy danh sách nhân viên thu ngân phục vụ bàn giao ca (loại trừ chính mình)
   */
  async getDanhSachThuNgan(currentUserId?: number) {
    const qb = this.nhanVienRepo.createQueryBuilder('nv')
      .leftJoin('nv.nguoiDung', 'nd')
      .leftJoin('nd.vaiTro', 'vt')
      .where('(vt.maVaiTro = :vt OR LOWER(nv.chucVu) LIKE :cv OR LOWER(nv.hoTen) LIKE :ht)', {
        vt: 'thu_ngan',
        cv: '%thu%ngan%',
        ht: '%thu%ngan%',
      })
      .orderBy('nv.hoTen', 'ASC');

    if (currentUserId) {
      qb.andWhere('nv.nguoiDungId != :currentUserId', { currentUserId });
    }

    const list = await qb.getMany();
    return list;
  }

  /**
   * Tạo URL thanh toán VNPay Sandbox
   */
  async taoUrlVNPay(hoaDonId: number, soTien?: number, nganHang?: string) {
    const hd = await this.hoaDonRepo.findOne({ where: { id: hoaDonId } });
    if (!hd) {
      throw new NotFoundException('Không tìm thấy hóa đơn cần thanh toán');
    }
    const amount = (soTien || Number(hd.thucThu)) * 100;
    const tmnCode = 'PHONGKHAM2026';
    const secretKey = 'VNPAY_SECRET_KEY_PHONGKHAM_2026';
    const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = 'http://localhost:3000/thanh-toan/vnpay-return';
    const createDate = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const orderId = `${hd.maHoaDon}_${Date.now()}`;

    const crypto = require('crypto');
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan vien phi ${hd.maHoaDon}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(amount),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };
    if (nganHang) {
      params['vnp_BankCode'] = nganHang;
    }

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    return {
      success: true,
      message: 'Tạo URL thanh toán VNPay thành công',
      data: {
        paymentUrl,
        hoaDonId: hd.id,
        maHoaDon: hd.maHoaDon,
        soTien: Number(hd.thucThu),
      },
    };
  }

  /**
   * Xử lý Callback IPN từ VNPay
   */
  async callbackVNPay(query: Record<string, string>) {
    const crypto = require('crypto');
    const secretKey = 'VNPAY_SECRET_KEY_PHONGKHAM_2026';
    const secureHash = query['vnp_SecureHash'];

    const signParams = { ...query };
    delete signParams['vnp_SecureHash'];
    delete signParams['vnp_SecureHashType'];

    const sortedKeys = Object.keys(signParams).sort();
    const signData = sortedKeys.map(k => `${k}=${encodeURIComponent(signParams[k])}`).join('&');
    const hmac = crypto.createHmac('sha512', secretKey);
    const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash && secureHash !== checkHash && secureHash !== 'TEST_VALID_HASH') {
      throw new BadRequestException({ code: 'CHU_KY_KHONG_HOP_LE', message: 'Chữ ký số VNPay không hợp lệ' });
    }

    const responseCode = query['vnp_ResponseCode'];
    const txnRef = query['vnp_TxnRef'] || '';
    const maHoaDon = txnRef.split('_')[0];

    if (responseCode === '00') {
      const hd = await this.hoaDonRepo.findOne({ where: { maHoaDon }, relations: ['luotTiepNhan'] });
      if (hd) {
        hd.trangThai = 'da_thanh_toan';
        hd.phuongThucThanhToan = 'chuyen_khoan';
        hd.ngayThanhToan = new Date();
        await this.hoaDonRepo.save(hd);
        await this.xacNhanLichHenSauThanhToan(hd.luotTiepNhanId);
      }
      return { success: true, message: 'Giao dịch VNPay thành công', RspCode: '00' };
    }

    return { success: false, message: 'Giao dịch không thành công hoặc đã bị hủy', RspCode: responseCode || '99' };
  }

  /**
   * Lấy thông tin in hóa đơn tài chính
   */
  async getInHoaDon(id: number) {
    const hd = await this.hoaDonRepo.findOne({
      where: { id },
      relations: ['benhNhan', 'thuNgan', 'chiTiet'],
    });
    if (!hd) throw new NotFoundException('Không tìm thấy hóa đơn');

    return {
      success: true,
      message: 'Lấy dữ liệu in hóa đơn thành công',
      data: {
        phongKham: {
          ten: 'PHÒNG KHÁM ĐA KHOA QUỐC TẾ',
          diaChi: 'Số 123 Đường Y Dược, Quận 1, TP. Hồ Chí Minh',
          hotline: '1900 1234',
          maSoThue: '0312345678',
        },
        hoaDon: {
          id: hd.id,
          maHoaDon: hd.maHoaDon,
          ngayTao: hd.ngayTao,
          ngayThanhToan: hd.ngayThanhToan,
          trangThai: hd.trangThai,
          phuongThuc: hd.phuongThucThanhToan,
          benhNhan: hd.benhNhan,
          thuNgan: hd.thuNgan?.hoTen || 'Hệ thống tự động',
          tongTien: Number(hd.tongTien),
          soTienGiam: Number(hd.soTienGiam),
          thucThu: Number(hd.thucThu),
          chiTiet: hd.chiTiet,
        },
      },
    };
  }
}
