import {
  Controller, Post, Get, Body, Query, Param, ParseIntPipe, UseGuards, BadRequestException, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsArray, IsIn, IsInt, ArrayMaxSize, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_MESSAGE_LENGTH = 1000;
// Khóa phiên do server đặt: bệnh nhân theo tài khoản (nhớ qua mọi thiết bị, không đụng được phiên người khác), khách theo sessionId
const patientSessionKey = (userId: number) => `patient_${userId}`;
const guestSessionKey = (sessionId: string) => `guest_${sessionId}`;
class TriageChatDto {
  @ApiProperty({ example: 'session_uuid_xyz', description: 'Session ID (UUID frontend tạo)' })
  @IsString() @MaxLength(100) sessionId: string;

  @ApiProperty({ example: 'Tôi bị ho nhiều và sốt từ sáng', description: 'Triệu chứng người dùng nhập' })
  @IsString() @MaxLength(MAX_MESSAGE_LENGTH) message: string;

  @ApiPropertyOptional({ description: 'Lịch sử hội thoại gần nhất (role: user/model/bot, text)' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) history?: Array<{ role: string; text?: string; content?: string }>;
}

class PatientChatDto {
  @ApiPropertyOptional({ example: 'patient_session_uuid_xyz', description: 'Session ID (tùy chọn, mặc định dùng userId)' })
  @IsOptional() @IsString() @MaxLength(100) sessionId?: string;

  @ApiProperty({ example: 'Giải thích giúp tôi kết quả khám gần nhất', description: 'Câu hỏi của bệnh nhân' })
  @IsString() @MaxLength(MAX_MESSAGE_LENGTH) message: string;
}

class ChatFeedbackDto {
  @IsOptional() @IsString() @MaxLength(100) sessionId?: string;
  @IsInt() messageId: number;
  @IsIn([1, -1]) danhGia: number;
}

class ChatEventDto {
  @IsString() @MaxLength(100) sessionId: string;
}

class PhanLuongNhanhDto {
  @ApiProperty({ example: 'Tức ngực, khó thở, hồi hộp' })
  @IsString() @MaxLength(MAX_MESSAGE_LENGTH) trieuChung: string;
}

@ApiTags('🤖 AI Assistant & Triage')
@Controller('ai')
@UseGuards(JwtAuthGuard) // mặc định phải đăng nhập; route cho khách đánh dấu @Public()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── 0. TRỢ LÝ AI BỆNH NHÂN (CONTEXT-AWARE RAG) ───────────────────
  @ApiBearerAuth()
  @Post('patient-chat')
  @ApiOperation({ summary: 'Chat Bác Sĩ Gia Đình AI (RAG ngữ cảnh bệnh án cá nhân)' })
  patientChat(@Body() dto: PatientChatDto, @CurrentUser() user: any) {
    return this.aiService.patientChat(user.id, patientSessionKey(user.id), dto.message);
  }

  @ApiBearerAuth()
  @Get('patient-summary')
  @ApiOperation({ summary: 'Lấy tóm tắt hồ sơ y tế bệnh nhân cho header AI' })
  getPatientSummary(@CurrentUser() user: any) {
    return this.aiService.getPatientSummary(user.id);
  }

  @ApiBearerAuth()
  @Post('patient-reset-session')
  @ApiOperation({ summary: 'Làm mới phiên chat với Bác Sĩ Gia Đình AI' })
  resetPatientSession(@CurrentUser() user: any) {
    return this.aiService.resetPatientSession(patientSessionKey(user.id));
  }

  @ApiBearerAuth()
  @Get('patient-history')
  @ApiOperation({ summary: 'Tin nhắn của phiên chat hiện tại (để hiển thị lại khi bệnh nhân quay lại)' })
  getPatientHistory(@CurrentUser() user: any) {
    return this.aiService.getChatHistory(patientSessionKey(user.id));
  }

  @ApiBearerAuth()
  @Post('patient-feedback')
  @ApiOperation({ summary: 'Bệnh nhân đánh giá 👍/👎 một câu trả lời của AI' })
  patientFeedback(@Body() dto: ChatFeedbackDto, @CurrentUser() user: any) {
    return this.aiService.chatFeedback(patientSessionKey(user.id), dto.messageId, dto.danhGia);
  }

  @ApiBearerAuth()
  @Post('patient-chat-event')
  @ApiOperation({ summary: 'Ghi nhận bệnh nhân bấm đặt lịch từ chat' })
  patientChatEvent(@CurrentUser() user: any) {
    return this.aiService.chatEvent(patientSessionKey(user.id), 'benh_nhan', user.id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Get('chat-stats')
  @ApiOperation({ summary: 'Thống kê vận hành chat AI (lượng dùng, nguồn trả lời, độ trễ, đánh giá, tỉ lệ bấm đặt lịch)' })
  chatStats(@Query('days') days?: string) {
    return this.aiService.chatStats(Number(days) || 30);
  }

  @Public()
  @Post('chat-feedback')
  @ApiOperation({ summary: 'Khách đánh giá 👍/👎 một câu trả lời của AI ở trang chủ' })
  chatFeedback(@Body() dto: ChatFeedbackDto) {
    return this.aiService.chatFeedback(guestSessionKey(dto.sessionId || ''), dto.messageId, dto.danhGia);
  }

  @Public()
  @Post('chat-event')
  @ApiOperation({ summary: 'Ghi nhận khách bấm đặt lịch từ chat trang chủ' })
  chatEvent(@Body() dto: ChatEventDto) {
    return this.aiService.chatEvent(guestSessionKey(dto.sessionId), 'trang_chu');
  }

  @Public()
  @Get('tts')
  @ApiOperation({ summary: 'Chuyển văn bản thành giọng đọc tiếng Việt chuẩn (MP3 audio stream)' })
  async streamTts(@Query('text') text: string, @Res() res: Response) {
    if (!text) {
      res.status(400).send('Vui lòng cung cấp văn bản cần đọc');
      return;
    }
    try {
      const audioBuffer = await this.aiService.getVietnameseTts(text);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(audioBuffer);
    } catch {
      res.status(500).send('Không thể phát âm thanh');
    }
  }

  // ─── 1. CHAT MULTI-TURN (Trang chủ + Tiếp tân) ─────────────────
  @Public()
  @Post('triage-chat')
  @ApiOperation({ summary: 'Chat AI Triage multi-turn (Gemini NLP — hỗ trợ cả tiếng Việt)' })
  triageChat(@Body() dto: TriageChatDto) {
    return this.aiService.triageChat(guestSessionKey(dto.sessionId), dto.message, dto.history);
  }

  // ─── 2. PHÂN LUỒNG NHANH (Single-turn — dùng cho tiếp tân check-in) ──
  @Public()
  @Post(['phan-luong-nhanh', 'triage'])
  @ApiOperation({ summary: 'Phân luồng chuyên khoa nhanh (Single-turn, dùng cho nhân viên Tiếp tân)' })
  phanLuongNhanh(@Body() dto: PhanLuongNhanhDto) {
    if (!dto || !dto.trieuChung || !dto.trieuChung.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mô tả triệu chứng cụ thể');
    }
    return this.aiService.phanLuongNhanh(dto.trieuChung);
  }

  // ─── 3. RESET SESSION ────────────────────────────────────────────
  @Public()
  @Post('reset-session')
  @ApiOperation({ summary: 'Xóa lịch sử chat và bắt đầu phiên mới' })
  resetSession(@Body() dto: { sessionId: string }) {
    return this.aiService.resetSession(guestSessionKey(dto.sessionId));
  }

  // ─── 4. DYNAMIC QUEUE ROUTING ────────────────────────────────────
  @Get('dynamic-queue/:benhAnKhamId')
  @ApiOperation({ summary: 'Gợi ý tuyến đường tối ưu tại các phòng CLS (Dynamic Queue Routing)' })
  getDynamicQueue(@Param('benhAnKhamId', ParseIntPipe) benhAnKhamId: number) {
    return this.aiService.getDynamicQueueRouting(benhAnKhamId);
  }

  // ─── 5. PATIENT VOLUME FORECASTING (Legacy — Moving Average) ─────
  @Get('du-bao-luong-benh-nhan')
  @ApiOperation({ summary: '[Legacy] Dự báo lưu lượng bệnh nhân 7 ngày tới (Moving Average)' })
  forecastLuong() {
    return this.aiService.getForecastLuongBenhNhan();
  }

  // ─── 6. FORECAST NÂNG CAO: Python ML + Gemini AI ─────────────────
  @Get('du-bao-nang-cao')
  @ApiOperation({ summary: 'Dự báo nâng cao: Python Holt-Winters ML + Gemini AI diễn giải (tự động fallback về Moving Average nếu Python offline)' })
  forecastNangCao(@Query('horizon') horizon?: string) {
    return this.aiService.getForecastNangCao(horizon ? parseInt(horizon, 10) : 7);
  }

  @Post('forecast')
  @ApiOperation({ summary: 'Dự báo lưu lượng bệnh nhân 7 ngày tới (POST kịch bản test)' })
  postForecast(@Body() body: { horizon?: number; history_days?: number }) {
    return this.aiService.getForecastNangCao(body?.horizon || 7);
  }

  @Post('forecast-medicine')
  @ApiOperation({ summary: 'Dự báo nhu cầu thuốc 14 ngày tới' })
  postForecastMedicine(@Body() body: { horizon_days?: number; items?: any[] }) {
    return this.aiService.forecastMedicine(body);
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái Microservice AI & Machine Learning' })
  getHealth() {
    return this.aiService.getHealth();
  }

  // ─── 7. LEGACY ──────────────────────────────────────────────────
  @Post('goi-y-chuyen-khoa')
  @ApiOperation({ summary: '[Legacy] Khai báo triệu chứng & Nhận gợi ý chuyên khoa (Public)' })
  goiYChuyenKhoa(@Body() body: { trieuChung: string }) {
    return this.aiService.goiYChuyenKhoa(body.trieuChung);
  }

  // ─── 8. CLINICAL AI 3.1: RAG PHÁC ĐỒ BỘ Y TẾ ───────────────────
  @Post('clinical-protocol-rag')
  @ApiOperation({ summary: 'RAG truy xuất Phác đồ Chẩn đoán & Điều trị chuẩn Bộ Y tế' })
  clinicalProtocolRag(@Body() body: any) {
    return this.aiService.clinicalProtocolRag(body);
  }

  // ─── 9. CLINICAL AI 3.2: COMPUTER VISION & ĐỌC KẾT QUẢ CLS ──────
  @Post('analyze-lab-vision')
  @ApiOperation({ summary: 'AI Computer Vision & Phân tích đa chỉ số Cận lâm sàng' })
  analyzeLabVision(@Body() body: any) {
    return this.aiService.analyzeLabVision(body);
  }

  // ─── 10. CLINICAL AI 3.3: KIỂM TRA TƯƠNG TÁC THUỐC & DỊ ỨNG ─────
  @Post('check-drug-interactions')
  @ApiOperation({ summary: 'Kiểm tra tương tác thuốc, dị ứng chéo và chức năng Gan/Thận thời gian thực' })
  checkDrugInteractions(@Body() body: any) {
    return this.aiService.checkDrugInteractions(body);
  }
}
