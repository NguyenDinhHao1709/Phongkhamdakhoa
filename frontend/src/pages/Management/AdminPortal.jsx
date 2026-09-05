import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import DashboardAdminPage from './DashboardAdminPage';
import NhanVienPage from './NhanVienPage';
import PhanQuyenPage from './PhanQuyenPage';
import DanhMucDungChungPage from './DanhMucDungChungPage';
import SaoLuuDuLieuPage from './SaoLuuDuLieuPage';

export default function AdminPortal() {
  return (
    <DashboardLayout>
      <Routes>
        {/* 1. Tổng quan kỹ thuật hệ thống */}
        <Route path="tong-quan" element={<DashboardAdminPage />} />

        {/* 2. Quản lý người dùng & nhân sự */}
        <Route path="nhan-vien" element={<NhanVienPage />} />

        {/* 3. Phân quyền & Vai trò */}
        <Route path="phan-quyen" element={<PhanQuyenPage />} />

        {/* 4. Quản lý danh mục dùng chung (Master Data) */}
        <Route path="danh-muc" element={<DanhMucDungChungPage />} />

        {/* 5. Sao lưu & Khôi phục CSDL */}
        <Route path="sao-luu" element={<SaoLuuDuLieuPage />} />

        {/* Redirect root to tong-quan */}
        <Route path="" element={<Navigate to="tong-quan" replace />} />
        <Route path="*" element={<Navigate to="tong-quan" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

