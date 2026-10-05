import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiDel } from '../../services/api';
import {
  Users, Lock, Unlock, Edit, Trash2, KeyRound, Search,
  Plus, RefreshCw, UserCheck, Stethoscope, Briefcase,
  Shield, CheckCircle2, ChevronLeft, ChevronRight,
  Filter, Building2, UserX, Camera
} from 'lucide-react';
import { AddNhanVienModal } from './AddNhanVienModal';
import { EditNhanVienModal } from './EditNhanVienModal';
import { ResetPasswordModal } from './ResetPasswordModal';

export default function NhanVienPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [resettingPwId, setResettingPwId] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKhoa, setSelectedKhoa] = useState('TAT_CA');
  const [selectedRole, setSelectedRole] = useState('TAT_CA');
  const [selectedStatus, setSelectedStatus] = useState('TAT_CA');

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 12;

  const { data: qData = [], isLoading, refetch } = useQuery({
    queryKey: ['nhan-vien-list'],
    queryFn: async () => {
      const res = await apiGet('/quan-ly/nhan-vien');
      return res.data || [];
    },
  });

  // Trích xuất danh sách các chuyên khoa / khoa phòng thực tế từ dữ liệu
  const danhSachKhoa = useMemo(() => {
    const list = new Set();
    qData.forEach(nv => {
      if (nv.chuyenKhoa && nv.chuyenKhoa.trim()) {
        list.add(nv.chuyenKhoa.trim());
      }
    });
    return Array.from(list);
  }, [qData]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = qData.length;
    const bacSiCount = qData.filter(nv => nv.nguoiDung?.vaiTro?.toLowerCase().includes('bác') || nv.chucVu?.toLowerCase().includes('bác')).length;
    const activeCount = qData.filter(nv => nv.nguoiDung?.trangThai === 'hoat_dong').length;
    const staffCount = total - bacSiCount;
    return { total, bacSiCount, staffCount, activeCount };
  }, [qData]);

  // Lọc dữ liệu
  const filteredData = useMemo(() => {
    if (!qData) return [];
    return qData.filter(nv => {
      // 1. Tìm kiếm
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchName = nv.hoTen?.toLowerCase().includes(term);
        const matchPhone = nv.soDienThoai?.toLowerCase().includes(term);
        const matchEmail = nv.email?.toLowerCase().includes(term);
        const matchUser = nv.nguoiDung?.tenDangNhap?.toLowerCase().includes(term);
        const matchDept = nv.chuyenKhoa?.toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchEmail && !matchUser && !matchDept) {
          return false;
        }
      }

      // 2. Lọc theo Khoa
      if (selectedKhoa !== 'TAT_CA') {
        if (nv.chuyenKhoa !== selectedKhoa) return false;
      }

      // 3. Lọc theo Vai trò
      if (selectedRole !== 'TAT_CA') {
        const maVT = nv.nguoiDung?.maVaiTro;
        if (maVT !== selectedRole) return false;
      }

      // 4. Lọc theo Trạng thái
      if (selectedStatus !== 'TAT_CA') {
        const tt = nv.nguoiDung?.trangThai;
        if (selectedStatus === 'hoat_dong' && tt !== 'hoat_dong') return false;
        if (selectedStatus === 'khoa' && tt === 'hoat_dong') return false;
      }

      return true;
    });
  }, [qData, searchTerm, selectedKhoa, selectedRole, selectedStatus]);

  // Phân trang
  const totalPages = Math.ceil(filteredData.length / limit) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredData.slice(start, start + limit);
  }, [filteredData, page, limit]);

  // Reset trang khi đổi bộ lọc
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedKhoa('TAT_CA');
    setSelectedRole('TAT_CA');
    setSelectedStatus('TAT_CA');
    setPage(1);
  };

  const hasActiveFilters = searchTerm.trim() || selectedKhoa !== 'TAT_CA' || selectedRole !== 'TAT_CA' || selectedStatus !== 'TAT_CA';

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      await apiPatch(`/quan-ly/nhan-vien/${id}/trang-thai`, { trangThai: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
    }
  });

  const addNhanVienMutation = useMutation({
    mutationFn: (data) => apiPost('/quan-ly/nhan-vien', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
      setIsAddModalOpen(false);
      alert('Thêm nhân viên thành công!');
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi thêm nhân viên');
    }
  });

  const editNhanVienMutation = useMutation({
    mutationFn: ({ id, data }) => apiPatch(`/quan-ly/nhan-vien/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
      setEditingId(null);
      alert('Cập nhật nhân viên thành công!');
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi cập nhật nhân viên');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ nguoiDungId, matKhauMoi }) => apiPatch(`/quan-ly/nhan-vien/${nguoiDungId}/mat-khau`, { matKhauMoi }),
    onSuccess: () => {
      alert('Đổi mật khẩu thành công!');
      setResettingPwId(null);
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đặt lại mật khẩu');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDel(`/quan-ly/nhan-vien/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xóa nhân viên');
    }
  });

  const handleDelete = (id, ten) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân sự "${ten}" khỏi hệ thống không?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Helper render vai trò
  const renderRoleBadge = (maVaiTro, tenVaiTro) => {
    const map = {
      quan_tri_vien: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      quan_tri_vien_cap_cao: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      ban_giam_doc: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bac_si: 'bg-blue-50 text-blue-700 border-blue-200',
      tiep_tan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      ky_thuat_vien: 'bg-amber-50 text-amber-700 border-amber-200',
      nhan_vien_nha_thuoc: 'bg-teal-50 text-teal-700 border-teal-200',
      thu_ngan: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    const cls = map[maVaiTro] || 'bg-gray-50 text-gray-700 border-gray-200';
    return (
      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${cls}`}>
        {tenVaiTro || maVaiTro || 'Nhân viên'}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ─── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              NHÂN SỰ & TÀI KHOẢN PHÒNG KHÁM
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gray-400" /> {qData.length} nhân sự
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Quản Lý Hồ Sơ Nhân Sự & Tài Khoản
          </h1>
          <p className="text-sm text-gray-500">
            Quản lý danh sách bác sĩ, nhân viên y tế, phân khoa phòng ban và ảnh khuôn mặt AI chấm công.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm nhân sự
          </button>
        </div>
      </div>

      {/* ─── 4 THẺ THỐNG KÊ KPI ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Nhân Sự</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tất cả nhân sự trong hệ thống</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bác Sĩ Khám Bệnh</p>
            <p className="text-2xl font-bold text-blue-600 mt-0.5">{stats.bacSiCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Phân theo các chuyên khoa</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nhân Viên Nghiệp Vụ</p>
            <p className="text-2xl font-bold text-teal-600 mt-0.5">{stats.staffCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tiếp tân, KTV, Dược sĩ, Thu ngân</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Đang Hoạt Động</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.activeCount}</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tài khoản hoạt động bình thường
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── BỘ LỌC TÌM KIẾM & THEO KHOA ────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Ô Tìm kiếm */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên, SĐT, email, tài khoản..."
              value={searchTerm}
              onChange={e => handleFilterChange(setSearchTerm, e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
            />
          </div>

          {/* 2. Bộ lọc theo Khoa / Chuyên khoa */}
          <div className="relative">
            <select
              value={selectedKhoa}
              onChange={e => handleFilterChange(setSelectedKhoa, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">🏥 -- Tất cả Khoa / Chuyên môn --</option>
              {danhSachKhoa.map((k, idx) => (
                <option key={idx} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Bộ lọc theo Vai trò (RBAC) */}
          <div className="relative">
            <select
              value={selectedRole}
              onChange={e => handleFilterChange(setSelectedRole, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">👤 -- Tất cả vai trò --</option>
              <option value="bac_si">🩺 Bác sĩ</option>
              <option value="tiep_tan">💁 Tiếp tân</option>
              <option value="ky_thuat_vien">🔬 Kỹ thuật viên</option>
              <option value="nhan_vien_nha_thuoc">💊 Dược sĩ</option>
              <option value="thu_ngan">💳 Thu ngân</option>
              <option value="ban_giam_doc">🎖️ Ban Giám Đốc</option>
              <option value="quan_tri_vien">🛡️ Quản trị viên (Admin)</option>
            </select>
          </div>

          {/* 4. Bộ lọc theo Trạng thái */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={e => handleFilterChange(setSelectedStatus, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">⚡ -- Tất cả trạng thái --</option>
              <option value="hoat_dong">🟢 Đang hoạt động</option>
              <option value="khoa">🔴 Đã bị khóa</option>
            </select>
          </div>
        </div>

        {/* Thanh trạng thái số lượng lọc */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Tìm thấy <strong className="text-gray-900 font-semibold">{filteredData.length}</strong> nhân sự phù hợp
            {selectedKhoa !== 'TAT_CA' && ` trong khoa "${selectedKhoa}"`}
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ─── BẢNG DANH SÁCH NHÂN SỰ ────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Nhân Sự</th>
                <th className="py-3 px-4">Khoa / Chuyên Khoa</th>
                <th className="py-3 px-4">Tài Khoản</th>
                <th className="py-3 px-4">Vai Trò (RBAC)</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Ảnh AI Chấm Công</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Đang tải danh sách nhân sự...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    Không tìm thấy nhân sự nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedData.map((nv) => {
                  const isLocked = nv.nguoiDung?.trangThai !== 'hoat_dong';
                  const hasAvatar = !!nv.anhDaiDien;

                  return (
                    <tr
                      key={nv.id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Cột 1: Nhân Sự */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {hasAvatar ? (
                              <img
                                src={nv.anhDaiDien.startsWith('http') ? nv.anhDaiDien : `http://localhost:5000${nv.anhDaiDien}`}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200">
                                {nv.hoTen ? nv.hoTen.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {nv.hoTen}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {nv.soDienThoai || nv.email || 'Chưa cập nhật liên hệ'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Khoa / Chuyên Khoa */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 text-xs">
                          {nv.chuyenKhoa || nv.chucVu || 'Đa khoa'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {nv.chucVu || 'Nhân viên'}
                        </div>
                      </td>

                      {/* Cột 3: Tài Khoản */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          {nv.nguoiDung?.tenDangNhap || `nv_${nv.id}`}
                        </span>
                      </td>

                      {/* Cột 4: Vai Trò */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderRoleBadge(nv.nguoiDung?.maVaiTro, nv.nguoiDung?.vaiTro)}
                      </td>

                      {/* Cột 5: Trạng Thái */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-medium border ${
                            !isLocked
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {!isLocked ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>

                      {/* Cột 6: Ảnh AI Chấm Công */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {hasAvatar ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã có ảnh mẫu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Camera className="w-3 h-3 text-amber-600" /> Chưa có ảnh
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Thao Tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sửa thông tin */}
                          <button
                            onClick={() => setEditingId(nv.id)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa thông tin & ảnh khuôn mặt"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Đặt lại mật khẩu */}
                          <button
                            onClick={() => setResettingPwId(nv.nguoiDung?.id)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Đặt lại mật khẩu"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Khóa / Mở tài khoản */}
                          {nv.nguoiDung && (
                            <button
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: nv.nguoiDung.id,
                                  newStatus: !isLocked ? 'khoa' : 'hoat_dong',
                                })
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                !isLocked
                                  ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                  : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={!isLocked ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {!isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Xóa nhân sự */}
                          <button
                            onClick={() => handleDelete(nv.id, nv.hoTen)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa nhân sự"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── PHÂN TRANG ────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Hiển thị từ <strong className="font-semibold text-gray-700">{(page - 1) * limit + 1}</strong> đến{' '}
              <strong className="font-semibold text-gray-700">{Math.min(page * limit, filteredData.length)}</strong> trên{' '}
              <strong className="font-semibold text-gray-700">{filteredData.length}</strong> nhân sự
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ────────────────────────────────────────── */}
      <AddNhanVienModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={(data) => addNhanVienMutation.mutate(data)}
      />

      <EditNhanVienModal
        isOpen={!!editingId}
        nhanVienId={editingId}
        onClose={() => setEditingId(null)}
        onSubmit={(payload) => editNhanVienMutation.mutate(payload)}
      />

      <ResetPasswordModal
        isOpen={!!resettingPwId}
        nguoiDungId={resettingPwId}
        onClose={() => setResettingPwId(null)}
        onSubmit={(payload) => resetPasswordMutation.mutate(payload)}
      />
    </div>
  );
}
