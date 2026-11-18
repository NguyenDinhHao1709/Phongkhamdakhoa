export const TRANG_THAI_LICH_HEN = {
  cho_thanh_toan: { nhan: "Chờ thanh toán cọc", mau: "warning" },
  cho_xac_nhan: { nhan: "Chờ xác nhận", mau: "info" },
  da_xac_nhan: { nhan: "Đã xác nhận", mau: "success" },
  dang_kham: { nhan: "Đang khám", mau: "info" },
  hoan_thanh: { nhan: "Hoàn thành", mau: "muted" },
  da_huy: { nhan: "Đã hủy", mau: "danger" },
  vang_mat: { nhan: "Vắng mặt", mau: "danger" },
  cho_duyet_huy: { nhan: "Chờ duyệt hủy", mau: "warning" },
};

export const LICH_CON_HIEU_LUC = ["cho_thanh_toan", "cho_xac_nhan", "da_xac_nhan", "dang_kham"];

const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** yyyy-mm-dd theo giờ máy (không lệch múi giờ như toISOString) */
export function ngayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ngayVN(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function thuTrongTuan(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return THU[new Date(y, m - 1, d).getDay()];
}

export function gio(hhmmss) {
  return String(hhmmss || "").slice(0, 5);
}

export function tien(so) {
  return `${Number(so || 0).toLocaleString("vi-VN")}đ`;
}

/** Danh sách n ngày tới, bắt đầu từ hôm nay */
export function cacNgayToi(n = 14) {
  const ds = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    ds.push(ngayISO(d));
    d.setDate(d.getDate() + 1);
  }
  return ds;
}
