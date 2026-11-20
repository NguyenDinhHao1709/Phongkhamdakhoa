import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { MO_PHONG_TRUOC_MS, mocGioHen, gioDongPhong } from '../../common/utils/tu-van-truc-tuyen.util';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/',
  maxHttpBufferSize: 8e6, // cho phép gửi ảnh/tệp (≤5MB, base64) trong chat cuộc gọi
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('QueueGateway');

  // Lịch sử chat trong cuộc gọi theo phòng (RAM) để thoát ra vào lại vẫn còn tin nhắn
  private callChatHistory = new Map<string, { messages: any[]; timer: NodeJS.Timeout }>();
  private static readonly CHAT_HISTORY_LIMIT = 100;
  private static readonly CHAT_HISTORY_TTL = 2 * 60 * 60 * 1000; // xóa sau 2 giờ không có tin mới

  // Mốc bắt đầu ca khám chung cho cả 2 bên (thoát ra vào lại không reset đồng hồ 60 phút)
  private callStartedAt = new Map<string, number>();

  // Vào sớm trước giờ hẹn thì không tính: mốc = muộn hơn giữa giờ hẹn và lúc người đầu tiên vào phòng
  private getCallStartedAt(roomId: string, apptStartMs?: number): number {
    if (!this.callStartedAt.has(roomId)) {
      this.callStartedAt.set(roomId, Math.max(Date.now(), apptStartMs || 0));
      setTimeout(() => this.callStartedAt.delete(roomId), QueueGateway.CHAT_HISTORY_TTL);
    }
    return this.callStartedAt.get(roomId)!;
  }

  private saveCallChat(roomId: string, message: any) {
    const entry = this.callChatHistory.get(roomId);
    if (entry) clearTimeout(entry.timer);
    const messages = [...(entry?.messages || []), message].slice(-QueueGateway.CHAT_HISTORY_LIMIT);
    const timer = setTimeout(() => this.callChatHistory.delete(roomId), QueueGateway.CHAT_HISTORY_TTL);
    this.callChatHistory.set(roomId, { messages, timer });
  }

  constructor(
    @InjectRepository(LichHen)
    private readonly lichHenRepo: Repository<LichHen>,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client kết nối: ${client.id}`);
    // Rớt mạng / đóng tab không kịp gửi call:leave → vẫn báo người còn lại trong phòng gọi.
    // Dùng 'disconnecting' vì lúc này client.rooms chưa bị xóa (khác handleDisconnect).
    client.on('disconnecting', () => {
      client.rooms.forEach((room) => {
        if (room.startsWith('call:')) {
          client.to(room).emit('call:peer_left', { peerId: client.id, reason: 'disconnect' });
        }
      });
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ngắt kết nối: ${client.id}`);
  }

  // Client đăng ký theo dõi phòng khám cụ thể
  @SubscribeMessage('join:phong')
  handleJoinPhong(client: Socket, phongKhamId: number) {
    client.join(`phong:${phongKhamId}`);
    client.emit('joined', { phongKhamId });
  }

  // Client đăng ký theo dõi thông báo cá nhân
  @SubscribeMessage('join:user')
  handleJoinUser(client: Socket, userId: number) {
    client.join(`user:${userId}`);
    client.emit('joined', { userId });
  }

  // ─── WebRTC Signaling cho Telehealth Video Call ────────────────────
  @SubscribeMessage('call:join')
  async handleJoinCall(client: Socket, payload: { roomId: string; role: string; userName: string; pcId?: string }) {
    const tuChoi = (code: string, message: string) => client.emit('call:error', { code, message });
    if (!payload?.roomId) return tuChoi('INVALID_ROOM', 'Mã phòng gọi không hợp lệ.');
    const roomKey = String(payload.roomId);

    // Phòng tư vấn chứa dữ liệu sức khỏe: chỉ bác sĩ phụ trách và bệnh nhân của lịch hẹn (đã đăng nhập) được vào
    let nguoiDungId: number;
    try {
      nguoiDungId = Number(this.jwt.verify(client.handshake?.auth?.token).sub);
    } catch {
      return tuChoi('CHUA_DANG_NHAP', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại để vào phòng tư vấn.');
    }

    let lh: any;
    try {
      [lh] = await this.lichHenRepo.query(
        `SELECT lh.id, lh.trang_thai AS trangThai, lh.ngay_hen AS ngayHen, lh.gio_hen AS gioHen,
                lh.gap_nhau_luc AS gapNhauLuc, lh.bac_si_vao_luc AS bacSiVaoLuc, lh.benh_nhan_vao_luc AS benhNhanVaoLuc,
                nv.nguoi_dung_id AS bacSiNguoiDungId, bn.nguoi_dung_id AS benhNhanNguoiDungId
         FROM lich_hen lh
         LEFT JOIN bac_si bs ON bs.id = lh.bac_si_id LEFT JOIN nhan_vien nv ON nv.id = bs.nhan_vien_id
         LEFT JOIN benh_nhan bn ON bn.id = lh.benh_nhan_id
         WHERE lh.hinh_thuc = 'truc_tuyen' AND (lh.ma_lich_hen = ? OR lh.id = ?) LIMIT 1`,
        [roomKey, /^\d+$/.test(roomKey) ? Number(roomKey) : -1],
      );
    } catch (err: any) {
      this.logger.error(`Lỗi kiểm tra lịch hẹn khi join call: ${err?.message}`);
      return tuChoi('LOI_HE_THONG', 'Không kiểm tra được lịch hẹn, vui lòng thử lại.');
    }
    if (!lh) return tuChoi('INVALID_ROOM', 'Không tìm thấy ca tư vấn trực tuyến.');

    const vaiTro = nguoiDungId === Number(lh.bacSiNguoiDungId) ? 'bac_si'
      : nguoiDungId === Number(lh.benhNhanNguoiDungId) ? 'benh_nhan' : null;
    if (!vaiTro) return tuChoi('KHONG_THUOC_CA', 'Bạn không phải bác sĩ phụ trách hoặc bệnh nhân của ca tư vấn này.');

    const loiTrangThai: Record<string, [string, string]> = {
      [TrangThaiLichHen.CHO_THANH_TOAN]: ['UNPAID_TELEHEALTH_APPOINTMENT', 'Lịch hẹn trực tuyến chưa hoàn tất thanh toán phí khám. Vui lòng thanh toán trước khi vào phòng gọi!'],
      [TrangThaiLichHen.DA_HUY]: ['CANCELLED_APPOINTMENT', 'Lịch hẹn này đã bị hủy, không thể tham gia phòng gọi trực tuyến.'],
      [TrangThaiLichHen.HOAN_THANH]: ['APPOINTMENT_COMPLETED', 'Ca tư vấn trực tuyến này đã hoàn tất, không thể vào lại phòng gọi.'],
    };
    if (![TrangThaiLichHen.DA_XAC_NHAN, TrangThaiLichHen.DANG_KHAM].includes(lh.trangThai)) {
      const [code, message] = loiTrangThai[lh.trangThai] || ['APPOINTMENT_UNAVAILABLE', 'Ca tư vấn không còn ở trạng thái được vào phòng.'];
      return tuChoi(code, message);
    }

    // Khung giờ: mở trước giờ hẹn 15 phút, đóng sau 60 phút tính từ giờ hẹn (hoặc từ lúc hai bên gặp nhau nếu muộn hơn)
    const apptStartMs = mocGioHen(lh.ngayHen, lh.gioHen);
    const now = Date.now();
    if (now < apptStartMs - MO_PHONG_TRUOC_MS) {
      const openTimeStr = new Date(apptStartMs - MO_PHONG_TRUOC_MS)
        .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
      const diffMin = Math.ceil((apptStartMs - MO_PHONG_TRUOC_MS - now) / 60000);
      return tuChoi('TOO_EARLY_TO_JOIN', `Phòng khám trực tuyến chỉ mở trước giờ khám 15 phút (lúc ${openTimeStr}). Còn khoảng ${diffMin} phút nữa.`);
    }
    if (now > gioDongPhong(apptStartMs, lh)) {
      return tuChoi('APPOINTMENT_EXPIRED', 'Ca khám trực tuyến đã quá khung giờ hẹn (đã kết thúc).');
    }

    const cotVaoLuc = vaiTro === 'bac_si' ? 'bac_si_vao_luc' : 'benh_nhan_vao_luc';
    await this.lichHenRepo.query(`UPDATE lich_hen SET ${cotVaoLuc} = COALESCE(${cotVaoLuc}, NOW()) WHERE id = ?`, [lh.id])
      .catch((err: any) => this.logger.warn(`Không ghi nhận được người vào phòng ${roomKey}: ${err?.message}`));

    client.data.vaiTroTuVan = vaiTro;
    const room = `call:${payload.roomId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} (${vaiTro} - ${payload.userName}) joined call room ${room}`);

    // Hai bên cùng có mặt lần đầu → ghi mốc gặp nhau (căn cứ cho phép hoàn tất ca)
    if (!lh.gapNhauLuc) {
      const sockets = await this.server.in(room).fetchSockets();
      const vaiTroTrongPhong = new Set(sockets.map((s) => s.data?.vaiTroTuVan));
      if (vaiTroTrongPhong.has('bac_si') && vaiTroTrongPhong.has('benh_nhan')) {
        await this.lichHenRepo.query(`UPDATE lich_hen SET gap_nhau_luc = NOW() WHERE id = ? AND gap_nhau_luc IS NULL`, [lh.id])
          .catch((err: any) => this.logger.warn(`Không ghi nhận được mốc gặp nhau ${roomKey}: ${err?.message}`));
      }
    }

    // pcId: mã kết nối WebRTC của người vừa vào — đổi mã nghĩa là họ vừa tải lại trang, bên kia phải dựng kết nối mới
    client.to(room).emit('call:peer_joined', {
      peerId: client.id,
      role: payload.role,
      userName: payload.userName,
      pcId: payload.pcId,
    });

    client.emit('call:session_info', { startedAt: this.getCallStartedAt(roomKey, apptStartMs), serverNow: Date.now() });

    const history = this.callChatHistory.get(roomKey)?.messages;
    if (history?.length) client.emit('call:chat_history', history);

    // Nếu trong phòng đã có người đợi sẵn, báo ngược lại ngay cho người vừa vào biết để bắt tay WebRTC tức thì
    const roomMembers = this.server?.sockets?.adapter?.rooms?.get(room);
    if (roomMembers && roomMembers.size > 1) {
      client.emit('call:peer_joined', {
        peerId: 'existing_peer',
        role: payload.role === 'doctor' ? 'patient' : 'doctor',
        userName: 'Đối phương',
      });
    }
  }

  private readonly jwt = new JwtService({ secret: process.env.JWT_SECRET });

  @SubscribeMessage('call:signal')
  handleCallSignal(client: Socket, payload: { roomId: string; targetPeerId?: string; signal: any; role?: string }) {
    if (!payload?.roomId) return;
    const room = `call:${payload.roomId}`;
    // Chỉ người đã qua kiểm tra call:join mới gửi tín hiệu / chat vào phòng (client tự gửi lại call:join khi kết nối lại)
    if (!client.rooms.has(room)) return;
    if (payload.signal?.type === 'chat_msg' && payload.signal.message) {
      this.saveCallChat(String(payload.roomId), payload.signal.message);
    }
    if (payload.targetPeerId) {
      this.server.to(payload.targetPeerId).emit('call:signal', { sender: client.id, signal: payload.signal, role: payload.role });
    } else {
      client.to(room).emit('call:signal', { sender: client.id, signal: payload.signal, role: payload.role });
    }
  }

  @SubscribeMessage('call:leave')
  handleLeaveCall(client: Socket, payload: { roomId: string }) {
    const room = `call:${payload.roomId}`;
    client.leave(room);
    client.to(room).emit('call:peer_left', { peerId: client.id, reason: 'leave' });
  }

  // ─── CÁC SỰ KIỆN PHÁT RA (gọi từ Service) ────────────────────

  /** Hàng đợi phòng khám thay đổi (tiếp nhận mới, điều phối, hoàn thành) */
  emitQueueUpdate(phongKhamId?: number, data?: any) {
    if (this.server) {
      if (phongKhamId) {
        this.server.to(`phong:${phongKhamId}`).emit('queue:update', data);
      }
      this.server.emit('queue:update', data);
    }
  }

  /** Kết quả xét nghiệm sẵn sàng → thông báo bác sĩ */
  emitXnReady(bacSiUserId: number, data: any) {
    this.server.to(`user:${bacSiUserId}`).emit('xn:result_ready', data);
  }

  /** Thông báo cá nhân */
  emitNotification(userId: number, data: any) {
    this.server?.to(`user:${userId}`).emit('notification:new', data);
  }

  /** Tin nhắn tư vấn real-time */
  emitTuVanMessage(tuVanId: number, data: any) {
    this.server.to(`tuvan:${tuVanId}`).emit('tuvan:message', data);
  }

  /** Phát sự kiện gọi số loa thông báo cho Màn hình TV sảnh chờ và toàn bộ client */
  emitQueueCall(data: any) {
    if (this.server) {
      this.server.emit('queue:call', data);
      this.server.emit('queue:update', data);
    }
  }
}

