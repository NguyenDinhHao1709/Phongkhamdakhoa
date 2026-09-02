import { useState } from 'react';
import { Send, FileText, CheckCircle2, Clock, Plus, AlertCircle } from 'lucide-react';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { formatDate } from '../../../utils/formatDate';

export default function GuiDonGiamDocPage() {
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [donList, setDonList] = useState([
    {
      id: 1,
      loaiDon: 'Đơn xin nghỉ phép',
      tieude: 'Xin nghỉ phép khám bệnh gia đình',
      noiDung: 'Kính gửi Ban Giám Đốc, tôi xin nghỉ ca chiều ngày 05/09/2026.',
      ngayGui: '2026-09-01',
      trangThai: 'DA_DUYET',
      phanHoi: 'Đã duyệt. Giao nhân viên Nguyễn Văn B trực thay.',
    },
    {
      id: 2,
      loaiDon: 'Đề xuất vật tư y tế',
      tieude: 'Bổ sung máy đo huyết áp điện tử tại Bàn tiếp nhận 2',
      noiDung: 'Máy đo huyết áp bàn 2 hiện bị chập chập, đề nghị bổ sung 01 máy mới.',
      ngayGui: '2026-09-02',
      trangThai: 'CHO_DUYET',
      phanHoi: '',
    },
  ]);

  const [form, setForm] = useState({
    loaiDon: 'Đơn xin nghỉ phép',
    tieuDe: '',
    noiDung: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newDon = {
      id: Date.now(),
      loaiDon: form.loaiDon,
      tieude: form.tieuDe,
      noiDung: form.noiDung,
      ngayGui: new Date().toISOString().split('T')[0],
      trangThai: 'CHO_DUYET',
      phanHoi: '',
    };
    setDonList([newDon, ...donList]);
    setSuccessMsg('Đã gửi đơn trình Giám đốc thành công! Trạng thái đang chờ xét duyệt.');
    setShowModal(false);
    setForm({ loaiDon: 'Đơn xin nghỉ phép', tieuDe: '', noiDung: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gửi đơn trình Giám đốc</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tạo và theo dõi đơn xin nghỉ phép, đề xuất thiết bị, đổi ca trình Ban Giám Đốc xét duyệt
          </p>
        </div>

        <MedButton variant="primary" onClick={() => setShowModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Tạo đơn mới
        </MedButton>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-light p-4 text-sm text-success-main border border-success-main/30 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Danh sách đơn đã gửi */}
      <div className="space-y-4">
        {donList.map((item) => (
          <div key={item.id} className="rounded-2xl bg-white p-6 border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                  {item.loaiDon}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">{item.tieude}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Ngày gửi: {formatDate(item.ngayGui)}</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    item.trangThai === 'DA_DUYET'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : item.trangThai === 'TU_CHOI'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {item.trangThai === 'DA_DUYET' ? '● Đã duyệt' : item.trangThai === 'TU_CHOI' ? '● Từ chối' : '⏳ Chờ duyệt'}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/70 p-3 rounded-xl">
              {item.noiDung}
            </p>

            {item.phanHoi && (
              <div className="text-xs text-emerald-800 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                <strong>Phản hồi từ Giám đốc:</strong> {item.phanHoi}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Tạo Đơn */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Soạn Đơn Trình Ban Giám Đốc</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Loại đơn trình *</label>
                <select
                  value={form.loaiDon}
                  onChange={(e) => setForm({ ...form, loaiDon: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Đơn xin nghỉ phép">Đơn xin nghỉ phép</option>
                  <option value="Đề xuất vật tư y tế">Đề xuất vật tư y tế</option>
                  <option value="Đơn xin đổi ca trực">Đơn xin đổi ca trực</option>
                  <option value="Đề xuất cải tiến quy trình">Đề xuất cải tiến quy trình tiếp tân</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tiêu đề đơn *</label>
                <input
                  type="text"
                  required
                  value={form.tieuDe}
                  onChange={(e) => setForm({ ...form, tieuDe: e.target.value })}
                  placeholder="Nhập tiêu đề tóm tắt nội dung trình..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nội dung chi tiết trình Giám đốc *</label>
                <textarea
                  rows={4}
                  required
                  value={form.noiDung}
                  onChange={(e) => setForm({ ...form, noiDung: e.target.value })}
                  placeholder="Mô tả lý do, thời gian hoặc yêu cầu cụ thể..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <MedButton variant="ghost" type="button" onClick={() => setShowModal(false)}>Hủy</MedButton>
                <MedButton variant="primary" type="submit" leftIcon={<Send className="h-4 w-4" />}>
                  Gửi trình Giám đốc
                </MedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

