import { useState, useEffect } from 'react';
import { Wallet, X, CheckCircle } from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatCurrency } from '../../utils/formatCurrency';

// Thu tạm ứng cho bệnh nhân tiếp nhận tại quầy; thu xong bệnh nhân mới vào hàng đợi bác sĩ
export default function ThuTamUngModal({ hoaDon, onClose, onSuccess }) {
  const [soTien, setSoTien] = useState('');
  const [phuongThuc, setPhuongThuc] = useState('tien_mat');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Gợi ý số tiền theo cấu hình tiền cọc khám trực tiếp (thu ngân sửa được)
  useEffect(() => {
    apiGet('/quan-ly/cau-hinh-tien-coc')
      .then((res) => {
        const raw = res?.data?.data || res?.data || res;
        const items = Array.isArray(raw) ? raw : [];
        const cfg = items.find((x) => x.loaiHinhThuc === 'truc_tiep');
        if (cfg?.soTienCoc) setSoTien((prev) => prev || String(Math.round(Number(cfg.soTienCoc))));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!(Number(soTien) > 0)) {
      setErrorMsg('Vui lòng nhập số tiền tạm ứng lớn hơn 0');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiPatch(`/thanh-toan/hoa-don/${hoaDon.id}/thu-tam-ung`, {
        soTien: Number(soTien),
        phuongThucThanhToan: phuongThuc,
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Không thu được tạm ứng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Thu tạm ứng viện phí</h3>
              <p className="text-xs text-gray-500">
                {hoaDon.maHoaDon} • {hoaDon.benhNhan?.hoTen}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-600 bg-violet-50 border border-violet-200 rounded-lg p-2.5">
            Bệnh nhân chỉ vào hàng đợi bác sĩ sau khi đóng tạm ứng. Khám xong, hệ thống tự trừ tạm ứng vào viện phí: thiếu thì thu thêm, dư thì hoàn trả.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Số tiền tạm ứng (đ)</label>
            <input
              type="number"
              min="0"
              step="10000"
              value={soTien}
              onChange={(e) => setSoTien(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-lg font-bold text-right focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {Number(soTien) > 0 && (
              <p className="text-right text-xs text-gray-500 mt-1">{formatCurrency(Number(soTien))}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Phương thức</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['tien_mat', 'Tiền mặt'],
                ['chuyen_khoan', 'Chuyển khoản'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPhuongThuc(value)}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer ${
                    phuongThuc === value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4 bg-gray-50 rounded-b-2xl">
          <MedButton variant="secondary" onClick={onClose}>
            Đóng
          </MedButton>
          <MedButton variant="primary" loading={submitting} onClick={handleSubmit} leftIcon={<CheckCircle className="h-4 w-4" />}>
            Xác nhận đã thu
          </MedButton>
        </div>
      </div>
    </div>
  );
}
