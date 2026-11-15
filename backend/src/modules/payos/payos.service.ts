import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { LichHenService } from '../lich-hen/lich-hen.service';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { CauHinhTienCoc } from '../quan-ly/entities/cau-hinh-tien-coc.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { ThanhToanService, MA_TAM_UNG_QUAY } from '../thanh-toan/thanh-toan.service';
import { ThongBaoService } from '../thong-bao/thong-bao.service';

/**
 * orderCode của QR viện phí = HD_ORDER_BASE + hoaDonId * HD_ORDER_STEP + (ms hiện tại % HD_ORDER_STEP).
 * Cọc lịch hẹn dùng Date.now() (~1.7e12) nên không bao giờ chạm mốc 8e15 → webhook phân biệt được 2 loại đơn,
 * và đọc ngược ra hoaDonId mà không cần cột mới. Vẫn < Number.MAX_SAFE_INTEGER khi hoaDonId < 1 tỷ.
 */
const HD_ORDER_BASE = 8_000_000_000_000_000;
const HD_ORDER_STEP = 1_000_000;
const laDonHoaDon = (orderCode: number) => orderCode >= HD_ORDER_BASE;
const hoaDonIdTuOrder = (orderCode: number) => Math.floor((orderCode - HD_ORDER_BASE) / HD_ORDER_STEP);
const MARKER_HD = /\[PAYOS_HD:(\d+)\]/;

@Injectable()
export class PayosService implements OnModuleInit {
  private readonly logger = new Logger(PayosService.name);
  private payOS: PayOS;

  constructor(
    private readonly configService: ConfigService,
    private readonly lichHenService: LichHenService,
    @InjectRepository(LichHen)
    private readonly lichHenRepo: Repository<LichHen>,
    @InjectRepository(CauHinhTienCoc)
    private readonly tienCocRepo: Repository<CauHinhTienCoc>,
    @InjectRepository(HoaDon)
    private readonly hoaDonRepo: Repository<HoaDon>,
    private readonly thanhToanService: ThanhToanService,
    private readonly thongBaoService: ThongBaoService,
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');

    if (clientId && apiKey && checksumKey) {
      this.payOS = new PayOS({ clientId, apiKey, checksumKey });
      this.logger.log('PayOS SDK đã được khởi tạo thành công với tài khoản phòng khám.');
    } else {
      this.logger.warn('Chưa cấu hình đầy đủ thông tin PayOS trong file .env');
    }
  }

  onModuleInit() {
    // 1. Quét đối soát dòng tiền các lịch hẹn đang chờ thanh toán ngay khi khởi động
    this.doiSoatLichHenChoThanhToan().catch((err) =>
      this.logger.warn(`Lỗi đối soát PayOS ban đầu: ${err?.message}`)
    );

    // 2. Chạy Background Reconciliation Worker định kỳ mỗi 60 giây
    setInterval(() => {
      this.doiSoatLichHenChoThanhToan().catch(() => {});
      this.doiSoatHoaDonChoThanhToan().catch(() => {});
    }, 60 * 1000);
  }

  /**
   * Background Reconciliation Worker: Quét và đối chiếu toàn bộ lịch hẹn đang chờ thanh toán
   * Đảm bảo nếu tiền đã vào PayOS thì tự động xác nhận lịch ngay lập tức, không để mất tiền của khách
   */
  async doiSoatLichHenChoThanhToan() {
    if (!this.payOS) return;

    try {
      const pendingList = await this.lichHenRepo.find({
        where: { trangThai: TrangThaiLichHen.CHO_THANH_TOAN },
        order: { taoLuc: 'DESC' },
      });

      if (!pendingList || pendingList.length === 0) return;

      const now = new Date();

      for (const lh of pendingList) {
        const orderMatch = lh.ghiChu?.match(/\[PAYOS_ORDER:(\d+)\]/);
        if (!orderMatch) continue;
        const orderCode = Number(orderMatch[1]);

        try {
          const order = await this.payOS.paymentRequests.get(orderCode);
          if (order?.status === 'PAID') {
            this.logger.log(`[Reconciliation] Phát hiện lịch hẹn ${lh.maLichHen} (order: ${orderCode}) ĐÃ THANH TOÁN -> Tự động xác nhận ngay.`);
            await this.lichHenService.xacNhanSauThanhToan(lh.id);
          } else if (lh.hanThanhToan && new Date(lh.hanThanhToan) < now && (order?.status === 'CANCELLED' || order?.status === 'EXPIRED')) {
            // Chỉ huỷ lịch khi PayOS xác nhận rõ ràng là khách chưa thanh toán và đã quá hạn 15 phút
            lh.trangThai = TrangThaiLichHen.DA_HUY;
            lh.ghiChu = `${lh.ghiChu || ''} [Hết hạn thanh toán 15 phút - Đã đối soát PayOS chưa thanh toán]`.trim();
            await this.lichHenRepo.save(lh);
            this.logger.log(`[SafeCancel] Đã an toàn huỷ lịch ${lh.maLichHen} do PayOS xác nhận chưa thanh toán và hết hạn.`);
          }
        } catch {
          // Bỏ qua lỗi từng đơn để không gián đoạn tiến trình
        }
      }
    } catch (err: any) {
      this.logger.warn(`[Reconciliation] Lỗi tiến trình đối soát tự động: ${err?.message}`);
    }
  }

  /**
   * Tạo Payment Link (Mã VietQR động chuyển thẳng vào tài khoản ngân hàng phòng khám)
   */
  async taoLinkThanhToanLichHen(lichHenId: number) {
    if (!this.payOS) {
      throw new BadRequestException('Hệ thống thanh toán PayOS chưa được cấu hình.');
    }

    const lh = await this.lichHenRepo.findOne({
      where: { id: lichHenId },
      relations: ['benhNhan'],
    });

    if (!lh) {
      throw new NotFoundException('Không tìm thấy lịch hẹn cần thanh toán');
    }

    // Lấy số tiền cọc động từ cấu hình Ban Giám Đốc
    const cocConfig = await this.tienCocRepo.findOneBy({ loaiHinhThuc: lh.hinhThuc });
    const amount = cocConfig?.soTienCoc ? Number(cocConfig.soTienCoc) : (lh.hinhThuc === 'truc_tuyen' ? 200000 : 40000);
    
    // PayOS yêu cầu orderCode là số nguyên dương an toàn <= 9007199254740991
    // Sử dụng Date.now() là 13 chữ số, hoàn toàn duy nhất theo từng mili-giây
    let orderCode = Date.now();
    const clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:3000');
    // PayOS quy định description tối đa 25 ký tự không dấu
    const cleanMa = (lh.maLichHen || `LH${lh.id}`).replace(/[^a-zA-Z0-9]/g, '');
    const description = `Coc ${cleanMa}`.slice(0, 25);

    const paymentData = {
      orderCode,
      amount,
      description,
      items: [
        {
          name: lh.hinhThuc === 'truc_tuyen' ? 'Phi tu van truc tuyen' : 'Tam ung phi giu cho',
          quantity: 1,
          price: amount,
        },
      ],
      returnUrl: `${clientUrl}/benh-nhan/lich-hen?payment=success&maLichHen=${lh.maLichHen}`,
      cancelUrl: `${clientUrl}/benh-nhan/lich-hen?payment=cancelled&maLichHen=${lh.maLichHen}`,
    };

    try {
      let paymentLinkRes: any;
      let attempts = 0;
      while (attempts < 3) {
        try {
          paymentData.orderCode = orderCode;
          paymentLinkRes = await this.payOS.paymentRequests.create(paymentData);
          break;
        } catch (err: any) {
          const errMsg = err?.message || '';
          if (errMsg.includes('231') || err?.code === '231' || errMsg.includes('đã tồn tại')) {
            this.logger.warn(`PayOS orderCode ${orderCode} đã tồn tại, tự động đổi mã mới và thử lại...`);
            orderCode = Date.now() + Math.floor(Math.random() * 1000 + 1);
            attempts++;
            if (attempts >= 3) throw err;
          } else {
            throw err;
          }
        }
      }
      
      // Xoá marker cũ nếu có và lưu lại orderCode mới vào ghi chú để đối soát
      const cleanGhiChu = (lh.ghiChu || '').replace(/\[PAYOS_ORDER:\d+\]/g, '').trim();
      lh.ghiChu = `${cleanGhiChu} [PAYOS_ORDER:${orderCode}]`.trim();
      await this.lichHenRepo.save(lh);

      return {
        orderCode,
        amount,
        description,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        qrCode: paymentLinkRes.qrCode, // Chuỗi VietQR chuẩn EMVCo
        accountName: paymentLinkRes.accountName,
        accountNumber: paymentLinkRes.accountNumber,
        bin: paymentLinkRes.bin,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi tạo PayOS payment link cho lịch hẹn ${lh.maLichHen}:`, error?.message || error);
      throw new BadRequestException(error?.message || 'Không thể tạo link thanh toán PayOS');
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán từ PayOS
   */
  async kiemTraTrangThaiDonHang(orderCode: number) {
    if (!this.payOS) {
      throw new BadRequestException('Hệ thống thanh toán PayOS chưa được cấu hình.');
    }

    try {
      const order = await this.payOS.paymentRequests.get(orderCode);
      if (order?.status === 'PAID') {
        // Tìm lịch hẹn theo orderCode trong ghi chú
        const lh = await this.lichHenRepo.createQueryBuilder('lh')
          .where('lh.ghiChu LIKE :code', { code: `%[PAYOS_ORDER:${orderCode}]%` })
          .getOne();

        if (lh && lh.trangThai !== 'da_xac_nhan' && lh.trangThai !== 'hoan_thanh') {
          this.logger.log(`Thanh toán thành công qua PayOS cho lịch hẹn ${lh.maLichHen} (order: ${orderCode})`);
          await this.lichHenService.xacNhanSauThanhToan(lh.id);
        }
      }
      return order;
    } catch (error: any) {
      this.logger.error(`Lỗi kiểm tra order ${orderCode}:`, error?.message || error);
      throw new BadRequestException(error?.message || 'Không thể kiểm tra đơn hàng PayOS');
    }
  }

  /**
   * Webhook tự động nhận thông báo tiền đã vào tài khoản ngân hàng từ PayOS
   */
  async xuLyWebhook(webhookBody: any) {
    if (!this.payOS) {
      return { success: false, message: 'PayOS chưa được cấu hình' };
    }

    try {
      const verifiedData = await this.payOS.webhooks.verify(webhookBody);
      this.logger.log(`PayOS Webhook nhận thanh toán: OrderCode ${verifiedData?.orderCode}, Số tiền: ${verifiedData?.amount}`);

      if (verifiedData?.orderCode && laDonHoaDon(verifiedData.orderCode)) {
        await this.ghiNhanHoaDonDaChuyenKhoan(
          hoaDonIdTuOrder(verifiedData.orderCode),
          verifiedData.orderCode,
          Number(verifiedData.amount || 0),
          verifiedData.reference,
        );
      } else if (verifiedData?.orderCode) {
        const orderCode = verifiedData.orderCode;
        // Tìm lịch hẹn có chứa [PAYOS_ORDER:xxxx]
        const lh = await this.lichHenRepo.createQueryBuilder('lh')
          .where('lh.ghiChu LIKE :code', { code: `%[PAYOS_ORDER:${orderCode}]%` })
          .getOne();

        if (lh && lh.trangThai !== 'da_xac_nhan' && lh.trangThai !== 'hoan_thanh') {
          this.logger.log(`Tự động xác nhận lịch hẹn ${lh.maLichHen} sau khi nhận tiền thật từ PayOS.`);
          await this.lichHenService.xacNhanSauThanhToan(lh.id);
        }
      }

      return { success: true, data: verifiedData };
    } catch (error: any) {
      this.logger.error('Lỗi xác thực webhook PayOS:', error?.message || error);
      return { success: false, error: error?.message };
    }
  }

  /**
   * Kiểm tra và đồng bộ trạng thái thanh toán theo ID lịch hẹn
   * Giúp bệnh nhân chủ động bấm "Kiểm tra ngay" hoặc khi modal hết giờ
   */
  async kiemTraTheoLichHen(lichHenId: number) {
    const lh = await this.lichHenRepo.findOne({
      where: { id: lichHenId },
      relations: ['benhNhan', 'bacSi'],
    });

    if (!lh) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    // Nếu đã xác nhận rồi thì trả về ngay
    if (lh.trangThai === 'da_xac_nhan' || lh.trangThai === 'hoan_thanh') {
      return { isPaid: true, status: 'PAID', appointment: lh };
    }

    const orderMatch = lh.ghiChu?.match(/\[PAYOS_ORDER:(\d+)\]/);
    if (!orderMatch || !this.payOS) {
      return { isPaid: false, status: lh.trangThai, appointment: lh };
    }

    const orderCode = Number(orderMatch[1]);
    try {
      const order = await this.payOS.paymentRequests.get(orderCode);
      if (order?.status === 'PAID') {
        this.logger.log(`Xác nhận thanh toán thành công cho lịch hẹn ${lh.maLichHen} qua tra cứu ID.`);
        const confirmed = await this.lichHenService.xacNhanSauThanhToan(lh.id);
        return { isPaid: true, status: 'PAID', appointment: confirmed?.data || lh };
      }
      return { isPaid: false, status: order?.status || 'PENDING', appointment: lh };
    } catch (err: any) {
      return { isPaid: false, status: 'PENDING', error: err?.message, appointment: lh };
    }
  }

  // ===================== QR CHUYỂN KHOẢN VIỆN PHÍ (HÓA ĐƠN) =====================

  // Đơn lệch tiền đã báo thu ngân — tránh worker 60s báo lặp
  private readonly daBaoLechTien = new Set<number>();

  /**
   * Tạo mã VietQR PayOS cho hóa đơn viện phí đang chờ thanh toán.
   * Khi tiền vào, webhook / polling / worker đối soát sẽ tự xác nhận hóa đơn (không cần thu ngân bấm tay).
   */
  async taoLinkThanhToanHoaDon(hoaDonId: number) {
    if (!this.payOS) {
      throw new BadRequestException('Hệ thống thanh toán PayOS chưa được cấu hình.');
    }
    const hd = await this.hoaDonRepo.findOne({ where: { id: hoaDonId } });
    if (!hd) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (hd.trangThai === 'da_thanh_toan') return { daThanhToan: true };
    if (hd.trangThai !== 'cho_thanh_toan' || hd.maHoaDon?.startsWith(MA_TAM_UNG_QUAY)) {
      throw new BadRequestException('Hóa đơn này không thanh toán chuyển khoản trực tuyến được');
    }
    const amount = Math.round(Number(hd.thucThu || 0));
    if (amount <= 0) {
      throw new BadRequestException('Hóa đơn không còn số tiền phải thu, vui lòng liên hệ Quầy Thu ngân');
    }

    // Đơn cũ: nếu khách đã trả thì xác nhận luôn; nếu còn chờ thì hủy để khách không quét nhầm mã cũ (sai số tiền)
    const oldCode = Number(hd.ghiChu?.match(MARKER_HD)?.[1] || 0);
    if (oldCode) {
      try {
        const old = await this.payOS.paymentRequests.get(oldCode);
        if (old?.status === 'PAID') {
          const ok = await this.ghiNhanHoaDonDaChuyenKhoan(hd.id, oldCode, Number(old.amountPaid || 0));
          if (ok) return { daThanhToan: true };
        } else if (old?.status === 'PENDING') {
          await this.payOS.paymentRequests.cancel(oldCode, 'Tao ma QR moi').catch(() => {});
        }
      } catch {
        // đơn cũ không tra được → bỏ qua, tạo đơn mới
      }
    }

    const clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:3000');
    const description = `VP ${(hd.maHoaDon || `HD${hd.id}`).replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 25);
    let orderCode = HD_ORDER_BASE + hd.id * HD_ORDER_STEP + (Date.now() % HD_ORDER_STEP);
    let res: any;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await this.payOS.paymentRequests.create({
          orderCode,
          amount,
          description,
          items: [{ name: 'Vien phi kham chua benh', quantity: 1, price: amount }],
          returnUrl: `${clientUrl}/benh-nhan?payment=success`,
          cancelUrl: `${clientUrl}/benh-nhan?payment=cancelled`,
        });
        break;
      } catch (err: any) {
        const msg = err?.message || '';
        const trungMa = msg.includes('231') || err?.code === '231' || msg.includes('đã tồn tại');
        if (!trungMa || attempt >= 2) {
          this.logger.error(`Lỗi tạo PayOS link cho hóa đơn ${hd.maHoaDon}: ${msg}`);
          throw new BadRequestException(msg || 'Không thể tạo mã QR thanh toán PayOS');
        }
        orderCode = HD_ORDER_BASE + hd.id * HD_ORDER_STEP + ((Date.now() + Math.floor(Math.random() * 1000) + 1) % HD_ORDER_STEP);
      }
    }

    // Ghi marker bằng UPDATE trực tiếp để không đè các cột khác nếu hóa đơn vừa được tính lại
    const ghiChuMoi = `${(hd.ghiChu || '').replace(/\s*\[PAYOS_HD:\d+\]/g, '').trim()} [PAYOS_HD:${orderCode}]`.trim();
    await this.hoaDonRepo.update(hd.id, { ghiChu: ghiChuMoi });

    return {
      daThanhToan: false,
      orderCode,
      amount,
      description,
      checkoutUrl: res.checkoutUrl,
      qrCode: res.qrCode,
      accountName: res.accountName,
      accountNumber: res.accountNumber,
      bin: res.bin,
    };
  }

  /** Bệnh nhân/thu ngân kiểm tra hóa đơn đã nhận chuyển khoản chưa (đồng bộ ngay nếu PayOS báo PAID) */
  async kiemTraHoaDon(hoaDonId: number) {
    const hd = await this.hoaDonRepo.findOne({ where: { id: hoaDonId } });
    if (!hd) throw new NotFoundException('Không tìm thấy hóa đơn');
    if (hd.trangThai === 'da_thanh_toan') return { isPaid: true, status: 'PAID' };

    const orderCode = Number(hd.ghiChu?.match(MARKER_HD)?.[1] || 0);
    if (!orderCode || !this.payOS) return { isPaid: false, status: hd.trangThai };
    try {
      const order = await this.payOS.paymentRequests.get(orderCode);
      if (order?.status === 'PAID') {
        const ok = await this.ghiNhanHoaDonDaChuyenKhoan(hd.id, orderCode, Number(order.amountPaid || 0));
        return { isPaid: ok, status: ok ? 'PAID' : 'LECH_SO_TIEN' };
      }
      return { isPaid: false, status: order?.status || 'PENDING' };
    } catch (err: any) {
      return { isPaid: false, status: 'PENDING', error: err?.message };
    }
  }

  /** Worker 60s: lưới an toàn khi webhook PayOS không tới (server ngủ trên Render, lỗi mạng...) */
  async doiSoatHoaDonChoThanhToan() {
    if (!this.payOS) return;
    const pending = await this.hoaDonRepo
      .createQueryBuilder('hd')
      .where('hd.trangThai = :tt', { tt: 'cho_thanh_toan' })
      .andWhere('hd.ghiChu LIKE :mk', { mk: '%[PAYOS_HD:%' })
      .orderBy('hd.id', 'DESC')
      .take(50)
      .getMany();

    for (const hd of pending) {
      const orderCode = Number(hd.ghiChu?.match(MARKER_HD)?.[1] || 0);
      if (!orderCode) continue;
      try {
        const order = await this.payOS.paymentRequests.get(orderCode);
        if (order?.status === 'PAID') {
          this.logger.log(`[Reconciliation] Hóa đơn ${hd.maHoaDon} (order ${orderCode}) đã nhận chuyển khoản → tự xác nhận.`);
          await this.ghiNhanHoaDonDaChuyenKhoan(hd.id, orderCode, Number(order.amountPaid || 0));
        }
      } catch {
        // bỏ qua lỗi từng đơn
      }
    }
  }

  /**
   * Ghi nhận tiền chuyển khoản vào hóa đơn: đủ tiền → xác nhận thanh toán (như thu ngân bấm "Thu tiền", phương thức chuyển khoản).
   * Thiếu tiền (hóa đơn bị tính lại tăng sau khi tạo QR) → không tự xác nhận, báo thu ngân xử lý.
   * Trả về true nếu hóa đơn đã ở trạng thái đã thanh toán.
   */
  private async ghiNhanHoaDonDaChuyenKhoan(hoaDonId: number, orderCode: number, soTienNhan: number, maGiaoDich?: string) {
    const hd = await this.hoaDonRepo.findOne({ where: { id: hoaDonId }, relations: ['benhNhan'] });
    if (!hd) {
      this.logger.warn(`PayOS báo nhận tiền order ${orderCode} nhưng không có hóa đơn #${hoaDonId}`);
      return false;
    }
    if (hd.trangThai === 'da_thanh_toan') return true;

    const canThu = Math.round(Number(hd.thucThu || 0));
    if (soTienNhan < canThu) {
      if (!this.daBaoLechTien.has(orderCode)) {
        this.daBaoLechTien.add(orderCode);
        this.logger.warn(`Hóa đơn ${hd.maHoaDon}: nhận ${soTienNhan} đ qua PayOS nhưng cần thu ${canThu} đ → chờ thu ngân xử lý.`);
        await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
          tieuDe: `Chuyển khoản thiếu: ${hd.maHoaDon}`,
          noiDung: `Bệnh nhân ${hd.benhNhan?.hoTen || ''} đã chuyển khoản ${soTienNhan.toLocaleString('vi-VN')} đ (order ${orderCode}) nhưng hóa đơn cần thu ${canThu.toLocaleString('vi-VN')} đ. Vui lòng thu phần chênh lệch và xác nhận thủ công.`,
          loai: 'thanh_toan',
          doiTuongBang: 'hoa_don',
          doiTuongId: hd.id,
        }).catch(() => {});
      }
      return false;
    }

    try {
      await this.thanhToanService.xacNhanThanhToan(hd.id, 0, {
        phuongThucThanhToan: 'chuyen_khoan',
        ghiChu: `${hd.ghiChu || ''} [CK PayOS tự động: ${soTienNhan.toLocaleString('vi-VN')} đ${maGiaoDich ? `, mã GD ${maGiaoDich}` : ''}]`.trim(),
      });
    } catch (err: any) {
      // Webhook, polling và worker có thể chạy đồng thời — bên chậm hơn gặp "đã được thanh toán" là bình thường
      const lai = await this.hoaDonRepo.findOne({ where: { id: hd.id } });
      if (lai?.trangThai === 'da_thanh_toan') return true;
      this.logger.error(`Không tự xác nhận được hóa đơn ${hd.maHoaDon}: ${err?.message}`);
      return false;
    }

    this.logger.log(`Tự động xác nhận hóa đơn ${hd.maHoaDon} sau khi nhận ${soTienNhan} đ chuyển khoản PayOS.`);
    await this.thongBaoService.taoThongBaoTheoRole('thu_ngan', {
      tieuDe: `Đã nhận chuyển khoản: ${hd.maHoaDon}`,
      noiDung: `Bệnh nhân ${hd.benhNhan?.hoTen || ''} đã chuyển khoản ${soTienNhan.toLocaleString('vi-VN')} đ. Hóa đơn đã tự động chuyển sang Đã thanh toán.`,
      loai: 'thanh_toan',
      doiTuongBang: 'hoa_don',
      doiTuongId: hd.id,
    }).catch(() => {});
    return true;
  }
}
