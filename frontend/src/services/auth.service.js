import { apiPost } from './api';

export const authService = {
  login: (tenDangNhap, matKhau) =>
    apiPost('/auth/login', { tenDangNhap, matKhau }),

  sendOtp: (email, loai = 'dang_ky') =>
    apiPost('/auth/send-otp', { email, loai }),

  verifyOtp: (email, maOtp) =>
    apiPost('/auth/verify-otp', { email, maOtp }),

  refresh: (refreshToken) =>
    apiPost('/auth/refresh', { refreshToken }),

  getMe: () =>
    apiPost('/auth/me'),
};

