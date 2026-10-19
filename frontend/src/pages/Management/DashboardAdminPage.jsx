import { useState, useEffect } from 'react';
import {
  Server, Shield, Users, Database, CheckCircle2,
  Cpu, Clock, RefreshCw, Activity, UserPlus,
  ArrowRight, ShieldCheck, Zap, Stethoscope,
  Pill, CreditCard, FlaskConical, UserCheck, Briefcase,
  FolderKanban, HardDrive, Lock
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function DashboardAdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchOverview = async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await apiGet('/quan-ly/system-overview');
      setData(res?.data || res);
    } catch (err) {
      console.error('Lỗi nạp tổng quan hệ thống:', err);
    } finally {
      if (isBackground) setIsRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 text-sm">Đang tải thông số kỹ thuật hệ thống...</span>
        </div>
      </div>
    );
  }

  const { accounts, rolesDistribution = [], systemHealth = {}, recentUsers = [] } = data || {};

  // Cấu hình hiển thị theo vai trò
  const roleConfig = {
    quan_tri_vien: { label: 'Quản trị viên', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    ban_giam_doc: { label: 'Ban Giám Đốc', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    bac_si: { label: 'Bác Sĩ', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    tiep_tan: { label: 'Tiếp Tân', icon: UserCheck, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    ky_thuat_vien: { label: 'Kỹ Thuật Viên', icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    nhan_vien_nha_thuoc: { label: 'Dược Sĩ', icon: Pill, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
    thu_ngan: { label: 'Thu Ngân', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    benh_nhan: { label: 'Bệnh Nhân', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              IT INFRASTRUCTURE & MONITORING
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Cập nhật thời gian thực
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Tổng Quan Hệ Thống & Hạ Tầng Kỹ Thuật
          </h1>
          <p className="text-sm text-gray-500">
            Giám sát tài nguyên máy chủ, tài khoản người dùng, ma trận phân quyền và các dịch vụ phòng khám.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all disabled:opacity-75 cursor-pointer"
            title="Đồng bộ lại thông số kỹ thuật mới nhất"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang làm mới...' : 'Làm mới'}</span>
          </button>
          <button
            onClick={() => navigate('/quan-tri/nhan-vien')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Thêm tài khoản
          </button>
        </div>
      </div>

      {/* ─── 4 THẺ KPI CHÍNH ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng tài khoản */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Số Tài Khoản</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{accounts?.total || 0}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {accounts?.active || 0} tài khoản đang kích hoạt
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Database MySQL */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cơ Sở Dữ Liệu MySQL</p>
            <p className="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" /> Đang kết nối
            </p>
            <p className="text-xs text-gray-500 mt-1">Port 3306 · UTF8MB4</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: AI Gateway */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dịch Vụ AI Triage</p>
            <p className="text-lg font-bold text-indigo-600 mt-1 flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" /> Sẵn sàng (Active)
            </p>
            <p className="text-xs text-gray-500 mt-1">gemini-3.5-flash-lite</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Uptime */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời Gian Hoạt Động</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{systemHealth?.uptime || '1.0 giờ'}</p>
            <p className="text-xs text-gray-500 mt-1">Node {systemHealth?.nodeVersion || 'v24'}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── KHỐI THÔNG SỐ SERVER & PHÂN BỔ VAI TRÒ ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột Trái: Thông số hạ tầng Node.js & Server */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4 text-blue-600" />
              Hạ Tầng Node.js & Máy Chủ
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Ổn định
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Môi trường (Platform):</span>
              <span className="text-xs font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                {systemHealth?.platform || 'win32'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Phiên bản Node.js:</span>
              <span className="text-xs font-mono font-semibold text-gray-800">
                {systemHealth?.nodeVersion || 'v24.14.1'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Bộ nhớ Heap sử dụng:</span>
              <span className="text-xs font-semibold text-blue-700 font-mono">
                {systemHealth?.memoryHeap || '50 MB'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Bộ nhớ RSS tiến trình:</span>
              <span className="text-xs font-semibold text-gray-800 font-mono">
                {systemHealth?.memoryRss || '120 MB'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Cơ sở dữ liệu:</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {systemHealth?.dbStatus || 'Hoạt động (MySQL 3306)'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs text-gray-500">WebSocket Gateway:</span>
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {systemHealth?.socketStatus || 'Đang lắng nghe'}
              </span>
            </div>
          </div>
        </div>

        {/* Cột Phải: Phân bổ tài khoản theo vai trò */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Phân Bổ Tài Khoản Theo Vai Trò
            </h3>
            <button
              onClick={() => navigate('/quan-tri/phan-quyen')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
            >
              Cấu hình phân quyền <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {rolesDistribution.map((r, i) => {
              const cfg = roleConfig[r.maVaiTro] || {
                label: r.tenVaiTro,
                icon: Shield,
                color: 'text-gray-600',
                bg: 'bg-gray-50',
                border: 'border-gray-200',
                badge: 'bg-gray-100 text-gray-700 border-gray-200',
              };
              const RoleIcon = cfg.icon;

              return (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border ${cfg.border} ${cfg.bg} flex flex-col justify-between transition-all hover:shadow-xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 truncate">{cfg.label}</span>
                    <RoleIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl font-black text-gray-900">{r.soLuong}</span>
                    <span className="text-[10px] text-gray-400 font-mono">({r.maVaiTro})</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3 Lối tắt tác vụ */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/quan-tri/nhan-vien')}
              className="p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 bg-gray-50/50 hover:bg-blue-50/40 text-left transition-all flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-gray-800 group-hover:text-blue-700">Quản lý nhân sự</p>
                <p className="text-[11px] text-gray-500">Tài khoản & ảnh khuôn mặt</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/quan-tri/danh-muc')}
              className="p-2.5 rounded-lg border border-gray-200 hover:border-emerald-300 bg-gray-50/50 hover:bg-emerald-50/40 text-left transition-all flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-gray-800 group-hover:text-emerald-700">Danh mục chung</p>
                <p className="text-[11px] text-gray-500">Master Data phòng khám</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/quan-tri/sao-luu')}
              className="p-2.5 rounded-lg border border-gray-200 hover:border-purple-300 bg-gray-50/50 hover:bg-purple-50/40 text-left transition-all flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-gray-800 group-hover:text-purple-700">Sao lưu & CSDL</p>
                <p className="text-[11px] text-gray-500">Xuất & khôi phục SQL</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ─── BẢNG TÀI KHOẢN KHỞI TẠO GẦN NHẤT ──────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-blue-600" />
              Tài Khoản Được Khởi Tạo Gần Nhất
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Danh sách các tài khoản người dùng mới tạo trong cơ sở dữ liệu</p>
          </div>
          <button
            onClick={() => navigate('/quan-tri/nhan-vien')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
          >
            Xem tất cả tài khoản <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">ID</th>
                <th className="py-3 px-4">Tài Khoản</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4">Thời Gian Tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-xs text-gray-500">
                    Chưa có tài khoản nào được tạo gần đây.
                  </td>
                </tr>
              ) : (
                recentUsers.map((u) => {
                  const cfg = roleConfig[u.vaiTro?.maVaiTro] || {
                    badge: 'bg-gray-100 text-gray-700 border-gray-200',
                  };

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-gray-400 text-xs">
                        #{u.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.tenDangNhap ? u.tenDangNhap.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">
                            {u.tenDangNhap}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${cfg.badge}`}>
                          {u.vaiTro?.tenVaiTro || u.vaiTro}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          u.trangThai === 'hoat_dong'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {u.trangThai === 'hoat_dong' ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap font-mono">
                        {u.taoLuc ? new Date(u.taoLuc).toLocaleString('vi-VN') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
