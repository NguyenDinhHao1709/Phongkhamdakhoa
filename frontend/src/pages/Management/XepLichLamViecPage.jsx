import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '../../services/api';
import {
  Calendar as CalendarIcon, Clock, Plus, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, Users, Check, AlertCircle, Sparkles,
  Layers, CheckSquare, Square, X, Info
} from 'lucide-react';

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

// Lấy ngày Thứ 2 đầu tuần của ngày hiện tại
function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDateISO(d) {
  return d.toISOString().slice(0, 10);
}

function formatTimeShort(timeStr) {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

export default function XepLichLamViecPage() {
  const queryClient = useQueryClient();
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form phân ca hỗ trợ chọn NHIỀU CA và NHIỀU NGÀY cùng lúc
  const [form, setForm] = useState({
    nhanVienId: '',
    selectedCaIds: ['1'], // Mảng chứa ID các ca được chọn: ['1', '2', ...]
    selectedDates: [formatDateISO(new Date())], // Mảng chứa các ngày được chọn
    ghiChu: '',
  });

  const weekStartStr = formatDateISO(currentMonday);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['quan-ly-lich-lam-viec', weekStartStr],
    queryFn: () => apiGet(`/quan-ly/lich-lam-viec?weekStart=${weekStartStr}`),
  });

  const payload = data?.data?.data || data?.data || data || {};
  const caList = payload.caLamViecList || [];
  const nvList = payload.nhanVienList || [];
  const phanCaList = payload.lichPhanCa || [];

  // Tạo mảng 7 ngày trong tuần
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateISO(d);
      return {
        name: DAYS_OF_WEEK[i],
        dateStr,
        display: `${d.getDate()}/${d.getMonth() + 1}`,
        fullDate: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
      };
    });
  }, [currentMonday]);

  // Next / Prev week
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

  // Mutation thêm nhiều ca trực cùng lúc
  const saveMutation = useMutation({
    mutationFn: (bodyList) => apiPost('/quan-ly/lich-lam-viec', bodyList),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quan-ly-lich-lam-viec'] });
      setAddModalOpen(false);
      alert(res?.message || 'Đã phân công ca trực thành công!');
    },
    onError: (err) => {
      alert(`⚠️ KHÔNG THỂ PHÂN CA:\n${err?.response?.data?.message || err?.message || 'Có lỗi xung đột lịch làm việc'}`);
    },
  });

  // Mutation xóa ca trực
  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/quan-ly/lich-lam-viec/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quan-ly-lich-lam-viec'] });
    },
    onError: (err) => {
      alert(`Lỗi xóa ca trực: ${err?.response?.data?.message || err?.message}`);
    },
  });

  // Toggle chọn / bỏ chọn ca
  const toggleCa = (caIdStr) => {
    setForm((prev) => {
      const exists = prev.selectedCaIds.includes(caIdStr);
      let next;
      if (exists) {
        next = prev.selectedCaIds.filter((id) => id !== caIdStr);
      } else {
        next = [...prev.selectedCaIds, caIdStr];
      }
      return { ...prev, selectedCaIds: next };
    });
  };

  // Toggle chọn / bỏ chọn ngày
  const toggleDate = (dateStr) => {
    setForm((prev) => {
      const exists = prev.selectedDates.includes(dateStr);
      let next;
      if (exists) {
        next = prev.selectedDates.filter((d) => d !== dateStr);
      } else {
        next = [...prev.selectedDates, dateStr];
      }
      return { ...prev, selectedDates: next };
    });
  };

  // Phím tắt chọn nhanh ngày
  const setQuickDates = (type) => {
    if (type === 'all_week') {
      setForm((prev) => ({ ...prev, selectedDates: weekDays.map((d) => d.dateStr) }));
    } else if (type === 'weekdays') {
      setForm((prev) => ({ ...prev, selectedDates: weekDays.slice(0, 5).map((d) => d.dateStr) }));
    } else if (type === 'weekend') {
      setForm((prev) => ({ ...prev, selectedDates: weekDays.slice(5, 7).map((d) => d.dateStr) }));
    } else if (type === 'clear') {
      setForm((prev) => ({ ...prev, selectedDates: [] }));
    }
  };

  // Phím tắt chọn nhanh ca
  const setQuickCa = (type) => {
    if (type === 'all') {
      setForm((prev) => ({ ...prev, selectedCaIds: caList.map((c) => String(c.id)) }));
    } else if (type === 'sang_chieu') {
      // 2 ca đầu tiên (Sáng + Chiều)
      const firstTwo = caList.slice(0, 2).map((c) => String(c.id));
      setForm((prev) => ({ ...prev, selectedCaIds: firstTwo }));
    } else if (type === 'clear') {
      setForm((prev) => ({ ...prev, selectedCaIds: [] }));
    }
  };

  // Mở modal tạo ca mới tự do
  const handleOpenNewModal = () => {
    setForm({
      nhanVienId: nvList[0]?.id ? String(nvList[0].id) : '',
      selectedCaIds: caList.length > 0 ? [String(caList[0].id)] : ['1'],
      selectedDates: [weekStartStr],
      ghiChu: '',
    });
    setAddModalOpen(true);
  };

  // Mở modal gán ca trực tiếp từ ô của 1 nhân viên trong 1 ngày
  const handleOpenAssignCell = (nvId, dateStr) => {
    setForm({
      nhanVienId: String(nvId),
      selectedCaIds: caList.length > 0 ? [String(caList[0].id)] : ['1'],
      selectedDates: [dateStr],
      ghiChu: '',
    });
    setAddModalOpen(true);
  };

  // Xử lý submit lưu nhiều ca trực
  const handleSaveBatchShifts = (e) => {
    e.preventDefault();

    if (!form.nhanVienId) {
      alert('Vui lòng chọn nhân viên cần phân ca');
      return;
    }
    if (form.selectedCaIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ca làm việc (Sáng / Chiều / Tối)');
      return;
    }
    if (form.selectedDates.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ngày làm việc trong tuần');
      return;
    }

    const nvIdNum = Number(form.nhanVienId);
    const selectedNv = nvList.find((n) => n.id === nvIdNum);
    const nvTen = selectedNv ? selectedNv.hoTen : `Nhân viên #${nvIdNum}`;

    // Tạo danh sách các ca cần thêm: (Số ca chọn) x (Số ngày chọn)
    const newItems = [];
    const skippedDuplicates = [];

    for (const d of form.selectedDates) {
      for (const caIdStr of form.selectedCaIds) {
        const caIdNum = Number(caIdStr);

        // Kiểm tra xem ca này đã được phân trước đó chưa
        const isDuplicate = phanCaList.some(
          (p) =>
            Number(p.nhanVienId) === nvIdNum &&
            Number(p.caLamViecId) === caIdNum &&
            p.ngayLam === d
        );

        if (isDuplicate) {
          skippedDuplicates.push({ date: d, caId: caIdNum });
        } else {
          newItems.push({
            nhanVienId: nvIdNum,
            caLamViecId: caIdNum,
            ngayLam: d,
            ghiChu: form.ghiChu ? form.ghiChu.trim() : undefined,
          });
        }
      }
    }

    if (newItems.length === 0) {
      alert(`⚠️ Tất cả các ca bạn chọn đã tồn tại trên lịch của "${nvTen}". Không có ca mới nào cần thêm.`);
      return;
    }

    saveMutation.mutate(newItems);
  };

  // Tính trước tổng số ca được tạo
  const totalShiftsToCreate = form.selectedCaIds.length * form.selectedDates.length;

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-10">
      {/* ─── HEADER & ĐIỀU HƯỚNG ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 flex-shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
              Xếp Lịch Trực & Phân Ca Làm Việc
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Phân công ca trực (Sáng, Chiều, Tối) hàng loạt cho bác sĩ và nhân viên y tế
            </p>
          </div>
        </div>

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
              Tuần: {weekDays[0].display} – {weekDays[6].display} ({currentMonday.getFullYear()})
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

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Phân ca hàng loạt
          </button>
        </div>
      </div>

      {/* ─── BẢNG PHÂN CA MA TRẬN TUẦN ───────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50/90 text-gray-700 font-bold border-b border-gray-200 text-[11px]">
              <tr>
                <th className="px-3.5 py-2.5 min-w-[200px] sticky left-0 bg-gray-50 border-r border-gray-200 z-10">
                  Nhân Viên / Chức Vụ
                </th>
                {weekDays.map((d, i) => (
                  <th key={i} className="px-2.5 py-2.5 text-center min-w-[130px] border-r border-gray-200">
                    <p className="font-bold text-gray-900">{d.name}</p>
                    <p className="text-[10px] text-gray-500 font-normal">{d.display}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">Đang tải lịch trực...</td>
                </tr>
              ) : nvList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">Chưa có danh sách nhân viên</td>
                </tr>
              ) : (
                nvList.map((nv) => (
                  <tr key={nv.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Cột Nhân viên info */}
                    <td className="px-3.5 py-2.5 sticky left-0 bg-white border-r border-gray-200 font-medium z-10 shadow-2xs">
                      <p className="font-bold text-gray-900 text-xs truncate">{nv.hoTen}</p>
                      <p className="text-[10px] text-gray-500 truncate">{nv.chucVu}</p>
                    </td>

                    {/* 7 ngày */}
                    {weekDays.map((d, i) => {
                      const shifts = phanCaList.filter(
                        (p) => p.nhanVienId === nv.id && p.ngayLam === d.dateStr
                      );
                      return (
                        <td key={i} className="px-1.5 py-1.5 border-r border-gray-100 align-top">
                          <div className="space-y-1">
                            {shifts.map((s) => (
                              <div
                                key={s.id}
                                className="group relative bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-md p-1 text-[11px] text-blue-900 font-bold flex items-center justify-between transition"
                              >
                                <span className="truncate pr-1">{s.tenCa}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Xóa ca "${s.tenCa}" của ${nv.hoTen} vào ngày ${d.display}?`)) {
                                      deleteMutation.mutate(s.id);
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                  title="Xóa ca trực này"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}

                            {/* Nút cộng nhanh ca trực */}
                            <button
                              type="button"
                              onClick={() => handleOpenAssignCell(nv.id, d.dateStr)}
                              className="w-full py-0.5 text-center border border-dashed border-gray-200 hover:border-primary-400 rounded text-[10px] font-medium text-gray-400 hover:text-primary-600 hover:bg-primary-50/50 transition cursor-pointer"
                              title={`Phân ca cho ${nv.hoTen} (${d.name})`}
                            >
                              + Gán ca
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL PHÂN CA TRỰC HÀNG LOẠT (MULTI-SHIFT & MULTI-DAY) ─ */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    Phân Công Ca Trực Hàng Loạt
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Chọn cùng lúc nhiều ca và nhiều ngày để gán nhanh chóng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchShifts} className="space-y-4 text-xs">
              {/* 1. Chọn Nhân viên */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  1. Chọn nhân viên áp dụng: <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.nhanVienId}
                  onChange={(e) => setForm({ ...form, nhanVienId: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2 text-xs bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
                  required
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {nvList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.hoTen} — {n.chucVu}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Chọn Các Ca Làm Việc (Multi-Select Ca) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    2. Chọn các ca làm việc (Có thể chọn nhiều ca): <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setQuickCa('all')}
                      className="text-primary-600 hover:underline font-semibold cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => setQuickCa('sang_chieu')}
                      className="text-primary-600 hover:underline font-semibold cursor-pointer"
                    >
                      Sáng + Chiều
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => setQuickCa('clear')}
                      className="text-gray-500 hover:underline cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {caList.map((c) => {
                    const idStr = String(c.id);
                    const isChecked = form.selectedCaIds.includes(idStr);

                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCa(idStr)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between select-none ${
                          isChecked
                            ? 'bg-primary-50/80 border-primary-500 text-primary-900 ring-1 ring-primary-500/50 shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{c.tenCa}</span>
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-primary-600 flex-shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatTimeShort(c.gioBatDau)} - {formatTimeShort(c.gioKetThuc)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Chọn Các Ngày Trong Tuần (Multi-Select Ngày) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
                    3. Chọn các ngày áp dụng trong tuần: <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setQuickDates('all_week')}
                      className="text-primary-600 hover:underline font-semibold cursor-pointer"
                    >
                      Cả tuần (T2-CN)
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => setQuickDates('weekdays')}
                      className="text-primary-600 hover:underline font-semibold cursor-pointer"
                    >
                      T2 - T6
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => setQuickDates('weekend')}
                      className="text-primary-600 hover:underline font-semibold cursor-pointer"
                    >
                      T7 - CN
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map((d) => {
                    const isChecked = form.selectedDates.includes(d.dateStr);

                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => toggleDate(d.dateStr)}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer select-none ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{d.name}</div>
                        <div className={`text-[10px] ${isChecked ? 'text-blue-100' : 'text-gray-400'}`}>
                          {d.display}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Ghi chú / Vị trí phân công */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  4. Ghi chú / Bàn trực / Phòng khám (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={form.ghiChu}
                  onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                  placeholder="VD: Phòng khám 101, Bàn tiếp đón số 2, Trực xét nghiệm..."
                  className="w-full border border-gray-300 rounded-xl p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Preview tóm tắt */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Tổng số: <strong>{form.selectedCaIds.length} ca</strong> × <strong>{form.selectedDates.length} ngày</strong> ={' '}
                    <strong className="text-emerald-700 text-sm">{totalShiftsToCreate} ca trực</strong> sẽ được phân công.
                  </span>
                </div>
              </div>

              {/* Nút thao tác */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || totalShiftsToCreate === 0}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {saveMutation.isPending ? 'Đang lưu phân ca...' : `Lưu ${totalShiftsToCreate} ca trực`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

