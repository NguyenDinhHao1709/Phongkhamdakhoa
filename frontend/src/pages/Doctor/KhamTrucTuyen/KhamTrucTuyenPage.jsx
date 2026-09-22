import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../../store/authStore';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { apiGet, apiPost } from '../../../services/api';
import { formatDateTime, formatDate, checkTelehealthAccess } from '../../../utils/formatDate';
import TelehealthVideoModal from '../../../components/Telehealth/TelehealthVideoModal';
import {
  Video, MessageSquare, Send, Calendar, Clock, User,
  FileText, Pill, CheckCircle2, ShieldCheck, AlertCircle, Search, SlidersHorizontal,
  RotateCcw, X, ChevronDown
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
  const [selectedLich, setSelectedLich] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'benh_nhan', text: 'Chào bác sĩ, dạo này tôi hay bị đau đầu về chiều và hoa mắt.', time: '09:00' },
    { sender: 'bac_si', text: 'Chào anh/chị. Triệu chứng này xuất hiện bao lâu rồi? Anh/chị có bị đo huyết áp gần đây không?', time: '09:02' },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [formAdvise, setFormAdvise] = useState({ chanDoan: '', loiKhuyen: '' });
  const [showDatLichModal, setShowDatLichModal] = useState(false);

  // Bộ lọc cho danh sách tư vấn
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'tomorrow', '7days', 'thisWeek', 'custom'
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'can_join', 'da_xac_nhan', 'cho_xac_nhan', 'hoan_thanh', 'da_huy'
  const [shiftFilter, setShiftFilter] = useState('all'); // 'all', 'sang', 'chieu'

  // Lấy danh sách lịch tư vấn online
  const { data, isLoading } = useQuery({
    queryKey: ['lich-tu-van-online', user?.id],
    queryFn: () => apiGet('/lich-hen?loai=online&limit=100'),
    staleTime: 0,
    enabled: !!user?.id,
  });

  const rawItems = Array.isArray(data) ? data : data?.data;
  const items = rawItems || [];

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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: 'bac_si', text: inputMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInputMsg('');
  };

  const activeLich = filteredItems.find((item) => item.id === selectedLich?.id) || filteredItems[0];
  const activeAccess = activeLich
    ? checkTelehealthAccess(activeLich.ngayHen || activeLich.ngayKham, activeLich.gioHen || activeLich.gioKham)
    : { canJoin: true };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-7 w-7 text-primary-600" /> Khám & Tư vấn Trực tuyến (Telehealth)
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-13rem)]">
        {/* Danh sách ca tư vấn */}
        <MedCard className="flex flex-col h-full overflow-hidden p-4">
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
                    {itemAccess.canJoin ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Đang mở phòng
                      </span>
                    ) : item.trangThai === 'da_huy' ? (
                      <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        Đã hủy
                      </span>
                    ) : item.trangThai === 'hoan_thanh' ? (
                      <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        Đã hoàn thành
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
          <div className="lg:col-span-2 flex flex-col h-full space-y-4">
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
                <MedButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<Calendar className="h-4 w-4 text-blue-600" />}
                  onClick={() => setShowDatLichModal(true)}
                >
                  + Đặt lịch khám trực tiếp hộ BN
                </MedButton>

                {activeAccess.canJoin ? (
                  <MedButton
                    variant="primary"
                    size="sm"
                    leftIcon={<Video className="h-4 w-4" />}
                    onClick={() => setShowVideoModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-sm animate-pulse"
                  >
                    Mở Video Call
                  </MedButton>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 hidden sm:inline-block">
                      {activeAccess.isTooEarly
                        ? `⏱️ Mở lúc ${activeAccess.openTimeText} (còn ${activeAccess.timeLeftText})`
                        : `Đã qua giờ hẹn (${activeAccess.startTimeText})`}
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

            {/* Chat & Ghi nhận kết quả */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              {/* Khung chat */}
              <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50 font-semibold text-xs text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-primary-600" /> Tin nhắn tư vấn trực tiếp
                  </span>
                  {activeAccess.canJoin ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Phòng khám đang mở
                    </span>
                  ) : activeAccess.isTooEarly ? (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      Mở trước giờ khám 15p
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      Đã qua giờ khám
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {!activeAccess.canJoin && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-900 space-y-1">
                      {activeAccess.isTooEarly ? (
                        <>
                          <p className="font-bold flex items-center gap-1.5 text-amber-900">
                            <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" /> Chưa đến thời gian mở phòng khám & chat trực tuyến
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Hệ thống chỉ mở phòng khám và kênh chat trực tuyến trước giờ khám <strong>15 phút</strong> (lúc <strong>{activeAccess.openTimeText}</strong>).
                          </p>
                          <p className="text-[11px] font-semibold text-amber-900">
                            ⏳ Thời gian đếm ngược: Còn {activeAccess.timeLeftText} nữa.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold flex items-center gap-1.5 text-gray-700">
                            <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" /> Ca khám trực tuyến đã qua khung giờ hẹn
                          </p>
                          <p className="text-[11px] text-gray-600">
                            Lịch hẹn khám này đã kết thúc khung giờ (lúc {activeAccess.startTimeText}).
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === 'bac_si' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender === 'bac_si'
                            ? 'bg-primary-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">{m.time}</span>
                    </div>
                  ))}
                </div>

                {activeAccess.canJoin ? (
                  <form onSubmit={handleSendMessage} className="p-2 border-t flex gap-2">
                    <input
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder="Nhập tin nhắn tư vấn..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <MedButton type="submit" variant="primary" size="sm">
                      <Send className="h-4 w-4" />
                    </MedButton>
                  </form>
                ) : (
                  <div className="p-2.5 bg-gray-50 border-t text-center text-xs text-gray-500 italic">
                    {activeAccess.isTooEarly
                      ? `🔒 Khung chat sẽ tự động mở lúc ${activeAccess.openTimeText} (trước giờ khám 15 phút)`
                      : `🔒 Khung chat đã đóng do đã qua khung giờ hẹn`}
                  </div>
                )}
              </div>

              {/* Kết luận & Chẩn đoán Telehealth */}
              <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full p-4 space-y-3">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary-600" /> Kết luận tư vấn từ xa
                </h4>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Chẩn đoán sơ bộ</label>
                    <textarea
                      rows={3}
                      value={formAdvise.chanDoan}
                      onChange={(e) => setFormAdvise({ ...formAdvise, chanDoan: e.target.value })}
                      placeholder="Nhập chẩn đoán từ xa..."
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Lời khuyên & Chỉ định</label>
                    <textarea
                      rows={4}
                      value={formAdvise.loiKhuyen}
                      onChange={(e) => setFormAdvise({ ...formAdvise, loiKhuyen: e.target.value })}
                      placeholder="Dặn dò chế độ ăn, tái khám hoặc đi xét nghiệm tại phòng khám..."
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t flex flex-wrap gap-2 justify-end">
                  <MedButton
                    variant="secondary"
                    size="sm"
                    leftIcon={<Calendar className="h-4 w-4 text-blue-600" />}
                    onClick={() => setShowDatLichModal(true)}
                  >
                    + Đặt lịch khám trực tiếp hộ BN
                  </MedButton>
                  <MedButton
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => alert('Đã hoàn thành ca tư vấn trực tuyến!')}
                  >
                    Hoàn tất tư vấn
                  </MedButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Video Call Telehealth */}
      <TelehealthVideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        participantName={activeLich?.benhNhan?.hoTen || 'Bệnh nhân'}
        role="doctor"
        appointmentInfo={activeLich || {}}
      />

      {/* Modal Đặt lịch khám trực tiếp hộ bệnh nhân */}
      {showDatLichModal && activeLich && (
        <DatLichHoModal
          benhNhan={activeLich.benhNhan}
          onClose={() => setShowDatLichModal(false)}
        />
      )}
    </div>
  );
}

/* ──── MODAL ĐẶT LỊCH KHÁM HỘ BỆNH NHÂN KHI TƯ VẤN ONLINE ──── */
function DatLichHoModal({ benhNhan, onClose }) {
  const [ngayKham, setNgayKham] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [gioKham, setGioKham] = useState('08:30');
  const [lyDo, setLyDo] = useState('Khám trực tiếp theo chỉ định từ ca tư vấn Telehealth từ xa');
  const [hinhThuc, setHinhThuc] = useState('truc_tiep');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/lich-hen', {
        benhNhanId: benhNhan?.id || 1,
        ngayKham,
        gioKham,
        lyDoKham: lyDo,
        hinhThucKham: hinhThuc,
      });
      alert(`Đã đặt lịch khám trực tiếp hộ bệnh nhân ${benhNhan?.hoTen || ''} thành công vào ${ngayKham} lúc ${gioKham}!`);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Đã tạo lịch hẹn khám cho bệnh nhân!');
      onClose();
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
              value={ngayKham}
              onChange={(e) => setNgayKham(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Khung giờ dự kiến</label>
            <select
              value={gioKham}
              onChange={(e) => setGioKham(e.target.value)}
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
