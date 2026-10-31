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

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
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

  handleConnection(client: Socket) {
    const uid = Number(client.handshake.query?.userId || client.handshake.auth?.userId || 0);
    if (uid > 0) {
      this.registerUserSocket(client, uid);
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

  private registerUserSocket(client: Socket, userId: number) {
    this.socketUserMap.set(client.id, userId);
    if (!this.userSocketsMap.has(userId)) {
      this.userSocketsMap.set(userId, new Set());
    }
    this.userSocketsMap.get(userId)!.add(client.id);
    client.join(`office_user_${userId}`);

    this.server.emit('office:presence', {
      userId,
      online: true,
      onlineUserIds: this.getOnlineUserIds(),
    });
  }

  getOnlineUserIds(): number[] {
    return Array.from(this.userSocketsMap.keys());
  }

  @SubscribeMessage('office:register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; roomIds?: number[] },
  ) {
    const uid = Number(data?.userId || 0);
    if (uid > 0) {
      this.registerUserSocket(client, uid);
    }
    if (Array.isArray(data?.roomIds)) {
      data.roomIds.forEach((rid) => {
        if (rid) client.join(`office_room_${rid}`);
      });
    }
    return { status: 'ok', onlineUserIds: this.getOnlineUserIds() };
  }

  @SubscribeMessage('office:join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number },
  ) {
    if (data?.roomId) {
      client.join(`office_room_${data.roomId}`);
    }
    return { status: 'joined', roomId: data?.roomId };
  }

  @SubscribeMessage('office:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: number; userId: number; hoTen: string; isTyping: boolean },
  ) {
    if (data?.roomId) {
      client.to(`office_room_${data.roomId}`).emit('office:typing', data);
    }
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

