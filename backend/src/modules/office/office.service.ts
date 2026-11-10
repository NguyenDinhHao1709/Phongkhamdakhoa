import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const OFFICE_SERVICE_TIMEOUT_MS = 90000;
const OFFICE_SERVICE_MAX_RETRIES = 2;
const OFFICE_SERVICE_RETRY_DELAY_MS = 5000;

/**
 * Office Gateway Client (Core Monolith :5000 -> Office Microservice :5003)
 */
@Injectable()
export class OfficeService {
  private readonly logger = new Logger(OfficeService.name);
  private readonly OFFICE_SERVICE_URL: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const configuredUrl = this.configService.get<string>('OFFICE_SERVICE_URL');
    const defaultUrl = this.configService.get<string>('NODE_ENV') === 'production'
      ? 'https://phongkham-office.onrender.com'
      : 'http://localhost:5003';
    const configuredIsLocal = configuredUrl
      && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredUrl.trim());
    const baseUrl = configuredIsLocal && this.configService.get<string>('NODE_ENV') === 'production'
      ? defaultUrl
      : (configuredUrl || defaultUrl);
    const normalizedBaseUrl = baseUrl
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/api\/office$/i, '')
      .replace(/\/api$/i, '');
    this.OFFICE_SERVICE_URL = `${normalizedBaseUrl}/api/office`;
    this.logger.log(`🏢 Office Gateway connected to microservice: ${this.OFFICE_SERVICE_URL}`);
  }

  private headersFor(userId?: number): Record<string, string> {
    return userId ? { 'x-user-id': String(userId) } : {};
  }

  private async forward(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options: { data?: any; params?: Record<string, any>; userId?: number } = {},
  ) {
    const { userId, ...rest } = options;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await firstValueFrom(
          this.httpService.request({
            method,
            url: `${this.OFFICE_SERVICE_URL}/${path}`,
            ...rest,
            headers: this.headersFor(userId),
            timeout: OFFICE_SERVICE_TIMEOUT_MS,
          }),
        );
        return res.data;
      } catch (err: any) {
        // Render free tier trả 502/503/504 hoặc từ chối kết nối khi Office service đang cold start / redeploy
        const status = err.response?.status;
        const isWakingUp = [502, 503, 504].includes(status) || ['ECONNREFUSED', 'ECONNRESET'].includes(err.code);
        if (isWakingUp && attempt < OFFICE_SERVICE_MAX_RETRIES) {
          this.logger.warn(`[Office Gateway ${method} /${path}] ${err.message} — thử lại lần ${attempt + 1}`);
          await new Promise((resolve) => setTimeout(resolve, OFFICE_SERVICE_RETRY_DELAY_MS));
          continue;
        }
        this.logger.error(`[Office Gateway ${method} /${path}] ${err.message}`);
        const responseData = err.response?.data;
        const isHtmlError = typeof responseData === 'string' && /^\s*<!doctype html/i.test(responseData);
        if (responseData && !isHtmlError && (status || 500) < 500) {
          return responseData;
        }
        throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
      }
    }
  }

  forwardGet(path: string, params?: Record<string, any>, userId?: number) {
    return this.forward('GET', path, { params, userId });
  }

  forwardPost(path: string, body?: any, userId?: number) {
    return this.forward('POST', path, { data: body, userId });
  }

  forwardPatch(path: string, body?: any, userId?: number) {
    return this.forward('PATCH', path, { data: body, userId });
  }

  forwardDelete(path: string, userId?: number) {
    return this.forward('DELETE', path, { userId });
  }
}
