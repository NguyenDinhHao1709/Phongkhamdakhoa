import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, ChevronLeft, ChevronRight, User2, Phone, Calendar, AlertTriangle, Eye, Edit3 } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);

  // Debounce tìm kiếm 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useBenhNhan({ q: debouncedQ || undefined, page, limit: 20 });
  const items = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Danh sách bệnh nhân</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pagination.total ? `${pagination.total} bệnh nhân trong hệ thống` : 'Quản lý thông tin hồ sơ y tế bệnh nhân'}
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

      {/* Search Bar */}
      <MedCard padding="p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên, mã BN, CMND, số điện thoại..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
          {isFetching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          )}
        </div>
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
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    Không tìm thấy bệnh nhân nào phù hợp.
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Trang {pagination.page} / {pagination.totalPages}
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

