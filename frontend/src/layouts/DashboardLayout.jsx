import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import useAuthStore from '../store/authStore';
import { VAI_TRO_LABEL } from '../utils/constants';
import {
  Stethoscope, Users, Calendar, ClipboardList,
  FlaskConical, Pill, Receipt, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Bell,
  User, Settings, Video, Clock, Send, Bot, Database,
  Shield, Layers, TrendingUp, DollarSign,
  FileSearch, CheckSquare,
} from 'lucide-react';


const MENU_CONFIG = {
  tiep_tan: [
    { to: '/tiep-tan/hang-doi', icon: ClipboardList, label: 'Hàng đợi phòng khám' },
    { to: '/tiep-tan/tiep-nhan', icon: Stethoscope, label: 'Tiếp nhận & Sinh hiệu' },
    { to: '/tiep-tan/lich-hen', icon: Calendar, label: 'Quản lý lịch hẹn' },
    { to: '/tiep-tan/benh-nhan', icon: Users, label: 'Hồ sơ bệnh nhân' },
    { to: '/tiep-tan/ai-triage', icon: Bot, label: 'Phân luồng AI Triage' },
    { to: '/tiep-tan/thong-ke', icon: BarChart3, label: 'Báo cáo tiếp đón' },
    { to: '/tiep-tan/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/tiep-tan/gui-don', icon: Send, label: 'Gửi đơn Giám Đốc' },
    { to: '/tiep-tan/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  bac_si: [
    { to: '/bac-si/phong-kham', icon: Stethoscope, label: 'Phòng khám lâm sàng' },
    { to: '/bac-si/kham-truc-tuyen', icon: Video, label: 'Tư vấn Online & Đặt lịch' },
    { to: '/bac-si/ho-so-benh-an', icon: ClipboardList, label: 'Hồ sơ bệnh án (EMR)' },
    { to: '/bac-si/lich-hen', icon: Calendar, label: 'Quản lý lịch hẹn' },
    { to: '/bac-si/thong-ke', icon: BarChart3, label: 'Báo cáo & Thống kê' },
    { to: '/bac-si/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/bac-si/gui-don', icon: Send, label: 'Gửi đơn Giám Đốc' },
    { to: '/bac-si/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  ky_thuat_vien: [
    { to: '/ky-thuat-vien/xet-nghiem', icon: FlaskConical, label: 'Xét nghiệm & CĐHA' },
    { to: '/ky-thuat-vien/thong-ke', icon: BarChart3, label: 'Báo cáo & Thống kê' },
    { to: '/ky-thuat-vien/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/ky-thuat-vien/gui-don', icon: Send, label: 'Gửi đơn Giám Đốc' },
    { to: '/ky-thuat-vien/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  nhan_vien_nha_thuoc: [
    { to: '/nha-thuoc/don-thuoc', icon: Pill, label: 'Cấp phát đơn thuốc' },
    { to: '/nha-thuoc/kho-thuoc', icon: Layers, label: 'Kho thuốc & Tồn kho' },
    { to: '/nha-thuoc/thong-ke', icon: BarChart3, label: 'Báo cáo & Dự báo nhu cầu' },
    { to: '/nha-thuoc/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/nha-thuoc/gui-don', icon: Send, label: 'Gửi đơn Giám Đốc' },
    { to: '/nha-thuoc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  nha_thuoc: [
    { to: '/nha-thuoc/don-thuoc', icon: Pill, label: 'Cấp phát đơn thuốc' },
    { to: '/nha-thuoc/kho-thuoc', icon: Layers, label: 'Kho thuốc & Tồn kho' },
    { to: '/nha-thuoc/thong-ke', icon: BarChart3, label: 'Báo cáo & Dự báo nhu cầu' },
    { to: '/nha-thuoc/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/nha-thuoc/gui-don', icon: Send, label: 'Gửi đơn Giám Đốc' },
    { to: '/nha-thuoc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  thu_ngan: [
    { to: '/thu-ngan/hoa-don', icon: Receipt, label: 'Quản lý viện phí & Hóa đơn' },
    { to: '/thu-ngan/thong-ke', icon: BarChart3, label: 'Báo cáo doanh thu ca' },
    { to: '/thu-ngan/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực' },
    { to: '/thu-ngan/gui-don', icon: Send, label: 'Gửi đơn Giám Đốc' },
    { to: '/thu-ngan/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  quan_tri_vien: [
    { to: '/quan-tri/tong-quan', icon: BarChart3, label: 'Tổng quan hệ thống' },
    { to: '/quan-tri/nhan-vien', icon: Users, label: 'Quản lý nhân sự' },
    { to: '/quan-tri/phan-quyen', icon: Shield, label: 'Phân quyền & Vai trò' },
    { to: '/quan-tri/danh-muc', icon: Layers, label: 'Danh mục dùng chung' },
    { to: '/quan-tri/sao-luu', icon: Database, label: 'Sao lưu & CSDL' },
  ],
  quan_tri_vien_cap_cao: [
    { to: '/quan-tri/tong-quan', icon: BarChart3, label: 'Tổng quan hệ thống' },
    { to: '/quan-tri/nhan-vien', icon: Users, label: 'Quản lý nhân sự' },
    { to: '/quan-tri/phan-quyen', icon: Shield, label: 'Phân quyền & Vai trò' },
    { to: '/quan-tri/danh-muc', icon: Layers, label: 'Danh mục dùng chung' },
    { to: '/quan-tri/sao-luu', icon: Database, label: 'Sao lưu & CSDL' },
  ],
  ban_giam_doc: [
    { to: '/ban-giam-doc/thong-ke', icon: BarChart3, label: 'Dashboard tổng quan' },
    { to: '/ban-giam-doc/tai-chinh', icon: DollarSign, label: 'Báo cáo tài chính' },
    { to: '/ban-giam-doc/du-bao-luong', icon: TrendingUp, label: 'Dự báo lưu lượng AI' },
    { to: '/ban-giam-doc/xep-lich', icon: Calendar, label: 'Phân ca làm việc' },
    { to: '/ban-giam-doc/tra-cuu', icon: FileSearch, label: 'Tra cứu tổng hợp' },
    { to: '/ban-giam-doc/phe-duyet-don', icon: CheckSquare, label: 'Phê duyệt yêu cầu' },
  ],
};

export function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const menuItems = MENU_CONFIG[user?.vaiTro] || [];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-medical-bg overflow-hidden">
      {/* ─── SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className={clsx(
          'flex flex-col bg-white border-r border-gray-200 shadow-sidebar transition-all duration-200',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center border-b border-gray-100 h-16 px-4',
          collapsed ? 'justify-center' : 'gap-3',
        )}>
          <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
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
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-semibold text-gray-800 truncate">{user?.tenDangNhap}</p>
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
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-6 flex-shrink-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-3">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <User className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

