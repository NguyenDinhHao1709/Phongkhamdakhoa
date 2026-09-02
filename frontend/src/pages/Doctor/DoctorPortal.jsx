import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';

const PhongKhamPage = lazy(() => import('./PhongKham/PhongKhamPage'));

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
          <Route path="lich-hen" element={<div className="p-8 text-gray-500 font-semibold">Quản lý Lịch hẹn Bác sĩ</div>} />
          <Route path="benh-nhan" element={<div className="p-8 text-gray-500 font-semibold">Danh sách Bệnh nhân Khám</div>} />
          <Route path="*" element={<Navigate to="phong-kham" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
