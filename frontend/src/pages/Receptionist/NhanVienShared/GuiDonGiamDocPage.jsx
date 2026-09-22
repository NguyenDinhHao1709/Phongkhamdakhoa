import { useState } from 'react';
import { Send, FileText, CheckCircle2, Clock, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../../services/api';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { formatDate } from '../../../utils/formatDate';

export default function GuiDonGiamDocPage() {
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    loaiDon: 'Đơn xin nghỉ phép',
    tieuDe: '',
    noiDung: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['danh-sach-don-tu-nhan-vien'],
    queryFn: () => apiGet('/nhan-vien/don-tu/danh-sach'),
  });

  const donList = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.data?.data) ? data.data.data : (Array.isArray(data) ? data : []));

  const guiDonMutation = useMutation({
    mutationFn: (payload) => apiPost('/quan-ly/don-tu', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['danh-sach-don-tu-nhan-vien'] });
      setSuccessMsg('Đã gửi yêu cầu thành công! Trạng thái đang chờ xét duyệt.');
      setShowModal(false);
      setForm({ loaiDon: 'Đơn xin nghỉ phép', tieuDe: '', noiDung: '' });
      setTimeout(() => setSuccessMsg(''), 6000);
    },
    onError: (err) => {
      alert('Có lỗi xảy ra khi gửi yêu cầu: ' + (err?.response?.data?.message || err.message));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullContent = form.tieuDe.trim()
      ? `[${form.tieuDe.trim()}] ${form.noiDung.trim()}`
      : form.noiDung.trim();

    guiDonMutation.mutate({
      loaiDon: form.loaiDon,
      noiDung: fullContent,
    });
  };

  const getTrangThaiBadge = (trangThai) => {
    switch (trangThai) {
      case 'da_xu_ly':
      case 'DA_DUYET':
        return {
          text: '● Đã duyệt',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'tu_choi':
      case 'TU_CHOI':
        return {
          text: '● Từ chối',
          className: 'bg-red-50 text-red-700 border-red-200',
        };
      case 'cho_xu_ly':
      case 'CHO_DUYET':
      default:
        return {
          text: '⏳ Chờ duyệt',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gửi yêu cầu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tạo và theo dõi yêu cầu xin nghỉ phép, đề xuất thiết bị, đổi ca gửi Ban Giám Đốc xét duyệt
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
          <MedButton
            variant="primary"
            onClick={() => setShowModal(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            data-testid="btn-tao-don-moi"
          >
            Tạo yêu cầu mới
          </MedButton>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-light p-4 text-sm text-success-main border border-success-main/30 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Danh sách yêu cầu đã gửi */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Đang tải danh sách yêu cầu...</div>
        ) : donList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-2">
            <FileText className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="font-bold">Bạn chưa có yêu cầu nào</p>
            <p className="text-xs text-gray-400">Nhấn &quot;Tạo yêu cầu mới&quot; để gửi yêu cầu lên Ban Giám Đốc</p>
          </div>
        ) : (
          donList.map((item) => {
            const badge = getTrangThaiBadge(item.trangThai);
            return (
              <div key={item.id} className="rounded-2xl bg-white p-6 border border-gray-200 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                      {item.loaiDon}
                    </span>
                    {item.nguoiGui?.hoTen && (
                      <span className="ml-2 text-xs text-gray-500 font-medium">
                        Người gửi: <strong className="text-gray-700">{item.nguoiGui.hoTen}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Ngày gửi: {formatDate(item.ngayGui)}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badge.className}`}>
                      {badge.text}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/70 p-3 rounded-xl whitespace-pre-wrap">
                  {item.noiDung}
                </p>

                {item.ghiChuXuLy && (
                  <div className="text-xs text-emerald-800 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                    <strong>Phản hồi từ Giám đốc:</strong> {item.ghiChuXuLy}
                    {item.ngayXuLy && (
                      <span className="ml-2 text-[10px] text-emerald-600">
                        (Xử lý ngày {formatDate(item.ngayXuLy)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tạo Yêu Cầu */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Gửi yêu cầu mới</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Loại yêu cầu *</label>
                <select
                  value={form.loaiDon}
                  onChange={(e) => setForm({ ...form, loaiDon: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 font-medium"
                  data-testid="select-loai-don"
                >
                  <option value="Đơn xin nghỉ phép">Đơn xin nghỉ phép</option>
                  <option value="Đề xuất vật tư y tế">Đề xuất vật tư y tế</option>
                  <option value="Đơn xin đổi ca trực">Đơn xin đổi ca trực</option>
                  <option value="Đề xuất chuyên môn & cải tiến quy trình">Đề xuất chuyên môn & cải tiến quy trình</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tiêu đề yêu cầu *</label>
                <input
                  type="text"
                  required
                  value={form.tieuDe}
                  onChange={(e) => setForm({ ...form, tieuDe: e.target.value })}
                  placeholder="Nhập tiêu đề tóm tắt yêu cầu..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                  data-testid="input-tieu-de"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nội dung chi tiết yêu cầu *</label>
                <textarea
                  rows={4}
                  required
                  value={form.noiDung}
                  onChange={(e) => setForm({ ...form, noiDung: e.target.value })}
                  placeholder="Mô tả lý do, thời gian hoặc yêu cầu cụ thể..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                  data-testid="textarea-noi-dung"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <MedButton variant="ghost" type="button" onClick={() => setShowModal(false)}>
                  Hủy
                </MedButton>
                <MedButton
                  variant="primary"
                  type="submit"
                  leftIcon={<Send className="h-4 w-4" />}
                  loading={guiDonMutation.isPending}
                  disabled={guiDonMutation.isPending}
                  data-testid="btn-submit-don"
                >
                  Gửi yêu cầu
                </MedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
