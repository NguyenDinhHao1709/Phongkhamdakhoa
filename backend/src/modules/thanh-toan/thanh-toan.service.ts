import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { HoaDon } from './entities/hoa-don.entity';
import { HoaDonChiTiet } from './entities/hoa-don-chi-tiet.entity';
import { LuotTiepNhan, TrangThaiTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';
import { soTiepTheo, voiKhoaDb } from '../../common/utils/db-sequence.util';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';

import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { ChiDinhCanLamSang, TrangThaiChiDinh } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';
import { LichHenService } from '../lich-hen/lich-hen.service';
import { MARKER_CHO_DUYET_HOAN } from '../lich-hen/entities/lich-hen.entity';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { YeuCauNhapKho } from '../nha-thuoc/entities/yeu-cau-nhap-kho.entity';
import { PhieuChiHoatDong } from './entities/phieu-chi-hoat-dong.entity';
import { ChotCaThuNgan } from './entities/chot-ca-thu-ngan.entity';
import { khoangNgayVN, ngayVN } from '../../common/utils/khoang-ngay-vn.util';

// Phiếu tạm ứng tại quầy: mã = 'TU' + id lượt tiếp nhận (luot_tiep_nhan_id để NULL như cọc đặt lịch HDT…)
export const MA_TAM_UNG_QUAY = 'TU';
// Phiếu thu phí cận lâm sàng trước khi thực hiện: mã = 'CLS' + id chỉ định (luot_tiep_nhan_id để NULL)
export const MA_PHI_CLS = 'CLS';
/** Phiếu thu trước tại quầy (tạm ứng phí khám TU…, phí cận lâm sàng CLS…): thu qua "Thu tạm ứng", khấu trừ khi quyết toán */
export const laPhieuThuTruoc = (ma?: string | null) => Boolean(ma?.startsWith(MA_TAM_UNG_QUAY) || ma?.startsWith(MA_PHI_CLS));
/**
 * Số tiền còn phải thu của hóa đơn đang chờ thu: phiếu thu trước = tongTien − soTienGiam (phần phí CLS đã cấn trừ
 * từ tạm ứng dư); hóa đơn quyết toán = thucThu.
 */
export const soTienPhaiThu = (hd: { maHoaDon?: string; tongTien?: any; soTienGiam?: any; thucThu?: any }) =>
  laPhieuThuTruoc(hd.maHoaDon)
    ? Math.max(0, Math.round(Number(hd.tongTien || 0) - Number(hd.soTienGiam || 0)))
    : Math.round(Number(hd.thucThu || 0));

/**
 * Tỷ lệ BHYT chi trả theo mức hưởng (ký tự thứ 3 của mã thẻ: 1, 2, 5 → 100%; 3 → 95%; 4 → 80%).
 * Thẻ sai định dạng hoặc đã hết hạn → null (không có thẻ hợp lệ).
 * Đúng tuyến: cấp cứu, phòng khám chưa cấu hình mã cơ sở KCB, thẻ đăng ký tại đây, hoặc giấy chuyển tuyến còn hiệu lực;
 * khi đó chi phí lần khám thấp hơn ngưỡng cấu hình thì chi trả 100%. Trái tuyến: nhân tỷ lệ trái tuyến giám đốc cấu hình.
 */
const MUC_HUONG_BHYT: Record<string, number> = { '1': 1, '2': 1, '3': 0.95, '4': 0.8, '5': 1 };
type CauHinhBhyt = { maCoSoKcb: string | null; tyLeTraiTuyen: number; nguongToanBo: number };
function tyLeBhyt(
  benhNhan: { soBhyt?: string; bhytHanDen?: string; bhytNoiDangKy?: string; bhytChuyenTuyenDen?: string } | null | undefined,
  cauHinh: CauHinhBhyt,
  chiPhi: number,
  capCuu = false,
): number | null {
  const so = (benhNhan?.soBhyt || '').trim().toUpperCase();
  if (!/^[A-Z]{2}[1-5][0-9]{12}$/.test(so)) return null;
  const now = new Date();
  const homNay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (benhNhan.bhytHanDen && String(benhNhan.bhytHanDen).slice(0, 10) < homNay) return null;
  const mucHuong = MUC_HUONG_BHYT[so[2]];
  const dungTuyen = capCuu || !cauHinh.maCoSoKcb
    || (benhNhan.bhytNoiDangKy || '').trim().toUpperCase() === cauHinh.maCoSoKcb.trim().toUpperCase()
    || (!!benhNhan.bhytChuyenTuyenDen && String(benhNhan.bhytChuyenTuyenDen).slice(0, 10) >= homNay);
  if (!dungTuyen) return mucHuong * (cauHinh.tyLeTraiTuyen / 100);
  return cauHinh.nguongToanBo > 0 && chiPhi < cauHinh.nguongToanBo ? 1 : mucHuong;
}

// Tiền thực nhận ròng của hóa đơn: thu vào trừ phần hoàn trả tạm ứng dư
const thuRong = (h: HoaDon) => Number(h.thucThu || 0) - Number(h.tienHoanTra || 0);

@Injectable()
export class ThanhToanService {
  private lastDepositSyncAt = 0;

  // Khóa MySQL GET_LOCK: thu tiền, hoàn tiền, phiếu chi, chốt ca an toàn khi chạy nhiều instance
  private withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return voiKhoaDb(this.hoaDonRepo.manager.connection, key, fn);
  }

  private async generateNextMaHoaDon(): Promise<string> {
    const year = new Date().getFullYear();
    const so = await soTiepTheo(this.hoaDonRepo.manager, `ma_hoa_don_${year}`,
      `SELECT GREATEST(COALESCE(MAX(CAST(SUBSTRING(ma_hoa_don, 7) AS UNSIGNED)), 0), (SELECT COUNT(*) FROM hoa_don)) AS maxNum FROM hoa_don WHERE ma_hoa_don LIKE ?`,
      [`HD${year}%`]);
    return MaGeneratorService.generateMaHoaDon(so);
  }

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
    // Throttle đồng bộ phiếu thu tạm ứng tối đa 30s/lần để chống nghẽn DB khi Thu ngân tìm kiếm liên tục
    if (Date.now() - this.lastDepositSyncAt > 30000) {
      this.lastDepositSyncAt = Date.now();
      await this.lichHenService.dongBoTatCaTamUngLichHen().catch(() => {});
    }

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
        const isTamUngQuay = laPhieuThuTruoc(hd.maHoaDon);
        const isTamUng = Boolean(
          isTamUngQuay ||
          hd.maHoaDon?.startsWith('HDT') ||
          hd.ghiChu?.includes('[TẠM ỨNG ĐẶT LỊCH]') ||
          // Hóa đơn quyết toán của lượt khám cũng có dòng 'tam_ung' (khấu trừ, số âm) → không phải phiếu tạm ứng
          (!hd.luotTiepNhanId && hd.chiTiet?.some((c) => c.loaiPhi === 'tam_ung'))
        );
        // Hóa đơn quyết toán: tạm ứng đã khấu trừ, mã chứng từ nằm trong ngoặc của mô tả dòng khấu trừ
        const dongKhauTru = hd.luotTiepNhanId ? hd.chiTiet?.find((c) => c.loaiPhi === 'tam_ung') : null;
        const khauTruTamUng = dongKhauTru
          ? {
              soTien: Math.abs(Number(dongKhauTru.thanhTien)),
              maChungTu: dongKhauTru.moTa?.match(/\(([^)]+)\)\s*$/)?.[1] || null,
            }
          : null;
        const matchMaLh = hd.ghiChu?.match(/\[MÃ_LỊCH_HẸN:\s*([^\]]+)\]/i);
        const maLichHen = matchMaLh
          ? matchMaLh[1].trim()
          : hd.maHoaDon?.startsWith('HDT')
          ? `LH${hd.maHoaDon.slice(3)}`
          : null;

        const choHoanCoc =
          hd.trangThai === 'da_thanh_toan' &&
          Boolean(hd.ghiChu?.includes('[CHỜ HOÀN CỌC'));
        // Lễ tân ghi lỗi phía phòng khám: chờ Ban Giám Đốc duyệt mới được chi
        const choDuyetHoan = choHoanCoc && Boolean(hd.ghiChu?.includes(MARKER_CHO_DUYET_HOAN));
        // Số tiền chờ hoàn: theo yêu cầu ghi trong ghi chú (có thể hoàn một phần), không vượt số đã thu
        const daThuHd = Number(hd.thucThu || hd.tongTien || 0);
        const yeuCauHoanMatch = hd.ghiChu?.match(/\[CHỜ HOÀN CỌC ([\d.,]+)/);
        const soTienChoHoan = choHoanCoc
          ? yeuCauHoanMatch
            ? Math.min(daThuHd, Number(yeuCauHoanMatch[1].replace(/\D/g, '')))
            : daThuHd
          : 0;

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
          loaiHoaDon: isTamUngQuay ? 'tam_ung_tai_quay' : isTamUng ? 'tam_ung_dat_lich' : 'vien_phi',
          laPhiCls: Boolean(hd.maHoaDon?.startsWith(MA_PHI_CLS)),
          maLichHen,
          choHoanCoc,
          choDuyetHoan,
          soTienChoHoan,
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
          luaChonThanhToan: hd.luaChonThanhToan,
          khauTruTamUng,
          thuNgan: hd.thuNgan
            ? hd.thuNgan.hoTen
            : isTamUng && !isTamUngQuay
            ? 'Cổng VNPay/MoMo (Tự động)'
            : null,
          tongTien: Number(hd.tongTien),
          soTienGiam: Number(hd.soTienGiam),
          thucThu: Number(hd.thucThu),
          tienHoanTra: Number(hd.tienHoanTra || 0),
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
        tienHoanTra: Number(hd.tienHoanTra || 0),
        tienCocDaThu,
        maLichHenCoc,
        chiTiet: hd.chiTiet?.length
          ? hd.chiTiet.map((ct) => ({
            ...ct,
            donGia: Number(ct.donGia),
            thanhTien: Number(ct.thanhTien),
          }))
          : laPhieuThuTruoc(hd.maHoaDon) ? await this.bangKePhieuThuTruoc(hd) : [],
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

    return this.withLock(`invoice:visit:${luotTiepNhanId}`, async () => {
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

      // Chuẩn bất biến tài chính y tế: Nếu hóa đơn của lượt khám đã thanh toán, không tự động ghi đè lại
      if (hd && hd.trangThai === 'da_thanh_toan') {
        return this.getChiTietHoaDon(hd.id);
      }

      const maHoaDon = hd ? hd.maHoaDon : await this.generateNextMaHoaDon();

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
      const phiKham = await this.layPhiKham();
      const items: Partial<HoaDonChiTiet>[] = [
        {
          loaiPhi: 'kham_benh',
          moTa: 'Phí khám bệnh chuyên khoa',
          soLuong: 1,
          donGia: phiKham,
          thanhTien: phiKham,
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

      // 3. Tạm ứng đã thu thực tế (cọc đặt lịch online hoặc tạm ứng tại quầy)
      const tamUng = await this.layTamUngCuaLuot(luot);
      const tienCocDaThu = tamUng.soTien;

      // 4. Nếu có tạm ứng, thêm dòng khấu trừ rõ ràng vào Bảng kê chi phí
      if (tienCocDaThu > 0) {
        items.push({
          loaiPhi: 'tam_ung',
          moTa: `Khấu trừ ${tamUng.moTa} (${tamUng.maChungTu})`,
          soLuong: 1,
          donGia: -tienCocDaThu,
          thanhTien: -tienCocDaThu,
        });
      }

      // 5. Tính toán BHYT, thu thêm hoặc hoàn trả phần tạm ứng dư
      const tyLe = apDungBhyt === false
        ? 0
        : tyLeBhyt(luot.benhNhan, await this.layCauHinhBhyt(), tongTienDichVu, luot.doiTuongUuTien === 'cap_cuu') ?? (apDungBhyt ? 0.8 : 0);
      const apBhyt = tyLe > 0;
      const giamBhyt = Math.round(tongTienDichVu * tyLe);
      const soTienGiam = giamBhyt;
      const { thucThu, tienHoanTra } = this.tinhThuHoan(tongTienDichVu, giamBhyt, tienCocDaThu);

      hd.tongTien = tongTienDichVu;
      hd.soTienGiam = soTienGiam;
      hd.thucThu = thucThu;
      hd.tienHoanTra = tienHoanTra;

      const ghiChuParts: string[] = [];
      if (apBhyt) {
        ghiChuParts.push(`BHYT chi trả ${Math.round(tyLe * 100)}% danh mục viện phí (Giảm ${giamBhyt.toLocaleString('vi-VN')} đ)`);
      }
      if (tienCocDaThu > 0) {
        ghiChuParts.push(`Đã khấu trừ ${tienCocDaThu.toLocaleString('vi-VN')} đ ${tamUng.moTa} (${tamUng.maChungTu})`);
      }
      if (tienHoanTra > 0) {
        ghiChuParts.push(`Hoàn trả bệnh nhân ${tienHoanTra.toLocaleString('vi-VN')} đ tạm ứng dư`);
      }
      // Giữ marker đơn PayOS (QR chuyển khoản viện phí) để webhook/đối soát còn tìm được đơn sau khi tính lại
      const payosMarker = hd.ghiChu?.match(/\[PAYOS_HD:\d+\]/)?.[0];
      hd.ghiChu =
        ghiChuParts.length > 0
          ? ghiChuParts.join(' • ')
          : hd.ghiChu || 'Khám dịch vụ tự chi trả';
      if (payosMarker && !hd.ghiChu.includes(payosMarker)) hd.ghiChu = `${hd.ghiChu} ${payosMarker}`;

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

      try {
        await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
          tieuDe: `Hóa đơn viện phí mới: ${saved.maHoaDon}`,
          noiDung: tienHoanTra > 0
            ? `Bệnh nhân ${luot.benhNhan?.hoTen || 'BN'} được hoàn trả ${tienHoanTra.toLocaleString('vi-VN')} đ tạm ứng dư. Vui lòng hoàn tiền và xác nhận tại quầy.`
            : `Bệnh nhân ${luot.benhNhan?.hoTen || 'BN'} có khoản viện phí cần thanh toán (${Number(saved.thucThu || 0).toLocaleString('vi-VN')} đ). Vui lòng thu tiền tại quầy.`,
          loai: 'can_thanh_toan',
          doiTuongBang: 'hoa_don',
          doiTuongId: saved.id,
        });
      } catch (e) {
        console.warn('Lỗi gửi thông báo thu_ngan taoHoacCapNhatTuLuotKham:', e?.message);
      }
      // Hóa đơn tính lại nhiều lần (đổi thuốc / BHYT): tiêu đề có số tiền nên chỉ báo lại khi số tiền đổi
      if (Number(saved.thucThu) > 0 || tienHoanTra > 0) {
        await this.baoBenhNhan(luot.benhNhanId, tienHoanTra > 0
          ? {
            tieuDe: `Bạn được hoàn ${tienHoanTra.toLocaleString('vi-VN')} đ tạm ứng dư`,
            noiDung: `Hóa đơn viện phí ${saved.maHoaDon}: tổng chi phí thấp hơn số tạm ứng đã đóng. Mời bạn đến quầy thu ngân nhận lại ${tienHoanTra.toLocaleString('vi-VN')} đ.`,
            loai: 'thanh_toan', doiTuongBang: 'hoa_don', doiTuongId: saved.id,
          }
          : {
            tieuDe: `Cần thanh toán viện phí ${Number(saved.thucThu).toLocaleString('vi-VN')} đ`,
            noiDung: `Hóa đơn viện phí ${saved.maHoaDon}: tổng chi phí ${tongTienDichVu.toLocaleString('vi-VN')} đ${giamBhyt > 0 ? `, BHYT chi trả ${giamBhyt.toLocaleString('vi-VN')} đ` : ''}${tienCocDaThu > 0 ? `, đã trừ ${tienCocDaThu.toLocaleString('vi-VN')} đ tạm ứng` : ''}. Vui lòng thanh toán ${Number(saved.thucThu).toLocaleString('vi-VN')} đ tại quầy thu ngân.`,
            loai: 'can_thanh_toan', doiTuongBang: 'hoa_don', doiTuongId: saved.id,
          });
      }

      return this.getChiTietHoaDon(saved.id);
    });
  }

  /** Thu ngân / lễ tân đổi lựa chọn mua thuốc (bệnh nhân thì xác nhận một lần qua xacNhanLuaChonBenhNhan) */
  async capNhatLuaChonThuocHoaDon(
    hoaDonId: number,
    luaChonMua: 'mua_tai_benh_vien' | 'mua_ngoai',
  ) {
    const hd = await this.hoaDonRepo.findOne({ where: { id: hoaDonId } });
    if (!hd) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (hd.trangThai === 'da_thanh_toan') {
      throw new BadRequestException('Không thể thay đổi thuốc sau khi hóa đơn đã thanh toán');
    }
    const donThuocList = await this.donThuocCuaLuot(hd.luotTiepNhanId);
    if (!donThuocList.length) throw new BadRequestException('Lượt khám không có đơn thuốc');
    await this.ghiLuaChonThuoc(donThuocList, luaChonMua);
    const kq = await this.taoHoacCapNhatTuLuotKham(hd.luotTiepNhanId);
    await this.tuQuyetToanNeuKhongPhaiThu(hd.luotTiepNhanId);
    return kq;
  }

  /**
   * Bệnh nhân xác nhận MỘT LẦN ở bước thanh toán cuối: cách trả phần còn lại (chuyển khoản / tại quầy) và nơi mua thuốc.
   * Chỉ khi xác nhận mới ghi đơn thuốc + lập lại hóa đơn + báo thu ngân / nhà thuốc, nên các màn hình đó không
   * nhảy theo từng lần bệnh nhân bấm thử. Đã xác nhận thì bệnh nhân không tự đổi được, phải nhờ thu ngân.
   */
  async xacNhanLuaChonBenhNhan(
    hoaDonId: number,
    dto: { luaChonThanhToan: string; luaChonMua?: 'mua_tai_benh_vien' | 'mua_ngoai' },
  ) {
    if (!['chuyen_khoan', 'tai_quay'].includes(dto.luaChonThanhToan)) {
      throw new BadRequestException('Hình thức thanh toán không hợp lệ');
    }
    const hd = await this.hoaDonRepo.findOne({ where: { id: hoaDonId }, relations: ['benhNhan', 'luotTiepNhan'] });
    if (!hd || laPhieuThuTruoc(hd.maHoaDon)) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (hd.luotTiepNhan?.trangThai !== TrangThaiTiepNhan.CHO_THANH_TOAN) {
      throw new BadRequestException('Lượt khám chưa kết thúc hoặc đã hủy');
    }
    const donThuocList = await this.donThuocCuaLuot(hd.luotTiepNhanId);
    if (donThuocList.length && !dto.luaChonMua) throw new BadRequestException('Vui lòng chọn nơi mua thuốc');

    // Giữ chỗ nguyên tử: bấm 2 lần / 2 thiết bị thì chỉ một lần thành công
    const giu = await this.hoaDonRepo.createQueryBuilder().update(HoaDon)
      .set({ luaChonThanhToan: dto.luaChonThanhToan })
      .where('id = :id AND trang_thai = :tt AND lua_chon_thanh_toan IS NULL', { id: hoaDonId, tt: 'cho_thanh_toan' })
      .execute();
    if (!giu.affected) {
      throw new BadRequestException('Hóa đơn đã được xác nhận hoặc đã thanh toán. Muốn đổi lựa chọn, vui lòng liên hệ quầy thu ngân');
    }
    try {
      if (donThuocList.length) await this.ghiLuaChonThuoc(donThuocList, dto.luaChonMua);
      await this.taoHoacCapNhatTuLuotKham(hd.luotTiepNhanId);
    } catch (e) {
      await this.hoaDonRepo.update(hoaDonId, { luaChonThanhToan: null });
      throw e;
    }

    const daQuyetToan = await this.tuQuyetToanNeuKhongPhaiThu(hd.luotTiepNhanId);
    const ketQua = await this.getChiTietHoaDon(hoaDonId);
    const hoTen = hd.benhNhan?.hoTen || '';
    if (!daQuyetToan) {
      await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
        tieuDe: `${hoTen} chọn ${dto.luaChonThanhToan === 'chuyen_khoan' ? 'chuyển khoản' : 'thanh toán tại quầy'}: ${hd.maHoaDon}`,
        noiDung: `Phải thu ${Number(ketQua.data.thucThu).toLocaleString('vi-VN')} đ${
          donThuocList.length ? (dto.luaChonMua === 'mua_ngoai' ? ' (thuốc mua ngoài)' : ' (gồm tiền thuốc)') : ''}.`,
        loai: 'thanh_toan',
        doiTuongBang: 'hoa_don',
        doiTuongId: hoaDonId,
      }).catch((e) => console.warn('Lỗi báo thu ngân lựa chọn thanh toán:', e?.message));
    }
    if (dto.luaChonMua === 'mua_tai_benh_vien') {
      await this.thongBaoService.taoThongBaoTheoRole('nhan_vien_nha_thuoc', {
        tieuDe: `Đơn thuốc mua tại phòng khám: ${hoTen}`,
        noiDung: daQuyetToan
          ? 'Bệnh nhân đã quyết toán, mời chuẩn bị cấp phát.'
          : 'Bệnh nhân chọn mua tại phòng khám, cấp phát sau khi thanh toán.',
        loai: 'don_thuoc',
        doiTuongBang: 'hoa_don',
        doiTuongId: hoaDonId,
      }).catch((e) => console.warn('Lỗi báo nhà thuốc:', e?.message));
    }
    return ketQua;
  }

  private async donThuocCuaLuot(luotTiepNhanId: number) {
    const bak = luotTiepNhanId ? await this.benhAnRepo.findOne({ where: { luotTiepNhanId } }) : null;
    return bak ? this.donThuocRepo.find({ where: { benhAnKhamId: bak.id } }) : [];
  }

  private async ghiLuaChonThuoc(donThuocList: DonThuoc[], luaChonMua: string) {
    if (!['mua_tai_benh_vien', 'mua_ngoai'].includes(luaChonMua)) {
      throw new BadRequestException('Lựa chọn mua thuốc không hợp lệ');
    }
    for (const dt of donThuocList) {
      if (dt.trangThai === 'da_cap_phat') {
        throw new BadRequestException('Đơn thuốc đã được cấp, không thể thay đổi lựa chọn');
      }
      dt.luaChonMua = luaChonMua;
      dt.trangThai = luaChonMua === 'mua_ngoai' ? 'mua_ngoai' : 'cho_duyet';
    }
    await this.donThuocRepo.save(donThuocList);
  }

  /**
   * Thu ngân Xác nhận Thanh toán (Hỗ trợ BHYT, Tiền mặt, Chuyển khoản, POS)
   */
  async xacNhanThanhToan(
    id: number,
    userId: number,
    dto: { phuongThucThanhToan: string; soTienGiam?: number; ghiChu?: string; apDungBhyt?: boolean },
  ) {
    return this.withLock(`invoice:pay:${id}`, async () => {
      const hd = await this.hoaDonRepo.findOne({
        where: { id },
        relations: ['benhNhan', 'luotTiepNhan'],
      });
      if (!hd) {
        throw new NotFoundException('Không tìm thấy hóa đơn');
      }

      if (hd.trangThai !== 'cho_thanh_toan') {
        throw new BadRequestException(hd.trangThai === 'da_thanh_toan'
          ? 'Hóa đơn này đã được thanh toán trước đó'
          : 'Hóa đơn đã hủy, không thể thu tiền');
      }
      // Quyết toán chỉ sau khi bác sĩ kết thúc khám (lượt đã hủy hoặc đang khám thì không thu)
      if (hd.luotTiepNhanId && hd.luotTiepNhan?.trangThai !== TrangThaiTiepNhan.CHO_THANH_TOAN) {
        throw new BadRequestException('Lượt khám chưa kết thúc hoặc đã hủy, chưa thể quyết toán hóa đơn này');
      }
      if (laPhieuThuTruoc(hd.maHoaDon)) {
        throw new BadRequestException('Phiếu tạm ứng / phí cận lâm sàng phải thu qua chức năng "Thu tạm ứng"');
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

      // Chọn BHYT mà chưa có số giảm: tính theo thẻ (mức hưởng, tuyến, ngưỡng); chỉ khi chưa nhập thẻ hợp lệ mới dùng 80% mặc định
      const chonBhyt = dto.phuongThucThanhToan === 'bao_hiem' || dto.apDungBhyt;
      if (chonBhyt && (isNaN(soTienGiam) || soTienGiam === 0)) {
        const tyLe = tyLeBhyt(hd.benhNhan, await this.layCauHinhBhyt(), tongTien, hd.luotTiepNhan?.doiTuongUuTien === 'cap_cuu') ?? 0.8;
        soTienGiam = Math.round(tongTien * tyLe);
      } else if (isNaN(soTienGiam)) {
        soTienGiam = Number(hd.soTienGiam || 0);
      }
      // Số giảm vượt tổng tiền sẽ biến thành "tiền hoàn" không có thật
      if (!(soTienGiam >= 0 && soTienGiam <= tongTien)) {
        throw new BadRequestException(`Số tiền giảm phải từ 0 đến ${tongTien.toLocaleString('vi-VN')} đ`);
      }

      const { thucThu, tienHoanTra } = this.tinhThuHoan(tongTien, soTienGiam, tienCocDaThu);

      hd.trangThai = 'da_thanh_toan';
      hd.phuongThucThanhToan = dto.phuongThucThanhToan || 'tien_mat';
      hd.soTienGiam = soTienGiam;
      hd.thucThu = thucThu;
      hd.tienHoanTra = tienHoanTra;
      hd.ngayThanhToan = new Date();
      if (nv) hd.thuNganId = nv.id;
      if (dto.ghiChu) {
        hd.ghiChu = dto.ghiChu;
      } else if (chonBhyt) {
        hd.ghiChu = `Đã khấu trừ BHYT ${tongTien > 0 ? Math.round((soTienGiam / tongTien) * 100) : 0}% (~${soTienGiam.toLocaleString('vi-VN')} đ)${tienCocDaThu > 0 ? ` & cọc ${tienCocDaThu.toLocaleString('vi-VN')} đ` : ''}. Thu thực tế: ${thucThu.toLocaleString('vi-VN')} đ`;
      }

      const updated = await this.hoaDonRepo.save(hd);

      // Quyết toán xong: lượt khám và lịch hẹn (nếu có) hoàn thành
      if (hd.luotTiepNhanId) {
        await this.tiepNhanRepo.update(
          { id: hd.luotTiepNhanId, trangThai: TrangThaiTiepNhan.CHO_THANH_TOAN },
          { trangThai: TrangThaiTiepNhan.HOAN_THANH },
        );
        if (hd.luotTiepNhan?.lichHenId) {
          await this.hoaDonRepo.manager.query(
            `UPDATE lich_hen SET trang_thai = 'hoan_thanh' WHERE id = ? AND trang_thai IN ('da_xac_nhan', 'dang_kham')`,
            [hd.luotTiepNhan.lichHenId],
          );
        }
        // Đồng thời cập nhật trạng thái phiếu khám bệnh sang da_hoan_thanh
        await this.hoaDonRepo.manager.query(
          `UPDATE benh_an_kham SET trang_thai = 'da_hoan_thanh' WHERE luot_tiep_nhan_id = ? AND trang_thai != 'da_hoan_thanh'`,
          [hd.luotTiepNhanId],
        ).catch(() => {});
      }

      try {
        const chiTietList = await this.hoaDonChiTietRepo.find({ where: { hoaDonId: hd.id } });
        const hasThuoc = chiTietList.some((c) => c.loaiPhi === 'tien_thuoc' || c.loaiPhi === 'thuoc');

        if (hasThuoc) {
          await this.thongBaoService.taoThongBaoTheoRole('nhan_vien_nha_thuoc', {
            tieuDe: `Đơn thuốc đã thanh toán: ${hd.maHoaDon}`,
            noiDung: `Bệnh nhân ${hd.benhNhan?.hoTen || 'BN'} đã thanh toán tiền thuốc. Nhà thuốc sẵn sàng chuẩn bị và cấp phát!`,
            loai: 'cap_phat_thuoc',
            doiTuongBang: 'hoa_don',
            doiTuongId: hd.id,
          });
        }

        if (thucThu > 0 || tienHoanTra > 0) {
          await this.baoBenhNhan(hd.benhNhanId, {
            tieuDe: tienHoanTra > 0
              ? `Đã nhận hoàn ${tienHoanTra.toLocaleString('vi-VN')} đ tạm ứng dư`
              : `Đã thanh toán viện phí ${thucThu.toLocaleString('vi-VN')} đ`,
            noiDung: `Hóa đơn ${hd.maHoaDon} đã quyết toán xong.${hasThuoc ? ' Mời bạn đến quầy nhà thuốc nhận thuốc.' : ''} Cảm ơn bạn đã sử dụng dịch vụ của phòng khám.`,
            loai: 'thanh_toan',
            doiTuongBang: 'hoa_don',
            doiTuongId: hd.id,
          });
        }
      } catch (e) {
        console.warn('Lỗi gửi thông báo sau thanh toán:', e?.message);
      }

      return {
        message: tienHoanTra > 0
          ? `Đã xác nhận hoàn trả ${tienHoanTra.toLocaleString('vi-VN')} đ tạm ứng dư cho bệnh nhân`
          : 'Xác nhận thanh toán hóa đơn thành công',
        data: updated,
      };
    });
  }

  /** Thực thu = viện phí − BHYT − tạm ứng; nếu âm thì phần dư là tiền hoàn trả bệnh nhân */
  private tinhThuHoan(tongTien: number, soTienGiam: number, tamUng: number) {
    const conLai = tongTien - soTienGiam - tamUng;
    return { thucThu: Math.max(0, conLai), tienHoanTra: Math.max(0, -conLai) };
  }

  /** Cấu hình tuyến BHYT của phòng khám (dòng truc_tiep) */
  private async layCauHinhBhyt(): Promise<CauHinhBhyt> {
    const rows: any[] = await this.hoaDonRepo.manager.query(
      `SELECT ma_co_so_kcb, ty_le_bhyt_trai_tuyen, nguong_bhyt_toan_bo FROM cau_hinh_tien_coc WHERE loai_hinh_thuc = 'truc_tiep' LIMIT 1`,
    );
    return {
      maCoSoKcb: rows[0]?.ma_co_so_kcb || null,
      tyLeTraiTuyen: Number(rows[0]?.ty_le_bhyt_trai_tuyen || 0),
      nguongToanBo: Number(rows[0]?.nguong_bhyt_toan_bo || 0),
    };
  }

  /** Phí khám trực tiếp theo cấu hình của giám đốc */
  private async layPhiKham(): Promise<number> {
    const rows = await this.hoaDonRepo.manager.query(
      `SELECT phi_kham_mac_dinh FROM cau_hinh_tien_coc WHERE loai_hinh_thuc = 'truc_tiep' LIMIT 1`,
    );
    return Number(rows[0]?.phi_kham_mac_dinh) || 150000;
  }

  /** Tạm ứng đã thu thực tế của lượt khám: cọc đặt lịch (HDT…) + tạm ứng tại quầy (TU…) */
  /**
   * Bảng kê cho phiếu thu trước (CLS… / TU…), vốn không lưu chi tiết: dịch vụ theo giá niêm yết rồi trừ phần BHYT / tiền cọc,
   * các dòng cộng lại đúng tổng tiền phiếu. Không khớp được (giá đã đổi sau khi lập phiếu) thì ghi một dòng theo tổng tiền.
   */
  private async bangKePhieuThuTruoc(hd: HoaDon) {
    const tong = Number(hd.tongTien);
    const dong = (loaiPhi: string, moTa: string, soTien: number) =>
      this.hoaDonChiTietRepo.create({ hoaDonId: hd.id, loaiPhi, moTa, soLuong: 1, donGia: soTien, thanhTien: soTien });
    const kemTru = (dichVu: ReturnType<typeof dong>, cacKhoanTru: ReturnType<typeof dong>[]) => {
      const tru = cacKhoanTru.filter((d) => d.thanhTien < 0);
      return dichVu.thanhTien + tru.reduce((s, d) => s + d.thanhTien, 0) === tong ? [dichVu, ...tru] : null;
    };

    if (hd.maHoaDon.startsWith(MA_PHI_CLS)) {
      const [cd]: any[] = await this.hoaDonRepo.manager.query(
        `SELECT dv.ten_dich_vu AS ten, dv.gia, dv.loai FROM chi_dinh_can_lam_sang cd
           JOIN dich_vu_xet_nghiem dv ON dv.id = cd.dich_vu_xet_nghiem_id WHERE cd.id = ? LIMIT 1`,
        [Number(hd.maHoaDon.slice(MA_PHI_CLS.length))],
      );
      const ten = cd?.ten || hd.ghiChu?.match(/\[PHÍ CẬN LÂM SÀNG\]\s*(.+?)\s+-\s+lượt khám/)?.[1] || 'Dịch vụ cận lâm sàng';
      const gia = Number(cd?.gia || 0);
      const loai = cd?.loai === 'cdha' ? 'cdha' : 'xet_nghiem';
      return kemTru(dong(loai, ten, gia), [dong('bhyt', 'BHYT chi trả', tong - gia)])
        ?? [dong(loai, ten, tong)];
    }

    // TU<id lượt>: phí khám, trừ tiền cọc đặt lịch (nếu có) và phần BHYT chi trả
    const luot = await this.tiepNhanRepo.findOne({ where: { id: Number(hd.maHoaDon.slice(MA_TAM_UNG_QUAY.length)) } });
    const phiKham = await this.layPhiKham();
    let coc = 0;
    let maCoc = '';
    if (luot?.lichHenId) {
      const [lh]: any[] = await this.hoaDonRepo.manager.query(`SELECT ma_lich_hen FROM lich_hen WHERE id = ? LIMIT 1`, [luot.lichHenId]);
      maCoc = lh ? `HDT${String(lh.ma_lich_hen || '').replace(/^LH/i, '')}` : '';
      const hdCoc = maCoc ? await this.hoaDonRepo.findOne({ where: { maHoaDon: maCoc, trangThai: 'da_thanh_toan' } }) : null;
      coc = Number(hdCoc?.thucThu || 0);
    }
    const truCoc = dong('tam_ung', `Trừ tiền cọc đặt lịch (${maCoc})`, -coc);
    return kemTru(dong('kham_benh', 'Phí khám bệnh', phiKham), [truCoc, dong('bhyt', 'BHYT chi trả', tong - phiKham + coc)])
      ?? [dong('kham_benh', 'Tạm ứng phí khám bệnh', tong)];
  }

  private async layTamUngCuaLuot(luot: { id: number; lichHenId?: number }) {
    const phieu = [{ ma: `${MA_TAM_UNG_QUAY}${luot.id}`, moTa: 'tạm ứng tại quầy' }];
    if (luot.lichHenId) {
      const lhRows = await this.hoaDonRepo.manager.query(
        `SELECT ma_lich_hen FROM lich_hen WHERE id = ? LIMIT 1`,
        [luot.lichHenId],
      );
      if (lhRows.length) {
        phieu.unshift({ ma: `HDT${String(lhRows[0].ma_lich_hen || '').replace(/^LH/i, '')}`, moTa: 'tiền cọc đặt lịch' });
      }
    }
    // Phí cận lâm sàng đã thu trước (kể cả chỉ định đã hủy: tiền thu trước được trừ vào viện phí, dư thì hoàn)
    const cls: any[] = await this.hoaDonRepo.manager.query(
      `SELECT cd.id FROM chi_dinh_can_lam_sang cd JOIN benh_an_kham bak ON bak.id = cd.benh_an_kham_id WHERE bak.luot_tiep_nhan_id = ?`,
      [luot.id],
    );
    for (const c of cls) phieu.push({ ma: `${MA_PHI_CLS}${c.id}`, moTa: 'phí cận lâm sàng' });
    const daThu = await this.hoaDonRepo.find({
      where: { maHoaDon: In(phieu.map((p) => p.ma)), trangThai: 'da_thanh_toan' },
    });
    const coThu = phieu.filter((p) => daThu.some((h) => h.maHoaDon === p.ma));
    return {
      soTien: daThu.reduce((sum, h) => sum + Number(h.thucThu), 0),
      maChungTu: coThu.map((p) => p.ma).join(', '),
      moTa: [...new Set(coThu.map((p) => p.moTa))].join(' + '),
    };
  }

  /**
   * Lập phiếu tạm ứng tại quầy TU<mã lượt>; bác sĩ chỉ thấy bệnh nhân khi phiếu đã thu (hoặc ca cấp cứu).
   * Số phải thu = phí khám × (1 − BHYT) − cọc đã đóng. Không còn gì phải thu thì phiếu 0 đ được ghi "đã thu" luôn.
   * Phiếu đã hủy (vd. từng chuyển cấp cứu rồi bỏ) được mở lại.
   */
  async taoPhieuTamUngTaiQuay(
    luot: { id: number; benhNhanId: number; maSoThuTu?: string; lichHenId?: number; doiTuongUuTien?: string },
    hoTen?: string,
  ) {
    // Cấp cứu: khám ngay, không bắt đóng tiền trước (thu khi quyết toán)
    if (luot.doiTuongUuTien === 'cap_cuu') {
      await this.baoBacSiVaoHangDoi(luot.id, 'là ca CẤP CỨU, vừa được xếp vào đầu danh sách khám của bạn');
      return null;
    }
    const maHoaDon = `${MA_TAM_UNG_QUAY}${luot.id}`;
    const existed = await this.hoaDonRepo.findOne({ where: { maHoaDon } });
    if (existed && existed.trangThai !== 'huy') return existed;

    // Có BHYT: chỉ thu trước phần đồng chi trả của phí khám, tránh thu dư rồi phải hoàn
    const benhNhan = await this.hoaDonRepo.manager.findOne(BenhNhan, { where: { id: luot.benhNhanId } });
    const phiKham = await this.layPhiKham();
    const phanBnTra = Math.round(phiKham * (1 - (tyLeBhyt(benhNhan, await this.layCauHinhBhyt(), phiKham) ?? 0)));
    const canThu = Math.max(0, phanBnTra - (await this.layTamUngCuaLuot(luot)).soTien);
    const mienThu = canThu === 0;

    const saved = await this.hoaDonRepo.save(Object.assign(existed ?? this.hoaDonRepo.create({ maHoaDon }), {
      benhNhanId: luot.benhNhanId,
      trangThai: mienThu ? 'da_thanh_toan' : 'cho_thanh_toan',
      tongTien: canThu,
      soTienGiam: 0,
      thucThu: 0,
      ngayThanhToan: mienThu ? new Date() : null,
      ghiChu: `[TẠM ỨNG TẠI QUẦY] Lượt khám ${luot.maSoThuTu || `#${luot.id}`}${mienThu
        ? ' - không phải thu thêm (cọc/BHYT đã đủ phí khám)'
        : luot.lichHenId ? ' - đóng nốt phí khám sau tiền cọc đặt lịch' : ''}`,
    }));
    if (mienThu) {
      await this.baoBacSiVaoHangDoi(luot.id, 'vừa được xếp vào danh sách khám của bạn');
      return null;
    }
    await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
      tieuDe: `Cần thu tạm ứng: ${hoTen || 'Bệnh nhân'} (${luot.maSoThuTu || ''})`,
      noiDung: `Bệnh nhân ${hoTen || ''} vừa được tiếp nhận. Vui lòng thu tiền tạm ứng ${canThu.toLocaleString('vi-VN')} đ (${maHoaDon}); bệnh nhân chỉ được vào hàng đợi bác sĩ sau khi đóng tạm ứng.`,
      loai: 'can_thanh_toan',
      doiTuongBang: 'hoa_don',
      doiTuongId: saved.id,
    }).catch((e) => console.warn('Lỗi gửi thông báo tạm ứng:', e?.message));
    return saved;
  }

  /** Lượt được vào khám: ca cấp cứu, hoặc phiếu tạm ứng tại quầy đã thu (kể cả phiếu 0 đ) */
  async daDuDieuKienKham(luot: { id: number; doiTuongUuTien?: string | null }) {
    if (luot.doiTuongUuTien === 'cap_cuu') return true;
    return (await this.hoaDonRepo.count({ where: { maHoaDon: `${MA_TAM_UNG_QUAY}${luot.id}`, trangThai: 'da_thanh_toan' } })) > 0;
  }

  /** Chuyển lượt sang cấp cứu: hủy phiếu tạm ứng chưa thu (thu khi quyết toán) và báo bác sĩ */
  async chuyenCapCuu(luotId: number) {
    await this.hoaDonRepo.update(
      { maHoaDon: `${MA_TAM_UNG_QUAY}${luotId}`, trangThai: 'cho_thanh_toan' },
      { trangThai: 'huy', ghiChu: '[TẠM ỨNG TẠI QUẦY] Hủy: chuyển cấp cứu, thu khi quyết toán' },
    );
    await this.baoBacSiVaoHangDoi(luotId, 'được chuyển thành ca CẤP CỨU, đã lên đầu danh sách khám của bạn');
  }

  /**
   * Lượt bị hủy: phiếu tạm ứng chưa thu → hủy; đã thu → chờ thu ngân hoàn nếu hoanTien (chưa khám, hoặc lỗi phía phòng khám),
   * không thì giữ lại (bệnh nhân đã khám rồi bỏ về). Hủy có điều kiện để không đè lên lần thu ngân vừa thu cùng lúc.
   */
  async xuLyTamUngKhiHuyLuot(luot: { id: number; maSoThuTu?: string }, lyDo: string, hoanTien = true) {
    await this.huyHoacHoanPhieuThuTruoc(`${MA_TAM_UNG_QUAY}${luot.id}`, lyDo, hoanTien, `Lượt khám ${luot.maSoThuTu || `#${luot.id}`} đã hủy`);
  }

  /**
   * Phiếu thu trước (TU…, CLS…): chưa thu → hủy (có điều kiện, không đè lần thu vừa xảy ra); đã thu và hoanTien → đánh dấu
   * chờ hoàn, báo thu ngân. Đã thu mà không hoàn thì giữ nguyên (trừ vào viện phí khi quyết toán, hoặc là doanh thu).
   */
  private async huyHoacHoanPhieuThuTruoc(maHoaDon: string, lyDo: string, hoanTien: boolean, boiCanh: string) {
    const hd = await this.hoaDonRepo.findOne({ where: { maHoaDon } });
    if (!hd) return;
    if (hd.trangThai === 'cho_thanh_toan') {
      const kq = await this.hoaDonRepo.update(
        { id: hd.id, trangThai: 'cho_thanh_toan' },
        { trangThai: 'huy', ghiChu: `${hd.ghiChu || ''} [Hủy: ${lyDo}]`.trim() },
      );
      if (kq.affected) return;
      // Thu ngân vừa thu xong đúng lúc hủy: đọc lại và xử lý như phiếu đã thu
      Object.assign(hd, await this.hoaDonRepo.findOne({ where: { id: hd.id } }));
    }
    const soTien = Number(hd.thucThu);
    if (!hoanTien || hd.trangThai !== 'da_thanh_toan' || !(soTien > 0) || hd.ghiChu?.includes('[CHỜ HOÀN CỌC')) return;
    await this.hoaDonRepo.update(hd.id, {
      ghiChu: `${hd.ghiChu || ''} [CHỜ HOÀN CỌC ${soTien.toLocaleString('vi-VN')}đ] [LÝ_DO_HỦY: ${lyDo}]`.trim(),
    });
    await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
      tieuDe: `Cần hoàn ${hd.maHoaDon}`,
      noiDung: `${boiCanh} (${lyDo}). Vui lòng hoàn ${soTien.toLocaleString('vi-VN')} đ (${hd.maHoaDon}) cho bệnh nhân.`,
      loai: 'can_thanh_toan',
      doiTuongBang: 'hoa_don',
      doiTuongId: hd.id,
    }).catch((e) => console.warn('Lỗi báo hoàn phiếu thu trước:', e?.message));
  }

  // ─── PHÍ CẬN LÂM SÀNG THU TRƯỚC ─────────────────────────────
  /**
   * Lập phiếu thu phí cho từng chỉ định cận lâm sàng mới (CLS<id chỉ định>): bệnh nhân đóng phần tự chi trả (trừ BHYT)
   * trước khi kỹ thuật viên thực hiện. Ca cấp cứu / không có lượt tại quầy (tư vấn trực tuyến) thì thu khi quyết toán.
   * Tạm ứng (cọc + TU) còn dư sau phí khám được cấn trừ trước: tongTien = phần bệnh nhân chi trả, soTienGiam = phần cấn
   * trừ từ tạm ứng dư, còn phải thu = tongTien − soTienGiam (0 thì phiếu ghi đã thu luôn).
   * Trả về tổng số tiền còn phải thu (0 = không phải nộp thêm).
   */
  async taoPhieuThuCls(luotId: number | null | undefined, chiDinh: { id: number; gia: number; tenDichVu: string }[]) {
    if (!luotId || !chiDinh.length) return 0;
    const luot = await this.tiepNhanRepo.findOne({ where: { id: luotId }, relations: ['benhNhan'] });
    if (!luot || luot.doiTuongUuTien === 'cap_cuu') return 0;
    const cauHinh = await this.layCauHinhBhyt();
    let duTamUng = await this.tamUngConDu(luot, cauHinh);
    let tong = 0;
    for (const cd of chiDinh) {
      const phanBnTra = Math.max(0, Math.round(cd.gia * (1 - (tyLeBhyt(luot.benhNhan, cauHinh, cd.gia) ?? 0))));
      const canTru = Math.min(duTamUng, phanBnTra);
      duTamUng -= canTru;
      const conPhaiThu = phanBnTra - canTru;
      const mienThu = conPhaiThu <= 0;
      await this.hoaDonRepo.save(this.hoaDonRepo.create({
        maHoaDon: `${MA_PHI_CLS}${cd.id}`,
        benhNhanId: luot.benhNhanId,
        trangThai: mienThu ? 'da_thanh_toan' : 'cho_thanh_toan',
        tongTien: phanBnTra,
        soTienGiam: canTru,
        thucThu: 0,
        ngayThanhToan: mienThu ? new Date() : null,
        ghiChu: `[PHÍ CẬN LÂM SÀNG] ${cd.tenDichVu} - lượt khám ${luot.maSoThuTu || `#${luot.id}`}${
          canTru > 0 ? ` - cấn trừ ${canTru.toLocaleString('vi-VN')} đ tạm ứng còn dư` : ''}${
          mienThu && phanBnTra === 0 ? ' - BHYT chi trả toàn bộ' : ''}`,
      }));
      tong += conPhaiThu;
    }
    if (tong > 0) {
      await this.baoBenhNhan(luot.benhNhanId, {
        tieuDe: `Cần đóng phí cận lâm sàng ${tong.toLocaleString('vi-VN')} đ`,
        noiDung: `Bác sĩ vừa chỉ định ${chiDinh.map((c) => c.tenDichVu).join(', ')}. Vui lòng đóng ${tong.toLocaleString('vi-VN')} đ tại quầy thu ngân; kỹ thuật viên sẽ thực hiện ngay sau khi bạn đóng phí.`,
        loai: 'can_thanh_toan',
        doiTuongBang: 'chi_dinh_can_lam_sang',
        doiTuongId: chiDinh[0].id,
      });
      await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
        tieuDe: `Cần thu phí cận lâm sàng: ${luot.benhNhan?.hoTen || 'Bệnh nhân'} (${luot.maSoThuTu || ''})`,
        noiDung: `Bác sĩ vừa chỉ định ${chiDinh.length} dịch vụ cận lâm sàng. Vui lòng thu ${tong.toLocaleString('vi-VN')} đ; kỹ thuật viên chỉ thực hiện sau khi đã thu.`,
        loai: 'can_thanh_toan',
        doiTuongBang: 'luot_tiep_nhan',
        doiTuongId: luot.id,
      }).catch((e) => console.warn('Lỗi báo thu phí CLS:', e?.message));
    }
    return tong;
  }

  /**
   * Tạm ứng còn dư của lượt để cấn trừ phí CLS: cọc + TU đã thu − phần bệnh nhân trả phí khám − phần đã cấn trừ
   * cho các phiếu CLS trước (phiếu / chỉ định đã hủy thì trả lại phần cấn trừ). Tiền nộp riêng cho phiếu CLS chỉ trả cho phiếu đó.
   */
  private async tamUngConDu(luot: LuotTiepNhan, cauHinh: CauHinhBhyt) {
    const maCoc = luot.lichHenId
      ? (await this.hoaDonRepo.manager.query(`SELECT ma_lich_hen FROM lich_hen WHERE id = ? LIMIT 1`, [luot.lichHenId]))[0]?.ma_lich_hen
      : null;
    const ma = [`${MA_TAM_UNG_QUAY}${luot.id}`, ...(maCoc ? [`HDT${String(maCoc).replace(/^LH/i, '')}`] : [])];
    const daDong = (await this.hoaDonRepo.find({ where: { maHoaDon: In(ma), trangThai: 'da_thanh_toan' } }))
      .reduce((s, h) => s + Number(h.thucThu || 0), 0);
    const [daCanTru]: any[] = await this.hoaDonRepo.manager.query(
      `SELECT COALESCE(SUM(h.so_tien_giam), 0) AS tong FROM hoa_don h
         JOIN chi_dinh_can_lam_sang cd ON h.ma_hoa_don = CONCAT(?, cd.id)
         JOIN benh_an_kham bak ON bak.id = cd.benh_an_kham_id
        WHERE bak.luot_tiep_nhan_id = ? AND h.trang_thai != 'huy' AND cd.trang_thai != 'huy'`,
      [MA_PHI_CLS, luot.id],
    );
    const phiKham = await this.layPhiKham();
    const phanBnTraPhiKham = Math.round(phiKham * (1 - (tyLeBhyt(luot.benhNhan, cauHinh, phiKham) ?? 0)));
    return Math.max(0, daDong - phanBnTraPhiKham - Number(daCanTru?.tong || 0));
  }

  /** Chỉ định đã được thu phí (hoặc không có phiếu thu trước: cấp cứu, tư vấn trực tuyến, chỉ định cũ) */
  async daThuPhiCls(chiDinhId: number) {
    const hd = await this.hoaDonRepo.findOne({ where: { maHoaDon: `${MA_PHI_CLS}${chiDinhId}` } });
    return !hd || hd.trangThai === 'da_thanh_toan';
  }

  /** Trạng thái thu phí của các chỉ định: id → 'chua_thu' | 'da_thu' (không có phiếu thì không có trong map) */
  async trangThaiPhiCls(chiDinhIds: number[]) {
    const map = new Map<number, 'chua_thu' | 'da_thu'>();
    if (!chiDinhIds.length) return map;
    const ds = await this.hoaDonRepo.find({ where: { maHoaDon: In(chiDinhIds.map((id) => `${MA_PHI_CLS}${id}`)) } });
    for (const hd of ds) {
      if (hd.trangThai === 'huy') continue;
      map.set(Number(hd.maHoaDon.slice(MA_PHI_CLS.length)), hd.trangThai === 'da_thanh_toan' ? 'da_thu' : 'chua_thu');
    }
    return map;
  }

  /** Hủy chỉ định / hủy lượt: phiếu phí CLS chưa thu → hủy; đã thu → hoàn nếu hoanTien (chưa thực hiện) */
  async huyPhieuThuCls(chiDinhIds: number[], lyDo: string, hoanTien: boolean) {
    for (const id of chiDinhIds) {
      await this.huyHoacHoanPhieuThuTruoc(`${MA_PHI_CLS}${id}`, lyDo, hoanTien, 'Chỉ định cận lâm sàng không thực hiện');
    }
  }

  /**
   * Hóa đơn quyết toán không phải thu thêm cũng không phải hoàn (cọc/tạm ứng/BHYT đã đủ): tự xác nhận để lượt khám
   * và lịch hẹn hoàn thành, nhà thuốc cấp phát được, không bắt thu ngân bấm xác nhận một hóa đơn 0 đ.
   */
  async tuQuyetToanNeuKhongPhaiThu(luotId: number) {
    const hd = await this.hoaDonRepo.findOne({ where: { luotTiepNhanId: luotId, trangThai: 'cho_thanh_toan' } });
    if (!hd || Number(hd.thucThu) > 0 || Number(hd.tienHoanTra || 0) > 0) return false;
    // Đơn thuốc chưa chọn nơi mua: chờ bệnh nhân xác nhận (chọn mua tại phòng khám thì hóa đơn sẽ có tiền thuốc)
    if ((await this.donThuocCuaLuot(luotId)).some((dt) => dt.luaChonMua === 'chua_chon')) return false;
    await this.xacNhanThanhToan(hd.id, 0, { phuongThucThanhToan: 'tien_mat', ghiChu: `${hd.ghiChu || ''} [Tự quyết toán: không phải thu thêm]`.trim() });
    return true;
  }
  /**
   * Báo vào tài khoản của bệnh nhân (chuông thông báo trên web / Zalo Mini App) nếu bệnh nhân có tài khoản.
   * Chống trùng theo tiêu đề + đối tượng; lỗi không làm hỏng luồng thu tiền / tiếp nhận.
   */
  async baoBenhNhan(benhNhanId: number | null | undefined, data: { tieuDe: string; noiDung: string; loai: string; doiTuongBang: string; doiTuongId: number }) {
    if (!benhNhanId) return;
    try {
      const bn = await this.hoaDonRepo.manager.findOne(BenhNhan, { where: { id: benhNhanId } });
      await this.thongBaoService.taoNeuChuaCo({ ...data, nguoiNhanId: bn?.nguoiDungId });
    } catch (e: any) {
      console.warn('Lỗi gửi thông báo bệnh nhân:', e?.message);
    }
  }

  /** Báo bác sĩ phụ trách: bệnh nhân đã vào hàng đợi khám */
  private async baoBacSiVaoHangDoi(luotId: number, lyDo: string) {
    const luot = await this.tiepNhanRepo.findOne({
      where: { id: luotId },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
    const bacSiUserId = luot?.bacSi?.nhanVien?.nguoiDungId;
    if (!bacSiUserId) return;
    const hoTen = luot.benhNhan?.hoTen || '';
    await this.thongBaoService.taoThongBao({
      nguoiNhanId: bacSiUserId,
      tieuDe: `Bệnh nhân mới vào hàng đợi: ${hoTen}`,
      noiDung: `Bệnh nhân ${hoTen} (STT: ${luot.maSoThuTu}) ${lyDo}.`,
      loai: 'lich_kham',
      doiTuongBang: 'luot_tiep_nhan',
      doiTuongId: luot.id,
    }).catch((e) => console.warn('Lỗi gửi thông báo bác sĩ:', e?.message));
  }

  /**
   * Thu ngân thu phiếu thu trước tại quầy (phải thu đủ số cần thu): tạm ứng phí khám TU… → bệnh nhân vào hàng đợi bác sĩ;
   * phí cận lâm sàng CLS… → kỹ thuật viên được thực hiện.
   * Tạm ứng TU: thu ngân tự nhập (≥ số phải thu); phần dư tự cấn trừ phí CLS, cuối lượt quyết toán thừa hoàn / thiếu thu thêm.
   */
  async thuTamUng(id: number, userId: number, dto: { soTien?: number; phuongThucThanhToan?: string }) {
    return this.withLock(`invoice:pay:${id}`, async () => {
      const hd = await this.hoaDonRepo.findOne({ where: { id } });
      if (!hd || !laPhieuThuTruoc(hd.maHoaDon)) throw new NotFoundException('Không tìm thấy phiếu tạm ứng');
      if (hd.trangThai !== 'cho_thanh_toan') throw new BadRequestException('Phiếu tạm ứng đã được xử lý');
      const laCls = hd.maHoaDon.startsWith(MA_PHI_CLS);
      const canThu = soTienPhaiThu(hd);
      // Phí CLS thu ngân thu đúng số trên phiếu; PayOS (userId 0) ghi đúng số tiền thực nhận từ ngân hàng
      const soTien = userId && laCls ? canThu : Math.round(Number(dto.soTien));
      if (!(soTien > 0)) throw new BadRequestException('Phiếu này không còn khoản nào phải thu');
      if (soTien < canThu) {
        throw new BadRequestException(laCls
          ? `Phải thu đủ ${canThu.toLocaleString('vi-VN')} đ phí cận lâm sàng thì kỹ thuật viên mới thực hiện`
          : `Phải thu đủ ${canThu.toLocaleString('vi-VN')} đ (phí khám trừ tiền cọc) bệnh nhân mới được vào khám`);
      }

      const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
      const kq = await this.hoaDonRepo.update(
        { id, trangThai: 'cho_thanh_toan' },
        {
          // Phiếu CLS giữ nguyên tongTien (phần bệnh nhân chi trả) để còn tính tạm ứng dư cho các lần chỉ định sau
          ...(laCls ? {} : { tongTien: soTien }),
          thucThu: soTien,
          trangThai: 'da_thanh_toan',
          phuongThucThanhToan: dto.phuongThucThanhToan || 'tien_mat',
          ngayThanhToan: new Date(),
          thuNganId: nv?.id ?? hd.thuNganId,
        },
      );
      if (!kq.affected) throw new BadRequestException('Phiếu tạm ứng đã được xử lý');
      const saved = await this.hoaDonRepo.findOne({ where: { id } });
      if (laCls) {
        await this.thongBaoService.taoThongBaoTheoRole('ky_thuat_vien', {
          tieuDe: `Đã thu phí cận lâm sàng: ${hd.maHoaDon}`,
          noiDung: `${hd.ghiChu?.replace('[PHÍ CẬN LÂM SÀNG] ', '') || 'Chỉ định cận lâm sàng'}: bệnh nhân đã đóng phí, mời kỹ thuật viên thực hiện.`,
          loai: 'xet_nghiem',
          doiTuongBang: 'chi_dinh_can_lam_sang',
          doiTuongId: Number(hd.maHoaDon.slice(MA_PHI_CLS.length)),
        }).catch((e) => console.warn('Lỗi báo KTV đã thu phí CLS:', e?.message));
      } else {
        await this.baoBacSiVaoHangDoi(
          Number(hd.maHoaDon.slice(MA_TAM_UNG_QUAY.length)),
          'đã đóng tạm ứng và vào danh sách khám của bạn',
        );
      }
      await this.baoBenhNhan(hd.benhNhanId, {
        tieuDe: `Đã thanh toán ${soTien.toLocaleString('vi-VN')} đ ${laCls ? 'phí cận lâm sàng' : 'tạm ứng phí khám'}`,
        noiDung: laCls
          ? `Phòng khám đã nhận ${soTien.toLocaleString('vi-VN')} đ (${hd.maHoaDon}). Mời bạn đến phòng cận lâm sàng để thực hiện.`
          : `Phòng khám đã nhận ${soTien.toLocaleString('vi-VN')} đ (${hd.maHoaDon}). Bạn đã vào hàng chờ khám, vui lòng chú ý loa / màn hình gọi số.`,
        loai: 'thanh_toan',
        doiTuongBang: 'hoa_don',
        doiTuongId: hd.id,
      });

      return { message: `Đã thu ${laCls ? 'phí cận lâm sàng' : 'tạm ứng'} ${soTien.toLocaleString('vi-VN')} đ`, data: saved };
    });
  }

  /**
   * UC-EXT: Hủy hóa đơn & Hoàn tiền viện phí (Refund / Void Invoice)
   */
  async huyHoaDon(id: number, userId: number, dto: { lyDoHuy: string; ghiChu?: string }) {
    return this.withLock(`invoice:pay:${id}`, () => this.thucHienHuyHoaDon(id, userId, dto));
  }

  private async thucHienHuyHoaDon(id: number, userId: number, dto: { lyDoHuy: string; ghiChu?: string }) {
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
    if (hd.ghiChu?.includes(MARKER_CHO_DUYET_HOAN)) {
      throw new BadRequestException('Khoản hoàn cọc này đang chờ Ban Giám Đốc duyệt (lễ tân ghi lỗi phía phòng khám), chưa được chi.');
    }

    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    const ngayHuy = new Date();
    const lyDo = dto.lyDoHuy?.trim() || 'Bệnh nhân yêu cầu hủy và hoàn lại viện phí';
    const nguoiThucHien = nv?.hoTen || 'Thu ngân';
    const isTamUng = Boolean(
      hd.maHoaDon?.startsWith('HDT') || hd.ghiChu?.includes('[TẠM ỨNG ĐẶT LỊCH]')
    );
    // Hoàn cọc theo đúng số tiền trong yêu cầu "chờ hoàn" (có thể chỉ một phần theo % quy định)
    const daThu = Number(hd.thucThu || hd.tongTien || 0);
    const yeuCauHoan = hd.ghiChu?.match(/\[CHỜ HOÀN CỌC ([\d.,]+)/);
    const soTienHoan = isTamUng && yeuCauHoan ? Math.min(daThu, Number(yeuCauHoan[1].replace(/\D/g, ''))) : daThu;
    const hoanMotPhan = isTamUng && soTienHoan < daThu;
    const soTienHoanText = `${soTienHoan.toLocaleString('vi-VN')} đ`;

    // Chốt chặn đối soát Kho Dược - Thu Ngân: Không cho phép hủy hóa đơn viện phí nếu đơn thuốc đã xuất kho cấp phát
    if (!isTamUng && hd.luotTiepNhanId) {
      const bak = await this.benhAnRepo.findOne({ where: { luotTiepNhanId: hd.luotTiepNhanId } });
      if (bak) {
        const dispensedRx = await this.donThuocRepo.findOne({
          where: { benhAnKhamId: bak.id, trangThai: 'da_cap_phat' as any },
        });
        if (dispensedRx) {
          throw new BadRequestException(
            `Không thể hủy/hoàn tiền hóa đơn ${hd.maHoaDon} vì đơn thuốc đi kèm (${dispensedRx.maDonThuoc}) đã được Nhà thuốc xuất kho cấp phát cho bệnh nhân!`,
          );
        }
      }
    }

    // Chốt chặn Kế toán - Chốt ca Thu ngân: Không cho phép hủy trực tiếp hóa đơn đã nằm trong biên bản chốt ca đã khóa sổ
    if (hd.trangThai === 'da_thanh_toan' && hd.ngayThanhToan && hd.thuNganId) {
      const lockedShiftRows: any[] = await this.hoaDonRepo.manager.query(
        `SELECT ma_chot_ca FROM chot_ca_thu_ngan
         WHERE thu_ngan_id = ?
           AND thoi_gian_bat_dau <= ?
           AND thoi_gian_ket_thuc >= ?
         LIMIT 1`,
        [hd.thuNganId, hd.ngayThanhToan, hd.ngayThanhToan],
      );
      if (lockedShiftRows.length > 0) {
        throw new BadRequestException({
          code: 'HOA_DON_DA_KHOA_SO_CHOT_CA',
          message: `Hóa đơn ${hd.maHoaDon} đã thuộc kỳ chốt ca bàn giao két tiền (${lockedShiftRows[0].ma_chot_ca}). Không thể hủy trực tiếp làm lệch sổ quỹ đã khóa — vui lòng lập Phiếu chi hoàn tiền!`,
        });
      }
    }

    if (nv?.id && !hd.thuNganId) {
      hd.thuNganId = nv.id;
    }

    // Hoàn một phần: phần giữ lại vẫn là doanh thu, phần hoàn ghi vào tiền hoàn trả
    if (hoanMotPhan) hd.tienHoanTra = soTienHoan;
    else hd.trangThai = 'huy' as any;
    hd.ghiChu = `[ĐÃ HỦY / HOÀN TIỀN] ${isTamUng ? `[ĐÃ HOÀN CỌC THÀNH CÔNG] (${soTienHoanText}) ` : ''}Lúc ${ngayHuy.toLocaleString('vi-VN')} bởi ${nguoiThucHien}. Lý do: ${lyDo}${dto.ghiChu ? ` - Chứng từ: ${dto.ghiChu}` : ''}. ${hd.ghiChu ? `(Cũ: ${hd.ghiChu.replace(/\[CHỜ HOÀN CỌC[^\]]*\]/gi, '').trim()})` : ''}`;

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
          tieuDe: `Đã hoàn trả ${soTienHoanText} tiền tạm ứng đặt lịch ${maLichHen || hd.maHoaDon}`,
          noiDung: `Quầy Thu Ngân (${nguoiThucHien}) đã hoàn trả thành công ${soTienHoanText} tiền tạm ứng đặt lịch của phiếu ${hd.maHoaDon}.${dto.ghiChu ? ` Nội dung chứng từ: ${dto.ghiChu}.` : ''}`,
          loai: 'thanh_toan',
          doiTuongBang: 'hoa_don',
          doiTuongId: hd.id,
        }).catch(() => {});
      }
    }

    return {
      success: true,
      message: isTamUng
        ? `Xác nhận đã chuyển hoàn tiền cọc đặt lịch (${soTienHoanText}) cho bệnh nhân thành công!`
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

    // Tra nhân viên của mọi người dùng (không chỉ vai trò thu_ngan): trước đây kế toán / giám đốc chọn
    // "Ca trực của tôi" vẫn thấy số liệu toàn viện vì không lọc được theo người thu.
    const nvThuNgan: NhanVien | null = user?.id
      ? await this.nhanVienRepo.findOne({ where: { nguoiDungId: user.id } })
      : null;
    const locCaNhan = phamVi === 'ca_nhan';
    const myNvId = nvThuNgan?.id ?? -1; // không có hồ sơ nhân viên → phạm vi cá nhân rỗng

    // Chỉ lọc theo thu ngân cá nhân khi chọn phạm vi 'ca_nhan'
    if (locCaNhan) {
      qb.andWhere('hd.thuNganId = :myThuNganId', { myThuNganId: myNvId });
    }

    // Khoảng ngày theo giờ Việt Nam, dùng chung helper khoangNgayVN với các báo cáo khác (không phụ thuộc
    // múi giờ của tiến trình). Kết nối DB chạy múi +07:00 nên chuỗi giờ VN so sánh trực tiếp được.
    let rangeStart: string | Date | null = null;
    let rangeEnd: string | null = null;

    if (query.range && query.range !== 'tat_ca') {
      if (query.range === 'ca_hien_tai') {
        // Từ lúc nhận ca gần nhất (nếu có) đến hết hôm nay; truyền Date để driver tự quy đổi múi giờ
        let shiftStart: Date | null = null;
        if (nvThuNgan) {
          const lastShift = await this.chotCaRepo.createQueryBuilder('cc')
            .where('(cc.nguoiNhanCaId = :myId OR cc.thuNganId = :myId) AND cc.trangThai = :stNhan', {
              myId: nvThuNgan.id,
              stNhan: 'da_nhan_ca',
            })
            .orderBy('cc.taoLuc', 'DESC')
            .getOne();
          if (lastShift?.thoiGianNhanCa) shiftStart = new Date(lastShift.thoiGianNhanCa);
        }
        const homNay = ngayVN();
        rangeStart = shiftStart && ngayVN(shiftStart) <= homNay ? shiftStart : `${homNay} 00:00:00`;
        rangeEnd = `${homNay} 23:59:59`;
      } else {
        const { fromDate, toDate } = khoangNgayVN({ range: query.range }, 'hom_nay');
        rangeStart = `${fromDate} 00:00:00`;
        rangeEnd = `${toDate} 23:59:59`;
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

    // Điều kiện ngày thanh toán của kỳ đang chọn, dùng lại cho các truy vấn đếm phụ
    const apDungKy = (q: any, cot: string) => {
      if (query.tuNgay) q.andWhere(`${cot} >= :kyTu`, { kyTu: `${query.tuNgay} 00:00:00` });
      if (query.denNgay) q.andWhere(`${cot} <= :kyDen`, { kyDen: `${query.denNgay} 23:59:59` });
      if (!query.tuNgay && !query.denNgay && rangeStart && rangeEnd) {
        q.andWhere(`${cot} >= :kyStart AND ${cot} <= :kyEnd`, { kyStart: rangeStart, kyEnd: rangeEnd });
      }
      return q;
    };
    const demHoaDonDaThu = (thuNganId?: number) => {
      const q = this.hoaDonRepo.createQueryBuilder('hdc').where('hdc.trangThai = :st', { st: 'da_thanh_toan' })
        // Phiếu thu trước 0 đ (cọc/BHYT đã đủ) không phải lần thu tiền
        .andWhere(`NOT ((hdc.maHoaDon LIKE :tu OR hdc.maHoaDon LIKE :cls) AND hdc.thucThu = 0)`, { tu: `${MA_TAM_UNG_QUAY}%`, cls: `${MA_PHI_CLS}%` });
      if (thuNganId) q.andWhere('hdc.thuNganId = :tnId', { tnId: thuNganId });
      return apDungKy(q, 'hdc.ngayThanhToan').getCount();
    };
    const soHoaDonToanVien = await demHoaDonDaThu();
    const soHoaDonCaNhan = nvThuNgan ? await demHoaDonDaThu(nvThuNgan.id) : 0;

    // Phân loại phiếu tạm ứng giống trang Quản lý hóa đơn: hóa đơn quyết toán cũng có dòng 'tam_ung'
    // (khấu trừ, số âm) nên KHÔNG được coi là phiếu tạm ứng.
    const laTamUngQuay = (h: HoaDon) => laPhieuThuTruoc(h.maHoaDon);
    const laTamUngDatLich = (h: HoaDon) => Boolean(
      h.maHoaDon?.startsWith('HDT') ||
      h.ghiChu?.includes('[TẠM ỨNG ĐẶT LỊCH]') ||
      (!h.luotTiepNhanId && !laTamUngQuay(h) && h.chiTiet?.some((c) => c.loaiPhi === 'tam_ung')),
    );

    const daThanhToan = allInvoices.filter(h => h.trangThai === 'da_thanh_toan');
    const tongThucThu = daThanhToan.reduce((s, h) => s + thuRong(h), 0);
    const tongTienGiam = daThanhToan.reduce((s, h) => s + Number(h.soTienGiam || 0), 0);

    const choThanhToanCount = await this.hoaDonRepo.count({ where: { trangThai: 'cho_thanh_toan' } });

    // Theo phương thức thanh toán
    const byPhuongThuc: Record<string, number> = {};
    daThanhToan.forEach(h => {
      const pt = h.phuongThucThanhToan || 'tien_mat';
      byPhuongThuc[pt] = (byPhuongThuc[pt] || 0) + thuRong(h);
    });

    // Biểu đồ theo giờ hôm nay
    const rawHourlyQb = this.hoaDonRepo.createQueryBuilder('hd')
      .select('HOUR(hd.ngayThanhToan)', 'gio')
      .addSelect('SUM(hd.thucThu - hd.tienHoanTra)', 'tien')
      .where('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .andWhere('DATE(hd.ngayThanhToan) = CURDATE()');

    if (locCaNhan) {
      rawHourlyQb.andWhere('hd.thuNganId = :myThuNganId', { myThuNganId: myNvId });
    }

    const rawHourly = await rawHourlyQb.groupBy('HOUR(hd.ngayThanhToan)').getRawMany();

    const gioCoTien = rawHourly.map(h => Number(h.gio));
    const gioDau = Math.min(7, ...gioCoTien);
    const gioCuoi = Math.max(18, ...gioCoTien);
    const chartTheoGio = Array.from({ length: gioCuoi - gioDau + 1 }, (_, i) => {
      const gio = gioDau + i;
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

    // Phạm vi két cá nhân: chỉ khoản chi do chính thu ngân này chi (giống phiếu chi OPEX bên dưới)
    if (locCaNhan) {
      chiQuery.andWhere('yc.nguoiChiTraId = :myChiTraId', { myChiTraId: myNvId });
    }

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

    // nguoi_chi_tra_id là id nhân viên → tra tên để hiển thị thay cho mã số
    const idsNguoiChi = [...new Set(phieuChiThuoc.map(p => p.nguoiChiTraId).filter(Boolean))];
    const tenNguoiChi = new Map<number, string>();
    if (idsNguoiChi.length) {
      (await this.nhanVienRepo.find({ where: { id: In(idsNguoiChi) } })).forEach(nv => tenNguoiChi.set(nv.id, nv.hoTen));
    }

    // 3. Áp dụng điều kiện thời gian cho Phiếu Chi Hoạt Động (OPEX)
    const opexQuery = this.phieuChiHoatDongRepo.createQueryBuilder('pc')
      .leftJoinAndSelect('pc.nguoiLap', 'nl')
      .where('pc.trangThai = :stDaChi', { stDaChi: 'da_chi' })
      .orderBy('pc.ngayChi', 'DESC');

    if (locCaNhan) {
      // Cùng quy tắc với chốt ca: người chi tiền (hoặc người lập nếu chưa ghi người chi)
      opexQuery.andWhere('(pc.nguoiChiId = :myNguoiLapId OR (pc.nguoiLapId = :myNguoiLapId AND pc.nguoiChiId IS NULL))', { myNguoiLapId: myNvId });
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
      const tamUngDatLich = laTamUngDatLich(h);
      const tamUngQuay = laTamUngQuay(h);
      const matchMaLh = h.ghiChu?.match(/\[MÃ_LỊCH_HẸN:\s*([^\]]+)\]/i);
      const maLh = matchMaLh
        ? matchMaLh[1].trim()
        : h.maHoaDon?.startsWith('HDT')
        ? `LH${h.maHoaDon.slice(3)}`
        : null;
      const tienHoan = Number(h.tienHoanTra || 0);

      let dienGiai = tamUngDatLich
        ? `Thu tạm ứng giữ chỗ lịch hẹn${maLh ? ` (${maLh})` : ''}`
        : tamUngQuay
        ? (h.maHoaDon.startsWith(MA_PHI_CLS) ? 'Thu phí cận lâm sàng' : 'Thu tạm ứng tại quầy')
        : h.ghiChu?.includes('khấu trừ')
        ? `Thu viện phí khám chữa bệnh (${h.ghiChu})`
        : 'Thu viện phí khám chữa bệnh';
      if (tienHoan > 0) dienGiai += ` — đã hoàn ${tienHoan.toLocaleString('vi-VN')}đ`;

      return {
        loai: 'phieu_thu',
        loaiChiTiet: tamUngDatLich ? 'tam_ung_dat_lich' : tamUngQuay ? 'tam_ung_tai_quay' : 'thu_vien_phi',
        soChungTu: h.maHoaDon,
        doiTuong: h.benhNhan?.hoTen || 'Bệnh nhân',
        dienGiai,
        // Số thực giữ lại (thu − hoàn), để bảng đối soát quỹ cộng lại khớp với thẻ Tổng thu
        soTien: thuRong(h),
        phuongThuc: h.phuongThucThanhToan || 'tien_mat',
        ngayLap: h.ngayThanhToan,
        nguoiLap: h.thuNgan?.hoTen || (tamUngDatLich ? 'Cổng thanh toán online (tự động)' : null),
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
      nguoiLap: tenNguoiChi.get(item.nguoiChiTraId) || null,
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

    // Hóa đơn bị hủy khi CHƯA thu (tạm ứng của lượt vắng mặt / chuyển cấp cứu...) không có ngày thanh toán
    // và không phát sinh tiền hoàn → không đưa vào danh sách hoàn tiền.
    const danhSachHoaDonHuy = allInvoices.filter(h => h.trangThai === 'huy' && h.ngayThanhToan).map(h => {
      const isTamUng = laTamUngDatLich(h) || laTamUngQuay(h);
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
    // Hoàn một phần: hóa đơn vẫn "đã thanh toán", phần hoàn ghi ở tien_hoan_tra
    const danhSachHoanMotPhan = daThanhToan.filter(h => Number(h.tienHoanTra || 0) > 0).map(h => ({
      loai: 'phieu_huy',
      loaiChiTiet: 'hoan_mot_phan',
      soChungTu: h.maHoaDon,
      doiTuong: h.benhNhan?.hoTen || 'Bệnh nhân',
      dienGiai: `Hoàn một phần viện phí (${h.ghiChu || 'đã hoàn'})`,
      soTien: Number(h.tienHoanTra),
      phuongThuc: h.phuongThucThanhToan || 'tien_mat',
      ngayLap: h.ngayThanhToan,
      nguoiLap: h.thuNgan?.hoTen || null,
      hoaDonId: h.id,
    }));
    const danhSachHoanTien = [...danhSachHoaDonHuy, ...danhSachHoanMotPhan];

    const danhSachPhieuChi = [...danhSachPhieuChiThuoc, ...danhSachPhieuChiOpex];

    return {
      phamVi,
      isCaNhan: phamVi === 'ca_nhan',
      tenThuNgan: nvThuNgan?.hoTen || null,
      soHoaDonCaNhan,
      soHoaDonToanVien,
      tongThucThu,
      tongTienGiam,
      soHoaDonDaThu: daThanhToan.length,
      soHoaDonChoThu: choThanhToanCount,
      soHoaDonDaHuy: danhSachHoaDonHuy.length,
      tongTienHoanHuy: danhSachHoanTien.reduce((s, h) => s + h.soTien, 0),
      byPhuongThuc,
      chartTheoGio,
      giaoDichGanNhat: daThanhToan.slice(0, 10).map(h => ({
        id: h.id,
        maHoaDon: h.maHoaDon,
        benhNhanTen: h.benhNhan?.hoTen,
        benhNhanSdt: h.benhNhan?.soDienThoai,
        thucThu: thuRong(h),
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
      danhSachChungTu: [...phieuThu, ...danhSachPhieuChi, ...danhSachHoanTien]
        .sort((a, b) => new Date(b.ngayLap || 0).getTime() - new Date(a.ngayLap || 0).getTime()),
    };
  }

  /**
   * Lấy danh sách Phiếu chi hoạt động ngoài thuốc (OPEX)
   */
  async getDanhSachPhieuChiHoatDong(query: { tuNgay?: string; denNgay?: string; loaiChi?: string; trangThai?: string; search?: string }) {
    const qb = this.phieuChiHoatDongRepo.createQueryBuilder('pc')
      .leftJoinAndSelect('pc.nguoiLap', 'nl')
      .leftJoinAndSelect('pc.nguoiDuyet', 'nd')
      .leftJoinAndSelect('pc.nguoiChi', 'nc')
      .orderBy('pc.taoLuc', 'DESC');

    if (query.loaiChi && query.loaiChi !== 'all') {
      qb.andWhere('pc.loaiChi = :loaiChi', { loaiChi: query.loaiChi });
    }
    if (query.trangThai && query.trangThai !== 'all') {
      qb.andWhere('pc.trangThai = :trangThai', { trangThai: query.trangThai });
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
   * Lập phiếu chi hoạt động mới (OPEX) - Trạng thái ban đầu: 'cho_duyet'
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
    // Ngày VN + số lớn nhất trong ngày + 1 (trước đây ngày UTC + TỔNG số phiếu + 1: tên biến "countToday" nhưng
    // đếm mọi phiếu, và trùng mã — cột UNIQUE — khi từng xóa phiếu)
    const tienToPc = `PC-HD-${ngayVN().replace(/-/g, '')}-`;
    const [maxPc] = await this.phieuChiHoatDongRepo.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(ma_phieu_chi, '-', -1) AS UNSIGNED)), 0) AS n FROM phieu_chi_hoat_dong WHERE ma_phieu_chi LIKE ?`,
      [`${tienToPc}%`],
    );
    const maPhieuChi = `${tienToPc}${String(Number(maxPc?.n || 0) + 1).padStart(4, '0')}`;

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
      trangThai: 'cho_duyet',
    });

    const saved = await this.phieuChiHoatDongRepo.save(pc);

    // Bắn thông báo chuông cho Ban Giám Đốc duyệt khoản chi
    try {
      await this.thongBaoService.taoThongBaoTheoRole('ban_giam_doc', {
        tieuDe: `🏢 Đề xuất chi phí vận hành mới: ${saved.khoanChi}`,
        noiDung: `Thu ngân vừa lập phiếu chi ${saved.maPhieuChi} số tiền ${Number(saved.soTien || 0).toLocaleString('vi-VN')} đ cho ${saved.nguoiNhan}. Chờ Ban Giám Đốc duyệt chi.`,
        loai: 'phe_duyet',
        doiTuongBang: 'phieu_chi_hoat_dong',
        doiTuongId: saved.id,
      });
    } catch (e) {
      console.error('Lỗi gửi thông báo OPEX tới Giám Đốc:', e);
    }

    return {
      success: true,
      message: 'Lập đề xuất chi hoạt động thành công (Đang chờ Ban Giám Đốc phê duyệt)',
      data: saved,
    };
  }

  /**
   * Ban Giám Đốc duyệt hoặc từ chối phiếu chi hoạt động (OPEX)
   */
  async duyetPhieuChiHoatDong(id: number, duyet: boolean, lyDo?: string, userId = 1) {
    const pc = await this.phieuChiHoatDongRepo.findOne({ where: { id } });
    if (!pc) throw new NotFoundException('Không tìm thấy phiếu chi hoạt động');
    if (pc.trangThai !== 'cho_duyet') {
      throw new BadRequestException('Chỉ có thể phê duyệt phiếu chi đang ở trạng thái Chờ Giám Đốc duyệt');
    }

    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });

    if (duyet) {
      pc.trangThai = 'da_duyet';
      pc.nguoiDuyetId = nv?.id || null;
      pc.ngayDuyet = new Date();
      pc.lyDoTuChoi = null;
    } else {
      pc.trangThai = 'tu_choi';
      pc.nguoiDuyetId = nv?.id || null;
      pc.ngayDuyet = new Date();
      pc.lyDoTuChoi = lyDo || 'Ban Giám Đốc từ chối phê duyệt khoản chi này';
    }

    const saved = await this.phieuChiHoatDongRepo.save(pc);

    // Bắn thông báo chuông cho Thu Ngân về kết quả phê duyệt của Giám Đốc
    try {
      await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
        tieuDe: duyet
          ? `✓ Ban Giám Đốc đã duyệt chi: ${pc.maPhieuChi}`
          : `✕ Ban Giám Đốc từ chối duyệt chi: ${pc.maPhieuChi}`,
        noiDung: duyet
          ? `Khoản chi "${pc.khoanChi}" (${Number(pc.soTien || 0).toLocaleString('vi-VN')} đ) đã được Ban Giám Đốc phê duyệt. Thu ngân có thể tiến hành xuất quỹ!`
          : `Khoản chi "${pc.khoanChi}" bị từ chối. Lý do: "${pc.lyDoTuChoi}".`,
        loai: 'phe_duyet',
        doiTuongBang: 'phieu_chi_hoat_dong',
        doiTuongId: pc.id,
      });
    } catch (e) {
      console.error('Lỗi gửi thông báo duyệt OPEX tới Thu Ngân:', e);
    }

    return {
      success: true,
      message: duyet
        ? 'Ban Giám Đốc đã duyệt chi thành công. Thu ngân có thể tiến hành xuất quỹ!'
        : 'Ban Giám Đốc đã từ chối phiếu chi này.',
      data: saved,
    };
  }

  /**
   * Thu ngân xác nhận xuất tiền quỹ cho phiếu chi hoạt động đã được Giám đốc duyệt
   */
  async xuatTienPhieuChiHoatDong(id: number, userId = 1) {
    return this.withLock(`opex:${id}`, async () => {
      const pc = await this.phieuChiHoatDongRepo.findOne({ where: { id } });
      if (!pc) throw new NotFoundException('Không tìm thấy phiếu chi hoạt động');
      if (pc.trangThai !== 'da_duyet') {
        if (pc.trangThai === 'cho_duyet') {
          throw new BadRequestException('Phiếu chi đang chờ Ban Giám Đốc phê duyệt, chưa được phép xuất quỹ!');
        }
        if (pc.trangThai === 'da_chi') {
          throw new BadRequestException('Phiếu chi này đã được xuất quỹ trước đó rồi!');
        }
        if (pc.trangThai === 'tu_choi') {
          throw new BadRequestException(`Phiếu chi đã bị Ban Giám Đốc từ chối: "${pc.lyDoTuChoi || 'Không duyệt'}". Không thể xuất tiền!`);
        }
        throw new BadRequestException('Phiếu chi chưa được phê duyệt hợp lệ.');
      }

      const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
      pc.trangThai = 'da_chi';
      pc.nguoiChiId = nv?.id || userId;
      pc.ngayXuatQuy = new Date();
      pc.ngayChi = new Date();

      const saved = await this.phieuChiHoatDongRepo.save(pc);
      return {
        success: true,
        message: 'Thu ngân đã xác nhận xuất tiền quỹ thành công. Phiếu chi đã được ghi vào sổ quỹ!',
        data: saved,
      };
    });
  }

  /**
   * 1. Hủy trực tiếp phiếu chi hoạt động khi chưa xuất quỹ (cho_duyet hoặc da_duyet)
   */
  async huyTrucTiepPhieuChiHoatDong(id: number, lyDo?: string, userId = 1) {
    return this.withLock(`opex:${id}`, async () => {
      const pc = await this.phieuChiHoatDongRepo.findOne({ where: { id } });
      if (!pc) throw new NotFoundException('Không tìm thấy phiếu chi hoạt động');

      if (pc.trangThai === 'da_chi') {
        throw new BadRequestException('Phiếu chi này đã xuất quỹ tiền mặt! Vui lòng lập đơn yêu cầu hủy gửi Ban Giám Đốc phê duyệt.');
      }
      if (['da_huy', 'da_huy_hoan_quy'].includes(pc.trangThai)) {
        throw new BadRequestException('Phiếu chi này đã bị hủy trước đó rồi!');
      }

      const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
      pc.trangThai = 'da_huy';
      pc.lyDoHuy = lyDo || 'Kế toán/Thu ngân hủy chứng từ trước khi xuất quỹ';
      pc.nguoiYeuCauHuyId = nv?.id || userId;
      pc.ngayYeuCauHuy = new Date();

      const saved = await this.phieuChiHoatDongRepo.save(pc);
      return {
        success: true,
        message: 'Đã hủy phiếu chi thành công (tiền chưa xuất quỹ nên không ảnh hưởng sổ quỹ).',
        data: saved,
      };
    });
  }

  /**
   * 2. Gửi yêu cầu hủy phiếu chi đã xuất quỹ lên Ban Giám Đốc
   */
  async yeuCauHuyPhieuChiHoatDong(id: number, lyDo: string, userId = 1) {
    return this.withLock(`opex:${id}`, async () => {
      const pc = await this.phieuChiHoatDongRepo.findOne({ where: { id } });
      if (!pc) throw new NotFoundException('Không tìm thấy phiếu chi hoạt động');

      if (pc.trangThai !== 'da_chi') {
        throw new BadRequestException('Chỉ các phiếu chi đã xuất quỹ mới cần gửi đơn đề xuất hủy lên Ban Giám Đốc!');
      }
      if (!lyDo || !lyDo.trim()) {
        throw new BadRequestException('Bắt buộc phải nhập lý do đề xuất hủy phiếu chi và thu hồi tiền!');
      }

      // Chốt chặn Kế toán - Chốt ca Thu ngân: Không cho phép hủy phiếu chi tiền mặt đã nằm trong biên bản chốt ca đã khóa sổ
      if ((pc.phuongThucChi || 'tien_mat') === 'tien_mat' && pc.ngayChi && (pc.nguoiChiId || pc.nguoiLapId)) {
        const cashierId = pc.nguoiChiId || pc.nguoiLapId;
        const lockedShiftRows: any[] = await this.phieuChiHoatDongRepo.manager.query(
          `SELECT ma_chot_ca FROM chot_ca_thu_ngan
           WHERE thu_ngan_id = ?
             AND thoi_gian_bat_dau <= ?
             AND thoi_gian_ket_thuc >= ?
           LIMIT 1`,
          [cashierId, pc.ngayChi, pc.ngayChi],
        );
        if (lockedShiftRows.length > 0) {
          throw new BadRequestException({
            code: 'PHIEU_CHI_DA_KHOA_SO_CHOT_CA',
            message: `Phiếu chi ${pc.maPhieuChi} đã thuộc kỳ chốt ca bàn giao két tiền (${lockedShiftRows[0].ma_chot_ca}). Không thể hủy ngang làm lệch sổ quỹ đã khóa!`,
          });
        }
      }

      const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
      pc.trangThai = 'cho_duyet_huy';
      pc.lyDoHuy = lyDo.trim();
      pc.nguoiYeuCauHuyId = nv?.id || userId;
      pc.ngayYeuCauHuy = new Date();

      const saved = await this.phieuChiHoatDongRepo.save(pc);

      // Bắn thông báo chuông cho Ban Giám Đốc duyệt hủy phiếu chi
      try {
        await this.thongBaoService.taoThongBaoTheoRole('ban_giam_doc', {
          tieuDe: `🔄 Đề xuất hủy phiếu chi đã xuất quỹ: ${pc.maPhieuChi}`,
          noiDung: `Thu ngân vừa gửi đơn xin hủy & thu hồi ${Number(pc.soTien || 0).toLocaleString('vi-VN')} đ vào quỹ cho phiếu chi ${pc.maPhieuChi}. Lý do: "${pc.lyDoHuy}". Chờ Giám đốc duyệt.`,
          loai: 'phe_duyet',
          doiTuongBang: 'phieu_chi_hoat_dong',
          doiTuongId: pc.id,
        });
      } catch (e) {
        console.error('Lỗi gửi thông báo yêu cầu hủy OPEX:', e);
      }

      return {
        success: true,
        message: 'Đã gửi yêu cầu hủy phiếu chi lên Ban Giám Đốc xem xét phê duyệt.',
        data: saved,
      };
    });
  }

  /**
   * 3. Ban Giám Đốc phê duyệt / từ chối yêu cầu hủy phiếu chi
   */
  async duyetHuyPhieuChiHoatDong(id: number, duyet: boolean, lyDo?: string, userId = 1) {
    return this.withLock(`opex:${id}`, async () => {
      const pc = await this.phieuChiHoatDongRepo.findOne({ where: { id } });
      if (!pc) throw new NotFoundException('Không tìm thấy phiếu chi hoạt động');

      if (pc.trangThai !== 'cho_duyet_huy') {
        throw new BadRequestException('Phiếu chi không ở trạng thái Chờ Giám Đốc duyệt hủy!');
      }

      const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });

      if (duyet) {
        pc.trangThai = 'da_duyet_huy';
        pc.nguoiDuyetHuyId = nv?.id || userId;
        pc.ngayDuyetHuy = new Date();
      } else {
        pc.trangThai = 'da_chi'; // Trả về trạng thái đã chi ban đầu
        pc.lyDoTuChoi = lyDo || 'Ban Giám Đốc từ chối đề xuất hủy phiếu chi này';
      }

      const saved = await this.phieuChiHoatDongRepo.save(pc);

      // Bắn thông báo chuông cho Thu Ngân về kết quả duyệt hủy
      try {
        await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
          tieuDe: duyet
            ? `✓ GĐ đã đồng ý duyệt hủy phiếu chi: ${pc.maPhieuChi}`
            : `✕ GĐ từ chối đơn hủy phiếu chi: ${pc.maPhieuChi}`,
          noiDung: duyet
            ? `Ban Giám Đốc đã phê duyệt hủy phiếu chi ${pc.maPhieuChi} (${Number(pc.soTien || 0).toLocaleString('vi-VN')} đ). Thu ngân vui lòng bấm xác nhận thu hồi tiền về quỹ!`
            : `Lý do từ chối: "${pc.lyDoTuChoi}".`,
          loai: 'phe_duyet',
          doiTuongBang: 'phieu_chi_hoat_dong',
          doiTuongId: pc.id,
        });
      } catch (e) {
        console.error('Lỗi gửi thông báo duyệt hủy OPEX:', e);
      }

      return {
        success: true,
        message: duyet
          ? 'Ban Giám Đốc đã đồng ý duyệt hủy phiếu chi. Thu ngân có thể tiến hành xác nhận thu hồi tiền về quỹ!'
          : 'Ban Giám Đốc đã từ chối yêu cầu hủy phiếu chi này.',
        data: saved,
      };
    });
  }

  /**
   * 4. Thu ngân xác nhận thu hồi tiền vào quỹ (lần xác nhận cuối cùng)
   */
  async xacNhanHoanQuyPhieuChiHoatDong(id: number, userId = 1) {
    return this.withLock(`opex:${id}`, async () => {
      const pc = await this.phieuChiHoatDongRepo.findOne({ where: { id } });
      if (!pc) throw new NotFoundException('Không tìm thấy phiếu chi hoạt động');

      if (pc.trangThai !== 'da_duyet_huy') {
        throw new BadRequestException('Chỉ có thể thu hồi tiền khi Ban Giám Đốc đã phê duyệt đơn xin hủy!');
      }

      const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
      pc.trangThai = 'da_huy_hoan_quy';
      pc.nguoiHoanQuyId = nv?.id || userId;
      pc.ngayHoanQuy = new Date();

      const saved = await this.phieuChiHoatDongRepo.save(pc);

      // Bắn thông báo chuông cho Ban Giám Đốc tiền đã về két
      try {
        await this.thongBaoService.taoThongBaoTheoRole('ban_giam_doc', {
          tieuDe: `↺ Đã thu hồi tiền vào quỹ: ${pc.maPhieuChi}`,
          noiDung: `Thu ngân đã xác nhận nhận lại ${Number(pc.soTien || 0).toLocaleString('vi-VN')} đ vào quỹ cho phiếu chi ${pc.maPhieuChi}. Quỹ tiền mặt đã tự động phục hồi.`,
          loai: 'phe_duyet',
          doiTuongBang: 'phieu_chi_hoat_dong',
          doiTuongId: pc.id,
        });
      } catch (e) {
        console.error('Lỗi gửi thông báo hoàn quỹ:', e);
      }

      return {
        success: true,
        message: `Đã xác nhận thu hồi số tiền ${Number(saved.soTien || 0).toLocaleString('vi-VN')} đ vào quỹ thành công! Tiền đã tự động hồi về quỹ.`,
        data: saved,
      };
    });
  }

  /**
   * Giờ ca trực nhập từ form là giờ Việt Nam ("YYYY-MM-DDTHH:mm"). Chuỗi dùng để so sánh trong SQL
   * (kết nối DB chạy múi +07:00); Date lưu xuống gắn rõ +07:00 để không phụ thuộc biến TZ của tiến trình
   * (main.ts đặt TZ=Asia/Ho_Chi_Minh; thiếu nó thì new Date('...T07:00') sẽ bị hiểu theo giờ máy chủ).
   */
  private khoangCaTruc(thoiGianBatDau: string, thoiGianKetThuc: string) {
    const tu = `${thoiGianBatDau}:00`;
    const den = `${thoiGianKetThuc}:59`;
    const batDau = new Date(`${tu}+07:00`);
    const ketThuc = new Date(`${den}+07:00`);
    if (Number.isNaN(batDau.getTime()) || Number.isNaN(ketThuc.getTime())) {
      throw new BadRequestException('Thời gian ca trực không hợp lệ');
    }
    if (batDau > ketThuc) throw new BadRequestException('Giờ bắt đầu ca phải trước giờ kết thúc');
    return { tu, den, batDau, ketThuc };
  }

  /** Tiền thu / chi của một thu ngân trong khoảng ca trực — dùng chung cho xem trước và chốt ca */
  private async tinhTienCaTruc(nvId: number, tu: string, den: string) {
    const hoaDonList = await this.hoaDonRepo.createQueryBuilder('hd')
      .where('hd.thuNganId = :myId', { myId: nvId })
      .andWhere('hd.trangThai = :st', { st: 'da_thanh_toan' })
      .andWhere('hd.ngayThanhToan >= :tu AND hd.ngayThanhToan <= :den', { tu, den })
      .getMany();
    const laTienMat = (pt?: string | null) => (pt || 'tien_mat') === 'tien_mat';
    const thuTienMat = hoaDonList.filter(h => laTienMat(h.phuongThucThanhToan)).reduce((s, h) => s + thuRong(h), 0);
    const thuChuyenKhoan = hoaDonList.filter(h => !laTienMat(h.phuongThucThanhToan)).reduce((s, h) => s + thuRong(h), 0);

    // Phiếu chi vận hành do thu ngân chi trong ca
    const opexList = await this.phieuChiHoatDongRepo.createQueryBuilder('pc')
      .where('(pc.nguoiChiId = :myId OR (pc.nguoiLapId = :myId AND pc.nguoiChiId IS NULL))', { myId: nvId })
      .andWhere('pc.trangThai = :stDaChi', { stDaChi: 'da_chi' })
      .andWhere('pc.ngayChi >= :tu AND pc.ngayChi <= :den', { tu, den })
      .getMany();
    // Chi trả tiền thuốc cho NCC do chính thu ngân chi (trước đây bỏ sót → chi bằng tiền mặt thì két bị báo thừa)
    const chiThuocList = await this.yeuCauNhapKhoRepo.createQueryBuilder('yc')
      .where('yc.trang_thai_chi_tra = :daChi', { daChi: 'da_chi' })
      .andWhere('yc.nguoiChiTraId = :myId', { myId: nvId })
      .andWhere('yc.ngay_chi_tra >= :tu AND yc.ngay_chi_tra <= :den', { tu, den })
      .getMany();

    const chiTienMat =
      opexList.filter(pc => laTienMat(pc.phuongThucChi)).reduce((s, pc) => s + Number(pc.soTien || 0), 0) +
      chiThuocList.filter(yc => (yc.phuongThucChi || 'chuyen_khoan') === 'tien_mat').reduce((s, yc) => s + Number(yc.soTienChiTra || 0), 0);
    const tongThucChi =
      opexList.reduce((s, pc) => s + Number(pc.soTien || 0), 0) +
      chiThuocList.reduce((s, yc) => s + Number(yc.soTienChiTra || 0), 0);

    return {
      hoaDonList,
      soPhieuChi: opexList.length + chiThuocList.length,
      thuTienMat,
      thuChuyenKhoan,
      chiTienMat,
      tongThucThu: thuTienMat + thuChuyenKhoan,
      tongThucChi,
      tienMatHeThong: thuTienMat - chiTienMat, // Tiền mặt hệ thống = Thu tiền mặt − Chi tiền mặt
    };
  }

  /** Xem trước tiền mặt hệ thống của ca trước khi chốt (cùng công thức với lúc lưu biên bản) */
  async xemTruocChotCa(userId: number, thoiGianBatDau: string, thoiGianKetThuc: string) {
    const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
    if (!nv) throw new BadRequestException('Không tìm thấy thông tin nhân viên thu ngân');
    const { tu, den } = this.khoangCaTruc(thoiGianBatDau, thoiGianKetThuc);
    const { hoaDonList, ...tong } = await this.tinhTienCaTruc(nv.id, tu, den);
    return { data: { ...tong, soPhieuThu: hoaDonList.length } };
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
    return this.withLock(`chot_ca:user:${userId}`, async () => {
      const nv = await this.nhanVienRepo.findOne({ where: { nguoiDungId: userId } });
      if (!nv) throw new BadRequestException('Không tìm thấy thông tin nhân viên thu ngân');

      const { tu, den, batDau, ketThuc } = this.khoangCaTruc(dto.thoiGianBatDau, dto.thoiGianKetThuc);

      // Chặn bấm đúp tạo 2 biên bản chốt ca trùng khoảng thời gian
      const duplicateShift = await this.chotCaRepo.findOne({
        where: {
          thuNganId: nv.id,
          thoiGianBatDau: batDau,
          thoiGianKetThuc: ketThuc,
        },
      });
      if (duplicateShift) {
        throw new BadRequestException({
          code: 'CA_TRUC_DA_CHOT',
          message: `Khoảng thời gian ca trực này đã được lập biên bản chốt ca (${duplicateShift.maChotCa}) trước đó!`,
        });
      }

      const {
        hoaDonList, soPhieuChi, thuChuyenKhoan, chiTienMat, tongThucThu, tongThucChi, tienMatHeThong,
      } = await this.tinhTienCaTruc(nv.id, tu, den);
      const tienMatThucTe = Number(dto.tienMatThucTe || 0);
      const chenhLech = tienMatThucTe - tienMatHeThong;

      const todayStr = ngayVN().replace(/-/g, '');
      const prefix = `CC-${todayStr}-`;
      const maxRows: any[] = await this.chotCaRepo.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(ma_chot_ca, '-', -1) AS UNSIGNED)), 0) AS maxNum
         FROM chot_ca_thu_ngan
         WHERE ma_chot_ca LIKE ?`,
        [`${prefix}%`],
      );
      const nextNum = Number(maxRows?.[0]?.maxNum || 0) + 1;
      const maChotCa = `${prefix}${String(nextNum).padStart(4, '0')}`;

      const chotCa = this.chotCaRepo.create({
        maChotCa,
        thuNganId: nv.id,
        nguoiNhanCaId: dto.nguoiNhanCaId || null,
        thoiGianBatDau: batDau,
        thoiGianKetThuc: ketThuc,
        tienMatHeThong,
        tienMatThucTe,
        chenhLech,
        chiTietMenhGia: dto.chiTietMenhGia || null,
        tongThuChuyenKhoan: thuChuyenKhoan,
        tongChiTienMat: chiTienMat,
        tongThucThu,
        tongThucChi,
        soLuongPhieuThu: hoaDonList.length,
        soLuongPhieuChi: soPhieuChi,
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
    });
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
