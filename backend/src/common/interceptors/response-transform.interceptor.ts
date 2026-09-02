import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
      map((data) => {
        // Nếu controller trả về object có field `data` và `message` riêng
        if (data && typeof data === 'object' && 'data' in data && 'message' in data) {
          return {
            success: true,
            data: data.data,
            message: data.message,
            ...(data.pagination ? { pagination: data.pagination } : {}),
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

