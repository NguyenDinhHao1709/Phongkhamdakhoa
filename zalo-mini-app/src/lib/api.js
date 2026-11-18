import { API_URL } from "../config";
import { layPhien, luuPhien, xoaPhien } from "./storage";

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Gọi khi refresh token cũng hết hạn → app quay về màn hình đăng nhập */
let khiHetPhien = () => {};
export function datXuLyHetPhien(fn) {
  khiHetPhien = fn;
}

async function docJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// Nhiều request cùng gặp 401 chỉ làm mới token một lần
let dangLamMoi = null;
function lamMoiToken() {
  const phien = layPhien();
  if (!phien?.refreshToken) return Promise.resolve(null);
  if (!dangLamMoi) {
    dangLamMoi = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: phien.refreshToken }),
    })
      .then(async (res) => {
        const body = await docJson(res);
        if (!res.ok || !body?.data?.accessToken) return null;
        const moi = { ...phien, ...body.data };
        luuPhien(moi);
        return moi;
      })
      .catch(() => null)
      .finally(() => {
        dangLamMoi = null;
      });
  }
  return dangLamMoi;
}

async function goi(method, path, { body, params, auth = true } = {}, daThuLai = false) {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const headers = { "Content-Type": "application/json" };
  const phien = layPhien();
  if (auth && phien?.accessToken) headers.Authorization = `Bearer ${phien.accessToken}`;

  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.", "MAT_KET_NOI", 0);
  }

  if (res.status === 401 && auth && phien?.refreshToken && !daThuLai) {
    const moi = await lamMoiToken();
    if (moi) return goi(method, path, { body, params, auth }, true);
    xoaPhien();
    khiHetPhien();
    throw new ApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", "HET_PHIEN", 401);
  }

  const json = await docJson(res);
  if (!res.ok || json?.success === false) {
    const loi = json?.error || json;
    throw new ApiError(loi?.message || "Có lỗi xảy ra, vui lòng thử lại.", loi?.code, res.status);
  }
  return json;
}

/**
 * POST tới dịch vụ có thể đang ngủ (AI service trên Render free thức dậy mất 20s–2 phút):
 * mất kết nối / lỗi 5xx thì gọi onCho rồi tự gửi lại mỗi 10 giây, tối đa 3 phút.
 */
export async function postChoThucDay(path, body, onCho) {
  const batDau = Date.now();
  for (;;) {
    try {
      return await goi("POST", path, { body });
    } catch (err) {
      const dangNgu = err.status === 0 || err.status >= 500;
      if (!dangNgu || Date.now() - batDau + 10_000 > 180_000) throw err;
      onCho?.();
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}

export const api = {
  get: (path, params, opts) => goi("GET", path, { params, ...opts }),
  post: (path, body, opts) => goi("POST", path, { body, ...opts }),
  patch: (path, body, opts) => goi("PATCH", path, { body, ...opts }),
};
