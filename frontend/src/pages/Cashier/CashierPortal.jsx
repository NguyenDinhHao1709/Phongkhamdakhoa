import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import HoaDonListPage from './HoaDonListPage';
import ThongKeThuNganPage from './ThongKeThuNganPage';
import ThongTinCaNhanPage from '../Receptionist/NhanVienShared/ThongTinCaNhanPage';
import LichLamViecPage from '../Receptionist/NhanVienShared/LichLamViecPage';
import GuiDonGiamDocPage from '../Receptionist/NhanVienShared/GuiDonGiamDocPage';
import ChamCongPage from '../Receptionist/NhanVienShared/ChamCongPage';
import ChiTraNhaCungCapPage from './ChiTraNhaCungCapPage';

export default function CashierPortal() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="hoa-don" element={<HoaDonListPage />} />
        <Route path="chi-tra-nha-cung-cap" element={<ChiTraNhaCungCapPage />} />
        <Route path="thong-ke" element={<ThongKeThuNganPage />} />
        <Route path="ca-nhan" element={<ThongTinCaNhanPage />} />
        <Route path="lich-lam-viec" element={<LichLamViecPage />} />
        <Route path="gui-don" element={<GuiDonGiamDocPage />} />
        <Route path="cham-cong" element={<ChamCongPage />} />
        <Route path="" element={<Navigate to="hoa-don" replace />} />
        <Route path="*" element={<Navigate to="hoa-don" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
