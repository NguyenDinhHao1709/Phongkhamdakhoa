import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { layPhien, luuPhien, xoaPhien } from "./storage";
import { datXuLyHetPhien } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [phien, setPhien] = useState(() => layPhien());

  useEffect(() => {
    datXuLyHetPhien(() => setPhien(null));
  }, []);

  const value = useMemo(
    () => ({
      user: phien?.user || null,
      dangNhap(data) {
        const moi = { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
        luuPhien(moi);
        setPhien(moi);
      },
      // Chỉ xóa phiên trên máy này; không gọi /auth/logout vì API đó đăng xuất mọi thiết bị của tài khoản
      dangXuat() {
        xoaPhien();
        setPhien(null);
      },
    }),
    [phien],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
