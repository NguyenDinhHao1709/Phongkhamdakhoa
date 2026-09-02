import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import DonThuocListPage from './DonThuocListPage';
import KhoThuocPage from './KhoThuocPage';
import ThongKeNhaThuocPage from './ThongKeNhaThuocPage';
import ThongTinCaNhanPage from '../Receptionist/NhanVienShared/ThongTinCaNhanPage';
import LichLamViecPage from '../Receptionist/NhanVienShared/LichLamViecPage';
import GuiDonGiamDocPage from '../Receptionist/NhanVienShared/GuiDonGiamDocPage';

export default function PharmacyPortal() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="don-thuoc" element={<DonThuocListPage />} />
        <Route path="kho-thuoc" element={<KhoThuocPage />} />
        <Route path="thong-ke" element={<ThongKeNhaThuocPage />} />
        <Route path="ca-nhan" element={<ThongTinCaNhanPage />} />
        <Route path="lich-lam-viec" element={<LichLamViecPage />} />
        <Route path="gui-don" element={<GuiDonGiamDocPage />} />
        <Route path="" element={<Navigate to="don-thuoc" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
