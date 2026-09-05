import {
  Controller, Post, Get, Body, Query, Param, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TriageChatDto {
  @ApiProperty({ example: 'session_uuid_xyz', description: 'Session ID (UUID frontend tạo)' })
  @IsString() sessionId: string;

  @ApiProperty({ example: 'Tôi bị ho nhiều và sốt từ sáng', description: 'Triệu chứng người dùng nhập' })
  @IsString() message: string;
}

class PhanLuongNhanhDto {
  @ApiProperty({ example: 'Tức ngực, khó thở, hồi hộp' })
  @IsString() trieuChung: string;
}

@ApiTags('🤖 AI Triage — Phân Luồng Bệnh Nhân Thông Minh')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── 1. CHAT MULTI-TURN (Trang chủ + Tiếp tân) ─────────────────
  @Public()
  @Post('triage-chat')
  @ApiOperation({ summary: 'Chat AI Triage multi-turn (Gemini NLP — hỗ trợ cả tiếng Việt)' })
  triageChat(@Body() dto: TriageChatDto) {
    return this.aiService.triageChat(dto.sessionId, dto.message);
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

  // ─── 5. PATIENT VOLUME FORECASTING ───────────────────────────────
  @Get('du-bao-luong-benh-nhan')
  @ApiOperation({ summary: 'Dự báo lưu lượng bệnh nhân 7 ngày tới (ML Forecasting)' })
  forecastLuong() {
    return this.aiService.getForecastLuongBenhNhan();
  }

  // ─── 6. LEGACY ──────────────────────────────────────────────────
  @Public()
  @Post('goi-y-chuyen-khoa')
  @ApiOperation({ summary: '[Legacy] Khai báo triệu chứng & Nhận gợi ý chuyên khoa (Public)' })
  goiYChuyenKhoa(@Body() body: { trieuChung: string }) {
    return this.aiService.goiYChuyenKhoa(body.trieuChung);
  }
}
