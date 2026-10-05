import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScanFace, Calendar, Clock, Plus, Search, Filter, RefreshCw,
  CheckCircle2, AlertTriangle, UserCheck, Edit3, X, Save,
  Users
} from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';

// Tính thời lượng làm việc chính xác (số giờ, số phút; nếu dưới 1 giờ thì hiện đúng số phút làm)
function tinhThoiLuongLamViec(gioVao, gioRa) {
  if (!gioVao) return '—';
  if (!gioRa) return 'Đang làm việc';

  const [h1, m1] = gioVao.split(':').map(Number);
  const [h2, m2] = gioRa.split(':').map(Number);
  let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMinutes < 0) diffMinutes += 24 * 60;

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours > 0) {
    return `${hours} giờ ${mins} phút`;
  }
  return `${mins} phút`;
}

export default function QuanLyChamCongPage() {
  const queryClient = useQueryClient();

  const formatISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatISO(new Date());

  // Bộ lọc thời gian: 'hom_nay' | 'hom_qua' | '7_ngay_qua' | '30_ngay_qua' | 'thang_nay' | 'tuy_chon'
  const [datePreset, setDatePreset] = useState('hom_nay');
  const [tuNgay, setTuNgay] = useState(todayStr);
  const [denNgay, setDenNgay] = useState(todayStr);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal chấm công thủ công
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    nhanVienId: '',
    ngayCham: todayStr,
    gioVao: '07:30',
    gioRa: '17:00',
    trangThai: 'dung_gio',
    ghiChu: '',
  });

  const handleSelectPreset = (presetId) => {
    setDatePreset(presetId);
    const now = new Date();
    if (presetId === 'hom_nay') {
      const s = formatISO(now);
      setTuNgay(s);
      setDenNgay(s);
    } else if (presetId === 'hom_qua') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const s = formatISO(y);
      setTuNgay(s);
      setDenNgay(s);
    } else if (presetId === '7_ngay_qua') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setTuNgay(formatISO(d7));
      setDenNgay(formatISO(now));
    } else if (presetId === '30_ngay_qua') {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 29);
      setTuNgay(formatISO(d30));
      setDenNgay(formatISO(now));
    } else if (presetId === 'thang_nay') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      setTuNgay(formatISO(f));
      setDenNgay(formatISO(now));
    }
  };

  // URL API query
  const queryUrl = useMemo(() => {
    if (tuNgay === denNgay) {
      return `/cham-cong/toan-bo?ngay=${tuNgay}`;
    }
    return `/cham-cong/toan-bo?tuNgay=${tuNgay}&denNgay=${denNgay}`;
  }, [tuNgay, denNgay]);

  // Lấy dữ liệu chấm công theo bộ lọc
  const { data: chamCongData, isLoading, refetch } = useQuery({
    queryKey: ['cham-cong-toan-bo', tuNgay, denNgay],
    queryFn: () => apiGet(queryUrl),
    select: (res) => res?.data?.data || res?.data || [],
  });

  // Lấy danh sách nhân viên
  const { data: nhanVienList } = useQuery({
    queryKey: ['quan-ly-nhan-vien'],
    queryFn: () => apiGet('/quan-ly/nhan-vien'),
    select: (res) => res?.data?.data || res?.data || [],
  });

  // Mutation chấm công thủ công
  const chamCongMutation = useMutation({
    mutationFn: (payload) => apiPost('/cham-cong/cham-cong-thu-cong', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['cham-cong-toan-bo']);
      setModalOpen(false);
    },
  });

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setForm({
      nhanVienId: nhanVienList?.[0]?.id ? String(nhanVienList[0].id) : '',
      ngayCham: denNgay || todayStr,
      gioVao: '07:30',
      gioRa: '17:00',
      trangThai: 'dung_gio',
      ghiChu: 'Giám đốc xác nhận bổ sung',
    });
    setModalOpen(true);
  };

  // Mở modal chỉnh sửa từ hàng
  const handleOpenEditModal = (item) => {
    setForm({
      nhanVienId: String(item.nhanVienId),
      ngayCham: item.ngayCham?.slice(0, 10) || todayStr,
      gioVao: item.gioVao ? item.gioVao.slice(0, 5) : '07:30',
      gioRa: item.gioRa ? item.gioRa.slice(0, 5) : '17:00',
      trangThai: item.trangThai || 'dung_gio',
      ghiChu: item.ghiChu?.replace(/^\[Chấm công thủ công.*?\]\s*(- Lý do:\s*)?/, '') || '',
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.nhanVienId) return;

    chamCongMutation.mutate({
      nhanVienId: parseInt(form.nhanVienId),
      ngayCham: form.ngayCham,
      gioVao: form.gioVao || undefined,
      gioRa: form.gioRa || undefined,
      trangThai: form.trangThai,
      ghiChu: form.ghiChu || undefined,
    });
  };

  // Lọc dữ liệu hiển thị
  const filteredList = useMemo(() => {
    if (!chamCongData) return [];
    return chamCongData.filter((item) => {
      const name = item.nhanVien?.hoTen?.toLowerCase() || '';
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.trangThai === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [chamCongData, searchTerm, statusFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const list = chamCongData || [];
    return {
      tong: list.length,
      dungGio: list.filter(x => x.trangThai === 'dung_gio').length,
      diMuon: list.filter(x => x.trangThai === 'di_muon').length,
      veSom: list.filter(x => x.trangThai === 've_som').length,
      dangLam: list.filter(x => x.gioVao && !x.gioRa).length,
    };
  }, [chamCongData]);

  const trangThaiBadge = {
    dung_gio: { text: 'Đúng giờ', color: 'bg-green-100 text-green-700 border-green-200' },
    di_muon: { text: 'Đi muộn', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    ve_som: { text: 'Về sớm', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    nghi_phep: { text: 'Nghỉ phép', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ScanFace className="h-7 w-7 text-blue-200" />
            <h1 className="text-2xl font-bold">Quản Lý Chấm Công Nhân Viên</h1>
          </div>
          <p className="text-blue-100 text-sm">
            Theo dõi thời lượng làm việc thực tế & Chấm công bổ sung thủ công cho nhân sự phòng khám
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl shadow transition active:scale-95 self-start md:self-auto"
        >
          <Plus className="h-5 w-5" />
          <span>Chấm công thủ công</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tổng lượt chấm</p>
            <p className="text-xl font-bold text-gray-800">{stats.tong}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đúng giờ</p>
            <p className="text-xl font-bold text-green-600">{stats.dungGio}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đi muộn / Về sớm</p>
            <p className="text-xl font-bold text-yellow-600">{stats.diMuon + stats.veSom}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang làm việc</p>
            <p className="text-xl font-bold text-indigo-600">{stats.dangLam}</p>
          </div>
        </div>
      </div>

      {/* Toolbar lọc thời gian & tìm kiếm */}
      <div className="bg-white rounded-xl border p-4 shadow-sm space-y-3">
        {/* Hàng 1: Các nút bấm bộ lọc thời gian tiện ích */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Bộ lọc thời gian:</span>
            {[
              { id: 'hom_nay', label: 'Hôm nay' },
              { id: 'hom_qua', label: 'Hôm qua' },
              { id: '7_ngay_qua', label: '7 ngày qua' },
              { id: '30_ngay_qua', label: '30 ngày qua' },
              { id: 'thang_nay', label: 'Tháng này' },
              { id: 'tuy_chon', label: 'Tùy chọn ngày' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  datePreset === preset.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Hiển thị phạm vi ngày hiện tại */}
          {datePreset === 'tuy_chon' ? (
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-1.5 text-xs">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={tuNgay}
                onChange={(e) => setTuNgay(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-none"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={denNgay}
                onChange={(e) => setDenNgay(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span>
                {tuNgay === denNgay
                  ? new Date(tuNgay).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
                  : `${new Date(tuNgay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} → ${new Date(denNgay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
              </span>
            </div>
          )}
        </div>

        {/* Hàng 2: Tìm kiếm & Lọc trạng thái */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Lọc trạng thái */}
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="dung_gio">Đúng giờ</option>
                <option value="di_muon">Đi muộn</option>
                <option value="ve_som">Về sớm</option>
                <option value="nghi_phep">Nghỉ phép</option>
              </select>
            </div>

            {/* Nút refresh */}
            <button
              onClick={() => refetch()}
              className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition flex-shrink-0"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Ô tìm kiếm theo tên */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm tên nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      {/* Bảng chấm công */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-5 py-3.5">Nhân viên</th>
                <th className="px-5 py-3.5">Ngày</th>
                <th className="px-5 py-3.5">Ca làm việc</th>
                <th className="px-5 py-3.5 text-center">Giờ vào</th>
                <th className="px-5 py-3.5 text-center">Giờ ra</th>
                <th className="px-5 py-3.5 text-center">Thời lượng làm việc</th>
                <th className="px-5 py-3.5 text-center">Trạng thái</th>
                <th className="px-5 py-3.5">Ghi chú</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu chấm công...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Không có bản ghi chấm công nào trong khoảng thời gian đã chọn
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition">
                    {/* Nhân viên */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {item.nhanVien?.hoTen ? item.nhanVien.hoTen.charAt(0) : 'N'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{item.nhanVien?.hoTen || '—'}</p>
                          <p className="text-xs text-gray-400">{item.nhanVien?.chucVu || ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Ngày */}
                    <td className="px-5 py-3.5 text-gray-700 font-medium whitespace-nowrap">
                      {new Date(item.ngayCham).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>

                    {/* Ca làm việc */}
                    <td className="px-5 py-3.5 text-gray-700">
                      {item.caLamViec?.tenCa || 'Theo phân ca'}
                    </td>

                    {/* Giờ vào */}
                    <td className="px-5 py-3.5 text-center font-mono font-medium text-green-600">
                      {item.gioVao ? item.gioVao.slice(0, 5) : '—'}
                    </td>

                    {/* Giờ ra */}
                    <td className="px-5 py-3.5 text-center font-mono font-medium text-blue-600">
                      {item.gioRa ? item.gioRa.slice(0, 5) : '—'}
                    </td>

                    {/* Thời lượng làm việc */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        !item.gioRa && item.gioVao
                          ? 'bg-blue-50 text-blue-700 animate-pulse border border-blue-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {tinhThoiLuongLamViec(item.gioVao, item.gioRa)}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        trangThaiBadge[item.trangThai]?.color || 'bg-gray-100 text-gray-600'
                      }`}>
                        {trangThaiBadge[item.trangThai]?.text || item.trangThai}
                      </span>
                    </td>

                    {/* Ghi chú */}
                    <td className="px-5 py-3.5 text-xs text-gray-500 max-w-xs truncate" title={item.ghiChu || ''}>
                      {item.ghiChu || '—'}
                    </td>

                    {/* Thao tác */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Sửa</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chấm công thủ công */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                <h3 className="font-bold text-lg">Chấm Công Thủ Công</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Chọn nhân viên */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Nhân viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.nhanVienId}
                  onChange={(e) => setForm({ ...form, nhanVienId: e.target.value })}
                  required
                  className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {nhanVienList?.map((nv) => (
                    <option key={nv.id} value={nv.id}>
                      {nv.hoTen} ({nv.chucVu || 'Nhân viên'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày chấm công */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Ngày làm việc <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.ngayCham}
                  onChange={(e) => setForm({ ...form, ngayCham: e.target.value })}
                  required
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Giờ vào & Giờ ra */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Giờ vào (Check-in)
                  </label>
                  <input
                    type="time"
                    value={form.gioVao}
                    onChange={(e) => setForm({ ...form, gioVao: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Giờ ra (Check-out)
                  </label>
                  <input
                    type="time"
                    value={form.gioRa}
                    onChange={(e) => setForm({ ...form, gioRa: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Thời lượng tạm tính */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between text-xs">
                <span className="text-blue-700 font-medium">Thời lượng làm việc tính toán:</span>
                <span className="font-bold text-blue-900 bg-white px-2.5 py-1 rounded shadow-sm border border-blue-200">
                  {tinhThoiLuongLamViec(form.gioVao, form.gioRa)}
                </span>
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Trạng thái
                </label>
                <select
                  value={form.trangThai}
                  onChange={(e) => setForm({ ...form, trangThai: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dung_gio">Đúng giờ</option>
                  <option value="di_muon">Đi muộn</option>
                  <option value="ve_som">Về sớm</option>
                  <option value="nghi_phep">Nghỉ phép</option>
                </select>
              </div>

              {/* Ghi chú / Lý do */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Lý do / Ghi chú của Giám đốc
                </label>
                <textarea
                  rows={2}
                  value={form.ghiChu}
                  onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                  placeholder="VD: Giám đốc bổ sung do máy quét trục trặc..."
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {chamCongMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {chamCongMutation.error?.response?.data?.message || chamCongMutation.error?.message || 'Có lỗi xảy ra'}
                </div>
              )}

              {/* Nút bấm */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={chamCongMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow"
                >
                  {chamCongMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Lưu chấm công</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
