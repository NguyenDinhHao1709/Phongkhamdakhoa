import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import NhanVienPage from './NhanVienPage';
import PhanQuyenPage from './PhanQuyenPage';
import ForecastDashboard from './ForecastDashboard';
import DashboardGiamDocPage from './DashboardGiamDocPage';
import BaoCaoTaiChinhPage from './BaoCaoTaiChinhPage';
import DuyetYeuCauPage from './DuyetYeuCauPage';
import TraCuuTongHopPage from './TraCuuTongHopPage';
import XepLichLamViecPage from './XepLichLamViecPage';

export default function ManagementPortal() {
  return (
    <DashboardLayout>
      <Routes>
        {/* UC 17: Dashboard tổng quan hoạt động */}
        <Route path="thong-ke" element={<DashboardGiamDocPage />} />
        
        {/* UC 18: Báo cáo tài chính & doanh thu */}
        <Route path="tai-chinh" element={<BaoCaoTaiChinhPage />} />
        
        {/* UC 19: Dự báo y tế & lưu lượng AI */}
        <Route path="du-bao-luong" element={<ForecastDashboard />} />

        {/* UC 20: Quản lý & xếp lịch làm việc */}
        <Route path="xep-lich" element={<XepLichLamViecPage />} />

        {/* UC 21: Tra cứu hồ sơ tổng hợp */}
        <Route path="tra-cuu" element={<TraCuuTongHopPage />} />

        {/* UC 22: Phê duyệt đơn / yêu cầu nhân viên */}
        <Route path="phe-duyet-don" element={<DuyetYeuCauPage />} />

        {/* Quản lý nhân viên & Phân quyền */}
        <Route path="nhan-vien" element={<NhanVienPage />} />
        <Route path="phan-quyen" element={<PhanQuyenPage />} />

        {/* Redirect root to thong-ke */}
        <Route path="" element={<Navigate to="thong-ke" replace />} />
        <Route path="*" element={<Navigate to="thong-ke" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
