import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { withColdStartRetry } from '../../common/utils/cold-start-retry.util';

const AI_SERVICE_TIMEOUT_MS = 90000;

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
    const configuredUrl = this.configService.get<string>('AI_SERVICE_URL');
    const defaultUrl = this.configService.get<string>('NODE_ENV') === 'production'
      ? 'https://phongkham-ai.onrender.com'
      : 'http://localhost:5002';
    const configuredIsLocal = configuredUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredUrl.trim());
    const baseUrl = configuredIsLocal && this.configService.get<string>('NODE_ENV') === 'production'
      ? defaultUrl
      : (configuredUrl || defaultUrl);
    const normalizedBaseUrl = baseUrl
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/api\/ai$/i, '')
      .replace(/\/api$/i, '');
    this.AI_SERVICE_URL = `${normalizedBaseUrl}/api/ai`;
    this.logger.log(`🔗 AI Gateway connected to microservice: ${this.AI_SERVICE_URL}`);
  }

  private async forward<T = any>(
    method: 'GET' | 'POST',
    path: string,
    options: { data?: any; params?: Record<string, any>; headers?: Record<string, string> } = {},
  ): Promise<T> {
    try {
      const response = await withColdStartRetry(
        () => firstValueFrom(
          this.httpService.request<T>({
            method,
            url: `${this.AI_SERVICE_URL}/${path}`,
            ...options,
            headers: { ...options.headers, 'x-internal-key': this.configService.get<string>('AI_INTERNAL_KEY') || '' },
            timeout: AI_SERVICE_TIMEOUT_MS,
          }),
        ),
        (err, attempt) => this.logger.warn(`[AI Gateway ${method} /${path}] ${err.message} — thử lại lần ${attempt}`),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(`[AI Gateway ${method} /${path}] ${err.message}`);
      const status = err.response?.status;
      const responseData = err.response?.data;
      const isHtmlError = typeof responseData === 'string' && /^\s*<!doctype html/i.test(responseData);
      if (responseData && !isHtmlError && (status || 500) < 500) {
        return responseData;
      }
      throw new ServiceUnavailableException('Dịch vụ AI Microservice (cổng 5002) hiện đang bảo trì hoặc chưa khởi động.');
    }
  }

  private forwardPost<T = any>(path: string, data: any, headers?: Record<string, string>): Promise<T> {
    return this.forward<T>('POST', path, { data, headers });
  }

  private forwardGet<T = any>(path: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<T> {
    return this.forward<T>('GET', path, { params, headers });
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
