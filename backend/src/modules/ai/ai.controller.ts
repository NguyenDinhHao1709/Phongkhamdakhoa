import {
  Controller, Post, Get, Body, Query, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TriageChatDto {
  @ApiProperty({ example: 'session_uuid_xyz', description: 'Session ID (UUID frontend tạo)' })
  @IsString() sessionId: string;

  @ApiProperty({ example: 'Tôi bị ho nhiều và sốt từ sáng', description: 'Triệu chứng người dùng nhập' })
  @IsString() message: string;

  @ApiPropertyOptional({ description: 'Lịch sử hội thoại gần nhất (role: user/model/bot, text)' })
  @IsOptional() history?: Array<{ role: string; text?: string; content?: string }>;
}

class PatientChatDto {
  @ApiProperty({ example: 'patient_session_uuid_xyz', description: 'Session ID của phiên chat bệnh nhân' })
  @IsString() sessionId: string;

  @ApiProperty({ example: 'Giải thích giúp tôi kết quả khám gần nhất', description: 'Câu hỏi của bệnh nhân' })
  @IsString() message: string;
}

class PhanLuongNhanhDto {
  @ApiProperty({ example: 'Tức ngực, khó thở, hồi hộp' })
  @IsString() trieuChung: string;
}

@ApiTags('🤖 AI Assistant & Triage')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── 0. TRỢ LÝ AI BỆNH NHÂN (CONTEXT-AWARE RAG) ───────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('patient-chat')
  @ApiOperation({ summary: 'Chat Bác Sĩ Gia Đình AI (RAG ngữ cảnh bệnh án cá nhân)' })
  patientChat(@Body() dto: PatientChatDto, @CurrentUser() user: any) {
    return this.aiService.patientChat(user.id, dto.sessionId, dto.message);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('patient-summary')
  @ApiOperation({ summary: 'Lấy tóm tắt hồ sơ y tế bệnh nhân cho header AI' })
  getPatientSummary(@CurrentUser() user: any) {
    return this.aiService.getPatientSummary(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('patient-reset-session')
  @ApiOperation({ summary: 'Làm mới phiên chat với Bác Sĩ Gia Đình AI' })
  resetPatientSession(@Body() dto: { sessionId: string }) {
    return this.aiService.resetPatientSession(dto.sessionId);
  }

  // ─── 1. CHAT MULTI-TURN (Trang chủ + Tiếp tân) ─────────────────
  @Public()
  @Post('triage-chat')
  @ApiOperation({ summary: 'Chat AI Triage multi-turn (Gemini NLP — hỗ trợ cả tiếng Việt)' })
  triageChat(@Body() dto: TriageChatDto) {
    return this.aiService.triageChat(dto.sessionId, dto.message, dto.history);
  }

  // ─── 2. PHÂN LUỒNG NHANH (Single-turn — dùng cho tiếp tân check-in) ──
  @Public()
  @Post('phan-luong-nhanh')
  @ApiOperation({ summary: 'Phân luồng chuyên khoa nhanh (Single-turn, dùng cho nhân viên Tiếp tân)' })
  phanLuongNhanh(@Body() dto: PhanLuongNhanhDto) {
    return this.aiService.phanLuongNhanh(dto.trieuChung);
  }

  // ─── 3. RESET SESSION ────────────────────────────────────────────
  @Public()
  @Post('reset-session')
  @ApiOperation({ summary: 'Xóa lịch sử chat và bắt đầu phiên mới' })
  resetSession(@Body() dto: { sessionId: string }) {
    return this.aiService.resetSession(dto.sessionId);
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

  // ─── 6. LEGACY ──────────────────────────────────────────────────
  @Public()
  @Post('goi-y-chuyen-khoa')
  @ApiOperation({ summary: '[Legacy] Khai báo triệu chứng & Nhận gợi ý chuyên khoa (Public)' })
  goiYChuyenKhoa(@Body() body: { trieuChung: string }) {
    return this.aiService.goiYChuyenKhoa(body.trieuChung);
  }
}
