import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../../store/authStore';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { apiGet, apiPost } from '../../../services/api';
import { formatDate } from '../../../utils/formatDate';
import {
  Calendar, Clock, Phone, Video, Stethoscope, Search,
  SlidersHorizontal, AlertTriangle, X, CheckCircle2,
  ChevronDown, RotateCcw, AlertCircle, Info, Send
} from 'lucide-react';

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary-600" /> Quản Lý Lịch Hẹn & Lịch Khám Bác Sĩ
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi danh sách ca khám trực tiếp & tư vấn online, quản lý ca và gửi yêu cầu hủy ca tới Ban Giám Đốc
          </p>
        </div>

        {hasActiveFilter && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại bộ lọc
          </button>
        )}
      </div>

      {/* Banner thông báo thành công */}
      {successBanner && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-light p-4 text-sm text-success-main border border-success-main/30 animate-fade-in shadow-2xs">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">{successBanner}</span>
        </div>
      )}

      {/* ─── THANH BỘ LỌC ĐA TIÊU CHÍ ────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3.5">
        {/* Hàng 1: Bộ lọc mốc thời gian */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gray-700 mr-1 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary-600" /> Mốc thời gian:
          </span>
          {[
            { id: 'all', label: 'Tất cả ngày' },
            { id: 'today', label: 'Hôm nay' },
            { id: 'tomorrow', label: 'Ngày mai' },
            { id: '7days', label: '7 ngày tới' },
            { id: 'thisWeek', label: 'Tuần này' },
            { id: 'thisMonth', label: 'Tháng này' },
            { id: 'custom', label: 'Chọn ngày cụ thể' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeFilter(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                timeFilter === t.id
                  ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Ô chọn ngày khi bấm "Chọn ngày cụ thể" */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-1.5 ml-2 p-1 bg-primary-50 rounded-lg border border-primary-200 animate-fade-in">
              <span className="text-[11px] font-bold text-primary-900 px-1">Ngày:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-0.5 text-xs bg-white focus:ring-1 focus:ring-primary-500 font-medium"
              />
            </div>
          )}
        </div>

        {/* Hàng 2: Loại hình, Ca khám, Trạng thái, Ô tìm kiếm */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          {/* 1. Tìm kiếm từ khóa */}
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm bệnh nhân, SĐT, mã lịch..."
              className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-8 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
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
              className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
            >
              <option value="tat_ca">Tất cả hình thức (Trực tiếp & Online)</option>
              <option value="truc_tiep">🏥 Khám trực tiếp tại phòng khám</option>
              <option value="online">🎥 Tư vấn trực tuyến (Telehealth)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          {/* 3. Ca khám */}
          <div className="relative">
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
            >
              <option value="tat_ca">Tất cả ca khám trong ngày</option>
              <option value="sang">🌅 Ca Sáng (08h00 - 11h30)</option>
              <option value="chieu">🌇 Ca Chiều (13h30 - 17h00)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          {/* 4. Trạng thái */}
          <div className="relative">
            <select
              value={filterTrangThai}
              onChange={(e) => setFilterTrangThai(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
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
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Thống kê số lượng kết quả */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>Tìm thấy: <strong className="text-gray-900 font-bold">{filteredItems.length}</strong> ca khám</span>
          <span className="text-[11px] text-gray-400">
            * Bác sĩ chỉ có thể gửi yêu cầu hủy ca tối thiểu trước 1 ngày (24 tiếng) so với giờ khám.
          </span>
        </div>
      </div>

      {/* ─── DANH SÁCH LỊCH HẸN ──────────────────────────────────── */}
      <MedCard>
        {isLoading ? (
          <p className="text-center text-sm text-gray-400 py-12">Đang tải danh sách lịch hẹn...</p>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Calendar className="mx-auto h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">
              Không tìm thấy ca khám nào phù hợp
            </p>
            <p className="text-xs text-gray-400">
              Thử chọn mốc thời gian khác (7 ngày tới, tất cả ngày) hoặc đổi bộ lọc trạng thái.
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Xem tất cả lịch khám
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const appointmentDate = item.ngayHen || item.ngayKham;
              const appointmentHour = item.gioHen || item.gioKham;
              const isPendingCancel = item.trangThai === 'cho_duyet_huy';
              const isCancelled = item.trangThai === 'da_huy';
              const isCompleted = item.trangThai === 'hoan_thanh';

              // Trích xuất lý do hủy bác sĩ đã nhập nếu đang chờ duyệt
              const cancelReasonMatch = item.ghiChu?.match(/\[BÁC SĨ YÊU CẦU HỦY:\s*([^\]]+)\]/i);
              const cancelReasonText = cancelReasonMatch ? cancelReasonMatch[1] : null;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-white p-4 space-y-3.5 transition-all shadow-2xs flex flex-col justify-between ${
                    isPendingCancel
                      ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-300/40'
                      : isCancelled
                      ? 'border-gray-200 bg-gray-50/60 opacity-85'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Mã lịch & Badge trạng thái */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-700 tracking-wide">{item.maLichHen}</span>
                      <StatusBadge status={item.trangThai} size="sm" />
                    </div>

                    {/* Thông tin bệnh nhân */}
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{item.benhNhan?.hoTen || 'Bệnh nhân'}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 text-gray-400" /> {item.benhNhan?.soDienThoai || 'Chưa cập nhật SĐT'}
                      </p>
                    </div>

                    {/* Khung Ngày & Giờ khám */}
                    <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-gray-800">
                          <Clock className="h-3.5 w-3.5 text-primary-600" /> {appointmentHour}
                        </div>
                        {appointmentDate && (
                          <div className="text-[11px] text-gray-500">
                            Ngày: <strong>{formatDate(appointmentDate)}</strong>
                          </div>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${item.hinhThuc === 'truc_tuyen' || item.hinhThucKham === 'online' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                        {item.hinhThuc === 'truc_tuyen' || item.hinhThucKham === 'online' ? '🎥 Online' : '🏥 Trực tiếp'}
                      </span>
                    </div>

                    {/* Lý do khám */}
                    {item.lyDoKham && (
                      <p className="text-xs text-gray-600 bg-gray-50/70 p-2 rounded-lg line-clamp-2">
                        <span className="font-semibold text-gray-700">Lý do:</span> {item.lyDoKham}
                      </p>
                    )}

                    {/* Ghi chú lý do hủy nếu đang chờ duyệt */}
                    {isPendingCancel && cancelReasonText && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                        <p className="font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Đang chờ Giám đốc phê duyệt hủy:
                        </p>
                        <p className="mt-0.5 text-[11px] text-amber-800 italic">&ldquo;{cancelReasonText}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  {/* Nút hành động Bác sĩ */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                    {isPendingCancel ? (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-spin" /> Chờ Ban Giám Đốc duyệt
                      </span>
                    ) : isCancelled ? (
                      <span className="text-[11px] font-medium text-gray-400">
                        Ca khám đã hủy
                      </span>
                    ) : isCompleted ? (
                      <span className="text-[11px] font-medium text-emerald-600">
                        Ca khám đã hoàn tất
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Yêu cầu hủy ca khám (Trình Ban Giám Đốc xét duyệt)"
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Yêu cầu hủy ca
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MedCard>

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
    </div>
  );
}
