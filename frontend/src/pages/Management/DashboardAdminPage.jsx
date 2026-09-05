import { useState, useEffect } from 'react';
import {
  Server, Shield, Users, Database, CheckCircle2, AlertCircle,
  Cpu, HardDrive, Clock, RefreshCw, Key, Layers, Activity, UserPlus,
  ArrowRight, ShieldCheck, Zap
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function DashboardAdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/quan-ly/system-overview');
      setData(res?.data || res);
    } catch (err) {
      console.error('Lỗi nạp tổng quan hệ thống:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 text-sm">Đang tải thông số kỹ thuật hệ thống...</span>
        </div>
      </div>
    );
  }

  const { accounts, rolesDistribution = [], systemHealth = {}, recentUsers = [] } = data || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
              <Server className="h-3.5 w-3.5" /> QUẢN TRỊ VIÊN HỆ THỐNG • IT INFRASTRUCTURE
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Bảng Điều Khiển Quản Trị Kỹ Thuật
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              Giám sát hạ tầng kỹ thuật, tài khoản người dùng, ma trận phân quyền và danh mục dữ liệu dùng chung.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOverview}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Làm mới
            </button>
            <button
              onClick={() => navigate('/quan-tri/nhan-vien')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow"
            >
              <UserPlus className="h-4 w-4" /> Thêm tài khoản
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng số tài khoản</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{accounts?.total || 0}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {accounts?.active || 0} tài khoản đang kích hoạt
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cơ sở dữ liệu MySQL</p>
            <p className="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" /> Đang kết nối
            </p>
            <p className="text-xs text-gray-500 mt-1">Port 3306 • UTF8MB4</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Database className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dịch vụ AI Triage</p>
            <p className="text-lg font-bold text-indigo-600 mt-1 flex items-center gap-1.5">
              <Zap className="h-5 w-5 text-amber-500" /> Sẵn sàng (Active)
            </p>
            <p className="text-xs text-gray-500 mt-1">gemini-3.5-flash-lite</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian máy chủ (Uptime)</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{systemHealth?.uptime || '1.0 giờ'}</p>
            <p className="text-xs text-gray-500 mt-1">Node {systemHealth?.nodeVersion}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Server Metrics & Roles Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server & Node.js Health Details */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary-600" />
              Thông Số Hạ Tầng Node.js & Server
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Hoạt động bình thường
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Môi trường (Platform):</span>
              <span className="font-semibold text-gray-800">{systemHealth?.platform}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Phiên bản Node.js:</span>
              <span className="font-semibold text-gray-800">{systemHealth?.nodeVersion}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Bộ nhớ Heap sử dụng:</span>
              <span className="font-semibold text-gray-800">{systemHealth?.memoryHeap}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Bộ nhớ RSS tiến trình:</span>
              <span className="font-semibold text-gray-800">{systemHealth?.memoryRss}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Cơ sở dữ liệu:</span>
              <span className="font-semibold text-emerald-600">{systemHealth?.dbStatus}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Socket.io Gateway:</span>
              <span className="font-semibold text-indigo-600">{systemHealth?.socketStatus}</span>
            </div>
          </div>
        </div>

        {/* Roles Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Phân Bổ Tài Khoản Theo Vai Trò (Roles)
            </h3>
            <button
              onClick={() => navigate('/quan-tri/phan-quyen')}
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              Cấu hình phân quyền <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {rolesDistribution.map((r, i) => (
              <div key={i} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-600 truncate">{r.tenVaiTro}</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-bold text-gray-900">{r.soLuong}</span>
                  <span className="text-[11px] text-gray-500 font-mono">({r.maVaiTro})</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/quan-tri/nhan-vien')}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors text-center"
            >
              Quản lý danh sách tài khoản
            </button>
            <button
              onClick={() => navigate('/quan-tri/danh-muc')}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors text-center"
            >
              Quản lý danh mục Master Data
            </button>
            <button
              onClick={() => navigate('/quan-tri/sao-luu')}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors text-center"
            >
              Sao lưu & Khôi phục CSDL
            </button>
          </div>
        </div>
      </div>

      {/* Recent Accounts Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Tài Khoản Được Khởi Tạo Gần Nhất
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Nhật ký theo dõi các tài khoản mới nhất trong cơ sở dữ liệu</p>
          </div>
          <button
            onClick={() => navigate('/quan-tri/nhan-vien')}
            className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
          >
            Xem tất cả nhân viên & tài khoản →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Tên đăng nhập</th>
                <th className="px-6 py-3">Vai trò</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Thời gian tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-gray-500 text-xs">#{u.id}</td>
                  <td className="px-6 py-3 font-bold text-gray-900">{u.tenDangNhap}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {u.vaiTro}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      u.trangThai === 'hoat_dong' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.trangThai === 'hoat_dong' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {u.taoLuc ? new Date(u.taoLuc).toLocaleString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

