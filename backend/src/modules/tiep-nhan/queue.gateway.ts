import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';

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
  private static readonly CALL_DURATION_MS = 60 * 60 * 1000;

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
  async handleJoinCall(client: Socket, payload: { roomId: string; role: string; userName: string }) {
    if (!payload?.roomId) {
      client.emit('call:error', { code: 'INVALID_ROOM', message: 'Mã phòng gọi không hợp lệ.' });
      return;
    }

    const roomKey = String(payload.roomId);
    let apptStartMs: number | undefined;

    // Bảo mật Telemedicine: Bắt buộc kiểm tra lịch hẹn & xác nhận đã thanh toán
    try {
      const isNumeric = /^\d+$/.test(String(payload.roomId));
      const appointment = await this.lichHenRepo.findOne({
        where: isNumeric
          ? [{ id: Number(payload.roomId) }, { maLichHen: String(payload.roomId) }]
          : { maLichHen: String(payload.roomId) },
      });

      if (appointment) {
        if (appointment.trangThai === TrangThaiLichHen.CHO_THANH_TOAN) {
          this.logger.warn(`Từ chối kết nối WebRTC: Lịch hẹn ${appointment.maLichHen} chưa thanh toán phí.`);
          client.emit('call:error', {
            code: 'UNPAID_TELEHEALTH_APPOINTMENT',
            message: 'Lịch hẹn trực tuyến chưa hoàn tất thanh toán phí khám. Vui lòng thanh toán trước khi vào phòng gọi!',
          });
          return;
        }

        if (appointment.trangThai === TrangThaiLichHen.DA_HUY) {
          this.logger.warn(`Từ chối kết nối WebRTC: Lịch hẹn ${appointment.maLichHen} đã bị hủy.`);
          client.emit('call:error', {
            code: 'CANCELLED_APPOINTMENT',
            message: 'Lịch hẹn này đã bị hủy, không thể tham gia phòng gọi trực tuyến.',
          });
          return;
        }

        if (appointment.trangThai === TrangThaiLichHen.HOAN_THANH) {
          this.logger.warn(`Từ chối kết nối WebRTC: Lịch hẹn ${appointment.maLichHen} đã hoàn thành.`);
          client.emit('call:error', {
            code: 'APPOINTMENT_COMPLETED',
            message: 'Ca tư vấn trực tuyến này đã hoàn tất, không thể vào lại phòng gọi.',
          });
          return;
        }

        // Kiểm tra khung thời gian mở phòng theo múi giờ Việt Nam (GMT+7): trước giờ hẹn 15 phút đến sau giờ hẹn 60 phút
        const isRoomAlreadyOpened = String(appointment.ghiChu || '').includes('Ca khám trực tuyến Telehealth đang mở phòng');
        const rawDate: unknown = appointment.ngayHen;
        const apptDate =
          rawDate instanceof Date
            ? rawDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
            : rawDate
              ? String(rawDate).substring(0, 10)
              : '';
        let apptTime = String(appointment.gioHen || '').trim().split('-')[0].trim();
        if (apptTime.length === 5) apptTime += ':00';
        else if (apptTime.length > 8) apptTime = apptTime.slice(0, 8);

        if (apptDate && apptTime) {
          const ms = new Date(`${apptDate}T${apptTime}+07:00`).getTime();
          if (!isNaN(ms)) apptStartMs = ms;
        }

        if (!isRoomAlreadyOpened && apptStartMs) {
          const openTime = new Date(apptStartMs - 15 * 60 * 1000);
          // Ca khám bắt đầu muộn vẫn được vào lại cho đến khi đủ 60 phút tính từ mốc bắt đầu thực tế
          const sessionStart = this.callStartedAt.get(roomKey);
          const closeTime = new Date(Math.max(
            apptStartMs + QueueGateway.CALL_DURATION_MS,
            sessionStart ? sessionStart + QueueGateway.CALL_DURATION_MS : 0,
          ));
          const now = new Date();
          if (now < openTime) {
            const diffMin = Math.ceil((openTime.getTime() - now.getTime()) / 60000);
            const openTimeStr = openTime.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh',
            });
            this.logger.warn(`Từ chối kết nối WebRTC: Chưa tới giờ mở phòng cho ${appointment.maLichHen}`);
            client.emit('call:error', {
              code: 'TOO_EARLY_TO_JOIN',
              message: `Phòng khám trực tuyến chỉ mở trước giờ khám 15 phút (lúc ${openTimeStr}). Còn khoảng ${diffMin} phút nữa.`,
            });
            return;
          }
          if (now > closeTime) {
            this.logger.warn(`Từ chối kết nối WebRTC: Quá giờ hẹn khám cho ${appointment.maLichHen}`);
            client.emit('call:error', {
              code: 'APPOINTMENT_EXPIRED',
              message: 'Ca khám trực tuyến đã quá khung giờ hẹn (đã kết thúc).',
            });
            return;
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Lỗi kiểm tra lịch hẹn khi join call: ${err?.message}`);
    }

    const room = `call:${payload.roomId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} (${payload.role} - ${payload.userName}) joined call room ${room}`);
    client.to(room).emit('call:peer_joined', { peerId: client.id, role: payload.role, userName: payload.userName });

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

  @SubscribeMessage('call:signal')
  handleCallSignal(client: Socket, payload: { roomId: string; targetPeerId?: string; signal: any; role?: string }) {
    if (!payload?.roomId) return;
    const room = `call:${payload.roomId}`;
    // Tự động đưa client vào lại room nếu vừa reconnect để không làm đứt luồng WebRTC
    if (!client.rooms.has(room)) {
      client.join(room);
    }
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
    client.to(room).emit('call:peer_left', { peerId: client.id });
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
    this.server.to(`user:${userId}`).emit('notification:new', data);
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

