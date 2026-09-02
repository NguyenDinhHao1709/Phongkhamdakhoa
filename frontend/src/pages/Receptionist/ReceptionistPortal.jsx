import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';

const HangDoiPage          = lazy(() => import('./HangDoi/HangDoiPage'));
const TiepNhanPage         = lazy(() => import('./TiepNhan/TiepNhanPage'));
const BenhNhanList         = lazy(() => import('./BenhNhan/BenhNhanListPage'));
const LichHenQuanLyPage    = lazy(() => import('./LichHen/LichHenQuanLyPage'));
const ThongKeKhachHangPage = lazy(() => import('./ThongKe/ThongKeKhachHangPage'));
const ThongTinCaNhanPage   = lazy(() => import('./NhanVienShared/ThongTinCaNhanPage'));
const LichLamViecPage      = lazy(() => import('./NhanVienShared/LichLamViecPage'));
const GuiDonGiamDocPage    = lazy(() => import('./NhanVienShared/GuiDonGiamDocPage'));

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

export default function ReceptionistPortal() {
  return (
    <DashboardLayout>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route index element={<Navigate to="hang-doi" replace />} />
          <Route path="hang-doi"       element={<HangDoiPage />} />
          <Route path="tiep-nhan"      element={<TiepNhanPage />} />
          <Route path="lich-hen"       element={<LichHenQuanLyPage />} />
          <Route path="benh-nhan"      element={<BenhNhanList />} />
          <Route path="thong-ke"       element={<ThongKeKhachHangPage />} />
          <Route path="ca-nhan"        element={<ThongTinCaNhanPage />} />
          <Route path="lich-lam-viec"  element={<LichLamViecPage />} />
          <Route path="gui-don"        element={<GuiDonGiamDocPage />} />
          <Route path="*" element={<Navigate to="hang-doi" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
