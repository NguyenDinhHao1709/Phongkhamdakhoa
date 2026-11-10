import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OfficeService } from './office.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { uploadToCloudinary } from '../../common/utils/cloudinary-upload.util';
import { extname } from 'path';

@ApiTags('🏢 MediCare Digital Office (Gateway)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('office')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái Office Microservice (Port 5003)' })
  getHealth() {
    return this.officeService.forwardGet('health');
  }

  @Get('init')
  @ApiOperation({ summary: 'Khởi tạo không gian làm việc Office: Danh sách phòng chat, Danh bạ Khoa/Phòng, Nhãn dán' })
  getWorkspaceInit(@CurrentUser() user: any) {
    return this.officeService.forwardGet('init', { userId: user?.id }, user?.id);
  }

  @Get('rooms/:id/messages')
  @ApiOperation({ summary: 'Lấy tin nhắn, ghim, media và danh sách đã xem của phòng chat' })
  getRoomMessages(@Param('id', ParseIntPipe) roomId: number, @CurrentUser() user: any) {
    return this.officeService.forwardGet(`rooms/${roomId}/messages`, { userId: user?.id }, user?.id);
  }

  @Post('rooms/direct')
  @ApiOperation({ summary: 'Mở hoặc tạo cuộc trò chuyện 1-1 với đồng nghiệp' })
  openDirectRoom(@Body() body: { targetUserId: number }, @CurrentUser() user: any) {
    return this.officeService.forwardPost('rooms/direct', { ...body, userId: user?.id }, user?.id);
  }

  @Post('rooms/group')
  @ApiOperation({ summary: 'Tạo nhóm chat mới' })
  createGroupRoom(
    @Body() body: { tenPhong: string; moTa?: string; memberIds: number[] },
    @CurrentUser() user: any,
  ) {
    return this.officeService.forwardPost('rooms/group', { ...body, userId: user?.id }, user?.id);
  }

  @Post('rooms/:id/members')
  @ApiOperation({ summary: 'Thêm thành viên vào nhóm chat' })
  addMembers(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { memberIds: number[] },
    @CurrentUser() user: any,
  ) {
    return this.officeService.forwardPost(`rooms/${roomId}/members`, { ...body, userId: user?.id }, user?.id);
  }

  @Post('rooms/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn vào phòng chat' })
  sendMessage(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.officeService.forwardPost(`rooms/${roomId}/messages`, { ...body, userId: user?.id }, user?.id);
  }

  @Post('messages/:id/react')
  @ApiOperation({ summary: 'Thả cảm xúc vào tin nhắn' })
  toggleReaction(
    @Param('id', ParseIntPipe) messageId: number,
    @Body() body: { emoji: string },
    @CurrentUser() user: any,
  ) {
    return this.officeService.forwardPost(`messages/${messageId}/react`, { ...body, userId: user?.id }, user?.id);
  }

  @Patch('rooms/:id/pin')
  @ApiOperation({ summary: 'Ghim hoặc bỏ ghim tin nhắn' })
  togglePin(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() body: { messageId: number },
    @CurrentUser() user: any,
  ) {
    return this.officeService.forwardPatch(`rooms/${roomId}/pin`, { ...body, userId: user?.id }, user?.id);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Thu hồi tin nhắn hoặc xóa ở phía tôi' })
  recallMessage(
    @Param('id', ParseIntPipe) messageId: number,
    @Query('mode') mode?: string,
    @CurrentUser() user?: any,
  ) {
    const qs = mode ? `?mode=${encodeURIComponent(mode)}` : '';
    return this.officeService.forwardDelete(`messages/${messageId}${qs}`, user?.id);
  }

  @Post('rooms/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã xem phòng chat' })
  markRoomRead(@Param('id', ParseIntPipe) roomId: number, @CurrentUser() user: any) {
    return this.officeService.forwardPost(`rooms/${roomId}/read`, { userId: user?.id }, user?.id);
  }

  @Delete('rooms/:id/conversation')
  @ApiOperation({ summary: 'Xóa lịch sử cuộc trò chuyện ở phía tôi' })
  deleteConversation(@Param('id', ParseIntPipe) roomId: number, @CurrentUser() user: any) {
    return this.officeService.forwardDelete(`rooms/${roomId}/conversation`, user?.id);
  }

  @Post('rooms/:id/leave')
  @ApiOperation({ summary: 'Rời khỏi nhóm trò chuyện' })
  leaveGroup(@Param('id', ParseIntPipe) roomId: number, @CurrentUser() user: any) {
    return this.officeService.forwardPost(`rooms/${roomId}/leave`, { userId: user?.id }, user?.id);
  }

  @Get('patients-search')
  @ApiOperation({ summary: 'Tìm kiếm bệnh nhân để đính kèm thẻ bệnh nhân vào hội thoại' })
  searchPatients(@Query('q') q?: string, @CurrentUser() user?: any) {
    return this.officeService.forwardGet('patients-search', { q }, user?.id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Tải lên hình ảnh hoặc tệp đính kèm trong Office' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy tệp tải lên');
    }
    const fileName = Buffer.from(file.originalname || 'attachment', 'latin1').toString('utf8');
    return this.saveToCloudinary(file.buffer, fileName, file.mimetype);
  }

  @Post('upload-base64')
  @ApiOperation({ summary: 'Tải lên hình ảnh hoặc tệp đính kèm qua Base64 JSON' })
  uploadBase64(@Body() body: { fileName: string; mimeType?: string; base64Data: string }) {
    if (!body?.base64Data) {
      throw new BadRequestException('Thiếu dữ liệu tệp tải lên');
    }
    const buffer = Buffer.from(body.base64Data.replace(/^data:[^;]+;base64,/, ''), 'base64');
    return this.saveToCloudinary(buffer, body.fileName || 'attachment', body.mimeType || 'application/octet-stream');
  }

  // Lưu tệp Office lên Cloudinary (ổ đĩa Render bị xóa mỗi lần deploy lại)
  private async saveToCloudinary(buffer: Buffer, fileName: string, mimeType: string) {
    const isImage = /^image\//i.test(mimeType);
    const isVideo = /^video\//i.test(mimeType);
    if (!isVideo && buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Ảnh/tệp đính kèm tối đa 10MB');
    }
    // Tệp không phải ảnh/video lưu dạng raw, giữ đuôi file để tải về mở được
    const ext = extname(fileName).toLowerCase();
    const publicId = isImage || isVideo ? undefined : `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const url = await uploadToCloudinary(
      buffer,
      'phongkham/office',
      isImage ? 'image' : isVideo ? 'video' : 'raw',
      publicId,
    );
    return {
      url,
      fileName,
      fileSize: buffer.length,
      mimeType,
      loai: isImage ? 'hinh_anh' : 'tep_tin',
    };
  }
}
