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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { OfficeService } from './office.service';

const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads/office');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('🏢 MediCare Digital Office Microservice (Port 5003)')
@Controller('office')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  private resolveUserId(headerUid?: string, queryUid?: string, bodyUid?: number): number {
    return Number(headerUid || queryUid || bodyUid || 1);
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
  getWorkspaceInit(
    @Headers('x-user-id') headerUid?: string,
    @Query('userId') queryUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, queryUid);
    return this.officeService.getWorkspaceInit(uid);
  }

  @Get('rooms/:id/messages')
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn, ghim, media và người đã xem của phòng chat' })
  getRoomMessages(
    @Param('id', ParseIntPipe) roomId: number,
    @Headers('x-user-id') headerUid?: string,
    @Query('userId') queryUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, queryUid);
    return this.officeService.getRoomMessages(roomId, uid);
  }

  @Post('rooms/direct')
  @ApiOperation({ summary: 'Mở hoặc tạo cuộc trò chuyện riêng 1-1 với nhân sự nội bộ' })
  openDirectRoom(
    @Body() body: { userId?: number; targetUserId: number },
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.openOrCreateDirectRoom(uid, Number(body?.targetUserId));
  }

  @Post('rooms/group')
  @ApiOperation({ summary: 'Tạo nhóm chat mới theo Khoa/Phòng hoặc dự án' })
  createGroupRoom(
    @Body() body: { userId?: number; tenPhong: string; moTa?: string; memberIds: number[] },
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.createGroupRoom(uid, body);
  }

  @Post('rooms/:id/members')
  @ApiOperation({ summary: 'Thêm thành viên vào nhóm chat' })
  addMembers(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { userId?: number; memberIds: number[] },
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.addMembersToRoom(roomId, uid, body?.memberIds || []);
  }

  @Post('rooms/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn (văn bản, nhãn dán, ảnh, tệp, thẻ bệnh nhân)' })
  sendMessage(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: any,
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.sendMessage(roomId, uid, body);
  }

  @Post('messages/:id/react')
  @ApiOperation({ summary: 'Thả cảm xúc (Reaction) vào tin nhắn' })
  toggleReaction(
    @Param('id', ParseIntPipe) messageId: number,
    @Body() body: { userId?: number; emoji: string },
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.toggleReaction(messageId, uid, body?.emoji || '👍');
  }

  @Patch('rooms/:id/pin')
  @ApiOperation({ summary: 'Ghim hoặc bỏ ghim tin nhắn trong phòng chat' })
  togglePin(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { userId?: number; messageId: number },
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.togglePinMessage(roomId, uid, Number(body?.messageId));
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Thu hồi tin nhắn hoặc xóa ở phía tôi' })
  recallMessage(
    @Param('id', ParseIntPipe) messageId: number,
    @Headers('x-user-id') headerUid?: string,
    @Query('userId') queryUid?: string,
    @Query('mode') mode?: string,
  ) {
    const uid = this.resolveUserId(headerUid, queryUid);
    return this.officeService.recallMessage(messageId, uid, mode);
  }

  @Post('rooms/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã xem tin nhắn trong phòng' })
  markRoomRead(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { userId?: number },
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.markRoomRead(roomId, uid);
  }

  @Delete('rooms/:id/conversation')
  @ApiOperation({ summary: 'Xóa lịch sử cuộc trò chuyện ở phía người dùng hiện tại' })
  deleteConversation(
    @Param('id', ParseIntPipe) roomId: number,
    @Headers('x-user-id') headerUid?: string,
    @Query('userId') queryUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, queryUid);
    return this.officeService.deleteConversationForUser(roomId, uid);
  }

  @Post('rooms/:id/leave')
  @ApiOperation({ summary: 'Rời khỏi nhóm trò chuyện' })
  leaveGroup(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { userId?: number },
    @Headers('x-user-id') headerUid?: string,
  ) {
    const uid = this.resolveUserId(headerUid, undefined, body?.userId);
    return this.officeService.leaveGroupRoom(roomId, uid);
  }

  @Get('patients-search')
  @ApiOperation({ summary: 'Tìm kiếm nhanh bệnh nhân để gắn thẻ hồ sơ y tế vào cuộc trò chuyện' })
  searchPatients(@Query('q') q?: string) {
    return this.officeService.searchPatientsForCard(q);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname || '').toLowerCase();
          const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
          cb(null, safeName);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload ảnh hoặc tệp đính kèm trong Office' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không nhận được tệp tải lên');
    }
    const isImage = /^image\//i.test(file.mimetype || '');
    return {
      url: `/uploads/office/${file.filename}`,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileSize: file.size,
      mimeType: file.mimetype,
      loai: isImage ? 'hinh_anh' : 'tep_tin',
    };
  }

  @Post('upload-base64')
  @ApiOperation({ summary: 'Upload ảnh hoặc tệp qua Base64 JSON (hỗ trợ API Gateway)' })
  uploadBase64(
    @Body() body: { fileName: string; mimeType?: string; base64Data: string; fileSize?: number },
  ) {
    if (!body?.base64Data) {
      throw new BadRequestException('Thiếu dữ liệu tệp tải lên');
    }
    const rawBase64 = body.base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');
    const ext = path.extname(body.fileName || '').toLowerCase() || '.bin';
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const fullPath = path.join(uploadDir, safeName);
    fs.writeFileSync(fullPath, buffer);

    const isImage = /^image\//i.test(body.mimeType || '') || ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    return {
      url: `/uploads/office/${safeName}`,
      fileName: body.fileName || safeName,
      fileSize: body.fileSize || buffer.length,
      mimeType: body.mimeType || 'application/octet-stream',
      loai: isImage ? 'hinh_anh' : 'tep_tin',
    };
  }
}
