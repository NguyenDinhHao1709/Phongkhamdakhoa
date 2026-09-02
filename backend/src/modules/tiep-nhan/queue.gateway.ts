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

