import { create } from 'zustand';
import { setAuthToken } from '../api/apiClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  login: (user, token) => {
    setAuthToken(token);
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
    });
  },

  setUser: (updatedUser) => {
    set({ user: { ...get().user, ...updatedUser } });
  },

  logout: () => {
    setAuthToken(null);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));

export default useAuthStore;

