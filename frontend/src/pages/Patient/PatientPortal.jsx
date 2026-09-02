import { useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, FileText, Bot, LogOut, Stethoscope, User, Home } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { apiGet } from '../../services/api';
import DatLichKhamPage from './DatLichKhamPage';
import LichHenBenhNhanPage from './LichHenBenhNhanPage';
import HoSoYTeBenhNhanPage from './HoSoYTeBenhNhanPage';
import ChatAiPage from './ChatAiPage';

export default function PatientPortal() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  // Tự động đồng bộ tên Bệnh nhân từ CSDL nếu chưa có trong phiên đăng nhập cũ
  useEffect(() => {
    if (user?.benhNhanId && !user?.hoTen) {
      apiGet(`/benh-nhan/${user.benhNhanId}`)
        .then((res) => {
          const bnData = res?.data || res;
          if (bnData && bnData.hoTen) {
            setUser({ ...user, hoTen: bnData.hoTen });
          }
        })
        .catch((err) => console.error('Lỗi nạp tên bệnh nhân:', err));
    }
  }, [user?.benhNhanId, user?.hoTen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user?.hoTen || (user?.tenDangNhap?.includes('@') ? user.tenDangNhap.split('@')[0] : user?.tenDangNhap);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Patient Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm group-hover:bg-primary-700 transition-colors">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-primary-600 transition-colors">
              Phòng Khám Đa Khoa
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors"
            >
              <Home className="h-4 w-4 text-primary-600" /> Trang chủ
            </button>
            <NavLink
              to="/benh-nhan/dat-lich"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Calendar className="h-4 w-4" /> Đặt lịch khám
            </NavLink>
            <NavLink
              to="/benh-nhan/lich-hen"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <ClipboardList className="h-4 w-4" /> Lịch hẹn của tôi
            </NavLink>
            <NavLink
              to="/benh-nhan/ho-so-y-te"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <FileText className="h-4 w-4" /> Hồ sơ y tế
            </NavLink>
            <NavLink
              to="/benh-nhan/chat-ai"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Bot className="h-4 w-4 text-primary-600" /> Trợ lý AI 24/7
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-gray-900">{displayName}</p>
              <p className="text-[11px] text-gray-500">Tài khoản Bệnh nhân</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-danger-main transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="dat-lich" element={<DatLichKhamPage />} />
          <Route path="lich-hen" element={<LichHenBenhNhanPage />} />
          <Route path="ho-so-y-te" element={<HoSoYTeBenhNhanPage />} />
          <Route path="chat-ai" element={<ChatAiPage />} />
          <Route path="" element={<Navigate to="dat-lich" replace />} />
        </Routes>
      </main>
    </div>
  );
}
