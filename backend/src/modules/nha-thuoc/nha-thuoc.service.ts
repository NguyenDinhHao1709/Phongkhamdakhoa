import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Thuoc } from './entities/thuoc.entity';
import { LoThuoc } from './entities/lo-thuoc.entity';
import { DonThuoc } from './entities/don-thuoc.entity';
import { DonThuocChiTiet } from './entities/don-thuoc-chi-tiet.entity';
import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { NhaCungCap } from './entities/nha-cung-cap.entity';
import { YeuCauNhapKho } from './entities/yeu-cau-nhap-kho.entity';
import { YeuCauNhapKhoChiTiet } from './entities/yeu-cau-nhap-kho-chi-tiet.entity';

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
    @InjectRepository(BenhAnKham)
    private readonly benhAnRepo: Repository<BenhAnKham>,
    @InjectRepository(HoaDon)
    private readonly hoaDonRepo: Repository<HoaDon>,
    @InjectRepository(BenhNhan)
    private readonly benhNhanRepo: Repository<BenhNhan>,
    @InjectRepository(NhaCungCap)
    private readonly nhaCungCapRepo: Repository<NhaCungCap>,
    @InjectRepository(YeuCauNhapKho)
    private readonly yeuCauNhapRepo: Repository<YeuCauNhapKho>,
    @InjectRepository(YeuCauNhapKhoChiTiet)
    private readonly yeuCauNhapChiTietRepo: Repository<YeuCauNhapKhoChiTiet>,
    private readonly dataSource: DataSource,
  ) {}

  async getMuaHang(trangThai?: string, trangThaiChiTra?: string) {
    const yeuCauQb = this.yeuCauNhapRepo.createQueryBuilder('yc')
      .leftJoinAndSelect(YeuCauNhapKhoChiTiet, 'ct', 'ct.yeu_cau_id = yc.id')
      .leftJoinAndSelect(Thuoc, 't', 't.id = ct.thuoc_id')
      .leftJoinAndSelect(NhaCungCap, 'ncc', 'ncc.id = ct.nha_cung_cap_id')
      .orderBy('yc.tao_luc', 'DESC');
    if (trangThai && trangThai !== 'all') yeuCauQb.where('yc.trang_thai = :trangThai', { trangThai });
    if (trangThaiChiTra && trangThaiChiTra !== 'all') {
      yeuCauQb.andWhere('yc.trang_thai_chi_tra = :trangThaiChiTra', { trangThaiChiTra });
    }
    const rows = await yeuCauQb.getRawMany();
    const grouped = new Map<number, any>();
    rows.forEach((row) => {
      const id = Number(row.yc_id);
      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          maYeuCau: row.yc_ma_yeu_cau,
          nguoiLapId: row.yc_nguoi_lap_id,
          trangThai: row.yc_trang_thai,
          tongDuToan: Number(row.yc_tong_du_toan || 0),
          tongThucTe: Number(row.yc_tong_thuc_te || 0),
          trangThaiChiTra: row.yc_trang_thai_chi_tra,
          soTienChiTra: Number(row.yc_so_tien_chi_tra || 0),
          phuongThucChi: row.yc_phuong_thuc_chi,
          soChungTuChi: row.yc_so_chung_tu_chi,
          ghiChuChi: row.yc_ghi_chu_chi,
          ghiChu: row.yc_ghi_chu,
          taoLuc: row.yc_tao_luc,
          chiTiet: [],
        });
      }
      if (row.ct_id) {
        grouped.get(id).chiTiet.push({
          id: Number(row.ct_id),
          thuocId: row.ct_thuoc_id,
          tenThuoc: row.t_ten_thuoc,
          nhaCungCapId: row.ct_nha_cung_cap_id,
          tenNhaCungCap: row.ncc_ten_nha_cung_cap,
          soLuongDat: Number(row.ct_so_luong_dat || 0),
          soLuongGiao: Number(row.ct_so_luong_giao || 0),
          soLuongDatChatLuong: Number(row.ct_so_luong_dat_chat_luong || 0),
          soLuongHong: Number(row.ct_so_luong_hong || 0),
          soLuongThieu: Number(row.ct_so_luong_thieu || 0),
          donGiaBao: Number(row.ct_don_gia_bao || 0),
          donGiaChon: Number(row.ct_don_gia_chon || 0),
          baoGiaSoSanh: row.ct_bao_gia_so_sanh || [],
          maLo: row.ct_ma_lo,
          ngayHetHan: row.ct_ngay_het_han,
          ghiChu: row.ct_ghi_chu,
        });
      }
    });
    return { message: 'Lấy quy trình mua thuốc thành công', data: Array.from(grouped.values()) };
  }

  async taoNhaCungCap(data: any) {
    if (!data.tenNhaCungCap?.trim()) throw new BadRequestException('Tên nhà cung cấp là bắt buộc');
    const count = await this.nhaCungCapRepo.count();
    const ncc = this.nhaCungCapRepo.create({
      maNhaCungCap: data.maNhaCungCap?.trim() || `NCC${String(count + 1).padStart(4, '0')}`,
      tenNhaCungCap: data.tenNhaCungCap.trim(),
      maSoThue: data.maSoThue || null,
      nguoiLienHe: data.nguoiLienHe || null,
      soDienThoai: data.soDienThoai || null,
      email: data.email || null,
      diaChi: data.diaChi || null,
      dieuKhoanThanhToan: data.dieuKhoanThanhToan || null,
    });
    return { message: 'Thêm nhà cung cấp thành công', data: await this.nhaCungCapRepo.save(ncc) };
  }

  async capNhatNhaCungCap(id: number, data: any) {
    const ncc = await this.nhaCungCapRepo.findOne({ where: { id } });
    if (!ncc) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    if (!data.tenNhaCungCap?.trim()) throw new BadRequestException('Tên nhà cung cấp là bắt buộc');
    Object.assign(ncc, {
      tenNhaCungCap: data.tenNhaCungCap.trim(),
      maSoThue: data.maSoThue || null,
      nguoiLienHe: data.nguoiLienHe || null,
      soDienThoai: data.soDienThoai || null,
      email: data.email || null,
      diaChi: data.diaChi || null,
      dieuKhoanThanhToan: data.dieuKhoanThanhToan || null,
    });
    return { message: 'Cập nhật nhà cung cấp thành công', data: await this.nhaCungCapRepo.save(ncc) };
  }

  async ngungHopTacNhaCungCap(id: number) {
    const ncc = await this.nhaCungCapRepo.findOne({ where: { id } });
    if (!ncc) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    ncc.trangThai = 'ngung_hop_tac';
    await this.nhaCungCapRepo.save(ncc);
    return { message: 'Đã ngừng hợp tác với nhà cung cấp' };
  }

  async getNhaCungCap() {
    return { data: await this.nhaCungCapRepo.find({ where: { trangThai: 'dang_hop_tac' }, order: { tenNhaCungCap: 'ASC' } }) };
  }

  async taoYeuCauNhap(data: any) {
    if (!Array.isArray(data.chiTiet) || data.chiTiet.length === 0) {
      throw new BadRequestException('Yêu cầu phải có ít nhất một thuốc');
    }
    const normalizedDetails = data.chiTiet.map((item) => ({
      ...item,
      thuocId: Number(item.thuocId),
      soLuongDat: Number(item.soLuongDat),
      donGiaBao: Number(item.donGiaBao || 0),
    }));
    if (normalizedDetails.some((item) => !Number.isInteger(item.thuocId) || item.thuocId <= 0)) {
      throw new BadRequestException('Mỗi dòng yêu cầu phải chọn một thuốc hợp lệ');
    }
    if (normalizedDetails.some((item) => !Number.isFinite(item.soLuongDat) || item.soLuongDat <= 0)) {
      throw new BadRequestException('Số lượng đặt phải lớn hơn 0');
    }
    if (normalizedDetails.some((item) => !Number.isFinite(item.donGiaBao) || item.donGiaBao < 0)) {
      throw new BadRequestException('Giá dự kiến không được âm');
    }
    const medicineSet = new Set(normalizedDetails.map((item) => item.thuocId));
    if (medicineSet.size !== normalizedDetails.length) {
      throw new BadRequestException('Không được lặp cùng một thuốc trong một yêu cầu');
    }
    const count = await this.yeuCauNhapRepo.count();
    const thuocIds = [...medicineSet];
    const thuocDaCo = await this.thuocRepo.findBy({ id: In(thuocIds) });
    if (thuocDaCo.length !== thuocIds.length) {
      const idsHopLe = thuocDaCo.map((thuoc) => thuoc.id).join(', ');
      throw new BadRequestException(
        `Có mã thuốc không tồn tại. Mã hợp lệ trong yêu cầu hiện tại: ${idsHopLe || 'chưa có dữ liệu'}`,
      );
    }
    const stoppedMedicine = thuocDaCo.find((thuoc) => thuoc.trangThai === 'ngung_kinh_doanh');
    if (stoppedMedicine) {
      throw new BadRequestException(`Thuốc ${stoppedMedicine.tenThuoc} đã ngừng kinh doanh, không thể lập yêu cầu mua mới`);
    }
    const yc = await this.yeuCauNhapRepo.save(this.yeuCauNhapRepo.create({
      maYeuCau: `YC${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(count + 1).padStart(4, '0')}`,
      nguoiLapId: Number(data.nguoiLapId || 1),
      ghiChu: data.ghiChu || null,
      tongDuToan: normalizedDetails.reduce((sum, item) => sum + item.soLuongDat * item.donGiaBao, 0),
    }));
    const details = normalizedDetails.map((item) => this.yeuCauNhapChiTietRepo.create({
      yeuCauId: yc.id,
      thuocId: item.thuocId,
      nhaCungCapId: item.nhaCungCapId || null,
      soLuongDat: item.soLuongDat,
      donGiaBao: item.donGiaBao,
      donGiaChon: Number(item.donGiaChon || item.donGiaBao || 0),
      ghiChu: item.ghiChu || null,
    }));
    await this.yeuCauNhapChiTietRepo.save(details);
    return { message: 'Đã gửi yêu cầu mua thuốc chờ Giám đốc duyệt', data: yc };
  }

  async duyetYeuCauNhap(id: number, duyet: boolean, lyDo?: string, nguoiDuyetId = 1) {
    const yc = await this.yeuCauNhapRepo.findOne({ where: { id } });
    if (!yc) throw new NotFoundException('Không tìm thấy yêu cầu nhập kho');
    if (yc.trangThai !== 'cho_duyet') throw new BadRequestException('Yêu cầu không còn ở trạng thái chờ duyệt');
    yc.trangThai = duyet ? 'da_duyet' : 'tu_choi';
    yc.lyDoTuChoi = duyet ? null : (lyDo || 'Không nêu lý do');
    yc.nguoiDuyetId = nguoiDuyetId;
    yc.ngayDuyet = new Date();
    return { message: duyet ? 'Đã duyệt yêu cầu mua thuốc' : 'Đã từ chối yêu cầu mua thuốc', data: await this.yeuCauNhapRepo.save(yc) };
  }

  async capNhatBaoGia(id: number, chiTiet: any[]) {
    const yc = await this.yeuCauNhapRepo.findOne({ where: { id } });
    if (!yc || !['da_duyet', 'dang_bao_gia'].includes(yc.trangThai)) throw new BadRequestException('Yêu cầu chưa được duyệt để nhập báo giá');
    if (!Array.isArray(chiTiet) || chiTiet.length === 0) {
      throw new BadRequestException('Phải nhập báo giá cho tất cả thuốc trong yêu cầu');
    }
    const details = await this.yeuCauNhapChiTietRepo.find({ where: { yeuCauId: id } });
    if (chiTiet.length !== details.length || new Set(chiTiet.map((item) => Number(item.id))).size !== details.length) {
      throw new BadRequestException('Danh sách báo giá không khớp với yêu cầu mua thuốc');
    }
    const suppliers = await this.nhaCungCapRepo.find({ where: { trangThai: 'dang_hop_tac' } });
    for (const item of chiTiet || []) {
      const detail = details.find((row) => row.id === Number(item.id));
      const selectedSupplier = suppliers.find((supplier) => supplier.id === Number(item.nhaCungCapId));
      const selectedPrice = Number(item.donGiaChon || 0);
      const quotes = Array.isArray(item.baoGiaSoSanh) ? item.baoGiaSoSanh : [];
      if (!detail || !selectedSupplier || !Number.isFinite(selectedPrice) || selectedPrice <= 0) {
        throw new BadRequestException('Mỗi thuốc phải có nhà cung cấp hợp lệ và giá chọn lớn hơn 0');
      }
      if (!quotes.some((quote) => Number(quote.nhaCungCapId) === selectedSupplier.id && Number(quote.donGia) === selectedPrice)) {
        throw new BadRequestException('Giá chọn phải nằm trong bảng báo giá của nhà cung cấp');
      }
      await this.yeuCauNhapChiTietRepo.update(item.id, {
        nhaCungCapId: selectedSupplier.id,
        donGiaBao: Number(item.donGiaBao || 0),
        donGiaChon: selectedPrice,
        baoGiaSoSanh: quotes,
      });
    }
    yc.trangThai = 'da_chon_nha_cung_cap';
    yc.tongDuToan = (await this.yeuCauNhapChiTietRepo.find({ where: { yeuCauId: id } }))
      .reduce((sum, item) => sum + Number(item.soLuongDat) * Number(item.donGiaChon), 0);
    return { message: 'Đã lưu báo giá và lựa chọn nhà cung cấp', data: await this.yeuCauNhapRepo.save(yc) };
  }

  async tiepNhanHang(id: number, chiTiet: any[]) {
    const yc = await this.yeuCauNhapRepo.findOne({ where: { id } });
    if (!yc || !['da_duyet', 'da_chon_nha_cung_cap', 'dang_giao'].includes(yc.trangThai)) {
      throw new BadRequestException('Yêu cầu chưa sẵn sàng để tiếp nhận hàng');
    }
    const details = await this.yeuCauNhapChiTietRepo.find({ where: { yeuCauId: id } });
    for (const item of chiTiet || []) {
      const detail = details.find((row) => row.id === Number(item.id));
      if (!detail) continue;
      const acceptedBefore = Number(detail.soLuongDatChatLuong || 0);
      const giao = Number(item.soLuongGiao);
      const dat = Number(item.soLuongDatChatLuong);
      const hong = Number(item.soLuongHong);
      if (![giao, dat, hong].every(Number.isFinite) || giao < 0 || dat < 0 || hong < 0) {
        throw new BadRequestException(`Số lượng kiểm nhận không hợp lệ ở dòng ${detail.id}`);
      }
      if (giao > Number(detail.soLuongDat)) {
        throw new BadRequestException(`Số lượng giao không được vượt số lượng đặt ở dòng ${detail.id}`);
      }
      if (dat < Number(detail.soLuongDatChatLuong || 0) || giao < Number(detail.soLuongGiao || 0)) {
        throw new BadRequestException(`Không được giảm số lượng đã kiểm nhận ở dòng ${detail.id}`);
      }
      if (giao !== dat + hong) throw new BadRequestException(`Số lượng giao phải bằng đạt + hỏng ở dòng ${detail.id}`);
      if (dat > 0 && (!item.ngayHetHan || new Date(item.ngayHetHan) <= new Date())) {
        throw new BadRequestException(`Hạn dùng phải được nhập và phải ở tương lai ở dòng ${detail.id}`);
      }
      detail.soLuongGiao = giao;
      detail.soLuongDatChatLuong = dat;
      detail.soLuongHong = hong;
      detail.soLuongThieu = Math.max(0, Number(detail.soLuongDat) - giao);
      detail.maLo = item.maLo || detail.maLo;
      detail.ngayHetHan = item.ngayHetHan || detail.ngayHetHan;
      detail.ghiChu = item.ghiChu || detail.ghiChu;
      await this.yeuCauNhapChiTietRepo.save(detail);

      const acceptedDelta = dat - acceptedBefore;
      if (acceptedDelta > 0 && detail.thuocId) {
        const thuoc = await this.thuocRepo.findOne({ where: { id: detail.thuocId } });
        if (!thuoc) throw new NotFoundException(`Không tìm thấy thuốc ID ${detail.thuocId}`);
        let lo = detail.maLo
          ? await this.loThuocRepo.findOne({ where: { thuocId: detail.thuocId, maLo: detail.maLo } })
          : null;
        if (!lo) {
          lo = this.loThuocRepo.create({
            thuocId: detail.thuocId,
            maLo: detail.maLo || `LO-${id}-${detail.id}`,
            ngaySanXuat: null,
            ngayHetHan: detail.ngayHetHan,
            soLuongNhap: acceptedDelta,
            soLuongTon: acceptedDelta,
            giaNhap: Number(detail.donGiaChon || 0),
            nhaCungCap: detail.nhaCungCapId ? String(detail.nhaCungCapId) : null,
            trangThai: 'con_hang',
          });
        } else {
          lo.soLuongNhap = Number(lo.soLuongNhap || 0) + acceptedDelta;
          lo.soLuongTon = Number(lo.soLuongTon || 0) + acceptedDelta;
          lo.giaNhap = Number(detail.donGiaChon || lo.giaNhap || 0);
        }
        await this.loThuocRepo.save(lo);
        thuoc.tonKhoTong = Number(thuoc.tonKhoTong || 0) + acceptedDelta;
        thuoc.trangThai = 'con_hang';
        await this.thuocRepo.save(thuoc);
      }
    }
    yc.tongThucTe = details.reduce((sum, item) => sum + Number(item.soLuongDatChatLuong) * Number(item.donGiaChon), 0);
    yc.trangThai = details.some((item) => item.soLuongHong > 0 || item.soLuongThieu > 0) ? 'giao_mot_phan' : 'da_nhap_kho';
    if (yc.trangThai === 'da_nhap_kho') yc.trangThaiChiTra = 'cho_chi';
    return { message: 'Đã kiểm nhận hàng; chỉ số lượng đạt được nhập kho', data: await this.yeuCauNhapRepo.save(yc) };
  }

  async chiTraNhaCungCap(
    id: number,
    data: { soTien?: number; phuongThucChi?: string; soChungTuChi?: string; ghiChu?: string },
    nguoiChiTraId = 1,
  ) {
    const yc = await this.yeuCauNhapRepo.findOne({ where: { id } });
    if (!yc) throw new NotFoundException('Không tìm thấy yêu cầu nhập kho');
    if (yc.trangThai !== 'da_nhap_kho') throw new BadRequestException('Chỉ được chi trả sau khi hoàn tất kiểm nhận và nhập đủ hàng');
    if (yc.trangThaiChiTra === 'da_chi') throw new BadRequestException('Yêu cầu đã được chi trả');
    const soTien = Number(data.soTien ?? yc.tongThucTe);
    if (!Number.isFinite(soTien) || soTien <= 0) throw new BadRequestException('Số tiền chi trả phải lớn hơn 0');
    if (soTien !== Number(yc.tongThucTe)) throw new BadRequestException('Số tiền chi phải đúng bằng tổng giá trị thực tế');
    if (!['chuyen_khoan', 'tien_mat', 'the'].includes(data.phuongThucChi || '')) {
      throw new BadRequestException('Phương thức chi không hợp lệ');
    }
    if (data.soChungTuChi) {
      const duplicate = await this.yeuCauNhapRepo.findOne({ where: { soChungTuChi: data.soChungTuChi } });
      if (duplicate && duplicate.id !== id) throw new BadRequestException('Số chứng từ chi đã được sử dụng');
    }
    yc.trangThaiChiTra = 'da_chi';
    yc.soTienChiTra = soTien;
    yc.phuongThucChi = data.phuongThucChi || 'chuyen_khoan';
    yc.soChungTuChi = data.soChungTuChi || `PC-${yc.maYeuCau}`;
    yc.ghiChuChi = data.ghiChu || null;
    yc.nguoiChiTraId = nguoiChiTraId;
    yc.ngayChiTra = new Date();
    yc.ghiChu = data.ghiChu ? `${yc.ghiChu || ''}\nChi trả: ${data.ghiChu}`.trim() : yc.ghiChu;
    return { message: 'Thu ngân đã ghi nhận chi trả nhà cung cấp', data: await this.yeuCauNhapRepo.save(yc) };
  }

  /**
   * Lấy danh sách danh mục thuốc & tồn kho (kèm thông tin Lô & Hạn sử dụng)
   */
  async getDanhSachThuoc(search?: string) {
    const qb = this.thuocRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.loThuocList', 'lo');

    if (search) {
      const keyword = `%${search.trim()}%`;
      qb.where('t.tenThuoc LIKE :keyword OR t.maThuoc LIKE :keyword OR t.tenHoatChat LIKE :keyword OR lo.maLo LIKE :keyword', { keyword });
    }

    const list = await qb.orderBy('t.tenThuoc', 'ASC').addOrderBy('lo.ngayHetHan', 'ASC').getMany();

    return {
      message: 'Lấy danh sách thuốc thành công',
      data: list.map((item) => {
        // Tìm lô còn hạn và còn tồn kho, hoặc lấy lô đầu tiên
        const activeLo =
          item.loThuocList && item.loThuocList.length > 0
            ? item.loThuocList.find((l) => Number(l.soLuongTon) > 0) || item.loThuocList[0]
            : null;

        return {
          id: item.id,
          maThuoc: item.maThuoc,
          tenThuoc: item.tenThuoc,
          tenHoatChat: item.tenHoatChat,
          donViTinh: item.donViTinh,
          hamLuong: item.hamLuong,
          duongDung: item.duongDung,
          giaBan: Number(item.giaBan),
          tonKhoTong: Number(item.tonKhoTong),
          moTa: item.moTa,
          trangThai: item.trangThai,
          maLo: activeLo?.maLo || null,
          ngaySanXuat: activeLo?.ngaySanXuat ? String(activeLo.ngaySanXuat).substring(0, 10) : null,
          ngayHetHan: activeLo?.ngayHetHan ? String(activeLo.ngayHetHan).substring(0, 10) : null,
          nhaCungCap: activeLo?.nhaCungCap || null,
        };
      }),
    };
  }

  /**
   * Thêm thuốc vào danh mục; lô hàng chỉ được tạo khi kiểm nhận phiếu mua.
   */
  async taoThuoc(data: any) {
    const count = await this.thuocRepo.count();
    let maThuoc = data.maThuoc?.trim() || `TH${String(count + 1).padStart(3, '0')}`;
    const existing = await this.thuocRepo.findOne({ where: { maThuoc } });
    if (existing) {
      maThuoc = `TH_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    const newThuoc = this.thuocRepo.create({
      maThuoc,
      tenThuoc: data.tenThuoc,
      tenHoatChat: data.tenHoatChat || null,
      donViTinh: data.donViTinh || 'Viên',
      hamLuong: data.hamLuong || null,
      duongDung: data.duongDung || 'Uống',
      giaBan: Number(data.giaBan || 0),
      tonKhoTong: 0,
      moTa: data.moTa || null,
      trangThai: 'het_hang',
    });

    const saved = await this.thuocRepo.save(newThuoc);

    return { message: 'Thêm thuốc mới thành công', data: saved };
  }

  /**
   * Cập nhật thông tin thuốc & Lô hạn dùng
   */
  async capNhatThuoc(id: number, data: any) {
    const thuoc = await this.thuocRepo.findOne({ where: { id } });
    if (!thuoc) throw new NotFoundException('Không tìm thấy thuốc');

    if (data.tonKhoTong !== undefined && Number(data.tonKhoTong) !== Number(thuoc.tonKhoTong)) {
      throw new BadRequestException('Không được sửa trực tiếp tồn kho; hãy lập yêu cầu nhập hoặc phiếu điều chỉnh kho');
    }
    const tonKhoTong = Number(thuoc.tonKhoTong);

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

    const soLo = await this.loThuocRepo.count({ where: { thuocId: id } });
    const soDongDon = await this.donThuocChiTietRepo.count({ where: { thuocId: id } });
    const soDongNhap = await this.yeuCauNhapChiTietRepo.count({ where: { thuocId: id } });
    if (soLo > 0 || soDongDon > 0 || soDongNhap > 0 || Number(thuoc.tonKhoTong) > 0) {
      throw new BadRequestException('Thuốc đã có lịch sử hoặc tồn kho; hãy dùng chức năng Ngừng kinh doanh để giữ nguyên dữ liệu ERP');
    }
    // Chỉ xóa dữ liệu danh mục chưa phát sinh nghiệp vụ.
    await this.loThuocRepo.delete({ thuocId: id });
    await this.thuocRepo.delete(id);
    return { message: 'Xóa thuốc thành công' };
  }

  async ngungKinhDoanhThuoc(id: number) {
    const thuoc = await this.thuocRepo.findOne({ where: { id } });
    if (!thuoc) throw new NotFoundException('Không tìm thấy thuốc');
    thuoc.trangThai = 'ngung_kinh_doanh';
    return { message: 'Đã ngừng kinh doanh thuốc và giữ nguyên lịch sử kho', data: await this.thuocRepo.save(thuoc) };
  }

  /**
   * Lấy danh sách đơn thuốc từ bác sĩ kê kèm thông tin bệnh nhân & trạng thái viện phí
   */
  async getDanhSachDonThuoc(query: { trangThai?: string; search?: string; benhAnKhamId?: number }) {
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

    if (query.benhAnKhamId) {
      qb.andWhere('dt.benhAnKhamId = :benhAnKhamId', { benhAnKhamId: Number(query.benhAnKhamId) });
    } else if (query.search) {
      const keyword = `%${query.search.trim()}%`;
      qb.andWhere('(dt.maDonThuoc LIKE :keyword OR nv.hoTen LIKE :keyword)', { keyword });
    }

    const list = await qb.getMany();

    const dataWithPatientAndPayment = await Promise.all(
      list.map(async (dt) => {
        let benhNhan: any = null;
        let hd: any = null;
        let luotTiepNhanId: number | null = null;

        if (dt.benhAnKhamId) {
          const bak = await this.benhAnRepo.findOne({
            where: { id: dt.benhAnKhamId },
            relations: ['hoSoBenhAn', 'hoSoBenhAn.benhNhan'],
          });
          if (bak) {
            luotTiepNhanId = bak.luotTiepNhanId;
            benhNhan = bak.hoSoBenhAn?.benhNhan || null;
            if (!benhNhan && bak.hoSoBenhAn?.benhNhanId) {
              benhNhan = await this.benhNhanRepo.findOne({ where: { id: bak.hoSoBenhAn.benhNhanId } });
            }
            if (luotTiepNhanId) {
              hd = await this.hoaDonRepo.findOne({ where: { luotTiepNhanId } });
            }
          }
        }

        const trangThaiThanhToan =
          hd?.trangThai === 'da_thanh_toan'
            ? 'da_thanh_toan'
            : hd
            ? 'cho_thanh_toan'
            : 'chua_co_hoa_don';

        return {
          id: dt.id,
          maDonThuoc: dt.maDonThuoc,
          benhAnKhamId: dt.benhAnKhamId,
          luotTiepNhanId,
          bacSi: dt.bacSiKe?.nhanVien?.hoTen || 'Bác sĩ',
          ngayKe: dt.ngayKe,
          trangThai: dt.trangThai,
          luaChonMua: dt.luaChonMua,
          maPhieuNhanThuoc: dt.maPhieuNhanThuoc,
          ngayCapPhat: dt.ngayCapPhat,
          ghiChu: dt.ghiChu,
          soLuongMon: dt.chiTiet ? dt.chiTiet.length : 0,
          benhNhan: benhNhan
            ? {
                id: benhNhan.id,
                maBenhNhan: benhNhan.maBenhNhan,
                hoTen: benhNhan.hoTen,
                soDienThoai: benhNhan.soDienThoai,
                gioiTinh: benhNhan.gioiTinh,
              }
            : null,
          hoaDon: hd
            ? {
                id: hd.id,
                maHoaDon: hd.maHoaDon,
                tongTien: Number(hd.tongTien),
                soTienGiam: Number(hd.soTienGiam),
                thucThu: Number(hd.thucThu),
                trangThai: hd.trangThai,
                phuongThucThanhToan: hd.phuongThucThanhToan,
                ngayThanhToan: hd.ngayThanhToan,
              }
            : null,
          trangThaiThanhToan,
          chiTiet: dt.chiTiet
            ? dt.chiTiet.map((ct) => ({
                id: ct.id,
                soLuong: ct.soLuong,
                lieuDung: ct.lieuDung,
                soNgayDung: ct.soNgayDung,
                thuoc: ct.thuoc
                  ? {
                      id: ct.thuoc.id,
                      maThuoc: ct.thuoc.maThuoc,
                      tenThuoc: ct.thuoc.tenThuoc,
                      donViTinh: ct.thuoc.donViTinh,
                      giaBan: ct.thuoc.giaBan,
                    }
                  : null,
              }))
            : [],
        };
      })
    );

    return {
      message: 'Lấy danh sách đơn thuốc thành công',
      data: dataWithPatientAndPayment,
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

    let benhNhan: any = null;
    let hd: any = null;
    let luotTiepNhanId: number | null = null;

    if (dt.benhAnKhamId) {
      const bak = await this.benhAnRepo.findOne({
        where: { id: dt.benhAnKhamId },
        relations: ['hoSoBenhAn', 'hoSoBenhAn.benhNhan'],
      });
      if (bak) {
        luotTiepNhanId = bak.luotTiepNhanId;
        benhNhan = bak.hoSoBenhAn?.benhNhan || null;
        if (!benhNhan && bak.hoSoBenhAn?.benhNhanId) {
          benhNhan = await this.benhNhanRepo.findOne({ where: { id: bak.hoSoBenhAn.benhNhanId } });
        }
        if (luotTiepNhanId) {
          hd = await this.hoaDonRepo.findOne({ where: { luotTiepNhanId } });
        }
      }
    }

    const trangThaiThanhToan =
      hd?.trangThai === 'da_thanh_toan'
        ? 'da_thanh_toan'
        : hd
        ? 'cho_thanh_toan'
        : 'chua_co_hoa_don';

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
        luaChonMua: dt.luaChonMua,
        maPhieuNhanThuoc: dt.maPhieuNhanThuoc,
        ngayCapPhat: dt.ngayCapPhat,
        ghiChu: dt.ghiChu,
        luotTiepNhanId,
        benhNhan: benhNhan
          ? {
              id: benhNhan.id,
              maBenhNhan: benhNhan.maBenhNhan,
              hoTen: benhNhan.hoTen,
              soDienThoai: benhNhan.soDienThoai,
              gioiTinh: benhNhan.gioiTinh,
              ngaySinh: benhNhan.ngaySinh,
            }
          : null,
        hoaDon: hd
          ? {
              id: hd.id,
              maHoaDon: hd.maHoaDon,
              tongTien: Number(hd.tongTien),
              soTienGiam: Number(hd.soTienGiam),
              thucThu: Number(hd.thucThu),
              trangThai: hd.trangThai,
              phuongThucThanhToan: hd.phuongThucThanhToan,
              ngayThanhToan: hd.ngayThanhToan,
            }
          : null,
        trangThaiThanhToan,
        chiTiet: chiTietCoLo,
        tongTienDonThuoc: chiTietCoLo.reduce((sum, item) => sum + item.thanhTien, 0),
      },
    };
  }

  /**
   * Duyệt & Xuất kho cấp phát thuốc theo thuật toán FEFO
   */
  async capPhatDonThuoc(id: number) {
    const updated = await this.dataSource.transaction(async (manager) => {
      const donRepo = manager.getRepository(DonThuoc);
      const loRepo = manager.getRepository(LoThuoc);
      const ctRepo = manager.getRepository(DonThuocChiTiet);
      const thuocRepo = manager.getRepository(Thuoc);
      const dt = await donRepo.findOne({
        where: { id },
        relations: ['chiTiet', 'chiTiet.thuoc'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!dt) throw new NotFoundException('Không tìm thấy đơn thuốc');
      if (dt.trangThai === 'da_cap_phat') throw new BadRequestException('Đơn thuốc này đã được cấp phát trước đó');
      if (dt.trangThai !== 'cho_duyet') throw new BadRequestException('Đơn thuốc chưa ở trạng thái chờ cấp phát');
      if (dt.luaChonMua !== 'mua_tai_benh_vien') {
        throw new BadRequestException('Đơn thuốc này được chọn mua bên ngoài hoặc chưa có lựa chọn mua tại bệnh viện');
      }

      // Kiểm tra trạng thái thanh toán viện phí tại quầy thu ngân
      const bak = await manager.getRepository(BenhAnKham).findOne({ where: { id: dt.benhAnKhamId } });
      if (bak?.luotTiepNhanId) {
        const hd = await manager.getRepository(HoaDon).findOne({ where: { luotTiepNhanId: bak.luotTiepNhanId } });
        if (hd && hd.trangThai !== 'da_thanh_toan') {
          throw new BadRequestException(
            `Bệnh nhân chưa thanh toán viện phí tại quầy thu ngân (Mã hóa đơn: ${hd.maHoaDon}, Thực thu: ${Number(hd.thucThu).toLocaleString('vi-VN')} đ). Vui lòng yêu cầu bệnh nhân thanh toán trước khi cấp phát thuốc!`
          );
        }
      }

      const allocations: Array<{ chiTiet: DonThuocChiTiet; lo: LoThuoc; soLuong: number }> = [];
      for (const ct of dt.chiTiet) {
        let remaining = ct.soLuong;
        const batches = await loRepo.createQueryBuilder('lo')
          .setLock('pessimistic_write')
          .where('lo.thuocId = :thuocId', { thuocId: ct.thuocId })
          .andWhere('lo.soLuongTon > 0')
          .andWhere('lo.ngayHetHan >= CURRENT_DATE()')
          .orderBy('lo.ngayHetHan', 'ASC')
          .getMany();

        for (const lo of batches) {
          if (remaining <= 0) break;
          const soLuong = Math.min(lo.soLuongTon, remaining);
          allocations.push({ chiTiet: ct, lo, soLuong });
          remaining -= soLuong;
        }
        if (remaining > 0) {
          throw new BadRequestException(`Không đủ tồn kho hợp lệ cho thuốc ${ct.thuoc?.tenThuoc || ct.thuocId}`);
        }
      }

      for (const allocation of allocations) {
        allocation.lo.soLuongTon -= allocation.soLuong;
        allocation.chiTiet.loThuocId = allocation.lo.id;
        await loRepo.save(allocation.lo);
      }
      await ctRepo.save(dt.chiTiet);

      for (const thuocId of [...new Set(dt.chiTiet.map((ct) => ct.thuocId))]) {
        const totalStock = await loRepo.createQueryBuilder('lo')
          .where('lo.thuocId = :thuocId', { thuocId })
          .select('COALESCE(SUM(lo.soLuongTon), 0)', 'sum')
          .getRawOne();
        await thuocRepo.update(thuocId, {
          tonKhoTong: Number(totalStock?.sum || 0),
        });
      }

      dt.trangThai = 'da_cap_phat';
      dt.maPhieuNhanThuoc = `PN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(dt.id).padStart(5, '0')}`;
      dt.ngayCapPhat = new Date();
      return donRepo.save(dt);
    });

    return { message: 'Cấp phát đơn thuốc thành công', data: updated };
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

  async capNhatLuaChonMua(id: number, luaChonMua: 'mua_tai_benh_vien' | 'mua_ngoai') {
    if (!['mua_tai_benh_vien', 'mua_ngoai'].includes(luaChonMua)) {
      throw new BadRequestException('Lựa chọn mua thuốc không hợp lệ');
    }
    const dt = await this.donThuocRepo.findOne({ where: { id } });
    if (!dt) throw new NotFoundException('Không tìm thấy đơn thuốc');
    if (dt.trangThai === 'da_cap_phat') {
      throw new BadRequestException('Không thể thay đổi lựa chọn sau khi đã cấp thuốc');
    }
    dt.luaChonMua = luaChonMua;
    if (luaChonMua === 'mua_ngoai') {
      dt.trangThai = 'mua_ngoai';
    } else if (dt.trangThai === 'mua_ngoai') {
      dt.trangThai = 'cho_duyet';
    }
    return {
      message: luaChonMua === 'mua_tai_benh_vien'
        ? 'Đã chọn mua thuốc tại bệnh viện'
        : 'Đã ghi nhận bệnh nhân mua thuốc bên ngoài',
      data: await this.donThuocRepo.save(dt),
    };
  }

  /**
   * Báo cáo Thống kê Kho thuốc & Nhà thuốc
   */
  async getThongKeNhaThuoc(filter: {
    khoangThoiGian?: string;
    tuNgay?: string;
    denNgay?: string;
    trangThai?: string;
    duongDung?: string;
  }) {
    const listThuocRaw = await this.thuocRepo.find({
      relations: ['loThuocList'],
      order: { tenThuoc: 'ASC' },
    });

    const listThuoc = listThuocRaw.map((t) => {
      const activeLo = t.loThuocList && t.loThuocList.length > 0 ? t.loThuocList[0] : null;
      return {
        id: t.id,
        maThuoc: t.maThuoc,
        tenThuoc: t.tenThuoc,
        tenHoatChat: t.tenHoatChat,
        donViTinh: t.donViTinh,
        duongDung: t.duongDung,
        giaBan: Number(t.giaBan),
        tonKhoTong: Number(t.tonKhoTong),
        thanhTien: Number(t.tonKhoTong) * Number(t.giaBan),
        maLo: activeLo?.maLo || null,
        ngayHetHan: activeLo?.ngayHetHan ? String(activeLo.ngayHetHan) : null,
        trangThai: Number(t.tonKhoTong) > 20 ? 'con_hang' : Number(t.tonKhoTong) > 0 ? 'canh_bao' : 'het_hang',
      };
    });

    const tongSoThuoc = listThuoc.length;
    const sapHetHang = listThuoc.filter((t) => t.tonKhoTong > 0 && t.tonKhoTong <= 20).length;
    const hetHangCount = listThuoc.filter((t) => t.tonKhoTong <= 0).length;
    const tongGiaTriKho = listThuoc.reduce((acc, cur) => acc + cur.thanhTien, 0);

    // Tính số đơn xuất trong ngày
    const donXuatTrongNgay = await this.donThuocRepo
      .createQueryBuilder('dt')
      .where('dt.trangThai = :st', { st: 'da_cap_phat' })
      .andWhere('DATE(dt.ngayKe) = CURRENT_DATE()')
      .getCount();

    // Cảnh báo rủi ro
    const canhBaoRuiRo: any[] = [];
    listThuoc.forEach((t) => {
      if (t.tonKhoTong <= 0) {
        canhBaoRuiRo.push({
          id: `het_${t.id}`,
          tenThuoc: t.tenThuoc,
          maThuoc: t.maThuoc,
          loaiRuiRo: 'Hết hàng trong kho',
          mucDo: 'nguy_cap',
          moTa: `Thuốc ${t.tenThuoc} đã hết hoàn toàn tồn kho. Cần nhập bổ sung khẩn cấp.`,
          tonKho: 0,
        });
      } else if (t.tonKhoTong <= 20) {
        canhBaoRuiRo.push({
          id: `cb_${t.id}`,
          tenThuoc: t.tenThuoc,
          maThuoc: t.maThuoc,
          loaiRuiRo: 'Tồn kho nguy cấp (dưới 20 đơn vị)',
          mucDo: 'canh_bao',
          moTa: `Tồn kho chỉ còn ${t.tonKhoTong} ${t.donViTinh}. Đề xuất lập dự trù nhập kho.`,
          tonKho: t.tonKhoTong,
        });
      }
    });

    // Top 10 thuốc kê nhiều nhất
    const topChiTiet = await this.donThuocChiTietRepo
      .createQueryBuilder('ct')
      .leftJoinAndSelect('ct.thuoc', 'th')
      .select('th.tenThuoc', 'tenThuoc')
      .addSelect('th.maThuoc', 'maThuoc')
      .addSelect('SUM(ct.soLuong)', 'tongSoLuong')
      .groupBy('th.id')
      .orderBy('tongSoLuong', 'DESC')
      .limit(10)
      .getRawMany();

    const top10Thuoc = topChiTiet.map((item) => ({
      tenThuoc: item.tenThuoc,
      maThuoc: item.maThuoc,
      soLuongKe: Number(item.tongSoLuong),
    }));

    const sapHetHanCount = await this.loThuocRepo.createQueryBuilder('lo')
      .where('lo.soLuongTon > 0')
      .andWhere('lo.ngayHetHan >= CURRENT_DATE()')
      .andWhere('lo.ngayHetHan <= DATE_ADD(CURRENT_DATE(), INTERVAL 60 DAY)')
      .getCount();

    // 4. Tính toán Lưu lượng Xuất / Nhập kho theo từng ngày
    // Xác định khoảng ngày lọc
    let startDate: Date;
    const endDate = filter.denNgay ? new Date(filter.denNgay) : new Date();
    endDate.setHours(23, 59, 59, 999);

    if (filter.tuNgay) {
      startDate = new Date(filter.tuNgay);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter.khoangThoiGian === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (filter.khoangThoiGian === 'month') {
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter.khoangThoiGian === 'quarter') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Mặc định 7-14 ngày gần nhất
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);
      startDate.setHours(0, 0, 0, 0);
    }

    // Truy vấn tổng đơn xuất theo ngày từ don_thuoc
    const xuatRows = await this.donThuocRepo
      .createQueryBuilder('dt')
      .select('DATE(dt.ngayKe)', 'ngay')
      .addSelect('COUNT(*)', 'soDonXuat')
      .where('dt.ngayKe >= :startDate AND dt.ngayKe <= :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(dt.ngayKe)')
      .orderBy('DATE(dt.ngayKe)', 'ASC')
      .getRawMany();

    // Truy vấn tổng lô nhập kho theo ngày từ lo_thuoc
    const nhapRows = await this.loThuocRepo
      .createQueryBuilder('lo')
      .select('DATE(lo.taoLuc)', 'ngay')
      .addSelect('COUNT(*)', 'soNhapKho')
      .where('lo.taoLuc >= :startDate AND lo.taoLuc <= :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(lo.taoLuc)')
      .orderBy('DATE(lo.taoLuc)', 'ASC')
      .getRawMany();

    // Tạo map hợp nhất các ngày
    const mapGiaoDich = new Map<string, { ngay: string; soDonXuat: number; soNhapKho: number }>();

    // Khởi tạo các mốc ngày trong khoảng thời gian để biểu đồ liền mạch
    const curDate = new Date(startDate);
    while (curDate <= endDate) {
      const dStr = curDate.toISOString().slice(0, 10);
      const displayStr = `${curDate.getDate().toString().padStart(2, '0')}/${(curDate.getMonth() + 1).toString().padStart(2, '0')}`;
      mapGiaoDich.set(dStr, {
        ngay: displayStr,
        soDonXuat: 0,
        soNhapKho: 0,
      });
      curDate.setDate(curDate.getDate() + 1);
    }

    xuatRows.forEach((r) => {
      const dStr = new Date(r.ngay).toISOString().slice(0, 10);
      if (mapGiaoDich.has(dStr)) {
        mapGiaoDich.get(dStr)!.soDonXuat = Number(r.soDonXuat);
      } else {
        const dObj = new Date(r.ngay);
        mapGiaoDich.set(dStr, {
          ngay: `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}`,
          soDonXuat: Number(r.soDonXuat),
          soNhapKho: 0,
        });
      }
    });

    nhapRows.forEach((r) => {
      const dStr = new Date(r.ngay).toISOString().slice(0, 10);
      if (mapGiaoDich.has(dStr)) {
        mapGiaoDich.get(dStr)!.soNhapKho = Number(r.soNhapKho);
      } else {
        const dObj = new Date(r.ngay);
        mapGiaoDich.set(dStr, {
          ngay: `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}`,
          soDonXuat: 0,
          soNhapKho: Number(r.soNhapKho),
        });
      }
    });

    // Chuyển sang mảng sắp xếp theo ngày
    const luuLuongGiaoDich = Array.from(mapGiaoDich.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, val]) => val);

    return {
      message: 'Lấy thống kê nhà thuốc thành công',
      data: {
        tongSoThuoc,
        sapHetHang,
        sapHetHanCount,
        donXuatTrongNgay,
        tongGiaTriKho,
        top10Thuoc,
        luuLuongGiaoDich,
        canhBaoRuiRo,
        listThuoc,
      },
    };
  }

  // ─── DỰ BÁO NHU CẦU THUỐC ───
  async getDuBaoNhuCauThuoc(horizonDays: number = 14) {
    const thuocs = await this.thuocRepo.find();

    const consumptionRows = await this.donThuocChiTietRepo.createQueryBuilder('ct')
      .innerJoin('ct.donThuoc', 'dt')
      .select('ct.thuocId', 'thuocId')
      .addSelect('SUM(ct.soLuong)', 'totalQuantity')
      .where('dt.ngayKe >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
      .andWhere('dt.trangThai IN (:...statuses)', { statuses: ['da_cap_phat', 'da_hoan_thanh'] })
      .groupBy('ct.thuocId')
      .getRawMany();
    const consumptionByMedicine = new Map(
      consumptionRows.map((row) => [Number(row.thuocId), Number(row.totalQuantity) / 30]),
    );

    const itemsForForecast = thuocs.map((t) => {
      const tonKhoTong = Number(t.tonKhoTong) || 0;
      const tieuThuTrungBinhNgay = consumptionByMedicine.get(t.id) ?? null;

      return {
        id: t.id,
        maThuoc: t.maThuoc,
        tenThuoc: t.tenThuoc,
        donViTinh: t.donViTinh || 'viên',
        tonKhoTong,
        tieuThuTrungBinhNgay,
      };
    });

    try {
      // 1. Thử gọi sang Python ML Microservice (cổng 5001)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch('http://localhost:5001/forecast-medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horizon_days: horizonDays,
          items: itemsForForecast,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const mlData: any = await response.json();
        return {
          message: 'Dự báo nhu cầu thuốc thành công',
          engine: mlData.engine || 'holt_winters_drug_demand_estimator',
          heSoTangTruongBenhNhan: mlData.heSoTangTruongBenhNhan ?? null,
          soLuongThuocDuBao: mlData.soLuongThuocDuBao || (mlData.data || []).length,
          data: mlData.data || [],
        };
      }
    } catch (mlErr) {
      console.warn('[DuBaoThuoc] Không thể kết nối Python ML microservice, kích hoạt thuật toán fallback nội bộ:', mlErr.message);
    }

    // Fallback tính toán nội bộ (Moving Average + Reorder Point Estimator)
    const fallbackResults = itemsForForecast
      .filter((item) => item.tieuThuTrungBinhNgay && item.tieuThuTrungBinhNgay > 0)
      .map((item) => {
        const velocity = item.tieuThuTrungBinhNgay!;
        const projected_demand_7d = Math.round(velocity * 7);
        const projected_demand_horizon = Math.round(velocity * horizonDays);
        const days_left = velocity > 0 ? Number((item.tonKhoTong / velocity).toFixed(1)) : 999;
        const safety_stock = Math.round(velocity * 5);
        const reorder_needed = item.tonKhoTong <= safety_stock || days_left <= 7;
        const suggested_reorder_qty = Math.max(0, projected_demand_horizon + safety_stock - item.tonKhoTong);

        let status = 'an_toan';
        if (item.tonKhoTong <= 0) status = 'het_hang';
        else if (days_left <= 3) status = 'nguy_cap';
        else if (days_left <= 7) status = 'canh_bao';

        return {
          id: item.id,
          maThuoc: item.maThuoc,
          tenThuoc: item.tenThuoc,
          donViTinh: item.donViTinh,
          tonKhoHienTai: item.tonKhoTong,
          tieuThuTrungBinhNgay: Number(velocity.toFixed(1)),
          duBaoTieuThu7Ngay: projected_demand_7d,
          duBaoTieuThu14Ngay: projected_demand_horizon,
          soNgayConLai: days_left,
          nguongAnToan: safety_stock,
          trangThai: status,
          canNhapHang: reorder_needed,
          soLuongDeXuatNhap: reorder_needed ? suggested_reorder_qty : 0,
        };
      });

    return {
      message: 'Dự báo nhu cầu thuốc (tính toán nội bộ fallback)',
      engine: 'internal_moving_average_estimator',
      heSoTangTruongBenhNhan: null,
      soLuongThuocDuBao: fallbackResults.length,
      data: fallbackResults,
    };
  }
}
