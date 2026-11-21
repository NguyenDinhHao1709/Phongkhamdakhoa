import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

const isProduction = () => process.env.NODE_ENV === 'production';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Office-service chỉ nhận request từ backend: backend gửi kèm header x-internal-token = OFFICE_INTERNAL_TOKEN.
 * Production bắt buộc phải cấu hình token; môi trường dev không có token thì cho qua để chạy local cho tiện.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly logger = new Logger(InternalTokenGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (/\/office\/health\/?$/i.test(String(req.path || req.url || '').split('?')[0])) return true;

    const expected = (process.env.OFFICE_INTERNAL_TOKEN || '').trim();
    if (!expected) {
      if (isProduction()) {
        this.logger.error('Thiếu biến môi trường OFFICE_INTERNAL_TOKEN — từ chối mọi request.');
        throw new ServiceUnavailableException('Office service chưa cấu hình OFFICE_INTERNAL_TOKEN');
      }
      return true;
    }

    const provided = String(req.headers['x-internal-token'] || '');
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Thiếu hoặc sai token nội bộ');
    }
    return true;
  }
}

export interface OfficeJwtPayload {
  sub: number;
  tv?: number;
  maVaiTro?: string;
  loaiTaiKhoan?: string;
  exp?: number;
}

/** Xác thực JWT HS256 do backend ký (cùng JWT_SECRET). Trả về payload hoặc null nếu không hợp lệ/hết hạn. */
export function verifyBackendJwt(token: string): OfficeJwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) return null;

  const parts = String(token).replace(/^Bearer\s+/i, '').split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    if (header?.alg !== 'HS256') return null;

    const expectedSig = createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest('base64url');
    if (!safeEqual(expectedSig, signatureB64)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload?.exp && Date.now() / 1000 >= Number(payload.exp)) return null;
    if (!Number(payload?.sub)) return null;
    return { ...payload, sub: Number(payload.sub) };
  } catch {
    return null;
  }
}

/**
 * CORS cho socket/REST: nếu có CLIENT_URL (danh sách phân tách bằng dấu phẩy) thì chỉ cho các domain đó,
 * dev thêm localhost/LAN; chưa cấu hình CLIENT_URL thì cho mọi origin (xác thực đã dựa vào JWT/token nội bộ).
 */
export function corsOriginChecker(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  const configured = (process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;
  if (
    !origin ||
    configured.length === 0 ||
    configured.includes(origin) ||
    (!isProduction() && devOrigin.test(origin))
  ) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin không được phép: ${origin}`), false);
}
