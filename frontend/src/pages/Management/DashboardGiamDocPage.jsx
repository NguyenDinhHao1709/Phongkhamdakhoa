import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPatch } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  TrendingUp, Users, Calendar, AlertCircle, Clock, CheckCircle2,
  DollarSign, Stethoscope, FileText, ArrowRight, RefreshCw, BarChart3,
  ShieldCheck, Sparkles, FlaskConical, Pill, Star, MessageSquare,
  AlertTriangle, Send, X, Filter, CalendarDays, Activity, Check
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, PieChart, Pie, Cell, Tooltip, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

const toDateInputString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardGiamDocPage() {
  const navigate = useNavigate();

  // State bộ lọc thời gian
  const [timeRange, setTimeRange] = useState('7_ngay');
  const [chartViewMode, setChartViewMode] = useState('all'); // 'all' | 'kham' | 'doanh_thu'
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toDateInputString(d);
  });
  const [toDate, setToDate] = useState(() => toDateInputString(new Date()));

  // Xây dựng query string gửi lên backend
  const buildQueryString = () => {
    if (timeRange === 'tuy_chon' && fromDate && toDate) {
      return `tuNgay=${fromDate}&denNgay=${toDate}`;
    }
    return `range=${timeRange}`;
  };

  const queryString = buildQueryString();

  // Query dữ liệu thống kê Dashboard
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['giam-doc-dashboard', queryString],
    queryFn: () => apiGet(`/quan-ly/dashboard-stats?${queryString}`),
    refetchInterval: 30000, // Cập nhật tự động mỗi 30s
  });

  // Query đánh giá CSAT toàn viện & BXH bác sĩ dành cho Giám Đốc
  const { data: csatData, isLoading: isLoadingCsat, refetch: refetchCsat } = useQuery({
    queryKey: ['giam-doc-csat', queryString],
    queryFn: () => apiGet(`/danh-gia/giam-doc?${queryString}`),
    refetchInterval: 30000,
  });

  const rawCsat = csatData?.data?.data || csatData?.data || csatData || {};
  const csat = {
    tongDanhGia: rawCsat.tongDanhGia || 0,
    diemCSATToanVien: rawCsat.diemCSATToanVien || 5.0,
    diemBacSiTB: rawCsat.diemBacSiTB || 5.0,
    diemClsTB: rawCsat.diemClsTB || 5.0,
    diemTiepDonTB: rawCsat.diemTiepDonTB || 5.0,
    tyLeHaiLong: rawCsat.tyLeHaiLong || '100%',
    bxhBacSi: Array.isArray(rawCsat.bxhBacSi) ? rawCsat.bxhBacSi : [],
    canhBaoDanhGiaThap: Array.isArray(rawCsat.canhBaoDanhGiaThap) ? rawCsat.canhBaoDanhGiaThap : [],
    danhSachMoiNhat: Array.isArray(rawCsat.danhSachMoiNhat) ? rawCsat.danhSachMoiNhat : [],
  };

  // State Modal Giám Đốc phản hồi đánh giá
  const [replyModal, setReplyModal] = useState({
    isOpen: false,
    item: null,
    text: '',
    saving: false,
  });

  const handleOpenReply = (item) => {
    setReplyModal({
      isOpen: true,
      item,
      text: item.phanHoiGiamDoc || '',
      saving: false,
    });
  };

  const handleSaveReply = async () => {
    if (!replyModal.item?.id || !replyModal.text.trim()) return;
    setReplyModal((prev) => ({ ...prev, saving: true }));
    try {
      await apiPatch(`/danh-gia/${replyModal.item.id}/phan-hoi`, {
        phanHoiGiamDoc: replyModal.text.trim(),
      });
      refetchCsat();
      setReplyModal({ isOpen: false, item: null, text: '', saving: false });
    } catch (e) {
      alert(e?.message || 'Có lỗi xảy ra khi lưu phản hồi.');
      setReplyModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handlePresetSelect = (preset) => {
    setTimeRange(preset);
    const now = new Date();
    if (preset === 'hom_nay') {
      const today = toDateInputString(now);
      setFromDate(today);
      setToDate(today);
    } else if (preset === '7_ngay') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setFromDate(toDateInputString(d7));
      setToDate(toDateInputString(now));
    } else if (preset === 'thang_nay') {
      const dMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(toDateInputString(dMonth));
      setToDate(toDateInputString(now));
    } else if (preset === 'quy_nay') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      setFromDate(toDateInputString(dQuarter));
      setToDate(toDateInputString(now));
    }
  };

  const stats = data?.data;
  const kpis = stats?.kpis || {};
  const clsList = stats?.hoatDongCls || [];
  const kenhData = stats?.kenhTiepNhan || [];

  const getRangeLabel = () => {
    switch (timeRange) {
      case 'hom_nay': return 'Hôm nay';
      case '7_ngay': return '7 ngày gần nhất';
      case 'thang_nay': return 'Tháng này';
      case 'quy_nay': return 'Quý này';
      case 'tat_ca': return 'Toàn thời gian';
      case 'tuy_chon': return `Từ ${fromDate} đến ${toDate}`;
      default: return 'Giai đoạn chọn';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── HEADER ĐIỀU HÀNH BAN GIÁM ĐỐC ─────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-300/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> Ban Giám Đốc • Trung Tâm Điều Hành Toàn Viện
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Executive Hospital Dashboard
            </h1>
            <p className="text-blue-200/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Theo dõi toàn diện lưu lượng khám chữa bệnh, chỉ định cận lâm sàng, hoạt động dược phẩm & dòng tiền viện phí theo thời gian thực
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => { refetch(); refetchCsat(); }}
              disabled={isFetching}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold backdrop-blur-md transition-all border border-white/15 shadow-sm whitespace-nowrap shrink-0"
              title="Cập nhật dữ liệu mới nhất từ CSDL"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-amber-300' : ''}`} />
              <span>{isFetching ? 'Đang nạp...' : 'Làm mới'}</span>
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/tai-chinh')}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all whitespace-nowrap shrink-0"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Báo Cáo Toàn Diện</span>
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/du-bao-luong')}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-amber-950/20 transition-all whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Dự Báo Lưu Lượng</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── THANH BỘ LỌC THỜI GIAN NHANH (QUICK TIME FILTERS) ───────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Filter className="h-4 w-4" />
          </div>
          <span>Kỳ thống kê điều hành:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">
            {getRangeLabel()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Các nút bấm Preset */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => handlePresetSelect('hom_nay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'hom_nay'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => handlePresetSelect('7_ngay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === '7_ngay'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => handlePresetSelect('thang_nay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'thang_nay'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => handlePresetSelect('quy_nay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'quy_nay'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quý này
            </button>
            <button
              onClick={() => handlePresetSelect('tat_ca')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'tat_ca'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setTimeRange('tuy_chon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === 'tuy_chon'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tùy chọn
            </button>
          </div>

          {/* Ô nhập ngày tùy chọn */}
          {timeRange === 'tuy_chon' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-gray-800 font-medium focus:outline-none"
              />
              <span className="text-gray-400 font-bold">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-gray-800 font-medium focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── 5 TOP EXECUTIVE KPI CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Doanh thu viện phí */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Doanh Thu Viện Phí</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-3 tracking-tight">
            {isLoading ? '...' : formatCurrency(kpis.doanhThuTrongKy ?? kpis.tongDoanhThu ?? 0)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <span>Hôm nay: <strong className="text-emerald-800">{formatCurrency(kpis.doanhThuHomNay || 0)}</strong></span>
            <span className="font-semibold text-gray-700">Lũy kế: {formatCurrency(kpis.tongDoanhThu || 0)}</span>
          </div>
        </div>

        {/* 2. Lượt tiếp nhận */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Lượt Tiếp Nhận</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700 mt-3 tracking-tight">
            {isLoading ? '...' : `${kpis.tiepNhanTrongKy ?? kpis.totalTiepNhan ?? 0} ca`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <span>Hôm nay: <strong className="text-blue-800">{kpis.tiepNhanHomNay || 0} ca</strong></span>
            <span className="font-semibold text-gray-700">Tổng tích lũy: {kpis.totalTiepNhan || 0}</span>
          </div>
        </div>

        {/* 3. Chỉ định Cận lâm sàng */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-purple-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Chỉ Định CLS</span>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-700 mt-3 tracking-tight">
            {isLoading ? '...' : `${kpis.soCaCanLamSang ?? 0} ca`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <span className="text-purple-700 font-bold">Hoàn thành: {kpis.soCaHoanThanhCls ?? 0}</span>
            <span className="font-extrabold text-emerald-600">Đạt {kpis.tyLeHoanThanhCls ?? '100%'}</span>
          </div>
        </div>

        {/* 4. Kê Đơn Thuốc & Hoạt Động Dược */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-teal-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Đơn Thuốc & Dược</span>
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Pill className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-700 mt-3 tracking-tight">
            {isLoading ? '...' : `${kpis.soDonThuoc ?? 0} đơn`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <span>Bác sĩ: <strong className="text-gray-800">{kpis.soBacSi || 0}</strong></span>
            <span className="font-semibold text-teal-700">Nhân sự: {kpis.soNhanVien || 0}</span>
          </div>
        </div>

        {/* 5. Đơn yêu cầu chờ duyệt */}
        <div
          onClick={() => navigate('/ban-giam-doc/phe-duyet-don')}
          className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-xs hover:border-amber-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Yêu Cầu Chờ Duyệt</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-3 tracking-tight">
            {isLoading ? '...' : `${kpis.donChoDuyet || 0} đơn`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-primary-600 font-bold mt-2 pt-2 border-t border-amber-100">
            <span>Đơn từ nhân viên</span>
            <span className="flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Xử lý ngay <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* ─── CHARTS ROW: XU HƯỚNG & CƠ CẤU DOANH THU ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ xu hướng lượt khám & doanh thu */}
        <div className="lg:col-span-2">
          <MedCard
            title={`📊 Xu Hướng Khám Chữa Bệnh & Doanh Thu (${getRangeLabel()})`}
            subtitle="Số lượt bệnh nhân tiếp nhận và tổng doanh thu thu được theo ngày trong kỳ"
            action={
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setChartViewMode('all')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      chartViewMode === 'all'
                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setChartViewMode('kham')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      chartViewMode === 'kham'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    Lượt khám
                  </button>
                  <button
                    onClick={() => setChartViewMode('doanh_thu')}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      chartViewMode === 'doanh_thu'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    Doanh thu
                  </button>
                </div>
                <button
                  onClick={() => navigate('/ban-giam-doc/tai-chinh')}
                  className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 ml-1"
                >
                  Báo cáo chi tiết <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            }
          >
            <div className="h-72 w-full pt-2">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">Đang tải biểu đồ...</div>
              ) : (stats?.chart7Days || []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">Không có dữ liệu trong kỳ này</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats?.chart7Days || []} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.6} />
                    <XAxis dataKey="ngay" tick={{ fontSize: 12 }} />
                    
                    {/* Trục Y trái: Số ca khám */}
                    {(chartViewMode === 'all' || chartViewMode === 'kham') && (
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                        domain={[0, 'auto']}
                        tickFormatter={(val) => `${val} ca`}
                      />
                    )}

                    {/* Trục Y phải: Doanh thu */}
                    {(chartViewMode === 'all' || chartViewMode === 'doanh_thu') && (
                      <YAxis
                        yAxisId="right"
                        orientation={chartViewMode === 'doanh_thu' ? 'left' : 'right'}
                        tick={{ fontSize: 11 }}
                        domain={[0, 'auto']}
                        tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}Tr` : val > 0 ? `${Math.round(val / 1000)}k` : '0')}
                      />
                    )}

                    <Tooltip
                      formatter={(val, name) => [
                        name === 'Số ca khám' ? `${val} ca khám` : formatCurrency(val),
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                      }}
                      itemStyle={{ color: '#F8FAFC' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />

                    {/* Cột Số ca khám: maxBarSize={32} để không bị chiếm toàn bộ bề ngang */}
                    {(chartViewMode === 'all' || chartViewMode === 'kham') && (
                      <Bar
                        yAxisId="left"
                        dataKey="soLuotKham"
                        fill="#2563EB"
                        maxBarSize={32}
                        radius={[6, 6, 0, 0]}
                        name="Số ca khám"
                      />
                    )}

                    {/* Đường Doanh thu */}
                    {(chartViewMode === 'all' || chartViewMode === 'doanh_thu') && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="doanhThu"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 6, fill: '#059669' }}
                        name="Doanh thu"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>

        {/* Cơ cấu nguồn thu viện phí */}
        <div>
          <MedCard
            title="🍩 Cơ Cấu Nguồn Thu Viện Phí"
            subtitle="Phân bổ tỷ trọng theo loại phí dịch vụ y tế"
          >
            <div className="h-72 w-full flex flex-col items-center justify-center pt-2">
              {isLoading ? (
                <div className="text-sm text-gray-400">Đang tải...</div>
              ) : (stats?.coCauDoanhThu || []).length === 0 ? (
                <div className="text-sm text-gray-400">Chưa có giao dịch thanh toán trong kỳ</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.coCauDoanhThu || []}
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={82}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(stats?.coCauDoanhThu || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconSize={10}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>
      </div>

      {/* ─── CẬN LÂM SÀNG & KÊNH TIẾP NHẬN BỆNH NHÂN ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tiến độ & Hoàn thành Cận Lâm Sàng */}
        <div className="lg:col-span-2">
          <MedCard
            title="🧪 Hoạt Động & Năng Suất Cận Lâm Sàng (CLS)"
            subtitle="Theo dõi số lượng chỉ định và tỷ lệ trả kết quả đúng hạn cho bệnh nhân"
          >
            <div className="space-y-3.5 pt-2">
              {clsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">Chưa có chỉ định cận lâm sàng trong kỳ này</div>
              ) : (
                clsList.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.ten}</p>
                        <p className="text-xs text-gray-500">Đã trả kết quả: <strong className="text-emerald-700">{item.hoanThanh}</strong> / {item.tong} ca chỉ định</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="w-28 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: item.tyLe }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 min-w-[50px] text-right">{item.tyLe}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MedCard>
        </div>

        {/* Phân bổ kênh tiếp nhận */}
        <div>
          <MedCard
            title="📱 Phân Bổ Kênh Tiếp Nhận"
            subtitle="Tỷ trọng bệnh nhân hẹn trước qua App/Web vs Trực tiếp tại quầy"
          >
            <div className="space-y-4 pt-3">
              {kenhData.map((k, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: k.color || COLORS[idx] }}></span>
                      {k.name}
                    </span>
                    <span className="font-extrabold text-gray-900">
                      {k.value}% <span className="font-normal text-gray-400">({k.soCa ?? 0} ca)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${k.value}%`, backgroundColor: k.color || COLORS[idx] }}
                    ></div>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800">
                <p className="font-bold">Nhận định luồng phục vụ</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Khuyến khích bệnh nhân đặt lịch trực tuyến giúp giảm thời gian chờ đợi và tối ưu năng suất phòng khám.
                </p>
              </div>
            </div>
          </MedCard>
        </div>
      </div>

      {/* ─── CHỈ SỐ CSAT & ĐÁNH GIÁ CHẤT LƯỢNG TOÀN VIỆN (PATIENT SATISFACTION) ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
              Chất Lượng Phục Vụ & Chỉ Số Hài Lòng Toàn Viện (CSAT)
            </h2>
            <p className="text-xs text-gray-500">
              Tổng hợp đánh giá đa chiều từ người bệnh sau khi khám: Bác sĩ điều trị, Cận lâm sàng & Khâu tiếp đón
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
            {csat.tongDanhGia} lượt đánh giá ghi nhận
          </span>
        </div>

        {/* 4 Cards CSAT Dimensions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4.5 text-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-100">CSAT Toàn Viện</span>
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Star className="h-4.5 w-4.5 fill-white text-white" />
              </div>
            </div>
            <div className="my-2">
              <h3 className="text-3xl font-black">{csat.diemCSATToanVien || 5.0} <span className="text-lg font-normal">/ 5.0</span></h3>
              <p className="text-[11px] text-amber-100 font-semibold mt-0.5">Tỷ lệ hài lòng chung: {csat.tyLeHaiLong || '100%'}</p>
            </div>
            <div className="text-[10px] text-amber-100/90 pt-1.5 border-t border-white/20 flex justify-between">
              <span>Độ tin cậy: Cao</span>
              <span>{csat.tongDanhGia} phản hồi</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Khám Lâm Sàng Bác Sĩ</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Stethoscope className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="my-2">
              <h3 className="text-2xl font-black text-blue-700">{csat.diemBacSiTB || 5.0} <span className="text-sm font-normal text-gray-400">/ 5.0 ⭐</span></h3>
              <p className="text-[11px] text-gray-500">Chuyên môn & Thái độ thăm khám</p>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold pt-1.5 border-t border-gray-100">
              ✓ Đạt chuẩn cam kết chất lượng điều trị
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cận Lâm Sàng & Xét Nghiệm</span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FlaskConical className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="my-2">
              <h3 className="text-2xl font-black text-purple-700">{csat.diemClsTB || 5.0} <span className="text-sm font-normal text-gray-400">/ 5.0 ⭐</span></h3>
              <p className="text-[11px] text-gray-500">Thao tác kỹ thuật & Trả kết quả</p>
            </div>
            <div className="text-[10px] text-purple-600 font-bold pt-1.5 border-t border-gray-100">
              ✓ Thao tác chuẩn mực, chính xác
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiếp Đón & Cơ Sở Vật Chất</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="my-2">
              <h3 className="text-2xl font-black text-emerald-700">{csat.diemTiepDonTB || 5.0} <span className="text-sm font-normal text-gray-400">/ 5.0 ⭐</span></h3>
              <p className="text-[11px] text-gray-500">Chỉ dẫn, tiện nghi & phòng chờ</p>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold pt-1.5 border-t border-gray-100">
              ✓ Tiếp đón chu đáo, thủ tục nhanh
            </div>
          </div>
        </div>

        {/* Bảng Xếp Hạng Bác Sĩ & Danh Sách Nhận Xét */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Bảng Xếp Hạng Bác Sĩ theo điểm CSAT (5 cols) */}
          <div className="lg:col-span-5">
            <MedCard
              title="⭐ Bảng Xếp Hạng Hài Lòng Bác Sĩ"
              subtitle="Xếp hạng theo điểm số đánh giá thực tế của bệnh nhân"
            >
              <div className="divide-y divide-gray-100">
                {isLoadingCsat ? (
                  <div className="py-6 text-center text-xs text-gray-400">Đang nạp dữ liệu xếp hạng...</div>
                ) : (csat.bxhBacSi || []).length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-500">Chưa có đủ lượt đánh giá xếp hạng</div>
                ) : (
                  (csat.bxhBacSi || []).map((bs, idx) => (
                    <div key={bs.bacSiId || idx} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{bs.tenBacSi}</p>
                          <p className="text-[10px] text-gray-500">{bs.chuyenKhoa} • {bs.soLuotDanhGia} đánh giá</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 font-bold text-amber-700 text-xs">
                          <span>{bs.diemTB}</span>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600 block">
                          Hài lòng: {bs.tyLeHaiLong}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </MedCard>
          </div>

          {/* Cột phải: Danh sách Ý kiến & Nhận xét mới nhất kèm phản hồi của Giám Đốc (7 cols) */}
          <div className="lg:col-span-7">
            <MedCard
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4.5 w-4.5 text-primary-600" />
                    <span>Ý Kiến Bệnh Nhân & Chỉ Đạo Từ Ban Giám Đốc</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-normal">
                    Giám Đốc phản hồi trực tiếp
                  </span>
                </div>
              }
              subtitle="Lắng nghe tiếng nói người bệnh để cải tiến quy trình khám chữa bệnh"
            >
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {isLoadingCsat ? (
                  <div className="py-8 text-center text-xs text-gray-400">Đang tải nhận xét...</div>
                ) : (csat.danhSachMoiNhat || []).length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500">Chưa có nhận xét nào từ người bệnh</div>
                ) : (
                  (csat.danhSachMoiNhat || []).map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-primary-300 transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-gray-900 block font-bold">{item.tenBenhNhan}</strong>
                          <span className="text-[10px] text-gray-500">
                            Khám Bác sĩ: <strong className="text-gray-700">{item.tenBacSi}</strong> ({item.chuyenKhoa}) • {new Date(item.taoLuc).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-bold text-amber-800 text-xs">
                          <span>{item.diemBacSi}</span>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        </div>
                      </div>

                      {/* Tags tiêu chí */}
                      {item.tieuChiHaiLong?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tieuChiHaiLong.map((t, i) => (
                            <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-medium">
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Lời nhận xét */}
                      {item.nhanXet && (
                        <p className="text-gray-800 italic bg-white p-2 rounded-lg border border-gray-100 text-xs leading-relaxed">
                          &ldquo;{item.nhanXet}&rdquo;
                        </p>
                      )}

                      {/* Phản hồi của Giám Đốc hoặc nút phản hồi */}
                      {item.phanHoiGiamDoc ? (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold flex items-center gap-1 text-amber-800">
                              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Phản hồi của Ban Giám Đốc:
                            </span>
                            <p className="italic text-amber-950 mt-0.5">&ldquo;{item.phanHoiGiamDoc}&rdquo;</p>
                          </div>
                          <button
                            onClick={() => handleOpenReply(item)}
                            className="text-[10px] text-primary-700 font-bold hover:underline shrink-0"
                          >
                            Sửa
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleOpenReply(item)}
                            className="text-[11px] font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg border border-primary-200 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-primary-600" /> Phản hồi từ Ban Giám Đốc
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </MedCard>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM ROW: TOP BÁC SĨ & ĐIỀU HÀNH NHANH ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Bác sĩ khám nhiều nhất */}
        <div className="lg:col-span-2">
          <MedCard
            title={`🏆 Đội Ngũ Bác Sĩ Hoạt Động Hiệu Suất Cao (${getRangeLabel()})`}
            subtitle="Xếp hạng theo số ca bệnh án đã hoàn thành khám và điều trị"
          >
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-400">Đang tải...</div>
              ) : (stats?.topBacSi || []).length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">Chưa có dữ liệu khám của bác sĩ trong kỳ</div>
              ) : (
                (stats?.topBacSi || []).map((bs, index) => (
                  <div key={index} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{bs.hoTen}</p>
                        <p className="text-xs text-gray-500">{bs.chuyenKhoa}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        {bs.soCa} ca khám
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MedCard>
        </div>

        {/* Quick Links for Directors */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-gray-800 text-sm">Chức Năng Điều Hành Trọng Điểm</h3>

            <button
              onClick={() => navigate('/ban-giam-doc/tai-chinh')}
              className="w-full text-left p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors flex items-center justify-between group border border-blue-200"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="h-4.5 w-4.5 text-blue-700" />
                <div>
                  <p className="text-xs font-bold text-blue-900">Báo Cáo Toàn Diện BV</p>
                  <p className="text-[10px] text-blue-700">Lâm sàng, Cận lâm sàng, Dược & Tài chính</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/du-bao-luong')}
              className="w-full text-left p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors flex items-center justify-between group border border-amber-200"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-amber-700" />
                <div>
                  <p className="text-xs font-bold text-amber-900">Dự Báo Lưu Lượng</p>
                  <p className="text-[10px] text-amber-700">Phân tích theo dữ liệu vận hành</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/tra-cuu')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 transition-colors flex items-center justify-between group border border-gray-200"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4.5 w-4.5 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Tra Cứu Hồ Sơ Tổng Hợp</p>
                  <p className="text-[10px] text-gray-500">Tìm kiếm bệnh nhân & nhân sự</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/xep-lich')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 transition-colors flex items-center justify-between group border border-gray-200"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4.5 w-4.5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Xếp Lịch & Phân Ca Làm Việc</p>
                  <p className="text-[10px] text-gray-500">Điều phối bác sĩ & điều dưỡng</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL BAN GIÁM ĐỐC PHẢN HỒI ĐÁNH GIÁ ──────────────── */}
      {replyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-200" />
                <h3 className="font-extrabold text-base">Phản Hồi Từ Ban Giám Đốc</h3>
              </div>
              <button
                onClick={() => setReplyModal({ isOpen: false, item: null, text: '', saving: false })}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{replyModal.item?.tenBenhNhan}</span>
                  <div className="flex items-center gap-1 font-bold text-amber-700 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                    <span>{replyModal.item?.diemBacSi}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Bác sĩ: {replyModal.item?.tenBacSi} ({replyModal.item?.chuyenKhoa})
                </p>
                {replyModal.item?.nhanXet && (
                  <p className="text-gray-800 italic pt-1 border-t border-amber-200/60 mt-1">
                    &ldquo;{replyModal.item.nhanXet}&rdquo;
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-800 block">
                  Nội dung phản hồi / Chỉ đạo của Ban Giám Đốc:
                </label>
                <textarea
                  rows={4}
                  value={replyModal.text}
                  onChange={(e) => setReplyModal((prev) => ({ ...prev, text: e.target.value }))}
                  placeholder="Ví dụ: Cảm ơn quý bệnh nhân đã tin tưởng và đánh giá cao bác sĩ. Ban Giám Đốc sẽ tiếp tục duy trì và nâng cao chất lượng dịch vụ..."
                  className="w-full p-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all text-xs"
                ></textarea>
                <p className="text-[11px] text-gray-400">
                  * Ý kiến phản hồi sẽ được hiển thị công khai tới Bệnh nhân và Bác sĩ phụ trách ca khám.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModal({ isOpen: false, item: null, text: '', saving: false })}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={replyModal.saving || !replyModal.text.trim()}
                  onClick={handleSaveReply}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {replyModal.saving ? 'Đang lưu...' : 'Gửi Phản Hồi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
