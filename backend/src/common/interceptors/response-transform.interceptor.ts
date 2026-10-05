import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Aes256Transformer } from '../transformers/aes-256.transformer';

const aes = new Aes256Transformer();

function decryptPayload(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'string') {
    if (val.startsWith('enc:')) {
      return aes.from(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => decryptPayload(item));
  }
  if (typeof val === 'object' && !(val instanceof Date) && !(val instanceof RegExp) && !(val instanceof Buffer)) {
    const res: any = {};
    for (const key of Object.keys(val)) {
      res[key] = decryptPayload(val[key]);
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
    return next.handle().pipe(
      map((rawData) => {
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

