import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { apiGet } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import {
  BarChart3, AlertTriangle, Clock, DollarSign, Printer, Search, Pill,
  FileSpreadsheet, ShoppingCart, PlusCircle, ClipboardCheck, ArrowUpRight,
  TrendingUp, CheckCircle2, Filter, RotateCcw, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, Legend
} from 'recharts';

export default function ThongKeNhaThuocPage() {
  const navigate = useNavigate();

  // State bộ lọc (Filter states)
  const [timeFilter, setTimeFilter] = useState('7days'); // 'today' | '7days' | 'month' | 'quarter' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'con_hang' | 'canh_bao' | 'het_hang' | 'can_date'
  const [routeFilter, setRouteFilter] = useState('all'); // 'all' | 'Uống' | 'Tiêm' | 'Bôi ngoài da' | ...
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['thong-ke-nha-thuoc', timeFilter, fromDate, toDate, statusFilter, routeFilter],
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
        t.tenThuoc?.toLowerCase().includes(search.toLowerCase()) ||
        t.maThuoc?.toLowerCase().includes(search.toLowerCase()) ||
        t.maLo?.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'canh_bao' ? t.tonKhoTong > 0 && t.tonKhoTong <= 20 :
        statusFilter === 'het_hang' ? t.tonKhoTong <= 0 :
        statusFilter === 'con_hang' ? t.tonKhoTong > 20 : true;

      const matchRoute =
        routeFilter === 'all' ? true :
        (t.duongDung || '').toLowerCase().includes(routeFilter.toLowerCase());

      return matchSearch && matchStatus && matchRoute;
    });
  }, [stats.listThuoc, search, statusFilter, routeFilter]);

  // Lọc bảng cảnh báo rủi ro theo trạng thái
  const filteredCanhBao = useMemo(() => {
    if (statusFilter === 'all') return stats.canhBaoRuiRo || [];
    if (statusFilter === 'het_hang') return (stats.canhBaoRuiRo || []).filter(r => r.mucDo === 'nguy_cap');
    if (statusFilter === 'canh_bao') return (stats.canhBaoRuiRo || []).filter(r => r.loaiRuiRo.includes('Tồn kho nguy cấp'));
    if (statusFilter === 'can_date') return (stats.canhBaoRuiRo || []).filter(r => r.loaiRuiRo.includes('Cận hạn'));
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

  // Xuất file CSV báo cáo kho thuốc đã lọc
  const handleExportCSV = () => {
    const headers = ['Mã Thuốc', 'Tên Thuốc', 'Đơn Vị Tính', 'Mã Lô', 'Hạn Sử Dụng', 'Đơn Giá (VNĐ)', 'Tồn Kho Tổng', 'Thành Tiền (VNĐ)', 'Trạng Thái'];
    const rows = filteredList.map((t) => [
      t.maThuoc,
      `"${t.tenThuoc}"`,
      t.donViTinh,
      t.maLo || '---',
      t.ngayHetHan || '---',
      t.giaBan,
      t.tonKhoTong,
      t.giaBan * t.tonKhoTong,
      t.trangThai === 'canh_bao' ? 'Cảnh báo tồn ít' : t.trangThai === 'het_hang' ? 'Hết hàng' : 'Còn hàng',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Kho_Thuoc_${timeFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#6366F1', '#F97316'];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Quick Actions Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-600" /> Báo Cáo & Thống Kê Dược Phẩm
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Theo dõi lưu lượng xuất nhập, cảnh báo rủi ro tồn kho FEFO và quản lý tài sản dược
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<ShoppingCart className="h-4 w-4 text-emerald-600" />}
            onClick={() => navigate('/nha-thuoc/don-thuoc')}
          >
            Cấp phát / Bán thuốc
          </MedButton>
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<PlusCircle className="h-4 w-4 text-primary-600" />}
            onClick={() => navigate('/nha-thuoc/kho-thuoc')}
          >
            Nhập kho dược
          </MedButton>
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            In Báo Cáo
          </MedButton>
          <MedButton
            variant="primary"
            size="sm"
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Xuất Excel/CSV
          </MedButton>
        </div>
      </div>

      {/* BỘ LỌC THỐNG KÊ TOÀN DIỆN (COMPREHENSIVE FILTER BAR) */}
      <div className="rounded-2xl bg-white p-5 shadow-2xs border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary-600" /> Bộ Lọc Thống Kê & Báo Cáo
          </div>
          <button
            onClick={handleResetFilter}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary-600 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại bộ lọc
          </button>
        </div>

        {/* Hàng 1: Bộ lọc thời gian nhanh */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-gray-600 mr-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary-500" /> Thời gian:
          </span>
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: '7days', label: '7 ngày qua' },
            { key: 'month', label: 'Tháng này' },
            { key: 'quarter', label: 'Quý này' },
            { key: 'custom', label: 'Tùy chỉnh ngày' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTimeFilter(item.key)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                timeFilter === item.key
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Chọn khoảng ngày tùy chỉnh */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-gray-300 p-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              <span className="text-gray-400">&rarr;</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-gray-300 p-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Hàng 2: Bộ lọc chi tiết theo Tiêu chí & Tìm kiếm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {/* Trạng thái kho & rủi ro */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Trạng thái kho & Rủi ro</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
            >
              <option value="all">Tất cả trạng thái kho</option>
              <option value="con_hang">🟢 Còn hàng sẵn sàng (&gt; 20)</option>
              <option value="canh_bao">🟡 Cảnh báo tồn ít (&le; 20)</option>
              <option value="het_hang">🔴 Hết hàng (Tồn = 0)</option>
              <option value="can_date">⏰ Lô cận hạn sử dụng (&le; 60 ngày)</option>
            </select>
          </div>

          {/* Đường dùng thuốc */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Đường dùng thuốc</label>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
            >
              <option value="all">Tất cả đường dùng</option>
              <option value="Uống">Đường uống</option>
              <option value="Tiêm">Tiêm / Truyền dịch</option>
              <option value="Bôi ngoài da">Bôi ngoài da</option>
              <option value="Nhỏ mắt/mũi">Nhỏ mắt / mũi</option>
              <option value="Đặt hậu môn">Đặt hậu môn</option>
            </select>
          </div>

          {/* Tìm kiếm nhanh */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tìm kiếm từ khóa</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên thuốc, mã thuốc, mã lô..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 1. THẺ CHỈ SỐ TỔNG QUAN (KPI CARDS - TOP LEVEL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MedCard className="bg-gradient-to-br from-blue-50/80 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Đơn Xuất Trong Ngày</p>
              <h3 className="text-3xl font-extrabold text-blue-900 mt-1">{stats.donXuatTrongNgay} <span className="text-xs font-normal text-blue-600">đơn</span></h3>
              <p className="text-[11px] text-blue-600/80 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Đã hoàn tất cấp phát
              </p>
            </div>
            <div className="p-3.5 bg-blue-100 rounded-2xl text-blue-600 shadow-2xs">
              <ClipboardCheck className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-amber-50/80 to-white border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Dưới Định Mức An Toàn</p>
              <h3 className="text-3xl font-extrabold text-amber-900 mt-1">{stats.sapHetHang} <span className="text-xs font-normal text-amber-600">mã</span></h3>
              <p className="text-[11px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Cần lập phiếu nhập gấp
              </p>
            </div>
            <div className="p-3.5 bg-amber-100 rounded-2xl text-amber-600 shadow-2xs">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-rose-50/80 to-white border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Lô Cận Date (&le; 60 ngày)</p>
              <h3 className="text-3xl font-extrabold text-rose-900 mt-1">{stats.sapHetHanCount} <span className="text-xs font-normal text-rose-600">lô</span></h3>
              <p className="text-[11px] text-rose-700 mt-1 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" /> Ưu tiên xuất FEFO
              </p>
            </div>
            <div className="p-3.5 bg-rose-100 rounded-2xl text-rose-600 shadow-2xs">
              <Clock className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tổng Giá Trị Kho Dược</p>
              <h3 className="text-2xl font-extrabold text-emerald-900 mt-1">{formatCurrency(stats.tongGiaTriKho)}</h3>
              <p className="text-[11px] text-emerald-600/90 mt-1 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {stats.tongSoThuoc} danh mục thuốc
              </p>
            </div>
            <div className="p-3.5 bg-emerald-100 rounded-2xl text-emerald-600 shadow-2xs">
              <DollarSign className="h-7 w-7" />
            </div>
          </div>
        </MedCard>
      </div>

      {/* 2. BẢNG CẢNH BÁO RỦI RO TỒN KHO (QUAN TRỌNG NHẤT) */}
      <MedCard
        title="⚠️ Bảng Cảnh Báo Rủi Ro Tồn Kho & Cận Hạn Sử Dụng (Xử lý ngay)"
        subtitle="Danh sách các loại thuốc đã cạn kiệt hoặc các lô thuốc sắp hết hạn cần ưu tiên xử lý"
      >
        {filteredCanhBao.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-red-100">
            <table className="w-full text-left border-collapse">
              <thead className="bg-red-50/60 text-xs font-bold text-red-900 uppercase tracking-wider border-b border-red-100">
                <tr>
                  <th className="px-4 py-3">Mã Thuốc</th>
                  <th className="px-4 py-3">Tên Thuốc / Lô Hàng</th>
                  <th className="px-4 py-3">Loại Rủi Ro</th>
                  <th className="px-4 py-3 text-right">Số Lượng Tồn</th>
                  <th className="px-4 py-3 text-center">Hạn Sử Dụng</th>
                  <th className="px-4 py-3 text-right">Hành Động Đề Xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredCanhBao.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{item.maThuoc}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.tenThuoc}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        item.mucDo === 'nguy_cap' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <AlertTriangle className="h-3 w-3" /> {item.loaiRuiRo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-gray-900">{item.soLuong} {item.donViTinh}</td>
                    <td className="px-4 py-3 text-center text-xs font-mono font-medium text-gray-600">{item.hanDung}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        onClick={() => navigate('/nha-thuoc/kho-thuoc')}>
                        {item.hanhDong} <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
            <p className="text-sm font-bold text-emerald-800">Kho thuốc an toàn theo tiêu chí lọc</p>
            <p className="text-xs text-emerald-600 mt-0.5">Không có loại thuốc nào cạn kiệt hay cận date thuộc nhóm lọc đã chọn</p>
          </div>
        )}
      </MedCard>

      {/* 3. BIỂU ĐỒ THỐNG KÊ & PHÂN TÍCH (CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 thuốc xuất nhiều nhất (Biểu đồ cột ngang) */}
        <MedCard
          title="Top 10 Thuốc Xuất Nhiều Nhất"
          subtitle="Giúp dược sĩ chủ động cắt liều sẵn và bố trí vị trí tiện lấy trên kệ"
        >
          {stats.top10Thuoc && stats.top10Thuoc.length > 0 ? (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.top10Thuoc}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="tenThuoc" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(val) => [`${val} đơn vị`, 'Số lượng đã xuất']} />
                  <Bar dataKey="tongDaBan" radius={[0, 8, 8, 0]}>
                    {stats.top10Thuoc.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">Chưa có dữ liệu xuất thuốc theo bộ lọc</p>
          )}
        </MedCard>

        {/* Lưu lượng xuất/nhập kho (Biểu đồ đường) */}
        <MedCard
          title="Lưu Lượng Xuất / Nhập Kho"
          subtitle="Theo dõi tần suất giao dịch để điều phối nhân sự trực quầy giờ cao điểm"
        >
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.luuLuongGiaoDich} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorXuat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNhap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="ngay" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="soDonXuat" name="Đơn xuất kho" stroke="#2563EB" fillOpacity={1} fill="url(#colorXuat)" />
                <Area type="monotone" dataKey="soNhapKho" name="Lô nhập kho" stroke="#10B981" fillOpacity={1} fill="url(#colorNhap)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MedCard>
      </div>

      {/* 4. BẢNG CHI TIẾT TỒN KHO & HẠN SỬ DỤNG THEO BỘ LỌC */}
      <MedCard
        title={`Chi Tiết Danh Mục Tồn Kho Theo Bộ Lọc (${filteredList.length} loại thuốc)`}
        subtitle="Tra cứu danh mục, tồn kho và hạn sử dụng từng loại thuốc đã được lọc"
      >
        {filteredList.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Mã Thuốc</th>
                  <th className="px-4 py-3">Tên Thuốc</th>
                  <th className="px-4 py-3 text-center">ĐVT</th>
                  <th className="px-4 py-3">Mã Lô & HSD</th>
                  <th className="px-4 py-3 text-right">Đơn Giá</th>
                  <th className="px-4 py-3 text-center">Tồn Kho</th>
                  <th className="px-4 py-3 text-right">Thành Tiền</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary-700">{t.maThuoc}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{t.tenThuoc}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{t.donViTinh}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-mono text-gray-800 font-bold">{t.maLo || '---'}</div>
                      <div className="text-[11px] text-gray-500">HSD: {t.ngayHetHan || '---'}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(t.giaBan)}</td>
                    <td className="px-4 py-3 text-center font-bold text-base">
                      <span className={t.tonKhoTong <= 20 ? 'text-amber-600' : 'text-gray-900'}>
                        {t.tonKhoTong}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary-700">{formatCurrency(t.giaBan * t.tonKhoTong)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={t.trangThai} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-8 text-center">Không tìm thấy loại thuốc nào phù hợp với bộ lọc</p>
        )}
      </MedCard>
    </div>
  );
}
