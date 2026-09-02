import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';

const PhongKhamPage = lazy(() => import('./PhongKham/PhongKhamPage'));
const KhamTrucTuyenPage = lazy(() => import('./KhamTrucTuyen/KhamTrucTuyenPage'));
const HoSoBenhAnQuanLyPage = lazy(() => import('./HoSoBenhAn/HoSoBenhAnQuanLyPage'));
const LichHenBacSiPage = lazy(() => import('./LichHen/LichHenBacSiPage'));
const ThongKeBacSiPage = lazy(() => import('./ThongKe/ThongKeBacSiPage'));

// Shared staff pages
const ThongTinCaNhanPage = lazy(() => import('../Receptionist/NhanVienShared/ThongTinCaNhanPage'));
const LichLamViecPage = lazy(() => import('../Receptionist/NhanVienShared/LichLamViecPage'));
const GuiDonGiamDocPage = lazy(() => import('../Receptionist/NhanVienShared/GuiDonGiamDocPage'));

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

export default function DoctorPortal() {
  return (
    <DashboardLayout>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route index element={<Navigate to="phong-kham" replace />} />
          <Route path="phong-kham" element={<PhongKhamPage />} />
          <Route path="kham-truc-tuyen" element={<KhamTrucTuyenPage />} />
          <Route path="ho-so-benh-an" element={<HoSoBenhAnQuanLyPage />} />
          <Route path="lich-hen" element={<LichHenBacSiPage />} />
          <Route path="thong-ke" element={<ThongKeBacSiPage />} />
          
          {/* Chức năng cơ bản chung */}
          <Route path="ca-nhan" element={<ThongTinCaNhanPage />} />
          <Route path="lich-lam-viec" element={<LichLamViecPage />} />
          <Route path="gui-don" element={<GuiDonGiamDocPage />} />

          <Route path="*" element={<Navigate to="phong-kham" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
