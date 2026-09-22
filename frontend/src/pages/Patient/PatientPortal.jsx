import { useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, ClipboardList, FileText, LogOut, Stethoscope, Home, Ticket,
  MapPin, PhoneCall, Clock,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { apiGet } from '../../services/api';
import TrangChuBenhNhanPage from './TrangChuBenhNhanPage';
import DatLichKhamPage from './DatLichKhamPage';
import LichHenBenhNhanPage from './LichHenBenhNhanPage';
import HoSoYTeBenhNhanPage from './HoSoYTeBenhNhanPage';
import ChatAiPage from './ChatAiPage';
import TienDoKhamPage from './TienDoKhamPage';

export default function PatientPortal() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-5">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/benh-nhan')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Stethoscope className="h-4 w-4" />
            </div>
            <span className="text-[15px] font-bold text-gray-900">Phòng Khám Đa Khoa</span>
          </div>

          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center flex-nowrap">
            {/* Tổng quan */}
            <NavLink
              to="/benh-nhan"
              end
              className={({ isActive }) => `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Home className="h-4 w-4" />
              Tổng quan
            </NavLink>

            {/* Đặt lịch khám */}
            <NavLink
              to="/benh-nhan/dat-lich"
              className={({ isActive }) => `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Đặt lịch khám
            </NavLink>

            {/* Tiến độ & STT */}
            <NavLink
              to="/benh-nhan/so-thu-tu"
              className={({ isActive }) => `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Ticket className="h-4 w-4" />
              Tiến độ & STT
            </NavLink>

            {/* Lịch hẹn */}
            <NavLink
              to="/benh-nhan/lich-hen"
              className={({ isActive }) => `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Lịch hẹn
            </NavLink>

            {/* Hồ sơ y tế */}
            <NavLink
              to="/benh-nhan/ho-so-y-te"
              className={({ isActive }) => `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              Hồ sơ y tế
            </NavLink>

            {/* Hỗ trợ sức khỏe */}
            <NavLink
              to="/benh-nhan/chat-ai"
              className={({ isActive }) => `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              Hỗ trợ sức khỏe
            </NavLink>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-gray-900 leading-tight">{displayName}</p>
              <p className="text-[11px] text-gray-500">Bệnh nhân</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-7">
        <Routes>
          <Route path="" element={<TrangChuBenhNhanPage />} />
          <Route path="trang-chu" element={<TrangChuBenhNhanPage />} />
          <Route path="dat-lich" element={<DatLichKhamPage />} />
          <Route path="so-thu-tu" element={<TienDoKhamPage />} />
          <Route path="lich-hen" element={<LichHenBenhNhanPage />} />
          <Route path="ho-so-y-te" element={<HoSoYTeBenhNhanPage />} />
          <Route path="chat-ai" element={<ChatAiPage />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </main>

      <footer className="bg-slate-900 text-xs text-slate-400">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-7">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-base font-black text-white">
                <Stethoscope className="h-5 w-5 text-blue-400" />
                PHÒNG KHÁM ĐA KHOA
              </div>
              <p className="leading-relaxed">
                Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt của Bộ Y Tế.
              </p>
              <p className="text-[11px] font-semibold text-emerald-400">
                Giấy phép hoạt động số 08922/BYT-GPHĐ
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-white">Thông Tin Liên Hệ</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                  123 Nguyễn Văn Cừ, Quận 5, TP.HCM
                </li>
                <li className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  Tổng đài: 1900 8888
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                  Giờ làm: 07:00 – 20:00 (Thứ 2 - CN)
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-white">Dịch Vụ Nổi Bật</h2>
              <ul className="space-y-2">
                <li>• Khám bệnh Nội tổng quát & Tim mạch</li>
                <li>• Khám Tai Mũi Họng & Nội soi</li>
                <li>• Khám Nhi khoa & Dinh dưỡng</li>
                <li>• Chẩn đoán hình ảnh & Xét nghiệm</li>
                <li>• Khám tư vấn từ xa (Telehealth)</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-white">Đường Dây Nóng Khẩn Cấp</h2>
              <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-800 p-3.5">
                <p className="text-xs font-bold uppercase text-slate-300">Cấp cứu 24/24</p>
                <p className="text-2xl font-black text-emerald-400">1900 8888</p>
                <p className="text-[11px] text-slate-400">Luôn sẵn sàng tiếp nhận & xử trí y tế</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 text-center text-[11px] text-slate-500">
            © 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa. Bản quyền thuộc về Phòng Khám Đa Khoa.
          </div>
        </div>
      </footer>
    </div>
  );
}
