import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Thuoc } from './entities/thuoc.entity';
import { LoThuoc } from './entities/lo-thuoc.entity';
import { DonThuoc } from './entities/don-thuoc.entity';
import { DonThuocChiTiet } from './entities/don-thuoc-chi-tiet.entity';
import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';

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
    private readonly dataSource: DataSource,
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
      .andWhere('lo.ngayHetHan <= DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)')
      .getCount();

    return {
      message: 'Lấy thống kê nhà thuốc thành công',
      data: {
        tongSoThuoc,
        sapHetHang,
        sapHetHanCount,
        donXuatTrongNgay,
        tongGiaTriKho,
        top10Thuoc,
        luuLuongGiaoDich: [],
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
          data: mlData.data,
        };
      }
    } catch (mlErr) {
      console.warn('[DuBaoThuoc] Không thể kết nối Python ML microservice:', mlErr.message);
    }
    return {
      message: 'Chưa có dữ liệu dự báo nhu cầu thuốc.',
      data: [],
      dataQuality: { source: 'don_thuoc_chi_tiet', historyDays: 30 },
    };
  }
}
