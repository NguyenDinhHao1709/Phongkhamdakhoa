import { Request, Response, NextFunction } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

const generalBuckets = new Map<string, RateBucket>();
const authBuckets = new Map<string, RateBucket>();
const aiBuckets = new Map<string, RateBucket>();

// Dọn dẹp bộ nhớ Rate Limiter mỗi 60s
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of generalBuckets.entries()) {
    if (b.resetAt <= now) generalBuckets.delete(k);
  }
  for (const [k, b] of authBuckets.entries()) {
    if (b.resetAt <= now) authBuckets.delete(k);
  }
  for (const [k, b] of aiBuckets.entries()) {
    if (b.resetAt <= now) aiBuckets.delete(k);
  }
}, 60_000).unref();

// Giới hạn số lượng request xử lý đồng thời (In-Flight Requests) để bảo vệ RAM & Event Loop
const MAX_CONCURRENT_REQUESTS = 5000;
const REQUEST_TIMEOUT_MS = 30_000;
const AI_REQUEST_TIMEOUT_MS = 100_000; // chat AI: backend chờ AI service tối đa 90s (cold start + Gemini)

// Ngưỡng Rate Limit cao cho môi trường Phòng khám (nhiều máy dùng chung mạng LAN/Wi-Fi bệnh viện)
const GENERAL_LIMIT_PER_MINUTE = 6000; // 6.000 req/phút/IP (~100 req/giây/IP cho mạng nội bộ bệnh viện)
const AUTH_LIMIT_PER_MINUTE = 120;     // 120 req/phút/IP cho đăng nhập / đăng ký (chống brute-force)


// Giới hạn riêng cho chat AI (mỗi request tốn quota Gemini / TTS)
const AI_PUBLIC_ROUTES = ['/api/ai/triage-chat', '/api/ai/phan-luong-nhanh', '/api/ai/triage', '/api/ai/reset-session'];

function aiRateRules(req: Request, url: string, ip: string): Array<{ key: string; limit: number; windowMs: number }> {
  // Chat bệnh nhân (bắt buộc đăng nhập): đếm theo token để không bị vạ lây khi dùng chung mạng
  if (url.startsWith('/api/ai/patient-')) {
    return [{ key: `patient:${req.headers.authorization || ip}`, limit: 30, windowMs: 60_000 }];
  }
  if (url.startsWith('/api/ai/tts')) {
    return [{ key: `tts:${ip}`, limit: 60, windowMs: 60_000 }];
  }
  if (AI_PUBLIC_ROUTES.some((route) => url === route || url.startsWith(`${route}?`))) {
    return [
      { key: `phut:${ip}`, limit: 20, windowMs: 60_000 },
      { key: `gio:${ip}`, limit: 200, windowMs: 3_600_000 },
    ];
  }
  return [];
}

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

  for (const rule of aiRateRules(req, url, ip)) {
    const check = checkRateLimit(aiBuckets, rule.key, rule.limit, rule.windowMs);
    if (!check.allowed) {
      const cho = check.resetInSec >= 60 ? `${Math.ceil(check.resetInSec / 60)} phút` : `${check.resetInSec} giây`;
      res.setHeader('Retry-After', String(check.resetInSec));
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Bạn đang gửi yêu cầu tới trợ lý AI quá nhanh. Vui lòng thử lại sau ${cho}.`,
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

  const timeoutMs = url.startsWith('/api/ai/') ? AI_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  req.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: `Yêu cầu xử lý quá thời gian quy định (${timeoutMs / 1000}s).`,
        },
      });
    }
    decrement();
  });

  next();
}
