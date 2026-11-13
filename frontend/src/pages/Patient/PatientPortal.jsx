import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, ClipboardList, FileText, LogOut, Stethoscope, Home, Ticket,
  MapPin, PhoneCall, Clock, Menu, X, User, Globe, Edit3, Sun, Moon
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useHospitalStore from '../../store/hospitalStore';
import useThemeStore from '../../store/themeStore';
import DatLichKhamPage from './DatLichKhamPage';
import LichHenBenhNhanPage from './LichHenBenhNhanPage';
import HoSoYTeBenhNhanPage from './HoSoYTeBenhNhanPage';
import ChatAiPage from './ChatAiPage';
import TienDoKhamPage from './TienDoKhamPage';
import CapNhatHoSoModal from '../../components/Patient/CapNhatHoSoModal';

export default function PatientPortal() {
  const { user, setUser, logout } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();
  const hospitalInfo = useHospitalStore((s) => s.hospitalInfo);
  const fetchHospitalInfo = useHospitalStore((s) => s.fetchHospitalInfo);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchHospitalInfo();
  }, []);

  useEffect(() => {
    if (user?.benhNhanId && !user?.hoTen) {
      apiGet(`/benh-nhan/${user.benhNhanId}`)
        .then((res) => {
          const patient = res?.data || res;
          if (patient?.hoTen) setUser({ ...user, hoTen: patient.hoTen });
        })
        .catch((error) => console.error('Lỗi nạp tên bệnh nhân:', error));
    }
  }, [user?.benhNhanId, user?.hoTen]);

  const displayName = user?.hoTen
    || (user?.tenDangNhap?.includes('@') ? user.tenDangNhap.split('@')[0] : user?.tenDangNhap)
    || 'Bệnh nhân';

  const NAV_LINKS = [
    { to: '/', end: true, icon: Home, label: 'Trang chủ', shortLabel: 'Trang chủ' },
    { to: '/benh-nhan/dat-lich', icon: Calendar, label: 'Đặt lịch khám', shortLabel: 'Đặt lịch' },
    { to: '/benh-nhan/so-thu-tu', icon: Ticket, label: 'Tiến độ & STT', shortLabel: 'Tiến độ' },
    { to: '/benh-nhan/lich-hen', icon: ClipboardList, label: 'Lịch hẹn', shortLabel: 'Lịch hẹn' },
    { to: '/benh-nhan/ho-so-y-te', icon: FileText, label: 'Hồ sơ y tế', shortLabel: 'Hồ sơ' },
    { to: '/benh-nhan/chat-ai', icon: Stethoscope, label: 'Hỗ trợ sức khỏe', shortLabel: 'Tư vấn AI' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative">
      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              title="Mở menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div
              className="flex items-center gap-2 cursor-pointer min-w-0"
              onClick={() => navigate('/')}
              title="Về Trang chủ giới thiệu phòng khám & Bảng giá"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="text-[13px] sm:text-[15px] font-bold text-gray-900 truncate max-w-[160px] lg:max-w-none">
                {hospitalInfo.tenBenhVien || 'Phòng Khám Đa Khoa'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center flex-nowrap overflow-x-auto no-scrollbar">
            {NAV_LINKS.map(({ to, end, icon: Icon, label, shortLabel }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `flex items-center gap-1.5 px-2 lg:px-2.5 py-2 rounded-lg text-xs lg:text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden">{shortLabel || label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User info & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              title={darkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
            <div
              onClick={() => setShowProfileModal(true)}
              className="hidden sm:block text-right border-l border-gray-200 pl-3 cursor-pointer group hover:opacity-85 transition-opacity"
              title="Nhấn để xem & cập nhật hồ sơ cá nhân"
            >
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[150px] group-hover:text-blue-600 transition-colors">{displayName}</p>
                <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <p className="text-[11px] text-blue-600 font-medium">Sửa hồ sơ</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Khi bấm Hamburger) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-3 py-3 shadow-xl space-y-1 animate-fade-in">
            <div
              onClick={() => { setMobileMenuOpen(false); setShowProfileModal(true); }}
              className="px-3 py-2.5 mb-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-gray-900">{displayName}</p>
                  <Edit3 className="h-3 w-3 text-blue-600" />
                </div>
                <p className="text-[11px] text-blue-600 font-medium">Bấm để cập nhật hồ sơ cá nhân</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(false); logout(); navigate('/'); }}
                className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer ml-2"
              >
                <LogOut className="h-3.5 w-3.5" /> Đăng xuất
              </button>
            </div>

            {NAV_LINKS.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 lg:p-7 pb-20 md:pb-7">
        <Routes>
          <Route path="" element={<Navigate to="/" replace />} />
          <Route path="tong-quan" element={<Navigate to="/" replace />} />
          <Route path="trang-chu" element={<Navigate to="/" replace />} />
          <Route path="dat-lich" element={<DatLichKhamPage />} />
          <Route path="so-thu-tu" element={<TienDoKhamPage />} />
          <Route path="lich-hen" element={<LichHenBenhNhanPage />} />
          <Route path="ho-so-y-te" element={<HoSoYTeBenhNhanPage />} />
          <Route path="chat-ai" element={<ChatAiPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* ─── MOBILE BOTTOM NAVIGATION BAR (Điện thoại < 768px) ─────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 pt-1 pb-safe px-1 flex justify-around items-center shadow-lg">
        {NAV_LINKS.map(({ to, end, icon: Icon, shortLabel, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-[10px] transition-colors flex-1 min-w-0 text-center ${
              isActive ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <span className="truncate w-full leading-tight tracking-tight">{shortLabel || label}</span>
          </NavLink>
        ))}
      </nav>

      <footer className="bg-slate-900 text-xs text-slate-400">
        {/* Mobile Compact Footer */}
        <div className="md:hidden px-4 py-5 pb-20 space-y-3 border-t border-slate-800 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-white uppercase">
            <Stethoscope className="h-4 w-4 text-blue-400" />
            <span>{hospitalInfo.tenBenhVien || 'Phòng Khám Đa Khoa'}</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">
            {(hospitalInfo.soGiayPhep || '').toLowerCase().includes('giấy phép')
              ? hospitalInfo.soGiayPhep
              : `Giấy phép hoạt động: ${hospitalInfo.soGiayPhep || '08922/BYT-GPHĐ'}`}
          </p>
          <div className="inline-flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-full text-xs text-white">
            <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
            <span>Hotline 24/7: <strong className="text-emerald-400 font-bold">{hospitalInfo.tongDai || '1900 8888'}</strong></span>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">
            {hospitalInfo.banQuyen || '© 2026 Bản quyền thuộc về Phòng Khám Đa Khoa.'}
          </p>
        </div>

        {/* Desktop Full Footer */}
        <div className="hidden md:block mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-7">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-base font-black text-white uppercase">
                <Stethoscope className="h-5 w-5 text-blue-400" />
                {hospitalInfo.tenBenhVien || 'PHÒNG KHÁM ĐA KHOA'}
              </div>
              <p className="leading-relaxed">
                {hospitalInfo.moTa}
              </p>
              <p className="text-[11px] font-semibold text-emerald-400">
                {(hospitalInfo.soGiayPhep || '').toLowerCase().includes('giấy phép')
                  ? hospitalInfo.soGiayPhep
                  : `Giấy phép hoạt động số ${hospitalInfo.soGiayPhep || '08922/BYT-GPHĐ'}`}
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-white">Thông Tin Liên Hệ</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                  {hospitalInfo.diaChi}
                </li>
                <li className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  Tổng đài: {hospitalInfo.tongDai}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                  Giờ làm: {hospitalInfo.gioLamViec}
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-white">Dịch Vụ Nổi Bật</h2>
              <ul className="space-y-2">
                {(hospitalInfo.dichVuNoiBat || []).map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-white">Đường Dây Nóng Khẩn Cấp</h2>
              <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-800 p-3.5">
                <p className="text-xs font-bold uppercase text-slate-300">{hospitalInfo.tieuDeCapCuu || 'Cấp cứu 24/24'}</p>
                <p className="text-2xl font-black text-emerald-400">{hospitalInfo.hotlineCapCuu || '1900 8888'}</p>
                <p className="text-[11px] text-slate-400">{hospitalInfo.khauHieuCapCuu || 'Luôn sẵn sàng tiếp nhận & xử trí y tế'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 text-center text-[11px] text-slate-500">
            {hospitalInfo.banQuyen || '© 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa.'}
          </div>
        </div>
      </footer>

      {/* ─── MODAL CẬP NHẬT HỒ SƠ BỆNH NHÂN ─────────────────────── */}
      <CapNhatHoSoModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        benhNhanId={user?.benhNhanId}
        onSuccess={() => {
          if (user?.benhNhanId) {
            apiGet(`/benh-nhan/${user.benhNhanId}`)
              .then((res) => {
                const patient = res?.data || res;
                if (patient?.hoTen) setUser({ ...user, hoTen: patient.hoTen });
              })
              .catch(console.error);
          }
        }}
      />
    </div>
  );
}
