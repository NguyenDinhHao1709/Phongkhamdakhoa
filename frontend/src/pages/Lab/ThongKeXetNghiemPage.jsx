import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import GuiBaoCaoModal from '../../components/Report/GuiBaoCaoModal';
import LichSuBaoCaoModal from '../../components/Report/LichSuBaoCaoModal';
import InBaoCaoXetNghiemModal from './InBaoCaoXetNghiemModal';
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Printer,
  Send,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Check,
  Calendar,
  X,
  UserRound,
  FileText,
  Scan,
  TrendingUp,
  Layers,
  ArrowRight,
  Star,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Smile,
  Award,
  MessageCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#2563EB', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];

const TRANG_THAI_CONFIG = {
  cho_lay_mau: { label: 'Chờ lấy mẫu', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  dang_lay_mau: { label: 'Đang lấy mẫu', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  dang_xu_ly: { label: 'Đang xử lý', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  co_ket_qua: { label: 'Đã có kết quả', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  huy: { label: 'Đã hủy', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function ThongKeXetNghiemPage() {
  const { user } = useAuthStore();
  const [timeRange, setTimeRange] = useState('thang_nay');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [scope, setScope] = useState('all'); // 'all' (toàn khoa) | 'ca_nhan' (chuyên môn cá nhân)
  const [isGuiBaoCaoOpen, setIsGuiBaoCaoOpen] = useState(false);
  const [isLichSuBaoCaoOpen, setIsLichSuBaoCaoOpen] = useState(false);
  const [openBaoCaoModal, setOpenBaoCaoModal] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['thong-ke-xet-nghiem', user?.id, timeRange, tuNgay, denNgay, scope],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tuNgay && denNgay) {
        params.append('tuNgay', tuNgay);
        params.append('denNgay', denNgay);
      } else if (timeRange) {
        params.append('range', timeRange);
      }
      if (scope) {
        params.append('scope', scope);
      }
      return apiGet(`/xet-nghiem/thong-ke?${params.toString()}`);
    },
  });

  const stats = data?.data;

  const handleRefresh = async () => {
    await refetch();
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 2000);
  };

  const handleExportCSV = () => {
    const list = stats?.danhSachMoiNhat || [];
    if (list.length === 0) {
      alert('Không có dữ liệu để xuất báo cáo.');
      return;
    }
    const headers = [
      'Mã Chỉ Định',
      'Tên Dịch Vụ',
      'Loại CLS',
      'Bệnh Nhân',
      'Mã BN',
      'Trạng Thái',
      'Thời Gian Chỉ Định',
      'Thời Gian Có KQ',
    ];
    const rows = list.map((c) => [
      c.id,
      `"${c.tenDichVu || ''}"`,
      c.loai === 'cdha' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm máu & Sinh hóa',
      `"${c.benhNhan?.hoTen || ''}"`,
      c.benhNhan?.maBenhNhan || '',
      TRANG_THAI_CONFIG[c.trangThai]?.label || c.trangThai,
      c.thoiGianChiDinh ? new Date(c.thoiGianChiDinh).toLocaleString('vi-VN') : '',
      c.thoiGianCoKetQua ? new Date(c.thoiGianCoKetQua).toLocaleString('vi-VN') : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaoCao_XetNghiem_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const getKyBaoCaoLabel = () => {
    if (tuNgay && denNgay) return `Từ ${formatDate(tuNgay)} đến ${formatDate(denNgay)}`;
    if (tuNgay) return `Từ ngày ${formatDate(tuNgay)}`;
    if (timeRange === 'hom_nay') return `Hôm nay (${formatDate(new Date())})`;
    if (timeRange === 'tuan_nay') return 'Tuần này (7 ngày qua)';
    if (timeRange === 'thang_nay') return `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    if (timeRange === 'quy_nay') return `Quý ${Math.floor(new Date().getMonth() / 3) + 1}/${new Date().getFullYear()}`;
    if (timeRange === 'tat_ca') return 'Toàn thời gian';
    return `Kỳ ${timeRange || 'thống kê'}`;
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* ─── 1. HEADER BÁO CÁO HOẠT ĐỘNG XÉT NGHIỆM & CLS ─── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-100">
              <FlaskConical className="h-3.5 w-3.5 text-blue-600" /> KHOA XÉT NGHIỆM & CẬN LÂM SÀNG (LAB & CLS)
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              Thống Kê Báo Cáo Xét Nghiệm & CLS
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
                <UserRound className="h-3.5 w-3.5 text-blue-500" />
                Phụ trách: <strong className="font-bold text-blue-800">{stats?.tenKtv || user?.hoTen || 'Kỹ thuật viên'}</strong> • {stats?.chuyenMon || 'Khoa Xét nghiệm & CĐHA'}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-start xl:items-end gap-2.5 shrink-0">
            {/* Cụm 1: Nghiệp vụ Báo cáo Ban Giám Đốc */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGuiBaoCaoOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Gửi báo cáo hoạt động xét nghiệm lên Ban Giám Đốc"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Gửi Báo Cáo BGĐ</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLichSuBaoCaoOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Xem lịch sử báo cáo & ý kiến chỉ đạo từ Ban Giám Đốc"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>Lịch Sử & Chỉ Đạo</span>
              </button>
            </div>

            {/* Cụm 2: Nhóm tiện ích kết xuất dữ liệu (Làm mới • In Báo Cáo • Xuất CSV) */}
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50/80 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:shadow-2xs transition active:scale-95 disabled:opacity-75 cursor-pointer whitespace-nowrap"
                title="Đồng bộ lại số liệu mới nhất từ CSDL"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isFetching ? 'animate-spin' : ''}`} />
                <span>{isFetching ? 'Đang nạp...' : justRefreshed ? 'Đã làm mới!' : 'Làm mới'}</span>
              </button>
              <div className="h-3.5 w-px bg-gray-200" />
              <button
                type="button"
                onClick={() => setOpenBaoCaoModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="In phiếu báo cáo thống kê xét nghiệm & CLS khổ A4"
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                <span>In Báo Cáo</span>
              </button>
              <div className="h-3.5 w-px bg-gray-200" />
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-white hover:shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Xuất dữ liệu định dạng file Excel / CSV"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── THANH ĐIỀU KHIỂN & BỘ LỌC TÍCH HỢP (UNIFIED CONTROL BAR) ─── */}
        <div className="mt-4 rounded-2xl bg-slate-50/80 p-3 border border-slate-200/80 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Phạm vi thống kê */}
            <div className="inline-flex rounded-xl bg-white p-1 shadow-2xs border border-gray-200">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Toàn bộ khoa</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('ca_nhan')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  scope === 'ca_nhan'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <UserRound className="h-3.5 w-3.5" />
                <span>Chuyên môn của tôi</span>
              </button>
            </div>

            <div className="h-5 w-px bg-gray-300 hidden md:block" />

            {/* 2. Chu kỳ thời gian */}
            <div className="inline-flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
              {[
                { key: 'hom_nay', label: 'Hôm nay' },
                { key: 'tuan_nay', label: 'Tuần này (7 ngày)' },
                { key: 'thang_nay', label: 'Tháng này' },
                { key: 'quy_nay', label: 'Quý này' },
                { key: 'tat_ca', label: 'Toàn thời gian' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setTimeRange(tab.key);
                    setTuNgay('');
                    setDenNgay('');
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    timeRange === tab.key && !tuNgay && !denNgay
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Khoảng ngày tùy chọn */}
          <div className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs self-start xl:self-auto">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium whitespace-nowrap">Từ</span>
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => {
                setTuNgay(e.target.value);
                setTimeRange('');
              }}
              className="bg-transparent text-xs text-gray-800 font-medium focus:outline-none"
            />
            <span className="text-gray-400 font-bold">➔</span>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => {
                setDenNgay(e.target.value);
                setTimeRange('');
              }}
              className="bg-transparent text-xs text-gray-800 font-medium focus:outline-none"
            />
            {(tuNgay || denNgay) && (
              <button
                type="button"
                onClick={() => {
                  setTuNgay('');
                  setDenNgay('');
                  setTimeRange('thang_nay');
                }}
                className="ml-1 text-gray-400 hover:text-rose-600 cursor-pointer p-0.5 rounded transition"
                title="Xóa lọc ngày và quay về Tháng này"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 4 KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Tổng Chỉ Định */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng chỉ định
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FlaskConical className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">
            {isLoading ? '...' : `${stats?.tongChiDinh || 0} ca`}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Lệnh từ bác sĩ điều trị</p>
        </div>

        {/* Đã Có Kết Quả */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Đã có kết quả
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">
            {isLoading ? '...' : `${stats?.daHoanThanh ?? stats?.coKetQua ?? 0} ca`}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            Tỷ lệ hoàn thành: <strong>{stats?.tyLeHoanThanh || '0%'}</strong>
          </p>
        </div>

        {/* Đang Xử Lý / Phân Tích */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
              Đang xử lý / Phân tích
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 mt-2">
            {isLoading ? '...' : `${stats?.dangXuLy || 0} ca`}
          </p>
          <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Đang chạy máy / Nhập KQ</p>
        </div>

        {/* Chờ Lấy Mẫu */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Chờ lấy mẫu
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">
            {isLoading ? '...' : `${stats?.choLayMau || 0} ca`}
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">Bệnh nhân đang chờ</p>
        </div>
      </div>

      {/* 4. Charts Row: Top dịch vụ & Cơ cấu phân loại */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 5 dịch vụ (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary-600" />
                Top Dịch Vụ Cận Lâm Sàng Thực Hiện Nhiều Nhất
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Số lượt phân tích theo từng danh mục dịch vụ</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-300 mr-2" /> Đang tải biểu đồ...
              </div>
            ) : (stats?.topDichVu || []).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 space-y-1">
                <FlaskConical className="h-7 w-7 text-gray-200" />
                <p>Chưa có dữ liệu chỉ định trong khoảng thời gian này</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.topDichVu}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis
                    dataKey="ten"
                    type="category"
                    tick={{ fontSize: 11, fill: '#374151' }}
                    width={150}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} ca thực hiện`, 'Số lượng']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Phân loại cơ cấu dịch vụ (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-purple-600" />
                Cơ Cấu Phân Loại Dịch Vụ
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Tỷ trọng Xét nghiệm máu vs Chẩn đoán hình ảnh</p>
            </div>
          </div>

          <div className="h-64 w-full flex flex-col items-center justify-center">
            {isLoading ? (
              <div className="text-xs text-gray-400">Đang tải...</div>
            ) : (stats?.coCauLoai || []).length === 0 || stats?.tongChiDinh === 0 ? (
              <div className="text-xs text-gray-400 text-center space-y-1">
                <Scan className="h-7 w-7 text-gray-200 mx-auto" />
                <p>Chưa có dữ liệu cơ cấu</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.coCauLoai}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(stats.coCauLoai || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${v} ca (${Math.round((v / (stats?.tongChiDinh || 1)) * 100)}%)`, name]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. Mức Độ Hài Lòng & Đánh Giá Cận Lâm Sàng Từ Bệnh Nhân */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              Đánh Giá Trải Nghiệm Cận Lâm Sàng & Phản Hồi Bệnh Nhân
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Chỉ số hài lòng của người bệnh về thái độ phục vụ, thao tác kỹ thuật và thời gian trả kết quả
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              CSAT Cận Lâm Sàng
            </span>
          </div>
        </div>

        {/* CSAT Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Cột 1: Điểm trung bình & Tỷ lệ hài lòng (4 cols) */}
          <div className="md:col-span-4 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white p-5 rounded-2xl border border-amber-100/80 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Điểm Đánh Giá Trung Bình
              </span>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                  {stats?.danhGia?.diemClsTB?.toFixed(1) || '5.0'}
                </span>
                <span className="text-sm font-semibold text-gray-400">/ 5.0</span>
              </div>

              {/* 5 Stars display */}
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const rating = Number(stats?.danhGia?.diemClsTB) || 5;
                  const isFilled = star <= Math.floor(rating);
                  const isHalf = star === Math.ceil(rating) && rating % 1 !== 0;
                  return (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        isFilled
                          ? 'text-amber-400 fill-amber-400'
                          : isHalf
                          ? 'text-amber-400 fill-amber-200'
                          : 'text-gray-200 fill-gray-100'
                      }`}
                    />
                  );
                })}
                <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                  {(stats?.danhGia?.diemClsTB || 5) >= 4.5
                    ? 'Xuất sắc'
                    : (stats?.danhGia?.diemClsTB || 5) >= 4.0
                    ? 'Rất tốt'
                    : 'Hài lòng'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-amber-200/60">
              <div>
                <p className="text-[11px] text-gray-500 font-medium">Tỷ lệ hài lòng</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  {stats?.danhGia?.tyLeHaiLong || '100%'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-medium">Lượt gửi nhận xét</p>
                <p className="text-lg font-bold text-blue-600 mt-0.5">
                  {stats?.danhGia?.tongDanhGia || 0} lượt
                </p>
              </div>
            </div>
          </div>

          {/* Cột 2: Phân bố số sao & Tiêu chí khen ngợi (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-4">
            {/* Phân bố sao */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Phân bố mức độ hài lòng</span>
                <span className="text-gray-400 font-normal lowercase">Theo số sao đánh giá</span>
              </h4>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats?.danhGia?.phanBoSao?.[star] || 0;
                const total = stats?.danhGia?.tongDanhGia || (count > 0 ? count : 1);
                const percent = total > 0 ? Math.round((count / total) * 100) : (star === 5 ? 100 : 0);
                return (
                  <div key={star} className="flex items-center gap-2.5 text-xs">
                    <span className="w-10 font-bold text-gray-600 flex items-center gap-0.5">
                      {star} <Star className="h-3 w-3 text-amber-500 fill-amber-500 inline" />
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          star >= 4
                            ? 'bg-amber-500'
                            : star === 3
                            ? 'bg-yellow-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-gray-500 font-medium text-[11px]">
                      {count} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tiêu chí được khen nhiều nhất */}
            {stats?.danhGia?.topTieuChi?.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ThumbsUp className="h-3.5 w-3.5 text-primary-600" />
                  Lời khen & Tiêu chí ghi nhận nhiều nhất
                </h4>
                <div className="flex flex-wrap gap-2">
                  {stats.danhGia.topTieuChi.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-xs"
                    >
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      {item.tag}
                      <span className="bg-blue-200/70 text-blue-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {item.count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách lời nhận xét thực tế từ bệnh nhân */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary-600" />
            Nhận Xét & Góp Ý Gần Đây Của Bệnh Nhân
          </h4>

          {(stats?.danhGia?.danhSachNhanXet || []).length === 0 ? (
            <div className="text-center py-6 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
              <Smile className="h-8 w-8 text-gray-300 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-gray-500">Chưa có nhận xét nào trong khoảng thời gian này.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Bệnh nhân sau khi hoàn tất quy trình lấy mẫu/chụp chiếu sẽ gửi đánh giá.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {stats.danhGia.danhSachNhanXet.map((dg) => (
                <div
                  key={dg.id}
                  className="bg-gray-50/60 hover:bg-gray-50 p-4 rounded-2xl border border-gray-100 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {dg.anDanh ? '?' : dg.tenBenhNhan?.charAt(0)?.toUpperCase() || 'B'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-gray-900 text-xs">{dg.tenBenhNhan}</p>
                          {dg.anDanh && (
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                              Ẩn danh
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">
                          {formatDateTime(dg.taoLuc)}
                        </p>
                      </div>
                    </div>

                    {/* Điểm số */}
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-extrabold text-amber-800">
                        {dg.diemCls || 5}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {dg.tieuChiHaiLong && dg.tieuChiHaiLong.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dg.tieuChiHaiLong.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md"
                        >
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Comment */}
                  {dg.nhanXet ? (
                    <p className="text-xs text-gray-700 italic bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs">
                      "{dg.nhanXet}"
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">
                      (Bệnh nhân hài lòng với dịch vụ và không để lại lời bình)
                    </p>
                  )}

                  {/* Giám đốc phản hồi nếu có */}
                  {dg.phanHoiGiamDoc && (
                    <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                      <span className="font-bold">Ban Giám Đốc phản hồi: </span>
                      {dg.phanHoiGiamDoc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Bảng Danh sách Nhật ký chỉ định gần đây */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-600" />
              Nhật Ký Chỉ Định Gần Đây
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Cập nhật tiến trình và thời gian trả kết quả xét nghiệm
            </p>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Hiển thị {stats?.danhSachMoiNhat?.length || 0} bản ghi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="py-3 px-4">Mã Lệnh</th>
                <th className="py-3 px-4">Bệnh Nhân</th>
                <th className="py-3 px-4">Tên Dịch Vụ Cận Lâm Sàng</th>
                <th className="py-3 px-4">Phân Loại</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4">Thời Gian Chỉ Định</th>
                <th className="py-3 px-4">Thời Gian Có KQ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {(stats?.danhSachMoiNhat || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Chưa có nhật ký chỉ định nào trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                stats.danhSachMoiNhat.map((c) => {
                  const st = TRANG_THAI_CONFIG[c.trangThai] || {
                    label: c.trangThai,
                    bg: 'bg-gray-100 text-gray-700 border-gray-200',
                  };
                  const isCdha = c.loai === 'cdha';

                  return (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary-700">
                        #{c.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{c.benhNhan?.hoTen || 'Bệnh nhân'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {c.benhNhan?.maBenhNhan || '---'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {c.tenDichVu}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                            isCdha
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isCdha ? (
                            <Scan className="h-3 w-3" />
                          ) : (
                            <FlaskConical className="h-3 w-3" />
                          )}
                          {isCdha ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm máu'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${st.bg}`}
                        >
                          {st.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {formatDateTime(c.thoiGianChiDinh)}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {c.thoiGianCoKetQua ? (
                          <span className="text-emerald-700 font-bold">
                            {formatDateTime(c.thoiGianCoKetQua)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Chưa có</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Gửi Báo Cáo lên Ban Giám Đốc */}
      <GuiBaoCaoModal
        isOpen={isGuiBaoCaoOpen}
        onClose={() => setIsGuiBaoCaoOpen(false)}
        boPhan="xet_nghiem"
        tenBoPhan="Phòng Xét Nghiệm & Chẩn Đoán Cận Lâm Sàng"
        kyBaoCaoMacDinh={getKyBaoCaoLabel()}
        tieuDeMacDinh={`Báo cáo công suất xét nghiệm & trả kết quả - ${getKyBaoCaoLabel()}`}
        soLieuSnapshot={{
          kyBaoCao: getKyBaoCaoLabel(),
          phamVi: scope === 'all' ? 'Toàn bộ khoa' : 'Chuyên môn cá nhân',
          tongSoChiDinh: stats?.tongChiDinh || 0,
          choLayMau: stats?.choLayMau || 0,
          dangLayMau: stats?.dangLayMau || 0,
          dangXuLy: stats?.dangXuLy || 0,
          daCoKetQua: stats?.daHoanThanh ?? stats?.coKetQua ?? 0,
          daHuy: stats?.daHuy || 0,
        }}
      />

      {/* Modal Xem Lịch Sử Báo Cáo & Ý Kiến Chỉ Đạo */}
      <LichSuBaoCaoModal
        isOpen={isLichSuBaoCaoOpen}
        onClose={() => setIsLichSuBaoCaoOpen(false)}
        boPhan="xet_nghiem"
        tenBoPhan="Phòng Xét Nghiệm & Chẩn Đoán Cận Lâm Sàng"
      />

      {/* Modal In Báo Cáo Hoạt Động Xét Nghiệm & CLS (Khổ A4) */}
      {openBaoCaoModal && (
        <InBaoCaoXetNghiemModal
          stats={stats}
          filterInfo={{ scope, timeRange, tuNgay, denNgay }}
          onClose={() => setOpenBaoCaoModal(false)}
        />
      )}
    </div>
  );
}
