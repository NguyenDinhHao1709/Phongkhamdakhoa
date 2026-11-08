import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const OFFICE_SERVICE_TIMEOUT_MS = 90000;

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

  async forwardGet(path: string, params?: Record<string, any>, userId?: number) {
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${this.OFFICE_SERVICE_URL}/${path}`, {
          params,
          headers: this.headersFor(userId),
          timeout: OFFICE_SERVICE_TIMEOUT_MS,
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway GET /${path}] ${err.message}`);
      const responseData = err.response?.data;
      const isHtmlError = typeof responseData === 'string' && /^\s*<!doctype html/i.test(responseData);
      if (responseData && !isHtmlError && (err.response?.status || 500) < 500) {
        return responseData;
      }
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }

  async forwardPost(path: string, body?: any, userId?: number) {
    try {
      const res = await firstValueFrom(
        this.httpService.post(`${this.OFFICE_SERVICE_URL}/${path}`, body, {
          headers: this.headersFor(userId),
          timeout: OFFICE_SERVICE_TIMEOUT_MS,
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway POST /${path}] ${err.message}`);
      const responseData = err.response?.data;
      const isHtmlError = typeof responseData === 'string' && /^\s*<!doctype html/i.test(responseData);
      if (responseData && !isHtmlError && (err.response?.status || 500) < 500) {
        return responseData;
      }
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }

  async forwardPatch(path: string, body?: any, userId?: number) {
    try {
      const res = await firstValueFrom(
        this.httpService.patch(`${this.OFFICE_SERVICE_URL}/${path}`, body, {
          headers: this.headersFor(userId),
          timeout: OFFICE_SERVICE_TIMEOUT_MS,
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway PATCH /${path}] ${err.message}`);
      const responseData = err.response?.data;
      const isHtmlError = typeof responseData === 'string' && /^\s*<!doctype html/i.test(responseData);
      if (responseData && !isHtmlError && (err.response?.status || 500) < 500) {
        return responseData;
      }
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }

  async forwardDelete(path: string, userId?: number) {
    try {
      const res = await firstValueFrom(
        this.httpService.delete(`${this.OFFICE_SERVICE_URL}/${path}`, {
          headers: this.headersFor(userId),
          timeout: OFFICE_SERVICE_TIMEOUT_MS,
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway DELETE /${path}] ${err.message}`);
      const responseData = err.response?.data;
      const isHtmlError = typeof responseData === 'string' && /^\s*<!doctype html/i.test(responseData);
      if (responseData && !isHtmlError && (err.response?.status || 500) < 500) {
        return responseData;
      }
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }
}
