import {
  Injectable, NotFoundException, ConflictException, BadRequestException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { LichHen, TrangThaiLichHen, CHO_PHAN_CONG_MARKER } from './entities/lich-hen.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';
import { CaLamViec } from '../nhan-vien/entities/ca-lam-viec.entity';
import { CauHinhTienCoc } from '../quan-ly/entities/cau-hinh-tien-coc.entity';
import { ThongBaoService } from '../thong-bao/thong-bao.service';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { TaoLichHenDto, CapNhatTrangThaiLichHenDto, TimKiemLichHenDto, LaySlotTrongDto, ChinhSuaLichHenDto } from './dto/lich-hen.dto';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';

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
  private locks = new Map<string, Promise<any>>();
  private lastMaLhSeq = 0;
  private lastMaBnSeq = 0;

  /**
   * Keyed Mutex Lock: Đảm bảo các request đặt trùng cùng 1 slot bác sĩ / cùng 1 bệnh nhân
   * hoặc sinh mã tự động tại cùng 1 mili-giây sẽ xếp hàng tuần tự, chống Race Condition 100%.
   */
  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chain = prev.then(() => next);
    this.locks.set(key, chain);

    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(key) === chain) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Sinh mã lịch hẹn nguyên tử (Atomic Sequence) chống trùng mã ER_DUP_ENTRY khi hàng chục người đặt cùng lúc
   */
  private async generateNextMaLichHen(): Promise<string> {
    return this.withLock('seq:ma_lich_hen', async () => {
      const year = new Date().getFullYear();
      const prefix = `LH${year}`;
      if (this.lastMaLhSeq === 0) {
        const rows: any[] = await this.dataSource.query(
          `SELECT MAX(CAST(SUBSTRING(ma_lich_hen, 7) AS UNSIGNED)) AS maxNum FROM lich_hen WHERE ma_lich_hen LIKE ?`,
          [`${prefix}%`],
        );
        const dbMax = Number(rows?.[0]?.maxNum || 0);
        const totalCount = await this.repo.count();
        this.lastMaLhSeq = Math.max(dbMax, totalCount);
      }
      this.lastMaLhSeq += 1;
      return MaGeneratorService.generateMaLichHen(this.lastMaLhSeq);
    });
  }

  /**
   * Sinh mã bệnh nhân nguyên tử (Atomic Sequence) chống trùng mã ER_DUP_ENTRY khi tạo hồ sơ khách vãng lai đồng thời
   */
  private async generateNextMaBenhNhan(): Promise<string> {
    return this.withLock('seq:ma_benh_nhan', async () => {
      const year = new Date().getFullYear();
      const prefix = `BN${year}`;
      if (this.lastMaBnSeq === 0) {
        const rows: any[] = await this.dataSource.query(
          `SELECT MAX(CAST(SUBSTRING(ma_benh_nhan, 7) AS UNSIGNED)) AS maxNum FROM benh_nhan WHERE ma_benh_nhan LIKE ?`,
          [`${prefix}%`],
        );
        const dbMax = Number(rows?.[0]?.maxNum || 0);
        const totalCount = await this.dataSource.getRepository(BenhNhan).count();
        this.lastMaBnSeq = Math.max(dbMax, totalCount);
      }
      this.lastMaBnSeq += 1;
      return MaGeneratorService.generateMaBenhNhan(this.lastMaBnSeq);
    });
  }

  constructor(
    @InjectRepository(LichHen) private repo: Repository<LichHen>,
    @InjectRepository(BacSi) private bacSiRepo: Repository<BacSi>,
    @InjectRepository(NhanVien) private nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(LichLamViec) private lichLamViecRepo: Repository<LichLamViec>,
    @InjectRepository(CaLamViec) private caLamViecRepo: Repository<CaLamViec>,
    private dataSource: DataSource,
    private config: ConfigService,
    private thongBaoService: ThongBaoService,
    private cache: MemoryCacheService,
  ) {
    this.mailer = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      host: config.get('MAIL_HOST', 'smtp.gmail.com'),
      port: Number(config.get('MAIL_PORT', 587)),
      secure: false,
      auth: {
        user: (config.get<string>('MAIL_USER') || '').trim(),
        pass: (config.get<string>('MAIL_PASS') || '').replace(/\s+/g, ''),
      },
    });
  }

  private async sendAppointmentEmail(to: string, subject: string, html: string) {
    const brevoApiKey = this.config.get<string>('BREVO_API_KEY')?.trim();
    const senderEmail = (
      this.config.get<string>('BREVO_SENDER_EMAIL') ||
      this.config.get<string>('MAIL_USER') ||
      ''
    ).trim();
    const senderName = this.config.get<string>('BREVO_SENDER_NAME', 'Phòng Khám Đa Khoa');

    if (!senderEmail) {
      throw new Error('Chưa cấu hình email người gửi lịch hẹn');
    }

    if (brevoApiKey) {
      try {
        await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { email: senderEmail, name: senderName },
            to: [{ email: to }],
            subject,
            htmlContent: html,
          },
          {
            headers: {
              accept: 'application/json',
              'api-key': brevoApiKey,
              'content-type': 'application/json',
            },
            timeout: 15000,
          },
        );
        return;
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        const detail = axios.isAxiosError(err) ? err.response?.data?.message : err.message;
        throw new Error(`Brevo gửi email lịch hẹn thất bại${status ? ` (${status})` : ''}: ${detail || 'unknown error'}`);
      }
    }

    await this.mailer.sendMail({
      from: this.config.get('MAIL_FROM', senderEmail),
      to,
      subject,
      html,
    });
  }

  onModuleInit() {
    // Dọn dẹp phòng khám vật lý bị gán nhầm cho lịch khám trực tuyến (Telehealth)
    this.dataSource
      .query(`UPDATE lich_hen SET phong_kham_id = NULL WHERE hinh_thuc = 'truc_tuyen' AND phong_kham_id IS NOT NULL`)
      .catch(() => {});

    // Tự động đồng bộ phiếu thu tạm ứng cho các lịch hẹn đã xác nhận thanh toán
    this.dongBoTatCaTamUngLichHen().catch((err) =>
      console.warn('[LichHenDepositSync] Lỗi đồng bộ tạm ứng:', err?.message)
    );

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

  // ─── CHUẨN ERP Y TẾ: TẠO & ĐỒNG BỘ HÓA ĐƠN TẠM ỨNG ĐẶT LỊCH (40.000đ) ───
  async dongBoTatCaTamUngLichHen() {
    try {
      await this.dataSource.query(
        `ALTER TABLE hoa_don_chi_tiet MODIFY COLUMN loai_phi VARCHAR(50) NOT NULL DEFAULT 'kham_benh'`
      ).catch(() => {});
      await this.dataSource.query(
        `ALTER TABLE don_thuoc MODIFY COLUMN trang_thai VARCHAR(50) NOT NULL DEFAULT 'cho_duyet'`
      ).catch(() => {});

      const list = await this.repo.find({
        where: {
          nguonDat: In(['benh_nhan_tu_dat', 'bac_si_dat']),
          trangThai: In([
            TrangThaiLichHen.DA_XAC_NHAN,
            TrangThaiLichHen.DANG_KHAM,
            TrangThaiLichHen.HOAN_THANH,
            TrangThaiLichHen.CHO_DUYET_HUY,
            TrangThaiLichHen.DA_HUY,
          ]),
        },
        order: { id: 'ASC' },
      });

      for (const lh of list) {
        const note = (lh.ghiChu || '').toLowerCase();
        // Nếu bị hủy do hết thời gian đếm ngược mà chưa đóng cọc thì bỏ qua
        if (
          lh.trangThai === TrangThaiLichHen.DA_HUY &&
          !note.includes('hoàn tiền') &&
          !note.includes('[stt:')
        ) {
          continue;
        }
        await this.dongBoHoaDonTamUng(lh, false);
      }
    } catch (err: any) {
      console.warn('[LichHenDepositSync] Lỗi quét tạm ứng lịch hẹn:', err.message);
    }
  }

  private async getSoTienCocHienHanh(hinhThuc: string, maLichHen?: string): Promise<number> {
    if (maLichHen) {
      try {
        const maHdTamUng = `HDT${maLichHen.replace(/^LH/i, '')}`.slice(0, 20);
        const hdRows: any[] = await this.dataSource.query(
          'SELECT thuc_thu, tong_tien FROM hoa_don WHERE ma_hoa_don = ? LIMIT 1',
          [maHdTamUng],
        );
        if (hdRows.length > 0 && (hdRows[0].thuc_thu || hdRows[0].tong_tien)) {
          return Number(hdRows[0].thuc_thu || hdRows[0].tong_tien);
        }
      } catch {}
    }
    try {
      const cocRows: any[] = await this.dataSource.query(
        'SELECT so_tien_coc FROM cau_hinh_tien_coc WHERE loai_hinh_thuc = ? LIMIT 1',
        [hinhThuc || 'truc_tiep'],
      );
      if (cocRows.length > 0 && cocRows[0].so_tien_coc) {
        return Number(cocRows[0].so_tien_coc);
      }
    } catch {}
    return hinhThuc === 'truc_tuyen' ? 200000 : 40000;
  }

  async dongBoHoaDonTamUng(lh: LichHen, isNewPayment = false) {
    if (!lh || !lh.maLichHen || !lh.benhNhanId) return null;

    const maHoaDonTamUng = `HDT${lh.maLichHen.replace(/^LH/i, '')}`.slice(0, 20);
    const marker = `[MÃ_LỊCH_HẸN: ${lh.maLichHen}]`;
    const isOnline = lh.hinhThuc === 'truc_tuyen';
    const soTienCoc = await this.getSoTienCocHienHanh(lh.hinhThuc);
    const soTienCocText = `${soTienCoc.toLocaleString('vi-VN')}đ`;

    const existingRows: any[] = await this.dataSource.query(
      `SELECT id, trang_thai, thu_ngan_id, ghi_chu FROM hoa_don WHERE ma_hoa_don = ? OR ghi_chu LIKE ? LIMIT 1`,
      [maHoaDonTamUng, `%${marker}%`]
    );

    const noteLower = (lh.ghiChu || '').toLowerCase();
    const isCanceledEligibleRefund =
      lh.trangThai === TrangThaiLichHen.DA_HUY &&
      (noteLower.includes('hoàn tiền') || noteLower.includes('hoàn cọc') || noteLower.includes('chờ hoàn cọc'));
    const tkMatchFromLh = lh.ghiChu?.match(/\[TK_HOÀN_TIỀN:[^\]]+\]/i);
    const tkTag = tkMatchFromLh
      ? tkMatchFromLh[0]
      : `[TK_HOÀN_TIỀN: chua_cung_cap|Chờ bệnh nhân cung cấp STK hoặc nhận tại quầy||]`;

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      const existingNote = String(existing.ghi_chu || '');
      const cashierConfirmedRefund =
        existing.trang_thai === 'huy' &&
        (existing.thu_ngan_id != null || existingNote.includes('[ĐÃ HOÀN CỌC THÀNH CÔNG]') || existingNote.includes('bởi '));

      // Nếu lịch hẹn đã hủy hợp lệ nhưng Thu ngân chưa xác nhận giải ngân hoàn tiền -> Đưa về trạng thái chờ Thu ngân hoàn cọc
      if (isCanceledEligibleRefund && !cashierConfirmedRefund) {
        if (!existingNote.includes(`[CHỜ HOÀN CỌC ${soTienCocText}]`) || existing.trang_thai === 'huy') {
          const hinhThucText = isOnline ? 'Tư vấn Online' : 'Khám tại PK';
          const pendingRefundNote = `[CHỜ HOÀN CỌC ${soTienCocText}] [${isOnline ? 'PHÍ TƯ VẤN ONLINE' : 'TẠM ỨNG ĐẶT LỊCH'}] ${marker} ${tkTag} Lịch hẹn ${lh.maLichHen} (${hinhThucText}) đã hủy hợp lệ - Chờ Thu ngân chuyển hoàn ${soTienCoc.toLocaleString('vi-VN')} đ.`;
          await this.dataSource.query(
            `UPDATE hoa_don SET trang_thai = 'da_thanh_toan', ghi_chu = ? WHERE id = ?`,
            [pendingRefundNote, existing.id]
          );
        }
      }
      return existing.id;
    }

    const ngayGiaoDich = isNewPayment ? new Date() : (lh.capNhatLuc || lh.taoLuc || new Date());
    const hinhThucText = isOnline ? 'Tư vấn Online' : 'Khám tại PK';
    const ghiChuHd = isCanceledEligibleRefund
      ? `[CHỜ HOÀN CỌC ${soTienCocText}] [${isOnline ? 'PHÍ TƯ VẤN ONLINE' : 'TẠM ỨNG ĐẶT LỊCH'}] ${marker} ${tkTag} Lịch hẹn ${lh.maLichHen} (${hinhThucText}) đã hủy hợp lệ - Chờ Thu ngân chuyển hoàn ${soTienCoc.toLocaleString('vi-VN')} đ.`
      : `[${isOnline ? 'PHÍ TƯ VẤN ONLINE' : 'TẠM ỨNG ĐẶT LỊCH'}] ${marker} Thu ${isOnline ? 'phí tư vấn online' : 'tạm ứng 1/5 phí khám giữ chỗ'} qua PayOS/Chuyển khoản (${hinhThucText} - Ngày hẹn: ${lh.ngayHen} ${lh.gioHen})`;

    const insertRes: any = await this.dataSource.query(
      `INSERT INTO hoa_don (ma_hoa_don, benh_nhan_id, luot_tiep_nhan_id, thu_ngan_id, tong_tien, so_tien_giam, thuc_thu, phuong_thuc_thanh_toan, trang_thai, ghi_chu, ngay_tao, ngay_thanh_toan)
       VALUES (?, ?, NULL, NULL, ?, 0, ?, 'chuyen_khoan', 'da_thanh_toan', ?, ?, ?)`,
      [
        maHoaDonTamUng,
        lh.benhNhanId,
        soTienCoc,
        soTienCoc,
        ghiChuHd,
        ngayGiaoDich,
        ngayGiaoDich,
      ]
    );

    const hoaDonId = insertRes?.insertId;
    if (hoaDonId) {
      await this.dataSource.query(
        `INSERT INTO hoa_don_chi_tiet (hoa_don_id, loai_phi, mo_ta, so_luong, don_gia, thanh_tien)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [
          hoaDonId,
          isOnline ? 'kham_benh' : 'tam_ung',
          isOnline ? `Phí tư vấn trực tuyến (Telehealth) lịch hẹn ${lh.maLichHen}` : `Tạm ứng 1/5 phí khám giữ chỗ lịch hẹn ${lh.maLichHen} (${hinhThucText})`,
          soTienCoc,
          soTienCoc,
        ]
      );
    }

    return hoaDonId;
  }

  async yeuCauHoanCocHoaDonTamUng(
    lh: LichHen,
    lyDo: string,
    refundInfo?: {
      phuongThucNhan?: 'chuyen_khoan' | 'tien_mat';
      nganHang?: string;
      soTaiKhoan?: string;
      chuTaiKhoan?: string;
    },
  ) {
    if (!lh || !lh.maLichHen) return;
    await this.dongBoHoaDonTamUng(lh, false);
    const maHoaDonTamUng = `HDT${lh.maLichHen.replace(/^LH/i, '')}`.slice(0, 20);
    const marker = `[MÃ_LỊCH_HẸN: ${lh.maLichHen}]`;
    const isOnline = lh.hinhThuc === 'truc_tuyen';
    const soTienHoan = await this.getSoTienCocHienHanh(lh.hinhThuc, lh.maLichHen);
    const soTienHoanText = `${soTienHoan.toLocaleString('vi-VN')}đ`;

    let tkTag = `[TK_HOÀN_TIỀN: chua_cung_cap|Chờ bệnh nhân cung cấp STK hoặc nhận tại quầy||${lh.benhNhan?.hoTen || ''}]`;
    if (refundInfo?.phuongThucNhan === 'tien_mat') {
      tkTag = `[TK_HOÀN_TIỀN: tien_mat|Nhận tiền mặt tại Quầy Thu Ngân||${(refundInfo.chuTaiKhoan || lh.benhNhan?.hoTen || '').trim()}]`;
    } else if (refundInfo?.soTaiKhoan?.trim()) {
      const bank = (refundInfo.nganHang || 'Ngân hàng').replace(/[|\[\]]/g, '').trim();
      const stk = refundInfo.soTaiKhoan.replace(/[|\[\]]/g, '').trim();
      const chuTk = (refundInfo.chuTaiKhoan || lh.benhNhan?.hoTen || '').replace(/[|\[\]]/g, '').trim();
      tkTag = `[TK_HOÀN_TIỀN: chuyen_khoan|${bank}|${stk}|${chuTk}]`;
    }

    const pendingRefundNote = `[CHỜ HOÀN CỌC ${soTienHoanText}] [${isOnline ? 'PHÍ TƯ VẤN ONLINE' : 'TẠM ỨNG ĐẶT LỊCH'}] ${marker} ${tkTag} [LÝ_DO_HỦY: ${lyDo}] Yêu cầu hoàn trả 100% tiền tạm ứng ${soTienHoan.toLocaleString('vi-VN')} đ.`;
    await this.dataSource.query(
      `UPDATE hoa_don SET trang_thai = 'da_thanh_toan', ghi_chu = ? WHERE ma_hoa_don = ? OR ghi_chu LIKE ?`,
      [pendingRefundNote, maHoaDonTamUng, `%${marker}%`]
    );
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
    const depositInvoicesAll: any[] = await this.dataSource.query(
      `SELECT ma_hoa_don, thuc_thu, tong_tien FROM hoa_don WHERE ma_hoa_don LIKE 'HDT%'`
    ).catch(() => []);
    const cocConfigsAll: any[] = await this.dataSource.query(
      `SELECT loai_hinh_thuc, so_tien_coc FROM cau_hinh_tien_coc`
    ).catch(() => []);
    const defaultCocTT = Number(cocConfigsAll.find((c) => c.loai_hinh_thuc === 'truc_tiep')?.so_tien_coc || 40000);
    const defaultCocOnline = Number(cocConfigsAll.find((c) => c.loai_hinh_thuc === 'truc_tuyen')?.so_tien_coc || 200000);

    const enrichedItems = items.map((item) => {
      const maHdTamUng = `HDT${(item.maLichHen || '').replace(/^LH/i, '')}`.slice(0, 20);
      const hdCoc = depositInvoicesAll.find((h) => h.ma_hoa_don === maHdTamUng);
      const defaultCoc = item.hinhThuc === 'truc_tuyen' ? defaultCocOnline : defaultCocTT;
      const soTienThanhToan = Number(hdCoc?.thuc_thu || hdCoc?.tong_tien || defaultCoc);
      return {
        ...item,
        soTienThanhToan,
        soTienCoc: soTienThanhToan,
      };
    });

    return {
      data: enrichedItems,
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
    const hdCodes = items
      .map((it) => `HDT${(it.maLichHen || '').replace(/^LH/i, '')}`.slice(0, 20))
      .filter(Boolean);

    const [allRooms, depositInvoices, cocConfigs] = await Promise.all([
      this.cache.getOrSet('master:phong_kham_all', 30_000, () =>
        this.dataSource.query('SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham'),
      ),
      hdCodes.length > 0
        ? this.dataSource
            .query(
              `SELECT ma_hoa_don, trang_thai, thu_ngan_id, ghi_chu, thuc_thu, tong_tien FROM hoa_don WHERE ma_hoa_don IN (${hdCodes.map(() => '?').join(',')})`,
              hdCodes,
            )
            .catch(() => [])
        : Promise.resolve([]),
      this.cache.getOrSet('master:cau_hinh_tien_coc_short', 10_000, () =>
        this.dataSource
          .query(`SELECT loai_hinh_thuc, so_tien_coc FROM cau_hinh_tien_coc`)
          .catch(() => []),
      ),
    ]);
    const cocTrucTiep = Number(cocConfigs.find((c) => c.loai_hinh_thuc === 'truc_tiep')?.so_tien_coc || 40000);
    const cocTrucTuyen = Number(cocConfigs.find((c) => c.loai_hinh_thuc === 'truc_tuyen')?.so_tien_coc || 200000);

    const mappedItems = items.map((item) => {
      const sttMatch = item.ghiChu?.match(/\[STT:\s*([^\]]+)\]/);
      const soThuTu = sttMatch ? sttMatch[1] : `A${String((item.id % 900) + 100)}`;
      const isOnlineItem = item.hinhThuc === 'truc_tuyen';
      const phong = (!isOnlineItem && item.phongKhamId)
        ? (allRooms.find((r) => r.id === item.phongKhamId) || null)
        : null;

      const maHdTamUng = `HDT${(item.maLichHen || '').replace(/^LH/i, '')}`.slice(0, 20);
      const hdCoc = depositInvoices.find((h) => h.ma_hoa_don === maHdTamUng);
      const noteCombined = `${item.ghiChu || ''} ${hdCoc?.ghi_chu || ''}`;
      const noteLower = noteCombined.toLowerCase();

      const defaultCoc = item.hinhThuc === 'truc_tuyen' ? cocTrucTuyen : cocTrucTiep;
      const soTienThanhToan = Number(hdCoc?.thuc_thu || hdCoc?.tong_tien || defaultCoc);

      const tkMatch = noteCombined.match(/\[TK_HOÀN_TIỀN:\s*([^\]]+)\]/i);
      let thongTinHoanCoc: any = null;
      if (tkMatch) {
        const parts = tkMatch[1].split('|').map((s) => s.trim());
        thongTinHoanCoc = {
          phuongThucNhan: parts[0] || 'chuyen_khoan',
          nganHang: parts[1] || '',
          soTaiKhoan: parts[2] || '',
          chuTaiKhoan: parts[3] || item.benhNhan?.hoTen || '',
        };
      }

      let trangThaiHoanCoc: 'da_hoan_coc' | 'cho_hoan_coc' | null = null;
      if (item.trangThai === TrangThaiLichHen.DA_HUY) {
        if (
          hdCoc?.trang_thai === 'huy' &&
          (hdCoc?.thu_ngan_id != null || noteCombined.includes('[ĐÃ HOÀN CỌC THÀNH CÔNG]') || noteCombined.includes('bởi '))
        ) {
          trangThaiHoanCoc = 'da_hoan_coc';
        } else if (
          noteLower.includes('hoàn tiền') ||
          noteLower.includes('hoàn cọc') ||
          noteLower.includes('chờ hoàn cọc')
        ) {
          trangThaiHoanCoc = 'cho_hoan_coc';
        }
      }

      return {
        ...item,
        soThuTu,
        phongKham: phong,
        soTienThanhToan,
        soTienCoc: soTienThanhToan,
        trangThaiHoanCoc,
        thongTinHoanCoc,
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
    if (lh.hinhThuc !== 'truc_tuyen' && lh.phongKhamId) {
      const [pk]: any[] = await this.dataSource.query('SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ?', [lh.phongKhamId]);
      phongKham = pk || null;
    }
    const sttMatch = lh.ghiChu?.match(/\[STT:\s*([^\]]+)\]/);
    const soThuTu = sttMatch ? sttMatch[1] : `A${String((lh.id % 900) + 100)}`;
    const soTienCoc = await this.getSoTienCocHienHanh(lh.hinhThuc, lh.maLichHen);

    return {
      data: {
        ...lh,
        phongKham,
        soThuTu,
        soTienCoc,
        soTienThanhToan: soTienCoc,
        qrCodeValue: `${lh.maLichHen}|STT:${soThuTu}|DATE:${lh.ngayHen}|TIME:${lh.gioHen}`,
      },
      message: 'Lấy thông tin lịch hẹn thành công',
    };
  }

  // ─── DANH SÁCH BÁC SĨ TRỰC VÀ CA KHÁM TRỐNG ──────────────────
  async layBacSiVaCaTrong(chuyenKhoa?: string, ngay?: string) {
    const ngayKham = ngay || getLocalDateString();
    const cacheKey = `lich_hen:bac_si_ca_trong:${ngayKham}:${(chuyenKhoa || 'ALL').trim().toLowerCase()}`;

    return this.cache.getOrSet(cacheKey, 5_000, async () => {
      // Chạy song song 4 truy vấn thay vì tuần tự để giảm 70% độ trễ
      const [allDoctors, allRooms, shiftsOnDate, activeAppointments] = await Promise.all([
        this.bacSiRepo.find({ relations: ['nhanVien'] }),
        this.cache.getOrSet('master:phong_kham_active', 30_000, () =>
          this.dataSource.query('SELECT * FROM phong_kham WHERE trang_thai = "hoat_dong"'),
        ),
        this.lichLamViecRepo.find({
          where: { ngayLam: ngayKham },
          relations: ['caLamViec'],
        }),
        this.repo.find({
          where: {
            ngayHen: ngayKham,
            trangThai: In([
              TrangThaiLichHen.CHO_THANH_TOAN,
              TrangThaiLichHen.CHO_XAC_NHAN,
              TrangThaiLichHen.DA_XAC_NHAN,
            ]),
          },
          select: ['bacSiId', 'gioHen'],
        }),
      ]);

      let filteredDoctors = allDoctors;
      if (chuyenKhoa && chuyenKhoa.trim()) {
        const ckLower = chuyenKhoa.trim().toLowerCase();
        filteredDoctors = allDoctors.filter(
          (d) =>
            (d.chuyenKhoa || '').toLowerCase().includes(ckLower) ||
            ckLower.includes((d.chuyenKhoa || '').toLowerCase()),
        );
      }

      const appointmentSet = new Set(
        activeAppointments.map((a) => `${a.bacSiId}_${(a.gioHen || '').substring(0, 5)}`),
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

      const isToday = ngayKham === getLocalDateString();
      const now = new Date();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const result = filteredDoctors.map((doc) => {
        const matchedRoom =
          allRooms.find(
            (r: any) =>
              (r.chuyen_khoa &&
                (doc.chuyenKhoa || '').toLowerCase().includes(r.chuyen_khoa.toLowerCase())) ||
              (doc.chuyenKhoa &&
                r.chuyen_khoa &&
                doc.chuyenKhoa.toLowerCase().includes(r.chuyen_khoa.toLowerCase())),
          ) || allRooms[0];

        const docShifts = shiftsOnDate.filter((s) => s.nhanVienId === doc.nhanVienId);
        const hasDeclaredShifts = docShifts.length > 0;
        const worksMorning =
          hasDeclaredShifts &&
          docShifts.some(
            (s) => s.caLamViec?.tenCa?.toLowerCase().includes('sáng') || s.caLamViecId === 1,
          );
        const worksAfternoon =
          hasDeclaredShifts &&
          docShifts.some(
            (s) => s.caLamViec?.tenCa?.toLowerCase().includes('chiều') || s.caLamViecId === 2,
          );

        const slots = STANDARD_SLOTS.map(({ slot, ca }) => {
          const inShift = (ca === 'sang' && worksMorning) || (ca === 'chieu' && worksAfternoon);
          const daDat = appointmentSet.has(`${doc.id}_${slot}`);
          const daQuaGio = isToday && slot <= currentTimeStr;
          return {
            gio: slot,
            ca,
            inShift,
            daDat,
            daQuaGio,
            conTrong: inShift && !daDat && !daQuaGio,
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
          phongKham: matchedRoom
            ? {
                id: matchedRoom.id,
                tenPhong: matchedRoom.ten_phong,
                viTri: matchedRoom.vi_tri,
                chuyenKhoa: matchedRoom.chuyen_khoa,
              }
            : null,
          slots,
          soSlotTrong,
        };
      });

      const availableDoctors = result.filter((d) => d.dangTruc);

      return {
        data: availableDoctors,
        ngay: ngayKham,
        chuyenKhoa,
        message: 'Lấy danh sách bác sĩ trực và ca khám thành công',
      };
    });
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
      const targetHinhThuc = dto.hinhThuc === 'truc_tuyen' ? 'truc_tuyen' : 'truc_tiep';
      const cocConfig = await this.dataSource.getRepository(CauHinhTienCoc).findOne({
        where: { loaiHinhThuc: targetHinhThuc },
      });
      const minDays = cocConfig?.choPhepDatTruocNgayMin !== undefined && cocConfig?.choPhepDatTruocNgayMin !== null
        ? Number(cocConfig.choPhepDatTruocNgayMin) : 0;
      const maxDays = cocConfig?.choPhepDatTruocNgayMax !== undefined && cocConfig?.choPhepDatTruocNgayMax !== null
        ? Number(cocConfig.choPhepDatTruocNgayMax) : 30;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + minDays);

      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + maxDays);
      maxDate.setHours(23, 59, 59, 999);

      const appointmentDate = new Date(dto.ngayHen + 'T00:00:00');

      if (appointmentDate < minDate || appointmentDate > maxDate) {
        const hinhThucLabel = targetHinhThuc === 'truc_tuyen' ? 'tư vấn trực tuyến' : 'khám trực tiếp';
        throw new BadRequestException({
          code: 'NGOAI_KHOANG_DAT_LICH',
          message: `Theo quy định, lịch hẹn ${hinhThucLabel} chỉ được phép đặt trước từ ${minDays} đến ${maxDays} ngày tính từ ngày hiện tại.`,
        });
      }

      // Nếu đặt trong ngày hôm nay: giờ hẹn phải từ thời điểm hiện tại trở đi
      if (dto.ngayHen === getLocalDateString()) {
        const [h, m] = (dto.gioHen || '00:00').split(':');
        const appointmentTime = new Date();
        appointmentTime.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
        if (appointmentTime <= now) {
          throw new BadRequestException({
            code: 'GIO_KHAM_DA_QUA',
            message: 'Khung giờ khám đã qua so với thời điểm hiện tại. Vui lòng chọn khung giờ khám từ lúc này trở đi.',
          });
        }
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

        const targetPatient = await this.withLock(`bn_phone:${dto.soDienThoai}`, async () => {
          let found = await benhNhanRepo.findOne({ where: { soDienThoai: dto.soDienThoai } });
          if (!found) {
            const maBn = await this.generateNextMaBenhNhan();
            found = benhNhanRepo.create({
              maBenhNhan: maBn,
              hoTen: dto.hoTen,
              soDienThoai: dto.soDienThoai,
              email: dto.email || null,
              ngaySinh: dto.ngaySinh || null,
              gioiTinh: dto.gioiTinh || null,
            });
            found = await benhNhanRepo.save(found);
          }
          return found;
        });
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
      const targetBn = await this.withLock(`bn_phone:${dto.soDienThoai}`, async () => {
        const existingBn = await benhNhanRepo.findOne({ where: { soDienThoai: dto.soDienThoai } });
        if (existingBn) {
          return existingBn;
        }
        if (dto.hoTen) {
          const maBn = await this.generateNextMaBenhNhan();
          const newBn = benhNhanRepo.create({
            maBenhNhan: maBn,
            hoTen: dto.hoTen,
            soDienThoai: dto.soDienThoai,
            email: dto.email || null,
            ngaySinh: dto.ngaySinh || null,
            gioiTinh: dto.gioiTinh || null,
          });
          return await benhNhanRepo.save(newBn);
        }
        return null;
      });
      if (targetBn) {
        finalBenhNhanId = targetBn.id;
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

    const gioHenShort = (dto.gioHen || '').substring(0, 5);
    const isCaSang = (dto.gioHen || '') < '12:00';

    // Kiểm tra ca trực của Bác sĩ trước khi vào khóa Slot
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
    }

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
        const nvById = await this.dataSource.getRepository(NhanVien).findOne({ where: { id: nguoiDatId } });
        if (nvById) datBoiNhanVienId = nvById.id;
      }
    }

    const isNeedDeposit = nguoiDatVaiTro === 'benh_nhan' || nguonDat === 'bac_si_dat';
    let hanThanhToan: Date | null = null;
    if (isNeedDeposit) {
      hanThanhToan = new Date(now.getTime() + 15 * 60 * 1000);
    }

    // 3 & 4. KHÓA NGUYÊN TỬ THEO SLOT BÁC SĨ HOẶC BỆNH NHÂN (ATOMIC MUTEX LOCK)
    // Nếu 50 người cùng bấm đặt 1 bác sĩ tại cùng 1 mili-giây:
    // - Người đầu tiên vào lock sẽ lưu trạng thái CHO_THANH_TOAN (giữ chỗ 15p)
    // - 49 người tiếp theo sẽ đọc thấy bản ghi vừa lưu và nhận ngay HTTP 409 LICH_HEN_TRUNG_GIO
    const lockKey = dto.bacSiId
      ? `slot:${dto.bacSiId}:${dto.ngayHen}:${gioHenShort}`
      : `patient:${finalBenhNhanId}:${dto.ngayHen}`;

    const saved = await this.withLock(lockKey, async () => {
      // Kiểm tra trùng ca / giờ khám của chính bệnh nhân trong ngày
      const dsLichHenBenhNhan = await this.repo.find({
        where: {
          benhNhanId: finalBenhNhanId,
          ngayHen: dto.ngayHen,
        },
      });

      const lichHenActive = dsLichHenBenhNhan.filter(
        (lhItem) => ![TrangThaiLichHen.DA_HUY].includes(lhItem.trangThai)
      );

      for (const lhItem of lichHenActive) {
        const lhGioShort = (lhItem.gioHen || '').substring(0, 5);
        const lhIsCaSang = (lhItem.gioHen || '') < '12:00';
        const tenCaCu = lhIsCaSang ? 'Ca Sáng' : 'Ca Chiều';

        if (lhGioShort === gioHenShort) {
          throw new ConflictException({
            code: 'TRUNG_GIO_KHAM_TRONG_NGAY',
            message: `Bạn đã có lịch hẹn ${lhItem.maLichHen} vào khung giờ ${lhGioShort} ngày ${dto.ngayHen}. Vui lòng chọn khung giờ khác.`,
          });
        }

        if (lhIsCaSang === isCaSang) {
          throw new ConflictException({
            code: 'TRUNG_CA_KHAM_TRONG_NGAY',
            message: `Bạn đã có lịch hẹn ${lhItem.maLichHen} ở ${tenCaCu} (lúc ${lhGioShort}) ngày ${dto.ngayHen}. Theo quy định, bệnh nhân không được đặt trùng với ca đã đặt trong cùng một ngày. Vui lòng chọn ca khám khác hoặc ngày khác.`,
          });
        }
      }

      // Kiểm tra trùng slot của Bác sĩ (bao gồm cả CHO_THANH_TOAN đang giữ chỗ 15 phút)
      if (dto.bacSiId && dto.gioHen && dto.ngayHen) {
        const trung = await this.repo.findOne({
          where: {
            bacSiId: dto.bacSiId,
            ngayHen: dto.ngayHen,
            gioHen: dto.gioHen,
            trangThai: Not(In([TrangThaiLichHen.DA_HUY, TrangThaiLichHen.HOAN_THANH])),
          },
        });
        if (trung) {
          throw new ConflictException({
            code: 'LICH_HEN_TRUNG_GIO',
            message: `Bác sĩ đã có lịch hẹn vào khung giờ ${gioHenShort} ngày ${dto.ngayHen}. Vui lòng chọn khung giờ khác.`,
          });
        }
      }

      const maLichHen = await this.generateNextMaLichHen();
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
      const savedAppointment = await this.repo.save(lh);
      await this.repo.query(
        'UPDATE lich_hen SET ngay_hen = ? WHERE id = ?',
        [dto.ngayHen, savedAppointment.id],
      );
      return savedAppointment;
    });

    // Xóa ngay cache danh sách bác sĩ còn ca trống để giao diện cập nhật tức thì
    this.cache.invalidatePrefix('lich_hen:bac_si_ca_trong');

    // Kích hoạt gửi email thông báo đặt lịch cho bệnh nhân (Non-blocking)
    if (saved.trangThai === TrangThaiLichHen.CHO_THANH_TOAN) {
      this.guiEmailThongBaoLichHen(saved.id, 'cho_thanh_toan', dto.email).catch((e) =>
        console.warn('[LichHenMailer] Lỗi gửi email chờ thanh toán:', e?.message),
      );
    } else if (saved.trangThai === TrangThaiLichHen.DA_XAC_NHAN) {
      this.guiEmailThongBaoLichHen(saved.id, 'da_xac_nhan', dto.email).catch((e) =>
        console.warn('[LichHenMailer] Lỗi gửi email xác nhận đặt lịch:', e?.message),
      );
    }

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

    const alreadyConfirmed =
      appointment.trangThai === TrangThaiLichHen.DA_XAC_NHAN &&
      Boolean(appointment.ghiChu?.includes('[ĐÃ_THANH_TOÁN_THÀNH_CÔNG]'));

    if (appointment.trangThai === TrangThaiLichHen.DA_HUY) {
      // Nếu trước đó bị huỷ do hết giờ nhưng tiền đã vào thực tế: Hồi sinh lịch hẹn ngay
      appointment.ghiChu = `${(appointment.ghiChu || '').replace('[Đã hủy khi chưa thanh toán tạm ứng]', '').trim()} [ĐÃ_THANH_TOÁN_THẬT_TỰ_ĐỘNG_HỒI_SINH]`.trim();
    }

    appointment.trangThai = TrangThaiLichHen.DA_XAC_NHAN;
    if (!appointment.ghiChu?.includes('[ĐÃ_THANH_TOÁN_THÀNH_CÔNG]')) {
      appointment.ghiChu = `${appointment.ghiChu || ''} [ĐÃ_THANH_TOÁN_THÀNH_CÔNG]`.trim();
    }

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

    // Chỉ tự động gán phòng khám vật lý khi hình thức là Khám trực tiếp (Khám trực tuyến không có phòng vật lý)
    if (appointment.hinhThuc === 'truc_tuyen') {
      appointment.phongKhamId = null;
    } else if (!appointment.phongKhamId) {
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

    // Chuẩn ERP Y tế: Tự động sinh Phiếu thu Tạm ứng bên Thu ngân ngay khi xác nhận thanh toán
    await this.dongBoHoaDonTamUng(saved, true).catch((err) =>
      console.warn('[LichHenDeposit] Lỗi tạo hóa đơn tạm ứng:', err?.message)
    );

    // Gửi email vé khám bệnh điện tử (E-ticket) cho bệnh nhân (Chỉ gửi 1 lần khi chuyển sang Đã xác nhận)
    if (!alreadyConfirmed) {
      this.guiEmailThongBaoLichHen(saved.id, 'da_xac_nhan').catch((err) =>
        console.warn('[LichHenMailer] Lỗi gửi email xác nhận khám sau thanh toán:', err?.message),
      );
    }

    const fullAppointment = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });

    // Lấy thông tin phòng khám (Chỉ lấy cho Khám trực tiếp)
    const rooms: any[] = (saved.hinhThuc !== 'truc_tuyen' && saved.phongKhamId)
      ? await this.dataSource.query('SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ?', [saved.phongKhamId])
      : [];
    const phongKhamRow = rooms[0] ? {
      id: rooms[0].id,
      tenPhong: rooms[0].ten_phong,
      viTri: rooms[0].vi_tri,
      chuyenKhoa: rooms[0].chuyen_khoa,
    } : null;

    const soTienCoc = await this.getSoTienCocHienHanh(saved.hinhThuc, saved.maLichHen);

    return {
      data: {
        ...fullAppointment,
        soThuTu,
        phongKham: phongKhamRow,
        soTienCoc,
        soTienThanhToan: soTienCoc,
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
  async huyLichHenBoiBenhNhan(
    id: number,
    userId: number,
    refundDto?: {
      phuongThucNhan?: 'chuyen_khoan' | 'tien_mat';
      nganHang?: string;
      soTaiKhoan?: string;
      chuTaiKhoan?: string;
      lyDoHuy?: string;
    },
  ) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan'],
    });

    if (!lh) {
      throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    }

    const wasPaid = lh.trangThai !== TrangThaiLichHen.CHO_THANH_TOAN;

    if (wasPaid) {
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

      const isOnline = lh.hinhThuc === 'truc_tuyen';
      const soTienHoan = await this.getSoTienCocHienHanh(lh.hinhThuc);
      const soTienHoanText = `${soTienHoan.toLocaleString('vi-VN')}đ`;

      const phuongThucNhan = refundDto?.phuongThucNhan || 'chuyen_khoan';
      if (phuongThucNhan === 'chuyen_khoan' && (!refundDto?.nganHang?.trim() || !refundDto?.soTaiKhoan?.trim())) {
        throw new BadRequestException({
          code: 'THIEU_THONG_TIN_TAI_KHOAN_HOAN_TIEN',
          message: `Vui lòng cung cấp Ngân hàng và Số tài khoản nhận tiền để bộ phận Thu ngân chuyển hoàn 100% tiền (${soTienHoanText}).`,
        });
      }

      const bank = (refundDto?.nganHang || 'Ngân hàng').replace(/[|\[\]]/g, '').trim();
      const stk = (refundDto?.soTaiKhoan || '').replace(/[|\[\]]/g, '').trim();
      const chuTk = (refundDto?.chuTaiKhoan || lh.benhNhan?.hoTen || '').replace(/[|\[\]]/g, '').trim();
      const lyDoHuy = (refundDto?.lyDoHuy || 'Bệnh nhân chủ động hủy lịch trước 24 tiếng').replace(/[\[\]]/g, '').trim();

      const tkMarker =
        phuongThucNhan === 'tien_mat'
          ? `[TK_HOÀN_TIỀN: tien_mat|Nhận tiền mặt tại Quầy Thu Ngân||${chuTk}]`
          : `[TK_HOÀN_TIỀN: chuyen_khoan|${bank}|${stk}|${chuTk}]`;

      const moTaHoan =
        phuongThucNhan === 'tien_mat'
          ? `Nhận hoàn tiền ${soTienHoanText} trực tiếp tại Quầy Thu Ngân`
          : `Hoàn tiền ${soTienHoanText} qua CK: ${bank} - STK: ${stk} (${chuTk})`;

      lh.trangThai = TrangThaiLichHen.DA_HUY;
      lh.ghiChu = `${(lh.ghiChu || '').replace(/\[TK_HOÀN_TIỀN:[^\]]+\]/gi, '').trim()} [CHỜ HOÀN CỌC ${soTienHoanText}] ${tkMarker} [Hủy bởi Bệnh nhân trước >= 24h (${lyDoHuy}) - ${moTaHoan}]`.trim();
      lh.capNhatLuc = new Date();

      const saved = await this.repo.save(lh);
      this.cache.invalidatePrefix('lich_hen:bac_si_ca_trong');
      await this.yeuCauHoanCocHoaDonTamUng(saved, lyDoHuy, {
        phuongThucNhan,
        nganHang: bank,
        soTaiKhoan: stk,
        chuTaiKhoan: chuTk,
      }).catch(() => {});

      return {
        data: saved,
        message:
          phuongThucNhan === 'tien_mat'
            ? `Đã hủy lịch hẹn thành công! Yêu cầu nhận lại ${soTienHoanText} tại Quầy Thu Ngân đã được ghi nhận.`
            : `Đã hủy lịch hẹn thành công! Yêu cầu hoàn tiền ${soTienHoanText} về tài khoản ${bank} - ${stk} (${chuTk}) đã được chuyển sang bộ phận Thu ngân để giải ngân.`,
      };
    } else {
      lh.trangThai = TrangThaiLichHen.DA_HUY;
      lh.ghiChu = (lh.ghiChu || '') + ' [Đã hủy khi chưa thanh toán tạm ứng]';
      lh.capNhatLuc = new Date();
      const saved = await this.repo.save(lh);
      this.cache.invalidatePrefix('lich_hen:bac_si_ca_trong');
      return {
        data: saved,
        message: 'Đã hủy lịch hẹn chưa thanh toán.',
      };
    }
  }

  // ─── BỆNH NHÂN CẬP NHẬT THÔNG TIN TÀI KHOẢN NHẬN HOÀN CỌC (Khi Bác sĩ/BGĐ hủy ca hoặc đổi STK nhận hoàn) ───
  async capNhatThongTinHoanCoc(
    id: number,
    userId: number,
    dto: {
      phuongThucNhan?: 'chuyen_khoan' | 'tien_mat';
      nganHang?: string;
      soTaiKhoan?: string;
      chuTaiKhoan?: string;
    },
  ) {
    const lh = await this.repo.findOne({
      where: { id },
      relations: ['benhNhan'],
    });
    if (!lh) {
      throw new NotFoundException({ code: 'LICH_HEN_KHONG_TON_TAI', message: 'Không tìm thấy lịch hẹn' });
    }

    const phuongThucNhan = dto?.phuongThucNhan || 'chuyen_khoan';
    if (phuongThucNhan === 'chuyen_khoan' && (!dto?.nganHang?.trim() || !dto?.soTaiKhoan?.trim())) {
      throw new BadRequestException({
        code: 'THIEU_THONG_TIN_TAI_KHOAN_HOAN_TIEN',
        message: 'Vui lòng nhập đầy đủ Tên ngân hàng và Số tài khoản nhận hoàn tiền.',
      });
    }

    const bank = (dto?.nganHang || 'Ngân hàng').replace(/[|\[\]]/g, '').trim();
    const stk = (dto?.soTaiKhoan || '').replace(/[|\[\]]/g, '').trim();
    const chuTk = (dto?.chuTaiKhoan || lh.benhNhan?.hoTen || '').replace(/[|\[\]]/g, '').trim();

    const tkMarker =
      phuongThucNhan === 'tien_mat'
        ? `[TK_HOÀN_TIỀN: tien_mat|Nhận tiền mặt tại Quầy Thu Ngân||${chuTk}]`
        : `[TK_HOÀN_TIỀN: chuyen_khoan|${bank}|${stk}|${chuTk}]`;

    lh.ghiChu = `${(lh.ghiChu || '').replace(/\[TK_HOÀN_TIỀN:[^\]]+\]/gi, '').trim()} ${tkMarker}`.trim();
    lh.capNhatLuc = new Date();
    const saved = await this.repo.save(lh);

    await this.yeuCauHoanCocHoaDonTamUng(saved, 'Cập nhật thông tin tài khoản nhận hoàn cọc', {
      phuongThucNhan,
      nganHang: bank,
      soTaiKhoan: stk,
      chuTaiKhoan: chuTk,
    }).catch(() => {});

    const soTienHoan = await this.getSoTienCocHienHanh(saved.hinhThuc, saved.maLichHen);

    return {
      data: saved,
      message:
        phuongThucNhan === 'tien_mat'
          ? 'Đã cập nhật phương thức nhận hoàn cọc tiền mặt tại Quầy Thu Ngân.'
          : `Đã cập nhật tài khoản nhận hoàn cọc: ${bank} - ${stk} (${chuTk}). Bộ phận Thu ngân sẽ đối soát và chuyển hoàn ${soTienHoan.toLocaleString('vi-VN')}đ.`,
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

    // 2. Kiểm tra ngày hẹn mới hợp lệ theo cấu hình của Giám Đốc
    const ngayGioMoiStr = `${dto.ngayHen}T${dto.gioHen}:00`;
    const gioHenMoiFull = new Date(ngayGioMoiStr);
    if (Number.isNaN(gioHenMoiFull.getTime())) {
      throw new BadRequestException({ code: 'THOI_GIAN_KHONG_HOP_LE', message: 'Ngày hoặc giờ hẹn mới không hợp lệ.' });
    }

    const targetHinhThuc = lh.hinhThuc === 'truc_tuyen' ? 'truc_tuyen' : 'truc_tiep';
    const cocConfig = await this.dataSource.getRepository(CauHinhTienCoc).findOne({
      where: { loaiHinhThuc: targetHinhThuc },
    });
    const minDays = cocConfig?.choPhepDatTruocNgayMin !== undefined && cocConfig?.choPhepDatTruocNgayMin !== null
      ? Number(cocConfig.choPhepDatTruocNgayMin) : 0;
    const maxDays = cocConfig?.choPhepDatTruocNgayMax !== undefined && cocConfig?.choPhepDatTruocNgayMax !== null
      ? Number(cocConfig.choPhepDatTruocNgayMax) : 30;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + minDays);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxDays);
    maxDate.setHours(23, 59, 59, 999);

    const appointmentDate = new Date(dto.ngayHen + 'T00:00:00');

    if (appointmentDate < minDate || appointmentDate > maxDate) {
      const hinhThucLabel = targetHinhThuc === 'truc_tuyen' ? 'tư vấn trực tuyến' : 'khám trực tiếp';
      throw new BadRequestException({
        code: 'NGOAI_KHOANG_DAT_LICH',
        message: `Theo quy định, lịch hẹn ${hinhThucLabel} chỉ được phép đổi sang ngày trong khoảng từ ${minDays} đến ${maxDays} ngày tính từ ngày hiện tại.`,
      });
    }

    if (dto.ngayHen === getLocalDateString()) {
      const [h, m] = (dto.gioHen || '00:00').split(':');
      const appointmentTime = new Date();
      appointmentTime.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
      if (appointmentTime <= new Date()) {
        throw new BadRequestException({
          code: 'GIO_KHAM_DA_QUA',
          message: 'Khung giờ khám đã qua so với thời điểm hiện tại. Vui lòng chọn khung giờ khám từ lúc này trở đi.',
        });
      }
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
    }

    // 5. Khóa nguyên tử theo slot mới và cập nhật lịch hẹn
    const rescheduleLockKey = targetBacSiId
      ? `slot:${targetBacSiId}:${dto.ngayHen}:${gioHenShort}`
      : `patient:${lh.benhNhanId}:${dto.ngayHen}`;

    const saved = await this.withLock(rescheduleLockKey, async () => {
      if (targetBacSiId) {
        const trungSlot = await this.repo.findOne({
          where: {
            bacSiId: targetBacSiId,
            ngayHen: dto.ngayHen,
            gioHen: dto.gioHen,
            id: Not(lh.id),
            trangThai: Not(In([TrangThaiLichHen.DA_HUY, TrangThaiLichHen.HOAN_THANH])),
          },
        });

        if (trungSlot) {
          throw new ConflictException({
            code: 'LICH_HEN_TRUNG_GIO',
            message: `Bác sĩ đã có bệnh nhân khác đặt vào khung giờ ${gioHenShort} ngày ${dto.ngayHen}. Vui lòng chọn khung giờ khác.`,
          });
        }
      }

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

      const savedAppointment = await this.repo.save(lh);
      await this.repo.query(
        'UPDATE lich_hen SET ngay_hen = ? WHERE id = ?',
        [dto.ngayHen, savedAppointment.id],
      );
      return savedAppointment;
    });

    this.cache.invalidatePrefix('lich_hen:bac_si_ca_trong');

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
    if (updated && dto.trangThai === TrangThaiLichHen.DA_XAC_NHAN) {
      this.guiEmailThongBaoLichHen(id, 'da_xac_nhan').catch((e) =>
        console.warn('[LichHenMailer] Lỗi gửi email xác nhận lịch sau cập nhật:', e?.message),
      );
      if (!updated.bacSiId) {
        return this.tuDongPhanCong(id);
      }
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
      let email = bn?.email;
      if (!email && bn?.nguoiDungId) {
        const u = await this.dataSource.getRepository(NguoiDung).findOne({ where: { id: bn.nguoiDungId } });
        if (u?.tenDangNhap?.includes('@')) email = u.tenDangNhap;
      }
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
   * Tự động gửi email thông báo đặt lịch hẹn / vé khám bệnh điện tử cho bệnh nhân (Non-blocking)
   */
  async guiEmailThongBaoLichHen(
    lichHenId: number,
    loaiEmail: 'cho_thanh_toan' | 'da_xac_nhan',
    fallbackEmail?: string,
  ): Promise<void> {
    try {
      // Delay nhẹ 500ms để đảm bảo các tiến trình DB đồng bộ hoàn tất
      await new Promise((resolve) => setTimeout(resolve, 500));

      const lh = await this.repo.findOne({
        where: { id: lichHenId },
        relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
      });
      if (!lh) return;

      // 1. Phân giải email người nhận
      let email = fallbackEmail?.trim() || null;
      if (!email && lh.benhNhan?.email) {
        email = lh.benhNhan.email.trim();
      }
      if (!email && lh.benhNhan?.nguoiDungId) {
        const u = await this.dataSource.getRepository(NguoiDung).findOne({ where: { id: lh.benhNhan.nguoiDungId } });
        if (u?.tenDangNhap?.includes('@')) email = u.tenDangNhap.trim();
      }
      if (!email && lh.ghiChu) {
        const datBoiMatch = lh.ghiChu.match(/\[ĐẶT_BỞI_USER_(\d+)\]/i);
        if (datBoiMatch) {
          const datBoiUserId = Number(datBoiMatch[1]);
          const datBoiBn = await this.dataSource.getRepository(BenhNhan).findOne({ where: { nguoiDungId: datBoiUserId } });
          if (datBoiBn?.email) email = datBoiBn.email.trim();
          if (!email) {
            const u = await this.dataSource.getRepository(NguoiDung).findOne({ where: { id: datBoiUserId } });
            if (u?.tenDangNhap?.includes('@')) email = u.tenDangNhap.trim();
          }
        }
      }

      if (!email || !email.includes('@')) {
        console.log(`[LichHenMailer] Lịch hẹn ${lh.maLichHen} không tìm thấy email người nhận, bỏ qua gửi mail.`);
        return;
      }

      // 2. Thu thập thông tin chi tiết
      const tenBenhNhan = lh.benhNhan?.hoTen || 'Quý khách';
      const bacSiTen = lh.bacSi?.nhanVien?.hoTen ? `BS. ${lh.bacSi.nhanVien.hoTen}` : 'Bác sĩ chuyên khoa phụ trách';

      let chuyenKhoa = lh.bacSi?.chuyenKhoa || '';
      if (!chuyenKhoa && lh.lyDoKham) {
        const ckMatch = lh.lyDoKham.match(/\[Chuyên khoa:\s*([^\]]+)\]/i);
        if (ckMatch) chuyenKhoa = ckMatch[1].trim();
      }
      if (!chuyenKhoa) chuyenKhoa = 'Đa Khoa';

      const isOnline = lh.hinhThuc === 'truc_tuyen';
      const hinhThucText = isOnline
        ? 'Khám & Tư vấn trực tuyến từ xa (Telehealth 1-1)'
        : 'Khám lâm sàng trực tiếp tại phòng khám';

      // Phòng khám (Chỉ tra cứu phòng vật lý khi Khám trực tiếp)
      let phongKhamTen = isOnline
        ? 'Phòng gọi Video trực tuyến trên hệ thống (Mở trước 15 phút)'
        : 'Sảnh tiếp đón / Kiosk tiếp tân';
      if (!isOnline && lh.phongKhamId) {
        const rooms: any[] = await this.dataSource.query(
          'SELECT ten_phong, vi_tri FROM phong_kham WHERE id = ? LIMIT 1',
          [lh.phongKhamId],
        );
        if (rooms.length > 0) {
          phongKhamTen = rooms[0].ten_phong + (rooms[0].vi_tri ? ` (${rooms[0].vi_tri})` : '');
        }
      }

      // Số thứ tự
      let soThuTu = '';
      const sttMatch = lh.ghiChu?.match(/\[STT:\s*([^\]]+)\]/i);
      if (sttMatch) soThuTu = sttMatch[1];

      const soTienCoc = await this.getSoTienCocHienHanh(lh.hinhThuc, lh.maLichHen);
      const soTienCocStr = `${soTienCoc.toLocaleString('vi-VN')} đ`;
      const clientUrl = this.config.get<string>('CLIENT_URL', 'http://localhost:3000');
      const ngayHenFormatted = lh.ngayHen ? String(lh.ngayHen).slice(0, 10).split('-').reverse().join('/') : '';

      // 3. Soạn thảo Email theo từng loại
      let subject = '';
      let htmlBody = '';

      if (loaiEmail === 'cho_thanh_toan') {
        subject = `[Phòng Khám Đa Khoa] Tiếp nhận đặt lịch hẹn #${lh.maLichHen} - Hướng dẫn thanh toán ${isOnline ? 'phí tư vấn trực tuyến' : 'tạm ứng giữ chỗ'}`;
        const hanThanhToanStr = lh.hanThanhToan
          ? new Date(lh.hanThanhToan).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : '15 phút';
        const thanhToanUrl = `${clientUrl}/benh-nhan/lich-hen?maLichHen=${lh.maLichHen}`;

        htmlBody = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, ${isOnline ? '#4f46e5 0%, #3730a3 100%' : '#0284c7 0%, #0369a1 100%'}); color: #ffffff; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Phòng Khám Đa Khoa Quốc Tế</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${isOnline ? 'PHIẾU TIẾP NHẬN ĐẶT LỊCH TƯ VẤN TRỰC TUYẾN (TELEHEALTH)' : 'PHIẾU TIẾP NHẬN ĐẶT HẸN KHÁM BỆNH'}</p>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 0;">
                Kính gửi Quý khách: <strong style="color: #0f172a; font-size: 16px;">${tenBenhNhan}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                Hệ thống đã ghi nhận yêu cầu đặt lịch ${isOnline ? 'tư vấn khám trực tuyến từ xa (Telehealth)' : 'hẹn khám bệnh trực tiếp'} của Quý khách. Để hoàn tất việc giữ chỗ và xác nhận lịch với Bác sĩ chuyên khoa, Quý khách vui lòng hoàn tất thanh toán trong vòng <strong>15 phút</strong>.
              </p>

              <!-- Box cảnh báo hạn thanh toán -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; margin: 18px 0; color: #92400e;">
                <div style="font-size: 14px; font-weight: 700;">
                  ⏱️ THỜI HẠN GIỮ CHỖ THANH TOÁN: 15 PHÚT
                </div>
                <div style="font-size: 13px; margin-top: 4px; line-height: 1.4;">
                  Khoản thanh toán cần được hoàn tất trước <strong>${hanThanhToanStr}</strong>. Sau thời gian này, khung giờ hẹn sẽ tự động giải phóng để phục vụ bệnh nhân khác.
                </div>
              </div>

              <!-- Chi tiết lịch hẹn -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                  Thông tin lịch hẹn chi tiết
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 42%;">Mã lịch hẹn:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #0284c7; font-size: 15px;">#${lh.maLichHen}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Hình thức khám:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: ${isOnline ? '#4f46e5' : '#0369a1'};">${hinhThucText}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Chuyên khoa:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${chuyenKhoa}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Bác sĩ phụ trách:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${bacSiTen}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Ngày hẹn khám:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${ngayHenFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Khung giờ khám:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #047857; font-size: 15px;">${lh.gioHen}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">${isOnline ? 'Kênh kết nối:' : 'Địa điểm tiếp đón:'}</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${phongKhamTen}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0 0 0; color: #64748b; border-top: 1px solid #e2e8f0;">${isOnline ? 'Phí tư vấn trực tuyến:' : 'Tạm ứng giữ chỗ:'}</td>
                    <td style="padding: 8px 0 0 0; font-weight: 800; color: #e11d48; font-size: 16px; border-top: 1px solid #e2e8f0;">${soTienCocStr}</td>
                  </tr>
                </table>
              </div>

              <!-- Nút thanh toán -->
              <div style="text-align: center; margin: 26px 0 16px 0;">
                <a href="${thanhToanUrl}" style="background-color: ${isOnline ? '#4f46e5' : '#0284c7'}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);">
                  💳 HOÀN TẤT THANH TOÁN NGAY
                </a>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">(Hỗ trợ thanh toán nhanh bằng VietQR / Chuyển khoản ngân hàng 24/7)</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</p>
              <p style="margin: 0 0 4px 0;">Hotline tư vấn & hỗ trợ: <strong>1900 6868</strong> (24/7) | Email: cskh@phongkham.vn</p>
              <p style="margin: 0;">Địa chỉ: 123 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh</p>
            </div>
          </div>
        `;
      } else {
        // loaiEmail === 'da_xac_nhan'
        subject = isOnline
          ? `[Phòng Khám Đa Khoa] Xác nhận lịch Tư vấn trực tuyến (Telehealth) #${lh.maLichHen}`
          : `[Phòng Khám Đa Khoa] Vé khám bệnh điện tử & Xác nhận lịch hẹn #${lh.maLichHen}`;
        const qrData = encodeURIComponent(`${lh.maLichHen}|STT:${soThuTu || '0'}|DATE:${lh.ngayHen}|TIME:${lh.gioHen}`);
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}`;
        const telehealthUrl = `${clientUrl}/benh-nhan/lich-hen?maLichHen=${lh.maLichHen}`;

        htmlBody = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header E-Ticket -->
            <div style="background: linear-gradient(135deg, ${isOnline ? '#4f46e5 0%, #3730a3 100%' : '#0d9488 0%, #0f766e 100%'}); color: #ffffff; padding: 26px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Phòng Khám Đa Khoa Quốc Tế</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">${isOnline ? 'PHIẾU XÁC NHẬN TƯ VẤN TRỰC TUYẾN (TELEHEALTH)' : 'VÉ KHÁM BỆNH ĐIỆN TỬ (E-TICKET)'}</p>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 0;">
                Kính gửi Quý người bệnh: <strong style="color: #0f172a; font-size: 16px;">${tenBenhNhan}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                ${isOnline
                  ? 'Lịch hẹn <strong>Tư vấn & Khám trực tuyến từ xa (Telehealth 1-1)</strong> của Quý khách đã được <strong>thanh toán và xác nhận thành công</strong>. Dưới đây là thông tin chi tiết cuộc hẹn:'
                  : 'Lịch hẹn khám bệnh trực tiếp của Quý khách đã được <strong>xác nhận thành công</strong>. Dưới đây là thông tin vé khám và mã QR check-in tiếp đón ưu tiên tại phòng khám:'}
              </p>

              <!-- Card Vé Khám STT & QR Code -->
              <div style="background: linear-gradient(135deg, ${isOnline ? '#eef2ff 0%, #e0e7ff 100%' : '#f0fdfa 0%, #e6fffa 100%'}); border: 2px solid ${isOnline ? '#818cf8' : '#5eead4'}; border-radius: 14px; padding: 20px; margin: 20px 0; text-align: center;">
                <div style="font-size: 13px; font-weight: 700; color: ${isOnline ? '#3730a3' : '#0f766e'}; text-transform: uppercase; letter-spacing: 1px;">
                  ${isOnline ? 'SỐ THỨ TỰ CA TƯ VẤN TRỰC TUYẾN' : 'SỐ THỨ TỰ TIẾP ĐÓN (STT)'}
                </div>
                <div style="font-size: 36px; font-weight: 900; color: ${isOnline ? '#4f46e5' : '#0d9488'}; margin: 4px 0 10px 0;">
                  #${soThuTu || lh.maLichHen}
                </div>

                <!-- QR Code Box -->
                <div style="background-color: #ffffff; display: inline-block; padding: 12px; border-radius: 12px; border: 1px solid ${isOnline ? '#c7d2fe' : '#ccfbf1'}; box-shadow: 0 2px 6px rgba(0,0,0,0.04); margin-bottom: 8px;">
                  <img src="${qrImageUrl}" alt="QR Lịch Hẹn" width="150" height="150" style="display: block; margin: 0 auto; border-radius: 6px;" />
                </div>
                <div style="font-size: 12px; color: ${isOnline ? '#3730a3' : '#0f766e'}; font-weight: 600;">
                  🔖 Mã lịch hẹn: <strong>${lh.maLichHen}</strong>
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                  ${isOnline
                    ? '(Đến giờ hẹn, Bác sĩ phụ trách sẽ gọi Video Call trực tuyến cho Quý khách trên hệ thống)'
                    : '(Quét mã tại Kiosk hoặc đưa cho Lễ tân tại sảnh để nhận diện nhanh)'}
                </div>
              </div>

              <!-- Bảng thông tin chi tiết -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 42%;">Hình thức khám:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: ${isOnline ? '#4f46e5' : '#0d9488'};">${hinhThucText}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">${isOnline ? 'Kênh kết nối:' : 'Phòng khám:'}</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #1e293b;">${phongKhamTen}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Ngày khám:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #1e293b;">${ngayHenFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Giờ hẹn khám:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: ${isOnline ? '#4f46e5' : '#0d9488'}; font-size: 15px;">${lh.gioHen}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Chuyên khoa:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${chuyenKhoa}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Bác sĩ phụ trách:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${bacSiTen}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0 0 0; color: #64748b; border-top: 1px solid #e2e8f0;">${isOnline ? 'Phí tư vấn trực tuyến:' : 'Tạm ứng phí khám:'}</td>
                    <td style="padding: 8px 0 0 0; font-weight: 800; color: #059669; border-top: 1px solid #e2e8f0;">${soTienCocStr} (Đã thanh toán)</td>
                  </tr>
                </table>
              </div>

              ${isOnline ? `
                <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #3730a3;">
                    📹 PHÒNG TƯ VẤN VIDEO TRỰC TUYẾN (TELEHEALTH 1-1)
                  </p>
                  <p style="margin: 0 0 12px 0; font-size: 13px; color: #4338ca;">
                    Phòng gọi Video sẽ mở trước giờ hẹn 15 phút tại mục <strong>"Lịch Hẹn Của Tôi"</strong>:
                  </p>
                  <a href="${telehealthUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">
                    🌐 MỞ TRANG LỊCH HẸN & KẾT NỐI VIDEO CALL
                  </a>
                </div>

                <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #334155; margin: 18px 0;">
                  <strong>💡 Hướng dẫn dành cho bệnh nhân khám trực tuyến:</strong>
                  <ul style="margin: 6px 0 0 0; padding-left: 18px; line-height: 1.5;">
                    <li>Quý khách vui lòng chuẩn bị thiết bị (điện thoại hoặc máy tính có Camera, Micro) và kết nối mạng ổn định.</li>
                    <li>Đăng nhập vào hệ thống trước giờ hẹn <strong>10 - 15 phút</strong>; Bác sĩ phụ trách sẽ gọi Video Call trực tiếp tới Quý khách.</li>
                    <li>Nếu cần đổi hoặc hủy lịch, vui lòng thực hiện trước giờ hẹn ít nhất <strong>24 tiếng</strong> tại mục "Lịch Hẹn Của Tôi" để được hoàn 100% chi phí.</li>
                  </ul>
                </div>
              ` : `
                <!-- Lưu ý y khoa cho khám trực tiếp -->
                <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 12px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #854d0e; margin: 18px 0;">
                  <strong>⚠️ Hướng dẫn chuẩn bị trước khi đến khám:</strong>
                  <ul style="margin: 6px 0 0 0; padding-left: 18px; line-height: 1.5;">
                    <li>Quý khách vui lòng có mặt tại <strong>${phongKhamTen}</strong> trước giờ hẹn từ <strong>10 - 15 phút</strong> để đo sinh hiệu ban đầu.</li>
                    <li>Xuất trình mã QR trên vé này tại Kiosk hoặc Quầy tiếp tân để được đón tiếp nhanh.</li>
                    <li>Mang theo bản gốc CCCD/VNeID và thẻ BHYT (nếu có).</li>
                    <li>Nếu khám tổng quát hoặc có xét nghiệm máu/đường huyết, vui lòng <strong>nhịn ăn sáng từ 6 - 8 tiếng</strong>.</li>
                  </ul>
                </div>
              `}
            </div>

            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</p>
              <p style="margin: 0 0 4px 0;">Hotline tư vấn & tiếp đón: <strong>1900 6868</strong> (24/7) | Email: cskh@phongkham.vn</p>
              <p style="margin: 0;">Địa chỉ: 123 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh</p>
            </div>
          </div>
        `;
      }

      // 4. Gửi email qua Brevo API hoặc SMTP dự phòng
      await this.sendAppointmentEmail(email, subject, htmlBody);

      console.log(`[LichHenMailer] Đã gửi thành công email (${loaiEmail}) cho bệnh nhân ${tenBenhNhan} <${email}> - Mã LH: ${lh.maLichHen}`);
    } catch (err: any) {
      console.warn(`[LichHenMailer] Lỗi khi gửi email thông báo lịch hẹn ID ${lichHenId}:`, err?.message);
    }
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
