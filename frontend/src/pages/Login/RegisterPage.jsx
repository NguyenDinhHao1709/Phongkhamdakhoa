import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Stethoscope, LogIn, ChevronLeft, Home, ArrowRight, Mail, Lock,
  Phone, User, Calendar, ShieldCheck, CheckCircle2, RefreshCw, KeyRound, Award, Sparkles
} from 'lucide-react';
import { apiPost } from '../../services/api';
import useAuthStore from '../../store/authStore';

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  xacNhanMatKhau: z.string().min(6, 'Vui lòng xác nhận lại mật khẩu'),
  hoTen: z.string().min(2, 'Họ tên không được để trống'),
  soDienThoai: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, 'Số điện thoại không hợp lệ (gồm 10 chữ số)'),
  ngaySinh: z.string()
    .min(1, 'Ngày sinh là bắt buộc đối với hồ sơ y tế')
    .refine((val) => {
      if (!val) return false;
      return val <= getTodayDateStr();
    }, {
      message: 'Ngày sinh không được vượt quá ngày hôm nay',
    }),
  gioiTinh: z.enum(['nam', 'nu', 'khac'], { required_error: 'Giới tính là bắt buộc' }),
}).refine((data) => data.matKhau === data.xacNhanMatKhau, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['xacNhanMatKhau'],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  // Step 1 = Điền thông tin, Step 2 = Nhập OTP 6 số
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      matKhau: '',
      xacNhanMatKhau: '',
      hoTen: '',
      soDienThoai: '',
      ngaySinh: '',
      gioiTinh: 'nam',
    },
  });

  // Đếm ngược Resend OTP ở Step 2
  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Bước 1: Kiểm tra form & Gửi mã OTP về Email
  const onStep1Submit = async (data) => {
    try {
      setLoading(true);
      setError('');
      setFormData(data);

      // Gửi mã OTP xác thực email
      await apiPost('/auth/send-otp', { email: data.email });

      setStep(2);
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      console.error(err);
      setError(
        err?.error?.message ||
        err?.message ||
        err?.response?.data?.error?.message ||
        'Không thể gửi mã OTP. Vui lòng kiểm tra lại email.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (!formData?.email || !canResend) return;
    try {
      setLoading(true);
      setError('');
      await apiPost('/auth/send-otp', { email: formData.email });
      setCountdown(60);
      setCanResend(false);
      alert('Đã gửi lại mã OTP đến email của bạn!');
    } catch (err) {
      setError(err?.error?.message || 'Có lỗi khi gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác thực OTP & Đăng ký tài khoản
  const onVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 1. Verify OTP
      await apiPost('/auth/verify-otp', { email: formData.email, maOtp: otpCode.trim() });

      // 2. Register Patient
      const payload = {
        email: formData.email,
        tenDangNhap: formData.email, // Dùng Email làm tên đăng nhập chuẩn y tế
        matKhau: formData.matKhau,
        hoTen: formData.hoTen,
        soDienThoai: formData.soDienThoai,
        ngaySinh: formData.ngaySinh,
        gioiTinh: formData.gioiTinh,
      };

      const res = await apiPost('/auth/register', payload);

      const authData = res?.data || res;
      if (authData && authData.accessToken) {
        login(authData.user, authData.accessToken, authData.refreshToken);
        navigate('/benh-nhan', { replace: true });
      } else {
        alert('Đăng ký tài khoản thành công!');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.error?.message ||
        err?.message ||
        err?.response?.data?.error?.message ||
        'Mã OTP không chính xác hoặc đã hết hạn.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-primary-600 transition-colors">
            Phòng Khám Đa Khoa
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors"
          >
            <LogIn className="h-4 w-4 text-gray-500" /> Đăng nhập
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-primary-600 hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" /> Trang chủ
          </button>
        </div>
      </header>

      {/* Body Form Đăng ký ở chính giữa */}
      <main className="flex flex-grow flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Đăng ký tài khoản</h2>
            <p className="mt-1 text-sm text-gray-500">Tạo hồ sơ bệnh nhân điện tử để sử dụng dịch vụ</p>
          </div>

          {/* Stepper Chỉ báo tiến trình */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs sm:text-sm text-red-700 animate-fade-in flex items-start gap-2">
              <span className="font-bold">Lỗi:</span>
              <span>{error}</span>
            </div>
          )}

          {/* ─── BƯỚC 1: ĐIỀN THÔNG TIN BỆNH NHÂN ────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-3.5">
              {/* Email (Dùng làm Tài khoản) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email (Dùng làm tên đăng nhập) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="nguyenvanA@gmail.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>}
              </div>

              {/* Mật khẩu & Xác nhận Mật khẩu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      {...register('matKhau')}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.matKhau && <p className="mt-1 text-xs text-red-600 font-medium">{errors.matKhau.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      {...register('xacNhanMatKhau')}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.xacNhanMatKhau && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.xacNhanMatKhau.message}</p>
                  )}
                </div>
              </div>

              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Họ và tên bệnh nhân <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    {...register('hoTen')}
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                {errors.hoTen && <p className="mt-1 text-xs text-red-600 font-medium">{errors.hoTen.message}</p>}
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    {...register('soDienThoai')}
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="0912345678"
                  />
                </div>
                {errors.soDienThoai && <p className="mt-1 text-xs text-red-600 font-medium">{errors.soDienThoai.message}</p>}
              </div>

              {/* Ngày sinh & Giới tính (Thông tin y tế bắt buộc) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Ngày sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('ngaySinh')}
                    max={getTodayDateStr()}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                  />
                  {errors.ngaySinh && <p className="mt-1 text-xs text-red-600 font-medium">{errors.ngaySinh.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Giới tính <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('gioiTinh')}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                  >
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                  {errors.gioiTinh && <p className="mt-1 text-xs text-red-600 font-medium">{errors.gioiTinh.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/30 transition-all hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/20 active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Tiếp tục — Gửi mã OTP <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ─── BƯỚC 2: XÁC THỰC MÃ OTP 6 CHỮ SỐ ────────────────────────── */}
          {step === 2 && (
            <form onSubmit={onVerifyAndRegister} className="space-y-4 animate-fade-in">
              <div className="rounded-2xl bg-primary-50 p-4 border border-primary-100 text-center space-y-1">
                <KeyRound className="h-8 w-8 text-primary-600 mx-auto mb-1" />
                <h3 className="text-base font-bold text-gray-900">Xác thực Email bệnh nhân</h3>
                <p className="text-xs text-gray-600">
                  Mã OTP 6 chữ số đã được gửi tới email: <br />
                  <strong className="text-primary-700 font-bold">{formData?.email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
                  Nhập mã xác thực OTP 6 số
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[12px] font-mono text-2xl font-extrabold rounded-xl border border-gray-300 py-3 text-primary-700 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {countdown > 0 ? (
                    `Gửi lại mã sau (${countdown}s)`
                  ) : (
                    'Chưa nhận được mã?'
                  )}
                </span>
                <button
                  type="button"
                  disabled={!canResend || loading}
                  onClick={handleResendOtp}
                  className="font-bold text-primary-600 hover:text-primary-700 disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Gửi lại mã OTP
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/30 transition-all hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/20 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> Xác nhận & Hoàn tất Đăng ký
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                ← Quay lại thay đổi thông tin
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline"
            >
              Đăng nhập tại đây
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row text-xs text-gray-400">
          <p>© 2026 Phòng Khám Đa Khoa. Đảm bảo an toàn và bảo mật dữ liệu y tế.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600">Hỗ trợ kỹ thuật</a>
            <a href="#" className="hover:text-gray-600">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-gray-600">Chính sách bảo mật</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
