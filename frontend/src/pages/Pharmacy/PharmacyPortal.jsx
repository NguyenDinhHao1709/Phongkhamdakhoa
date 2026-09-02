import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import DonThuocListPage from './DonThuocListPage';
import KhoThuocPage from './KhoThuocPage';

export default function PharmacyPortal() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="don-thuoc" element={<DonThuocListPage />} />
        <Route path="kho-thuoc" element={<KhoThuocPage />} />
        <Route path="" element={<Navigate to="don-thuoc" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
