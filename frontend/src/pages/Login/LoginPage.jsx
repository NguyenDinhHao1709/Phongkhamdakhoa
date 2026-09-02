import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Stethoscope, Lock, Mail, AlertCircle, Home } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import useAuthStore from '../../store/authStore';
import { authService } from '../../services/auth.service';

const loginSchema = z.object({
  tenDangNhap: z.string().min(1, 'Vui lòng nhập email hoặc số điện thoại'),
  matKhau: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

const ROLE_HOME = {
  quan_tri_vien_cap_cao: '/quan-ly',
  quan_tri_vien: '/quan-ly',
  ban_giam_doc: '/quan-ly',
  bac_si: '/bac-si',
  tiep_tan: '/tiep-tan',
  ky_thuat_vien: '/ky-thuat-vien',
  nhan_vien_nha_thuoc: '/nha-thuoc',
  thu_ngan: '/thu-ngan',
  benh_nhan: '/benh-nhan',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPwd, setShowPwd] = useState(false);
  const [apiError, setApiError] = useState('');
  const [activeTab, setActiveTab] = useState('noi_bo'); // 'noi_bo' | 'benh_nhan'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenDangNhap: '', matKhau: '' },
  });

  const onSubmit = async (data) => {
    setApiError('');
    try {
      const result = await authService.login(data.tenDangNhap, data.matKhau);
      const { user, accessToken, refreshToken } = result.data;
      login(user, accessToken, refreshToken);
      const home = ROLE_HOME[user.vaiTro] || '/';
      navigate(home, { replace: true });
    } catch (err) {
      setApiError(err?.error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-6 lg:px-12">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-sm group-hover:bg-primary-700 transition-colors">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-primary-600 transition-colors">
            Phòng Khám Đa Khoa
          </span>
        </div>

        <MedButton
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          leftIcon={<Home className="h-4 w-4" />}
        >
          Trang chủ
        </MedButton>
      </header>

      {/* Body */}
      <main className="flex flex-grow flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Đăng nhập</h2>
            <p className="mt-2 text-sm text-gray-500">Nhập thông tin để truy cập hệ thống</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email / SDT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email / Số điện thoại
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('tenDangNhap')}
                  type="text"
                  placeholder="email hoặc số điện thoại"
                  className={`block w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.tenDangNhap ? 'border-danger-main' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.tenDangNhap && (
                <p className="mt-1 text-xs text-danger-main">{errors.tenDangNhap.message}</p>
              )}
            </div>

            {/* Mật khẩu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <button type="button" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('matKhau')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`block w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.matKhau ? 'border-danger-main' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.matKhau && (
                <p className="mt-1 text-xs text-danger-main">{errors.matKhau.message}</p>
              )}
            </div>

            {/* API Error */}
            {apiError && (
              <div className="flex items-start gap-2 rounded-lg bg-danger-light border border-danger-main/20 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-main" />
                <p className="text-sm text-danger-dark">{apiError}</p>
              </div>
            )}

            <MedButton
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-4"
            >
              Đăng nhập
            </MedButton>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Dành cho Bệnh nhân mới?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-semibold text-primary-600 hover:text-primary-500"
            >
              Đăng ký ngay
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 px-4">
        <div className="mx-auto max-w-screen-xl flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <p>© 2026 Phòng Khám Đa Khoa. Đảm bảo an toàn và bảo mật dữ liệu y tế.</p>
          <div className="mt-2 sm:mt-0 flex gap-4">
            <a href="#" className="hover:text-primary-600">Hỗ trợ kỹ thuật</a>
            <a href="#" className="hover:text-primary-600">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-primary-600">Chính sách bảo mật</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

