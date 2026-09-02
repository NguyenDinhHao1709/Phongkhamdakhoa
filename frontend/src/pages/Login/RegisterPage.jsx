import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stethoscope, LogIn, ChevronLeft, Home } from 'lucide-react';
import { apiPost } from '../../services/api';
import useAuthStore from '../../store/authStore';

const registerSchema = z.object({
  tenDangNhap: z.string().min(3, 'Tên đăng nhập ít nhất 3 ký tự'),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  hoTen: z.string().min(2, 'Họ tên không hợp lệ'),
  soDienThoai: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/g, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  ngaySinh: z.string().optional().or(z.literal('')),
  gioiTinh: z.enum(['nam', 'nu', 'khac']).optional().or(z.literal('')),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');
      
      // Filter out empty strings
      const payload = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== '')
      );

      const res = await apiPost('/auth/register', payload);
      
      // Auto login
      if (res.data) {
        setAuth({
          user: res.data.user,
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
        navigate('/benh-nhan', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-medical-bg">
      {/* Cột trái: Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-24 md:w-[480px] md:px-12 lg:px-16 bg-white shadow-xl z-10 relative">
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors gap-1"
          >
            <Home className="h-4 w-4" /> Trang chủ
          </button>
        </div>

        <div className="mx-auto w-full max-w-sm mt-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/20 group-hover:bg-primary-700 transition-colors">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-primary-600 transition-colors">Đăng Ký</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Phòng Khám Đa Khoa</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-danger-light border border-danger-main/20 p-4 text-sm text-danger-dark animate-fade-in">
              <span className="font-semibold">Lỗi:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên đăng nhập <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('tenDangNhap')}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all bg-gray-50 focus:bg-white"
                  placeholder="VD: nguyenvanA"
                />
                {errors.tenDangNhap && <p className="mt-1.5 text-xs text-danger-main font-medium">{errors.tenDangNhap.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  {...register('matKhau')}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                />
                {errors.matKhau && <p className="mt-1.5 text-xs text-danger-main font-medium">{errors.matKhau.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register('hoTen')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all bg-gray-50 focus:bg-white"
                placeholder="Nguyễn Văn A"
              />
              {errors.hoTen && <p className="mt-1.5 text-xs text-danger-main font-medium">{errors.hoTen.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  {...register('soDienThoai')}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all bg-gray-50 focus:bg-white"
                  placeholder="09..."
                />
                {errors.soDienThoai && <p className="mt-1.5 text-xs text-danger-main font-medium">{errors.soDienThoai.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày sinh</label>
                <input
                  type="date"
                  {...register('ngaySinh')}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all bg-gray-50 focus:bg-white text-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Giới tính</label>
              <select
                {...register('gioiTinh')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all bg-gray-50 focus:bg-white text-gray-700"
              >
                <option value="">Chọn giới tính...</option>
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
                <option value="khac">Khác</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/30 transition-all hover:bg-primary-700 hover:shadow-primary-600/40 focus:outline-none focus:ring-4 focus:ring-primary-500/20 active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" /> Đăng ký ngay
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline"
            >
              Đăng nhập tại đây
            </button>
          </div>
        </div>
      </div>

      {/* Cột phải: Hình ảnh */}
      <div className="hidden flex-1 items-center justify-center bg-primary-50 md:flex relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="max-w-lg text-center z-10 px-8 flex flex-col items-center">
          <div className="bg-white p-6 rounded-3xl shadow-xl mb-12">
            <Stethoscope className="w-32 h-32 text-primary-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-primary-900 mb-4 tracking-tight">An Tâm Sức Khỏe</h2>
          <p className="text-lg text-primary-700 font-medium leading-relaxed">
            Đăng ký tài khoản để đặt lịch khám trực tuyến, theo dõi hồ sơ bệnh án và nhận tư vấn sức khỏe từ đội ngũ bác sĩ chuyên khoa.
          </p>
        </div>
      </div>
    </div>
  );
}

