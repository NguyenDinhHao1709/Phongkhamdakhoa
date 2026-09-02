import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, ChevronLeft, ChevronRight, User2, Phone, Calendar, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
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
            {pagination.total ? `${pagination.total} bệnh nhân` : ''}
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

        {/* Search */}
        <MedCard padding="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên, mã BN, CMND, số điện thoại..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            )}
          </div>
        </MedCard>

        {/* Table */}
        <MedCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Mã BN', 'Họ tên', 'Tuổi/Giới tính', 'Liên hệ', 'Dị ứng', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      <div className="flex justify-center mb-2">
                        <div className="h-6 w-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                      </div>
                      Đang tải...
                    </td>
                  </tr>
                )}
                {!isLoading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                      Không tìm thấy bệnh nhân nào
                    </td>
                  </tr>
                )}
                {items.map((bn) => (
                  <tr
                    key={bn.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tiep-tan/benh-nhan/${bn.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-primary-700">{bn.maBenhNhan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                          <User2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{bn.hoTen}</p>
                          <p className="text-xs text-gray-500">{formatDate(bn.ngaySinh)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {tinhTuoi(bn.ngaySinh) && <span>{tinhTuoi(bn.ngaySinh)} tuổi</span>}
                      {bn.gioiTinh && <span className="ml-1 text-gray-400">· {GIOI_TINH[bn.gioiTinh]}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {bn.soDienThoai && (
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {bn.soDienThoai}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {bn.diUng && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-light border border-danger-main/20 px-2 py-0.5 text-xs font-medium text-danger-dark">
                          <AlertTriangle className="h-3 w-3" />
                          {bn.diUng.length > 20 ? bn.diUng.substring(0, 20) + '…' : bn.diUng}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <MedButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/tiep-tan/benh-nhan/${bn.id}`); }}>
                        Xem
                      </MedButton>
                    </td>
                  </tr>
                ))}
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

