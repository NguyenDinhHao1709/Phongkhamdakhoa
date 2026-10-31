import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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
    const baseUrl = this.configService.get<string>('OFFICE_SERVICE_URL') || 'http://localhost:5003';
    this.OFFICE_SERVICE_URL = `${baseUrl.replace(/\/+$/, '')}/api/office`;
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
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway GET /${path}] ${err.message}`);
      if (err.response?.data) return err.response.data;
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }

  async forwardPost(path: string, body?: any, userId?: number) {
    try {
      const res = await firstValueFrom(
        this.httpService.post(`${this.OFFICE_SERVICE_URL}/${path}`, body, {
          headers: this.headersFor(userId),
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway POST /${path}] ${err.message}`);
      if (err.response?.data) return err.response.data;
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }

  async forwardPatch(path: string, body?: any, userId?: number) {
    try {
      const res = await firstValueFrom(
        this.httpService.patch(`${this.OFFICE_SERVICE_URL}/${path}`, body, {
          headers: this.headersFor(userId),
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway PATCH /${path}] ${err.message}`);
      if (err.response?.data) return err.response.data;
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }

  async forwardDelete(path: string, userId?: number) {
    try {
      const res = await firstValueFrom(
        this.httpService.delete(`${this.OFFICE_SERVICE_URL}/${path}`, {
          headers: this.headersFor(userId),
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`[Office Gateway DELETE /${path}] ${err.message}`);
      if (err.response?.data) return err.response.data;
      throw new ServiceUnavailableException('Dịch vụ Office Microservice (cổng 5003) hiện đang bảo trì.');
    }
  }
}

