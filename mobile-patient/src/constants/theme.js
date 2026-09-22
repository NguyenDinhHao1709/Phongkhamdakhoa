export const COLORS = {
  primary: '#2563EB',      // Medical Blue
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryMuted: '#DBEAFE',
  
  secondary: '#0F172A',    // Deep Slate / Navy
  primary: '#2563EB',       // Blue 600
  primaryDark: '#1D4ED8',   // Blue 700
  primaryLight: '#EFF6FF',  // Blue 50
  primaryMuted: '#DBEAFE',  // Blue 100

  secondary: '#111827',     // Gray 900 (dark text, KHÔNG phải navy)
  surface: '#FFFFFF',
  background: '#F8FAFC',   // Slate 50
  
  success: '#059669',      // Emerald y tế
  successLight: '#ECFDF5',
  
  warning: '#D97706',      // Amber
  background: '#F9FAFB',    // Gray 50

  success: '#16A34A',       // Green 600
  successLight: '#F0FDF4',  // Green 50
  successBorder: '#BBF7D0', // Green 200

  warning: '#D97706',       // Amber 600
  warningLight: '#FFFBEB',
  
  danger: '#DC2626',       // Red
  warningBorder: '#FDE68A',

  danger: '#DC2626',        // Red 600
  dangerLight: '#FEF2F2',
  
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  
  border: '#E2E8F0',
  borderFocus: '#93C5FD',
  dangerBorder: '#FECACA',

  textPrimary: '#111827',   // Gray 900
  textSecondary: '#374151', // Gray 700
  textMuted: '#9CA3AF',     // Gray 400

  border: '#E5E7EB',        // Gray 200
  borderFocus: '#2563EB',   // Blue 600
};

import { Platform } from 'react-native';

// Khi chạy trên Web dùng localhost, khi chạy trên điện thoại thật (Expo Go) dùng IP mạng LAN của máy tính
export const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.1.129:5000/api';

