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
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
  namespace: '/',
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('QueueGateway');

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

        // Kiểm tra khung thời gian mở phòng: trước giờ hẹn 15 phút đến sau giờ hẹn 90 phút
        const apptDate = appointment.ngayHen ? String(appointment.ngayHen).substring(0, 10) : '';
        let apptTime = String(appointment.gioHen || '').trim();
        if (apptTime.length === 5) apptTime += ':00';
        if (apptDate && apptTime) {
          const apptDateTime = new Date(`${apptDate}T${apptTime}`);
          if (!isNaN(apptDateTime.getTime())) {
            const openTime = new Date(apptDateTime.getTime() - 15 * 60 * 1000);
            const closeTime = new Date(apptDateTime.getTime() + 60 * 60 * 1000);
            const now = new Date();
            if (now < openTime) {
              const diffMin = Math.ceil((openTime.getTime() - now.getTime()) / 60000);
              const openTimeStr = openTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
      }
    } catch (err: any) {
      this.logger.error(`Lỗi kiểm tra lịch hẹn khi join call: ${err?.message}`);
    }

    const room = `call:${payload.roomId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} (${payload.role} - ${payload.userName}) joined call room ${room}`);
    client.to(room).emit('call:peer_joined', { peerId: client.id, role: payload.role, userName: payload.userName });
  }

  @SubscribeMessage('call:signal')
  handleCallSignal(client: Socket, payload: { roomId: string; targetPeerId?: string; signal: any; role?: string }) {
    const room = `call:${payload.roomId}`;
    // Kiểm tra client đã được duyệt vào room hay chưa
    if (!client.rooms.has(room)) {
      client.emit('call:error', { code: 'UNAUTHORIZED_ROOM', message: 'Bạn chưa được cấp quyền vào phòng gọi này.' });
      return;
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

