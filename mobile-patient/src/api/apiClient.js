import axios from 'axios';
import { API_BASE_URL } from '../constants/theme';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error?.response?.data || error);
  }
);

export const apiGet = (url, params) => apiClient.get(url, { params });
export const apiPost = (url, data) => apiClient.post(url, data);
export const apiPatch = (url, data) => apiClient.patch(url, data);
export const apiDelete = (url) => apiClient.delete(url);

// Các hàm API nghiệp vụ đồng bộ chuẩn 100% với Web
export const apiLogin = (tenDangNhap, matKhau) =>
  apiClient.post('/auth/login', { tenDangNhap, matKhau });

export const apiSendOtp = (email) =>
  apiClient.post('/auth/send-otp', { email });

export const apiRegister = (userData) =>
  apiClient.post('/auth/register', userData);

export const apiGetPatientById = (id) =>
  apiClient.get(`/benh-nhan/${id}`);

export const apiGetDoctors = () =>
  apiClient.get('/nhan-vien/bac-si-public');

export const apiBookAppointment = (data) =>
  apiClient.post('/lich-hen', data);

export const apiGetMyAppointments = () =>
  apiClient.get('/lich-hen/cua-toi');

export const apiCancelAppointment = (id) =>
  apiClient.patch(`/lich-hen/${id}/huy`);

export const apiGetEmrRecords = () =>
  apiClient.get('/ho-so-benh-an/cua-toi');

export const apiAiTriage = (message, history = []) =>
  apiClient.post('/ai/triage', { message, history });

export const apiPatientSummary = () =>
  apiClient.get('/ai/patient-summary');

export const apiPatientChat = (sessionId, message) =>
  apiClient.post('/ai/patient-chat', { sessionId, message });

export const apiResetPatientSession = (sessionId) =>
  apiClient.post('/ai/patient-reset-session', { sessionId });

export const apiForgotPasswordOtp = (email) =>
  apiClient.post('/auth/forgot-password-otp', { email });

export const apiResetPassword = (email, maOtp, matKhauMoi) =>
  apiClient.post('/auth/reset-password', { email, maOtp, matKhauMoi });

export default apiClient;
