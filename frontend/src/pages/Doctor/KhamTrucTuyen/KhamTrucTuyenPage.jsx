import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../../store/authStore';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { formatDateTime, formatDate, checkTelehealthAccess } from '../../../utils/formatDate';
import useTelehealthStore from '../../../store/telehealthStore';
import {
  Video, Calendar, Clock, User,
  FileText, Pill, CheckCircle2, ShieldCheck, AlertCircle, Search, SlidersHorizontal,
  RotateCcw, X, ChevronDown, Activity, Phone
} from 'lucide-react';

const getTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getAppointmentDateKey = (item) => {
  const date = item?.ngayHen || item?.ngayKham;
  if (!date) return '';
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date).slice(0, 10);
};

export default function KhamTrucTuyenPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { startCall, isOpen: isCallOpen, maximizeCall } = useTelehealthStore();
  const [selectedLich, setSelectedLich] = useState(null);
  const [formAdvise, setFormAdvise] = useState({ chanDoan: '', loiKhuyen: '' });
  const [savingAdvise, setSavingAdvise] = useState(false);
  const [showDatLichModal, setShowDatLichModal] = useState(false);
  const [bookedAppointmentMap, setBookedAppointmentMap] = useState({});

  // Bộ lọc cho danh sách tư vấn
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'tomorrow', '7days', 'thisWeek', 'custom'
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'can_join', 'dang_kham', 'da_xac_nhan', 'cho_xac_nhan', 'hoan_thanh', 'da_huy'
  const [shiftFilter, setShiftFilter] = useState('all'); // 'all', 'sang', 'chieu'

  // Lấy danh sách lịch tư vấn online
  const { data, isLoading } = useQuery({
    queryKey: ['lich-tu-van-online', user?.id],
    queryFn: () => apiGet('/lich-hen?loai=online&limit=100'),
    staleTime: 0,
    enabled: !!user?.id,
  });

  // Lấy danh sách lịch hẹn để kiểm tra ca đặt khám trực tiếp hộ đã tạo trong CSDL
  const { data: allApptsData } = useQuery({
    queryKey: ['lich-hen-all-booked'],
    queryFn: () => apiGet('/lich-hen?limit=200'),
    staleTime: 5000,
    enabled: !!user?.id,
  });

  const rawItems = Array.isArray(data) ? data : data?.data;
  const items = rawItems || [];
  const allAppts = Array.isArray(allApptsData) ? allApptsData : allApptsData?.data || [];

  // Tự động liên kết và tra cứu các ca khám trực tiếp đã được Bác sĩ đặt hộ từ ca Telehealth
  const bookedFollowUpMap = useMemo(() => {
    const map = { ...bookedAppointmentMap };
    allAppts.forEach((app) => {
      if (app.ghiChu && app.ghiChu.includes('[Bác sĩ đặt lịch trực tiếp từ ca Telehealth')) {
        const match = app.ghiChu.match(/\[Bác sĩ đặt lịch trực tiếp từ ca Telehealth\s*(LH\d+)\]/i);
        if (match && match[1]) {
          const telehealthCode = match[1];
          const thLich = items.find((it) => it.maLichHen === telehealthCode);
          if (thLich) {
            map[thLich.id] = app;
          }
        }
      }
    });
    return map;
  }, [allAppts, items, bookedAppointmentMap]);

  const handleHoanTatTuVan = async () => {
    if (!activeLich?.id) return;

    if (activeLich.trangThai === 'da_huy') {
      alert('Ca khám này đã bị hủy, không thể gửi kết luận tư vấn.');
      return;
    }

    if (activeLich.trangThai === 'hoan_thanh') {
      alert('Ca tư vấn trực tuyến này đã hoàn tất trước đó.');
      return;
    }

    if (!formAdvise.chanDoan.trim() && !formAdvise.loiKhuyen.trim()) {
      if (!window.confirm('Bạn chưa nhập chẩn đoán hoặc lời khuyên. Bạn có chắc muốn hoàn tất ca tư vấn này?')) {
        return;
      }
    }

    setSavingAdvise(true);
    try {
      const res = await apiPost(`/lich-hen/${activeLich.id}/hoan-tat-tu-van`, {
        chanDoan: formAdvise.chanDoan,
        loiKhuyen: formAdvise.loiKhuyen,
      });

      alert(res?.message || 'Đã hoàn tất ca tư vấn trực tuyến và ghi nhận hồ sơ bệnh án thành công!');
      queryClient.invalidateQueries(['lich-tu-van-online']);
      setFormAdvise({ chanDoan: '', loiKhuyen: '' });
    } catch (err) {
      console.error('Lỗi hoàn tất tư vấn:', err);
      alert(err?.error?.message || err?.message || 'Có lỗi khi lưu kết luận tư vấn.');
    } finally {
      setSavingAdvise(false);
    }
  };

  const handleStartVideoCall = async (lich) => {
    if (!lich) return;

    // Kiểm tra thời gian: nếu ca khám đã quá giờ hẹn (đã hết 60 phút) thì không được vào
    const access = checkTelehealthAccess(lich.ngayHen || lich.ngayKham, lich.gioHen || lich.gioKham);
    if (access.isExpired) {
      alert(`⏰ CA KHÁM TRỰC TUYẾN ĐÃ HẾT GIỜ:\n\n${access.statusMessage}\nPhòng khám trực tuyến đã đóng, không thể tham gia cuộc gọi.`);
      return;
    }
    if (!access.canJoin) {
      alert(`⏰ CHƯA ĐẾN GIỜ KHÁM:\n\n${access.statusMessage}`);
      return;
    }

    // Ràng buộc nghiệp vụ: Bác sĩ không được vào ca mới nếu có ca khác đang "dang_kham"
    const danglingKham = items.find((it) => it.trangThai === 'dang_kham' && it.id !== lich.id);
    if (danglingKham) {
      const bnName = danglingKham.benhNhan?.hoTen || 'Bệnh nhân';
      const maLh = danglingKham.maLichHen || `#${danglingKham.id}`;
      const timeInfo = `${danglingKham.gioHen || danglingKham.gioKham || ''} ngày ${formatDate(danglingKham.ngayHen || danglingKham.ngayKham)}`;

      alert(
        `⚠️ BÁC SĨ CHƯA KẾT LUẬN CA KHÁM TRƯỚC!\n\n` +
        `• Mã ca khám: ${maLh}\n` +
        `• Bệnh nhân: ${bnName}\n` +
        `• Giờ hẹn: ${timeInfo}\n\n` +
        `Ca khám trên hiện đang ở trạng thái [Đang khám] và chưa có kết luận tư vấn.\n` +
        `Bác sĩ bắt buộc phải hoàn tất kết luận chuyên môn cho ca này trước khi bắt đầu cuộc gọi với ca mới!`
      );
      // Tự động chuyển màn hình về đúng ca đang khám dở dang để Bác sĩ kết luận
      setSelectedLich(danglingKham);
      return;
    }

    if (isCallOpen) {
      maximizeCall();
      return;
    }

    // Tự động chuyển trạng thái lịch hẹn sang dang_kham nếu đang là da_xac_nhan hoặc cho_xac_nhan
    if (lich.trangThai !== 'dang_kham') {
      try {
        await apiPatch(`/lich-hen/${lich.id}/trang-thai`, {
          trangThai: 'dang_kham',
          ghiChu: 'Bác sĩ đã bắt đầu cuộc gọi khám trực tuyến',
        });
        queryClient.invalidateQueries(['lich-tu-van-online']);
      } catch (err) {
        console.warn('Không thể cập nhật trạng thái dang_kham:', err);
      }
    }

    startCall({
      participantName: lich?.benhNhan?.hoTen || 'Bệnh nhân',
      role: 'doctor',
      appointmentInfo: lich || {},
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTimeFilter('all');
    setSelectedDate('');
    setStatusFilter('all');
    setShiftFilter('all');
  };

  const hasActiveFilter =
    timeFilter !== 'all' ||
    statusFilter !== 'all' ||
    shiftFilter !== 'all' ||
    searchTerm.trim() !== '' ||
    selectedDate !== '';

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const todayKey = getTodayKey();
    const now = new Date();

    return items.filter((item) => {
      const patient = item.benhNhan || {};
      const dateKey = getAppointmentDateKey(item);
      const itemDate = dateKey ? new Date(dateKey) : null;
      const gioKham = item.gioHen || item.gioKham || '';

      // 1. Lọc theo thời gian / ngày
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
      } else if (timeFilter === 'custom') {
        if (selectedDate && dateKey !== selectedDate) return false;
      }

      // 2. Lọc theo trạng thái
      if (statusFilter === 'can_join') {
        if (item.trangThai === 'da_huy' || item.trangThai === 'hoan_thanh' || item.trangThai === 'cho_thanh_toan') return false;
        const itemAccess = checkTelehealthAccess(item.ngayHen || item.ngayKham, item.gioHen || item.gioKham);
        if (!itemAccess.canJoin) return false;
      } else if (statusFilter !== 'all') {
        if (item.trangThai !== statusFilter) return false;
      }

      // 3. Lọc theo ca khám
      if (shiftFilter === 'sang') {
        const hour = parseInt(gioKham.slice(0, 2), 10);
        if (!isNaN(hour) && hour >= 12) return false;
      } else if (shiftFilter === 'chieu') {
        const hour = parseInt(gioKham.slice(0, 2), 10);
        if (!isNaN(hour) && hour < 12) return false;
      }

      // 4. Tìm kiếm từ khóa
      if (keyword) {
        const matchesSearch = [
          item.maLichHen,
          patient.hoTen,
          patient.soDienThoai,
          item.lyDoKham,
          gioKham,
          dateKey,
        ].some((value) => String(value || '').toLowerCase().includes(keyword));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [items, searchTerm, statusFilter, timeFilter, selectedDate, shiftFilter]);

  const activeLich = filteredItems.find((item) => item.id === selectedLich?.id) || filteredItems[0];
  const isDaHuy = activeLich?.trangThai === 'da_huy';
  const isDangKham = activeLich?.trangThai === 'dang_kham';
  const activeAccess = activeLich
    ? checkTelehealthAccess(activeLich.ngayHen || activeLich.ngayKham, activeLich.gioHen || activeLich.gioKham)
    : { canJoin: true };

  // Tìm ca khám khác đang ở trạng thái 'dang_kham' (chưa hoàn tất kết luận)
  const otherDanglingKham = items.find((it) => it.trangThai === 'dang_kham' && it.id !== activeLich?.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-7 w-7 text-primary-600" /> Khám & Tư vấn Trực tuyến (Telehealth)
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-13rem)]">
        {/* Danh sách ca tư vấn */}
        <MedCard className="flex flex-col min-h-[350px] lg:h-full overflow-hidden p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary-600" /> Lịch tư vấn trực tuyến
            </h3>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Xóa lọc
              </button>
            )}
          </div>

          {/* Bộ lọc đa năng */}
          <div className="mb-3 space-y-2">
            {/* 1. Ô tìm kiếm từ khóa */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên BN, mã lịch, SĐT, lý do..."
                className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-7 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-gray-50/50 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* 2. Lọc nhanh theo ngày / thời gian */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold px-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary-600" /> Thời gian:
                </span>
                {timeFilter === 'custom' && selectedDate && (
                  <span className="text-primary-700 font-bold text-[10px]">{selectedDate}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'tomorrow', label: 'Ngày mai' },
                  { id: '7days', label: '7 ngày tới' },
                  { id: 'thisWeek', label: 'Tuần này' },
                  { id: 'all', label: 'Tất cả' },
                  { id: 'custom', label: 'Chọn ngày' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeFilter(t.id)}
                    className={`py-1 px-1 text-[11px] font-semibold rounded transition text-center cursor-pointer border ${
                      timeFilter === t.id
                        ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Khi chọn "Chọn ngày" */}
            {timeFilter === 'custom' && (
              <div className="flex items-center gap-1.5 p-2 bg-primary-50/60 rounded-lg border border-primary-100 text-xs animate-fade-in">
                <label className="text-[11px] font-semibold text-primary-900 whitespace-nowrap">Ngày khám:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

            {/* 3. Lọc Trạng thái & Ca khám */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-1.5 pl-2 pr-6 text-[11px] font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="dang_kham">🟣 Đang khám</option>
                  <option value="can_join">🔴 Đang mở phòng</option>
                  <option value="da_xac_nhan">Đã xác nhận</option>
                  <option value="cho_xac_nhan">Chờ xác nhận</option>
                  <option value="hoan_thanh">Đã hoàn thành</option>
                  <option value="da_huy">Đã hủy</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-1.5 pl-2 pr-6 text-[11px] font-medium text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">Tất cả ca khám</option>
                  <option value="sang">Ca Sáng (08h-11h)</option>
                  <option value="chieu">Ca Chiều (13h-16h)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-gray-400" />
              </div>
            </div>

            {/* Thống kê số lượng kết quả */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-0.5 pt-0.5 border-t border-gray-100">
              <span>Tìm thấy: <strong className="text-gray-900">{filteredItems.length}</strong> ca tư vấn</span>
              {hasActiveFilter && (
                <span className="text-primary-600 font-semibold text-[10px]">Đang áp dụng bộ lọc</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {isLoading && <p className="text-center text-sm text-gray-400 py-6">Đang tải lịch hẹn...</p>}
            {!isLoading && filteredItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center">
                <Calendar className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">
                  Không tìm thấy ca tư vấn phù hợp
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Thử chọn mốc thời gian khác (7 ngày tới, tất cả ngày) hoặc đổi bộ lọc trạng thái.
                </p>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-3 px-3 py-1 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Xem tất cả lịch tư vấn
                  </button>
                )}
              </div>
            )}
            {filteredItems.map((item) => {
              const itemAccess = checkTelehealthAccess(item.ngayHen || item.ngayKham, item.gioHen || item.gioKham);
              const appointmentDate = item.ngayHen || item.ngayKham;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedLich(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activeLich?.id === item.id
                      ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-primary-700">{item.maLichHen}</span>
                    {item.trangThai === 'dang_kham' ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-300 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-ping"></span>
                        Đang khám
                      </span>
                    ) : item.trangThai === 'cho_thanh_toan' ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        Chờ BN thanh toán
                      </span>
                    ) : item.trangThai === 'da_huy' ? (
                      <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Đã hủy
                      </span>
                    ) : item.trangThai === 'hoan_thanh' ? (
                      <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        Đã hoàn thành
                      </span>
                    ) : itemAccess.canJoin ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Đang mở phòng
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" /> Mở trước 15p
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{item.benhNhan?.hoTen}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    {appointmentDate && (
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <Calendar className="h-3 w-3 text-primary-600" />
                        {formatDate(appointmentDate)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" /> {item.gioHen || item.gioKham}
                    </span>
                    {item.benhNhan?.soDienThoai && <span>• {item.benhNhan.soDienThoai}</span>}
                  </div>
                  {item.lyDoKham && (
                    <p className="text-xs text-gray-600 line-clamp-1 mt-1.5 bg-gray-100 p-1.5 rounded-md">
                      Lý do: {item.lyDoKham}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </MedCard>

        {/* Khung Khám & Chat Trực tuyến */}
        {activeLich && (
          <div className="lg:col-span-2 flex flex-col min-w-0 h-full space-y-4">
            {/* Header thông tin bệnh nhân */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{activeLich.benhNhan?.hoTen}</h4>
                  <p className="text-xs text-gray-500">
                    SĐT: {activeLich.benhNhan?.soDienThoai} | Khám lúc: {activeLich.gioHen || activeLich.gioKham}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bookedFollowUpMap[activeLich.id] ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Đã hoàn tất đặt lịch khám hộ ({bookedFollowUpMap[activeLich.id].maLichHen || 'Thành công'})</span>
                  </div>
                ) : (
                  <MedButton
                    variant="secondary"
                    size="sm"
                    disabled={isDaHuy}
                    leftIcon={<Calendar className={`h-4 w-4 ${isDaHuy ? 'text-gray-400' : 'text-blue-600'}`} />}
                    onClick={() => !isDaHuy && setShowDatLichModal(true)}
                    title={isDaHuy ? 'Ca khám đã bị hủy - Không thể đặt lịch hộ' : 'Đặt lịch khám trực tiếp hộ BN'}
                  >
                    + Đặt lịch khám trực tiếp hộ BN
                  </MedButton>
                )}

                {activeLich.trangThai === 'cho_thanh_toan' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                      💳 BN chưa thanh toán phí tư vấn
                    </span>
                    <MedButton
                      variant="secondary"
                      size="sm"
                      disabled
                      leftIcon={<Video className="h-4 w-4 text-gray-400" />}
                      title="Bệnh nhân chưa thanh toán phí khám trực tuyến"
                    >
                      Chờ thanh toán
                    </MedButton>
                  </div>
                ) : activeLich.trangThai === 'da_huy' ? (
                  <span className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                    🚫 Ca khám đã bị hủy
                  </span>
                ) : activeLich.trangThai === 'hoan_thanh' ? (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    ✓ Đã hoàn tất tư vấn
                  </span>
                ) : activeAccess.isExpired ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200">
                      🔒 Đã hết giờ khám (Đóng phòng)
                    </span>
                    <MedButton
                      variant="secondary"
                      size="sm"
                      disabled
                      leftIcon={<Video className="h-4 w-4 text-gray-400" />}
                      title={activeAccess.statusMessage}
                    >
                      Đã kết thúc
                    </MedButton>
                  </div>
                ) : isDangKham ? (
                  <MedButton
                    variant="primary"
                    size="sm"
                    leftIcon={<Video className="h-4 w-4" />}
                    onClick={() => handleStartVideoCall(activeLich)}
                    className="bg-purple-600 hover:bg-purple-700 shadow-sm animate-pulse text-white font-bold"
                  >
                    📹 Đang trong cuộc khám
                  </MedButton>
                ) : activeAccess.canJoin ? (
                  <MedButton
                    variant="primary"
                    size="sm"
                    leftIcon={<Video className="h-4 w-4" />}
                    onClick={() => handleStartVideoCall(activeLich)}
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-sm animate-pulse"
                  >
                    Mở Video Call
                  </MedButton>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 hidden sm:inline-block">
                      ⏱️ Mở lúc {activeAccess.openTimeText} (còn {activeAccess.timeLeftText})
                    </span>
                    <MedButton
                      variant="secondary"
                      size="sm"
                      disabled
                      leftIcon={<Video className="h-4 w-4 text-gray-400" />}
                      title={activeAccess.statusMessage}
                    >
                      {activeAccess.isTooEarly ? 'Chưa tới giờ mở phòng' : 'Đã kết thúc'}
                    </MedButton>
                  </div>
                )}
              </div>
            </div>

            {/* Chi tiết ca tư vấn & Ghi nhận kết quả (Đã xóa khung chat ngoài - Video Call đã có chat riêng) */}
            <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 p-5 flex flex-col space-y-4 overflow-y-auto">
              {/* Header ca khám & trạng thái */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary-600" /> Kết luận tư vấn & Chẩn đoán từ xa
                  </h4>
                  {isDangKham && (
                    activeAccess.isExpired ? (
                      <span className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                        Đã kết thúc cuộc gọi • Chờ kết luận
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping"></span>
                        Đang trong ca khám trực tuyến
                      </span>
                    )
                  )}
                </div>
                {activeLich?.trangThai === 'hoan_thanh' ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Đã hoàn tất & Lưu bệnh án
                  </span>
                ) : isDaHuy ? (
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-600" /> Ca khám đã bị hủy
                  </span>
                ) : null}
              </div>

              {/* Thông báo ngữ cảnh */}
              {otherDanglingKham && (
                <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-amber-900">
                        Có ca khám chưa kết luận: [{otherDanglingKham.maLichHen}] - {otherDanglingKham.benhNhan?.hoTen}
                      </p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Ca khám này đang ở trạng thái <strong>[Đang khám]</strong>. Bạn vẫn có thể xem thông tin ca hiện tại, nhưng bắt buộc phải hoàn tất kết luận cho ca của <strong>{otherDanglingKham.benhNhan?.hoTen}</strong> trước khi bắt đầu cuộc gọi cho ca mới.
                      </p>
                    </div>
                  </div>
                  <MedButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedLich(otherDanglingKham)}
                    className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 font-bold shrink-0 text-xs shadow-2xs"
                  >
                    👉 Chuyển đến ca {otherDanglingKham.maLichHen} để kết luận
                  </MedButton>
                </div>
              )}

              {isDaHuy ? (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-red-800 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" /> Ca khám này đã bị hủy
                  </p>
                  <p className="text-xs text-red-700">
                    Lịch hẹn trực tuyến đã hủy bỏ. Chức năng gọi video và ghi nhận kết luận tư vấn đã bị đóng.
                  </p>
                  {activeLich.ghiChu && (
                    <p className="text-xs text-red-800 pt-1 font-medium">
                      Lý do/Ghi chú: {activeLich.ghiChu}
                    </p>
                  )}
                </div>
              ) : activeLich?.trangThai === 'hoan_thanh' ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-0.5">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-800 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Ca tư vấn đã hoàn tất thành công
                  </p>
                  <p className="text-xs text-emerald-700">
                    Kết luận tư vấn và dặn dò đã được ghi nhận vào Hồ sơ bệnh án điện tử (EMR) của bệnh nhân.
                  </p>
                </div>
              ) : isDangKham ? (
                activeAccess.isExpired ? (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-gray-800">Cuộc gọi trực tuyến đã kết thúc (Hết thời gian)</p>
                        <p className="text-xs text-gray-500">Phòng gọi video đã đóng do hết giờ khám. Bác sĩ vui lòng hoàn tất chẩn đoán và bấm "Hoàn tất tư vấn & Lưu bệnh án" để kết thúc ca khám.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 text-xs text-purple-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-600 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-purple-900">Ca khám trực tuyến đang diễn ra</p>
                        <p className="text-xs text-purple-700">Bác sĩ vui lòng ghi chép kết luận chuyên môn bên dưới và bấm "Hoàn tất tư vấn" khi kết thúc buổi làm việc.</p>
                      </div>
                    </div>
                    <MedButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartVideoCall(activeLich)}
                      leftIcon={<Video className="h-4 w-4" />}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs"
                    >
                      Xem phòng Video
                    </MedButton>
                  </div>
                )
              ) : null}

              {/* Tóm tắt thông tin ca khám & Bệnh nhân */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50/80 rounded-xl p-3 border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-500 block mb-0.5 font-medium">Bệnh nhân:</span>
                  <p className="font-bold text-gray-900 text-sm">{activeLich.benhNhan?.hoTen}</p>
                  <p className="text-gray-600">{activeLich.benhNhan?.gioiTinh === 'nam' ? 'Nam' : activeLich.benhNhan?.gioiTinh === 'nu' ? 'Nữ' : ''} {activeLich.benhNhan?.ngaySinh ? `• ${formatDate(activeLich.benhNhan?.ngaySinh)}` : ''}</p>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5 font-medium">Thời gian hẹn:</span>
                  <p className="font-bold text-gray-900">{activeLich.gioHen || activeLich.gioKham} ngày {formatDate(activeLich.ngayHen || activeLich.ngayKham)}</p>
                  <p className="text-primary-700 font-medium">Mã lịch hẹn: {activeLich.maLichHen}</p>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5 font-medium">Lý do khám / Triệu chứng:</span>
                  <p className="font-semibold text-gray-800 line-clamp-2">{activeLich.lyDoKham || 'Tư vấn sức khỏe tổng quát từ xa'}</p>
                </div>
              </div>

              {/* Form chẩn đoán và lời khuyên full width */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary-600" /> Chẩn đoán sơ bộ & Tình trạng bệnh
                  </label>
                  <textarea
                    rows={4}
                    disabled={isDaHuy || activeLich?.trangThai === 'hoan_thanh'}
                    value={formAdvise.chanDoan}
                    onChange={(e) => setFormAdvise({ ...formAdvise, chanDoan: e.target.value })}
                    placeholder={
                      isDaHuy
                        ? 'Ca khám đã bị hủy...'
                        : activeLich?.trangThai === 'hoan_thanh'
                        ? 'Ca khám đã hoàn tất...'
                        : 'Nhập chẩn đoán chuyên môn, triệu chứng lâm sàng ghi nhận qua video call...'
                    }
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-emerald-600" /> Lời khuyên, Dặn dò & Hướng xử trí
                  </label>
                  <textarea
                    rows={5}
                    disabled={isDaHuy || activeLich?.trangThai === 'hoan_thanh'}
                    value={formAdvise.loiKhuyen}
                    onChange={(e) => setFormAdvise({ ...formAdvise, loiKhuyen: e.target.value })}
                    placeholder={
                      isDaHuy
                        ? 'Ca khám đã bị hủy...'
                        : activeLich?.trangThai === 'hoan_thanh'
                        ? 'Ca khám đã hoàn tất...'
                        : 'Dặn dò chế độ dinh dưỡng, theo dõi triệu chứng, chỉ định dùng thuốc hoặc yêu cầu đến khám trực tiếp tại phòng khám...'
                    }
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition"
                  />
                </div>
              </div>

              {/* Nút hành động cuối trang */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2.5 justify-end items-center">
                {bookedFollowUpMap[activeLich.id] ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Đã hoàn tất đặt lịch khám hộ ({bookedFollowUpMap[activeLich.id].maLichHen || 'Thành công'})</span>
                  </div>
                ) : (
                  <MedButton
                    variant="secondary"
                    size="sm"
                    disabled={isDaHuy}
                    leftIcon={<Calendar className={`h-4 w-4 ${isDaHuy ? 'text-gray-400' : 'text-blue-600'}`} />}
                    onClick={() => !isDaHuy && setShowDatLichModal(true)}
                    title={isDaHuy ? 'Ca khám đã bị hủy - Không thể đặt lịch hộ' : 'Đặt lịch khám trực tiếp hộ BN'}
                  >
                    + Đặt lịch khám trực tiếp hộ BN
                  </MedButton>
                )}

                {activeLich?.trangThai === 'hoan_thanh' ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Đã hoàn tất tư vấn (Đã lưu bệnh án)</span>
                  </div>
                ) : isDaHuy ? (
                  <MedButton
                    variant="secondary"
                    size="sm"
                    disabled
                    leftIcon={<AlertCircle className="h-4 w-4 text-gray-400" />}
                    className="cursor-not-allowed text-gray-400 bg-gray-100 border-gray-200"
                    title="Ca khám đã bị hủy - Không thể gửi kết luận"
                  >
                    Đã khóa tư vấn (Ca hủy)
                  </MedButton>
                ) : (
                  <MedButton
                    variant="primary"
                    size="md"
                    loading={savingAdvise}
                    disabled={savingAdvise}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={handleHoanTatTuVan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
                  >
                    Hoàn tất tư vấn & Lưu bệnh án
                  </MedButton>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Đặt lịch khám trực tiếp hộ bệnh nhân */}
      {showDatLichModal && activeLich && (
        <DatLichHoModal
          benhNhan={activeLich.benhNhan}
          activeLich={activeLich}
          doctorUser={user}
          onClose={() => setShowDatLichModal(false)}
          onSuccess={(newAppt) => {
            setBookedAppointmentMap((prev) => ({
              ...prev,
              [activeLich.id]: newAppt,
            }));
            queryClient.invalidateQueries(['lich-tu-van-online']);
            queryClient.invalidateQueries(['lich-hen-all-booked']);
            queryClient.invalidateQueries(['lich-hen-bac-si']);
          }}
        />
      )}
    </div>
  );
}

/* ──── MODAL ĐẶT LỊCH KHÁM HỘ BỆNH NHÂN KHI TƯ VẤN ONLINE ──── */
function DatLichHoModal({ benhNhan, activeLich, doctorUser, onClose, onSuccess }) {
  const [ngayHen, setNgayHen] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [gioHen, setGioHen] = useState('08:30');
  const [lyDo, setLyDo] = useState('Khám trực tiếp theo chỉ định từ ca tư vấn Telehealth từ xa');
  const [loading, setLoading] = useState(false);

  // Trích xuất chuyên khoa từ ca tư vấn trực tuyến (nếu có)
  const chuyenKhoaMatch = activeLich?.lyDoKham?.match(/\[Chuyên khoa:\s*([^\]]+)\]/i);
  const chuyenKhoa = chuyenKhoaMatch ? chuyenKhoaMatch[1].trim() : 'Nội tổng quát';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiPost('/lich-hen', {
        benhNhanId: benhNhan?.id,
        ngayHen,
        gioHen,
        lyDoKham: lyDo,
        chuyenKhoa,
        hinhThuc: 'truc_tiep',
        ghiChu: `[Bác sĩ đặt lịch trực tiếp từ ca Telehealth ${activeLich?.maLichHen || ''}]`,
      });
      alert(`Đã đặt lịch khám trực tiếp hộ bệnh nhân ${benhNhan?.hoTen || ''} thành công vào ${ngayHen} lúc ${gioHen}!`);
      if (onSuccess) onSuccess(res?.data || res);
      onClose();
    } catch (err) {
      console.error('Lỗi đặt lịch hộ:', err);
      alert(err?.error?.message || err?.message || 'Có lỗi khi tạo lịch hẹn khám cho bệnh nhân.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" /> Đặt Lịch Khám Trực Tiếp Hộ Bệnh Nhân
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Bệnh nhân: <span className="font-semibold text-gray-800">{benhNhan?.hoTen}</span> ({benhNhan?.soDienThoai})</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày đến khám tại phòng khám</label>
            <input
              type="date"
              value={ngayHen}
              onChange={(e) => setNgayHen(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Khung giờ dự kiến</label>
            <select
              value={gioHen}
              onChange={(e) => setGioHen(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="07:30">07:30 - Ca Sáng</option>
              <option value="08:30">08:30 - Ca Sáng</option>
              <option value="09:30">09:30 - Ca Sáng</option>
              <option value="10:30">10:30 - Ca Sáng</option>
              <option value="13:30">13:30 - Ca Chiều</option>
              <option value="14:30">14:30 - Ca Chiều</option>
              <option value="15:30">15:30 - Ca Chiều</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Lý do & Chỉ định khám</label>
            <textarea
              rows={2}
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</MedButton>
            <MedButton type="submit" variant="primary" size="sm" loading={loading}>
              Xác nhận đặt lịch hộ BN
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}
