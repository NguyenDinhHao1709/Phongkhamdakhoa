import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { corsOriginChecker, verifyBackendJwt } from './common/internal-auth';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: corsOriginChecker,
    credentials: true,
  },
})
export class OfficeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OfficeGateway.name);

  @WebSocketServer()
  server: Server;

  // socketId -> userId
  private socketUserMap = new Map<string, number>();
  // userId -> Set<socketId>
  private userSocketsMap = new Map<number, Set<string>>();

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Xác thực bằng JWT của backend (client gửi qua handshake.auth.token). userId lấy từ token, không tin client tự khai.
   * Kiểm tra thêm tài khoản còn hoạt động, token chưa bị thu hồi (phien_ban_token) và không phải tài khoản bệnh nhân.
   */
  async handleConnection(client: Socket) {
    try {
      const rawToken = String(
        client.handshake.auth?.token || client.handshake.headers?.authorization || '',
      );
      const payload = verifyBackendJwt(rawToken);
      if (!payload) {
        client.emit('office:auth_error', { message: 'Phiên đăng nhập không hợp lệ' });
        client.disconnect(true);
        return;
      }

      const [nd]: any[] = await this.dataSource.query(
        `SELECT u.trang_thai AS tt, u.phien_ban_token AS tv, u.loai_tai_khoan AS loaiTk, vt.ma_vai_tro AS maVaiTro
         FROM nguoi_dung u
         LEFT JOIN vai_tro vt ON vt.id = u.vai_tro_id
         WHERE u.id = ?
         LIMIT 1`,
        [payload.sub],
      );
      const isStaff = nd && (nd.loaiTk === 'noi_bo' || (nd.maVaiTro && nd.maVaiTro !== 'benh_nhan'));
      if (
        !nd ||
        nd.tt !== 'hoat_dong' ||
        Number(nd.tv || 0) !== Number(payload.tv ?? 0) ||
        !isStaff
      ) {
        client.emit('office:auth_error', { message: 'Tài khoản không có quyền truy cập Office' });
        client.disconnect(true);
        return;
      }

      if (!client.connected) return; // client đã ngắt trong lúc đang kiểm tra DB
      await this.registerUserSocket(client, payload.sub);
    } catch (err: any) {
      this.logger.error(`Lỗi xác thực socket Office: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const uid = this.socketUserMap.get(client.id);
    if (uid) {
      this.socketUserMap.delete(client.id);
      const set = this.userSocketsMap.get(uid);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) {
          this.userSocketsMap.delete(uid);
          this.server.emit('office:presence', {
            userId: uid,
            online: false,
            onlineUserIds: this.getOnlineUserIds(),
          });
        }
      }
    }
  }

  private async registerUserSocket(client: Socket, userId: number) {
    this.socketUserMap.set(client.id, userId);
    if (!this.userSocketsMap.has(userId)) {
      this.userSocketsMap.set(userId, new Set());
    }
    this.userSocketsMap.get(userId)!.add(client.id);
    client.join(`office_user_${userId}`);

    // Tự vào mọi phòng mà user đang là thành viên (server quyết định, không dựa vào danh sách client gửi lên)
    const rooms: any[] = await this.dataSource.query(
      `SELECT phong_chat_id AS roomId FROM office_thanh_vien WHERE nguoi_dung_id = ? AND da_roi_nhom = 0`,
      [userId],
    );
    rooms.forEach((r) => client.join(`office_room_${Number(r.roomId)}`));

    this.server.emit('office:presence', {
      userId,
      online: true,
      onlineUserIds: this.getOnlineUserIds(),
    });
  }

  getOnlineUserIds(): number[] {
    return Array.from(this.userSocketsMap.keys());
  }

  private async isActiveMember(roomId: number, userId: number): Promise<boolean> {
    const rows: any[] = await this.dataSource.query(
      `SELECT 1 FROM office_thanh_vien WHERE phong_chat_id = ? AND nguoi_dung_id = ? AND da_roi_nhom = 0 LIMIT 1`,
      [roomId, userId],
    );
    return rows.length > 0;
  }

  /** Giữ tương thích client cũ: chỉ trả về danh sách online, việc vào phòng đã làm lúc kết nối */
  @SubscribeMessage('office:register')
  handleRegister() {
    return { status: 'ok', onlineUserIds: this.getOnlineUserIds() };
  }

  @SubscribeMessage('office:join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    const uid = this.socketUserMap.get(client.id);
    const roomId = Number(data?.roomId);
    if (!uid || !roomId) return { status: 'denied' };
    if (!(await this.isActiveMember(roomId, uid))) {
      return { status: 'denied', roomId };
    }
    client.join(`office_room_${roomId}`);
    return { status: 'joined', roomId };
  }

  @SubscribeMessage('office:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; hoTen?: string; isTyping: boolean },
  ) {
    const uid = this.socketUserMap.get(client.id);
    const roomId = Number(data?.roomId);
    const room = `office_room_${roomId}`;
    if (!uid || !roomId || !client.rooms.has(room)) return;
    client.to(room).emit('office:typing', {
      roomId,
      userId: uid,
      hoTen: String(data?.hoTen || 'Đồng nghiệp').slice(0, 100),
      isTyping: Boolean(data?.isTyping),
    });
  }

  /** Đưa mọi socket đang mở của các user vào phòng realtime (sau khi tạo phòng / thêm thành viên) */
  joinUsersToRoom(userIds: number[], roomId: number) {
    if (!this.server) return;
    userIds.forEach((uid) => {
      this.server.in(`office_user_${uid}`).socketsJoin(`office_room_${roomId}`);
    });
  }

  /** Rút socket của user khỏi phòng realtime (sau khi rời nhóm) */
  removeUserFromRoom(userId: number, roomId: number) {
    if (!this.server) return;
    this.server.in(`office_user_${userId}`).socketsLeave(`office_room_${roomId}`);
  }

  broadcastToRoom(roomId: number, event: string, payload: any) {
    if (!this.server) return;
    this.server.to(`office_room_${roomId}`).emit(event, payload);
  }

  notifyUsers(userIds: number[], event: string, payload: any) {
    if (!this.server) return;
    userIds.forEach((uid) => {
      this.server.to(`office_user_${uid}`).emit(event, payload);
    });
  }
}
