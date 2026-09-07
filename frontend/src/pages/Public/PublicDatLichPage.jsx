import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar, Stethoscope, ArrowLeft, Building2, Video
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import PublicDatLichModal from './PublicDatLichModal';

export default function PublicDatLichPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const initialHinhThuc = searchParams.get('hinhThuc') === 'truc_tuyen' ? 'truc_tuyen' : 'truc_tiep';

  // Nếu người dùng đã đăng nhập tài khoản bệnh nhân, chuyển hướng thẳng vào cổng bệnh nhân
  useEffect(() => {
    if (isAuthenticated && user?.vaiTro === 'benh_nhan') {
      navigate(`/benh-nhan/dat-lich?hinhThuc=${initialHinhThuc}`, { replace: true });
    }
  }, [isAuthenticated, user?.vaiTro, initialHinhThuc, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-sm text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">Phòng Khám Đa Khoa</span>
              <p className="text-[11px] text-gray-500">Cổng đặt lịch khám công khai</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại Trang chủ
          </button>
        </div>
      </header>

      {/* Render the modal inline as full page */}
      <div className="flex-1 py-8 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <PublicDatLichModal
          isOpen={true}
          onClose={() => navigate('/')}
          initialHinhThuc={initialHinhThuc}
        />
      </div>
    </div>
  );
}

