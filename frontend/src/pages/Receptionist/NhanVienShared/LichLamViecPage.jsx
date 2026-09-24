import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Clock, MapPin, ChevronLeft, ChevronRight,
  RefreshCw, CheckCircle2, User, Users, Briefcase, Sparkles, Moon
} from 'lucide-react';
import { apiGet } from '../../../services/api';
import useAuthStore from '../../../store/authStore';

const DAYS_OF_WEEK = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const SHORT_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDateISO(d) {
  return d.toISOString().slice(0, 10);
}

// Cắt ngắn chuỗi giờ: "07:30:00" -> "07:30"
function formatTimeShort(timeStr) {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

export default function LichLamViecPage() {
  const { user } = useAuthStore();
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [viewScope, setViewScope] = useState('ca_nhan'); // 'ca_nhan' | 'toan_khoa'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const weekStartStr = formatDateISO(currentMonday);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['quan-ly-lich-lam-viec', weekStartStr],
    queryFn: () => apiGet(`/quan-ly/lich-lam-viec?weekStart=${weekStartStr}`),
  });

  const payload = data?.data?.data || data?.data || data || {};
  const nvList = payload.nhanVienList || [];
  const phanCaList = payload.lichPhanCa || [];

  // Mapping tên vai trò chuẩn tiếng Việt cho fallback
  const getRoleTitle = (vaiTro) => {
    switch (vaiTro) {
      case 'tiep_tan':
        return 'Tiếp tân / Lễ tân';
      case 'bac_si':
        return 'Bác sĩ';
      case 'ky_thuat_vien':
        return 'Kỹ thuật viên xét nghiệm';
      case 'nhan_vien_nha_thuoc':
      case 'nha_thuoc':
        return 'Dược sĩ / Nhân viên nhà thuốc';
      case 'thu_ngan':
        return 'Thu ngân';
      case 'dieu_duong':
        return 'Điều dưỡng';
      case 'ban_giam_doc':
        return 'Ban Giám Đốc';
      case 'quan_tri_vien':
      case 'quan_tri_vien_cap_cao':
        return 'Quản trị viên';
      default:
        return 'Nhân viên y tế';
    }
  };

  // Tìm ID nhân viên hiện tại chuẩn xác
  const myNv = useMemo(() => {
    if (!user) return null;

    // 1. Ưu tiên khớp theo nguoiDungId
    if (user.id) {
      const byUserId = nvList.find((n) => n.nguoiDungId === user.id);
      if (byUserId) return byUserId;
    }

    // 2. Khớp theo nhanVienId nếu có trong user token
    if (user.nhanVienId) {
      const byNvId = nvList.find((n) => n.id === user.nhanVienId);
      if (byNvId) return byNvId;
    }

    // 3. Khớp theo họ tên chính xác + cùng vai trò (để tránh trùng tên khác bộ phận)
    if (user.hoTen && user.hoTen.trim() !== '') {
      const byNameAndRole = nvList.find(
        (n) =>
          n.hoTen?.trim().toLowerCase() === user.hoTen.trim().toLowerCase() &&
          (!user.vaiTro || n.maVaiTro === user.vaiTro || (n.chucVu && n.chucVu.toLowerCase().includes(user.vaiTro)))
      );
      if (byNameAndRole) return byNameAndRole;

      const byNameOnly = nvList.find(
        (n) => n.hoTen?.trim().toLowerCase() === user.hoTen.trim().toLowerCase()
      );
      if (byNameOnly) return byNameOnly;
    }

    // 4. Khớp theo vai trò nếu chỉ có 1 nhân viên thuộc vai trò đó
    if (user.vaiTro) {
      const byRoleList = nvList.filter(
        (n) => n.maVaiTro === user.vaiTro || (n.chucVu && n.chucVu.toLowerCase().includes(user.vaiTro))
      );
      if (byRoleList.length === 1) return byRoleList[0];
    }

    return null;
  }, [user, nvList]);

  // Tạo mảng 7 ngày trong tuần
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateISO(d);
      const displayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const fullDisplayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

      // Ca của nhân viên hiện tại trong ngày
      const myShifts = phanCaList.filter(
        (p) =>
          p.ngayLam === dateStr &&
          (myNv ? p.nhanVienId === myNv.id : p.nhanVienTen === user?.hoTen)
      );

      // Tất cả ca trực trong ngày (nếu xem toàn khoa)
      const allShifts = phanCaList.filter((p) => p.ngayLam === dateStr);

      return {
        day: DAYS_OF_WEEK[i],
        shortDay: SHORT_DAYS[i],
        date: displayDate,
        fullDate: fullDisplayDate,
        dateStr,
        myShifts,
        allShifts,
      };
    });
  }, [currentMonday, phanCaList, myNv, user]);

  const todayStr = formatDateISO(new Date());

  // Thống kê nhanh ca trực của cá nhân trong tuần
  const myWeekStats = useMemo(() => {
    let totalShifts = 0;
    let todayShifts = [];

    weekDays.forEach((wd) => {
      totalShifts += wd.myShifts.length;
      if (wd.dateStr === todayStr) {
        todayShifts = wd.myShifts;
      }
    });

    return {
      totalShifts,
      hasShiftToday: todayShifts.length > 0,
      todayShifts,
    };
  }, [weekDays, todayStr]);

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

  const isCurrentWeek = useMemo(() => {
    const nowMon = getMonday(new Date());
    return formatDateISO(nowMon) === weekStartStr;
  }, [weekStartStr]);

  const weekTitle = useMemo(() => {
    const start = weekDays[0]?.fullDate || '';
    const end = weekDays[6]?.fullDate || '';
    return `${start} – ${end}`;
  }, [weekDays]);

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-6">
      {/* ─── HEADER & ĐIỀU HƯỚNG TUẦN GỌN GÀNG ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 flex-shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
              Lịch Làm Việc & Phân Ca Trực
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Tra cứu ca trực cá nhân và sơ đồ phân ca làm việc hàng tuần
            </p>
          </div>
        </div>

        {/* Thanh điều hướng tuần */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => refetch()}
            className={`p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer ${
              isFetching ? 'animate-spin text-primary-600' : ''
            }`}
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-800">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-bold text-primary-700 px-2 select-none">
              {weekTitle}
            </span>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer"
              title="Tuần kế tiếp"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => setCurrentMonday(getMonday(new Date()))}
              className="px-2.5 py-1 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Tuần này
            </button>
          )}
        </div>
      </div>

      {/* ─── BANNER HỒ SƠ NHÂN VIÊN & THỐNG KÊ CA TRỰC TUẦN ──── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card thông tin nhân viên */}
        <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm border border-primary-200 flex-shrink-0">
              {(myNv?.hoTen || user?.hoTen || user?.tenDangNhap || 'NV').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-gray-900 truncate">
                {myNv?.hoTen || user?.hoTen || user?.tenDangNhap || 'Nhân viên y tế'}
              </h3>
              <p className="text-[11px] text-primary-700 font-medium flex items-center gap-1 mt-0.5">
                <Briefcase className="h-3 w-3 text-primary-500" />
                {myNv?.chucVu || user?.tenVaiTro || getRoleTitle(user?.vaiTro)}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Hoạt động
          </span>
        </div>

        {/* Card tổng ca trực trong tuần */}
        <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 flex-shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500">Ca trực tuần này</p>
            <p className="text-sm font-bold text-gray-900">
              <strong className="text-primary-700 text-base">{myWeekStats.totalShifts}</strong> ca phân công
            </p>
          </div>
        </div>

        {/* Card tình trạng ca trực hôm nay */}
        <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-2xs flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm border flex-shrink-0 ${
            myWeekStats.hasShiftToday
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">Ca trực hôm nay ({new Date().getDate()}/{new Date().getMonth() + 1})</p>
            {myWeekStats.hasShiftToday ? (
              <p className="text-xs font-bold text-emerald-700 truncate">
                {myWeekStats.todayShifts.map((s) => s.tenCa).join(', ')}
              </p>
            ) : (
              <p className="text-xs font-medium text-gray-500">Hôm nay không có ca (Nghỉ)</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── THANH CÔNG CỤ: CHUYỂN TAB & CHẾ ĐỘ XEM ────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
        {/* Toggle phạm vi: Cá nhân vs Toàn bộ đồng nghiệp */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 self-start">
          <button
            type="button"
            onClick={() => setViewScope('ca_nhan')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'ca_nhan'
                ? 'bg-white text-primary-700 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Lịch của tôi
          </button>
          <button
            type="button"
            onClick={() => setViewScope('toan_khoa')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewScope === 'toan_khoa'
                ? 'bg-white text-primary-700 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Lịch toàn bộ nhân viên ({nvList.length})
          </button>
        </div>

        {/* Toggle Grid vs Table (nếu xem cá nhân) */}
        {viewScope === 'ca_nhan' && (
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 self-end">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-700 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Xem dạng tuần 7 ngày"
            >
              Lưới 7 ngày
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-primary-700 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Xem dạng bảng danh sách"
            >
              Danh sách
            </button>
          </div>
        )}
      </div>

      {/* ─── NỘI DUNG HIỂN THỊ LỊCH LÀM VIỆC ──────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-xs text-gray-400">
          Đang tải thông tin phân ca làm việc...
        </div>
      ) : viewScope === 'ca_nhan' ? (
        viewMode === 'grid' ? (
          /* ── DẠNG LƯỚI 7 NGÀY CÂN XỨNG (7 COLUMNS ON DESKTOP) ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {weekDays.map((item, idx) => {
              const isToday = item.dateStr === todayStr;
              const hasShift = item.myShifts.length > 0;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 flex flex-col justify-between transition-all min-h-[190px] ${
                    isToday
                      ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-300/60 shadow-xs'
                      : hasShift
                      ? 'bg-white border-gray-200 shadow-2xs hover:border-primary-300'
                      : 'bg-gray-50/50 border-gray-200/80 opacity-75'
                  }`}
                  data-testid={`day-card-${item.dateStr}`}
                >
                  <div className="space-y-2.5">
                    {/* Header ngày */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <div className="font-bold text-gray-900 text-xs flex items-center gap-1">
                          {item.day}
                        </div>
                        <div className="text-[11px] text-gray-400 font-medium">
                          {item.date}
                        </div>
                      </div>
                      {isToday && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white tracking-wide">
                          Hôm nay
                        </span>
                      )}
                    </div>

                    {/* Danh sách ca trực trong ngày */}
                    {hasShift ? (
                      <div className="space-y-2">
                        {item.myShifts.map((sh) => (
                          <div
                            key={sh.id}
                            className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-emerald-600" /> {sh.tenCa}
                              </span>
                            </div>

                            {(sh.gioBatDau || sh.gioKetThuc) && (
                              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 text-emerald-600" />
                                {formatTimeShort(sh.gioBatDau)} - {formatTimeShort(sh.gioKetThuc)}
                              </p>
                            )}

                            {sh.ghiChu && (
                              <p className="text-[10px] text-emerald-800 bg-white/60 px-1.5 py-0.5 rounded flex items-center gap-1 truncate" title={sh.ghiChu}>
                                <MapPin className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />
                                <span>{sh.ghiChu}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-1">
                        <Moon className="mx-auto h-5 w-5 text-gray-300" />
                        <p className="text-[11px] text-gray-400 font-medium">Nghỉ ca</p>
                      </div>
                    )}
                  </div>

                  {/* Footer card trạng thái */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Trạng thái</span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded ${
                        hasShift
                          ? isToday
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {hasShift ? (isToday ? 'Đang trực' : 'Có ca') : 'Nghỉ'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── DẠNG BẢNG DANH SÁCH CHI TIẾT (LIST VIEW) ───────────── */
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Thứ / Ngày</th>
                  <th className="py-2.5 px-3 font-semibold">Ca phân công</th>
                  <th className="py-2.5 px-3 font-semibold">Thời gian trực</th>
                  <th className="py-2.5 px-3 font-semibold">Vị trí / Bàn làm việc</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {weekDays.map((item, idx) => {
                  const isToday = item.dateStr === todayStr;
                  const hasShift = item.myShifts.length > 0;

                  if (!hasShift) {
                    return (
                      <tr key={idx} className={`hover:bg-gray-50/50 ${isToday ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                          {item.day} <span className="text-gray-400 font-normal">({item.fullDate})</span>
                          {isToday && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-extrabold">Hôm nay</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 italic">Không có ca trực</td>
                        <td className="py-2.5 px-3 text-gray-400">---</td>
                        <td className="py-2.5 px-3 text-gray-400">---</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">Nghỉ</span>
                        </td>
                      </tr>
                    );
                  }

                  return item.myShifts.map((sh, sIdx) => (
                    <tr key={`${idx}-${sIdx}`} className={`hover:bg-gray-50/70 ${isToday ? 'bg-blue-50/40' : ''}`}>
                      <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                        {item.day} <span className="text-gray-500 font-medium">({item.fullDate})</span>
                        {isToday && (
                          <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-extrabold">Hôm nay</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {sh.tenCa}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800 whitespace-nowrap">
                        {sh.gioBatDau && sh.gioKetThuc ? `${formatTimeShort(sh.gioBatDau)} - ${formatTimeShort(sh.gioKetThuc)}` : 'Theo ca'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">
                        {sh.ghiChu ? (
                          <span className="flex items-center gap-1 text-gray-800">
                            <MapPin className="h-3 w-3 text-emerald-600" /> {sh.ghiChu}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Theo phân công khoa</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          {isToday ? 'Đang trong ca' : 'Đã phân ca'}
                        </span>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ── DẠNG MA TRẬN TOÀN KHOA / TOÀN BỘ NHÂN VIÊN ─────────── */
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary-600" /> Sơ đồ phân ca trực tuần ({weekTitle})
            </span>
            <span className="text-[11px] text-gray-500">
              Tổng số <strong>{nvList.length}</strong> nhân sự
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-gray-700 text-[11px] border-b border-gray-200">
                  <th className="py-2 px-3 font-bold w-48 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                    Nhân viên / Chức vụ
                  </th>
                  {weekDays.map((wd, i) => {
                    const isToday = wd.dateStr === todayStr;
                    return (
                      <th
                        key={i}
                        className={`py-2 px-2 text-center font-bold min-w-[110px] ${
                          isToday ? 'bg-blue-100/80 text-blue-900 border-x border-blue-300' : ''
                        }`}
                      >
                        <div>{wd.day}</div>
                        <div className="text-[10px] font-normal text-gray-500">{wd.date}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {nvList.map((nv) => {
                  const isMe = myNv?.id === nv.id;
                  return (
                    <tr
                      key={nv.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isMe ? 'bg-primary-50/40 font-semibold' : ''
                      }`}
                    >
                      {/* Cột tên nhân viên */}
                      <td className="py-2 px-3 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-xs">
                        <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                          {nv.hoTen}
                          {isMe && (
                            <span className="text-[9px] bg-primary-600 text-white px-1 py-0.2 rounded font-bold">
                              Tôi
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {nv.chucVu}
                        </div>
                      </td>

                      {/* 7 cột ngày */}
                      {weekDays.map((wd, wIdx) => {
                        const isToday = wd.dateStr === todayStr;
                        const staffShifts = phanCaList.filter(
                          (p) => p.ngayLam === wd.dateStr && p.nhanVienId === nv.id
                        );

                        return (
                          <td
                            key={wIdx}
                            className={`py-1.5 px-1.5 text-center align-middle ${
                              isToday ? 'bg-blue-50/30 border-x border-blue-200' : ''
                            }`}
                          >
                            {staffShifts.length > 0 ? (
                              <div className="space-y-1">
                                {staffShifts.map((s) => (
                                  <div
                                    key={s.id}
                                    className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-1.5 py-0.5 text-[10px] font-bold truncate"
                                    title={`${s.tenCa} ${s.ghiChu ? `(${s.ghiChu})` : ''}`}
                                  >
                                    {s.tenCa}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
