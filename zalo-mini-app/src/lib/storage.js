import { nativeStorage } from "zmp-sdk/apis";

// Trong Zalo dùng nativeStorage (đồng bộ, lưu theo Mini App); chạy thử trên trình duyệt thì dùng localStorage
const kho = {
  get(key) {
    try {
      return nativeStorage.getItem(key);
    } catch {
      return window.localStorage.getItem(key);
    }
  },
  set(key, value) {
    try {
      nativeStorage.setItem(key, value);
    } catch {
      window.localStorage.setItem(key, value);
    }
  },
  remove(key) {
    try {
      nativeStorage.removeItem(key);
    } catch {
      window.localStorage.removeItem(key);
    }
  },
};

const KEY_PHIEN = "pk_phien";

/** Phiên đăng nhập: { user, accessToken, refreshToken } */
export function layPhien() {
  const raw = kho.get(KEY_PHIEN);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function luuPhien(phien) {
  kho.set(KEY_PHIEN, JSON.stringify(phien));
}

export function xoaPhien() {
  kho.remove(KEY_PHIEN);
}
