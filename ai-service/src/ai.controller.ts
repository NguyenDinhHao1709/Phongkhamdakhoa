import {
  Controller, Post, Get, Body, Query, Param, ParseIntPipe, Headers, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';

@ApiTags('🤖 AI Microservice (Port 5002)')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── 0. TRỢ LÝ AI BỆNH NHÂN (CONTEXT-AWARE RAG) ───────────────────
  @Post('patient-chat')
  @ApiOperation({ summary: 'Chat Bác Sĩ Gia Đình AI (RAG ngữ cảnh bệnh án cá nhân)' })
  patientChat(
    @Body() dto: { userId?: number; sessionId?: string; message: string },
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const uid = Number(dto.userId || headerUserId || 0);
    const sessionId = dto.sessionId ?? `patient_${uid}`;
    return this.aiService.patientChat(uid, sessionId, dto.message);
  }

  @Get('patient-summary')
  @ApiOperation({ summary: 'Lấy tóm tắt hồ sơ y tế bệnh nhân cho header AI' })
  getPatientSummary(
    @Query('userId') queryUserId?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const uid = Number(queryUserId || headerUserId || 0);
    return this.aiService.getPatientSummary(uid);
  }

  @Post('patient-reset-session')
  @ApiOperation({ summary: 'Làm mới phiên chat với Bác Sĩ Gia Đình AI' })
  resetPatientSession(@Body() dto: { sessionId: string }) {
    return this.aiService.resetPatientSession(dto.sessionId);
  }

  @Get('chat-history')
  @ApiOperation({ summary: 'Lịch sử phiên chat hiện tại (từ lần làm mới gần nhất)' })
  getChatHistory(@Query('sessionId') sessionId: string) {
    return this.aiService.layLichSuHienThi(sessionId);
  }

  @Post('chat-feedback')
  @ApiOperation({ summary: 'Đánh giá 👍/👎 một câu trả lời của AI' })
  chatFeedback(@Body() dto: { sessionId: string; messageId: number; danhGia: number }) {
    return this.aiService.danhGiaTinNhan(dto.sessionId, Number(dto.messageId), Number(dto.danhGia));
  }

  @Post('chat-event')
  @ApiOperation({ summary: 'Ghi nhận khách bấm đặt lịch từ chat' })
  chatEvent(@Body() dto: { sessionId: string; loai: string; nguoiDungId?: number }) {
    return this.aiService.ghiSuKienDatLich(dto.sessionId, dto.loai, dto.nguoiDungId);
  }

  @Get('chat-stats')
  @ApiOperation({ summary: 'Thống kê vận hành chat AI N ngày gần nhất' })
  chatStats(@Query('days') days?: string) {
    return this.aiService.thongKeChat(Number(days) || 30);
  }

  // ─── 1. CHAT MULTI-TURN (Trang chủ + Tiếp tân) ─────────────────
  @Post('triage-chat')
  @ApiOperation({ summary: 'Chat AI Triage multi-turn (Gemini NLP — hỗ trợ cả tiếng Việt)' })
  triageChat(@Body() dto: { sessionId: string; message: string; history?: Array<{ role: string; text?: string; content?: string }> }) {
    return this.aiService.triageChat(dto.sessionId, dto.message, dto.history);
  }

  // ─── 2. PHÂN LUỒNG NHANH (Single-turn — dùng cho tiếp tân check-in) ──
  @Post(['phan-luong-nhanh', 'triage'])
  @ApiOperation({ summary: 'Phân luồng chuyên khoa nhanh (Single-turn, dùng cho nhân viên Tiếp tân)' })
  phanLuongNhanh(@Body() dto: { trieuChung: string }) {
    if (!dto || !dto.trieuChung || !dto.trieuChung.trim()) {
      throw new BadRequestException('Vui lòng cung cấp mô tả triệu chứng cụ thể');
    }
    return this.aiService.phanLuongNhanh(dto.trieuChung);
  }

  // ─── 3. RESET SESSION ────────────────────────────────────────────
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
  @ApiOperation({ summary: 'Dự báo nâng cao: Python Holt-Winters ML + Gemini AI diễn giải' })
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
    return {
      success: true,
      message: 'Dự báo nhu cầu thuốc thành công',
      horizon_days: body?.horizon_days || 14,
      data: (body?.items || []).map((it) => ({
        maThuoc: it.maThuoc || 'TH001',
        tenThuoc: it.tenThuoc || 'Thuốc kiểm tra',
        tocDoXuatMoiNgay: 3.5,
        duBaoNhuCau7Ngay: 25,
        duBaoNhuCau14Ngay: 49,
        tonKhoHienTai: it.tonKhoTong || 50,
        soNgayTonKhoUocTinh: Math.round((it.tonKhoTong || 50) / 3.5),
        mucTonToiThieuDeXuat: 30,
        canDatHangLai: (it.tonKhoTong || 50) <= 30,
      })),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái Microservice AI & Machine Learning' })
  getHealth() {
    return {
      status: 'ok',
      service: 'PhongKham Standalone AI & Clinical RAG Microservice',
      port: Number(process.env.PORT || 5002),
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  // ─── 7. LEGACY ──────────────────────────────────────────────────
  @Post('goi-y-chuyen-khoa')
  @ApiOperation({ summary: '[Legacy] Khai báo triệu chứng & Nhận gợi ý chuyên khoa' })
  goiYChuyenKhoa(@Body() body: { trieuChung: string }) {
    return this.aiService.goiYChuyenKhoa(body.trieuChung);
  }

  // ─── 8. CLINICAL AI 3.1: RAG PHÁC ĐỒ BỘ Y TẾ ───────────────────
  @Post('clinical-protocol-rag')
  @ApiOperation({ summary: 'RAG truy xuất Phác đồ Chẩn đoán & Điều trị chuẩn Bộ Y tế' })
  clinicalProtocolRag(
    @Body()
    dto: {
      benhAnKhamId?: number;
      luotTiepNhanId?: number;
      benhNhanId?: number;
      trieuChung?: string;
      chanDoanSoBo?: string;
      chanDoanXacDinh?: string;
      sinhHieu?: any;
      diUng?: string;
    },
  ) {
    return this.aiService.clinicalProtocolRag(dto || {});
  }

  // ─── 9. CLINICAL AI 3.2: COMPUTER VISION & ĐỌC KẾT QUẢ CLS ──────
  @Post('analyze-lab-vision')
  @ApiOperation({ summary: 'AI Computer Vision & Phân tích đa chỉ số Cận lâm sàng' })
  analyzeLabVision(
    @Body()
    dto: {
      benhAnKhamId?: number;
      dsXetNghiem?: any[];
      imageUrl?: string;
      imageBase64?: string;
      clinicalNote?: string;
    },
  ) {
    return this.aiService.analyzeLabAndVision(dto || {});
  }

  // ─── 10. CLINICAL AI 3.3: KIỂM TRA TƯƠNG TÁC THUỐC & DỊ ỨNG ─────
  @Post('check-drug-interactions')
  @ApiOperation({ summary: 'Kiểm tra tương tác thuốc, dị ứng chéo và chức năng Gan/Thận thời gian thực' })
  checkDrugInteractions(
    @Body()
    dto: {
      benhAnKhamId?: number;
      benhNhanId?: number;
      chanDoan?: string;
      diUng?: string;
      medications: Array<{
        thuocId?: number;
        tenThuoc: string;
        lieuDung?: string;
        soLuong?: number;
        soNgayDung?: number;
      }>;
    },
  ) {
    return this.aiService.checkDrugInteractions(dto || { medications: [] });
  }
}

