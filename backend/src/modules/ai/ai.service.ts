import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * AI Gateway Client (Core Monolith -> Standalone AI Microservice :5002)
 * Chuyển tiếp toàn bộ tác vụ Gemini LLM, Clinical RAG, Triage và ML Forecasting
 * sang microservice độc lập `ai-service`.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly AI_SERVICE_URL: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const baseUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:5002';
    this.AI_SERVICE_URL = `${baseUrl.replace(/\/+$/, '')}/api/ai`;
    this.logger.log(`🔗 AI Gateway connected to microservice: ${this.AI_SERVICE_URL}`);
  }

  private async forwardPost<T = any>(path: string, body: any, headers?: Record<string, string>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(`${this.AI_SERVICE_URL}/${path}`, body, { headers }),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(`[AI Gateway POST /${path}] ${err.message}`);
      if (err.response?.data) return err.response.data;
      throw new ServiceUnavailableException('Dịch vụ AI Microservice (cổng 5002) hiện đang bảo trì hoặc chưa khởi động.');
    }
  }

  private async forwardGet<T = any>(path: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.AI_SERVICE_URL}/${path}`, { params, headers }),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(`[AI Gateway GET /${path}] ${err.message}`);
      if (err.response?.data) return err.response.data;
      throw new ServiceUnavailableException('Dịch vụ AI Microservice (cổng 5002) hiện đang bảo trì hoặc chưa khởi động.');
    }
  }

  async patientChat(userId: number, sessionId: string, message: string) {
    try {
      return await this.forwardPost('patient-chat', { userId, sessionId, message }, { 'x-user-id': String(userId) });
    } catch (err: any) {
      this.logger.warn(`[AI Gateway fallback] Microservice 5002 không phản hồi: ${err.message}`);
      return {
        reply: `Chào bạn! Tôi là Bác Sĩ Gia Đình AI 24/7 của Phòng Khám Đa Khoa.\n\nTôi đã ghi nhận câu hỏi của bạn: "${message}".\n\nĐối với việc theo dõi sức khỏe và đơn thuốc hiện tại:\n- Bạn vui lòng xem kỹ danh sách và tích chọn cữ uống thuốc trong mục **"Lịch Uống Thuốc Hôm Nay"** ở cột bên trái.\n- Luôn uống thuốc sau bữa ăn 15-30 phút (trừ các thuốc bảo vệ niêm mạc dạ dày cần uống trước ăn) và uống đủ 1.5 - 2 lít nước mỗi ngày.\n- Nếu bạn đang có lịch hẹn tái khám với Bác sĩ, hãy bấm nút **"Đặt lịch tái khám với Bác sĩ"** để chọn khung giờ phù hợp nhất.\n\n*(Ghi chú kỹ thuật: Để kích hoạt động cơ trí tuệ nhân tạo Gemini phân tích sâu toàn diện, hãy bật microservice: \`npm --prefix ai-service run start\`)*`,
      };
    }
  }

  async getPatientSummary(userId: number) {
    try {
      return await this.forwardGet('patient-summary', { userId }, { 'x-user-id': String(userId) });
    } catch (err: any) {
      this.logger.warn(`[AI Gateway fallback] Không thể lấy summary từ 5002: ${err.message}`);
      return null;
    }
  }

  resetPatientSession(sessionId: string) {
    return this.forwardPost('patient-reset-session', { sessionId });
  }

  triageChat(sessionId: string, message: string, history?: Array<{ role: string; text?: string; content?: string }>) {
    return this.forwardPost('triage-chat', { sessionId, message, history });
  }

  phanLuongNhanh(trieuChung: string) {
    return this.forwardPost('phan-luong-nhanh', { trieuChung });
  }

  resetSession(sessionId: string) {
    return this.forwardPost('reset-session', { sessionId });
  }

  getDynamicQueueRouting(benhAnKhamId: number) {
    return this.forwardGet(`dynamic-queue/${benhAnKhamId}`);
  }

  getForecastLuongBenhNhan() {
    return this.forwardGet('du-bao-luong-benh-nhan');
  }

  getForecastNangCao(horizon = 7) {
    return this.forwardGet('du-bao-nang-cao', { horizon });
  }

  forecastMedicine(body: { horizon_days?: number; items?: any[] }) {
    return this.forwardPost('forecast-medicine', body);
  }

  getHealth() {
    return this.forwardGet('health');
  }

  goiYChuyenKhoa(trieuChung: string) {
    return this.forwardPost('goi-y-chuyen-khoa', { trieuChung });
  }

  clinicalProtocolRag(body: any) {
    return this.forwardPost('clinical-protocol-rag', body);
  }

  analyzeLabVision(body: any) {
    return this.forwardPost('analyze-lab-vision', body);
  }

  checkDrugInteractions(body: any) {
    return this.forwardPost('check-drug-interactions', body);
  }

  async getVietnameseTts(text: string): Promise<Buffer> {
    const clean = (text || '')
      .replace(/[*#_`]/g, '')
      .replace(/[-•]\s+/g, ', ')
      .replace(/\n+/g, '. ')
      .trim();
    const queryText = clean.slice(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(queryText)}`;
    const res = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        responseType: 'arraybuffer',
      }),
    );
    return Buffer.from(res.data);
  }
}
