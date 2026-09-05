import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatDateTime } from '../../utils/formatDate';
import {
  FileText, CheckCircle2, XCircle, Clock, Filter, AlertTriangle,
  User, RefreshCw, MessageSquare, Check, X
} from 'lucide-react';

const TRANG_THAI_CONFIG = {
  cho_xu_ly: { label: 'Chờ duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  da_xu_ly: { label: 'Đã phê duyệt', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tu_choi: { label: 'Từ chối', bg: 'bg-red-50 text-red-700 border-red-200' },
  da_huy: { label: 'Đã hủy', bg: 'bg-gray-50 text-gray-700 border-gray-200' },
};

export default function DuyetYeuCauPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('cho_xu_ly');
  const [selectedDon, setSelectedDon] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [targetDonId, setTargetDonId] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['danh-sach-don-tu', filterStatus],
    queryFn: () => apiGet(`/quan-ly/don-tu?trangThai=${filterStatus}`),
  });

  const donList = data?.data || [];

  const duyetMutation = useMutation({
    mutationFn: ({ id, action, ghiChuXuLy }) =>
      apiPatch(`/quan-ly/don-tu/${id}/duyet`, { action, ghiChuXuLy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['danh-sach-don-tu'] });
      queryClient.invalidateQueries({ queryKey: ['giam-doc-dashboard'] });
      setRejectModalOpen(false);
      setRejectReason('');
    },
  });

  const handleApprove = (id) => {
    if (window.confirm('Xác nhận PHÊ DUYỆT yêu cầu này?')) {
      duyetMutation.mutate({ id, action: 'duyet', ghiChuXuLy: 'Ban Giám Đốc đã phê duyệt' });
    }
  };

  const handleOpenReject = (id) => {
    setTargetDonId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối yêu cầu.');
      return;
    }
    duyetMutation.mutate({
      id: targetDonId,
      action: 'tu_choi',
      ghiChuXuLy: rejectReason.trim(),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Phê Duyệt Đơn Yêu Cầu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Xem xét và phê duyệt đơn xin nghỉ phép, đề xuất thiết bị, đổi ca từ nhân viên phòng khám
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'cho_xu_ly', label: '⏳ Chờ phê duyệt' },
          { key: 'da_xu_ly', label: '✅ Đã duyệt' },
          { key: 'tu_choi', label: '❌ Đã từ chối' },
          { key: 'all', label: '📑 Tất cả đơn' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterStatus === tab.key
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách đơn */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Đang tải danh sách đơn từ...</div>
        ) : donList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-2">
            <FileText className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="font-bold">Không có đơn yêu cầu nào trong mục này</p>
            <p className="text-xs text-gray-400">Mọi đơn từ nhân viên sẽ xuất hiện ở đây để Giám Đốc xử lý</p>
          </div>
        ) : (
          donList.map((don) => {
            const st = TRANG_THAI_CONFIG[don.trangThai] || TRANG_THAI_CONFIG.cho_xu_ly;
            return (
              <div
                key={don.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{don.loaiDon}</h3>
                      <p className="text-xs text-gray-500">
                        Người gửi: <strong className="text-gray-800">{don.nguoiGui?.hoTen}</strong> ({don.nguoiGui?.chucVu}) • Gửi lúc: {formatDateTime(don.ngayGui)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${st.bg}`}>
                    {st.label}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3.5 text-xs text-gray-700 leading-relaxed">
                  <p className="font-semibold text-gray-800 mb-1">Nội dung trình:</p>
                  <p>{don.noiDung}</p>
                </div>

                {don.ghiChuXuLy && (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                    <p className="font-bold">Phản hồi của Giám Đốc:</p>
                    <p className="mt-0.5">{don.ghiChuXuLy}</p>
                    {don.ngayXuLy && <p className="text-[10px] text-blue-600 mt-1">Xử lý lúc: {formatDateTime(don.ngayXuLy)}</p>}
                  </div>
                )}

                {/* Nút thao tác khi đơn còn chờ duyệt */}
                {don.trangThai === 'cho_xu_ly' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenReject(don.id)}
                      disabled={duyetMutation.isPending}
                      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Từ chối
                    </button>
                    <button
                      onClick={() => handleApprove(don.id)}
                      disabled={duyetMutation.isPending}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5" /> Phê duyệt
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal từ chối yêu cầu (nhập lý do) */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Từ Chối Đơn Yêu Cầu
            </h3>
            <p className="text-xs text-gray-600">
              Vui lòng nhập lý do từ chối để thông báo cho nhân viên:
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="VD: Không đủ nhân sự trực thay ca chiều ngày này, vui lòng chọn ngày khác..."
              rows={3}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={duyetMutation.isPending || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

