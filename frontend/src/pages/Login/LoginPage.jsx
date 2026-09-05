import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, Stethoscope, Lock, Mail, AlertCircle, Home,
  X, KeyRound, CheckCircle2, ArrowRight, RefreshCw
} from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import useAuthStore from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { apiPost } from '../../services/api';

const loginSchema = z.object({
  tenDangNhap: z.string().min(1, 'Vui lòng nhập email hoặc số điện thoại'),
  matKhau: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

const ROLE_HOME = {
  quan_tri_vien_cap_cao: '/quan-tri',
  quan_tri_vien: '/quan-tri',
  ban_giam_doc: '/ban-giam-doc',
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

  // ─── QUÊN MẬT KHẨU MODAL STATE ─────────────────────────────
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Nhập Email, 2 = Nhập OTP & Đổi Pass
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
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

  // Bước 1 Quên mật khẩu: Gửi OTP về email
  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setForgotLoading(true);
    try {
      await apiPost('/auth/forgot-password-otp', { email: forgotEmail.trim() });
      setForgotSuccess(`Đã gửi mã OTP đến email: ${forgotEmail}`);
      setForgotStep(2);
    } catch (err) {
      console.error(err);
      setForgotError(err?.error?.message || err?.message || 'Email này chưa được đăng ký trong hệ thống');
    } finally {
      setForgotLoading(false);
    }
  };

  // Bước 2 Quên mật khẩu: Xác thực OTP & Đặt mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotOtp || forgotOtp.trim().length < 6) {
      setForgotError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Xác nhận mật khẩu không trùng khớp');
      return;
    }

    setForgotLoading(true);
    try {
      await apiPost('/auth/reset-password', {
        email: forgotEmail.trim(),
        maOtp: forgotOtp.trim(),
        matKhauMoi: forgotNewPass,
      });

      setForgotSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
      setValue('tenDangNhap', forgotEmail);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPass('');
        setForgotConfirmPass('');
        setForgotSuccess('');
      }, 1800);
    } catch (err) {
      console.error(err);
      setForgotError(err?.error?.message || err?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setForgotLoading(false);
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
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotStep(1);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                >
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

          {/* Tài khoản mẫu nhanh */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2">
              Tài khoản mẫu nhanh:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setValue('tenDangNhap', 'admin'); setValue('matKhau', '123456'); }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
              >
                <p className="text-xs font-bold text-slate-800">🛠️ Quản Trị Viên (IT)</p>
                <p className="text-[11px] text-slate-500 font-mono">admin / 123456</p>
              </button>
              <button
                type="button"
                onClick={() => { setValue('tenDangNhap', 'giamdoc'); setValue('matKhau', '123456'); }}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-left transition-colors"
              >
                <p className="text-xs font-bold text-blue-900">💼 Ban Giám Đốc</p>
                <p className="text-[11px] text-blue-600 font-mono">giamdoc / 123456</p>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
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

      {/* ─── MODAL QUÊN MẬT KHẨU / ĐẶT LẠI MẬT KHẨU VIA OTP ───────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 relative space-y-4">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="h-12 w-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Đặt Lại Mật Khẩu</h3>
              <p className="text-xs text-gray-500">
                {forgotStep === 1
                  ? 'Nhập email đã đăng ký để nhận mã xác thực OTP'
                  : 'Nhập mã OTP 6 số và mật khẩu mới của bạn'}
              </p>
            </div>

            {forgotError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* BƯỚC 1: NHẬP EMAIL NẠP OTP */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email tài khoản bệnh nhân <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nguyenvanA@gmail.com"
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <MedButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Hủy
                  </MedButton>
                  <MedButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={forgotLoading}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Gửi mã OTP
                  </MedButton>
                </div>
              </form>
            )}

            {/* BƯỚC 2: NHẬP OTP & MẬT KHẨU MỚI */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 text-center">
                    Mã xác thực OTP (6 chữ số) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[10px] font-mono text-xl font-extrabold rounded-xl border border-gray-300 py-2.5 text-primary-700 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="Mật khẩu mới (>= 6 ký tự)"
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotError(''); setForgotSuccess(''); }}
                    className="text-xs text-gray-500 hover:text-gray-800 font-semibold"
                  >
                    ← Gửi lại mã khác
                  </button>

                  <MedButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={forgotLoading}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Xác nhận & Lưu
                  </MedButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
