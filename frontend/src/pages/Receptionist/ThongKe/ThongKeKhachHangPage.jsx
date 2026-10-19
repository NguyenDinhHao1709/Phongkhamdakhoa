import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart2,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Activity,
  Heart,
  Stethoscope,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Star,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Smile,
  Award,
  Layers,
  Calendar,
  X,
  RotateCcw,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { apiGet } from '../../../services/api';
import { formatDateTime, formatDate } from '../../../utils/formatDate';
import GuiBaoCaoModal from '../../../components/Report/GuiBaoCaoModal';
import LichSuBaoCaoModal from '../../../components/Report/LichSuBaoCaoModal';

export default function ThongKeKhachHangPage() {
  // Tab chính: 'overview' (Tổng quan & Biểu đồ) | 'reviews' (Đánh giá bệnh nhân) | 'list' (Chi tiết lượt tiếp đón)
  const [activeTab, setActiveTab] = useState('overview');
  const [isGuiBaoCaoOpen, setIsGuiBaoCaoOpen] = useState(false);
  const [isLichSuBaoCaoOpen, setIsLichSuBaoCaoOpen] = useState(false);

  // Filter thời gian
  const [timeRange, setTimeRange] = useState('tat_ca');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Bộ lọc danh sách chi tiết
  const [search, setSearch] = useState('');
  const [selectedPhong, setSelectedPhong] = useState('TAT_CA');
  const [selectedTrangThai, setSelectedTrangThai] = useState('TAT_CA');
  const [selectedLoai, setSelectedLoai] = useState('TAT_CA');

  const [stats, setStats] = useState(null);
  const [listData, setListData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Phân trang
  const [page, setPage] = useState(1);
  const limit = 15;

  // Bộ lọc & phân trang riêng cho Tab Đánh giá của bệnh nhân
  const [reviewStarFilter, setReviewStarFilter] = useState('all'); // 'all' | '5' | '4' | 'under4'
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewOnlyComment, setReviewOnlyComment] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const reviewLimit = 6;

  // Modal chi tiết lượt tiếp đón
  const [selectedItem, setSelectedItem] = useState(null);

  // Tải dữ liệu từ backend
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Params thời gian
      let dateParams = `khoangThoiGian=${timeRange}`;
      if (fromDate && toDate) {
        dateParams += `&tuNgay=${fromDate}&denNgay=${toDate}`;
      }

      // 2. Tải thống kê KPI, biểu đồ & đánh giá
      const statsRes = await apiGet(`/tiep-nhan/bao-cao/thong-ke?${dateParams}`);
      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      // 3. Tải danh sách lượt tiếp nhận theo trang thực tế
      let listParams = `?${dateParams}&page=${page}&limit=${limit}`;
      if (selectedPhong !== 'TAT_CA') listParams += `&phongKhamId=${selectedPhong}`;
      if (selectedTrangThai !== 'TAT_CA') listParams += `&trangThai=${selectedTrangThai}`;
      if (selectedLoai !== 'TAT_CA') listParams += `&loaiTiepNhan=${selectedLoai}`;
      if (search.trim()) listParams += `&search=${encodeURIComponent(search.trim())}`;

      const listRes = await apiGet(`/tiep-nhan/bao-cao/danh-sach${listParams}`);
      const items = Array.isArray(listRes?.data) ? listRes.data : listRes?.data?.data || [];
      setListData(items);
      setTotalCount(listRes?.data?.meta?.total || listRes?.meta?.total || statsRes?.data?.tongLuot || items.length);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu báo cáo tiếp nhận:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, fromDate, toDate, selectedPhong, selectedTrangThai, selectedLoai, page, search]);

  // Reset bộ lọc
  const handleResetFilter = () => {
    setTimeRange('tat_ca');
    setFromDate('');
    setToDate('');
    setSearch('');
    setSelectedPhong('TAT_CA');
    setSelectedTrangThai('TAT_CA');
    setSelectedLoai('TAT_CA');
    setPage(1);
  };

  const getKyBaoCaoLabel = () => {
    if (fromDate && toDate) return `Từ ${formatDate(fromDate)} đến ${formatDate(toDate)}`;
    if (fromDate) return `Từ ngày ${formatDate(fromDate)}`;
    if (timeRange === 'hom_nay') return `Hôm nay (${formatDate(new Date())})`;
    if (timeRange === '7_ngay') return '7 ngày qua';
    if (timeRange === 'thang_nay') return `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    if (timeRange === 'tat_ca') return 'Toàn thời gian';
    return `Kỳ ${timeRange || 'thống kê'}`;
  };

  const hasActiveFilters =
    timeRange !== 'tat_ca' ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(search.trim()) ||
    selectedPhong !== 'TAT_CA' ||
    selectedTrangThai !== 'TAT_CA' ||
    selectedLoai !== 'TAT_CA';

  // Phân trang
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Xuất file CSV
  const handleExportCSV = () => {
    const headers = [
      'STT',
      'Mã Tiếp Nhận',
      'Mã Bệnh Nhân',
      'Họ Tên',
      'Năm Sinh',
      'Giới Tính',
      'Số Điện Thoại',
      'Phòng Khám',
      'Bác Sĩ',
      'Thời Gian Đến',
      'Huyết Áp',
      'Mạch',
      'Nhiệt Độ',
      'SpO2',
      'Hình Thức',
      'Trạng Thái',
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      `"${item.maSoThuTu || ''}"`,
      `"${item.benhNhan?.maBenhNhan || ''}"`,
      `"${item.benhNhan?.hoTen || ''}"`,
      `"${item.benhNhan?.ngaySinh ? item.benhNhan.ngaySinh.slice(0, 4) : ''}"`,
      `"${item.benhNhan?.gioiTinh === 'nam' ? 'Nam' : item.benhNhan?.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}"`,
      `"${item.benhNhan?.soDienThoai || ''}"`,
      `"${item.phongKham?.ten_phong || 'Chưa chỉ định'}"`,
      `"${item.bacSi?.nhanVien?.hoTen || 'Chưa chỉ định'}"`,
      `"${item.thoiGianDen ? new Date(item.thoiGianDen).toLocaleString('vi-VN') : ''}"`,
      `"${item.sinhHieu?.huyetApTamThu ? `${item.sinhHieu.huyetApTamThu}/${item.sinhHieu.huyetApTamTruong || 80}` : '—'}"`,
      `"${item.sinhHieu?.nhipTim ? `${item.sinhHieu.nhipTim} bpm` : '—'}"`,
      `"${item.sinhHieu?.nhietDoC ? `${item.sinhHieu.nhietDoC}°C` : '—'}"`,
      `"${item.sinhHieu?.spo2 ? `${item.sinhHieu.spo2}%` : '—'}"`,
      `"${item.lichHenId ? 'Đặt hẹn online' : 'Khám trực tiếp'}"`,
      `"${item.trangThai || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    link.download = `bao_cao_tiep_don_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Helper render badge trạng thái
  const renderBadgeTrangThai = (status) => {
    switch (status) {
      case 'cho_kham':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ khám
          </span>
        );
      case 'dang_kham':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Đang khám
          </span>
        );
      case 'hoan_thanh':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã khám
          </span>
        );
      case 'da_huy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  // Tính max count khung giờ để vẽ biểu đồ thanh cột
  const maxKhungGio = useMemo(() => {
    if (!stats?.khungGio) return 1;
    return Math.max(...stats.khungGio.map((k) => k.count), 1);
  }, [stats]);

  const danhGiaData = stats?.danhGia || {
    tongSoDanhGia: 0,
    diemTrungBinhTiepDon: 5.0,
    diemTrungBinhChung: 5.0,
    danhSach: [],
  };

  // Lọc và phân trang cho Tab Đánh giá
  const filteredReviews = useMemo(() => {
    const list = danhGiaData.danhSach || [];
    return list.filter((r) => {
      // Lọc theo từ khóa tìm kiếm
      if (reviewSearch.trim()) {
        const q = reviewSearch.toLowerCase().trim();
        const matchName = r.benhNhan?.hoTen?.toLowerCase().includes(q);
        const matchCode = r.benhNhan?.maBenhNhan?.toLowerCase().includes(q);
        const matchDoc = r.bacSi?.toLowerCase().includes(q);
        const matchComment = r.nhanXet?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDoc && !matchComment) return false;
      }
      // Lọc theo số sao
      if (reviewStarFilter === '5' && Number(r.diemTiepDon || 5) < 5) return false;
      if (reviewStarFilter === '4' && (Number(r.diemTiepDon || 5) !== 4)) return false;
      if (reviewStarFilter === 'under4' && Number(r.diemTiepDon || 5) >= 4) return false;
      // Lọc chỉ xem có nhận xét
      if (reviewOnlyComment && !r.nhanXet?.trim()) return false;

      return true;
    });
  }, [danhGiaData.danhSach, reviewSearch, reviewStarFilter, reviewOnlyComment]);

  const totalReviewPages = Math.ceil(filteredReviews.length / reviewLimit) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (reviewPage - 1) * reviewLimit;
    return filteredReviews.slice(start, start + reviewLimit);
  }, [filteredReviews, reviewPage, reviewLimit]);

  return (
    <div className="space-y-5 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* ─── 1. HEADER & BỘ LỌC THỜI GIAN NHANH ──────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              RECEPTION ANALYTICS & DASHBOARD
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Đồng bộ thời gian thực
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-1">
            Báo Cáo & Thống Kê Tiếp Đón Bệnh Nhân
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Giám sát toàn diện lưu lượng đăng ký khám, hiệu suất điều phối phòng khám và mức độ hài lòng của người bệnh.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-xs transition-all disabled:opacity-60 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setIsGuiBaoCaoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Gửi báo cáo lên Ban Giám Đốc"
          >
            <span>📤</span>
            <span>Gửi Báo Cáo Giám Đốc</span>
          </button>

          <button
            onClick={() => setIsLichSuBaoCaoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200 hover:bg-indigo-100 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Xem lịch sử báo cáo & ý kiến chỉ đạo từ Ban Giám Đốc"
          >
            <span>📋</span>
            <span>Lịch Sử & Chỉ Đạo</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 shadow-xs transition-all cursor-pointer"
            title="Xuất file CSV báo cáo"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-xs transition-all cursor-pointer"
            title="In trang báo cáo"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* ─── 2. THANH BỘ LỌC THÔNG MINH GỌN ĐẸP ──────────────────── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        {/* Hàng 1: Preset mốc thời gian & Tùy chọn ngày & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium mr-1">
              <Calendar className="h-3.5 w-3.5 text-primary-600" />
              <span>Thời gian:</span>
            </div>

            {[
              { id: 'tat_ca', label: 'Toàn thời gian' },
              { id: 'hom_nay', label: 'Hôm nay' },
              { id: '7_ngay', label: '7 ngày qua' },
              { id: 'thang_nay', label: 'Tháng này' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setTimeRange(p.id);
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === p.id && !fromDate
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Custom date range picker */}
            <div className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setTimeRange('custom');
                  setPage(1);
                }}
                className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
                title="Từ ngày"
              />
              <span className="text-gray-400 font-bold">—</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setTimeRange('custom');
                  setPage(1);
                }}
                className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
                title="Đến ngày"
              />
            </div>
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên, SĐT, mã BN, STT..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Hàng 2: Bộ lọc theo Phòng khám, Trạng thái, Hình thức */}
        <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium text-xs">Phòng khám:</span>
              <select
                value={selectedPhong}
                onChange={(e) => {
                  setSelectedPhong(e.target.value);
                  setPage(1);
                }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="TAT_CA">Tất cả phòng khám</option>
                <option value="1">Phòng 101 - Khám Nội Tổng Quát</option>
                <option value="2">Phòng 102 - Khám Tim Mạch & HA</option>
                <option value="3">Phòng 103 - Khám Nhi Khoa & TMH</option>
                <option value="4">Phòng 201 - Lấy Mẫu Xét Nghiệm</option>
                <option value="5">Phòng 202 - Siêu Âm Màu</option>
                <option value="6">Phòng 203 - Chụp X-Quang KTS</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium text-xs">Trạng thái:</span>
              <select
                value={selectedTrangThai}
                onChange={(e) => {
                  setSelectedTrangThai(e.target.value);
                  setPage(1);
                }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="TAT_CA">Tất cả trạng thái</option>
                <option value="cho_kham">🟡 Chờ khám</option>
                <option value="dang_kham">🔵 Đang khám</option>
                <option value="hoan_thanh">🟢 Đã hoàn thành</option>
                <option value="da_huy">🔴 Đã hủy</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium text-xs">Hình thức:</span>
              <select
                value={selectedLoai}
                onChange={(e) => {
                  setSelectedLoai(e.target.value);
                  setPage(1);
                }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="TAT_CA">Mọi hình thức tiếp đón</option>
                <option value="dat_lich">📅 Đặt lịch online</option>
                <option value="vang_lai">🚶 Khám vãng lai tại quầy</option>
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

      {/* ─── 3. 5 KPI METRIC CARDS TINH GỌN ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tổng tiếp nhận */}
        <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white rounded-2xl p-4 border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Tổng Tiếp Nhận
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-900 mt-2">
            {stats?.tongLuot?.toLocaleString('vi-VN') || 0}{' '}
            <span className="text-xs font-normal text-blue-600">lượt</span>
          </p>
          <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Lượt đăng ký khám</p>
        </div>

        {/* Card 2: Đặt lịch online */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white rounded-2xl p-4 border border-indigo-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              Đặt Lịch Online
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-900 mt-2">
            {stats?.datLichCount?.toLocaleString('vi-VN') || 0}{' '}
            <span className="text-xs font-normal text-indigo-600">lượt</span>
          </p>
          <p className="text-[11px] text-indigo-600 mt-0.5 font-medium">Đã cọc & xác nhận trước</p>
        </div>

        {/* Card 3: Khám vãng lai */}
        <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white rounded-2xl p-4 border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Khám Vãng Lai
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-900 mt-2">
            {stats?.vangLaiCount?.toLocaleString('vi-VN') || 0}{' '}
            <span className="text-xs font-normal text-amber-600">lượt</span>
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5 font-medium">Đến trực tiếp đăng ký</p>
        </div>

        {/* Card 4: Hoàn thành khám */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Hoàn Thành Khám
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <p className="text-2xl font-extrabold text-emerald-900">
              {stats?.hoanThanhCount?.toLocaleString('vi-VN') || 0}
            </p>
            <span className="text-xs font-semibold text-emerald-600">
              ({stats?.tyLeHoanThanh || 0}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Đã xong quy trình khám</p>
        </div>

        {/* Card 5: Điểm đánh giá dịch vụ */}
        <div
          onClick={() => setActiveTab('reviews')}
          className="bg-gradient-to-br from-amber-50/80 via-yellow-50/30 to-white rounded-2xl p-4 border border-amber-200 shadow-xs cursor-pointer hover:border-amber-300 transition-all col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Hài Lòng Tiếp Đón
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <p className="text-2xl font-extrabold text-amber-900">
              {danhGiaData.diemTrungBinhTiepDon || '5.0'}
            </p>
            <span className="text-xs font-semibold text-amber-600">/ 5.0 ⭐</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5 font-semibold flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" /> {danhGiaData.tongSoDanhGia} phản hồi từ BN
          </p>
        </div>
      </div>

      {/* ─── 4. THANH ĐIỀU HƯỚNG TAB CHUYÊN MÔN ────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-2xl w-fit text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          <span>Biểu Đồ & Phân Tích Lưu Lượng</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reviews'
              ? 'bg-white text-amber-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          <span>Đánh Giá Của Bệnh Nhân</span>
          {danhGiaData.tongSoDanhGia > 0 && (
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full text-[10px]">
              {danhGiaData.tongSoDanhGia}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'list'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Chi Tiết Tiếp Đón ({totalCount.toLocaleString('vi-VN')})</span>
        </button>
      </div>

      {/* ─── 5. NỘI DUNG TỪNG TAB ─────────────────────────────────── */}

      {/* ── TAB 1: BIỂU ĐỒ & PHÂN TÍCH LƯU LƯỢNG ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Phân bổ theo chuyên khoa & phòng khám (7 cols) */}
            <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Phân Bổ Lượt Khám Theo Chuyên Khoa & Phòng
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tỷ lệ tiếp nhận và điều phối bệnh nhân vào từng phòng khám
                  </p>
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                  Tỷ trọng / Tổng lượt
                </span>
              </div>

              <div className="space-y-3.5 pt-1">
                {stats?.theoPhongKham && stats.theoPhongKham.length > 0 ? (
                  stats.theoPhongKham.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-gray-800 font-semibold truncate max-w-[280px] sm:max-w-md">
                          {item.tenPhong}
                          <span className="ml-1.5 text-[11px] font-normal text-gray-500">
                            ({item.chuyenKhoa})
                          </span>
                        </span>
                        <span className="text-gray-700 font-mono font-bold">
                          {item.soLuot} lượt{' '}
                          <span className="text-blue-600">({item.tyLe}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            idx === 0
                              ? 'bg-blue-600'
                              : idx === 1
                              ? 'bg-indigo-500'
                              : idx === 2
                              ? 'bg-emerald-500'
                              : idx === 3
                              ? 'bg-amber-500'
                              : 'bg-cyan-500'
                          }`}
                          style={{ width: `${Math.max(item.tyLe, 3)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 py-10 text-center">Chưa có dữ liệu phòng khám</p>
                )}
              </div>
            </div>

            {/* Lưu lượng theo Khung giờ trong ngày (5 cols) */}
            <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Lưu Lượng Theo Khung Giờ (07h - 19h)
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Nhận diện khung giờ cao điểm đón tiếp</p>
                </div>
                <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  Phân luồng tiếp đón
                </span>
              </div>

              {/* Bar chart dạng cột trực quan */}
              <div className="pt-2">
                <div className="grid grid-cols-6 gap-2 h-44 items-end pb-2 border-b border-gray-100">
                  {stats?.khungGio &&
                    stats.khungGio.map((kg, i) => {
                      const heightPct = Math.round((kg.count / maxKhungGio) * 100);
                      const isPeak = kg.count === maxKhungGio && kg.count > 0;
                      return (
                        <div key={i} className="flex flex-col items-center h-full justify-end group">
                          <span
                            className={`text-[11px] font-bold font-mono mb-1 transition-all ${
                              isPeak ? 'text-blue-700' : 'text-gray-500'
                            }`}
                          >
                            {kg.count}
                          </span>
                          <div
                            className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 group-hover:opacity-80 ${
                              isPeak
                                ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-xs'
                                : 'bg-gradient-to-t from-blue-400 to-blue-200'
                            }`}
                            style={{ height: `${Math.max(heightPct, 6)}%` }}
                          />
                        </div>
                      );
                    })}
                </div>

                <div className="grid grid-cols-6 gap-1 pt-2 text-center">
                  {stats?.khungGio &&
                    stats.khungGio.map((kg, i) => (
                      <div key={i}>
                        <p className="text-[10px] font-bold text-gray-700 truncate">{kg.khung}</p>
                        <p className="text-[9px] text-gray-400 truncate">{kg.label}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Phân bổ nhóm tuổi & giới tính */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              Cơ Cấu Đối Tượng Bệnh Nhân Đến Khám
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 font-medium">Trẻ Em (&lt; 16 tuổi)</p>
                <p className="text-2xl font-black text-blue-900 mt-1">
                  {stats?.nhomTuoi?.treEm || 0}
                </p>
                <p className="text-[11px] text-blue-500 mt-0.5">Ưu tiên bàn tiếp đón Nhi</p>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium">Người Lớn (16 - 59 tuổi)</p>
                <p className="text-2xl font-black text-emerald-900 mt-1">
                  {stats?.nhomTuoi?.nguoiLon || 0}
                </p>
                <p className="text-[11px] text-emerald-500 mt-0.5">Khám định kỳ & đa khoa</p>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-600 font-medium">Người Cao Tuổi (≥ 60 tuổi)</p>
                <p className="text-2xl font-black text-amber-900 mt-1">
                  {stats?.nhomTuoi?.caoTuoi || 0}
                </p>
                <p className="text-[11px] text-amber-500 mt-0.5">Hỗ trợ đo HA & hướng dẫn tận tình</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ĐÁNH GIÁ CỦA BỆNH NHÂN (TINH GỌN & THỜI TRANG) ── */}
      {activeTab === 'reviews' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header tổng quan đánh giá - TINH GỌN, KHÔNG QUÁ TO */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shrink-0">
                {danhGiaData.diemTrungBinhTiepDon || '5.0'}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-200 text-amber-200" />
                    Mức Độ Hài Lòng Khâu Tiếp Đón
                  </h3>
                  <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                    {danhGiaData.tongSoDanhGia} lượt phản hồi
                  </span>
                </div>
                <p className="text-xs text-white/85 mt-0.5">
                  Tổng hợp từ biểu mẫu đánh giá sau ca khám của người bệnh & thân nhân
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="bg-white/15 px-3 py-1.5 rounded-xl text-center backdrop-blur-xs">
                <p className="text-[10px] text-white/80">BS Khám</p>
                <p className="text-sm font-bold">{danhGiaData.diemTrungBinhChung || '5.0'}/5.0</p>
              </div>
              <div className="bg-white/15 px-3 py-1.5 rounded-xl text-center backdrop-blur-xs">
                <p className="text-[10px] text-white/80">Tỷ lệ hài lòng</p>
                <p className="text-sm font-bold text-emerald-200">100%</p>
              </div>
            </div>
          </div>

          {/* Thanh công cụ lọc & tìm kiếm đánh giá */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 font-medium">Lọc theo sao:</span>
              <button
                type="button"
                onClick={() => { setReviewStarFilter('all'); setReviewPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  reviewStarFilter === 'all'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất cả ({danhGiaData.danhSach?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => { setReviewStarFilter('5'); setReviewPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                  reviewStarFilter === '5'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>5 ⭐</span>
              </button>
              <button
                type="button"
                onClick={() => { setReviewStarFilter('4'); setReviewPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                  reviewStarFilter === '4'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>4 ⭐</span>
              </button>
              <label className="inline-flex items-center gap-1.5 ml-2 text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reviewOnlyComment}
                  onChange={(e) => { setReviewOnlyComment(e.target.checked); setReviewPage(1); }}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Chỉ xem có lời bình</span>
              </label>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên BN, mã BN, BS..."
                value={reviewSearch}
                onChange={(e) => { setReviewSearch(e.target.value); setReviewPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-gray-50/50"
              />
            </div>
          </div>

          {/* Danh sách phản hồi dạng Thẻ dòng tinh gọn (Compact Stream View) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {paginatedReviews.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {paginatedReviews.map((dg) => {
                  const hoTen = dg.benhNhan?.hoTen || 'Bệnh nhân ẩn danh';
                  const firstChar = hoTen.charAt(0).toUpperCase();
                  const score = Number(dg.diemTiepDon || 5);

                  return (
                    <div
                      key={dg.id}
                      className="p-3.5 sm:p-4 hover:bg-amber-50/20 transition-all flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
                    >
                      {/* Cột 1: Thông tin bệnh nhân & Bác sĩ */}
                      <div className="flex items-start gap-3 min-w-[240px]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {firstChar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">
                              {hoTen}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                              {dg.benhNhan?.maBenhNhan || '***'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-blue-500 shrink-0" />
                            <span>BS: <strong className="text-gray-700">{dg.bacSi || 'Chuyên khoa'}</strong></span>
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {dg.taoLuc ? new Date(dg.taoLuc).toLocaleString('vi-VN') : ''}
                          </p>
                        </div>
                      </div>

                      {/* Cột 2: Nội dung nhận xét & Tiêu chí */}
                      <div className="flex-1 space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            {score.toFixed(1)}
                          </span>

                          {/* Tiêu chí hài lòng tag thu nhỏ */}
                          {dg.tieuChiHaiLong && dg.tieuChiHaiLong.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {dg.tieuChiHaiLong.map((tc, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50/80 text-blue-700 border border-blue-100/80"
                                >
                                  <Smile className="h-2.5 w-2.5" />
                                  {tc}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Nhận xét text */}
                        {dg.nhanXet ? (
                          <p className="text-gray-700 italic bg-gray-50/70 p-2 rounded-lg border border-gray-100 text-xs">
                            "{dg.nhanXet}"
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">
                            (Bệnh nhân hài lòng, không để lại lời bình luận văn bản)
                          </p>
                        )}

                        {/* Phản hồi từ phòng khám nếu có */}
                        {dg.phanHoiGiamDoc && (
                          <div className="text-[11px] bg-emerald-50 text-emerald-800 p-1.5 px-2.5 rounded-lg border border-emerald-200 flex items-baseline gap-1">
                            <strong className="shrink-0 text-emerald-900">Phòng khám:</strong>
                            <span>{dg.phanHoiGiamDoc}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-gray-400">
                Không tìm thấy đánh giá nào phù hợp với bộ lọc đã chọn.
              </div>
            )}

            {/* Phân trang danh sách đánh giá */}
            {totalReviewPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Hiển thị {(reviewPage - 1) * reviewLimit + 1} - {Math.min(reviewPage * reviewLimit, filteredReviews.length)} trong tổng số {filteredReviews.length} đánh giá
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={reviewPage === 1}
                    onClick={() => setReviewPage((p) => Math.max(p - 1, 1))}
                    className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-semibold text-gray-700">
                    Trang {reviewPage} / {totalReviewPages}
                  </span>
                  <button
                    type="button"
                    disabled={reviewPage === totalReviewPages}
                    onClick={() => setReviewPage((p) => Math.min(p + 1, totalReviewPages))}
                    className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: CHI TIẾT LƯỢT TIẾP ĐÓN ── */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Danh Sách Bệnh Nhân Tiếp Đón Chi Tiết</h3>
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-semibold">
                {totalCount.toLocaleString('vi-VN')} bản ghi
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Trang {page} / {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-28">Số TT / Mã</th>
                  <th className="py-3 px-4 w-52">Bệnh Nhân</th>
                  <th className="py-3 px-4 w-44">Phòng Khám</th>
                  <th className="py-3 px-4 w-40">Bác Sĩ Phụ Trách</th>
                  <th className="py-3 px-4 w-36">Thời Gian Đến</th>
                  <th className="py-3 px-4 w-44">Sinh Hiệu Ban Đầu</th>
                  <th className="py-3 px-4 w-32 text-center">Hình Thức</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 w-16 text-center">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Đang tải danh sách báo cáo tiếp đón...
                    </td>
                  </tr>
                ) : listData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-gray-500">
                      <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      Không tìm thấy lượt tiếp đón nào khớp với tiêu chí tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  listData.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-blue-50/30 transition-colors">
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center text-xs text-gray-400 font-mono">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Số TT / Mã */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold font-mono text-sm text-blue-700">
                          {item.maSoThuTu || `A${item.id}`}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {item.benhNhan?.maBenhNhan || 'BN---'}
                        </div>
                      </td>

                      {/* Bệnh nhân */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-xs">
                          {item.benhNhan?.hoTen || 'Chưa có tên'}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span>
                            {item.benhNhan?.gioiTinh === 'nam'
                              ? 'Nam'
                              : item.benhNhan?.gioiTinh === 'nu'
                              ? 'Nữ'
                              : 'Khác'}
                          </span>
                          <span>•</span>
                          <span>{item.benhNhan?.ngaySinh ? item.benhNhan.ngaySinh.slice(0, 4) : '—'}</span>
                          <span>•</span>
                          <span className="font-mono text-gray-600">{item.benhNhan?.soDienThoai || '—'}</span>
                        </div>
                      </td>

                      {/* Phòng khám */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-gray-800">
                          {item.phongKham?.ten_phong || 'Chưa chỉ định phòng'}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {item.phongKham?.chuyen_khoa || 'Nội tổng quát'}
                        </div>
                      </td>

                      {/* Bác sĩ */}
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {item.bacSi?.nhanVien?.hoTen || 'Đang phân công'}
                        </div>
                        <div className="text-[11px] text-gray-400">{item.bacSi?.chuyenKhoa || ''}</div>
                      </td>

                      {/* Thời gian đến */}
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {item.thoiGianDen ? formatDateTime(item.thoiGianDen) : '—'}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {item.thoiGianDen ? new Date(item.thoiGianDen).toLocaleTimeString('vi-VN') : ''}
                        </div>
                      </td>

                      {/* Sinh hiệu */}
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {item.sinhHieu ? (
                          <div className="space-y-0.5 font-mono text-[11px]">
                            <div className="text-gray-800 font-medium">
                              HA:{' '}
                              <span className="text-blue-700 font-bold">
                                {item.sinhHieu.huyetApTamThu || '—'}/
                                {item.sinhHieu.huyetApTamTruong || '80'}
                              </span>{' '}
                              mmHg
                            </div>
                            <div className="text-gray-500">
                              Mạch:{' '}
                              <span className="text-emerald-700 font-bold">
                                {item.sinhHieu.nhipTim || '—'}
                              </span>{' '}
                              bpm • T°:{' '}
                              {item.sinhHieu.nhietDoC ? `${item.sinhHieu.nhietDoC}°C` : '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa đo</span>
                        )}
                      </td>

                      {/* Hình thức */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.lichHenId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <CalendarCheck className="w-3 h-3" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <Clock className="w-3 h-3 text-gray-500" />
                            Tại quầy
                          </span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {renderBadgeTrangThai(item.trangThai)}
                      </td>

                      {/* Chi tiết */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Xem chi tiết lượt khám & sinh hiệu"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <div className="text-xs text-gray-500">
                Hiển thị từ <strong className="font-semibold text-gray-700">{(page - 1) * limit + 1}</strong> đến{' '}
                <strong className="font-semibold text-gray-700">{Math.min(page * limit, totalCount)}</strong> trên{' '}
                <strong className="font-semibold text-gray-700">{totalCount.toLocaleString('vi-VN')}</strong> kết quả
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg">
                  Trang {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 6. MODAL XEM CHI TIẾT SINH HIỆU & TIẾP ĐÓN ─────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
                  CHI TIẾT LƯỢT TIẾP ĐÓN #{selectedItem.maSoThuTu || selectedItem.id}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {selectedItem.benhNhan?.hoTen || 'Bệnh nhân'}
                </h3>
              </div>
              <div>{renderBadgeTrangThai(selectedItem.trangThai)}</div>
            </div>

            {/* Thông tin bệnh nhân & phòng khám */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200/70 text-xs">
              <div>
                <p className="text-gray-500">Mã bệnh nhân</p>
                <p className="font-bold text-gray-900 mt-0.5 font-mono">{selectedItem.benhNhan?.maBenhNhan || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Số điện thoại</p>
                <p className="font-semibold text-gray-900 mt-0.5 font-mono">
                  {selectedItem.benhNhan?.soDienThoai || '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Phòng khám điều phối</p>
                <p className="font-semibold text-blue-700 mt-0.5">
                  {selectedItem.phongKham?.ten_phong || 'Chưa chỉ định'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Bác sĩ phụ trách</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {selectedItem.bacSi?.nhanVien?.hoTen || 'Chưa chỉ định'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Thời gian đến</p>
                <p className="font-medium text-gray-800 mt-0.5 font-mono">
                  {selectedItem.thoiGianDen ? new Date(selectedItem.thoiGianDen).toLocaleString('vi-VN') : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Hình thức đăng ký</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {selectedItem.lichHenId ? 'Đặt lịch hẹn trực tuyến' : 'Khám vãng lai tại quầy'}
                </p>
              </div>
            </div>

            {/* Thông số sinh hiệu */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" /> Chỉ Số Sinh Hiệu Ban Đầu
              </p>
              {selectedItem.sinhHieu ? (
                <div className="grid grid-cols-3 gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Huyết Áp</p>
                    <p className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                      {selectedItem.sinhHieu.huyetApTamThu || '—'}/{selectedItem.sinhHieu.huyetApTamTruong || '80'}
                    </p>
                    <span className="text-[10px] text-gray-400">mmHg</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Nhịp Tim / Mạch</p>
                    <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                      {selectedItem.sinhHieu.nhipTim || '—'}
                    </p>
                    <span className="text-[10px] text-gray-400">lần/phút</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Thân Nhiệt</p>
                    <p className="text-sm font-bold text-amber-600 font-mono mt-0.5">
                      {selectedItem.sinhHieu.nhietDoC ? `${selectedItem.sinhHieu.nhietDoC}°C` : '—'}
                    </p>
                    <span className="text-[10px] text-gray-400">Độ C</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">SpO2</p>
                    <p className="text-sm font-bold text-cyan-600 font-mono mt-0.5">
                      {selectedItem.sinhHieu.spo2 ? `${selectedItem.sinhHieu.spo2}%` : '—'}
                    </p>
                    <span className="text-[10px] text-gray-400">Oxy máu</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Chiều Cao</p>
                    <p className="text-sm font-bold text-gray-800 font-mono mt-0.5">
                      {selectedItem.sinhHieu.chieuCaoCm ? `${selectedItem.sinhHieu.chieuCaoCm} cm` : '—'}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Cân Nặng</p>
                    <p className="text-sm font-bold text-gray-800 font-mono mt-0.5">
                      {selectedItem.sinhHieu.canNangKg ? `${selectedItem.sinhHieu.canNangKg} kg` : '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400">
                  Lượt khám này chưa ghi nhận số liệu sinh hiệu ban đầu.
                </div>
              )}
            </div>

            {/* Dị ứng & tiền sử nếu có */}
            {(selectedItem.benhNhan?.diUng || selectedItem.benhNhan?.tienSuBenh) && (
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                {selectedItem.benhNhan?.diUng && (
                  <p className="text-amber-900 font-medium">
                    ⚠️ <strong>Dị ứng:</strong> {selectedItem.benhNhan.diUng}
                  </p>
                )}
                {selectedItem.benhNhan?.tienSuBenh && (
                  <p className="text-amber-800">
                    📋 <strong>Tiền sử bệnh:</strong> {selectedItem.benhNhan.tienSuBenh}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gửi Báo Cáo lên Ban Giám Đốc */}
      <GuiBaoCaoModal
        isOpen={isGuiBaoCaoOpen}
        onClose={() => setIsGuiBaoCaoOpen(false)}
        boPhan="tiep_tan"
        tenBoPhan="Bộ phận Tiếp đón & Lễ tân"
        kyBaoCaoMacDinh={getKyBaoCaoLabel()}
        tieuDeMacDinh={`Báo cáo tình hình tiếp đón & lưu lượng bệnh nhân - ${getKyBaoCaoLabel()}`}
        soLieuSnapshot={{
          kyBaoCao: getKyBaoCaoLabel(),
          tongTiepDon: stats?.tongLuot ?? stats?.tongTiepDon ?? 0,
          khamTrucTiep: stats?.vangLaiCount ?? stats?.khamTrucTiep ?? 0,
          khamDatLich: stats?.datLichCount ?? stats?.khamDatLich ?? 0,
          choKham: stats?.choKhamCount ?? stats?.choKham ?? 0,
          dangKham: stats?.dangKhamCount ?? stats?.dangKham ?? 0,
          hoanThanh: stats?.hoanThanhCount ?? stats?.hoanThanh ?? 0,
          huyKham: stats?.daHuyCount ?? stats?.huyKham ?? 0,
          diemHaiLongCSAT: `${stats?.diemTrungBinhTiepDon || danhGiaData?.tongQuan?.diemTiepDonTB || 5.0}/5.0`,
        }}
      />

      {/* Modal Xem Lịch Sử Báo Cáo & Ý Kiến Chỉ Đạo */}
      <LichSuBaoCaoModal
        isOpen={isLichSuBaoCaoOpen}
        onClose={() => setIsLichSuBaoCaoOpen(false)}
        boPhan="tiep_tan"
        tenBoPhan="Bộ phận Tiếp đón & Lễ tân"
      />
    </div>
  );
}
