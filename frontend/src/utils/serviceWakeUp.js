import { apiGet, apiPost } from '../services/api';

// Render free tier cho AI / Office / Python ML ngủ sau 15 phút, thức dậy mất ~20s đến hơn 2 phút
const WAKE_INTERVAL_MS = 5 * 60 * 1000;
const RETRY_WINDOW_MS = 3 * 60 * 1000;
const RETRY_DELAY_MS = 10000;
let lastWakeAt = 0;

/** Đánh thức sớm cả 3 service (qua backend) khi người dùng vừa vào trang; tối đa 1 lần / 5 phút */
export function wakeUpServices() {
  if (Date.now() - lastWakeAt < WAKE_INTERVAL_MS) return;
  lastWakeAt = Date.now();
  ['/ai/health', '/office/health', '/cham-cong/warmup'].forEach((url) => apiGet(url).catch(() => {}));
}

// Service đang thức dậy / deploy: không có phản hồi, trang lỗi HTML của Render, hoặc lỗi 5xx của backend
function isWakingError(err) {
  if (!err || typeof err === 'string') return true;
  if (err.isAxiosError) return !err.response || err.response.status >= 500;
  return err.error?.code === 'SERVER_ERROR';
}

/** POST, nếu service đang thức dậy thì gọi onWaiting và tự gửi lại mỗi 10s trong tối đa 3 phút */
export async function postWithWakeRetry(url, data, onWaiting) {
  const startedAt = Date.now();
  for (;;) {
    try {
      return await apiPost(url, data);
    } catch (err) {
      if (!isWakingError(err) || Date.now() - startedAt + RETRY_DELAY_MS > RETRY_WINDOW_MS) throw err;
      onWaiting?.();
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}
