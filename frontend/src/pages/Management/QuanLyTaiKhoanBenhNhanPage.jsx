import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDel } from '../../services/api';
import {
  Users, UserCheck, Lock, Unlock, Edit3, Trash2, KeyRound,
  Search, Plus, RefreshCw, CheckCircle2, ChevronLeft, ChevronRight,
  Filter, Building2, UserX, Shield, HeartPulse, UserPlus,
  Phone, Mail, Calendar, ShieldCheck, X, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { formatDate, tinhTuoi } from '../../utils/formatDate';

export default function QuanLyTaiKhoanBenhNhanPage() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TAT_CA');
  const [selectedCoTaiKhoan, setSelectedCoTaiKhoan] = useState('TAT_CA');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [resettingPwUser, setResettingPwUser] = useState(null);
  const [grantingAccountPatient, setGrantingAccountPatient] = useState(null);

  // Debounce search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
  };

  // Fetch patient accounts
  const { data: qData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-patient-accounts', page, searchTerm, selectedStatus, selectedCoTaiKhoan],
    queryFn: async () => {
      const res = await apiGet('/quan-ly/tai-khoan-benh-nhan', {
        page,
        limit,
        search: searchTerm.trim() || undefined,
        trangThai: selectedStatus !== 'TAT_CA' ? selectedStatus : undefined,
        coTaiKhoan: selectedCoTaiKhoan !== 'TAT_CA' ? selectedCoTaiKhoan : undefined,
      });
      return res || {};
    },
    keepPreviousData: true,
  });

  const patients = Array.isArray(qData?.data) ? qData.data : (Array.isArray(qData) ? qData : []);
  const stats = qData?.stats || { total: 0, withAccount: 0, active: 0, locked: 0 };
  const pagination = qData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ nguoiDungId, newStatus }) => {
      await apiPatch(`/quan-ly/tai-khoan-benh-nhan/${nguoiDungId}/trang-thai`, { trangThai: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-patient-accounts'] });
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi khi cập nhật trạng thái');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ nguoiDungId, matKhauMoi }) =>
      apiPatch(`/quan-ly/tai-khoan-benh-nhan/${nguoiDungId}/mat-khau`, { matKhauMoi }),
    onSuccess: () => {
      alert('Đổi mật khẩu tài khoản bệnh nhân thành công!');
      setResettingPwUser(null);
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đặt lại mật khẩu');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDel(`/quan-ly/tai-khoan-benh-nhan/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-patient-accounts'] });
      alert('Xóa bệnh nhân thành công!');
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi xóa bệnh nhân');
    }
  });

  const handleToggleLock = (patient) => {
    if (!patient.nguoiDung) {
      alert('Bệnh nhân này chưa có tài khoản đăng nhập trực tuyến.');
      return;
    }
    const isCurrentlyActive = patient.nguoiDung.trangThai === 'hoat_dong';
    const actionText = isCurrentlyActive ? 'KHÓA' : 'MỞ KHÓA';
    const newStatus = isCurrentlyActive ? 'khoa' : 'hoat_dong';

    if (window.confirm(`Bạn có chắc muốn ${actionText} tài khoản "${patient.nguoiDung.tenDangNhap}" của bệnh nhân ${patient.hoTen}?`)) {
      toggleStatusMutation.mutate({ nguoiDungId: patient.nguoiDung.id, newStatus });
    }
  };

  const handleDelete = (patient) => {
    if (window.confirm(`XÁC NHẬN XÓA: Bạn có chắc chắn muốn xóa hồ sơ và tài khoản của bệnh nhân "${patient.hoTen}" (${patient.maBenhNhan}) khỏi hệ thống?`)) {
      deleteMutation.mutate(patient.id);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('TAT_CA');
    setSelectedCoTaiKhoan('TAT_CA');
    setPage(1);
  };

  const hasActiveFilters = searchTerm.trim() || selectedStatus !== 'TAT_CA' || selectedCoTaiKhoan !== 'TAT_CA';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              TÀI KHOẢN & HỒ SƠ BỆNH NHÂN
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-gray-400" /> {stats.total} bệnh nhân
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Quản Lý Tài Khoản Bệnh Nhân
          </h1>
          <p className="text-sm text-gray-500">
            Quản trị tài khoản đăng nhập trực tuyến, hồ sơ định danh, trạng thái kích hoạt/khóa và đặt lại mật khẩu cho bệnh nhân.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm bệnh nhân mới</span>
          </button>
        </div>
      </div>

      {/* ─── STAT CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng bệnh nhân</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Tất cả hồ sơ trong hệ thống</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Có tài khoản online</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{stats.withAccount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Đã đăng ký tài khoản cổng BN</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đang hoạt động</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Tài khoản truy cập bình thường</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đã bị khóa</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats.locked}</p>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">Tạm khóa quyền đăng nhập</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── FILTERS BAR ───────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tìm kiếm */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm tên, SĐT, email, CCCD, mã BN, tài khoản..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái tài khoản */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700 cursor-pointer"
            >
              <option value="TAT_CA">-- Tất cả trạng thái tài khoản --</option>
              <option value="hoat_dong">Đang hoạt động</option>
              <option value="khoa">Đã bị khóa</option>
              <option value="chua_co_tai_khoan">Chưa tạo tài khoản online</option>
            </select>
          </div>

          {/* Lọc Có tài khoản online */}
          <div>
            <select
              value={selectedCoTaiKhoan}
              onChange={(e) => { setSelectedCoTaiKhoan(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700 cursor-pointer"
            >
              <option value="TAT_CA">-- Trạng thái cấp tài khoản --</option>
              <option value="co">Đã có tài khoản đăng nhập</option>
              <option value="chua">Chưa cấp tài khoản đăng nhập</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              Đang áp dụng bộ lọc tùy chỉnh. Tìm thấy <strong>{pagination.total}</strong> kết quả.
            </span>
            <button
              onClick={handleClearFilters}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* ─── DATA TABLE ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-4">Bệnh nhân</th>
                <th className="py-3 px-4">Liên hệ & Định danh</th>
                <th className="py-3 px-4">Tài khoản trực tuyến</th>
                <th className="py-3 px-4">Thẻ BHYT</th>
                <th className="py-3 px-4 text-center">Trạng thái TK</th>
                <th className="py-3 px-4 text-right">Thao tác quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang nạp danh sách tài khoản bệnh nhân...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Không tìm thấy bệnh nhân nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                patients.map((bn) => {
                  const hasUser = !!bn.nguoiDung;
                  const isLocked = bn.nguoiDung?.trangThai === 'khoa';
                  const isActive = bn.nguoiDung?.trangThai === 'hoat_dong';

                  return (
                    <tr key={bn.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Bệnh nhân */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs text-xs">
                            {bn.hoTen ? bn.hoTen.charAt(0).toUpperCase() : 'B'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{bn.hoTen}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-gray-500 text-[11px]">
                              <span className="font-mono text-blue-600 font-semibold">{bn.maBenhNhan}</span>
                              <span>·</span>
                              <span>{bn.gioiTinh === 'nam' ? 'Nam' : bn.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}</span>
                              {bn.ngaySinh && (
                                <>
                                  <span>·</span>
                                  <span>{tinhTuoi(bn.ngaySinh)} tuổi ({formatDate(bn.ngaySinh)})</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Liên hệ & Định danh */}
                      <td className="py-3.5 px-4 text-gray-700">
                        <div className="space-y-1">
                          {bn.soDienThoai && (
                            <p className="flex items-center gap-1.5 font-medium">
                              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{bn.soDienThoai}</span>
                            </p>
                          )}
                          {bn.email && (
                            <p className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate max-w-[170px]">{bn.email}</span>
                            </p>
                          )}
                          {bn.soCmnd && (
                            <p className="text-[11px] text-gray-500">
                              CCCD: <span className="font-mono font-medium text-gray-700">{bn.soCmnd}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Tài khoản trực tuyến */}
                      <td className="py-3.5 px-4">
                        {hasUser ? (
                          <div>
                            <p className="font-mono font-bold text-gray-900">{bn.nguoiDung.tenDangNhap}</p>
                            <p className="text-[10.5px] text-gray-400 mt-0.5">
                              Tạo lúc: {bn.nguoiDung.taoLuc ? formatDate(bn.nguoiDung.taoLuc) : '---'}
                            </p>
                            {bn.nguoiDung.lanDangNhapCuoi && (
                              <p className="text-[10px] text-blue-600">
                                Đăng nhập cuối: {formatDate(bn.nguoiDung.lanDangNhapCuoi)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 italic text-xs">Chưa có tài khoản</span>
                            <button
                              onClick={() => setGrantingAccountPatient(bn)}
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Cấp tài khoản đăng nhập trực tuyến cho bệnh nhân này"
                            >
                              <UserPlus className="w-3 h-3" /> Cấp TK
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Thẻ BHYT */}
                      <td className="py-3.5 px-4">
                        {bn.soBhyt ? (
                          <div>
                            <span className="font-mono font-bold text-gray-800 text-[11px]">{bn.soBhyt}</span>
                            <span className="block mt-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full w-max">
                              Đã cập nhật BHYT
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Trạng thái tài khoản */}
                      <td className="py-3.5 px-4 text-center">
                        {hasUser ? (
                          isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3" /> Đã khóa
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            Chưa tạo TK
                          </span>
                        )}
                      </td>

                      {/* Thao tác quản trị */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sửa thông tin */}
                          <button
                            onClick={() => setEditingPatient(bn)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Sửa hồ sơ bệnh nhân"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Đặt lại mật khẩu (chỉ khi có tài khoản) */}
                          {hasUser && (
                            <button
                              onClick={() => setResettingPwUser(bn.nguoiDung)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Đặt lại mật khẩu tài khoản"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}

                          {/* Khóa / Mở khóa tài khoản (chỉ khi có tài khoản) */}
                          {hasUser && (
                            <button
                              onClick={() => handleToggleLock(bn)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLocked
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            >
                              {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Xóa bệnh nhân */}
                          <button
                            onClick={() => handleDelete(bn)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa bệnh nhân"
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

        {/* Phân trang */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Trang <strong>{pagination.page}</strong> / <strong>{pagination.totalPages}</strong> (Tổng <strong>{pagination.total}</strong> bệnh nhân)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Trước
              </button>
              <span className="px-2 py-1 font-bold text-blue-600">{page}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL THÊM TÀI KHOẢN BỆNH NHÂN MỚI ──────────────────────── */}
      {isAddModalOpen && (
        <ThemTaiKhoanBenhNhanModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-patient-accounts'] });
          }}
        />
      )}

      {/* ─── MODAL SỬA HỒ SƠ BỆNH NHÂN ─────────────────────────────── */}
      {editingPatient && (
        <SuaHoSoBenhNhanModal
          patient={editingPatient}
          isOpen={!!editingPatient}
          onClose={() => setEditingPatient(null)}
          onSuccess={() => {
            setEditingPatient(null);
            queryClient.invalidateQueries({ queryKey: ['admin-patient-accounts'] });
          }}
        />
      )}

      {/* ─── MODAL ĐẶT LẠI MẬT KHẨU ─────────────────────────────────── */}
      {resettingPwUser && (
        <DatLaiMatKhauBenhNhanModal
          user={resettingPwUser}
          isOpen={!!resettingPwUser}
          onClose={() => setResettingPwUser(null)}
          onSubmit={(matKhauMoi) => {
            resetPasswordMutation.mutate({ nguoiDungId: resettingPwUser.id, matKhauMoi });
          }}
          isLoading={resetPasswordMutation.isPending}
        />
      )}

      {/* ─── MODAL CẤP TÀI KHOẢN TRỰC TUYẾN ─────────────────────────── */}
      {grantingAccountPatient && (
        <CapTaiKhoanModal
          patient={grantingAccountPatient}
          isOpen={!!grantingAccountPatient}
          onClose={() => setGrantingAccountPatient(null)}
          onSuccess={() => {
            setGrantingAccountPatient(null);
            queryClient.invalidateQueries({ queryKey: ['admin-patient-accounts'] });
          }}
        />
      )}
    </div>
  );
}

// ─── MODAL: THÊM TÀI KHOẢN BỆNH NHÂN MỚI ──────────────────────────
function ThemTaiKhoanBenhNhanModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    hoTen: '',
    soDienThoai: '',
    email: '',
    tenDangNhap: '',
    matKhau: '123456',
    ngaySinh: '',
    gioiTinh: 'nam',
    soCmnd: '',
    soBhyt: '',
    diaChi: '',
    nhomMau: '',
    diUng: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hoTen.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên bệnh nhân');
      return;
    }
    if (!formData.soDienThoai && !formData.email && !formData.tenDangNhap) {
      setErrorMsg('Vui lòng nhập ít nhất Email hoặc Số điện thoại để làm tên đăng nhập');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await apiPost('/quan-ly/tai-khoan-benh-nhan', formData);
      alert('Tạo hồ sơ và tài khoản bệnh nhân thành công!');
      onSuccess();
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-8 animate-fade-in">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Thêm Tài Khoản Bệnh Nhân Mới</h2>
            <p className="text-xs text-gray-500">Tạo hồ sơ bệnh nhân kèm tài khoản đăng nhập trực tuyến</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Họ và tên bệnh nhân <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.hoTen}
                onChange={e => setFormData({ ...formData, hoTen: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={formData.soDienThoai}
                onChange={e => setFormData({ ...formData, soDienThoai: e.target.value })}
                placeholder="0912345678"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="benhnhan@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tên đăng nhập (để trống sẽ lấy Email/SĐT)</label>
              <input
                type="text"
                value={formData.tenDangNhap}
                onChange={e => setFormData({ ...formData, tenDangNhap: e.target.value })}
                placeholder="Tùy chọn username"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mật khẩu khởi tạo <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.matKhau}
                onChange={e => setFormData({ ...formData, matKhau: e.target.value })}
                placeholder="Mặc định: 123456"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={formData.ngaySinh}
                onChange={e => setFormData({ ...formData, ngaySinh: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Giới tính</label>
              <select
                value={formData.gioiTinh}
                onChange={e => setFormData({ ...formData, gioiTinh: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
                <option value="khac">Khác</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Số CCCD / CMND</label>
              <input
                type="text"
                value={formData.soCmnd}
                onChange={e => setFormData({ ...formData, soCmnd: e.target.value })}
                placeholder="12 chữ số"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mã số thẻ BHYT</label>
              <input
                type="text"
                value={formData.soBhyt}
                onChange={e => setFormData({ ...formData, soBhyt: e.target.value.toUpperCase() })}
                placeholder="Ví dụ: GD479..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Địa chỉ thường trú</label>
              <input
                type="text"
                value={formData.diaChi}
                onChange={e => setFormData({ ...formData, diaChi: e.target.value })}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo tài khoản bệnh nhân'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MODAL: SỬA HỒ SƠ BỆNH NHÂN ────────────────────────────────────
function SuaHoSoBenhNhanModal({ patient, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    hoTen: patient.hoTen || '',
    soDienThoai: patient.soDienThoai || '',
    email: patient.email || '',
    ngaySinh: patient.ngaySinh ? patient.ngaySinh.split('T')[0] : '',
    gioiTinh: patient.gioiTinh || 'nam',
    soCmnd: patient.soCmnd || '',
    soBhyt: patient.soBhyt || patient.soBHYT || '',
    bhytHanDen: patient.bhytHanDen || '',
    bhytNoiDangKy: patient.bhytNoiDangKy || '',
    bhytChuyenTuyenDen: patient.bhytChuyenTuyenDen || '',
    diaChi: patient.diaChi || '',
    nhomMau: patient.nhomMau || '',
    diUng: patient.diUng || '',
    tienSuBenh: patient.tienSuBenh || '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await apiPatch(`/benh-nhan/${patient.id}`, formData);
      alert('Cập nhật hồ sơ bệnh nhân thành công!');
      onSuccess();
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi lưu thay đổi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-8 animate-fade-in">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Sửa Hồ Sơ Bệnh Nhân</h2>
            <p className="text-xs text-blue-600 font-mono font-semibold">{patient.maBenhNhan} · {patient.hoTen}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={formData.hoTen}
                onChange={e => setFormData({ ...formData, hoTen: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={formData.soDienThoai}
                onChange={e => setFormData({ ...formData, soDienThoai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={formData.ngaySinh}
                onChange={e => setFormData({ ...formData, ngaySinh: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Giới tính</label>
              <select
                value={formData.gioiTinh}
                onChange={e => setFormData({ ...formData, gioiTinh: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
                <option value="khac">Khác</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Số CCCD / CMND</label>
              <input
                type="text"
                value={formData.soCmnd}
                onChange={e => setFormData({ ...formData, soCmnd: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mã số thẻ BHYT</label>
              <input
                type="text"
                value={formData.soBhyt}
                onChange={e => setFormData({ ...formData, soBhyt: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Hạn thẻ BHYT</label>
              <input
                type="date"
                value={formData.bhytHanDen}
                onChange={e => setFormData({ ...formData, bhytHanDen: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nơi đăng ký KCB ban đầu (mã)</label>
              <input
                type="text"
                value={formData.bhytNoiDangKy}
                onChange={e => setFormData({ ...formData, bhytNoiDangKy: e.target.value.toUpperCase() })}
                placeholder="Mã cơ sở ghi trên thẻ"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Giấy chuyển tuyến hiệu lực đến</label>
              <input
                type="date"
                value={formData.bhytChuyenTuyenDen}
                onChange={e => setFormData({ ...formData, bhytChuyenTuyenDen: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Địa chỉ thường trú</label>
              <input
                type="text"
                value={formData.diaChi}
                onChange={e => setFormData({ ...formData, diaChi: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nhóm máu</label>
              <select
                value={formData.nhomMau}
                onChange={e => setFormData({ ...formData, nhomMau: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn nhóm máu --</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tiền sử dị ứng</label>
              <input
                type="text"
                value={formData.diUng}
                onChange={e => setFormData({ ...formData, diUng: e.target.value })}
                placeholder="Dị ứng kháng sinh, phấn hoa..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MODAL: ĐẶT LẠI MẬT KHẨU CHO BỆNH NHÂN ─────────────────────────
function DatLaiMatKhauBenhNhanModal({ user, isOpen, onClose, onSubmit, isLoading }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setError('');
    onSubmit(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-fade-in text-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-gray-900 text-sm">Đặt Lại Mật Khẩu Bệnh Nhân</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-gray-500 mb-3">
          Đổi mật khẩu cho tài khoản: <strong className="font-mono text-blue-600">{user.tenDangNhap}</strong>
        </p>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3 py-2 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading ? 'Đang cập nhật...' : 'Xác nhận đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MODAL: CẤP TÀI KHOẢN CHO BỆNH NHÂN CHƯA CÓ TK ────────────────
function CapTaiKhoanModal({ patient, isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState(patient.email || patient.soDienThoai || '');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập hoặc Email');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await apiPost(`/quan-ly/tai-khoan-benh-nhan/${patient.id}/cap-tai-khoan`, {
        tenDangNhap: username.trim(),
        matKhau: password,
      });
      alert(`Đã cấp tài khoản "${username.trim()}" thành công cho bệnh nhân!`);
      onSuccess();
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi khi cấp tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-fade-in text-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Cấp Tài Khoản Bệnh Nhân</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-gray-500 mb-3">
          Cấp quyền đăng nhập cho: <strong className="text-gray-900">{patient.hoTen}</strong> ({patient.maBenhNhan})
        </p>

        {errorMsg && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Tên đăng nhập (Email / SĐT)</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="VD: nguyenvan@gmail.com"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Mật khẩu khởi tạo</label>
            <input
              type="text"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mặc định: 123456"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? 'Đang cấp...' : 'Cấp tài khoản ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

