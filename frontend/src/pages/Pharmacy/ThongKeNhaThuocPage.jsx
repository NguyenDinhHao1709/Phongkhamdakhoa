import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiGet } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import {
  BarChart3,
  AlertTriangle,
  Clock,
  DollarSign,
  Printer,
  Search,
  Pill,
  FileSpreadsheet,
  ShoppingCart,
  PlusCircle,
  ClipboardCheck,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Filter,
  RotateCcw,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  Package,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

export default function ThongKeNhaThuocPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Active View Tab: 'overview' | 'alerts' | 'inventory'
  const [activeTab, setActiveTab] = useState('overview');

  // State bộ lọc (Filter states)
  const [timeFilter, setTimeFilter] = useState('7days'); // 'today' | '7days' | 'month' | 'quarter' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'con_hang' | 'canh_bao' | 'het_hang' | 'can_date'
  const [routeFilter, setRouteFilter] = useState('all'); // 'all' | 'Uống' | 'Tiêm' | 'Bôi ngoài da' | ...
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['thong-ke-nha-thuoc', user?.id, timeFilter, fromDate, toDate, statusFilter, routeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timeFilter) params.append('khoangThoiGian', timeFilter);
      if (fromDate) params.append('tuNgay', fromDate);
      if (toDate) params.append('denNgay', toDate);
      if (statusFilter !== 'all') params.append('trangThai', statusFilter);
      if (routeFilter !== 'all') params.append('duongDung', routeFilter);
      return apiGet(`/nha-thuoc/thong-ke?${params.toString()}`);
    },
  });

  // Query dữ liệu dự báo nhu cầu thuốc
  const { data: forecastRes, isLoading: loadingForecast } = useQuery({
    queryKey: ['du-bao-nhu-cau-thuoc', user?.id],
    queryFn: () => apiGet('/nha-thuoc/du-bao-nhu-cau?horizonDays=14'),
  });
  const forecastData = forecastRes?.data || [];

  const stats = data?.data || {
    tongSoThuoc: 0,
    sapHetHang: 0,
    sapHetHanCount: 0,
    donXuatTrongNgay: 0,
    tongGiaTriKho: 0,
    top10Thuoc: [],
    luuLuongGiaoDich: [],
    canhBaoRuiRo: [],
    lichSuGiaoDich: [],
    listThuoc: [],
  };

  // Lọc danh sách thuốc trong bảng theo search, status & route
  const filteredList = useMemo(() => {
    return (stats.listThuoc || []).filter((t) => {
      const matchSearch =
        !search.trim() ||
        t.tenThuoc?.toLowerCase().includes(search.toLowerCase()) ||
        t.maThuoc?.toLowerCase().includes(search.toLowerCase()) ||
        t.maLo?.toLowerCase().includes(search.toLowerCase()) ||
        t.tenHoatChat?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'canh_bao'
          ? t.tonKhoTong > 0 && t.tonKhoTong <= 20
          : statusFilter === 'het_hang'
          ? t.tonKhoTong <= 0
          : statusFilter === 'con_hang'
          ? t.tonKhoTong > 20
          : true;

      const matchRoute =
        routeFilter === 'all'
          ? true
          : (t.duongDung || '').toLowerCase().includes(routeFilter.toLowerCase());

      return matchSearch && matchStatus && matchRoute;
    });
  }, [stats.listThuoc, search, statusFilter, routeFilter]);

  // Lọc bảng cảnh báo rủi ro theo trạng thái
  const filteredCanhBao = useMemo(() => {
    if (statusFilter === 'all') return stats.canhBaoRuiRo || [];
    if (statusFilter === 'het_hang')
      return (stats.canhBaoRuiRo || []).filter((r) => r.mucDo === 'nguy_cap');
    if (statusFilter === 'canh_bao')
      return (stats.canhBaoRuiRo || []).filter((r) => r.loaiRuiRo.includes('Tồn kho nguy cấp'));
    if (statusFilter === 'can_date')
      return (stats.canhBaoRuiRo || []).filter((r) => r.loaiRuiRo.includes('Cận hạn'));
    return stats.canhBaoRuiRo || [];
  }, [stats.canhBaoRuiRo, statusFilter]);

  // Đặt lại toàn bộ bộ lọc
  const handleResetFilter = () => {
    setTimeFilter('7days');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setRouteFilter('all');
    setSearch('');
  };

  const hasActiveFilters =
    timeFilter !== '7days' ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    statusFilter !== 'all' ||
    routeFilter !== 'all' ||
    Boolean(search.trim());

  // Xuất file CSV báo cáo kho thuốc đã lọc
  const handleExportCSV = () => {
    const headers = [
      'Mã Thuốc',
      'Tên Thuốc',
      'Đơn Vị Tính',
      'Mã Lô',
      'Hạn Sử Dụng',
      'Đơn Giá (VNĐ)',
      'Tồn Kho Tổng',
      'Thành Tiền (VNĐ)',
      'Trạng Thái',
    ];
    const rows = filteredList.map((t) => [
      t.maThuoc,
      `"${t.tenThuoc}"`,
      t.donViTinh,
      t.maLo || '---',
      t.ngayHetHan ? String(t.ngayHetHan).slice(0, 10).split('-').reverse().join('/') : '---',
      t.giaBan,
      t.tonKhoTong,
      t.giaBan * t.tonKhoTong,
      t.trangThai === 'canh_bao'
        ? 'Cảnh báo tồn ít'
        : t.trangThai === 'het_hang'
        ? 'Hết hàng'
        : 'Còn hàng',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bao_Cao_Kho_Thuoc_${timeFilter}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = [
    '#2563EB',
    '#0D9488',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#10B981',
    '#6366F1',
    '#F97316',
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* 1. Header Tinh Gọn & Hiện Đại */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary-600" />
              Báo Cáo & Thống Kê Dược Phẩm
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Kho Dược & Theo dõi FEFO
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi lưu lượng xuất nhập, cảnh báo rủi ro tồn kho FEFO và quản lý tài sản dược phẩm.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-gray-600" />
            <span>In Báo Cáo</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Xuất Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Bộ Lọc Tinh Gọn (Compact Filter Bar) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3 text-xs">
        {/* Hàng 1: Preset Thời gian + Ô Tìm kiếm */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary-500" /> Thời gian:
            </span>
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: '7days', label: '7 ngày qua' },
              { key: 'month', label: 'Tháng này' },
              { key: 'quarter', label: 'Quý này' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTimeFilter(item.key);
                  setFromDate('');
                  setToDate('');
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  timeFilter === item.key && !fromDate
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Date range picker */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setTimeFilter('custom');
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-0.5"
                placeholder="Từ ngày"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setTimeFilter('custom');
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-0.5"
                placeholder="Đến ngày"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setTimeFilter('7days');
                  }}
                  className="p-0.5 text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Ô Tìm kiếm */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên thuốc, mã thuốc, mã lô..."
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl pl-8 pr-7 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Bộ lọc theo Trạng thái & Đường dùng */}
        <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium">Trạng thái kho:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
              >
                <option value="all">Tất cả trạng thái kho</option>
                <option value="con_hang">🟢 Còn hàng sẵn sàng (&gt; 20)</option>
                <option value="canh_bao">🟡 Cảnh báo tồn ít (≤ 20)</option>
                <option value="het_hang">🔴 Hết hàng (Tồn = 0)</option>
                <option value="can_date">⏰ Lô cận hạn sử dụng (≤ 60 ngày)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium">Đường dùng:</span>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
              >
                <option value="all">Tất cả đường dùng</option>
                <option value="Uống">Đường uống</option>
                <option value="Tiêm">Tiêm / Truyền dịch</option>
                <option value="Bôi ngoài da">Bôi ngoài da</option>
                <option value="Nhỏ mắt/mũi">Nhỏ mắt / mũi</option>
                <option value="Đặt hậu môn">Đặt hậu môn</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilter}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer ml-auto"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. 4 KPI Stat Cards Tương Tác */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Đơn xuất trong ngày */}
        <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white rounded-2xl p-4 border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Đơn Xuất Trong Ngày
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-900 mt-2">
            {stats.donXuatTrongNgay} <span className="text-xs font-normal text-blue-600">đơn</span>
          </p>
          <p className="text-[11px] text-blue-600/90 mt-0.5 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Đã hoàn tất cấp phát
          </p>
        </div>

        {/* Dưới định mức an toàn */}
        <div
          onClick={() => {
            setActiveTab('alerts');
            setStatusFilter('canh_bao');
          }}
          className="bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white rounded-2xl p-4 border border-amber-100 shadow-xs cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Dưới Định Mức An Toàn
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-900 mt-2">
            {stats.sapHetHang} <span className="text-xs font-normal text-amber-600">mã</span>
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5 font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Cần lập phiếu nhập gấp
          </p>
        </div>

        {/* Lô cận date */}
        <div
          onClick={() => {
            setActiveTab('alerts');
            setStatusFilter('can_date');
          }}
          className="bg-gradient-to-br from-rose-50/70 via-pink-50/30 to-white rounded-2xl p-4 border border-rose-100 shadow-xs cursor-pointer hover:border-rose-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Lô Cận Date (≤ 60 ngày)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-900 mt-2">
            {stats.sapHetHanCount} <span className="text-xs font-normal text-rose-600">lô</span>
          </p>
          <p className="text-[11px] text-rose-700 mt-0.5 font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" /> Ưu tiên xuất FEFO
          </p>
        </div>

        {/* Tổng giá trị kho dược */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white rounded-2xl p-4 border border-emerald-100 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Tổng Giá Trị Kho Dược
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 mt-2">
            {formatCurrency(stats.tongGiaTriKho)}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5 font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {stats.tongSoThuoc} danh mục thuốc
          </p>
        </div>
      </div>

      {/* 4. Tab Navigation Switcher (Gọn Gàng & Không Rối) */}
      <div className="flex items-center gap-2 bg-gray-100/90 p-1.5 rounded-2xl w-full sm:w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-primary-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Biểu Đồ & Dự Báo Nhu Cầu</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-white text-rose-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Cảnh Báo Rủi Ro FEFO</span>
          {stats.sapHetHang + stats.sapHetHanCount > 0 && (
            <span className="bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {stats.sapHetHang + stats.sapHetHanCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Chi Tiết Kho Thuốc ({filteredList.length})</span>
        </button>
      </div>

      {/* 5. TAB CONTENT */}

      {/* ── TAB 1: BIỂU ĐỒ & DỰ BÁO NHU CẦU ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fade-in">
          {/* 2 Biểu đồ: Top 10 thuốc xuất nhiều nhất & Lưu lượng giao dịch */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top 10 thuốc (7 cols) */}
            <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="border-b border-gray-50 pb-3">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary-600" />
                  Top Thuốc Xuất Kho Nhiều Nhất
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Số lượng viên/tuýp đã xuất giúp dược sĩ chủ động cắt liều và sắp xếp kệ
                </p>
              </div>

              <div className="h-72 w-full pt-2">
                {stats.top10Thuoc && stats.top10Thuoc.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.top10Thuoc}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <YAxis
                        type="category"
                        dataKey="tenThuoc"
                        tick={{ fontSize: 11, fill: '#374151' }}
                        width={140}
                      />
                      <Tooltip
                        formatter={(val) => [`${val} đơn vị`, 'Số lượng xuất']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                      />
                      <Bar dataKey="soLuongKe" radius={[0, 6, 6, 0]}>
                        {stats.top10Thuoc.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    Chưa có dữ liệu xuất thuốc theo bộ lọc thời gian này
                  </div>
                )}
              </div>
            </div>

            {/* Lưu lượng xuất nhập (5 cols) */}
            <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="border-b border-gray-50 pb-3">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  Lưu Lượng Xuất / Nhập Kho
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Tần suất giao dịch theo từng ngày</p>
              </div>

              <div className="h-72 w-full pt-2">
                {stats.luuLuongGiaoDich && stats.luuLuongGiaoDich.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.luuLuongGiaoDich}
                      margin={{ top: 10, right: 20, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorXuat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorNhap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="ngay" tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                      <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
                      <Area
                        type="monotone"
                        dataKey="soDonXuat"
                        name="Đơn xuất kho"
                        stroke="#2563EB"
                        fillOpacity={1}
                        fill="url(#colorXuat)"
                      />
                      <Area
                        type="monotone"
                        dataKey="soNhapKho"
                        name="Lô nhập kho"
                        stroke="#10B981"
                        fillOpacity={1}
                        fill="url(#colorNhap)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    Chưa có dữ liệu xuất nhập kho trong khoảng thời gian đã chọn
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dự báo nhu cầu thuốc 14 ngày tới */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Dự Báo Nhu Cầu & Tốc Độ Tiêu Thụ Dược Phẩm (14 Ngày Tới)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tổng hợp tốc độ tiêu thụ trung bình ngày để đưa ra khuyến nghị đặt hàng lại
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Machine Learning Forecast
              </span>
            </div>

            {loadingForecast ? (
              <p className="text-xs text-gray-400 py-6 text-center">Đang tổng hợp dữ liệu...</p>
            ) : forecastData.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                Chưa có đủ dữ liệu lịch sử để dự báo nhu cầu
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="py-3 px-3.5">Mã thuốc</th>
                      <th className="py-3 px-3.5">Tên thuốc</th>
                      <th className="py-3 px-3.5 text-center">ĐVT</th>
                      <th className="py-3 px-3.5 text-right">Tồn hiện tại</th>
                      <th className="py-3 px-3.5 text-right">Tốc độ xuất/ngày</th>
                      <th className="py-3 px-3.5 text-right">Dự báo 7 ngày</th>
                      <th className="py-3 px-3.5 text-right">Dự báo 14 ngày</th>
                      <th className="py-3 px-3.5 text-center">Tồn kho còn (ngày)</th>
                      <th className="py-3 px-3.5 text-center">Khuyến nghị nhập</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    {forecastData.slice(0, 10).map((item) => (
                      <tr key={item.id || item.maThuoc} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-primary-700">
                          {item.maThuoc}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-gray-900">{item.tenThuoc}</td>
                        <td className="py-3 px-3.5 text-center text-gray-500">{item.donViTinh}</td>
                        <td className="py-3 px-3.5 text-right font-extrabold text-gray-900">
                          {item.tonKhoHienTai}
                        </td>
                        <td className="py-3 px-3.5 text-right text-gray-600 font-medium">
                          ~{item.tieuThuTrungBinhNgay}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-blue-700 bg-blue-50/30">
                          {item.duBaoTieuThu7Ngay}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-purple-700 bg-purple-50/30">
                          {item.duBaoTieuThu14Ngay}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              item.soNgayConLai <= 3
                                ? 'bg-rose-100 text-rose-700'
                                : item.soNgayConLai <= 7
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {item.soNgayConLai > 365 ? '> 1 năm' : `~${item.soNgayConLai} ngày`}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {item.canNhapHang ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ⚠️ Nhập +{item.soLuongDeXuatNhap} {item.donViTinh}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-50">
                              ✓ Đủ tồn kho
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CẢNH BÁO RỦI RO FEFO ── */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden animate-fade-in">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Bảng Cảnh Báo Rủi Ro Tồn Kho & Cận Hạn Sử Dụng (Xử lý ngay)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Danh sách các loại thuốc đã cạn kiệt hoặc các lô thuốc sắp hết hạn cần ưu tiên xử lý
              </p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
              {filteredCanhBao.length} cảnh báo
            </span>
          </div>

          {filteredCanhBao.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-rose-50/50 text-[11px] font-bold text-rose-900 uppercase tracking-wider border-b border-rose-100">
                    <th className="py-3 px-4">Mã Thuốc</th>
                    <th className="py-3 px-4">Tên Thuốc / Hoạt Chất</th>
                    <th className="py-3 px-4">Loại Rủi Ro</th>
                    <th className="py-3 px-4 text-center">Số Lượng Tồn</th>
                    <th className="py-3 px-4 text-center">Hạn Sử Dụng</th>
                    <th className="py-3 px-4 text-right">Hành Động Đề Xuất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {filteredCanhBao.map((item) => (
                    <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-800">{item.maThuoc}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{item.tenThuoc}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.mucDo === 'nguy_cap'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3" /> {item.loaiRuiRo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-gray-900">
                        {item.tonKho ?? item.soLuong ?? 0} {item.donViTinh || 'đơn vị'}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-mono font-medium text-gray-600">
                        {item.hanDung || item.ngayHetHan || '---'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate('/nha-thuoc/kho-thuoc')}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-xl transition-colors cursor-pointer"
                        >
                          <span>{item.hanhDong || 'Nhập kho bổ sung'}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800">Kho thuốc an toàn</p>
              <p className="text-xs text-emerald-600">
                Không có loại thuốc nào cạn kiệt hay cận date thuộc nhóm lọc đã chọn
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CHI TIẾT DANH MỤC TỒN KHO ── */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden animate-fade-in">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary-600" />
                Chi Tiết Danh Mục Tồn Kho ({filteredList.length} loại thuốc)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Tra cứu danh mục, tồn kho và hạn sử dụng từng loại thuốc đã được lọc
              </p>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Tổng giá trị: <strong className="text-emerald-700">{formatCurrency(stats.tongGiaTriKho)}</strong>
            </span>
          </div>

          {filteredList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3 px-4">Mã Thuốc</th>
                    <th className="py-3 px-4">Tên Thuốc / Hoạt Chất</th>
                    <th className="py-3 px-4 text-center">ĐVT</th>
                    <th className="py-3 px-4">Mã Lô & HSD</th>
                    <th className="py-3 px-4 text-right">Đơn Giá Bán</th>
                    <th className="py-3 px-4 text-center">Tồn Kho</th>
                    <th className="py-3 px-4 text-right">Thành Tiền Tồn</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {filteredList.map((t) => {
                    const isOutOfStock = t.tonKhoTong <= 0;
                    const isLow = t.tonKhoTong > 0 && t.tonKhoTong <= 20;

                    return (
                      <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary-700">
                          {t.maThuoc}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900">{t.tenThuoc}</p>
                          {t.tenHoatChat && (
                            <p className="text-[10px] text-gray-400">{t.tenHoatChat}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 font-medium">
                          {t.donViTinh}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="font-mono font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                            {t.maLo || 'LÔ-CHUNG'}
                          </span>
                          <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-rose-500" />
                            <span>
                              {t.ngayHetHan
                                ? String(t.ngayHetHan).slice(0, 10).split('-').reverse().join('/')
                                : '---'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(t.giaBan)}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-sm">
                          <span
                            className={
                              isOutOfStock
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-gray-900'
                            }
                          >
                            {t.tonKhoTong}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary-700">
                          {formatCurrency(t.giaBan * t.tonKhoTong)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              Hết hàng
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              Sắp hết
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Sẵn sàng
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-10 text-center">
              Không tìm thấy loại thuốc nào phù hợp với bộ lọc đã chọn
            </p>
          )}
        </div>
      )}
    </div>
  );
}

