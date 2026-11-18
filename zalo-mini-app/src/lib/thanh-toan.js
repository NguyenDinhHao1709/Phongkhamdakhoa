import { api } from "./api";
import { moTrangWeb } from "./zalo";

/** Tạo link PayOS cho tiền cọc lịch hẹn và mở trong webview của Zalo */
export async function thanhToanCoc(lichHenId) {
  const res = await api.post(`/payos/tao-link/${lichHenId}`);
  const url = res.data?.checkoutUrl;
  if (!url) throw new Error("Không tạo được link thanh toán");
  await moTrangWeb(url);
}

/** Hỏi PayOS trạng thái và đồng bộ lịch hẹn (gọi sau khi khách thanh toán xong quay lại app) */
export function kiemTraThanhToan(lichHenId) {
  return api.get(`/payos/kiem-tra-lich-hen/${lichHenId}`);
}
