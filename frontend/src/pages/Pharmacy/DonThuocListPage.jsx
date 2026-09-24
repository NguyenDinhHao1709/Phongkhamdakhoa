import { useState, useEffect, useMemo } from 'react';
import {
  Pill,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  X,
  User,
  Stethoscope,
  ChevronRight,
  AlertCircle,
  DollarSign,
  Eye,
  FileText,
  Check,
  Sparkles,
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import CapPhatThuocModal from './CapPhatThuocModal';

export default function DonThuocListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDonThuocId, setSelectedDonThuocId] = useState(null);

  // Filters State
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'cho_cap_phat' | 'da_cap_phat'
  const [filterPayment, setFilterPayment] = useState('all'); // 'all' | 'da_thanh_toan' | 'chua_thanh_toan'
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [dateRangePreset, setDateRangePreset] = useState('all'); // 'all' | 'hom_nay' | 'hom_qua' | '7ngay' | 'thang_nay'
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiGet('/nha-thuoc/don-thuoc');
      if (res.data) setList(res.data);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn thuốc:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Danh sách bác sĩ kê đơn duy nhất
  const doctorList = useMemo(() => {
    const set = new Set();
    list.forEach((item) => {
      if (item.bacSi) set.add(item.bacSi);
    });
    return Array.from(set);
  }, [list]);

  // Bộ lọc dữ liệu đa tiêu chí
  const filteredList = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return list.filter((item) => {
      // 1. Trạng thái cấp phát
      if (filterStatus === 'cho_cap_phat' && item.trangThai === 'da_cap_phat') return false;
      if (filterStatus === 'da_cap_phat' && item.trangThai !== 'da_cap_phat') return false;

      // 2. Trạng thái viện phí
      const isPaid = item.trangThaiThanhToan === 'da_thanh_toan';
      if (filterPayment === 'da_thanh_toan' && !isPaid) return false;
      if (filterPayment === 'chua_thanh_toan' && isPaid) return false;

      // 3. Bác sĩ kê đơn
      if (filterDoctor !== 'all' && item.bacSi !== filterDoctor) return false;

      // 4. Lọc ngày kê đơn
      if (item.ngayKe) {
        const itemDateStr = String(item.ngayKe).slice(0, 10);
        const itemDate = new Date(item.ngayKe);

        if (tuNgay && itemDateStr < tuNgay) return false;
        if (denNgay && itemDateStr > denNgay) return false;

        if (!tuNgay && !denNgay) {
          if (dateRangePreset === 'hom_nay' && itemDateStr !== todayStr) return false;
          if (dateRangePreset === 'hom_qua' && itemDateStr !== yesterdayStr) return false;
          if (dateRangePreset === '7ngay' && itemDate < sevenDaysAgo) return false;
          if (dateRangePreset === 'thang_nay') {
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            if (itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear) {
              return false;
            }
          }
        }
      }

      // 5. Tìm kiếm từ khóa
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchCode = item.maDonThuoc?.toLowerCase().includes(term);
        const matchDoctor = item.bacSi?.toLowerCase().includes(term);
        const matchPatient = item.benhNhan?.hoTen?.toLowerCase().includes(term);
        const matchPatientCode = item.benhNhan?.maBenhNhan?.toLowerCase().includes(term);
        const matchPhone = item.benhNhan?.soDienThoai?.includes(term);
        const matchMedicine = item.chiTiet?.some(
          (ct) =>
            ct.thuoc?.tenThuoc?.toLowerCase().includes(term) ||
            ct.thuoc?.maThuoc?.toLowerCase().includes(term),
        );

        if (!matchCode && !matchDoctor && !matchPatient && !matchPatientCode && !matchPhone && !matchMedicine) {
          return false;
        }
      }

      return true;
    });
  }, [list, filterStatus, filterPayment, filterDoctor, dateRangePreset, tuNgay, denNgay, searchTerm]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = list.length;
    const pending = list.filter((i) => i.trangThai !== 'da_cap_phat').length;
    const completed = list.filter((i) => i.trangThai === 'da_cap_phat').length;
    const paid = list.filter((i) => i.trangThaiThanhToan === 'da_thanh_toan').length;
    const unpaid = total - paid;
    return { total, pending, completed, paid, unpaid };
  }, [list]);

  const hasActiveFilters =
    filterStatus !== 'all' ||
    filterPayment !== 'all' ||
    filterDoctor !== 'all' ||
    dateRangePreset !== 'all' ||
    Boolean(tuNgay) ||
    Boolean(denNgay) ||
    Boolean(searchTerm.trim());

  const handleResetFilters = () => {
    setFilterStatus('all');
    setFilterPayment('all');
    setFilterDoctor('all');
    setDateRangePreset('all');
    setTuNgay('');
    setDenNgay('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* 1. Header Tinh gọn & Hiện đại */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary-600" />
              Cấp Phát Đơn Thuốc
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Chuẩn FEFO & Hóa Đơn Viện Phí
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Duyệt đơn thuốc từ Bác sĩ điều trị, đối soát thanh toán viện phí và xuất kho cấp phát thuốc cho bệnh nhân.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-primary-600' : ''}`} />
            <span>Tải lại danh sách</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Stat Cards Tương Tác */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Tất cả đơn thuốc */}
        <button
          onClick={() => {
            setFilterStatus('all');
            setFilterPayment('all');
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'all' && filterPayment === 'all'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng đơn thuốc
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">{stats.total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Toàn bộ hồ sơ kê đơn</p>
        </button>

        {/* Chờ cấp phát */}
        <button
          onClick={() => {
            setFilterStatus('cho_cap_phat');
            setFilterPayment('all');
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'cho_cap_phat'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Chờ cấp phát
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center relative">
              <Clock className="h-4 w-4" />
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">{stats.pending}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">Bệnh nhân đang đợi thuốc</p>
        </button>

        {/* Đã cấp phát */}
        <button
          onClick={() => {
            setFilterStatus('da_cap_phat');
            setFilterPayment('all');
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'da_cap_phat'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Đã cấp phát
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{stats.completed}</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Đã xuất kho thành công</p>
        </button>

        {/* Đã thanh toán viện phí */}
        <button
          onClick={() => {
            setFilterPayment('da_thanh_toan');
            setFilterStatus('all');
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterPayment === 'da_thanh_toan'
              ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
              Đã thanh toán VP
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-teal-600 mt-2">{stats.paid}</p>
          <p className="text-[11px] text-teal-700 font-medium mt-0.5">Đủ điều kiện xuất thuốc</p>
        </button>
      </div>

      {/* 3. Bộ Lọc Đa Tiêu Chí Tinh Gọn */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        {/* Hàng 1: Tabs Trạng thái + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Tabs trạng thái cấp phát */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-medium mr-1">Trạng thái:</span>
            {[
              { key: 'all', label: 'Tất cả', count: stats.total },
              { key: 'cho_cap_phat', label: 'Chờ cấp phát', count: stats.pending, isWarning: true },
              { key: 'da_cap_phat', label: 'Đã cấp phát', count: stats.completed, isSuccess: true },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === tab.key
                    ? tab.isWarning
                      ? 'bg-amber-600 text-white shadow-xs'
                      : tab.isSuccess
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-primary-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.key === 'cho_cap_phat' && <Clock className="h-3 w-3" />}
                {tab.key === 'da_cap_phat' && <CheckCircle2 className="h-3 w-3" />}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterStatus === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Ô Tìm Kiếm Debounce */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã đơn, tên BN, mã BN, SĐT, tên thuốc..."
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Bộ lọc Bác sĩ + Viện phí + Thời gian */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Lọc Viện phí */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium">Viện phí:</span>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
              >
                <option value="all">Tất cả viện phí ({stats.total})</option>
                <option value="da_thanh_toan">✓ Đã thanh toán ({stats.paid})</option>
                <option value="chua_thanh_toan">⏳ Chưa thanh toán ({stats.unpaid})</option>
              </select>
            </div>

            {/* Lọc Bác Sĩ Kê Đơn */}
            {doctorList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Bác sĩ:</span>
                <select
                  value={filterDoctor}
                  onChange={(e) => setFilterDoctor(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 max-w-[200px] truncate cursor-pointer"
                >
                  <option value="all">Tất cả bác sĩ</option>
                  {doctorList.map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lọc Ngày Nhanh */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 font-medium mr-0.5">Ngày kê:</span>
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'hom_nay', label: 'Hôm nay' },
                { key: '7ngay', label: '7 ngày qua' },
                { key: 'thang_nay', label: 'Tháng này' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setDateRangePreset(p.key);
                    setTuNgay('');
                    setDenNgay('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    dateRangePreset === p.key && !tuNgay && !denNgay
                      ? 'bg-gray-800 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lọc khoảng ngày tùy chọn & Nút Xóa bộ lọc */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
              <Calendar className="h-3.5 w-3.5 text-gray-400 ml-1" />
              <input
                type="date"
                value={tuNgay}
                onChange={(e) => {
                  setTuNgay(e.target.value);
                  setDateRangePreset('custom');
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-0.5"
                title="Từ ngày"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={denNgay}
                onChange={(e) => {
                  setDenNgay(e.target.value);
                  setDateRangePreset('custom');
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-0.5"
                title="Đến ngày"
              />
              {(tuNgay || denNgay) && (
                <button
                  onClick={() => {
                    setTuNgay('');
                    setDenNgay('');
                    setDateRangePreset('all');
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Xóa khoảng ngày"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Đặt lại lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Danh Sách Đơn Thuốc (Bảng Tinh Gọn) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              Danh sách đơn thuốc ({filteredList.length})
            </span>
            {hasActiveFilters && (
              <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200">
                Đang lọc {filteredList.length} / {list.length} đơn
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary-600 border-t-transparent mx-auto" />
            <p className="text-xs font-medium text-gray-500">Đang tra cứu danh sách đơn thuốc...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Không tìm thấy đơn thuốc nào</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasActiveFilters
                  ? 'Thử thay đổi hoặc đặt lại bộ lọc để xem các đơn thuốc khác.'
                  : 'Chưa có đơn thuốc nào được ghi nhận trên hệ thống.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Xóa bộ lọc & Tải lại
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3.5 px-4">Mã Đơn Thuốc</th>
                  <th className="py-3.5 px-4">Bệnh Nhân</th>
                  <th className="py-3.5 px-4">Bác Sĩ Kê Đơn</th>
                  <th className="py-3.5 px-4 text-center">Số Loại Thuốc</th>
                  <th className="py-3.5 px-4 text-center">Viện Phí</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái Cấp Phát</th>
                  <th className="py-3.5 px-4">Ngày Kê</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredList.map((dt) => {
                  const isPaid = dt.trangThaiThanhToan === 'da_thanh_toan';
                  const isDispensed = dt.trangThai === 'da_cap_phat';
                  const patientName = dt.benhNhan?.hoTen || 'Bệnh nhân';
                  const firstLetter = patientName.charAt(0).toUpperCase();

                  return (
                    <tr
                      key={dt.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDonThuocId(dt.id)}
                    >
                      {/* 1. Mã đơn thuốc */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-primary-700 bg-primary-50/80 border border-primary-200/60 px-2 py-1 rounded-lg">
                          {dt.maDonThuoc}
                        </span>
                      </td>

                      {/* 2. Bệnh nhân */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                            {firstLetter}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-tight">
                              {patientName}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {dt.benhNhan?.maBenhNhan || 'N/A'}{' '}
                              {dt.benhNhan?.soDienThoai && `• ${dt.benhNhan.soDienThoai}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Bác sĩ kê đơn */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-gray-800">
                          <Stethoscope className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>{dt.bacSi || 'Bác sĩ'}</span>
                        </div>
                      </td>

                      {/* 4. Số loại thuốc */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-purple-50 text-purple-700 border border-purple-200">
                          <Pill className="h-3 w-3" />
                          {dt.soLuongMon || dt.chiTiet?.length || 0} loại
                        </span>
                      </td>

                      {/* 5. Trạng thái viện phí */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isPaid ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          <span>{isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                        </span>
                      </td>

                      {/* 6. Trạng thái cấp phát */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isDispensed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDispensed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          <span>{isDispensed ? 'Đã cấp phát' : 'Chờ cấp phát'}</span>
                        </span>
                      </td>

                      {/* 7. Ngày kê đơn */}
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {formatDateTime(dt.ngayKe)}
                      </td>

                      {/* 8. Thao tác */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedDonThuocId(dt.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ${
                            isDispensed
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                              : isPaid
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                              : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20'
                          }`}
                        >
                          {isDispensed ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              <span>Chi tiết</span>
                            </>
                          ) : (
                            <>
                              <Pill className="h-3.5 w-3.5" />
                              <span>Cấp phát</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal Cấp Phát Thuốc */}
      {selectedDonThuocId && (
        <CapPhatThuocModal
          donThuocId={selectedDonThuocId}
          onClose={() => setSelectedDonThuocId(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}


