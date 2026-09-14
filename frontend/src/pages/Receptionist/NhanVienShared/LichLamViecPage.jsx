import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { apiGet } from '../../../services/api';
import useAuthStore from '../../../store/authStore';

const DAYS_OF_WEEK = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDateISO(d) {
  return d.toISOString().slice(0, 10);
}

export default function LichLamViecPage() {
  const { user } = useAuthStore();
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));

  const weekStartStr = formatDateISO(currentMonday);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quan-ly-lich-lam-viec', weekStartStr],
    queryFn: () => apiGet(`/quan-ly/lich-lam-viec?weekStart=${weekStartStr}`),
  });

  const payload = data?.data?.data || data?.data || data || {};
  const nvList = payload.nhanVienList || [];
  const phanCaList = payload.lichPhanCa || [];

  // Tìm ID nhân viên hiện tại
  const myNv = useMemo(() => {
    if (!user) return null;
    return (
      nvList.find(
        (n) =>
          n.id === user.nhanVienId ||
          n.id === user.id ||
          (user.hoTen && n.hoTen?.toLowerCase() === user.hoTen?.toLowerCase())
      ) || null
    );
  }, [user, nvList]);

  // Tạo mảng 7 ngày trong tuần
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateISO(d);
      const displayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

      // Tìm ca của nhân viên trong ngày này
      const myShifts = phanCaList.filter(
        (p) =>
          p.ngayLam === dateStr &&
          (myNv ? p.nhanVienId === myNv.id : p.nhanVienTen === user?.hoTen)
      );

      return {
        day: DAYS_OF_WEEK[i],
        date: displayDate,
        dateStr,
        shifts: myShifts,
      };
    });
  }, [currentMonday, phanCaList, myNv, user]);

  const todayStr = formatDateISO(new Date());

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const weekTitle = useMemo(() => {
    const start = weekDays[0]?.date || '';
    const end = weekDays[6]?.date || '';
    return `${start} – ${end}`;
  }, [weekDays]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lịch làm việc ca trực Nhân viên</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tra cứu phân công ca trực, bàn làm việc và lịch phân công hàng tuần của bạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs text-sm font-semibold text-gray-800">
            <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500" title="Tuần trước">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-primary-700">{weekTitle}</span>
            <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500" title="Tuần kế tiếp">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Thông tin nhân viên */}
      {myNv && (
        <div className="bg-primary-50/70 border border-primary-200 rounded-2xl p-4 text-xs sm:text-sm text-primary-900 flex items-center justify-between">
          <div>
            Đang hiển thị lịch trực của: <strong className="text-primary-800 text-base">{myNv.hoTen}</strong> ({myNv.chucVu})
          </div>
          <button
            onClick={() => setCurrentMonday(getMonday(new Date()))}
            className="text-xs font-bold text-primary-700 hover:underline bg-white px-3 py-1.5 rounded-lg border border-primary-200"
          >
            Xem tuần hiện tại
          </button>
        </div>
      )}

      {/* Grid 7 ngày trong tuần */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Đang tải lịch phân ca làm việc...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weekDays.map((item, idx) => {
            const isToday = item.dateStr === todayStr;
            const hasShift = item.shifts.length > 0;

            return (
              <div
                key={idx}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-md'
                    : hasShift
                    ? 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                    : 'bg-gray-50/70 border-gray-200 opacity-70'
                }`}
                data-testid={`day-card-${item.dateStr}`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div>
                      <span className="font-bold text-gray-900 text-base">{item.day}</span>
                      <span className="text-xs text-gray-500 ml-2">({item.date})</span>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white tracking-wider animate-pulse">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  {hasShift ? (
                    <div className="space-y-3">
                      {item.shifts.map((sh) => (
                        <div
                          key={sh.id}
                          className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-1.5"
                        >
                          <p className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                            <Clock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span>{sh.tenCa}</span>
                          </p>
                          {sh.ghiChu && (
                            <p className="flex items-center gap-2 text-xs text-emerald-700">
                              <MapPin className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                              <span>{sh.ghiChu}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-gray-400 font-medium">
                      Không có ca trực phân công
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Trạng thái:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full border ${
                      hasShift
                        ? isToday
                          ? 'bg-primary-50 text-primary-700 border-primary-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}
                  >
                    {hasShift ? (isToday ? '● Đang trong ngày trực' : 'Đã phân ca') : 'Nghỉ'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
