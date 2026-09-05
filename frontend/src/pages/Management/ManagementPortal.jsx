import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import NhanVienPage from './NhanVienPage';
import PhanQuyenPage from './PhanQuyenPage';
import ForecastDashboard from './ForecastDashboard';

export default function ManagementPortal() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="nhan-vien" element={<NhanVienPage />} />
        <Route path="phan-quyen" element={<PhanQuyenPage />} />
        <Route path="du-bao-luong" element={<ForecastDashboard />} />
        {/* Redirect root to nhan-vien */}
        <Route path="" element={<Navigate to="nhan-vien" replace />} />
        <Route path="thong-ke" element={<div className="p-8 text-center font-semibold">Thống kê đang được phát triển...</div>} />
        <Route path="cai-dat" element={<div className="p-8 text-center font-semibold">Cài đặt đang được phát triển...</div>} />
      </Routes>
    </DashboardLayout>
  );
}
