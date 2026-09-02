import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi máy chủ nội bộ';
    let code    = 'SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || message;
        code    = resObj.code    || this.statusToCode(status);
        // ValidationPipe trả về mảng lỗi
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('; ');
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Log lỗi không xác định
      console.error('[UnhandledError]', exception);
    }

    response.status(status).json({
      success: false,
      error: { code, message },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'CHUA_XAC_THUC',
      403: 'KHONG_CO_QUYEN',
      404: 'KHONG_TIM_THAY',
      409: 'XUNG_DOT_DU_LIEU',
      422: 'DU_LIEU_KHONG_HOP_LE',
      429: 'QUA_NHIEU_YEU_CAU',
    };
    return map[status] || 'SERVER_ERROR';
  }
}

