import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Plus, ChevronLeft, ChevronRight, User2, Phone, Calendar,
  AlertTriangle, Eye, Edit3, SlidersHorizontal, X, RotateCcw,
  Sparkles, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { apiGet } from '../../../services/api';
import { formatDate, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';

function useBenhNhan(params) {
  return useQuery({
    queryKey: ['benh-nhan', params],
    queryFn: () => apiGet('/benh-nhan', params),
    keepPreviousData: true,
  });
}

export default function BenhNhanListPage() {
  const navigate = useNavigate();

  // 1. Quản lý trạng thái Tìm kiếm Nhanh & Debounce 500ms
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 2. Quản lý trạng thái Bộ Lọc Đa Tầng
  const [filters, setFilters] = useState({
    tuNgay: '',
    denNgay: '',
    gioiTinh: '',
    doTuoi: '',
    coDiUng: false,
    chuaHoanThien: false,
    moiDangKyHomNay: false,
  });

  // Tự động Debounce sau 500ms khi người dùng ngưng gõ
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  // Đếm số tiêu chí lọc nâng cao đang active
  const activeFilterCount = [
    filters.tuNgay,
    filters.denNgay,
    filters.gioiTinh,
    filters.doTuoi,
    filters.coDiUng,
    filters.chuaHoanThien,
    filters.moiDangKyHomNay,
  ].filter(Boolean).length;

  // 3. Gọi API với phân trang Backend và các tham số lọc đa tầng
  const queryParams = {
    page,
    limit: 20,
    q: debouncedQ ? debouncedQ.trim() : undefined,
    tuNgay: filters.tuNgay || undefined,
    denNgay: filters.denNgay || undefined,
    gioiTinh: filters.gioiTinh || undefined,
    doTuoi: filters.doTuoi || undefined,
    coDiUng: filters.coDiUng ? 'true' : undefined,
    chuaHoanThien: filters.chuaHoanThien ? 'true' : undefined,
    moiDangKyHomNay: filters.moiDangKyHomNay ? 'true' : undefined,
  };

  const { data, isLoading, isFetching } = useBenhNhan(queryParams);
  const items = data?.data || [];
  const pagination = data?.pagination || {};

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedQ('');
    setFilters({
      tuNgay: '',
      denNgay: '',
      gioiTinh: '',
      doTuoi: '',
      coDiUng: false,
      chuaHoanThien: false,
      moiDangKyHomNay: false,
    });
    setPage(1);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Danh sách bệnh nhân</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total ? `Quản lý ${pagination.total} hồ sơ bệnh nhân trong CSDL y tế` : 'Tra cứu và quản lý thông tin hồ sơ y tế bệnh nhân'}
          </p>
        </div>
        <MedButton
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/tiep-tan/benh-nhan/tao-moi')}
        >
          Hồ sơ mới
        </MedButton>
      </div>

      {/* CỤM TÌM KIẾM & LỌC ĐA TẦNG (Multi-layer Filtering Group) */}
      <MedCard padding="p-4" className="space-y-4 bg-gray-50/70 border border-gray-200/80">
        {/* Tầng 1: Thanh Tìm Kiếm Cốt Lõi + Nút Lọc Nâng Cao Accordion */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nhanh theo tên, Mã BN (BN000001), CMND/CCCD, Số điện thoại..."
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-2xs font-medium"
            />
            {isFetching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
              showAdvanced || activeFilterCount > 0
                ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 text-primary-600" />
            <span>Bộ lọc nâng cao</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary-600 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            {showAdvanced ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
        </div>

        {/* Tầng 2: Thẻ Lọc Nhanh Một Chạm (Filter Chips - One-click Quick Filters) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-200/60">
          <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Lọc nhanh:
          </span>

          {/* Chip 1: Mới đăng ký hôm nay */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, moiDangKyHomNay: !f.moiDangKyHomNay })); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filters.moiDangKyHomNay
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-300'
            }`}
          >
            <span>⚡ Mới đăng ký hôm nay</span>
            {filters.moiDangKyHomNay && <X className="h-3.5 w-3.5" />}
          </button>

          {/* Chip 2: Chưa hoàn thiện hồ sơ */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, chuaHoanThien: !f.chuaHoanThien })); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filters.chuaHoanThien
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50 hover:border-amber-300'
            }`}
          >
            <span>⚠️ Chưa hoàn thiện hồ sơ</span>
            {filters.chuaHoanThien && <X className="h-3.5 w-3.5" />}
          </button>

          {/* Chip 3: Có tiền sử dị ứng */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, coDiUng: !f.coDiUng })); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filters.coDiUng
                ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-300'
            }`}
          >
            <span>🚨 Có tiền sử dị ứng</span>
            {filters.coDiUng && <X className="h-3.5 w-3.5" />}
          </button>

          {/* Chip 4: Bệnh nhi (<15t) */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, doTuoi: f.doTuoi === 'nhi' ? '' : 'nhi' })); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filters.doTuoi === 'nhi'
                ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-primary-50 hover:border-primary-300'
            }`}
          >
            <span>👶 Bệnh nhi (&lt; 15 tuổi)</span>
            {filters.doTuoi === 'nhi' && <X className="h-3.5 w-3.5" />}
          </button>

          {/* Chip 5: Người cao tuổi (>60t) */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, doTuoi: f.doTuoi === 'cao_tuoi' ? '' : 'cao_tuoi' })); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filters.doTuoi === 'cao_tuoi'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'
            }`}
          >
            <span>👴 Người cao tuổi (&gt; 60 tuổi)</span>
            {filters.doTuoi === 'cao_tuoi' && <X className="h-3.5 w-3.5" />}
          </button>

          {/* Reset button */}
          {(activeFilterCount > 0 || search !== '') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-red-600 font-semibold hover:underline ml-auto flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Xóa tất cả bộ lọc
            </button>
          )}
        </div>

        {/* Tầng 3: Panel Bộ Lọc Nâng Cao Xổ Xuống (Accordion Advanced Filter Panel) */}
        {showAdvanced && (
          <div className="pt-3 border-t border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm animate-scale-in">
            {/* Nhóm Thời Gian */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Từ ngày đăng ký</label>
              <input
                type="date"
                value={filters.tuNgay}
                onChange={(e) => { setFilters({ ...filters, tuNgay: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Đến ngày đăng ký</label>
              <input
                type="date"
                value={filters.denNgay}
                onChange={(e) => { setFilters({ ...filters, denNgay: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
              />
            </div>

            {/* Nhóm Nhân Khẩu Học */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Giới tính</label>
              <select
                value={filters.gioiTinh}
                onChange={(e) => { setFilters({ ...filters, gioiTinh: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
              >
                <option value="">-- Tất cả Giới tính --</option>
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
                <option value="khac">Khác</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider">Nhóm Độ tuổi</label>
              <select
                value={filters.doTuoi}
                onChange={(e) => { setFilters({ ...filters, doTuoi: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
              >
                <option value="">-- Tất cả Độ tuổi --</option>
                <option value="nhi">Bệnh nhi (&lt; 15 tuổi)</option>
                <option value="truong_thanh">Trưởng thành (15 - 60 tuổi)</option>
                <option value="cao_tuoi">Người cao tuổi (&gt; 60 tuổi)</option>
              </select>
            </div>
          </div>
        )}
      </MedCard>

      {/* Table Danh sách Bệnh nhân */}
      <MedCard padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3.5">Mã BN</th>
                <th className="px-4 py-3.5">Họ tên & Ngày sinh</th>
                <th className="px-4 py-3.5">Tuổi / Giới tính</th>
                <th className="px-4 py-3.5">Liên hệ</th>
                <th className="px-4 py-3.5">Dị ứng</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    <div className="flex justify-center mb-2">
                      <div className="h-6 w-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                    Đang tải danh sách bệnh nhân...
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400 space-y-2">
                    <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto" />
                    <p>Không tìm thấy bệnh nhân nào phù hợp với bộ lọc hiện tại.</p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-semibold text-primary-600 hover:underline"
                      >
                        Bấm vào đây để xóa bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {items.map((bn) => {
                const ageStr = tinhTuoi(bn.ngaySinh);
                const genderStr = GIOI_TINH[bn.gioiTinh] || (bn.gioiTinh ? String(bn.gioiTinh) : '');
                const isAgeError = ageStr === 'Lỗi dữ liệu';

                return (
                  <tr
                    key={bn.id}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tiep-tan/benh-nhan/${bn.id}`)}
                  >
                    {/* Mã BN */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm font-bold text-primary-700">{bn.maBenhNhan || '-'}</span>
                    </td>

                    {/* Họ tên & Ngày sinh */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 border border-primary-100">
                          <User2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {bn.hoTen && bn.hoTen.trim() !== '' ? bn.hoTen : <span className="text-gray-400 font-normal">Chưa cập nhật</span>}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {bn.ngaySinh ? formatDate(bn.ngaySinh) : <span className="text-gray-300">-</span>}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Tuổi / Giới tính */}
                    <td className="px-4 py-3.5">
                      {!ageStr && !genderStr ? (
                        <span className="text-gray-400 text-xs">-</span>
                      ) : (
                        <div className="text-sm">
                          {isAgeError ? (
                            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Lỗi dữ liệu
                            </span>
                          ) : (
                            <span className="font-bold text-gray-900">{ageStr}</span>
                          )}
                          {ageStr && genderStr && !isAgeError && <span className="text-gray-400 mx-1">·</span>}
                          {genderStr && <span className="text-gray-600">{genderStr}</span>}
                        </div>
                      )}
                    </td>

                    {/* Liên hệ */}
                    <td className="px-4 py-3.5">
                      {bn.soDienThoai ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {bn.soDienThoai}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Chưa cập nhật</span>
                      )}
                    </td>

                    {/* Dị ứng */}
                    <td className="px-4 py-3.5">
                      {bn.diUng && bn.diUng.trim() !== '' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Tiền sử dị ứng của BN ${bn.hoTen}:\n${bn.diUng}`);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/80 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors shadow-2xs"
                          title="Click để xem chi tiết tiền sử dị ứng"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          <span>{bn.diUng.length > 18 ? bn.diUng.substring(0, 18) + '…' : bn.diUng}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-normal">Không</span>
                      )}
                    </td>

                    {/* Thao tác (Icon buttons) */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/tiep-tan/benh-nhan/${bn.id}`); }}
                          title="Xem chi tiết hồ sơ"
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg border border-gray-200/60 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/tiep-tan/benh-nhan/${bn.id}/edit`); }}
                          title="Chỉnh sửa hồ sơ"
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-gray-200/60 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/tiep-tan/lich-hen'); }}
                          title="Tạo lịch khám mới"
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-gray-200/60 transition-colors"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Phân Trang Backend (Backend Pagination 20/trang) */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Hiển thị trang <strong>{pagination.page}</strong> / {pagination.totalPages} (Tổng <strong>{pagination.total}</strong> bệnh nhân)
            </p>
            <div className="flex gap-1">
              <MedButton
                variant="ghost" size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Trước
              </MedButton>
              <MedButton
                variant="ghost" size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Sau
              </MedButton>
            </div>
          </div>
        )}
      </MedCard>
    </div>
  );
}

