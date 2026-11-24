import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Save, Trash2, X } from 'lucide-react';
import { apiPost, apiPut, apiDelete } from '../../services/api';
import { caQuaDem, sinhSlotCa } from '../../utils/caLamViec';

const CA_MOI = { id: null, key: null, tenCa: '', gioBatDau: '18:00', gioKetThuc: '21:00', thoiLuongPhut: 60 };

const chuanHoa = (ca) => ({
  id: ca.id,
  key: ca.id,
  tenCa: ca.tenCa || '',
  gioBatDau: String(ca.gioBatDau || '').slice(0, 5),
  gioKetThuc: String(ca.gioKetThuc || '').slice(0, 5),
  thoiLuongPhut: Number(ca.thoiLuongPhut) || 60,
});

const loiApi = (err) => {
  const m = err?.error?.message || err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
  return Array.isArray(m) ? m.join('\n') : m || 'Có lỗi xảy ra';
};

/** Giám đốc cấu hình ca làm việc dùng chung: tên ca, giờ bắt đầu/kết thúc, thời lượng mỗi lượt khám */
export default function CauHinhCaModal({ caList, onClose }) {
  const queryClient = useQueryClient();
  const [dsCa, setDsCa] = useState(() => caList.map(chuanHoa));

  const daLuu = (res) => {
    queryClient.invalidateQueries({ queryKey: ['quan-ly-lich-lam-viec'] });
    alert(res?.message || res?.data?.message || 'Đã lưu');
  };

  const luuMutation = useMutation({
    mutationFn: ({ id, tenCa, gioBatDau, gioKetThuc, thoiLuongPhut }) => {
      const body = { tenCa, gioBatDau, gioKetThuc, thoiLuongPhut: Number(thoiLuongPhut) };
      return id ? apiPut(`/quan-ly/ca-lam-viec/${id}`, body) : apiPost('/quan-ly/ca-lam-viec', body);
    },
    onSuccess: (res, ca) => {
      const saved = res?.data?.data || res?.data;
      if (!ca.id && saved?.id) setDsCa((ds) => ds.map((c) => (c.key === ca.key ? chuanHoa(saved) : c)));
      daLuu(res);
    },
    onError: (err) => alert(`⚠️ Không thể lưu ca:\n${loiApi(err)}`),
  });

  const xoaMutation = useMutation({
    mutationFn: (id) => apiDelete(`/quan-ly/ca-lam-viec/${id}`),
    onSuccess: (res, id) => {
      setDsCa((ds) => ds.filter((c) => c.id !== id));
      daLuu(res);
    },
    onError: (err) => alert(`⚠️ Không thể xóa ca:\n${loiApi(err)}`),
  });

  const sua = (ca, field, value) => setDsCa((ds) => ds.map((c) => (c === ca ? { ...c, [field]: value } : c)));

  const xoa = (ca) => {
    if (!ca.id) return setDsCa((ds) => ds.filter((c) => c !== ca));
    if (window.confirm(`Xóa "${ca.tenCa}"? Chỉ xóa được ca chưa từng được phân công.`)) xoaMutation.mutate(ca.id);
  };

  const dangXuLy = luuMutation.isPending || xoaMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-3xl p-5 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary-600" /> Cấu hình ca làm việc
            </h3>
            <p className="text-[11px] text-gray-500">
              Áp dụng chung cho mọi nhân viên. Khung giờ bệnh nhân đặt lịch được chia từ giờ ca theo thời lượng mỗi lượt khám.
              Giờ "Đến" nhỏ hơn giờ "Từ" là ca qua đêm, kết thúc sáng hôm sau (VD trực 17:00 – 08:00).
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {dsCa.map((ca) => {
            const slots = sinhSlotCa(ca);
            const quaDem = caQuaDem(ca);
            return (
              <div key={ca.key} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end">
                  <label className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="font-bold text-gray-700">Tên ca</span>
                    <input
                      value={ca.tenCa}
                      maxLength={50}
                      onChange={(e) => sua(ca, 'tenCa', e.target.value)}
                      placeholder="VD: Ca Tối"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-bold text-gray-700">Từ</span>
                    <input type="time" value={ca.gioBatDau} onChange={(e) => sua(ca, 'gioBatDau', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5" />
                  </label>
                  <label className="space-y-1">
                    <span className="font-bold text-gray-700">
                      Đến{quaDem && <span className="ml-1 font-semibold text-indigo-600">(hôm sau)</span>}
                    </span>
                    <input type="time" value={ca.gioKetThuc} onChange={(e) => sua(ca, 'gioKetThuc', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5" />
                  </label>
                  <label className="space-y-1">
                    <span className="font-bold text-gray-700">Phút / lượt</span>
                    <input
                      type="number"
                      min={10}
                      max={240}
                      step={5}
                      value={ca.thoiLuongPhut}
                      onChange={(e) => sua(ca, 'thoiLuongPhut', e.target.value)}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1.5"
                    />
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={dangXuLy}
                      onClick={() => luuMutation.mutate(ca)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-bold cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" /> Lưu
                    </button>
                    <button
                      type="button"
                      disabled={dangXuLy}
                      onClick={() => xoa(ca)}
                      className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg cursor-pointer"
                      title="Xóa ca"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  {slots.length ? `${slots.length} lượt khám: ${slots.join(', ')}` : 'Ca quá ngắn so với thời lượng mỗi lượt — chưa có lượt khám nào.'}
                  {quaDem && slots.length > 0 && ' — ca qua đêm: bệnh nhân đặt lịch đến 24:00, sau 0h là trực (không nhận đặt lịch).'}
                </p>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setDsCa((ds) => [...ds, { ...CA_MOI, key: `moi-${Date.now()}` }])}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-primary-300 text-primary-700 hover:bg-primary-50 rounded-lg font-bold cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm ca
        </button>
      </div>
    </div>
  );
}
