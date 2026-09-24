import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Plus, ChevronLeft, ChevronRight, Phone, Calendar,
  AlertTriangle, Eye, Edit3, SlidersHorizontal, X, RotateCcw,
  Sparkles, Users, UserPlus, ShieldAlert, Baby, Clock
} from 'lucide-react';
import { apiGet } from '../../../services/api';
import { formatDate, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';

function useBenhNhan(params) {
  return useQuery({
    queryKey: ['benh-nhan', params],
    queryFn: () => apiGet('/benh-nhan', params),
    keepPreviousData: true,
    refetchOnMount: true,
    staleTime: 0,
  });
}

// Màu avatar chữ cái ngẫu nhiên dựa vào tên
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-teal-100 text-teal-700 border-teal-200',
];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
}

export default function BenhNhanListPage() {
  const navigate = useNavigate();

  // 1. Quản lý trạng thái Tìm kiếm Nhanh & Debounce 400ms
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

  // Tự động Debounce sau 400ms khi người dùng ngưng gõ
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 400);
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

  // 3. Gọi API với phân trang Backend
  const queryParams = {
    page,
    limit: 15,
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
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-8">
      {/* ─── HEADER & THAO TÁC TRÊN CÙNG ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 flex-shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
              Quản Lý Hồ Sơ Bệnh Nhân
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {pagination.total ? `Hệ thống ghi nhận ${pagination.total} bệnh nhân trong CSDL y tế` : 'Tra cứu, phân loại và quản lý thông tin hồ sơ y tế'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/tiep-tan/benh-nhan/tao-moi')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Tạo hồ sơ mới
        </button>
      </div>

      {/* ─── CỤM THỐNG KÊ NHANH (MINI STATS CHIPS) ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {pagination.total || items.length}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Tổng hồ sơ</p>
            <p className="text-xs font-bold text-gray-800">Toàn hệ thống</p>
          </div>
        </div>

        <div
          onClick={() => { setFilters((f) => ({ ...f, moiDangKyHomNay: !f.moiDangKyHomNay })); setPage(1); }}
          className={`rounded-xl p-2.5 border transition-all cursor-pointer flex items-center gap-2.5 select-none ${
            filters.moiDangKyHomNay
              ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300'
              : 'bg-white border-gray-100 hover:border-emerald-200 shadow-2xs'
          }`}
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Đăng ký mới</p>
            <p className="text-xs font-bold text-emerald-700">Trong hôm nay</p>
          </div>
        </div>

        <div
          onClick={() => { setFilters((f) => ({ ...f, coDiUng: !f.coDiUng })); setPage(1); }}
          className={`rounded-xl p-2.5 border transition-all cursor-pointer flex items-center gap-2.5 select-none ${
            filters.coDiUng
              ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300'
              : 'bg-white border-gray-100 hover:border-rose-200 shadow-2xs'
          }`}
        >
          <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Tiền sử dị ứng</p>
            <p className="text-xs font-bold text-rose-700">Cảnh báo y khoa</p>
          </div>
        </div>

        <div
          onClick={() => { setFilters((f) => ({ ...f, chuaHoanThien: !f.chuaHoanThien })); setPage(1); }}
          className={`rounded-xl p-2.5 border transition-all cursor-pointer flex items-center gap-2.5 select-none ${
            filters.chuaHoanThien
              ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
              : 'bg-white border-gray-100 hover:border-amber-200 shadow-2xs'
          }`}
        >
          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 truncate">Thiếu thông tin</p>
            <p className="text-xs font-bold text-amber-700">Cần hoàn thiện</p>
          </div>
        </div>
      </div>

      {/* ─── CỤM TÌM KIẾM & BỘ LỌC ĐA TIÊU CHÍ GỌN GÀNG ─────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs space-y-2.5">
        {/* Hàng 1: Ô Tìm Kiếm Cốt Lõi + Nút Lọc Nâng Cao */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, Mã BN (BN000001), CCCD/CMND, Số điện thoại..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50/50 hover:bg-white py-1.5 pl-8 pr-8 text-xs text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isFetching && (
              <div className="absolute right-2 top-2 h-3.5 w-3.5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              showAdvanced || activeFilterCount > 0
                ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-2xs'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary-600" />
            <span>Bộ lọc nâng cao</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Hàng 2: Thẻ Lọc Nhanh Một Chạm (Filter Chips) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
          <span className="text-[11px] font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Lọc nhanh:
          </span>

          {/* Chip 1: Bệnh nhi */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, doTuoi: f.doTuoi === 'nhi' ? '' : 'nhi' })); setPage(1); }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              filters.doTuoi === 'nhi'
                ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>👶 Bệnh nhi (&lt; 15t)</span>
            {filters.doTuoi === 'nhi' && <X className="h-3 w-3" />}
          </button>

          {/* Chip 2: Người cao tuổi */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, doTuoi: f.doTuoi === 'cao_tuoi' ? '' : 'cao_tuoi' })); setPage(1); }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              filters.doTuoi === 'cao_tuoi'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>👴 Cao tuổi (&gt; 60t)</span>
            {filters.doTuoi === 'cao_tuoi' && <X className="h-3 w-3" />}
          </button>

          {/* Chip 3: Giới tính Nam */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, gioiTinh: f.gioiTinh === 'nam' ? '' : 'nam' })); setPage(1); }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              filters.gioiTinh === 'nam'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>Nam</span>
            {filters.gioiTinh === 'nam' && <X className="h-3 w-3" />}
          </button>

          {/* Chip 4: Giới tính Nữ */}
          <button
            type="button"
            onClick={() => { setFilters((f) => ({ ...f, gioiTinh: f.gioiTinh === 'nu' ? '' : 'nu' })); setPage(1); }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              filters.gioiTinh === 'nu'
                ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>Nữ</span>
            {filters.gioiTinh === 'nu' && <X className="h-3 w-3" />}
          </button>

          {/* Reset button */}
          {(activeFilterCount > 0 || search !== '') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-red-600 font-semibold hover:underline ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Đặt lại lọc
            </button>
          )}
        </div>

        {/* Hàng 3: Panel Bộ Lọc Nâng Cao Xổ Xuống (Accordion) */}
        {showAdvanced && (
          <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs animate-fade-in">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-600">Từ ngày đăng ký</label>
              <input
                type="date"
                value={filters.tuNgay}
                onChange={(e) => { setFilters({ ...filters, tuNgay: e.target.value }); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-1 focus:ring-primary-500 text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-600">Đến ngày đăng ký</label>
              <input
                type="date"
                value={filters.denNgay}
                onChange={(e) => { setFilters({ ...filters, denNgay: e.target.value }); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-1 focus:ring-primary-500 text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-600">Giới tính</label>
              <select
                value={filters.gioiTinh}
                onChange={(e) => { setFilters({ ...filters, gioiTinh: e.target.value }); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-1 focus:ring-primary-500 text-gray-800"
              >
                <option value="">Tất cả giới tính</option>
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
                <option value="khac">Khác</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-600">Nhóm độ tuổi</label>
              <select
                value={filters.doTuoi}
                onChange={(e) => { setFilters({ ...filters, doTuoi: e.target.value }); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:ring-1 focus:ring-primary-500 text-gray-800"
              >
                <option value="">Tất cả độ tuổi</option>
                <option value="nhi">Bệnh nhi (&lt; 15 tuổi)</option>
                <option value="truong_thanh">Trưởng thành (15 - 60 tuổi)</option>
                <option value="cao_tuoi">Người cao tuổi (&gt; 60 tuổi)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ─── BẢNG DANH SÁCH BỆNH NHÂN (COMPACT & MODERN TABLE) ──── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Mã BN</th>
                <th className="py-2.5 px-3 font-semibold">Bệnh nhân & Ngày sinh</th>
                <th className="py-2.5 px-3 font-semibold">Tuổi / Giới tính</th>
                <th className="py-2.5 px-3 font-semibold">Số điện thoại</th>
                <th className="py-2.5 px-3 font-semibold">Tiền sử dị ứng</th>
                <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-gray-400">
                    <div className="flex justify-center mb-1.5">
                      <div className="h-5 w-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                    Đang tải danh sách hồ sơ bệnh nhân...
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-gray-400 space-y-1.5">
                    <AlertTriangle className="h-7 w-7 text-gray-300 mx-auto" />
                    <p className="font-bold text-gray-700">Không tìm thấy bệnh nhân nào</p>
                    <p className="text-[11px] text-gray-400">Thử thay đổi từ khóa hoặc xóa bộ lọc.</p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs font-semibold text-primary-600 hover:underline cursor-pointer"
                      >
                        Đặt lại bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {items.map((bn) => {
                const ageStr = tinhTuoi(bn.ngaySinh);
                const isAgeError = ageStr === 'Lỗi dữ liệu';
                const isMale = bn.gioiTinh === 'nam' || bn.gioiTinh === 'Nam';
                const isFemale = bn.gioiTinh === 'nu' || bn.gioiTinh === 'Nu' || bn.gioiTinh === 'Nữ';
                const initialChar = (bn.hoTen || 'B').trim().charAt(0).toUpperCase();
                const avatarColor = getAvatarColor(bn.hoTen);

                return (
                  <tr
                    key={bn.id}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tiep-tan/benh-nhan/${bn.id}`)}
                  >
                    {/* Mã BN */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                        {bn.maBenhNhan || '-'}
                      </span>
                    </td>

                    {/* Họ tên & Ngày sinh */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs border flex-shrink-0 ${avatarColor}`}>
                          {initialChar}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-xs truncate">
                            {bn.hoTen && bn.hoTen.trim() !== '' ? bn.hoTen : <span className="text-gray-400 font-normal">Chưa có tên</span>}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {bn.ngaySinh ? formatDate(bn.ngaySinh) : '---'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Tuổi / Giới tính */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {ageStr && !isAgeError ? (
                          <span className="font-bold text-gray-800">{ageStr}</span>
                        ) : isAgeError ? (
                          <span className="text-[10px] text-amber-600">Chưa rõ</span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}

                        {bn.gioiTinh && (
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isMale
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isFemale
                              ? 'bg-pink-50 text-pink-700 border border-pink-200'
                              : 'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}>
                            {GIOI_TINH[bn.gioiTinh] || bn.gioiTinh}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Liên hệ */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {bn.soDienThoai ? (
                        <div className="flex items-center gap-1 text-gray-800 font-medium">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{bn.soDienThoai}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">Chưa có SĐT</span>
                      )}
                    </td>

                    {/* Dị ứng */}
                    <td className="py-2.5 px-3 max-w-xs">
                      {bn.diUng && bn.diUng.trim() !== '' && bn.diUng.toLowerCase() !== 'không' && bn.diUng.toLowerCase() !== 'khong' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Tiền sử dị ứng của BN ${bn.hoTen}:\n${bn.diUng}`);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                          title="Click để xem chi tiết tiền sử dị ứng"
                        >
                          <AlertTriangle className="h-3 w-3 text-rose-500 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{bn.diUng}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-normal">Không</span>
                      )}
                    </td>

                    {/* Thao tác (Icon buttons) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/tiep-tan/benh-nhan/${bn.id}`); }}
                          title="Xem chi tiết hồ sơ"
                          className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded border border-gray-200 hover:border-primary-200 transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/tiep-tan/benh-nhan/${bn.id}/edit`); }}
                          title="Chỉnh sửa hồ sơ"
                          className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded border border-gray-200 hover:border-amber-200 transition cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate('/tiep-tan/lich-hen'); }}
                          title="Tạo lịch khám mới"
                          className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded border border-gray-200 hover:border-emerald-200 transition cursor-pointer"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── PHÂN TRANG (PAGINATION GỌN GÀNG) ──────────────────── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-3.5 py-2.5 bg-gray-50/50">
            <p className="text-[11px] text-gray-500">
              Trang <strong>{pagination.page}</strong> / {pagination.totalPages} (Tổng <strong>{pagination.total}</strong> hồ sơ)
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

