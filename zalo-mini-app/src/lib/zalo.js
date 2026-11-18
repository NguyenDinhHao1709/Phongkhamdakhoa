import {
  getAccessToken,
  getPhoneNumber,
  followOA,
  requestSendNotification,
  openChat,
  openPhone,
  openWebview,
  setNavigationBarTitle,
} from "zmp-sdk/apis";
import { api } from "./api";
import { ZALO_OA_ID, HOTLINE } from "../config";

/**
 * Đăng nhập bằng tài khoản Zalo:
 * 1. Lấy access token của người dùng → backend tự gọi Zalo xác minh và tìm tài khoản đã liên kết.
 * 2. Lần đầu (backend trả CAN_SO_DIEN_THOAI): xin quyền số điện thoại → backend giải mã số,
 *    liên kết hồ sơ bệnh nhân có cùng số hoặc tạo tài khoản mới.
 */
export async function dangNhapBangZalo() {
  const accessToken = await getAccessToken();
  try {
    const res = await api.post("/auth/zalo", { accessToken }, { auth: false });
    return res.data;
  } catch (err) {
    if (err.code !== "CAN_SO_DIEN_THOAI") throw err;
  }

  let phoneToken;
  try {
    const kq = await getPhoneNumber();
    phoneToken = kq?.token;
  } catch {
    phoneToken = null;
  }
  if (!phoneToken) {
    throw new Error("Cần cho phép chia sẻ số điện thoại để tìm hồ sơ khám của bạn tại phòng khám.");
  }
  const res = await api.post("/auth/zalo", { accessToken, phoneToken }, { auth: false });
  return res.data;
}

/** Quan tâm OA + cho phép Mini App gửi thông báo (nhắc lịch, có kết quả...) */
export async function batThongBaoZalo() {
  if (ZALO_OA_ID) {
    await followOA({ id: ZALO_OA_ID }).catch(() => {});
  }
  await requestSendNotification();
}

export function nhanTinPhongKham() {
  if (!ZALO_OA_ID) return Promise.reject(new Error("Chưa cấu hình Zalo OA của phòng khám."));
  return openChat({ type: "oa", id: ZALO_OA_ID });
}

export function goiHotline() {
  return openPhone({ phoneNumber: HOTLINE });
}

export function moTrangWeb(url) {
  return openWebview({ url, config: { style: "bottomSheet", leftButton: "back" } });
}

/** Đổi tiêu đề thanh điều hướng của Zalo; chạy thử trên trình duyệt thì bỏ qua */
export function datTieuDe(title) {
  setNavigationBarTitle({ title }).catch(() => {});
}
