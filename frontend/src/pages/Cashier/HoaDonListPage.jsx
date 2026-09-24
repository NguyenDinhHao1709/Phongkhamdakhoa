import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CreditCard,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  DollarSign,
  Receipt,
  Eye,
  AlertCircle,
  ArrowUpDown,
  Coins,
  Wallet,
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import ThanhToanModal from './ThanhToanModal';
import InHoaDonModal from './InHoaDonModal';

const ITEMS_PER_PAGE = 10;

export default function HoaDonListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'cho_thanh_toan' | 'da_thanh_toan'
  const [filterPriceRange, setFilterPriceRange] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedHoaDonId, setSelectedHoaDonId] = useState(null);
  const [printInvoiceData, setPrintInvoiceData] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/thanh-toan/danh-sach');
      if (res.data) setList(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách hóa đơn:', err);
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (text) => {
    return (text || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  };

  const getInitials = (name) => {
    if (!name) return 'BN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarBg = (name) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Lọc đa điều kiện
  const filteredList = useMemo(() => {
    let result = list;

    // 1. Trạng thái
    if (filterStatus !== 'all') {
      result = result.filter((item) => item.trangThai === filterStatus);
    }

    // 2. Mức giá
    if (filterPriceRange !== 'all') {
      result = result.filter((item) => {
        const amount = Number(item.thucThu || item.tongTien || 0);
        if (filterPriceRange === 'under_500k') return amount < 500000;
        if (filterPriceRange === '500k_2m') return amount >= 500000 && amount <= 2000000;
        if (filterPriceRange === 'above_2m') return amount > 2000000;
        return true;
      });
    }

    // 3. Ngày tháng
    if (filterDateFrom || filterDateTo) {
      result = result.filter((item) => {
        if (!item.ngayTao) return false;
        const dStr = typeof item.ngayTao === 'string' ? item.ngayTao.substring(0, 10) : new Date(item.ngayTao).toISOString().substring(0, 10);
        if (filterDateFrom && dStr < filterDateFrom) return false;
        if (filterDateTo && dStr > filterDateTo) return false;
        return true;
      });
    }

    // 4. Từ khóa tìm kiếm
    if (debouncedSearch.trim()) {
      const term = normalizeText(debouncedSearch);
      result = result.filter((item) => {
        const maHd = normalizeText(item.maHoaDon);
        const name = normalizeText(item.benhNhan?.hoTen);
        const phone = normalizeText(item.benhNhan?.soDienThoai);
        const maBn = normalizeText(item.benhNhan?.maBenhNhan);
        return (
          maHd.includes(term) ||
          name.includes(term) ||
          phone.includes(term) ||
          maBn.includes(term)
        );
      });
    }

    return result;
  }, [list, filterStatus, filterPriceRange, filterDateFrom, filterDateTo, debouncedSearch]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalCount = list.length;
    const totalRevenue = list
      .filter((i) => i.trangThai === 'da_thanh_toan')
      .reduce((sum, i) => sum + Number(i.thucThu || i.tongTien || 0), 0);

    const pendingList = list.filter((i) => i.trangThai === 'cho_thanh_toan');
    const pendingCount = pendingList.length;
    const pendingAmount = pendingList.reduce((sum, i) => sum + Number(i.thucThu || i.tongTien || 0), 0);

    const paidList = list.filter((i) => i.trangThai === 'da_thanh_toan');
    const paidCount = paidList.length;
    const paidAmount = paidList.reduce((sum, i) => sum + Number(i.thucThu || i.tongTien || 0), 0);

    const todayList = list.filter((i) => i.ngayTao && i.ngayTao.startsWith(todayStr));
    const todayCount = todayList.length;
    const todayAmount = todayList.reduce((sum, i) => sum + Number(i.thucThu || i.tongTien || 0), 0);

    return {
      totalCount,
      totalRevenue,
      pendingCount,
      pendingAmount,
      paidCount,
      paidAmount,
      todayCount,
      todayAmount,
    };
  }, [list, todayStr]);

  // Phân trang
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredList, currentPage]);

  const handleQuickDate = (daysAgo) => {
    const now = new Date();
    if (daysAgo === 0) {
      const today = now.toISOString().split('T')[0];
      setFilterDateFrom(today);
      setFilterDateTo(today);
    } else if (daysAgo === 7) {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setFilterDateFrom(past.toISOString().split('T')[0]);
      setFilterDateTo(now.toISOString().split('T')[0]);
    } else if (daysAgo === 30) {
      const past = new Date();
      past.setDate(1);
      setFilterDateFrom(past.toISOString().split('T')[0]);
      setFilterDateTo(now.toISOString().split('T')[0]);
    } else {
      setFilterDateFrom('');
      setFilterDateTo('');
    }
    setCurrentPage(1);
  };

  const isFiltered = filterStatus !== 'all' || filterPriceRange !== 'all' || filterDateFrom || filterDateTo || searchTerm;

  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* 1. Header tinh gọn */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Quản lý Thu ngân & Viện phí
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Quầy Thu Ngân
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi dòng tiền, thu viện phí khám chữa bệnh và in phiếu thu cho bệnh nhân.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại dữ liệu</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ Thống kê nhanh (Interactive Quick-Filter Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tổng hóa đơn */}
        <div
          onClick={() => {
            setFilterStatus('all');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'all' && !filterDateFrom && !filterDateTo
              ? 'bg-primary-50/80 border-primary-300 ring-2 ring-primary-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Tổng hóa đơn</span>
            <Receipt className="h-4 w-4 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCount}</div>
          <div className="text-[11px] text-primary-700 font-semibold mt-0.5 truncate">
            {formatCurrency(stats.totalRevenue)}
          </div>
        </div>

        {/* Chờ thanh toán */}
        <div
          onClick={() => {
            setFilterStatus('cho_thanh_toan');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'cho_thanh_toan'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Chờ thanh toán</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{stats.pendingCount}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5 truncate">
            Chờ thu: {formatCurrency(stats.pendingAmount)}
          </div>
        </div>

        {/* Đã thanh toán */}
        <div
          onClick={() => {
            setFilterStatus('da_thanh_toan');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'da_thanh_toan'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800">Đã thanh toán</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.paidCount}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 truncate">
            Đã thu: {formatCurrency(stats.paidAmount)}
          </div>
        </div>

        {/* Hôm nay */}
        <div
          onClick={() => handleQuickDate(0)}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterDateFrom === todayStr && filterDateTo === todayStr
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800">Hôm nay</span>
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{stats.todayCount}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-0.5 truncate">
            {formatCurrency(stats.todayAmount)}
          </div>
        </div>
      </div>

      {/* 3. Bộ lọc Đa năng & Tìm kiếm Thông minh */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Tìm kiếm */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã HĐ, Tên BN, SĐT, Mã BN..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái */}
          <div className="lg:col-span-3">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              <option value="all">💳 Tất cả trạng thái</option>
              <option value="cho_thanh_toan">⏳ Chờ thanh toán</option>
              <option value="da_thanh_toan">✅ Đã thanh toán</option>
            </select>
          </div>

          {/* Lọc Mức giá */}
          <div className="lg:col-span-3">
            <select
              value={filterPriceRange}
              onChange={(e) => {
                setFilterPriceRange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              <option value="all">💰 Tất cả mệnh giá</option>
              <option value="under_500k">Dưới 500.000 đ</option>
              <option value="500k_2m">Từ 500.000 đ - 2.000.000 đ</option>
              <option value="above_2m">Trên 2.000.000 đ</option>
            </select>
          </div>

          {/* Nút reset nhanh */}
          <div className="lg:col-span-2 flex items-center justify-end">
            {isFiltered && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterPriceRange('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearchTerm('');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors text-center cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Lọc Ngày tháng & Preset nhanh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-medium">Khoảng thời gian:</span>
            <div className="flex items-center gap-1.5 bg-gray-50/80 p-1 rounded-xl border border-gray-200">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-1"
                placeholder="Từ ngày"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-1"
                placeholder="Đến ngày"
              />
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick date chips */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleQuickDate(0)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterDateFrom === todayStr && filterDateTo === todayStr
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => handleQuickDate(7)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                7 ngày qua
              </button>
              <button
                onClick={() => handleQuickDate(30)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                Tháng này
              </button>
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => handleQuickDate(-1)}
                  className="px-2 py-1 text-xs text-primary-600 hover:underline font-semibold"
                >
                  Tất cả ngày
                </button>
              )}
            </div>
          </div>

          <div className="text-gray-500">
            Hiển thị <strong className="text-gray-900">{filteredList.length}</strong> / {list.length} hóa đơn
          </div>
        </div>
      </div>

      {/* 4. Bảng Dữ liệu Hóa đơn Tinh gọn & Chuẩn Doanh nghiệp */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mx-auto mb-3" />
            <p className="text-xs font-medium">Đang tải danh sách hóa đơn...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="font-bold text-gray-700 text-sm">Không tìm thấy hóa đơn nào phù hợp</p>
            <p className="text-xs text-gray-400">
              Vui lòng thử điều chỉnh lại từ khóa tìm kiếm hoặc các tiêu chí bộ lọc.
            </p>
            {isFiltered && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterPriceRange('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearchTerm('');
                }}
                className="text-xs font-semibold text-primary-600 hover:underline pt-1 inline-block cursor-pointer"
              >
                Đặt lại toàn bộ bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3 px-4">Mã hóa đơn</th>
                  <th className="py-3 px-4">Bệnh nhân</th>
                  <th className="py-3 px-4 text-right">Tổng tiền</th>
                  <th className="py-3 px-4 text-right">Thực thu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thời gian tạo</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs text-gray-700">
                {paginatedList.map((hd) => {
                  const patientName = hd.benhNhan?.hoTen || 'Bệnh nhân';
                  const initials = getInitials(patientName);
                  const avatarBg = getAvatarBg(patientName);
                  const isToday = hd.ngayTao && hd.ngayTao.startsWith(todayStr);
                  const isPaid = hd.trangThai === 'da_thanh_toan';

                  return (
                    <tr
                      key={hd.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Mã Hóa đơn */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-700 border border-blue-200/80 group-hover:bg-blue-100 transition-colors">
                          {hd.maHoaDon || `#${hd.id}`}
                        </span>
                      </td>

                      {/* Bệnh nhân */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${avatarBg}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {patientName}
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                              {hd.benhNhan?.maBenhNhan && (
                                <span className="font-mono font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                                  {hd.benhNhan.maBenhNhan}
                                </span>
                              )}
                              {hd.benhNhan?.soDienThoai && (
                                <span className="flex items-center gap-0.5 text-gray-500">
                                  <Phone className="h-3 w-3 text-gray-400" />
                                  {hd.benhNhan.soDienThoai}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tổng tiền */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold text-gray-600">
                          {formatCurrency(hd.tongTien)}
                        </span>
                      </td>

                      {/* Thực thu */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold text-sm ${
                            isPaid ? 'text-emerald-700' : 'text-blue-700'
                          }`}
                        >
                          {formatCurrency(hd.thucThu)}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Đã thanh toán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Chờ thanh toán
                          </span>
                        )}
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-700 font-medium">
                          {formatDateTime(hd.ngayTao)}
                        </div>
                        {isToday && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded mt-0.5 inline-block">
                            Hôm nay
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPaid ? (
                            <>
                              <button
                                onClick={() => setSelectedHoaDonId(hd.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-gray-500" />
                                <span>Chi tiết</span>
                              </button>

                              <button
                                onClick={async () => {
                                  const res = await apiGet(`/thanh-toan/${hd.id}`);
                                  setPrintInvoiceData(res?.data || res);
                                }}
                                className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors cursor-pointer"
                                title="In phiếu thu viện phí"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedHoaDonId(hd.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              <span>Thu tiền</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Phân trang */}
        {filteredList.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50/40">
            <div>
              Hiển thị <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> -{' '}
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length)}</strong> trong{' '}
              <strong>{filteredList.length}</strong> hóa đơn
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-2.5 font-semibold text-gray-700">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Thanh toán */}
      {selectedHoaDonId && (
        <ThanhToanModal
          hoaDonId={selectedHoaDonId}
          onClose={() => setSelectedHoaDonId(null)}
          onSuccess={fetchData}
        />
      )}

      {/* Modal In Hóa Đơn / Phiếu Thu */}
      {printInvoiceData && (
        <InHoaDonModal
          hoaDon={printInvoiceData}
          onClose={() => setPrintInvoiceData(null)}
        />
      )}
    </div>
  );
}
