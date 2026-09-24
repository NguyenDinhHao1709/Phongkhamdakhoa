import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../../store/authStore';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { apiGet, apiPost } from '../../../services/api';
import { formatDate } from '../../../utils/formatDate';
import {
  Calendar, Clock, Phone, Search,
  AlertTriangle, X, CheckCircle2,
  ChevronDown, RotateCcw, AlertCircle, Info, Send, Star
} from 'lucide-react';
import DanhGiaCaKhamModal from '../../../components/Appointment/DanhGiaCaKhamModal';

const getTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export default function LichHenBacSiPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Filters state
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [filterLoai, setFilterLoai] = useState('tat_ca');
  const [shiftFilter, setShiftFilter] = useState('tat_ca');
  const [filterTrangThai, setFilterTrangThai] = useState('tat_ca');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal xem đánh giá bệnh nhân
  const [reviewModalData, setReviewModalData] = useState({
    isOpen: false,
    appointment: null,
  });

  // Modal hủy ca state
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [ruleWarningModal, setRuleWarningModal] = useState(null);
  const [successBanner, setSuccessBanner] = useState('');

  // Fetch lịch hẹn của bác sĩ
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lich-hen-bac-si', user?.id],
    queryFn: () => apiGet('/lich-hen?limit=200'),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 0,
    enabled: !!user?.id,
  });

  const rawItems = (Array.isArray(data) ? data : data?.data) || [];

  // Mutation gửi yêu cầu hủy ca lên Ban Giám Đốc
  const huyCaMutation = useMutation({
    mutationFn: ({ id, lyDo }) => apiPost(`/lich-hen/${id}/bac-si-huy-ca`, { lyDo }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lich-hen-bac-si', user?.id] });
      setSuccessBanner(res?.message || 'Đã gửi yêu cầu hủy ca khám lên Ban Giám Đốc xét duyệt thành công!');
      setCancelModalItem(null);
      setCancelReason('');
      setCancelError('');
      setTimeout(() => setSuccessBanner(''), 8000);
    },
    onError: (err) => {
      setCancelError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gửi yêu cầu hủy.');
    },
  });

  // Kiểm tra quy định hủy ca: tối thiểu trước 1 ngày (24 tiếng)
  const checkCanCancel = (item) => {
    if (item.trangThai === 'cho_duyet_huy') {
      return { allowed: false, reason: 'Ca khám này đã gửi yêu cầu hủy và đang chờ Ban Giám Đốc xét duyệt.' };
    }
    if (item.trangThai === 'da_huy') {
      return { allowed: false, reason: 'Ca khám này đã được hủy trước đó.' };
    }
    if (item.trangThai === 'hoan_thanh') {
      return { allowed: false, reason: 'Ca khám đã hoàn thành, không thể hủy.' };
    }

    const itemDate = item.ngayHen || item.ngayKham;
    const itemTime = item.gioHen || item.gioKham || '00:00';
    if (!itemDate) return { allowed: false, reason: 'Không xác định ngày hẹn.' };

    const appointmentTime = new Date(`${itemDate}T${itemTime.slice(0, 5)}:00`);
    const now = new Date();

    const diffHours = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      return {
        allowed: false,
        reason: 'Theo quy định, Bác sĩ chỉ có thể gửi yêu cầu hủy ca tối thiểu trước 1 ngày (trước 24 tiếng) so với giờ khám. Vui lòng liên hệ trực tiếp bộ phận Quản lý hoặc Tiếp đón để xử lý khẩn cấp.',
      };
    }

    return { allowed: true };
  };

  const handleOpenCancelModal = (item) => {
    const check = checkCanCancel(item);
    if (!check.allowed) {
      setRuleWarningModal({
        item,
        reason: check.reason,
      });
      return;
    }

    setCancelModalItem(item);
    setCancelReason('');
    setCancelError('');
  };

  const handleSubmitCancel = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do cụ thể để trình Ban Giám Đốc xét duyệt.');
      return;
    }
    huyCaMutation.mutate({
      id: cancelModalItem.id,
      lyDo: cancelReason.trim(),
    });
  };

  const handleResetFilters = () => {
    setTimeFilter('all');
    setSelectedDate(getTodayKey());
    setFilterLoai('tat_ca');
    setShiftFilter('tat_ca');
    setFilterTrangThai('tat_ca');
    setSearchTerm('');
  };

  const hasActiveFilter =
    timeFilter !== 'all' ||
    filterLoai !== 'tat_ca' ||
    shiftFilter !== 'tat_ca' ||
    filterTrangThai !== 'tat_ca' ||
    searchTerm.trim() !== '';

  // Lọc đa tiêu chí
  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const todayKey = getTodayKey();
    const now = new Date();

    return rawItems.filter((item) => {
      const isOnline = item.hinhThuc === 'truc_tuyen' || item.hinhThucKham === 'online';
      const patient = item.benhNhan || {};
      const dateKey = item.ngayHen || item.ngayKham || '';
      const itemDate = dateKey ? new Date(`${dateKey}T00:00:00`) : null;
      const gioKham = item.gioHen || item.gioKham || '';

      // 1. Lọc theo thời gian
      if (timeFilter === 'today') {
        if (dateKey !== todayKey) return false;
      } else if (timeFilter === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        if (dateKey !== tomorrowKey) return false;
      } else if (timeFilter === '7days') {
        if (!itemDate || isNaN(itemDate.getTime())) return false;
        const diffDays = (itemDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays < -1 || diffDays > 7) return false;
      } else if (timeFilter === 'thisWeek') {
        if (!itemDate || isNaN(itemDate.getTime())) return false;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        if (itemDate < startOfWeek || itemDate > endOfWeek) return false;
      } else if (timeFilter === 'thisMonth') {
        if (!itemDate || isNaN(itemDate.getTime())) return false;
        if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false;
      } else if (timeFilter === 'custom') {
        if (selectedDate && dateKey !== selectedDate) return false;
      }

      // 2. Lọc theo loại hình
      if (filterLoai === 'online' && !isOnline) return false;
      if (filterLoai === 'truc_tiep' && isOnline) return false;

      // 3. Lọc theo ca khám (Shift)
      if (shiftFilter === 'sang') {
        const hour = parseInt(gioKham.slice(0, 2), 10);
        if (!isNaN(hour) && hour >= 12) return false;
      } else if (shiftFilter === 'chieu') {
        const hour = parseInt(gioKham.slice(0, 2), 10);
        if (!isNaN(hour) && hour < 12) return false;
      }

      // 4. Lọc theo trạng thái
      if (filterTrangThai !== 'tat_ca') {
        if (item.trangThai !== filterTrangThai) return false;
      }

      // 5. Tìm kiếm từ khóa
      if (keyword) {
        const matches = [
          item.maLichHen,
          patient.hoTen,
          patient.soDienThoai,
          item.lyDoKham,
          gioKham,
          dateKey,
        ].some((value) => String(value || '').toLowerCase().includes(keyword));
        if (!matches) return false;
      }

      return true;
    });
  }, [rawItems, timeFilter, selectedDate, filterLoai, shiftFilter, filterTrangThai, searchTerm]);

  // Chế độ hiển thị: 'grid' (thẻ gọn) hoặc 'table' (bảng danh sách)
  const [viewMode, setViewMode] = useState('grid');

  // Thống kê nhanh từ danh sách
  const stats = useMemo(() => {
    let trucTiep = 0;
    let online = 0;
    let hoanThanh = 0;
    let daHuy = 0;
    let choKham = 0;

    filteredItems.forEach((item) => {
      const isOnline = item.hinhThuc === 'truc_tuyen' || item.hinhThucKham === 'online';
      if (isOnline) online++;
      else trucTiep++;

      if (item.trangThai === 'hoan_thanh') hoanThanh++;
      else if (item.trangThai === 'da_huy') daHuy++;
      else choKham++;
    });

    return {
      total: filteredItems.length,
      trucTiep,
      online,
      hoanThanh,
      daHuy,
      choKham,
    };
  }, [filteredItems]);

  // Format giờ gọn: 14:30:00 -> 14:30
  const formatTimeCompact = (timeStr) => {
    if (!timeStr) return '--:--';
    return timeStr.slice(0, 5);
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-6">
      {/* ─── TIÊU ĐỀ & THANH CÔNG CỤ TRÊN CÙNG ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 flex-shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
              Quản Lý Lịch Hẹn & Lịch Khám Bác Sĩ
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi lịch trực tiếp, tư vấn online và xử lý yêu cầu ca khám
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Nút chuyển chế độ xem Grid / Table */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-700 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Chế độ xem Thẻ"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
              </svg>
              Thẻ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-primary-700 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Chế độ xem Bảng"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h4v-3zM1 4h4v3H1V4zm0 4h4v3H1V8zm0 4h4v3H1v-3zm5-8h4v3H6V4zm0 4h4v3H6V8zm0 4h4v3H6v-3z"/>
              </svg>
              Bảng
            </button>
          </div>

          {hasActiveFilter && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* ─── THẺ THỐNG KÊ NHANH (QUICK STATS CHIPS) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {stats.total}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Tổng ca lọc</p>
            <p className="text-xs font-bold text-gray-800">Tất cả lịch</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {stats.trucTiep}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Khám trực tiếp</p>
            <p className="text-xs font-bold text-indigo-700">Tại phòng khám</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {stats.online}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Tư vấn Online</p>
            <p className="text-xs font-bold text-purple-700">Telehealth</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {stats.hoanThanh}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Đã hoàn tất</p>
            <p className="text-xs font-bold text-emerald-700">Thành công</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex items-center gap-2.5 col-span-2 sm:col-span-1">
          <div className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {stats.daHuy}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Đã hủy ca</p>
            <p className="text-xs font-bold text-gray-700">Hủy / Vắng mặt</p>
          </div>
        </div>
      </div>

      {/* Banner thông báo thành công */}
      {successBanner && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 animate-fade-in shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successBanner}</span>
        </div>
      )}

      {/* ─── BỘ LỌC ĐA TIÊU CHÍ GỌN GÀNG ─────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-3">
        {/* Hàng 1: Mốc thời gian - Button chips siêu gọn */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-600 mr-1 flex items-center gap-1">
            <Clock className="h-3 w-3 text-primary-600" /> Thời gian:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'today', label: 'Hôm nay' },
            { id: 'tomorrow', label: 'Ngày mai' },
            { id: '7days', label: '7 ngày tới' },
            { id: 'thisWeek', label: 'Tuần này' },
            { id: 'thisMonth', label: 'Tháng này' },
            { id: 'custom', label: 'Chọn ngày' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeFilter(t.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                timeFilter === t.id
                  ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Ô chọn ngày cụ thể */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-1.5 ml-1 p-0.5 px-2 bg-primary-50 rounded-lg border border-primary-200 animate-fade-in">
              <span className="text-[11px] font-bold text-primary-900">Ngày:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white focus:ring-1 focus:ring-primary-500 font-medium"
              />
            </div>
          )}
        </div>

        {/* Hàng 2: Ô tìm kiếm + 3 dropdowns phân loại */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
          {/* 1. Tìm kiếm từ khóa */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, SĐT, mã LH..."
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-7 text-xs text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 bg-gray-50/50 hover:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Loại hình khám */}
          <div className="relative">
            <select
              value={filterLoai}
              onChange={(e) => setFilterLoai(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-gray-50/50 hover:bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer transition"
            >
              <option value="tat_ca">Tất cả hình thức (Trực tiếp & Online)</option>
              <option value="truc_tiep">🏥 Trực tiếp tại phòng khám</option>
              <option value="online">🎥 Tư vấn trực tuyến (Online)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          </div>

          {/* 3. Ca khám */}
          <div className="relative">
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-gray-50/50 hover:bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer transition"
            >
              <option value="tat_ca">Tất cả ca khám trong ngày</option>
              <option value="sang">🌅 Ca Sáng (08:00 - 11:30)</option>
              <option value="chieu">🌇 Ca Chiều (13:30 - 17:00)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          </div>

          {/* 4. Trạng thái */}
          <div className="relative">
            <select
              value={filterTrangThai}
              onChange={(e) => setFilterTrangThai(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-gray-50/50 hover:bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer transition"
            >
              <option value="tat_ca">Tất cả trạng thái</option>
              <option value="da_xac_nhan">Đã xác nhận</option>
              <option value="cho_duyet_huy">⏳ Chờ Giám đốc duyệt hủy</option>
              <option value="da_huy">Đã hủy</option>
              <option value="cho_kham">Chờ khám</option>
              <option value="cho_xac_nhan">Chờ xác nhận</option>
              <option value="hoan_thanh">Đã hoàn thành</option>
              <option value="vang_mat">Vắng mặt</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>

        {/* Thông tin kết quả footer bộ lọc */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
          <span>
            Kết quả: <strong className="text-gray-900 font-bold">{filteredItems.length}</strong> ca khám
          </span>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            * Bác sĩ chỉ có thể gửi yêu cầu hủy ca tối thiểu trước 24 tiếng so với giờ khám.
          </span>
        </div>
      </div>

      {/* ─── DANH SÁCH LỊCH HẸN ──────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-xs text-gray-400">
          Đang tải danh sách lịch hẹn...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-10 text-center space-y-2">
          <Calendar className="mx-auto h-8 w-8 text-gray-300" />
          <p className="text-xs font-bold text-gray-700">Không tìm thấy ca khám nào</p>
          <p className="text-[11px] text-gray-400">
            Thử thay đổi mốc thời gian hoặc đặt lại bộ lọc.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-1 px-3 py-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ── DẠNG BẢNG DANH SÁCH (TABLE VIEW GỌN GÀNG) ──────────── */
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[10px] border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Mã LH</th>
                  <th className="py-2.5 px-3 font-semibold">Bệnh nhân</th>
                  <th className="py-2.5 px-3 font-semibold">Thời gian</th>
                  <th className="py-2.5 px-3 font-semibold">Hình thức</th>
                  <th className="py-2.5 px-3 font-semibold">Lý do khám</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Trạng thái</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredItems.map((item) => {
                  const appointmentDate = item.ngayHen || item.ngayKham;
                  const appointmentHour = formatTimeCompact(item.gioHen || item.gioKham);
                  const isOnline = item.hinhThuc === 'truc_tuyen' || item.hinhThucKham === 'online';
                  const isPendingCancel = item.trangThai === 'cho_duyet_huy';
                  const isCancelled = item.trangThai === 'da_huy';
                  const isCompleted = item.trangThai === 'hoan_thanh';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isPendingCancel ? 'bg-amber-50/30' : isCancelled ? 'bg-gray-50/40 text-gray-400' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-primary-700 whitespace-nowrap">
                        {item.maLichHen}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{item.benhNhan?.hoTen || 'Bệnh nhân'}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {item.benhNhan?.soDienThoai || 'N/A'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-gray-800">{appointmentHour}</div>
                        <div className="text-[11px] text-gray-400">{formatDate(appointmentDate)}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOnline
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isOnline ? '🎥 Online' : '🏥 Trực tiếp'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="text-[11px] text-gray-600 truncate" title={item.lyDoKham}>
                          {item.lyDoKham || '---'}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={item.trangThai} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isPendingCancel ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Chờ GĐ duyệt
                          </span>
                        ) : isCancelled ? (
                          <span className="text-[11px] text-gray-400">Đã hủy</span>
                        ) : isCompleted ? (
                          <button
                            type="button"
                            onClick={() =>
                              setReviewModalData({
                                isOpen: true,
                                appointment: {
                                  id: item.id,
                                  lichHenId: item.id,
                                  maLichHen: item.maLichHen,
                                  ngayHen: item.ngayHen || item.ngayKham,
                                  bacSi: item.bacSi || { nhanVien: { hoTen: user?.hoTen } },
                                  chuyenKhoa: item.bacSi?.chuyenKhoa || 'Đa khoa',
                                },
                              })
                            }
                            className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="h-3 w-3 text-amber-500 fill-amber-400" /> Đánh giá
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(item)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <AlertCircle className="h-3 w-3 text-red-500" /> Hủy ca
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── DẠNG THẺ (COMPACT GRID CARDS) ──────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map((item) => {
            const appointmentDate = item.ngayHen || item.ngayKham;
            const appointmentHour = formatTimeCompact(item.gioHen || item.gioKham);
            const isOnline = item.hinhThuc === 'truc_tuyen' || item.hinhThucKham === 'online';
            const isPendingCancel = item.trangThai === 'cho_duyet_huy';
            const isCancelled = item.trangThai === 'da_huy';
            const isCompleted = item.trangThai === 'hoan_thanh';

            // Trích xuất lý do hủy bác sĩ đã nhập nếu đang chờ duyệt
            const cancelReasonMatch = item.ghiChu?.match(/\[BÁC SĨ YÊU CẦU HỦY:\s*([^\]]+)\]/i);
            const cancelReasonText = cancelReasonMatch ? cancelReasonMatch[1] : null;

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-white p-3 space-y-2.5 transition-all shadow-2xs flex flex-col justify-between ${
                  isPendingCancel
                    ? 'border-amber-300 bg-amber-50/25 ring-1 ring-amber-200'
                    : isCancelled
                    ? 'border-gray-200 bg-gray-50/60 opacity-80'
                    : 'border-gray-200 hover:border-primary-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  {/* Header: Mã lịch & Badge trạng thái */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                    <span className="text-xs font-bold text-primary-700 tracking-wide">
                      {item.maLichHen}
                    </span>
                    <StatusBadge status={item.trangThai} size="sm" />
                  </div>

                  {/* Thông tin bệnh nhân */}
                  <div className="flex items-start gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {(item.benhNhan?.hoTen || 'B').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-xs truncate" title={item.benhNhan?.hoTen}>
                        {item.benhNhan?.hoTen || 'Bệnh nhân'}
                      </h4>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-2.5 w-2.5 text-gray-400" /> {item.benhNhan?.soDienThoai || 'Chưa có SĐT'}
                      </p>
                    </div>
                  </div>

                  {/* Khung Ngày & Giờ khám */}
                  <div className="flex items-center justify-between text-xs bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-primary-600" />
                      <span className="font-bold text-gray-800 text-xs">{appointmentHour}</span>
                      {appointmentDate && (
                        <span className="text-[10px] text-gray-500 font-medium">
                          • {formatDate(appointmentDate)}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isOnline
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {isOnline ? 'Online' : 'Trực tiếp'}
                    </span>
                  </div>

                  {/* Lý do khám */}
                  {item.lyDoKham && (
                    <p className="text-[11px] text-gray-600 bg-gray-50/60 p-1.5 rounded-md line-clamp-2 leading-relaxed">
                      <span className="font-semibold text-gray-700">Lý do:</span> {item.lyDoKham}
                    </p>
                  )}

                  {/* Ghi chú lý do hủy nếu đang chờ duyệt */}
                  {isPendingCancel && cancelReasonText && (
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                      <p className="font-bold flex items-center gap-1 text-amber-800">
                        <AlertTriangle className="h-3 w-3 text-amber-600" /> Chờ duyệt hủy:
                      </p>
                      <p className="mt-0.5 text-[10px] text-amber-800 italic line-clamp-2">&ldquo;{cancelReasonText}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Nút hành động Bác sĩ */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-gray-400">
                    {isCancelled ? 'Đã hủy' : isCompleted ? 'Hoàn tất' : 'Chờ khám'}
                  </span>

                  {isPendingCancel ? (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 animate-spin" /> Chờ GĐ duyệt
                    </span>
                  ) : isCancelled ? (
                    <span className="text-[11px] text-gray-400 italic">Ca khám đã hủy</span>
                  ) : isCompleted ? (
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModalData({
                          isOpen: true,
                          appointment: {
                            id: item.id,
                            lichHenId: item.id,
                            maLichHen: item.maLichHen,
                            ngayHen: item.ngayHen || item.ngayKham,
                            bacSi: item.bacSi || { nhanVien: { hoTen: user?.hoTen } },
                            chuyenKhoa: item.bacSi?.chuyenKhoa || 'Đa khoa',
                          },
                        })
                      }
                      className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Xem đánh giá của bệnh nhân"
                    >
                      <Star className="h-3 w-3 text-amber-500 fill-amber-400" /> Xem đánh giá
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(item)}
                      className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Yêu cầu hủy ca khám (Trình Ban Giám Đốc xét duyệt)"
                    >
                      <AlertCircle className="h-3 w-3 text-red-500" /> Yêu cầu hủy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* ─── MODAL SOẠN YÊU CẦU HỦY CA TRÌNH GIÁM ĐỐC ───────────── */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-scale-in">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Yêu cầu hủy ca khám</h3>
                  <p className="text-xs text-gray-500">Mã lịch hẹn: <strong>{cancelModalItem.maLichHen}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalItem(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Chi tiết ca khám */}
            <div className="rounded-xl bg-gray-50 p-3 text-xs space-y-1.5 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Bệnh nhân:</span>
                <strong className="text-gray-900">{cancelModalItem.benhNhan?.hoTen} ({cancelModalItem.benhNhan?.soDienThoai})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Thời gian khám:</span>
                <strong className="text-primary-700">{cancelModalItem.gioHen || cancelModalItem.gioKham} • Ngày {formatDate(cancelModalItem.ngayHen || cancelModalItem.ngayKham)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hình thức khám:</span>
                <span className="font-semibold text-gray-800">
                  {cancelModalItem.hinhThuc === 'truc_tuyen' || cancelModalItem.hinhThucKham === 'online' ? '🎥 Trực tuyến (Telehealth)' : '🏥 Trực tiếp tại phòng khám'}
                </span>
              </div>
            </div>

            {/* Thông báo quy định & quy trình */}
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-800">
                <Info className="h-4 w-4 text-amber-600 flex-shrink-0" /> Quy trình xử lý hủy ca:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90 pl-1">
                <li>Yêu cầu này sẽ được gửi trực tiếp đến <strong>Ban Giám Đốc</strong> xét duyệt.</li>
                <li>Khi Giám Đốc duyệt, hệ thống sẽ <strong>gửi thông báo cho bệnh nhân</strong> và <strong>hoàn trả 100% tiền tạm ứng 40.000đ</strong>.</li>
                <li>Bác sĩ chỉ có thể gửi yêu cầu hủy <strong>tối thiểu trước 1 ngày (24 tiếng)</strong> so với giờ khám.</li>
              </ul>
            </div>

            {/* Form nhập lý do */}
            <form onSubmit={handleSubmitCancel} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Lý do hủy ca khám <span className="text-red-500">* (Bắt buộc)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelError) setCancelError('');
                  }}
                  placeholder="Nhập lý do chi tiết (ví dụ: bận lịch hội chẩn khẩn cấp, đi công tác đột xuất, đổi ca trực theo chỉ đạo...)"
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              {cancelError && (
                <div className="p-2 bg-red-50 text-red-600 rounded-lg text-xs border border-red-200">
                  {cancelError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <MedButton
                  variant="ghost"
                  type="button"
                  onClick={() => setCancelModalItem(null)}
                  disabled={huyCaMutation.isPending}
                >
                  Đóng
                </MedButton>
                <MedButton
                  variant="danger"
                  type="submit"
                  leftIcon={<Send className="h-4 w-4" />}
                  loading={huyCaMutation.isPending}
                  disabled={huyCaMutation.isPending}
                >
                  Gửi yêu cầu hủy ca
                </MedButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CẢNH BÁO QUY ĐỊNH 24 TIẾNG ───────────────────────── */}
      {ruleWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-scale-in text-center">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Không thể gửi yêu cầu hủy ca</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed text-left bg-amber-50 p-3 rounded-xl border border-amber-200">
                {ruleWarningModal.reason}
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRuleWarningModal(null)}
                className="w-full py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XEM ĐÁNH GIÁ CỦA BỆNH NHÂN ──────────────────────── */}
      {reviewModalData.isOpen && (
        <DanhGiaCaKhamModal
          isOpen={reviewModalData.isOpen}
          onClose={() => setReviewModalData({ isOpen: false, appointment: null })}
          appointment={reviewModalData.appointment}
        />
      )}
    </div>
  );
}
