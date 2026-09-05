import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import {
  Calendar as CalendarIcon, Clock, Plus, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, Users, Check, AlertCircle
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

export default function XepLichLamViecPage() {
  const queryClient = useQueryClient();
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    nhanVienId: '',
    caLamViecId: '1',
    ngayLam: formatDateISO(new Date()),
    ghiChu: '',
  });

  const weekStartStr = formatDateISO(currentMonday);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quan-ly-lich-lam-viec', weekStartStr],
    queryFn: () => apiGet(`/quan-ly/lich-lam-viec?weekStart=${weekStartStr}`),
  });

  const caList = data?.data?.caLamViecList || [];
  const nvList = data?.data?.nhanVienList || [];
  const phanCaList = data?.data?.lichPhanCa || [];

  // Tạo mảng 7 ngày trong tuần
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() + i);
      return {
        name: DAYS_OF_WEEK[i],
        dateStr: formatDateISO(d),
        display: `${d.getDate()}/${d.getMonth() + 1}`,
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

  // Mutation thêm ca trực
  const saveMutation = useMutation({
    mutationFn: (body) => apiPost('/quan-ly/lich-lam-viec', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quan-ly-lich-lam-viec'] });
      setAddModalOpen(false);
      setForm({
        nhanVienId: '',
        caLamViecId: '1',
        ngayLam: weekStartStr,
        ghiChu: '',
      });
    },
  });

  // Mutation xóa ca trực
  const deleteMutation = useMutation({
    mutationFn: (id) => apiDelete(`/quan-ly/lich-lam-viec/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quan-ly-lich-lam-viec'] });
    },
  });

  const handleSaveShift = (e) => {
    e.preventDefault();
    if (!form.nhanVienId) {
      alert('Vui lòng chọn nhân viên');
      return;
    }
    saveMutation.mutate([{
      nhanVienId: Number(form.nhanVienId),
      caLamViecId: Number(form.caLamViecId),
      ngayLam: form.ngayLam,
      ghiChu: form.ghiChu,
    }]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Xếp Lịch Trực & Phân Ca</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý và phân bổ ca làm việc (Sáng, Chiều, Tối) cho nhân viên y tế
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" /> Phân ca trực mới
          </button>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <CalendarIcon className="h-4 w-4 text-primary-600" />
            <span>Tuần: {weekDays[0].display} – {weekDays[6].display} ({currentMonday.getFullYear()})</span>
          </div>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => setCurrentMonday(getMonday(new Date()))}
          className="text-xs text-primary-600 font-bold hover:underline"
        >
          Trở về tuần này
        </button>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 min-w-[180px] sticky left-0 bg-gray-50 border-r z-10">Nhân Viên</th>
                {weekDays.map((d, i) => (
                  <th key={i} className="px-3 py-3 text-center min-w-[130px] border-r">
                    <p className="font-bold text-gray-900">{d.name}</p>
                    <p className="text-[11px] text-gray-500 font-normal">{d.display}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Đang tải lịch trực...</td></tr>
              ) : nvList.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Chưa có danh sách nhân viên</td></tr>
              ) : (
                nvList.map((nv) => (
                  <tr key={nv.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Nhân viên info */}
                    <td className="px-4 py-3 sticky left-0 bg-white border-r font-medium z-10">
                      <p className="font-bold text-gray-900">{nv.hoTen}</p>
                      <p className="text-[11px] text-gray-500">{nv.chucVu}</p>
                    </td>

                    {/* 7 ngày */}
                    {weekDays.map((d, i) => {
                      const shifts = phanCaList.filter(
                        (p) => p.nhanVienId === nv.id && p.ngayLam === d.dateStr
                      );
                      return (
                        <td key={i} className="px-2 py-2 border-r align-top">
                          <div className="space-y-1">
                            {shifts.map((s) => (
                              <div
                                key={s.id}
                                className="group relative bg-blue-50 border border-blue-200 rounded-lg p-1.5 text-[11px] text-blue-900 font-semibold flex items-center justify-between"
                              >
                                <span>{s.tenCa}</span>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Xóa ca "${s.tenCa}" của ${nv.hoTen}?`)) {
                                      deleteMutation.mutate(s.id);
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}

                            {/* Nút cộng nhanh ca trực */}
                            <button
                              onClick={() => {
                                setForm({
                                  nhanVienId: String(nv.id),
                                  caLamViecId: '1',
                                  ngayLam: d.dateStr,
                                  ghiChu: '',
                                });
                                setAddModalOpen(true);
                              }}
                              className="w-full py-1 text-center border border-dashed border-gray-200 rounded-lg text-[10px] text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
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

      {/* Modal gán ca trực */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              Phân Ca Trực Cho Nhân Viên
            </h3>

            <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Chọn nhân viên:</label>
                <select
                  value={form.nhanVienId}
                  onChange={e => setForm({ ...form, nhanVienId: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {nvList.map(n => (
                    <option key={n.id} value={n.id}>{n.hoTen} ({n.chucVu})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Chọn ca làm việc:</label>
                <select
                  value={form.caLamViecId}
                  onChange={e => setForm({ ...form, caLamViecId: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-primary-500"
                >
                  {caList.map(c => (
                    <option key={c.id} value={c.id}>{c.tenCa} ({c.gioBatDau} - {c.gioKetThuc})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Ngày làm việc:</label>
                <input
                  type="date"
                  value={form.ngayLam}
                  onChange={e => setForm({ ...form, ngayLam: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Ghi chú (tùy chọn):</label>
                <input
                  type="text"
                  value={form.ghiChu}
                  onChange={e => setForm({ ...form, ghiChu: e.target.value })}
                  placeholder="VD: Trực chính phòng 101..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {saveMutation.isPending ? 'Đang lưu...' : 'Lưu ca trực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

