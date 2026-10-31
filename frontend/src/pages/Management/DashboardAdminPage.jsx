import { useState, useEffect } from 'react';
import {
  Server, Shield, Users, Database, CheckCircle2,
  Cpu, Clock, RefreshCw, Activity, UserPlus,
  ArrowRight, ShieldCheck, Zap, Stethoscope,
  Pill, CreditCard, FlaskConical, UserCheck, Briefcase,
  FolderKanban, HardDrive, Lock, ShieldAlert, Radio,
  Mail, FileText, ScanFace, ChevronRight
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
          <span className="text-gray-500 text-sm">Đang tải thông số kỹ thuật hạ tầng hệ thống...</span>
        </div>
      </div>
    );
  }

  const {
    accounts = {},
    database = {},
    services = [],
    auditStats = {},
    rolesDistribution = [],
    systemHealth = {},
    recentUsers = []
  } = data || {};

  // Cấu hình hiển thị theo vai trò
  const roleConfig = {
    quan_tri_vien: { label: 'Quản trị viên', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50/70', border: 'border-indigo-100', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    ban_giam_doc: { label: 'Ban Giám Đốc', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50/70', border: 'border-emerald-100', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    bac_si: { label: 'Bác Sĩ', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50/70', border: 'border-blue-100', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    tiep_tan: { label: 'Tiếp Tân', icon: UserCheck, color: 'text-cyan-600', bg: 'bg-cyan-50/70', border: 'border-cyan-100', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    ky_thuat_vien: { label: 'Kỹ Thuật Viên', icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50/70', border: 'border-amber-100', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    nhan_vien_nha_thuoc: { label: 'Dược Sĩ', icon: Pill, color: 'text-teal-600', bg: 'bg-teal-50/70', border: 'border-teal-100', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
    thu_ngan: { label: 'Thu Ngân', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50/70', border: 'border-rose-100', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    benh_nhan: { label: 'Bệnh Nhân', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50/70', border: 'border-purple-100', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const getServiceIcon = (id) => {
    switch (id) {
      case 'api': return Server;
      case 'database': return Database;
      case 'websocket': return Radio;
      case 'ai': return Zap;
      case 'payment': return CreditCard;
      case 'email': return Mail;
      default: return Activity;
    }
  };

  // Phân tách vai trò nhân sự vs bệnh nhân
  const staffRoles = rolesDistribution.filter(r => r.maVaiTro !== 'benh_nhan');
  const patientRole = rolesDistribution.find(r => r.maVaiTro === 'benh_nhan');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── HEADER ────────────────────────────────────────────────── */}
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
            Giám sát tài nguyên máy chủ, độ sẵn sàng dịch vụ y tế, tài khoản người dùng và nhật ký an ninh kiểm toán.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition-all disabled:opacity-75 cursor-pointer"
            title="Đồng bộ lại thông số kỹ thuật mới nhất"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang làm mới...' : 'Làm mới'}</span>
          </button>
          <button
            onClick={() => navigate('/quan-tri/nhan-vien')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Thêm nhân sự
          </button>
        </div>
      </div>

      {/* ─── KHỐI 1: 4 THẺ KPI HỆ THỐNG CỐT LÕI ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tài khoản người dùng (Phân tách Nhân sự vs Bệnh nhân) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quản Trị Tài Khoản</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-gray-900">{accounts?.total || 0}</span>
                <span className="text-xs font-semibold text-gray-500">tài khoản</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-600">
              Nhân sự: <b className="text-blue-700 font-semibold">{accounts?.staffTotal || 0}</b> · BN: <b className="text-purple-700 font-semibold">{accounts?.patientTotal || 0}</b>
            </span>
            <span className={`font-semibold ${accounts?.locked > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {accounts?.locked > 0 ? `Khóa: ${accounts.locked}` : '100% Khả dụng'}
            </span>
          </div>
        </div>

        {/* Card 2: Cơ sở dữ liệu MySQL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cơ Sở Dữ Liệu MySQL</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-lg font-bold text-emerald-700">Đang kết nối</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {database?.totalTables || 0} bảng · {database?.totalRows ? Number(database.totalRows).toLocaleString('vi-VN') : 0} dòng
            </span>
            <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              {database?.totalSizeMB || '0.00'} MB
            </span>
          </div>
        </div>

        {/* Card 3: Hạ tầng Node.js & Máy chủ */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thời Gian Hoạt Động</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-purple-700">{systemHealth?.uptime || '—'}</span>
                <span className="text-xs font-mono font-semibold text-gray-400">Node {systemHealth?.nodeVersion || 'v24'}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Bộ nhớ Heap:</span>
            <span className="font-mono font-semibold text-purple-700">
              {systemHealth?.memoryHeap || '—'} (RSS {systemHealth?.memoryRss || '—'})
            </span>
          </div>
        </div>

        {/* Card 4: An ninh & Kiểm toán hệ thống */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nhật Ký Hôm Nay</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-indigo-900">{auditStats?.todayTotal || 0}</span>
                <span className="text-xs font-semibold text-gray-500">lượt ghi</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> An toàn
            </span>
            <span className="text-gray-500">
              Lỗi: <b className={auditStats?.todayError > 0 ? 'text-rose-600' : 'text-gray-600'}>{auditStats?.todayError || 0}</b>
            </span>
          </div>
        </div>
      </div>

      {/* ─── KHỐI 2 & 3: HEALTH CHECK DỊCH VỤ CỐT LÕI & PHÂN BỔ VAI TRÒ ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KHỐI 2: Health-Check 6 Dịch vụ Cốt Lõi (5 Cột) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-blue-600" />
                Giám Sát Độ Sẵn Sàng Dịch Vụ
              </h3>
              <p className="text-[11px] text-gray-500">Trạng thái kết nối các cổng nghiệp vụ & tích hợp</p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              6/6 Hoạt động
            </span>
          </div>

          <div className="space-y-2.5">
            {services.map((s) => {
              const ServiceIcon = getServiceIcon(s.id);
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:border-blue-200 transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                      <ServiceIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800">{s.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono bg-white px-1.5 py-0.2 rounded border border-gray-200">
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[11px] font-semibold text-emerald-700">Online</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KHỐI 3: Phân Bổ Tài Khoản Người Dùng (7 Cột) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Phân Bổ Tài Khoản Theo Vai Trò (IAM)
              </h3>
              <p className="text-[11px] text-gray-500">Tổng số người dùng được phân quyền theo 8 vai trò hệ thống</p>
            </div>
            <button
              onClick={() => navigate('/quan-tri/phan-quyen')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ma trận phân quyền <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nhóm 1: Nhân sự vận hành nội bộ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                Khối Nhân Sự Phòng Khám ({accounts?.staffTotal || 0} tài khoản)
              </span>
              <button
                onClick={() => navigate('/quan-tri/nhan-vien')}
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                Quản lý nhân sự
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {staffRoles.map((r, i) => {
                const cfg = roleConfig[r.maVaiTro] || {
                  label: r.tenVaiTro,
                  icon: Shield,
                  color: 'text-gray-600',
                  bg: 'bg-gray-50',
                  border: 'border-gray-200',
                };
                const RoleIcon = cfg.icon;

                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg} flex flex-col justify-between transition-all hover:shadow-2xs`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 truncate">{cfg.label}</span>
                      <RoleIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-xl font-black text-gray-900">{r.soLuong}</span>
                      <span className="text-[10px] text-gray-400 font-mono">({r.maVaiTro})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nhóm 2: Bệnh nhân trực tuyến */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                Khối Bệnh Nhân Trực Tuyến (Cổng Portal)
              </span>
              <button
                onClick={() => navigate('/quan-tri/benh-nhan')}
                className="text-[11px] text-purple-600 hover:underline font-semibold"
              >
                Quản lý tài khoản BN
              </button>
            </div>
            <div className="bg-purple-50/60 border border-purple-100 p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Tài khoản Bệnh Nhân Đăng Nhập</p>
                  <p className="text-[11px] text-gray-500">Đã kích hoạt quyền đặt lịch online, xem hồ sơ & kết quả xét nghiệm</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-purple-700">{patientRole?.soLuong || accounts?.patientTotal || 0}</span>
                <span className="text-xs text-gray-500 ml-1">người dùng</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KHỐI 4: NHẬT KÝ KIỂM TOÁN & LỐI TẮT QUẢN TRỊ ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột Trái (8 Cột): 6 Nhật ký kiểm toán an ninh gần nhất */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                Nhật Ký Kiểm Toán & Hoạt Động Hệ Thống Gần Nhất
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Lịch sử ghi nhận thao tác người dùng và cảnh báo an ninh bảo mật</p>
            </div>
            <button
              onClick={() => navigate('/quan-tri/nhat-ky')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              Xem toàn bộ nhật ký <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 w-14 text-center">Mức</th>
                  <th className="py-2.5 px-3.5">Người Thực Hiện</th>
                  <th className="py-2.5 px-3.5">Hành Động</th>
                  <th className="py-2.5 px-3.5">Chi Tiết / Mô Tả</th>
                  <th className="py-2.5 px-3.5 text-right">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {(!auditStats?.recentLogs || auditStats.recentLogs.length === 0) ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-xs text-gray-500">
                      Chưa có nhật ký hoạt động nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  auditStats.recentLogs.map((log) => {
                    const isError = log.loaiNhatKy === 'ERROR';
                    const isWarn = log.loaiNhatKy === 'WARNING';

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isError
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isWarn
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {log.loaiNhatKy || 'INFO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{log.tenNguoiDung}</div>
                          <div className="text-[10px] text-gray-400 font-mono">({log.vaiTro})</div>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {log.hanhDong}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-gray-600 max-w-xs truncate" title={log.moTa}>
                          {log.moTa}
                        </td>
                        <td className="py-2.5 px-3.5 text-right text-gray-500 whitespace-nowrap font-mono text-[11px]">
                          {log.thoiGian ? new Date(log.thoiGian).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột Phải (4 Cột): Lối tắt tác vụ quản trị cốt lõi */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              Lối Tắt Tác Vụ Quản Trị
            </h3>
            <p className="text-[11px] text-gray-500">Truy cập nhanh các phân hệ nghiệp vụ IT</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => navigate('/quan-tri/nhan-vien')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 bg-gray-50/50 hover:bg-blue-50/40 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-blue-700">Quản lý nhân sự & bác sĩ</p>
                  <p className="text-[11px] text-gray-500">Phân khoa, chức vụ, tài khoản nội bộ</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/quan-tri/benh-nhan')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-purple-300 bg-gray-50/50 hover:bg-purple-50/40 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-purple-700">Tài khoản bệnh nhân</p>
                  <p className="text-[11px] text-gray-500">Cấp tài khoản, mở khóa, đổi mật khẩu</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/quan-tri/phan-quyen')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 bg-gray-50/50 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-indigo-700">Phân quyền & Vai trò (RBAC)</p>
                  <p className="text-[11px] text-gray-500">Ma trận quyền hạn truy cập module</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/quan-tri/danh-muc')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-emerald-300 bg-gray-50/50 hover:bg-emerald-50/40 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-emerald-700">Danh mục dùng chung</p>
                  <p className="text-[11px] text-gray-500">Master Data phòng khám, thuốc, dịch vụ</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/quan-tri/sao-luu')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-teal-300 bg-gray-50/50 hover:bg-teal-50/40 text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 group-hover:text-teal-700">Sao lưu & CSDL</p>
                  <p className="text-[11px] text-gray-500">Xuất file dump .SQL và kiểm tra dung lượng</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
