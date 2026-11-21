import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OfficeService } from './office.service';
import { InternalTokenGuard } from './common/internal-auth';

@ApiTags('🏢 MediCare Digital Office Microservice (Port 5003)')
@UseGuards(InternalTokenGuard)
@Controller('office')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  /** userId chỉ lấy từ header x-user-id do backend gắn sau khi đã xác thực JWT (request đã qua InternalTokenGuard) */
  private resolveUserId(headerUid?: string): number {
    const uid = Number(headerUid);
    if (!Number.isInteger(uid) || uid <= 0) {
      throw new UnauthorizedException('Thiếu thông tin người dùng');
    }
    return uid;
  }

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái MediCare Digital Office Microservice (Port 5003)' })
  getHealth() {
    return {
      status: 'ok',
      service: 'MediCare Digital Office & Realtime Collaboration Microservice',
      port: Number(process.env.PORT || 5003),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('init')
  @ApiOperation({ summary: 'Khởi tạo không gian làm việc Office: Danh sách phòng chat, Danh bạ Khoa/Phòng, Nhãn dán' })
  getWorkspaceInit(@Headers('x-user-id') headerUid?: string) {
    return this.officeService.getWorkspaceInit(this.resolveUserId(headerUid));
  }

  @Get('rooms/:id/messages')
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn, ghim, media và người đã xem của phòng chat' })
  getRoomMessages(
    @Param('id', ParseIntPipe) roomId: number,
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.getRoomMessages(roomId, this.resolveUserId(headerUid));
  }

  @Post('rooms/direct')
  @ApiOperation({ summary: 'Mở hoặc tạo cuộc trò chuyện riêng 1-1 với nhân sự nội bộ' })
  openDirectRoom(
    @Body() body: { targetUserId: number },
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.openOrCreateDirectRoom(this.resolveUserId(headerUid), Number(body?.targetUserId));
  }

  @Post('rooms/group')
  @ApiOperation({ summary: 'Tạo nhóm chat mới theo Khoa/Phòng hoặc dự án' })
  createGroupRoom(
    @Body() body: { tenPhong: string; moTa?: string; memberIds: number[] },
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.createGroupRoom(this.resolveUserId(headerUid), body);
  }

  @Post('rooms/:id/members')
  @ApiOperation({ summary: 'Thêm thành viên vào nhóm chat' })
  addMembers(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { memberIds: number[] },
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.addMembersToRoom(roomId, this.resolveUserId(headerUid), body?.memberIds || []);
  }

  @Post('rooms/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn (văn bản, nhãn dán, ảnh, tệp)' })
  sendMessage(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: any,
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.sendMessage(roomId, this.resolveUserId(headerUid), body || {});
  }

  @Post('messages/:id/react')
  @ApiOperation({ summary: 'Thả cảm xúc (Reaction) vào tin nhắn' })
  toggleReaction(
    @Param('id', ParseIntPipe) messageId: number,
    @Body() body: { emoji: string },
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.toggleReaction(messageId, this.resolveUserId(headerUid), body?.emoji || '👍');
  }

  @Patch('rooms/:id/pin')
  @ApiOperation({ summary: 'Ghim hoặc bỏ ghim tin nhắn trong phòng chat' })
  togglePin(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { messageId: number },
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.togglePinMessage(roomId, this.resolveUserId(headerUid), Number(body?.messageId));
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Thu hồi tin nhắn hoặc xóa ở phía tôi' })
  recallMessage(
    @Param('id', ParseIntPipe) messageId: number,
    @Headers('x-user-id') headerUid?: string,
    @Query('mode') mode?: string,
  ) {
    return this.officeService.recallMessage(messageId, this.resolveUserId(headerUid), mode);
  }

  @Post('rooms/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã xem tin nhắn trong phòng' })
  markRoomRead(
    @Param('id', ParseIntPipe) roomId: number,
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.markRoomRead(roomId, this.resolveUserId(headerUid));
  }

  @Delete('rooms/:id/conversation')
  @ApiOperation({ summary: 'Xóa lịch sử cuộc trò chuyện ở phía người dùng hiện tại' })
  deleteConversation(
    @Param('id', ParseIntPipe) roomId: number,
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.deleteConversationForUser(roomId, this.resolveUserId(headerUid));
  }

  @Post('rooms/:id/leave')
  @ApiOperation({ summary: 'Rời khỏi nhóm trò chuyện' })
  leaveGroup(
    @Param('id', ParseIntPipe) roomId: number,
    @Headers('x-user-id') headerUid?: string,
  ) {
    return this.officeService.leaveGroupRoom(roomId, this.resolveUserId(headerUid));
  }
}
