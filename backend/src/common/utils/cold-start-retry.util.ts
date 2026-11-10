const WAKE_WINDOW_MS = 75000; // Render free cold start mất ~20-60s, frontend chờ tối đa 90s
const RETRY_DELAY_MS = 5000;

/** Render free tier trả 502/503/504 hoặc từ chối kết nối khi service đang cold start / redeploy */
export function isServiceWakingUp(err: any): boolean {
  return [502, 503, 504].includes(err?.response?.status) || ['ECONNREFUSED', 'ECONNRESET'].includes(err?.code);
}

/** Gọi fn, thử lại mỗi 5s trong tối đa 75s khi service đích đang thức dậy; lỗi khác ném ra ngay */
export async function withColdStartRetry<T>(fn: () => Promise<T>, onRetry?: (err: any, attempt: number) => void): Promise<T> {
  const startedAt = Date.now();
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isServiceWakingUp(err) || Date.now() - startedAt + RETRY_DELAY_MS >= WAKE_WINDOW_MS) throw err;
      onRetry?.(err, attempt);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}
