import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';

const XetNghiemListPage = lazy(() => import('./XetNghiem/XetNghiemListPage'));

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

export default function LabPortal() {
  return (
    <DashboardLayout>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route index element={<Navigate to="xet-nghiem" replace />} />
          <Route path="xet-nghiem" element={<XetNghiemListPage />} />
          <Route path="*" element={<Navigate to="xet-nghiem" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}
