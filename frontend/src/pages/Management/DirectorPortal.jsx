import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import DashboardGiamDocPage from './DashboardGiamDocPage';
import BaoCaoTaiChinhPage from './BaoCaoTaiChinhPage';
import ForecastDashboard from './ForecastDashboard';
import XepLichLamViecPage from './XepLichLamViecPage';
import TraCuuTongHopPage from './TraCuuTongHopPage';
import DuyetYeuCauPage from './DuyetYeuCauPage';

export default function DirectorPortal() {
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

        {/* Redirect root to thong-ke */}
        <Route path="" element={<Navigate to="thong-ke" replace />} />
        <Route path="*" element={<Navigate to="thong-ke" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

