import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import HoaDonListPage from './HoaDonListPage';

export default function CashierPortal() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="hoa-don" element={<HoaDonListPage />} />
        <Route path="" element={<Navigate to="hoa-don" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
