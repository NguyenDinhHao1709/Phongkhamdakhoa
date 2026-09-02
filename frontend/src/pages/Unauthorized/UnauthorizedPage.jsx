import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import useAuthStore from '../../store/authStore';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-light mb-6">
        <ShieldOff className="h-8 w-8 text-danger-main" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Không có quyền truy cập</h1>
      <p className="mt-2 text-center text-sm text-gray-500 max-w-xs">
        Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên nếu đây là nhầm lẫn.
      </p>
      <div className="mt-8 flex gap-3">
        <MedButton variant="secondary" onClick={() => navigate(-1)}>
          Quay lại
        </MedButton>
        {isAuthenticated ? (
          <MedButton variant="primary" onClick={() => navigate('/')}>
            Về trang chủ
          </MedButton>
        ) : (
          <MedButton variant="primary" onClick={() => navigate('/login')}>
            Đăng nhập
          </MedButton>
        )}
      </div>
    </div>
  );
}

