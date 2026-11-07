import { Request, Response, NextFunction } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

const generalBuckets = new Map<string, RateBucket>();
const authBuckets = new Map<string, RateBucket>();

// Dọn dẹp bộ nhớ Rate Limiter mỗi 60s
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of generalBuckets.entries()) {
    if (b.resetAt <= now) generalBuckets.delete(k);
  }
  for (const [k, b] of authBuckets.entries()) {
    if (b.resetAt <= now) authBuckets.delete(k);
  }
}, 60_000).unref();

// Giới hạn số lượng request xử lý đồng thời (In-Flight Requests) để bảo vệ RAM & Event Loop
const MAX_CONCURRENT_REQUESTS = 5000;
const REQUEST_TIMEOUT_MS = 30_000;

// Ngưỡng Rate Limit cao cho môi trường Phòng khám (nhiều máy dùng chung mạng LAN/Wi-Fi bệnh viện)
const GENERAL_LIMIT_PER_MINUTE = 6000; // 6.000 req/phút/IP (~100 req/giây/IP cho mạng nội bộ bệnh viện)
const AUTH_LIMIT_PER_MINUTE = 120;     // 120 req/phút/IP cho đăng nhập / đăng ký (chống brute-force)

let activeRequests = 0;
let totalProcessedRequests = 0;
let peakConcurrentRequests = 0;

export function getLoadMetrics() {
  return {
    activeRequests,
    peakConcurrentRequests,
    totalProcessedRequests,
    maxConcurrentAllowed: MAX_CONCURRENT_REQUESTS,
    memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    uptimeSeconds: Math.round(process.uptime()),
  };
}

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(
  map: Map<string, RateBucket>,
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  let bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + windowMs };
    map.set(key, bucket);
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const resetInSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    allowed: bucket.count <= limit,
    remaining,
    resetInSec,
  };
}

export function loadProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const url = req.originalUrl || req.url || '';

  // 1. Endpoint kiểm tra sức khỏe & thông số chịu tải tức thì (Zero-DB overhead)
  if (url === '/api/health' || url.startsWith('/api/health?')) {
    return res.status(200).json({
      success: true,
      status: 'healthy',
      load: getLoadMetrics(),
      timestamp: new Date().toISOString(),
    });
  }

  // Bỏ qua file tĩnh
  if (url.startsWith('/uploads/')) {
    return next();
  }

  // 2. Bảo vệ quá tải toàn cục (Load Shedding khi vượt ngưỡng 2.500 kết nối đang xử lý cùng lúc)
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    res.setHeader('Retry-After', '2');
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVER_BUSY',
        message: 'Hệ thống đang xử lý lượng truy cập lớn cùng lúc, vui lòng thử lại sau giây lát.',
      },
    });
  }

  // 3. Rate Limiting theo IP
  const ip = getClientIp(req);
  const isSensitiveAuthRoute =
    req.method === 'POST' &&
    (url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/quen-mat-khau'));

  if (isSensitiveAuthRoute) {
    const check = checkRateLimit(authBuckets, ip, AUTH_LIMIT_PER_MINUTE, 60_000);
    res.setHeader('X-RateLimit-Limit', String(AUTH_LIMIT_PER_MINUTE));
    res.setHeader('X-RateLimit-Remaining', String(check.remaining));
    if (!check.allowed) {
      res.setHeader('Retry-After', String(check.resetInSec));
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Quá nhiều yêu cầu xác thực liên tiếp. Vui lòng thử lại sau ${check.resetInSec} giây.`,
        },
      });
    }
  } else {
    const check = checkRateLimit(generalBuckets, ip, GENERAL_LIMIT_PER_MINUTE, 60_000);
    res.setHeader('X-RateLimit-Limit', String(GENERAL_LIMIT_PER_MINUTE));
    res.setHeader('X-RateLimit-Remaining', String(check.remaining));
    if (!check.allowed) {
      res.setHeader('Retry-After', String(check.resetInSec));
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Tần suất gửi yêu cầu quá nhanh. Vui lòng đợi ${check.resetInSec} giây.`,
        },
      });
    }
  }

  // 4. Theo dõi số lượng kết nối đồng thời & tự động giải phóng nếu treo quá 30s
  activeRequests += 1;
  totalProcessedRequests += 1;
  if (activeRequests > peakConcurrentRequests) {
    peakConcurrentRequests = activeRequests;
  }

  let finished = false;
  const decrement = () => {
    if (!finished) {
      finished = true;
      activeRequests = Math.max(0, activeRequests - 1);
    }
  };

  res.on('finish', decrement);
  res.on('close', decrement);

  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Yêu cầu xử lý quá thời gian quy định (30s).',
        },
      });
    }
    decrement();
  });

  next();
}
