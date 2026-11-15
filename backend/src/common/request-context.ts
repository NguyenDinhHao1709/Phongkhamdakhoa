import { AsyncLocalStorage } from 'async_hooks';
import type { Request, Response, NextFunction } from 'express';
import { getClientIp } from './middleware/load-protection.middleware';

/**
 * Ngữ cảnh của request HTTP đang xử lý (IP thật, trình duyệt), lấy được ở bất kỳ đâu trong cùng
 * chuỗi xử lý mà không phải truyền req qua từng hàm service.
 *
 * Dùng cho nhật ký hệ thống: trước đây nhiều chỗ ghi cứng địa chỉ IP '127.0.0.1' vì service không có req.
 */
interface NguCanhRequest {
  ip: string;
  userAgent: string | null;
}

const kho = new AsyncLocalStorage<NguCanhRequest>();

export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const ua = req.headers['user-agent'];
  kho.run(
    {
      ip: getClientIp(req).slice(0, 50),
      userAgent: typeof ua === 'string' ? ua.slice(0, 255) : null,
    },
    next,
  );
}

/** IP thật của người đang thao tác; null khi không trong một request (tác vụ nền, khởi động…) */
export function ipHienTai(): string | null {
  return kho.getStore()?.ip ?? null;
}

export function userAgentHienTai(): string | null {
  return kho.getStore()?.userAgent ?? null;
}
