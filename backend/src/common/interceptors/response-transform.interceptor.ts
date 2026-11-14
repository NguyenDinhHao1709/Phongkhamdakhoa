import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Aes256Transformer } from '../transformers/aes-256.transformer';

const aes = new Aes256Transformer();
const DATE_ONLY_FIELDS = new Set(['ngay', 'ngayHen', 'ngayKham', 'ngayLam', 'tuNgay', 'denNgay']);

function normalizeDateOnly(value: Date | string): string {
  const date = value instanceof Date
    ? new Date(value.getTime() + 7 * 60 * 60 * 1000)
    : new Date(value);
  return date.toISOString().slice(0, 10);
}

function decryptPayload(val: any, depth = 0): any {
  if (depth > 15) return val;
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    if (val.startsWith('enc:')) {
      return aes.from(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => decryptPayload(item, depth + 1));
  }
  if (typeof val === 'object' && !(val instanceof Date) && !(val instanceof RegExp) && !(val instanceof Buffer)) {
    const res: any = {};
    for (const key of Object.keys(val)) {
      const field = val[key];
      // Chỉ chuẩn hóa Date hoặc chuỗi ISO; nhãn hiển thị kiểu 'dd/mm' giữ nguyên
      res[key] = DATE_ONLY_FIELDS.has(key) && (field instanceof Date || (typeof field === 'string' && /^\d{4}-\d{2}-\d{2}/.test(field)))
        ? normalizeDateOnly(field)
        : decryptPayload(field, depth + 1);
    }
    return res;
  }
  return val;
}

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const httpRes = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((rawData) => {
        if (httpRes?.headersSent) {
          return rawData;
        }
        const data = decryptPayload(rawData);
        // Nếu controller trả về object có field `data` và `message` riêng
        if (data && typeof data === 'object' && 'data' in data && 'message' in data) {
          const { data: innerData, message: innerMessage, ...rest } = data;
          return {
            success: true,
            data: innerData,
            message: innerMessage,
            ...rest,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: true,
          data,
          message: 'Thao tác thành công',
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
