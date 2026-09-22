import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function PublicDatLichPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const initialHinhThuc = searchParams.get('hinhThuc') === 'truc_tuyen' ? 'truc_tuyen' : 'truc_tiep';
  const bacSiId = searchParams.get('bacSiId');
  const chuyenKhoa = searchParams.get('chuyenKhoa');
  const doctorParam = bacSiId ? `&bacSiId=${bacSiId}` : '';
  const ckParam = chuyenKhoa ? `&chuyenKhoa=${encodeURIComponent(chuyenKhoa)}` : '';

  useEffect(() => {
    const target = `/benh-nhan/dat-lich?hinhThuc=${initialHinhThuc}${doctorParam}${ckParam}`;
    if (isAuthenticated && user?.vaiTro === 'benh_nhan') {
      navigate(target, { replace: true });
    } else {
      navigate(`/login?redirect=${encodeURIComponent(target)}`, { replace: true });
    }
  }, [isAuthenticated, user?.vaiTro, initialHinhThuc, doctorParam, ckParam, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-gray-700">Đang chuyển hướng đến cổng đặt lịch khám...</p>
      </div>
    </div>
  );
}
