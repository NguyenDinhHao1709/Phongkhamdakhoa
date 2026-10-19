import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import useAuthStore from '../store/authStore';
import { VAI_TRO_LABEL } from '../utils/constants';
import { NotificationDropdown } from '../components/NotificationDropdown';
import {
  Stethoscope, Users, Calendar, ClipboardList,
  FlaskConical, Pill, Receipt, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Bell,
  User, Settings, Video, Clock, Send, Bot, Database,
  Shield, Layers, TrendingUp, DollarSign,
  FileSearch, CheckSquare, FileText, ScanFace,
  Menu, X, PackagePlus
} from 'lucide-react';


const MENU_CONFIG = {
  tiep_tan: [
    { to: '/tiep-tan/hang-doi', icon: ClipboardList, label: 'Hàng đợi phòng khám' },
    { to: '/tiep-tan/lich-hen', icon: Calendar, label: 'Quản lý lịch hẹn' },
    { to: '/tiep-tan/benh-nhan', icon: Users, label: 'Hồ sơ bệnh nhân' },
    { to: '/tiep-tan/ai-triage', icon: Bot, label: 'Phân luồng AI Triage' },
    { to: '/tiep-tan/thong-ke', icon: BarChart3, label: 'Báo cáo tiếp đón' },
    { to: '/tiep-tan/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/tiep-tan/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt' },
    { to: '/tiep-tan/gui-don', icon: Send, label: 'Gửi yêu cầu' },
    { to: '/tiep-tan/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  bac_si: [
    { to: '/bac-si/phong-kham', icon: Stethoscope, label: 'Phòng khám lâm sàng' },
    { to: '/bac-si/kham-truc-tuyen', icon: Video, label: 'Tư vấn Online & Đặt lịch' },
    { to: '/bac-si/ho-so-benh-an', icon: ClipboardList, label: 'Hồ sơ bệnh án (EMR)' },
    { to: '/bac-si/lich-hen', icon: Calendar, label: 'Quản lý lịch hẹn' },
    { to: '/bac-si/thong-ke', icon: BarChart3, label: 'Báo cáo & Thống kê' },
    { to: '/bac-si/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/bac-si/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt' },
    { to: '/bac-si/gui-don', icon: Send, label: 'Gửi yêu cầu' },
    { to: '/bac-si/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  ky_thuat_vien: [
    { to: '/ky-thuat-vien/xet-nghiem', icon: FlaskConical, label: 'Xét nghiệm & CĐHA' },
    { to: '/ky-thuat-vien/thong-ke', icon: BarChart3, label: 'Báo cáo & Thống kê' },
    { to: '/ky-thuat-vien/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/ky-thuat-vien/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt' },
    { to: '/ky-thuat-vien/gui-don', icon: Send, label: 'Gửi yêu cầu' },
    { to: '/ky-thuat-vien/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  nhan_vien_nha_thuoc: [
    { to: '/nha-thuoc/don-thuoc', icon: Pill, label: 'Cấp phát đơn thuốc' },
    { to: '/nha-thuoc/kho-thuoc', icon: Layers, label: 'Kho thuốc & Tồn kho' },
    { to: '/nha-thuoc/mua-hang', icon: PackagePlus, label: 'Mua hàng & Nhập thuốc' },
    { to: '/nha-thuoc/thong-ke', icon: BarChart3, label: 'Báo cáo & Dự báo nhu cầu' },
    { to: '/nha-thuoc/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/nha-thuoc/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt' },
    { to: '/nha-thuoc/gui-don', icon: Send, label: 'Gửi yêu cầu' },
    { to: '/nha-thuoc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  nha_thuoc: [
    { to: '/nha-thuoc/don-thuoc', icon: Pill, label: 'Cấp phát đơn thuốc' },
    { to: '/nha-thuoc/kho-thuoc', icon: Layers, label: 'Kho thuốc & Tồn kho' },
    { to: '/nha-thuoc/mua-hang', icon: PackagePlus, label: 'Mua hàng & Nhập thuốc' },
    { to: '/nha-thuoc/thong-ke', icon: BarChart3, label: 'Báo cáo & Dự báo nhu cầu' },
    { to: '/nha-thuoc/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/nha-thuoc/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt' },
    { to: '/nha-thuoc/gui-don', icon: Send, label: 'Gửi yêu cầu' },
    { to: '/nha-thuoc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  thu_ngan: [
    { to: '/thu-ngan/hoa-don', icon: Receipt, label: 'Thu viện phí & Biên lai (AR)' },
    { to: '/thu-ngan/chi-tra-nha-cung-cap', icon: DollarSign, label: 'Sổ chi trả & Chi phí (AP/OPEX)' },
    { to: '/thu-ngan/thong-ke', icon: BarChart3, label: 'Báo cáo sổ quỹ & Chốt ca' },
    { to: '/thu-ngan/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/thu-ngan/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt' },
    { to: '/thu-ngan/gui-don', icon: Send, label: 'Gửi yêu cầu' },
    { to: '/thu-ngan/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  quan_tri_vien: [
    { to: '/quan-tri/tong-quan', icon: BarChart3, label: 'Tổng quan hệ thống' },
    { to: '/quan-tri/nhan-vien', icon: Users, label: 'Quản lý nhân sự' },
    { to: '/quan-tri/phan-quyen', icon: Shield, label: 'Phân quyền & Vai trò' },
    { to: '/quan-tri/danh-muc', icon: Layers, label: 'Danh mục dùng chung' },
    { to: '/quan-tri/sao-luu', icon: Database, label: 'Sao lưu & CSDL' },
    { to: '/quan-tri/nhat-ky', icon: FileText, label: 'Nhật ký hệ thống' },
    { to: '/quan-tri/cai-dat-cham-cong', icon: ScanFace, label: 'Cài đặt chấm công & WiFi' },
    { to: '/quan-tri/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  quan_tri_vien_cap_cao: [
    { to: '/quan-tri/tong-quan', icon: BarChart3, label: 'Tổng quan hệ thống' },
    { to: '/quan-tri/nhan-vien', icon: Users, label: 'Quản lý nhân sự' },
    { to: '/quan-tri/phan-quyen', icon: Shield, label: 'Phân quyền & Vai trò' },
    { to: '/quan-tri/danh-muc', icon: Layers, label: 'Danh mục dùng chung' },
    { to: '/quan-tri/sao-luu', icon: Database, label: 'Sao lưu & CSDL' },
    { to: '/quan-tri/nhat-ky', icon: FileText, label: 'Nhật ký hệ thống' },
    { to: '/quan-tri/cai-dat-cham-cong', icon: ScanFace, label: 'Cài đặt chấm công & WiFi' },
    { to: '/quan-tri/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  ban_giam_doc: [
    { to: '/ban-giam-doc/thong-ke', icon: BarChart3, label: 'Dashboard điều hành' },
    { to: '/ban-giam-doc/tai-chinh', icon: FileText, label: 'Báo cáo toàn diện BV' },
    { to: '/ban-giam-doc/bao-cao-bo-phan', icon: ClipboardList, label: 'Báo cáo bộ phận & Chỉ đạo' },
    { to: '/ban-giam-doc/du-bao-luong', icon: TrendingUp, label: 'Dự báo lưu lượng' },
    { to: '/ban-giam-doc/xep-lich', icon: Calendar, label: 'Phân ca làm việc' },
    { to: '/ban-giam-doc/quan-ly-cham-cong', icon: ScanFace, label: 'Quản lý chấm công' },
    { to: '/ban-giam-doc/tra-cuu', icon: FileSearch, label: 'Tra cứu tổng hợp' },
    { to: '/ban-giam-doc/phe-duyet-don', icon: CheckSquare, label: 'Phê duyệt yêu cầu' },
    { to: '/ban-giam-doc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
};

export function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const menuItems = MENU_CONFIG[user?.vaiTro] || [];

  const getProfileRoute = () => {
    switch (user?.vaiTro) {
      case 'bac_si':
        return '/bac-si/ca-nhan';
      case 'tiep_tan':
        return '/tiep-tan/ca-nhan';
      case 'ky_thuat_vien':
        return '/ky-thuat-vien/ca-nhan';
      case 'duoc_si':
      case 'nhan_vien_nha_thuoc':
      case 'nha_thuoc':
        return '/nha-thuoc/ca-nhan';
      case 'thu_ngan':
        return '/thu-ngan/ca-nhan';
      case 'ban_giam_doc':
        return '/ban-giam-doc/ca-nhan';
      case 'quan_tri_vien':
      case 'quan_tri_vien_cap_cao':
        return '/quan-tri/ca-nhan';
      case 'benh_nhan':
        return '/benh-nhan/ho-so';
      default:
        return '/bac-si/ca-nhan';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-medical-bg overflow-hidden relative print:h-auto print:overflow-visible print:bg-white">
      {/* ─── MOBILE BACKDROP ──────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 md:hidden transition-opacity print:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── MOBILE DRAWER (Điện thoại & Tablet nhỏ < 768px) ──────── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out print:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 shadow-xs">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Phòng Khám</p>
              <p className="text-xs text-gray-500">Đa Khoa</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            title="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {menuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Drawer Footer */}
        <div className="border-t border-gray-100 p-3 bg-gray-50/50">
          <div
            onClick={() => { setMobileOpen(false); navigate(getProfileRoute()); }}
            className="px-3 py-2 mb-2 rounded-xl bg-white border border-gray-200/80 hover:border-primary-300 cursor-pointer transition-colors shadow-2xs"
            title="Xem thông tin cá nhân"
          >
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.hoTen || user?.tenDangNhap}</p>
            <p className="text-[11px] text-gray-500">{VAI_TRO_LABEL[user?.vaiTro] || user?.vaiTro}</p>
          </div>
          <button
            onClick={() => { setMobileOpen(false); handleLogout(); }}
            className="flex items-center justify-center gap-2 w-full rounded-xl px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 font-medium transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ─── DESKTOP / TABLET SIDEBAR (≥ 768px) ────────────────────── */}
      <aside
        className={clsx(
          'hidden md:flex flex-col bg-white border-r border-gray-200 shadow-sidebar transition-all duration-200 flex-shrink-0 print:hidden',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center border-b border-gray-100 h-16 px-4',
          collapsed ? 'justify-center' : 'gap-3',
        )}>
          <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 shadow-xs">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">Phòng Khám</p>
              <p className="text-xs text-gray-500 truncate">Đa Khoa</p>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {menuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors mb-0.5',
                collapsed && 'justify-center',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="border-t border-gray-100 p-2">
          {!collapsed && (
            <div
              onClick={() => navigate(getProfileRoute())}
              className="px-3 py-2 mb-1 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
              title="Xem thông tin cá nhân"
            >
              <p className="text-xs font-semibold text-gray-800 truncate hover:text-primary-600">{user?.hoTen || user?.tenDangNhap}</p>
              <p className="text-xs text-gray-500">{VAI_TRO_LABEL[user?.vaiTro] || user?.vaiTro}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-danger-main transition-colors',
              collapsed && 'justify-center',
            )}
            title="Đăng xuất"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && 'Đăng xuất'}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden print:overflow-visible print:h-auto">
        {/* Header */}
        <header className="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            {/* Nút Hamburger trên điện thoại (< 768px) */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Nút Thu gọn / Mở rộng Sidebar trên Laptop & Máy tính bảng (≥ 768px) */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Tiêu đề ngắn trên điện thoại */}
            <div className="md:hidden flex items-center gap-1.5 ml-1">
              <span className="text-xs font-bold text-gray-900 truncate">Phòng Khám Đa Khoa</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Dropdown */}
            <NotificationDropdown />

            {/* Icon Người - Bấm để chuyển vào xem và chỉnh sửa thông tin cá nhân */}
            <button
              onClick={() => navigate(getProfileRoute())}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors shadow-2xs overflow-hidden"
              title="Xem thông tin cá nhân"
              data-testid="btn-header-profile"
            >
              {user?.anhDaiDien ? (
                <img
                  src={user.anhDaiDien.startsWith('http') ? user.anhDaiDien : `http://localhost:5000${user.anhDaiDien}`}
                  alt={user?.hoTen || user?.tenDangNhap}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content với padding linh hoạt tương thích điện thoại & máy tính */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 print:p-0 print:overflow-visible print:h-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
