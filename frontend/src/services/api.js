import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — gắn Bearer token và xử lý FormData
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    
    // Nếu data là FormData, xóa Content-Type để trình duyệt tự thêm (kèm boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — xử lý lỗi 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data, // Trả về trực tiếp data thay vì response
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken: newToken, refreshToken: newRefresh } = response.data.data;

        useAuthStore.getState().setTokens(newToken, newRefresh);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

export default api;
export const apiGet  = (url, params, config = {}) => api.get(url, { params, ...config });
export const apiPost = (url, data, config = {})   => api.post(url, data, config);
export const apiPatch = (url, data, config = {})  => api.patch(url, data, config);
export const apiPut  = (url, data, config = {})   => api.put(url, data, config);
export const apiDel  = (url, config = {})         => api.delete(url, config);

