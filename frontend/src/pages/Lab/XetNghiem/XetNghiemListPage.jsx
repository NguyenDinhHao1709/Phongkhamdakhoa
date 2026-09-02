import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { formatDateTime } from '../../../utils/formatDate';
import { TRANG_THAI_XET_NGHIEM } from '../../../utils/constants';
import { FlaskConical, Send, ChevronRight, Search, Eye } from 'lucide-react';

const TAB_FILTERS = [
  { key: null, label: 'Tất cả' },
  { key: 'cho_lay_mau', label: 'Chờ lấy mẫu' },
  { key: 'dang_xu_ly', label: 'Đang xử lý' },
  { key: 'co_ket_qua', label: 'Có kết quả' },
];

export default function XetNghiemListPage() {
  const [filter, setFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['chi-dinh', filter, page],
    queryFn: () => apiGet('/xet-nghiem/chi-dinh', { trangThai: filter || undefined, page, limit: 20 }),
    keepPreviousData: true,
  });

  const items = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)] animate-fade-in">
      {/* Left: List */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary-600" /> Xét nghiệm
          </h1>
          <span className="text-sm text-gray-500">{pagination.total || 0} chỉ định</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {TAB_FILTERS.map(({ key, label }) => (
            <button
              key={String(key)}
              onClick={() => { setFilter(key); setPage(1); }}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                filter === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <MedCard className="flex-1 overflow-hidden flex flex-col p-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Mã CĐ</th>
                  <th className="px-4 py-3">Tên Xét Nghiệm</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3">Thời Gian</th>
                  <th className="px-4 py-3 font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {isLoading && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">Đang tải...</td></tr>
                )}
                {!isLoading && items.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">Không có chỉ định nào</td></tr>
                )}
                {items.map((cd) => (
                  <tr
                    key={cd.id}
                    onClick={() => setSelectedId(cd.id)}
                    className={`cursor-pointer transition-colors ${selectedId === cd.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-600">#{cd.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{cd.dichVu?.tenDichVu || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={cd.trangThai} size="sm" /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(cd.thoiGianChiDinh)}</td>
                    <td className="px-4 py-3">
                      <MedButton variant="ghost" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />}>Chi tiết</MedButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MedCard>
      </div>

      {/* Right: Detail/Result Panel */}
      <div className="w-96 flex-shrink-0">
        {selectedId ? (
          <ChiDinhDetailPanel id={selectedId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FlaskConical className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Chọn chỉ định để xem & nhập kết quả</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChiDinhDetailPanel({ id }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['chi-dinh-detail', id],
    queryFn: () => apiGet(`/xet-nghiem/chi-dinh/${id}`),
  });

  const [result, setResult] = useState({ giaTri: '', donVi: '', nhanXet: '' });

  const statusMut = useMutation({
    mutationFn: (trangThai) => apiPatch(`/xet-nghiem/chi-dinh/${id}/trang-thai`, { trangThai }),
    onSuccess: () => { qc.invalidateQueries(['chi-dinh']); qc.invalidateQueries(['chi-dinh-detail', id]); },
  });

  const resultMut = useMutation({
    mutationFn: (data) => apiPost(`/xet-nghiem/chi-dinh/${id}/ket-qua`, data),
    onSuccess: () => { qc.invalidateQueries(['chi-dinh']); qc.invalidateQueries(['chi-dinh-detail', id]); },
  });

  const sendMut = useMutation({
    mutationFn: () => apiPatch(`/xet-nghiem/chi-dinh/${id}/gui-bac-si`),
    onSuccess: () => { qc.invalidateQueries(['chi-dinh-detail', id]); },
  });

  if (isLoading) return <MedCard><p className="text-sm text-gray-400 py-4">Đang tải...</p></MedCard>;
  const { chiDinh: cd, ketQua: kq } = data?.data || {};
  if (!cd) return null;

  const STATUS_FLOW = {
    cho_lay_mau: { next: 'dang_lay_mau', label: 'Bắt đầu lấy mẫu' },
    dang_lay_mau: { next: 'dang_xu_ly', label: 'Chuyển xử lý' },
    dang_xu_ly: null,
    co_ket_qua: null,
  };

  const nextStep = STATUS_FLOW[cd.trangThai];

  return (
    <div className="space-y-4">
      {/* Info */}
      <MedCard>
        <h3 className="text-base font-bold text-gray-900 mb-2">{cd.dichVu?.tenDichVu}</h3>
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={cd.trangThai} />
          <span className="text-xs text-gray-400">#{cd.id}</span>
        </div>
        <div className="space-y-1.5 text-sm text-gray-600">
          {cd.dichVu?.donViKetQua && <p>Đơn vị: <strong>{cd.dichVu.donViKetQua}</strong></p>}
          {cd.dichVu?.giaTriBinhThuong && <p>Bình thường: <strong>{cd.dichVu.giaTriBinhThuong}</strong></p>}
          {cd.ghiChuChiDinh && <p>Ghi chú BS: <em>{cd.ghiChuChiDinh}</em></p>}
        </div>

        {/* Status flow button */}
        {nextStep && (
          <div className="mt-4">
            <MedButton
              variant="primary"
              className="w-full"
              onClick={() => statusMut.mutate(nextStep.next)}
              loading={statusMut.isLoading}
              leftIcon={<ChevronRight className="h-4 w-4" />}
            >
              {nextStep.label}
            </MedButton>
          </div>
        )}
      </MedCard>

      {/* Nhập kết quả — cho trạng thái dang_xu_ly hoặc co_ket_qua */}
      {(cd.trangThai === 'dang_xu_ly' || cd.trangThai === 'co_ket_qua') && (
        <MedCard title="Kết quả xét nghiệm">
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); resultMut.mutate(result); }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Giá trị</label>
                <input
                  type="text"
                  value={kq?.giaTri || result.giaTri}
                  onChange={(e) => setResult((r) => ({ ...r, giaTri: e.target.value }))}
                  placeholder={cd.dichVu?.giaTriBinhThuong || 'Nhập giá trị'}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Đơn vị</label>
                <input
                  type="text"
                  value={kq?.donVi || result.donVi}
                  onChange={(e) => setResult((r) => ({ ...r, donVi: e.target.value }))}
                  placeholder={cd.dichVu?.donViKetQua || ''}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nhận xét</label>
              <textarea
                rows={3}
                value={kq?.nhanXet || result.nhanXet}
                onChange={(e) => setResult((r) => ({ ...r, nhanXet: e.target.value }))}
                placeholder="Nhận xét kết quả xét nghiệm..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3">
              <MedButton variant="primary" type="submit" loading={resultMut.isLoading}>
                Lưu kết quả
              </MedButton>
            </div>
          </form>

          {/* Gửi cho bác sĩ */}
          {kq && !kq.daGuiBacSi && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <MedButton
                variant="secondary"
                className="w-full"
                onClick={() => sendMut.mutate()}
                loading={sendMut.isLoading}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Gửi kết quả cho bác sĩ
              </MedButton>
            </div>
          )}
          {kq?.daGuiBacSi && (
            <p className="mt-3 text-xs text-success-dark font-medium text-center">✓ Đã gửi cho bác sĩ</p>
          )}
        </MedCard>
      )}
    </div>
  );
}

