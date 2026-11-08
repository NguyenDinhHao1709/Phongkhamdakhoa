import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { apiGet } from '../services/api';
import { VAI_TRO_LABEL } from '../utils/constants';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { toBackendUrl } from '../utils/backendUrl';
import {
  Stethoscope, Users, Calendar, ClipboardList,
  FlaskConical, Pill, Receipt, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Bell,
  User, Settings, Video, Clock, Send, Bot, Database,
  Shield, Layers, TrendingUp, DollarSign,
  FileSearch, CheckSquare, FileText, ScanFace,
  Menu, X, PackagePlus, UserCheck, MessageSquare, Sun, Moon, BookOpen
} from 'lucide-react';

const MENU_CONFIG = {
  tiep_tan: [
    { to: '/tiep-tan/hang-doi', icon: ClipboardList, label: 'Hàng đợi phòng khám', perm: 'tiep_nhan.goi_so' },
    { to: '/tiep-tan/lich-hen', icon: Calendar, label: 'Quản lý lịch hẹn', perm: 'lich_hen.xem' },
    { to: '/tiep-tan/benh-nhan', icon: Users, label: 'Hồ sơ bệnh nhân', perm: 'benh_nhan.them' },
    { to: '/tiep-tan/ai-triage', icon: Bot, label: 'Phân luồng AI Triage', perm: 'ai_triage.phan_luong' },
    { to: '/tiep-tan/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/tiep-tan/thong-ke', icon: BarChart3, label: 'Báo cáo tiếp đón', perm: 'tiep_nhan.thong_ke' },
    { to: '/tiep-tan/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực', perm: 'lich_truc.xem' },
    { to: '/tiep-tan/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt', perm: 'cham_cong.ca_nhan' },
    { to: '/tiep-tan/gui-don', icon: Send, label: 'Gửi yêu cầu', perm: 'don_tu.gui' },
    { to: '/tiep-tan/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  bac_si: [
    { to: '/bac-si/phong-kham', icon: Stethoscope, label: 'Phòng khám lâm sàng', perm: 'kham_benh.kham' },
    { to: '/bac-si/kham-truc-tuyen', icon: Video, label: 'Tư vấn Online & Đặt lịch', perm: 'kham_benh.truc_tuyen' },
    { to: '/bac-si/ho-so-benh-an', icon: ClipboardList, label: 'Hồ sơ bệnh án (EMR)', perm: 'kham_benh.xem_lich_su' },
    { to: '/bac-si/lich-hen', icon: Calendar, label: 'Quản lý lịch hẹn', perm: 'lich_hen.xem' },
    { to: '/bac-si/bai-viet', icon: BookOpen, label: 'Cẩm nang & Bài viết y khoa', perm: 'bai_viet.soan_thao' },
    { to: '/bac-si/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/bac-si/thong-ke', icon: BarChart3, label: 'Báo cáo & Thống kê', perm: 'kham_benh.thong_ke' },
    { to: '/bac-si/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực', perm: 'lich_truc.xem' },
    { to: '/bac-si/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt', perm: 'cham_cong.ca_nhan' },
    { to: '/bac-si/gui-don', icon: Send, label: 'Gửi yêu cầu', perm: 'don_tu.gui' },
    { to: '/bac-si/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  ky_thuat_vien: [
    { to: '/ky-thuat-vien/xet-nghiem', icon: FlaskConical, label: 'Xét nghiệm & CĐHA', perm: 'xet_nghiem.xem' },
    { to: '/ky-thuat-vien/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/ky-thuat-vien/thong-ke', icon: BarChart3, label: 'Báo cáo & Thống kê', perm: 'xet_nghiem.thong_ke' },
    { to: '/ky-thuat-vien/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực', perm: 'lich_truc.xem' },
    { to: '/ky-thuat-vien/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt', perm: 'cham_cong.ca_nhan' },
    { to: '/ky-thuat-vien/gui-don', icon: Send, label: 'Gửi yêu cầu', perm: 'don_tu.gui' },
    { to: '/ky-thuat-vien/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  nhan_vien_nha_thuoc: [
    { to: '/nha-thuoc/don-thuoc', icon: Pill, label: 'Cấp phát đơn thuốc', perm: 'thuoc.xuat_kho' },
    { to: '/nha-thuoc/kho-thuoc', icon: Layers, label: 'Kho thuốc & Tồn kho', perm: 'thuoc.xem' },
    { to: '/nha-thuoc/mua-hang', icon: PackagePlus, label: 'Mua hàng & Nhập thuốc', perm: 'thuoc.nhap_kho' },
    { to: '/nha-thuoc/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/nha-thuoc/thong-ke', icon: BarChart3, label: 'Báo cáo & Dự báo nhu cầu', perm: 'thuoc.thong_ke' },
    { to: '/nha-thuoc/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực', perm: 'lich_truc.xem' },
    { to: '/nha-thuoc/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt', perm: 'cham_cong.ca_nhan' },
    { to: '/nha-thuoc/gui-don', icon: Send, label: 'Gửi yêu cầu', perm: 'don_tu.gui' },
    { to: '/nha-thuoc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  nha_thuoc: [
    { to: '/nha-thuoc/don-thuoc', icon: Pill, label: 'Cấp phát đơn thuốc', perm: 'thuoc.xuat_kho' },
    { to: '/nha-thuoc/kho-thuoc', icon: Layers, label: 'Kho thuốc & Tồn kho', perm: 'thuoc.xem' },
    { to: '/nha-thuoc/mua-hang', icon: PackagePlus, label: 'Mua hàng & Nhập thuốc', perm: 'thuoc.nhap_kho' },
    { to: '/nha-thuoc/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/nha-thuoc/thong-ke', icon: BarChart3, label: 'Báo cáo & Dự báo nhu cầu', perm: 'thuoc.thong_ke' },
    { to: '/nha-thuoc/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực', perm: 'lich_truc.xem' },
    { to: '/nha-thuoc/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt', perm: 'cham_cong.ca_nhan' },
    { to: '/nha-thuoc/gui-don', icon: Send, label: 'Gửi yêu cầu', perm: 'don_tu.gui' },
    { to: '/nha-thuoc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  thu_ngan: [
    { to: '/thu-ngan/hoa-don', icon: Receipt, label: 'Thu viện phí & Biên lai (AR)', perm: 'hoa_don.xem' },
    { to: '/thu-ngan/chi-tra-nha-cung-cap', icon: DollarSign, label: 'Sổ chi trả & Chi phí (AP/OPEX)', perm: 'hoa_don.chi_tra_ncc' },
    { to: '/thu-ngan/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/thu-ngan/thong-ke', icon: BarChart3, label: 'Báo cáo sổ quỹ & Chốt ca', perm: 'hoa_don.chot_ca' },
    { to: '/thu-ngan/lich-lam-viec', icon: Clock, label: 'Lịch làm việc & Ca trực', perm: 'lich_truc.xem' },
    { to: '/thu-ngan/cham-cong', icon: ScanFace, label: 'Chấm công khuôn mặt', perm: 'cham_cong.ca_nhan' },
    { to: '/thu-ngan/gui-don', icon: Send, label: 'Gửi yêu cầu', perm: 'don_tu.gui' },
    { to: '/thu-ngan/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  quan_tri_vien: [
    { to: '/quan-tri/tong-quan', icon: BarChart3, label: 'Tổng quan hệ thống', perm: 'he_thong.tong_quan' },
    { to: '/quan-tri/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/quan-tri/nhan-vien', icon: Users, label: 'Quản lý nhân sự', perm: 'he_thong.nhan_vien' },
    { to: '/quan-tri/benh-nhan', icon: UserCheck, label: 'Tài khoản bệnh nhân', perm: 'he_thong.benh_nhan' },
    { to: '/quan-tri/phan-quyen', icon: Shield, label: 'Phân quyền & Vai trò', perm: 'he_thong.phan_quyen' },
    { to: '/quan-tri/danh-muc', icon: Layers, label: 'Danh mục dùng chung', perm: 'he_thong.danh_muc' },
    { to: '/quan-tri/sao-luu', icon: Database, label: 'Sao lưu & CSDL', perm: 'he_thong.sao_luu' },
    { to: '/quan-tri/nhat-ky', icon: FileText, label: 'Nhật ký hệ thống', perm: 'he_thong.nhat_ky' },
    { to: '/quan-tri/cai-dat-cham-cong', icon: ScanFace, label: 'Cài đặt chấm công & WiFi', perm: 'he_thong.cai_dat_cham_cong' },
    { to: '/quan-tri/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  quan_tri_vien_cap_cao: [
    { to: '/quan-tri/tong-quan', icon: BarChart3, label: 'Tổng quan hệ thống' },
    { to: '/quan-tri/office', icon: MessageSquare, label: 'Office' },
    { to: '/quan-tri/nhan-vien', icon: Users, label: 'Quản lý nhân sự' },
    { to: '/quan-tri/benh-nhan', icon: UserCheck, label: 'Tài khoản bệnh nhân' },
    { to: '/quan-tri/phan-quyen', icon: Shield, label: 'Phân quyền & Vai trò' },
    { to: '/quan-tri/danh-muc', icon: Layers, label: 'Danh mục dùng chung' },
    { to: '/quan-tri/sao-luu', icon: Database, label: 'Sao lưu & CSDL' },
    { to: '/quan-tri/nhat-ky', icon: FileText, label: 'Nhật ký hệ thống' },
    { to: '/quan-tri/cai-dat-cham-cong', icon: ScanFace, label: 'Cài đặt chấm công & WiFi' },
    { to: '/quan-tri/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
  ban_giam_doc: [
    { to: '/ban-giam-doc/thong-ke', icon: BarChart3, label: 'Dashboard điều hành', perm: 'dieu_hanh.dashboard' },
    { to: '/ban-giam-doc/office', icon: MessageSquare, label: 'Office', perm: 'office.truy_cap' },
    { to: '/ban-giam-doc/bang-gia-dich-vu', icon: DollarSign, label: 'Quản lý bảng giá dịch vụ', perm: 'dieu_hanh.bang_gia' },
    { to: '/ban-giam-doc/tai-chinh', icon: FileText, label: 'Báo cáo toàn diện BV', perm: 'bao_cao.doanh_thu' },
    { to: '/ban-giam-doc/bao-cao-bo-phan', icon: ClipboardList, label: 'Báo cáo bộ phận & Chỉ đạo', perm: 'dieu_hanh.bao_cao_bo_phan' },
    { to: '/ban-giam-doc/bai-viet', icon: BookOpen, label: 'Duyệt bài viết y khoa', perm: 'bai_viet.phe_duyet' },
    { to: '/ban-giam-doc/du-bao-luong', icon: TrendingUp, label: 'Dự báo lưu lượng', perm: 'dieu_hanh.du_bao_ai' },
    { to: '/ban-giam-doc/xep-lich', icon: Calendar, label: 'Phân ca làm việc', perm: 'lich_truc.phan_ca' },
    { to: '/ban-giam-doc/quan-ly-cham-cong', icon: ScanFace, label: 'Quản lý chấm công', perm: 'cham_cong.quan_ly' },
    { to: '/ban-giam-doc/tra-cuu', icon: FileSearch, label: 'Tra cứu tổng hợp', perm: 'dieu_hanh.tra_cuu' },
    { to: '/ban-giam-doc/phe-duyet-don', icon: CheckSquare, label: 'Phê duyệt yêu cầu', perm: 'don_tu.phe_duyet' },
    { to: '/ban-giam-doc/ca-nhan', icon: User, label: 'Thông tin cá nhân' },
  ],
};

export function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, updatePermissions } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Tự động đóng menu mobile khi nhấn phím Esc hoặc khi xoay ngang sang màn hình lớn
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileOpen]);

  // Đồng bộ quyền hạn thực tế từ Backend theo thời gian thực (không cần đăng xuất)
  useEffect(() => {
    if (!user || user.vaiTro === 'benh_nhan') return;
    let isMounted = true;
    apiGet('/auth/my-permissions')
      .then((res) => {
        if (!isMounted) return;
        const perms = res?.data?.quyenHans || res?.quyenHans;
        if (Array.isArray(perms) && updatePermissions) {
          updatePermissions(perms);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const allMenuItems = MENU_CONFIG[user?.vaiTro] || [];
  const menuItems = allMenuItems.filter(item => {
    // Nếu item không cấu hình perm thì mọi nhân sự trong vai trò đều truy cập được (vd: Thông tin cá nhân)
    if (!item.perm) return true;
    // Super Admin gốc (Root) luôn có toàn quyền kiểm soát
    if (user?.vaiTro === 'quan_tri_vien_cap_cao') return true;
    // Kiểm tra danh sách quyền thực tế của nhân sự được cấp động trong CSDL
    if (Array.isArray(user?.quyenHans)) {
      return user.quyenHans.includes(item.perm);
    }
    return false;
  });

  const activeMenuItem = menuItems.find((item) => location.pathname.startsWith(item.to)) || menuItems[0];
  const ActivePageIcon = activeMenuItem?.icon || Stethoscope;

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
    <div className="flex h-dvh-safe bg-medical-bg overflow-hidden relative print:h-auto print:overflow-visible print:bg-white">
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
          'fixed inset-y-0 left-0 w-64 max-w-[82vw] bg-white z-50 md:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out print:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 shadow-xs">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Phòng Khám</p>
              <p className="text-[11px] text-gray-500">Đa Khoa</p>
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
        <nav className="flex-1 overflow-y-auto med-scrollbar py-2.5 px-2 space-y-0.5">
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
        <div className="border-t border-gray-100 p-3 bg-gray-50/50 pb-safe">
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
          collapsed ? 'w-16' : 'w-56 lg:w-60',
        )}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center border-b border-gray-100 h-14 px-4',
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
        <nav className="flex-1 overflow-y-auto med-scrollbar py-2.5 px-2 space-y-0.5">
          {menuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors',
                collapsed && 'justify-center px-2',
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
              <p className="text-[11px] text-gray-500 truncate">{VAI_TRO_LABEL[user?.vaiTro] || user?.vaiTro}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-danger-main transition-colors',
              collapsed && 'justify-center px-2',
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
        <header className="flex items-center justify-between h-14 bg-white border-b border-gray-200 px-3 sm:px-5 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            {/* Nút Hamburger trên điện thoại (< 768px) */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex-shrink-0"
              title="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Nút Thu gọn / Mở rộng Sidebar trên Laptop & Máy tính bảng (≥ 768px) */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0"
              title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Ngữ cảnh Trang Hiện Tại (Breadcrumb trực quan trên mọi thiết bị) */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
                <ActivePageIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                {activeMenuItem?.label || 'Phòng Khám Đa Khoa'}
              </span>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200/80">
                {VAI_TRO_LABEL[user?.vaiTro] || user?.vaiTro}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Nút Chuyển đổi Giao diện Sáng / Tối Toàn hệ thống */}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
              title={darkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>

            {/* Notification Dropdown */}
            <NotificationDropdown />

            {/* Thông tin nhanh & Icon Người */}
            <div
              onClick={() => navigate(getProfileRoute())}
              className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-gray-200 cursor-pointer group"
              title="Xem thông tin cá nhân"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[140px] group-hover:text-primary-600 transition-colors">
                  {user?.hoTen || user?.tenDangNhap}
                </p>
                <p className="text-[10px] text-gray-500 leading-tight">
                  {VAI_TRO_LABEL[user?.vaiTro] || user?.vaiTro}
                </p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 group-hover:bg-primary-200 transition-colors shadow-2xs overflow-hidden flex-shrink-0"
                data-testid="btn-header-profile"
              >
                {user?.anhDaiDien ? (
                  <img
                    src={toBackendUrl(user.anhDaiDien)}
                    alt={user?.hoTen || user?.tenDangNhap}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content với padding linh hoạt tương thích điện thoại & máy tính */}
        <main className="flex-1 overflow-y-auto med-scrollbar p-2.5 sm:p-4 md:p-5 print:p-0 print:overflow-visible print:h-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
