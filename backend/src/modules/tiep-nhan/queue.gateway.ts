import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
  namespace: '/',
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('QueueGateway');

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
  handleJoinCall(client: Socket, payload: { roomId: string; role: string; userName: string }) {
    const room = `call:${payload.roomId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} (${payload.role} - ${payload.userName}) joined call room ${room}`);
    client.to(room).emit('call:peer_joined', { peerId: client.id, role: payload.role, userName: payload.userName });
  }

  @SubscribeMessage('call:signal')
  handleCallSignal(client: Socket, payload: { roomId: string; targetPeerId?: string; signal: any; role?: string }) {
    const room = `call:${payload.roomId}`;
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

  /** Hàng đợi phòng khám thay đổi (tiếp nhận mới, điều phối) */
  emitQueueUpdate(phongKhamId: number, data: any) {
    this.server.to(`phong:${phongKhamId}`).emit('queue:update', data);
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
}

