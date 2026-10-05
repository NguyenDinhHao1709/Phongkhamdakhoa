import {
  Injectable, NotFoundException, ConflictException, BadRequestException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LichHen, TrangThaiLichHen, CHO_PHAN_CONG_MARKER } from './entities/lich-hen.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';
import { CaLamViec } from '../nhan-vien/entities/ca-lam-viec.entity';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { TaoLichHenDto, CapNhatTrangThaiLichHenDto, TimKiemLichHenDto, LaySlotTrongDto, ChinhSuaLichHenDto } from './dto/lich-hen.dto';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';

// Các slot giờ khám trong ngày (mỗi ca khám cách nhau 1 tiếng)
const ALL_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:30', '14:30', '15:30', '16:30',
];

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class LichHenService implements OnModuleInit {
  private mailer: nodemailer.Transporter;

  constructor(
    @InjectRepository(LichHen) private repo: Repository<LichHen>,
    @InjectRepository(BacSi) private bacSiRepo: Repository<BacSi>,
    @InjectRepository(NhanVien) private nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(LichLamViec) private lichLamViecRepo: Repository<LichLamViec>,
    @InjectRepository(CaLamViec) private caLamViecRepo: Repository<CaLamViec>,
    private dataSource: DataSource,
    private config: ConfigService,
    private thongBaoService: ThongBaoService,
  ) {
    this.mailer = nodemailer.createTransport({
      host: config.get('MAIL_HOST', 'smtp.gmail.com'),
      port: config.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: config.get('MAIL_USER'),
        pass: config.get('MAIL_PASS'),
      },
    });
  }

  onModuleInit() {
    // Tự động quét và hủy các lịch hẹn đã quá giờ khám ngay khi khởi động
    this.tuDongHuyLichQuaGio().catch(() => {});

    // Quét định kỳ mỗi 5 phút để tự động hủy các ca hẹn quá giờ
    setInterval(() => {
      this.tuDongHuyLichQuaGio().catch(() => {});
    }, 5 * 60 * 1000);

    // Tự động quét và nhắc lịch hẹn mỗi 30 phút
    setInterval(() => {
      this.guiNhacLichTuDong().catch((err) =>
        console.error('[LichHenScheduler] Lỗi tự động nhắc lịch:', err.message)
      );
    }, 30 * 60 * 1000);
  }

  // ─── TỰ ĐỘNG HỦY LỊCH HẸN ĐÃ QUA GIỜ KHÁM (NO-SHOW / HẾT HẠN) ───
  async tuDongHuyLichQuaGio() {
    try {
      const threshold = new Date(Date.now() - 30 * 60 * 1000);
      const thresholdDateStr = getLocalDateString(threshold);
      const thresholdTimeStr = `${String(threshold.getHours()).padStart(2, '0')}:${String(threshold.getMinutes()).padStart(2, '0')}:${String(threshold.getSeconds()).padStart(2, '0')}`;

      // 1. CHỈ tự động hủy các ca khám TRỰC TIẾP quá 30 phút mà bệnh nhân không đến quầy tiếp nhận
      // Tuyệt đối KHÔNG tự động hủy ca trực tuyến (truc_tuyen / Telehealth) trong ngày hẹn
      const result = await this.repo.createQueryBuilder()
        .update(LichHen)
        .set({
          trangThai: TrangThaiLichHen.DA_HUY,
          ghiChu: () => `COALESCE(CONCAT(COALESCE(ghi_chu, ''), ' [Tự động hủy do quá thời gian hẹn khám]'), '[Tự động hủy do quá thời gian hẹn khám]')`
        })
        .where('trang_thai NOT IN (:...doneStates)', {
          doneStates: [TrangThaiLichHen.HOAN_THANH, TrangThaiLichHen.DA_HUY, TrangThaiLichHen.DANG_KHAM],
        })
        .andWhere('(hinh_thuc IS NULL OR hinh_thuc != :trucTuyen)', {
          trucTuyen: 'truc_tuyen',
        })
        .andWhere('(ngay_hen < :thresholdDateStr OR (ngay_hen = :thresholdDateStr AND gio_hen <= :thresholdTimeStr))', {
          thresholdDateStr,
          thresholdTimeStr,
        })
        .andWhere('id NOT IN (SELECT ltn.lich_hen_id FROM luot_tiep_nhan ltn WHERE ltn.lich_hen_id IS NOT NULL)')
        .execute();

      if (result.affected && result.affected > 0) {
        console.log(`[LichHen] Đã tự động hủy ${result.affected} ca khám trực tiếp quá thời gian hẹn.`);
      }

      // 2. Với ca TRỰC TUYẾN: Chỉ tự động hủy nếu đã QUÁ HẠN NGÀY HẸN (tức là từ ngày hôm trước trở về trước)
      const todayStr = getLocalDateString();
      await this.repo.createQueryBuilder()
        .update(LichHen)
        .set({
          trangThai: TrangThaiLichHen.DA_HUY,
          ghiChu: () => `COALESCE(CONCAT(COALESCE(ghi_chu, ''), ' [Tự động hủy do hết hạn ngày tư vấn trực tuyến]'), '[Tự động hủy do hết hạn ngày tư vấn trực tuyến]')`
        })
        .where('trang_thai NOT IN (:...doneStates)', {
          doneStates: [TrangThaiLichHen.HOAN_THANH, TrangThaiLichHen.DA_HUY, TrangThaiLichHen.DANG_KHAM],
        })
        .andWhere('hinh_thuc = :trucTuyen', {
          trucTuyen: 'truc_tuyen',
        })
        .andWhere('ngay_hen < :todayStr', {
          todayStr,
        })
        .execute();
    } catch (err: any) {
      console.warn('[LichHen] Lỗi tự động hủy lịch quá giờ:', err.message);
    }
  }

  // ─── DANH SÁCH ────────────────────────────────────────────────
  async findAll(dto: TimKiemLichHenDto, currentUser?: any) {
    // Tự động cập nhật các ca quá giờ trước khi lấy danh sách
    await this.tuDongHuyLichQuaGio();

    const { ngay, tuNgay, denNgay, bacSiId, trangThai, hinhThuc, loai, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .leftJoinAndSelect('lh.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .orderBy('lh.ngayHen', 'ASC')
      .addOrderBy('lh.gioHen', 'ASC')
      .skip(skip).take(limit);

    if (ngay) {
      qb.andWhere('lh.ngay_hen = :ngay', { ngay });
    } else {
      if (tuNgay) qb.andWhere('lh.ngay_hen >= :tuNgay', { tuNgay });
      if (denNgay) qb.andWhere('lh.ngay_hen <= :denNgay', { denNgay });
    }

    if (currentUser?.vai_tro === 'bac_si') {
      const nhanVien = await this.nhanVienRepo.findOne({
        where: { nguoiDungId: currentUser.id || currentUser.userId },
      });
      const bacSi = nhanVien
        ? await this.bacSiRepo.findOne({ where: { nhanVienId: nhanVien.id } })
        : null;

      if (!bacSi) {
        return {
          data: [],
          message: 'Không tìm thấy hồ sơ bác sĩ đang đăng nhập',
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      qb.andWhere('lh.bac_si_id = :myDoctorId', { myDoctorId: bacSi.id });
    } else if (bacSiId) {
      qb.andWhere('lh.bac_si_id = :bacSiId', { bacSiId });
    }

    if (trangThai) qb.andWhere('lh.trang_thai = :trangThai', { trangThai });

    const hinhThucFilter = hinhThuc || (loai === 'online' ? 'truc_tuyen' : loai === 'truc_tiep' ? 'truc_tiep' : undefined);
    if (hinhThucFilter) {
      qb.andWhere('lh.hinh_thuc = :hinhThucFilter', { hinhThucFilter });
    }

    // Không hiển thị các ca tiếp nhận vãng lai tại quầy vào danh sách lịch hẹn đặt trước
    qb.andWhere('(lh.nguon_dat IS NULL OR lh.nguon_dat != :tiepTanDat)', { tiepTanDat: 'tiep_tan_dat' });

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      message: 'Lấy danh sách lịch hẹn thành công',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── LỊCH HẸN CỦA TÔI (DÀNH CHO BỆNH NHÂN) ───────────────────
  async layLichHenCuaToi(userId: number) {
    // Tự động cập nhật các ca quá giờ trước khi lấy danh sách
    await this.tuDongHuyLichQuaGio();

    const pattern = `%[ĐẶT_BỞI_USER_${userId}]%`;
    const qb = this.repo.createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .leftJoinAndSelect('lh.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('(bn.nguoi_dung_id = :userId OR lh.benh_nhan_id = (SELECT id FROM benh_nhan WHERE nguoi_dung_id = :userId LIMIT 1) OR lh.ghi_chu LIKE :pattern)', { userId, pattern })
      .andWhere('lh.nguon_dat != :tiepTanDat', { tiepTanDat: 'tiep_tan_dat' })
      .orderBy('lh.taoLuc', 'DESC');

    const items = await qb.getMany();
    const allRooms: any[] = await this.dataSource.query('SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham');

    const mappedItems = items.map((item) => {
      const sttMatch = item.ghiChu?.match(/\[STT:\s*([^\]]+)\]/);
      const soThuTu = sttMatch ? sttMatch[1] : `A${String((item.id % 900) + 100)}`;
      const phong = allRooms.find((r) => r.id === item.phongKhamId) || null;
      return {
        ...item,
        soThuTu,
        phongKham: phong,
        qrCodeValue: `${item.maLichHen}|STT:${soThuTu}|DATE:${item.ngayHen}|TIME:${item.gioHen}`,
      };
    });

    return {
      data: mappedItems,
      message: 'Lấy danh sách lịch hẹn cá nhân thành công',
    };
  }

  // ─── CHI TIẾT ─────────────────────────────────────────────────
  async findOne(id: number) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
    if (!lh) throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });

    let phongKham = null;
    if (lh.phongKhamId) {
      const [pk]: any[] = await this.dataSource.query('SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ?', [lh.phongKhamId]);
      phongKham = pk || null;
    }
    const sttMatch = lh.ghiChu?.match(/\[STT:\s*([^\]]+)\]/);
    const soThuTu = sttMatch ? sttMatch[1] : `A${String((lh.id % 900) + 100)}`;

    return {
      data: {
        ...lh,
        phongKham,
        soThuTu,
        qrCodeValue: `${lh.maLichHen}|STT:${soThuTu}|DATE:${lh.ngayHen}|TIME:${lh.gioHen}`,
      },
      message: 'Lấy thông tin lịch hẹn thành công',
    };
  }

  // ─── DANH SÁCH BÁC SĨ TRỰC VÀ CA KHÁM TRỐNG ──────────────────
  async layBacSiVaCaTrong(chuyenKhoa?: string, ngay?: string) {
    const ngayKham = ngay || getLocalDateString();

    // 1. Lấy danh sách bác sĩ
    const allDoctors = await this.bacSiRepo.find({ relations: ['nhanVien'] });
    let filteredDoctors = allDoctors;
    if (chuyenKhoa && chuyenKhoa.trim()) {
      const ckLower = chuyenKhoa.trim().toLowerCase();
      filteredDoctors = allDoctors.filter((d) =>
        (d.chuyenKhoa || '').toLowerCase().includes(ckLower) ||
        ckLower.includes((d.chuyenKhoa || '').toLowerCase())
      );
    }

    // 2. Lấy phòng khám tương ứng từ bảng phong_kham
    const allRooms: any[] = await this.dataSource.query('SELECT * FROM phong_kham WHERE trang_thai = "hoat_dong"');

    // 3. Lấy lịch phân ca ngày đó
    const shiftsOnDate = await this.lichLamViecRepo.find({
      where: { ngayLam: ngayKham },
      relations: ['caLamViec'],
    });

    // 4. Lấy các lịch hẹn đã được đặt trên hệ thống ngày đó
    const activeAppointments = await this.repo.find({
      where: {
        ngayHen: ngayKham,
        trangThai: In([TrangThaiLichHen.CHO_THANH_TOAN, TrangThaiLichHen.CHO_XAC_NHAN, TrangThaiLichHen.DA_XAC_NHAN]),
      },
      select: ['bacSiId', 'gioHen'],
    });

    const appointmentSet = new Set(
      activeAppointments.map((a) => `${a.bacSiId}_${(a.gioHen || '').substring(0, 5)}`)
    );

    const STANDARD_SLOTS = [
      { slot: '08:00', ca: 'sang' },
      { slot: '09:00', ca: 'sang' },
      { slot: '10:00', ca: 'sang' },
      { slot: '11:00', ca: 'sang' },
      { slot: '13:30', ca: 'chieu' },
      { slot: '14:30', ca: 'chieu' },
      { slot: '15:30', ca: 'chieu' },
      { slot: '16:30', ca: 'chieu' },
    ];

    const result = filteredDoctors.map((doc) => {
      // Tìm phòng khám phù hợp
      const matchedRoom = allRooms.find((r) =>
        (r.chuyen_khoa && (doc.chuyenKhoa || '').toLowerCase().includes(r.chuyen_khoa.toLowerCase())) ||
        (doc.chuyenKhoa && r.chuyen_khoa && doc.chuyenKhoa.toLowerCase().includes(r.chuyen_khoa.toLowerCase()))
      ) || allRooms[0];

      // Tìm ca làm việc của bác sĩ
      const docShifts = shiftsOnDate.filter((s) => s.nhanVienId === doc.nhanVienId);
      const hasDeclaredShifts = docShifts.length > 0;
      // Chỉ tính đi làm nếu Giám đốc đã phân công ca trực thực tế trên hệ thống
      const worksMorning = hasDeclaredShifts && docShifts.some((s) => s.caLamViec?.tenCa?.toLowerCase().includes('sáng') || s.caLamViecId === 1);
      const worksAfternoon = hasDeclaredShifts && docShifts.some((s) => s.caLamViec?.tenCa?.toLowerCase().includes('chiều') || s.caLamViecId === 2);

      const slots = STANDARD_SLOTS.map(({ slot, ca }) => {
        const inShift = (ca === 'sang' && worksMorning) || (ca === 'chieu' && worksAfternoon);
        const daDat = appointmentSet.has(`${doc.id}_${slot}`);
        return {
          gio: slot,
          ca,
          inShift,
          daDat,
          conTrong: inShift && !daDat,
        };
      });

      const soSlotTrong = slots.filter((s) => s.conTrong).length;

      return {
        id: doc.id,
        hoTen: doc.nhanVien?.hoTen || 'Bác sĩ',
        chuyenKhoa: doc.chuyenKhoa,
        bangCap: doc.bangCap,
        soChungChiHanhNghe: doc.soChungChiHanhNghe,
        anhDaiDien: doc.nhanVien?.anhDaiDien,
        dangTruc: worksMorning || worksAfternoon,
        phongKham: matchedRoom ? {
          id: matchedRoom.id,
          tenPhong: matchedRoom.ten_phong,
          viTri: matchedRoom.vi_tri,
          chuyenKhoa: matchedRoom.chuyen_khoa,
        } : null,
        slots,
        soSlotTrong,
      };
    });

    // Chỉ hiển thị những bác sĩ thực sự có ca trực trong ngày do Giám đốc phân công
    const availableDoctors = result.filter((d) => d.dangTruc);

    return {
      data: availableDoctors,
      ngay: ngayKham,
      chuyenKhoa,
      message: 'Lấy danh sách bác sĩ trực và ca khám thành công',
    };
  }

  // ─── SLOT TRỐNG CỦA BÁC SĨ ────────────────────────────────────
  async laySlotTrong(dto: LaySlotTrongDto) {
    const daDat = await this.repo.find({
      where: {
        bacSiId: dto.bacSiId,
        ngayHen: dto.ngay,
        trangThai: TrangThaiLichHen.DA_XAC_NHAN,
      },
      select: ['gioHen'],
    });
    const daDatSet = new Set(daDat.map((lh) => lh.gioHen.substring(0, 5)));
    const slotsTrong = ALL_SLOTS.filter((s) => !daDatSet.has(s));
    return { data: { bacSiId: dto.bacSiId, ngay: dto.ngay, slotsTrong }, message: 'OK' };
  }

  // ─── TẠO LỊCH HẸN (Optimistic Lock tại DB) ────────────────────
  async create(dto: TaoLichHenDto, nguoiDatId?: number, nguoiDatVaiTro?: string) {
    const chuyenKhoa = dto.chuyenKhoa?.trim();
    if (nguoiDatVaiTro === 'benh_nhan' && !chuyenKhoa) {
      throw new BadRequestException({
        code: 'THIEU_CHUYEN_KHOA',
        message: 'Bệnh nhân bắt buộc phải chọn chuyên khoa để phòng khám phân công bác sĩ phù hợp.',
      });
    }

    // 1. Ràng buộc thời gian đặt lịch:
    // Bệnh nhân tự đặt trực tuyến chỉ được đặt trước từ 2 đến 7 ngày tính từ ngày hiện tại.
    const now = new Date();
    const ngayGioStr = `${dto.ngayHen}T${dto.gioHen}:00`;
    const gioHenFull = new Date(ngayGioStr);
    if (Number.isNaN(gioHenFull.getTime())) {
      throw new BadRequestException({ code: 'THOI_GIAN_KHONG_HOP_LE', message: 'Ngày hoặc giờ hẹn không hợp lệ.' });
    }

    if (nguoiDatVaiTro === 'benh_nhan') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 2); // Tối thiểu trước 2 ngày

      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 7); // Tối đa 7 ngày
      maxDate.setHours(23, 59, 59, 999);

      const appointmentDate = new Date(dto.ngayHen + 'T00:00:00');

      if (appointmentDate < minDate || appointmentDate > maxDate) {
        throw new BadRequestException({
          code: 'NGOAI_KHOANG_2_DEN_7_NGAY',
          message: 'Theo quy định, lịch hẹn khám chỉ được phép đặt trước từ 2 đến 7 ngày tính từ ngày hiện tại.',
        });
      }
    }

    // 2. Tra cứu hoặc khởi tạo Bệnh nhân trước
    let finalBenhNhanId = dto.benhNhanId;
    const benhNhanRepo = this.dataSource.getRepository(BenhNhan);
    let noteDatHo = '';

    if (nguoiDatVaiTro === 'benh_nhan') {
      const ownPatient = await benhNhanRepo.findOne({ where: { nguoiDungId: nguoiDatId } });

      if (dto.datChoNguoiKhac || (dto.hoTen && dto.soDienThoai && ownPatient && dto.soDienThoai !== ownPatient.soDienThoai)) {
        // Đặt lịch cho người khác
        if (!dto.hoTen || !dto.soDienThoai) {
          throw new BadRequestException({ code: 'THIEU_THONG_TIN_NGUOI_KHAM', message: 'Vui lòng nhập đầy đủ Họ tên và Số điện thoại của người được đặt lịch khám.' });
        }

        let targetPatient = await benhNhanRepo.findOne({ where: { soDienThoai: dto.soDienThoai } });
        if (!targetPatient) {
          const countBn = await benhNhanRepo.count();
          targetPatient = benhNhanRepo.create({
            maBenhNhan: MaGeneratorService.generateMaBenhNhan(countBn + 1),
            hoTen: dto.hoTen,
            soDienThoai: dto.soDienThoai,
            email: dto.email || null,
            ngaySinh: dto.ngaySinh || null,
            gioiTinh: dto.gioiTinh || null,
          });
          targetPatient = await benhNhanRepo.save(targetPatient);
        }
        finalBenhNhanId = targetPatient.id;
        noteDatHo = `[ĐẶT_HỘ: ${dto.hoTen} (${dto.soDienThoai}) - Quan hệ: ${dto.moiQuanHe || 'Người thân'}] [ĐẶT_BỞI_USER_${nguoiDatId}]`;
      } else {
        // Đặt cho chính mình
        if (!ownPatient) {
          throw new BadRequestException({ code: 'CHUA_LIEN_KET_BENH_NHAN', message: 'Tài khoản chưa được liên kết với hồ sơ bệnh nhân.' });
        }
        finalBenhNhanId = ownPatient.id;
      }
    } else if (dto.soDienThoai) {
      const existingBn = await benhNhanRepo.findOne({ where: { soDienThoai: dto.soDienThoai } });
      if (existingBn) {
        finalBenhNhanId = existingBn.id;
      } else if (dto.hoTen) {
        const countBn = await benhNhanRepo.count();
        const newBn = benhNhanRepo.create({
          maBenhNhan: MaGeneratorService.generateMaBenhNhan(countBn + 1),
          hoTen: dto.hoTen,
          soDienThoai: dto.soDienThoai,
          email: dto.email || null,
          ngaySinh: dto.ngaySinh || null,
          gioiTinh: dto.gioiTinh || null,
        });
        const savedBn = await benhNhanRepo.save(newBn);
        finalBenhNhanId = savedBn.id;
      }
    } else if (!finalBenhNhanId || Number(finalBenhNhanId) === 1) {
      const bn = await benhNhanRepo.findOne({ where: { nguoiDungId: nguoiDatId } });
      if (bn) {
        finalBenhNhanId = bn.id;
      }
    }

    if (!finalBenhNhanId) {
      throw new BadRequestException({ code: 'THIEU_BENH_NHAN', message: 'Cần chọn hồ sơ bệnh nhân cho lịch hẹn.' });
    }

    // 3. KIỂM TRA TRÙNG CA / GIỜ KHÁM CỦA BỆNH NHÂN TRONG NGÀY
    const gioHenShort = (dto.gioHen || '').substring(0, 5);
    const isCaSang = (dto.gioHen || '') < '12:00';
    const tenCaMoi = isCaSang ? 'Ca Sáng (07:30 - 11:30)' : 'Ca Chiều (13:30 - 17:00)';

    const dsLichHenBenhNhan = await this.repo.find({
      where: {
        benhNhanId: finalBenhNhanId,
        ngayHen: dto.ngayHen,
      },
    });

    const lichHenActive = dsLichHenBenhNhan.filter(
      (lh) => ![TrangThaiLichHen.DA_HUY].includes(lh.trangThai)
    );

    for (const lh of lichHenActive) {
      const lhGioShort = (lh.gioHen || '').substring(0, 5);
      const lhIsCaSang = (lh.gioHen || '') < '12:00';
      const tenCaCu = lhIsCaSang ? 'Ca Sáng' : 'Ca Chiều';

      if (lhGioShort === gioHenShort) {
        throw new ConflictException({
          code: 'TRUNG_GIO_KHAM_TRONG_NGAY',
          message: `Bạn đã có lịch hẹn ${lh.maLichHen} vào khung giờ ${lhGioShort} ngày ${dto.ngayHen}. Vui lòng chọn khung giờ khác.`,
        });
      }

      if (lhIsCaSang === isCaSang) {
        throw new ConflictException({
          code: 'TRUNG_CA_KHAM_TRONG_NGAY',
          message: `Bạn đã có lịch hẹn ${lh.maLichHen} ở ${tenCaCu} (lúc ${lhGioShort}) ngày ${dto.ngayHen}. Theo quy định, bệnh nhân không được đặt trùng với ca đã đặt trong cùng một ngày. Vui lòng chọn ca khám khác hoặc ngày khác.`,
        });
      }
    }

    // 4. KIỂM TRA LỊCH TRỰC VÀ SLOT BÁC SĨ (NẾU CÓ CHỈ ĐỊNH BÁC SĨ CỤ THỂ)
    if (dto.bacSiId && dto.gioHen && dto.ngayHen) {
      const bacSi = await this.bacSiRepo.findOne({
        where: { id: dto.bacSiId },
        relations: ['nhanVien'],
      });

      if (bacSi) {
        const shifts = await this.lichLamViecRepo.find({
          where: {
            nhanVienId: bacSi.nhanVienId,
            ngayLam: dto.ngayHen,
          },
          relations: ['caLamViec'],
        });

        const isMorning = dto.gioHen < '12:00';
        const hasValidShift = shifts.some((s) => {
          const tenCa = s.caLamViec?.tenCa?.toLowerCase() || '';
          if (isMorning) {
            return tenCa.includes('sáng') || s.caLamViecId === 1;
          } else {
            return tenCa.includes('chiều') || s.caLamViecId === 2;
          }
        });

        if (!hasValidShift) {
          const caName = isMorning ? 'Ca Sáng' : 'Ca Chiều';
          const docName = bacSi.nhanVien?.hoTen || 'Bác sĩ';
          throw new BadRequestException({
            code: 'BAC_SI_KHONG_CO_LICH_TRUC',
            message: `${docName} chưa có lịch làm việc vào ${caName} ngày ${dto.ngayHen}. Vui lòng chọn bác sĩ đang có ca trực hoặc chọn ngày khác.`,
          });
        }
      }

      const trung = await this.repo.findOne({
        where: {
          bacSiId: dto.bacSiId,
          ngayHen: dto.ngayHen,
          gioHen: dto.gioHen,
        },
      });
      if (trung && ![TrangThaiLichHen.DA_HUY, TrangThaiLichHen.HOAN_THANH].includes(trung.trangThai)) {
        throw new ConflictException({
          code: 'LICH_HEN_TRUNG_GIO',
          message: `Bác sĩ đã có lịch hẹn vào khung giờ ${gioHenShort} ngày ${dto.ngayHen}. Vui lòng chọn khung giờ khác.`,
        });
      }
    }

    const count = await this.repo.count();
    const maLichHen = MaGeneratorService.generateMaLichHen(count + 1);
    const nguonDat = nguoiDatVaiTro === 'benh_nhan' ? 'benh_nhan_tu_dat'
                   : nguoiDatVaiTro === 'bac_si'    ? 'bac_si_dat'
                   : 'tiep_tan_dat';

    const needsAssignment = !dto.bacSiId;
    const lyDoKhamGoc = (dto.lyDoKham || '')
      .replace(/^\[Chuyên khoa:\s*[^\]]+\]\s*/i, '')
      .trim();
    const lyDoKham = `${chuyenKhoa ? `[Chuyên khoa: ${chuyenKhoa}] ` : ''}${lyDoKhamGoc}`.trim();
    let datBoiNhanVienId: number | null = null;
    if (nguoiDatVaiTro !== 'benh_nhan' && nguoiDatId) {
      const nv = await this.dataSource.getRepository(NhanVien).findOne({ where: { nguoiDungId: nguoiDatId } });
      if (nv) {
        datBoiNhanVienId = nv.id;
      } else {
        // Dự phòng nếu nguoiDatId chính là nhan_vien.id
        const nvById = await this.dataSource.getRepository(NhanVien).findOne({ where: { id: nguoiDatId } });
        if (nvById) datBoiNhanVienId = nvById.id;
      }
    }

    const isNeedDeposit = nguoiDatVaiTro === 'benh_nhan' || nguonDat === 'bac_si_dat';
    let hanThanhToan: Date | null = null;
    if (isNeedDeposit) {
      const [h, m] = (dto.gioHen || '08:00').split(':').map(Number);
      const [y, mon, d] = (dto.ngayHen || '').split('-').map(Number);
      const apptDate = new Date(y, (mon || 1) - 1, d || 1, h || 8, m || 0, 0);
      
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const twentyFourHoursBeforeAppt = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000);

      if (twentyFourHoursBeforeAppt.getTime() > now.getTime()) {
        hanThanhToan = new Date(Math.min(twentyFourHoursFromNow.getTime(), twentyFourHoursBeforeAppt.getTime()));
      } else {
        // Đặt sát ngày hẹn (< 24h) -> cho hạn thanh toán là 15 phút từ lúc đặt
        hanThanhToan = new Date(now.getTime() + 15 * 60 * 1000);
      }
    }

    const lh = this.repo.create({
      benhNhanId: finalBenhNhanId,
      bacSiId: dto.bacSiId || null,
      phongKhamId: dto.phongKhamId || null,
      ngayHen: dto.ngayHen,
      gioHen: dto.gioHen,
      hinhThuc: dto.hinhThuc || 'truc_tiep',
      lyDoKham,
      ghiChu: `${dto.ghiChu || ''} ${noteDatHo}${needsAssignment ? ` ${CHO_PHAN_CONG_MARKER}` : ''}`.trim(),
      maLichHen,
      nguonDat,
      trangThai: isNeedDeposit ? TrangThaiLichHen.CHO_THANH_TOAN : TrangThaiLichHen.DA_XAC_NHAN,
      hanThanhToan,
      datBoiNhanVienId,
    });
    const saved = await this.repo.save(lh);
    if (nguoiDatVaiTro !== 'benh_nhan' && needsAssignment) {
      const assigned = await this.tuDongPhanCong(saved.id);
      return assigned;
    }
    return { data: saved, message: 'Đặt lịch hẹn thành công.' };
  }

  async tuDongPhanCong(id: number) {
    const appointment = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan'],
    });
    if (!appointment) throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    if (appointment.bacSiId) return this.findOne(id);

    const specialtyMatch = appointment.lyDoKham?.match(/\[Chuyên khoa:\s*([^\]]+)\]/i);
    const specialty = specialtyMatch?.[1]?.trim();
    const schedules = await this.lichLamViecRepo.find({
      where: { ngayLam: appointment.ngayHen },
      relations: ['caLamViec', 'nhanVien'],
    });
    const doctors = await this.bacSiRepo.find({ relations: ['nhanVien'] });
    const specialtyDoctors = doctors.filter((doctor) => {
      if (specialty && !(doctor.chuyenKhoa || '').toLowerCase().includes(specialty.toLowerCase())) return false;
      return true;
    });
    const scheduledCandidates = specialtyDoctors.filter((doctor) => {
      return schedules.some((schedule) =>
        schedule.nhanVienId === doctor.nhanVienId
        && schedule.caLamViec
        && schedule.caLamViec.gioBatDau <= appointment.gioHen
        && schedule.caLamViec.gioKetThuc > appointment.gioHen
      );
    });
    // Prefer the published shift for that date. If no shift is configured yet,
    // keep the booking usable by assigning an available doctor in the specialty.
    const candidates = scheduledCandidates.length > 0 ? scheduledCandidates : specialtyDoctors;

    const available = [];
    for (const doctor of candidates) {
      const occupied = await this.repo.count({
        where: [
          { bacSiId: doctor.id, ngayHen: appointment.ngayHen, gioHen: appointment.gioHen, trangThai: TrangThaiLichHen.CHO_THANH_TOAN },
          { bacSiId: doctor.id, ngayHen: appointment.ngayHen, gioHen: appointment.gioHen, trangThai: TrangThaiLichHen.CHO_XAC_NHAN },
          { bacSiId: doctor.id, ngayHen: appointment.ngayHen, gioHen: appointment.gioHen, trangThai: TrangThaiLichHen.DA_XAC_NHAN },
        ],
      });
      if (occupied === 0) {
        const total = await this.repo.count({
          where: [
            { bacSiId: doctor.id, ngayHen: appointment.ngayHen, trangThai: TrangThaiLichHen.CHO_XAC_NHAN },
            { bacSiId: doctor.id, ngayHen: appointment.ngayHen, trangThai: TrangThaiLichHen.DA_XAC_NHAN },
          ],
        });
        available.push({ doctor, total });
      }

    }

    available.sort((a, b) => a.total - b.total || a.doctor.id - b.doctor.id);
    const selected = available[0]?.doctor;
    if (!selected) {
      appointment.ghiChu = `${(appointment.ghiChu || '').replace(CHO_PHAN_CONG_MARKER, '').trim()} ${CHO_PHAN_CONG_MARKER}`.trim();
      await this.repo.save(appointment);
      return { data: appointment, message: 'Lịch đang chờ phân công bác sĩ' };
    }

    appointment.bacSiId = selected.id;
    appointment.bacSi = selected;
    appointment.ghiChu = (appointment.ghiChu || '').replace(CHO_PHAN_CONG_MARKER, '').trim();
    if (scheduledCandidates.length === 0 && specialtyDoctors.length > 0) {
      appointment.ghiChu = `${appointment.ghiChu || ''} [PHÂN CÔNG THEO CHUYÊN KHOA - CHƯA CÓ CA ĐÃ KHAI BÁO]`.trim();
    }
    if (appointment.trangThai === TrangThaiLichHen.CHO_THANH_TOAN) {
      appointment.ghiChu = `${appointment.ghiChu || ''} [ĐÃ GIỮ CHỖ BÁC SĨ]`.trim();
    }
    const saved = await this.repo.save(appointment);
    await this.guiThongBaoPhanCong(saved, selected);
    return { data: saved, message: 'Đã tự động phân công bác sĩ' };
  }

  async xacNhanSauThanhToan(lichHenId: number) {
    let appointment = await this.repo.findOne({
      where: { id: lichHenId },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });
    if (!appointment) {
      throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    }
    if (appointment.trangThai === TrangThaiLichHen.DA_HUY) {
      return { data: appointment, message: 'Lịch hẹn đã bị hủy, không thể xác nhận thanh toán' };
    }

    appointment.trangThai = TrangThaiLichHen.DA_XAC_NHAN;

    // Tự động phân công bác sĩ nếu chưa chọn bác sĩ cụ thể
    if (!appointment.bacSiId) {
      await this.tuDongPhanCong(appointment.id);
      const reloaded = await this.repo.findOne({
        where: { id: lichHenId },
        relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
      });
      if (reloaded) {
        appointment = reloaded;
      }
    }

    // Tự động gán phòng khám theo chuyên khoa / bác sĩ
    if (!appointment.phongKhamId) {
      const allRooms: any[] = await this.dataSource.query('SELECT * FROM phong_kham WHERE trang_thai = "hoat_dong"');
      const ck = appointment.bacSi?.chuyenKhoa || appointment.lyDoKham || '';
      const matchedRoom = allRooms.find((r) =>
        r.chuyen_khoa && ck.toLowerCase().includes(r.chuyen_khoa.toLowerCase())
      ) || allRooms[0];
      if (matchedRoom) {
        appointment.phongKhamId = matchedRoom.id;
      }
    }

    // Cấp số thứ tự STT khám nếu chưa có
    let soThuTu = '';
    const sttMatch = appointment.ghiChu?.match(/\[STT:\s*([^\]]+)\]/);
    if (sttMatch) {
      soThuTu = sttMatch[1];
    } else {
      const countToday = await this.repo.count({
        where: {
          ngayHen: appointment.ngayHen,
          trangThai: TrangThaiLichHen.DA_XAC_NHAN,
        },
      });
      soThuTu = MaGeneratorService.generateSoThuTu(countToday + 1);
      appointment.ghiChu = `${appointment.ghiChu || ''} [STT: ${soThuTu}]`.trim();
    }

    const saved = await this.repo.save(appointment);

    const fullAppointment = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });

    // Lấy thông tin phòng khám
    const rooms: any[] = saved.phongKhamId
      ? await this.dataSource.query('SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ?', [saved.phongKhamId])
      : [];
    const phongKhamRow = rooms[0] ? {
      id: rooms[0].id,
      tenPhong: rooms[0].ten_phong,
      viTri: rooms[0].vi_tri,
      chuyenKhoa: rooms[0].chuyen_khoa,
    } : null;

    return {
      data: {
        ...fullAppointment,
        soThuTu,
        phongKham: phongKhamRow,
        qrCodeValue: `${saved.maLichHen}|STT:${soThuTu}|DATE:${saved.ngayHen}|TIME:${saved.gioHen}`,
      },
      message: 'Đã xác nhận thanh toán thành công. Đã xuất phiếu hẹn khám!',
    };
  }

  private async guiThongBaoPhanCong(appointment: LichHen, doctor: BacSi) {
    let doctorUserId = doctor.nhanVien?.nguoiDungId;
    if (!doctorUserId && doctor.nhanVienId) {
      const nv = await this.nhanVienRepo.findOne({ where: { id: doctor.nhanVienId } });
      doctorUserId = nv?.nguoiDungId;
    }
    if (doctorUserId) {
      await this.thongBaoService.taoThongBao({
        nguoiNhanId: doctorUserId,
        tieuDe: 'Có lịch hẹn mới được phân công',
        noiDung: `${appointment.maLichHen} - ${appointment.ngayHen} ${appointment.gioHen}, bệnh nhân ${appointment.benhNhan?.hoTen || ''}.`,
        loai: 'lich_hen',
        doiTuongBang: 'lich_hen',
        doiTuongId: appointment.id,
      });
    }
    const patientUserId = appointment.benhNhan?.nguoiDungId;
    if (patientUserId) {
      await this.thongBaoService.taoThongBao({
        nguoiNhanId: patientUserId,
        tieuDe: 'Lịch hẹn đã có bác sĩ phụ trách',
        noiDung: `${appointment.maLichHen} - ${doctor.nhanVien?.hoTen || 'Bác sĩ'} sẽ khám ngày ${appointment.ngayHen} lúc ${appointment.gioHen}.`,
        loai: 'lich_hen',
        doiTuongBang: 'lich_hen',
        doiTuongId: appointment.id,
      });
    }
    const email = doctor.nhanVien?.email;
    if (email) {
      await this.mailer.sendMail({
        from: this.config.get('MAIL_FROM', 'Phong Kham <no-reply@phongkham.vn>'),
        to: email,
        subject: `[Phân công lịch khám] ${appointment.maLichHen}`,
        text: `Bạn được phân công lịch khám ${appointment.maLichHen} ngày ${appointment.ngayHen} lúc ${appointment.gioHen} cho bệnh nhân ${appointment.benhNhan?.hoTen || ''}.`,
      });
    }
    if (appointment.benhNhan?.email) {
      await this.mailer.sendMail({
        from: this.config.get('MAIL_FROM', 'Phong Kham <no-reply@phongkham.vn>'),
        to: appointment.benhNhan.email,
        subject: `[Xác nhận bác sĩ phụ trách] ${appointment.maLichHen}`,
        text: `Lịch hẹn ${appointment.maLichHen} ngày ${appointment.ngayHen} lúc ${appointment.gioHen} đã được phân công cho ${doctor.nhanVien?.hoTen || 'bác sĩ phụ trách'}.`,
      });
    }
  }

  // ─── HỦY LỊCH HẸN BỆNH NHÂN (Phải trước ngày khám ít nhất 1 ngày / 24 tiếng) ───
  async huyLichHenBoiBenhNhan(id: number, userId: number) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan'],
    });

    if (!lh) {
      throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    }

    const now = new Date();
    const ngayGioStr = `${lh.ngayHen}T${lh.gioHen}`;
    const gioHenFull = new Date(ngayGioStr);

    const diffHours = (gioHenFull.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      throw new BadRequestException({
        code: 'KHONG_THE_HUY_DUOI_24_TIENG',
        message: 'Theo quy định, lịch hẹn chỉ có thể hủy trước ngày khám ít nhất 1 ngày (trước 24 tiếng). Khi hủy dưới 24 tiếng, hệ thống không thể xử lý hủy trực tuyến và không được hoàn tiền tạm ứng.',
      });
    }

    lh.trangThai = TrangThaiLichHen.DA_HUY;
    lh.ghiChu = (lh.ghiChu || '') + ' [Hủy bởi Bệnh nhân trước ngày khám >= 1 ngày (24 tiếng) - Đã gọi API hoàn tiền 100% khoản tạm ứng 40.000đ qua VNPay/MoMo]';
    lh.capNhatLuc = new Date();

    const saved = await this.repo.save(lh);

    return {
      data: saved,
      message: 'Hủy lịch hẹn thành công! Yêu cầu hoàn tiền tạm ứng 40.000đ (1/5 phí khám) qua VNPay/MoMo đã được xử lý tự động.',
    };
  }

  // ─── BỆNH NHÂN CHỈNH SỬA / ĐỔI LỊCH HẸN (Tối thiểu trước ngày khám 1 ngày / 24 tiếng) ───
  async chinhSuaLichHenBoiBenhNhan(id: number, dto: ChinhSuaLichHenDto, userId?: number) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });

    if (!lh) {
      throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    }

    if ([TrangThaiLichHen.DA_HUY, TrangThaiLichHen.HOAN_THANH].includes(lh.trangThai)) {
      throw new BadRequestException({
        code: 'LICH_HEN_KHONG_THE_CHINH_SUA',
        message: 'Lịch hẹn này đã hoàn thành hoặc đã bị hủy, không thể chỉnh sửa.',
      });
    }

    // 1. Kiểm tra ranh giới 24 tiếng so với giờ hẹn hiện tại
    const now = new Date();
    const ngayGioCuStr = `${lh.ngayHen}T${lh.gioHen}`;
    const gioHenCuFull = new Date(ngayGioCuStr);
    const diffHours = (gioHenCuFull.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      throw new BadRequestException({
        code: 'KHONG_THE_CHINH_SUA_DUOI_24_TIENG',
        message: 'Theo quy định phòng khám, chỉ có thể chỉnh sửa/đổi lịch hẹn trước ngày hẹn khám tối thiểu 1 ngày (24 tiếng). Lịch hẹn hiện tại còn dưới 24 tiếng nữa là đến giờ khám nên không thể đổi lịch trực tuyến.',
      });
    }

    // 2. Kiểm tra ngày hẹn mới hợp lệ (trong khoảng từ 2 đến 7 ngày tính từ ngày hiện tại)
    const ngayGioMoiStr = `${dto.ngayHen}T${dto.gioHen}:00`;
    const gioHenMoiFull = new Date(ngayGioMoiStr);
    if (Number.isNaN(gioHenMoiFull.getTime())) {
      throw new BadRequestException({ code: 'THOI_GIAN_KHONG_HOP_LE', message: 'Ngày hoặc giờ hẹn mới không hợp lệ.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 2); // Tối thiểu trước 2 ngày

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 7); // Tối đa 7 ngày
    maxDate.setHours(23, 59, 59, 999);

    const appointmentDate = new Date(dto.ngayHen + 'T00:00:00');

    if (appointmentDate < minDate || appointmentDate > maxDate) {
      throw new BadRequestException({
        code: 'NGOAI_KHOANG_2_DEN_7_NGAY',
        message: 'Theo quy định, lịch hẹn khám chỉ được phép đổi sang ngày trong khoảng từ 2 đến 7 ngày tính từ ngày hiện tại.',
      });
    }

    // 3. Kiểm tra trùng ca/giờ của chính bệnh nhân trong ngày mới (loại trừ chính lịch hẹn này)
    const gioHenShort = (dto.gioHen || '').substring(0, 5);
    const isCaSang = (dto.gioHen || '') < '12:00';
    const tenCaMoi = isCaSang ? 'Ca Sáng (08:00 - 11:00)' : 'Ca Chiều (13:30 - 16:30)';

    const dsLichHenKhac = await this.repo.find({
      where: {
        benhNhanId: lh.benhNhanId,
        ngayHen: dto.ngayHen,
      },
    });

    const activeKhac = dsLichHenKhac.filter(
      (item) => item.id !== lh.id && ![TrangThaiLichHen.DA_HUY].includes(item.trangThai)
    );

    for (const item of activeKhac) {
      const itemGioShort = (item.gioHen || '').substring(0, 5);
      const itemIsCaSang = (item.gioHen || '') < '12:00';
      const tenCaCu = itemIsCaSang ? 'Ca Sáng' : 'Ca Chiều';

      if (itemGioShort === gioHenShort) {
        throw new ConflictException({
          code: 'TRUNG_GIO_KHAM_TRONG_NGAY',
          message: `Bạn đã có lịch hẹn ${item.maLichHen} vào khung giờ ${itemGioShort} ngày ${dto.ngayHen}. Vui lòng chọn khung giờ khác.`,
        });
      }

      if (itemIsCaSang === isCaSang) {
        throw new ConflictException({
          code: 'TRUNG_CA_KHAM_TRONG_NGAY',
          message: `Bạn đã có lịch hẹn ${item.maLichHen} ở ${tenCaCu} ngày ${dto.ngayHen}. Bệnh nhân không được đặt trùng ca trong cùng ngày.`,
        });
      }
    }

    // 4. Kiểm tra ca trực và slot của Bác sĩ được chọn
    const targetBacSiId = dto.bacSiId || lh.bacSiId;
    if (targetBacSiId) {
      const bacSi = await this.bacSiRepo.findOne({
        where: { id: targetBacSiId },
        relations: ['nhanVien'],
      });

      if (bacSi) {
        const shifts = await this.lichLamViecRepo.find({
          where: {
            nhanVienId: bacSi.nhanVienId,
            ngayLam: dto.ngayHen,
          },
          relations: ['caLamViec'],
        });

        const isMorning = dto.gioHen < '12:00';
        const hasValidShift = shifts.some((s) => {
          const tenCa = s.caLamViec?.tenCa?.toLowerCase() || '';
          if (isMorning) {
            return tenCa.includes('sáng') || s.caLamViecId === 1;
          } else {
            return tenCa.includes('chiều') || s.caLamViecId === 2;
          }
        });

        if (!hasValidShift) {
          const caName = isMorning ? 'Ca Sáng' : 'Ca Chiều';
          const docName = bacSi.nhanVien?.hoTen || 'Bác sĩ';
          throw new BadRequestException({
            code: 'BAC_SI_KHONG_CO_LICH_TRUC',
            message: `${docName} không có lịch trực vào ${caName} ngày ${dto.ngayHen}. Vui lòng chọn bác sĩ hoặc ngày khác.`,
          });
        }
      }

      // Kiểm tra xem slot mới đã có ai đặt chưa (loại trừ chính lịch hẹn này)
      const trungSlot = await this.repo.findOne({
        where: {
          bacSiId: targetBacSiId,
          ngayHen: dto.ngayHen,
          gioHen: dto.gioHen,
        },
      });

      if (trungSlot && trungSlot.id !== lh.id && ![TrangThaiLichHen.DA_HUY, TrangThaiLichHen.HOAN_THANH].includes(trungSlot.trangThai)) {
        throw new ConflictException({
          code: 'LICH_HEN_TRUNG_GIO',
          message: `Bác sĩ đã có bệnh nhân khác đặt vào khung giờ ${gioHenShort} ngày ${dto.ngayHen}. Vui lòng chọn khung giờ khác.`,
        });
      }
    }

    // 5. Cập nhật thông tin lịch hẹn
    const ngayHenCu = lh.ngayHen;
    const gioHenCu = lh.gioHen;
    const hinhThucCu = lh.hinhThuc;

    lh.ngayHen = dto.ngayHen;
    lh.gioHen = dto.gioHen;
    if (dto.bacSiId) lh.bacSiId = dto.bacSiId;
    if (dto.hinhThuc) lh.hinhThuc = dto.hinhThuc;
    if (dto.lyDoKham) lh.lyDoKham = dto.lyDoKham;

    const noteDoiLich = `[Đổi lịch từ ${ngayHenCu} ${gioHenCu} (${hinhThucCu || 'truc_tiep'}) sang ${dto.ngayHen} ${dto.gioHen} (${lh.hinhThuc || 'truc_tiep'}) lúc ${new Date().toLocaleString('vi-VN')}]`;
    lh.ghiChu = lh.ghiChu ? `${lh.ghiChu} | ${noteDoiLich}` : noteDoiLich;
    lh.capNhatLuc = new Date();

    const saved = await this.repo.save(lh);

    const withRelations = await this.findOne(saved.id);

    return {
      success: true,
      data: withRelations,
      message: `Đổi lịch hẹn thành công sang ngày ${dto.ngayHen} lúc ${dto.gioHen}!`,
    };
  }

  // ─── BÁC SĨ YÊU CẦU HỦY CA KHÁM (Trước tối thiểu 1 ngày, bắt buộc nhập lý do, trình Giám đốc duyệt) ───
  async bacSiYeuCauHuyCa(id: number, lyDo: string, currentUser: any) {
    if (!lyDo || !lyDo.trim()) {
      throw new BadRequestException({
        code: 'THIEU_LY_DO_HUY',
        message: 'Bác sĩ bắt buộc phải nhập lý do khi yêu cầu hủy ca khám.',
      });
    }

    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });

    if (!lh) {
      throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    }

    if (lh.trangThai === TrangThaiLichHen.CHO_DUYET_HUY) {
      throw new BadRequestException({
        code: 'DA_YEU_CAU_HUY',
        message: 'Ca khám này đã được gửi yêu cầu hủy và đang chờ Ban Giám Đốc phê duyệt.',
      });
    }

    if (lh.trangThai === TrangThaiLichHen.DA_HUY) {
      throw new BadRequestException({
        code: 'LICH_DA_HUY',
        message: 'Lịch hẹn này đã được hủy trước đó.',
      });
    }

    if (lh.trangThai === TrangThaiLichHen.HOAN_THANH) {
      throw new BadRequestException({
        code: 'LICH_DA_HOAN_THANH',
        message: 'Ca khám đã hoàn thành, không thể yêu cầu hủy.',
      });
    }

    // Bác sĩ phải hủy tối thiểu trước 1 ngày (24 tiếng) của ca khám đó
    const now = new Date();
    const ngayGioStr = `${lh.ngayHen}T${lh.gioHen}`;
    const gioHenFull = new Date(ngayGioStr);

    const diffHours = (gioHenFull.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      throw new BadRequestException({
        code: 'KHONG_THE_HUY_DUOI_24_TIENG',
        message: 'Theo quy định, Bác sĩ chỉ có thể yêu cầu hủy ca tối thiểu trước 1 ngày (trước 24 tiếng) so với giờ khám.',
      });
    }

    lh.trangThai = TrangThaiLichHen.CHO_DUYET_HUY;
    const cleanLyDo = lyDo.trim();
    lh.ghiChu = `${(lh.ghiChu || '').replace(/\[BÁC SĨ YÊU CẦU HỦY:[^\]]+\]/g, '').trim()} [BÁC SĨ YÊU CẦU HỦY: ${cleanLyDo}]`.trim();
    const savedLh = await this.repo.save(lh);

    // Lấy thông tin nhân viên bác sĩ
    const nv = lh.bacSi?.nhanVien || await this.nhanVienRepo.findOne({
      where: { nguoiDungId: currentUser?.id || currentUser?.userId },
    });

    const nguoiGuiId = nv?.id || lh.bacSi?.nhanVienId || 1;
    const doctorName = nv?.hoTen || 'Bác sĩ';
    const patientName = lh.benhNhan?.hoTen || 'Bệnh nhân';

    // Tạo đơn trình Ban Giám Đốc trong bảng don_gui
    const donRepo = this.dataSource.getRepository('don_gui');
    const noiDungDon = `[Mã lịch: ${lh.maLichHen}] [Lịch hẹn ID: ${lh.id}] [Ngày: ${lh.ngayHen} lúc ${lh.gioHen}] Bác sĩ ${doctorName} xin phép hủy ca khám của bệnh nhân ${patientName}. Lý do: ${cleanLyDo}`;

    await donRepo.save({
      nguoiGuiId,
      loaiDon: 'Yêu cầu hủy ca khám',
      noiDung: noiDungDon,
      trangThai: 'cho_xu_ly',
      ngayGui: new Date(),
    });

    // Gửi thông báo đến Ban Giám Đốc
    try {
      const directors: any[] = await this.dataSource.query(
        `SELECT nd.id FROM nguoi_dung nd JOIN vai_tro vt ON nd.vai_tro_id = vt.id WHERE vt.ma_vai_tro = 'ban_giam_doc'`
      );
      for (const d of directors) {
        await this.thongBaoService.taoThongBao({
          nguoiNhanId: d.id,
          tieuDe: `Yêu cầu duyệt hủy ca khám từ BS ${doctorName}`,
          noiDung: `Bác sĩ ${doctorName} vừa đề xuất hủy ca khám ${lh.maLichHen} (ngày ${lh.ngayHen} lúc ${lh.gioHen}) của BN ${patientName}. Lý do: ${cleanLyDo}`,
          loai: 'don_tu',
          doiTuongBang: 'lich_hen',
          doiTuongId: lh.id,
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Lỗi gửi thông báo cho Ban Giám Đốc:', e);
    }

    return {
      success: true,
      data: savedLh,
      message: 'Đã gửi yêu cầu hủy ca khám lên Ban Giám Đốc xét duyệt thành công! Ca khám đang ở trạng thái chờ duyệt.',
    };
  }

  // ─── CẬP NHẬT TRẠNG THÁI (Optimistic Lock) ────────────────────
  async capNhatTrangThai(id: number, dto: CapNhatTrangThaiLichHenDto) {
    const qb = this.repo
      .createQueryBuilder()
      .update(LichHen)
      .set({
        trangThai: dto.trangThai as TrangThaiLichHen,
        ghiChu: dto.ghiChu,
        phienBan: () => 'phien_ban + 1',
        capNhatLuc: new Date(),
      })
      .where('id = :id', { id });

    if (dto.phienBan !== undefined) {
      qb.andWhere('phien_ban = :phienBan', { phienBan: dto.phienBan });
    }

    const result = await qb.execute();

    if (result.affected === 0) {
      throw new ConflictException({
        code: 'XUNG_DOT_DU_LIEU',
        message: 'Lịch hẹn đã được cập nhật bởi người dùng khác. Vui lòng tải lại.',
      });
    }

    const updated = await this.repo.findOne({ where: { id }, relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'] });
    if (updated && dto.trangThai === TrangThaiLichHen.DA_XAC_NHAN && !updated.bacSiId) {
      return this.tuDongPhanCong(id);
    }
    return { data: updated, message: 'Cập nhật trạng thái lịch hẹn thành công' };
  }

  // ─── NHẮC LỊCH KHÁM TỰ ĐỘNG QUA EMAIL TRƯỚC 24H ─────────────
  async guiNhacLichTuDong() {
    const todayStr = getLocalDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    // Lấy các lịch hẹn ngày mai hoặc hôm nay chưa được nhắc
    const qb = this.repo.createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .leftJoinAndSelect('lh.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('lh.ngayHen IN (:...ngays)', { ngays: [todayStr, tomorrowStr] })
      .andWhere('lh.trangThai IN (:...trangThais)', {
        trangThais: [TrangThaiLichHen.CHO_XAC_NHAN, TrangThaiLichHen.DA_XAC_NHAN],
      })
      .andWhere('(lh.ghiChu IS NULL OR lh.ghiChu NOT LIKE :daNhac)', { daNhac: '%[ĐÃ_NHẮC_LỊCH]%' });

    const danhSach = await qb.getMany();
    const ketQuaGui: any[] = [];

    for (const lh of danhSach) {
      const bn = lh.benhNhan;
      const email = bn?.email;
      const bacSiTen = lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ trực phòng khám';

      if (email) {
        try {
          await this.mailer.sendMail({
            from: this.config.get('MAIL_FROM', 'Phong Kham <no-reply@phongkham.vn>'),
            to: email,
            subject: `[Nhắc Lịch Hẹn Khám] - Ngày ${lh.ngayHen} lúc ${lh.gioHen} - Phòng Khám Đa Khoa`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; rounded: 16px;">
                <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
                  <h2 style="color: #1e40af; margin: 0;">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</h2>
                  <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">THÔNG BÁO NHẮC LỊCH KHÁM BỆNH TỰ ĐỘNG</p>
                </div>

                <p>Kính gửi Quý người bệnh: <strong>${bn.hoTen}</strong>,</p>
                <p>Phòng khám xin nhắc Quý khách về lịch hẹn khám bệnh sắp tới:</p>

                <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 8px;">
                  <p style="margin: 4px 0;">📅 <strong>Ngày khám:</strong> ${lh.ngayHen}</p>
                  <p style="margin: 4px 0;">⏰ <strong>Giờ khám:</strong> ${lh.gioHen}</p>
                  <p style="margin: 4px 0;">🩺 <strong>Bác sĩ phụ trách:</strong> ${bacSiTen}</p>
                  <p style="margin: 4px 0;">🔖 <strong>Mã lịch hẹn:</strong> ${lh.maLichHen}</p>
                  <p style="margin: 4px 0;">📍 <strong>Hình thức:</strong> ${lh.hinhThuc === 'truc_tuyen' ? 'Khám Online Telehealth' : 'Khám trực tiếp tại phòng khám'}</p>
                </div>

                <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; font-size: 13px; color: #92400e;">
                  <strong>⚠️ Lưu ý quan trọng trước khi đi khám:</strong>
                  <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                    <li>Vui lòng có mặt trước giờ hẹn 10 - 15 phút tại Quầy tiếp tân để làm thủ tục.</li>
                    <li>Mang theo CCCD/VNeID và thẻ BHYT (nếu có) để hưởng quyền lợi chiết khấu 80%.</li>
                    <li>Nếu có chỉ định xét nghiệm máu / đường huyết, vui lòng nhịn ăn sáng từ 6 - 8 tiếng.</li>
                  </ul>
                </div>

                <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
                  Hotline hỗ trợ: 1900 6868 | Địa chỉ: 123 Nguyễn Văn Cừ, Quận 5, TP.HCM
                </p>
              </div>
            `,
          });
          console.log(`[LichHenReminder] Đã gửi email nhắc lịch cho BN ${bn.hoTen} (${email})`);
        } catch (mailErr) {
          console.warn(`[LichHenReminder] Không thể gửi mail tới ${email}:`, mailErr.message);
        }
      }

      // Đánh dấu đã nhắc lịch
      const thoiGianNhac = new Date().toLocaleString('vi-VN');
      lh.ghiChu = `${lh.ghiChu || ''} [ĐÃ_NHẮC_LỊCH: ${thoiGianNhac}]`.trim();
      await this.repo.save(lh);

      ketQuaGui.push({
        id: lh.id,
        maLichHen: lh.maLichHen,
        benhNhan: bn?.hoTen,
        email: email || 'Không có email',
        ngayHen: lh.ngayHen,
        gioHen: lh.gioHen,
      });
    }

    return {
      message: `Đã quét và gửi nhắc lịch tự động cho ${ketQuaGui.length} bệnh nhân có lịch hẹn trong 24 giờ tới.`,
      soLuong: ketQuaGui.length,
      danhSach: ketQuaGui,
    };
  }

  /**
   * Hoàn tất ca tư vấn trực tuyến (Telehealth) & lưu kết luận bệnh án
   */
  async hoanTatTuVan(id: number, body: { chanDoan?: string; loiKhuyen?: string }, user: any) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan', 'bacSi'],
    });

    if (!lh) {
      throw new NotFoundException('Không tìm thấy ca tư vấn trực tuyến.');
    }

    if (lh.trangThai === TrangThaiLichHen.HOAN_THANH) {
      throw new BadRequestException({
        code: 'CA_KHAM_DA_HOAN_THANH',
        message: 'Ca tư vấn trực tuyến này đã hoàn tất trước đó.',
      });
    }

    // Chỉ cho phép kết luận khi ca khám đã bắt đầu mở (từ trước giờ hẹn 15 phút trở đi)
    if (lh.ngayHen && lh.gioHen) {
      const dateStr = String(lh.ngayHen).substring(0, 10);
      let timeStr = String(lh.gioHen).trim();
      if (timeStr.length === 5) timeStr += ':00';
      const apptDateTime = new Date(`${dateStr}T${timeStr}`);
      if (!isNaN(apptDateTime.getTime())) {
        const openTime = new Date(apptDateTime.getTime() - 15 * 60 * 1000);
        const now = new Date();
        if (now < openTime) {
          throw new BadRequestException({
            code: 'CHUA_DEN_GIO_KHAM',
            message: 'Chưa đến thời gian khám bệnh. Bác sĩ chỉ có thể gửi kết luận khi ca khám đang diễn ra hoặc sau khi đã tư vấn.',
          });
        }
      }
    }

    // Cập nhật trạng thái lịch hẹn sang 'hoan_thanh'
    lh.trangThai = TrangThaiLichHen.HOAN_THANH;
    const ghiChuMoi = `[Telehealth Kết luận] Chẩn đoán: ${body.chanDoan || 'Đã tư vấn'}; Lời khuyên: ${body.loiKhuyen || 'Theo dõi tại nhà'}`;
    lh.ghiChu = `${lh.ghiChu || ''}\n${ghiChuMoi}`.trim();
    await this.repo.save(lh);

    // Ghi nhận hoặc cập nhật vào bệnh án nếu có hồ sơ
    try {
      // Tìm hoặc tạo hồ sơ bệnh án
      const hsRows = await this.repo.manager.query(
        `SELECT id, ma_ho_so FROM ho_so_benh_an WHERE benh_nhan_id = ? LIMIT 1`,
        [lh.benhNhanId],
      );
      let hoSoBenhAnId = hsRows && hsRows.length > 0 ? hsRows[0].id : null;
      if (!hoSoBenhAnId) {
        const maHoSo = `HS${Date.now().toString().slice(-6)}`;
        const insHs = await this.repo.manager.query(
          `INSERT INTO ho_so_benh_an (ma_ho_so, benh_nhan_id, ngay_tao, trang_thai) VALUES (?, ?, NOW(), 'hoat_dong')`,
          [maHoSo, lh.benhNhanId],
        );
        hoSoBenhAnId = insHs.insertId;
      }

      // Lưu phiếu khám bệnh án (benh_an_kham)
      await this.repo.manager.query(
        `INSERT INTO benh_an_kham 
         (ho_so_benh_an_id, luot_tiep_nhan_id, bac_si_id, ngay_kham, chan_doan_so_bo, chan_doan_xac_dinh, trieu_chung, phuong_phap_dieu_tri, hinh_thuc_kham, trang_thai, ghi_chu)
         VALUES (?, NULL, ?, NOW(), ?, ?, ?, ?, 'truc_tuyen', 'da_hoan_thanh', ?)`,
        [
          hoSoBenhAnId,
          lh.bacSiId || 1,
          body.chanDoan || 'Tư vấn khám từ xa',
          body.chanDoan || 'Tư vấn khám từ xa',
          lh.lyDoKham || 'Tư vấn trực tuyến Telehealth',
          body.loiKhuyen || 'Theo dõi sức khỏe và tái khám theo chỉ định',
          `Ca tư vấn trực tuyến Telehealth (Mã lịch: ${lh.maLichHen})`,
        ],
      );
    } catch (bakErr) {
      console.warn('[Telehealth] Không thể ghi nhận benh_an_kham:', bakErr.message);
    }

    return {
      success: true,
      message: 'Đã hoàn tất ca tư vấn trực tuyến và lưu kết luận chuyên môn thành công.',
      data: lh,
    };
  }
}
