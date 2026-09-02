import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (userData, accessToken, refreshToken) => {
        set({
          user: userData,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken: refreshToken || get().refreshToken });
      },

      setUser: (userData) => {
        set({ user: userData });
      },

      getVaiTro: () => get().user?.vai_tro || null,
      getLoaiTaiKhoan: () => get().user?.loai_tai_khoan || null,
    }),
    {
      name: 'phong-kham-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;

