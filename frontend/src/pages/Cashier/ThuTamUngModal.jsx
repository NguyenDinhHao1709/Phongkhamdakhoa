import { useEffect, useState } from 'react';
import { Wallet, X, CheckCircle } from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatCurrency } from '../../utils/formatCurrency';

// Thu tạm ứng cho bệnh nhân tiếp nhận tại quầy; thu xong bệnh nhân mới vào hàng đợi bác sĩ
export default function ThuTamUngModal({ hoaDon, onClose, onSuccess }) {
  const laCls = Boolean(hoaDon?.laPhiCls);
  // Phiếu CLS: phần đã cấn trừ từ tạm ứng dư (soTienGiam) không phải thu lại
  const canThu = Math.max(0, Math.round(Number(hoaDon?.tongTien) || 0) - (laCls ? Math.round(Number(hoaDon?.soTienGiam) || 0) : 0));
  // Số thu lấy đúng theo phiếu (giá dịch vụ / phí khám đã cấu hình, trừ BHYT và cọc), thu ngân không tự nhập
  const [bangKe, setBangKe] = useState(null);
  const [phuongThuc, setPhuongThuc] = useState('tien_mat');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!hoaDon?.id) return;
    apiGet(`/thanh-toan/${hoaDon.id}`)
      .then((res) => setBangKe(res?.data?.chiTiet || []))
      .catch(() => setBangKe([]));
  }, [hoaDon?.id]);

  const handleSubmit = async () => {
    if (!(canThu > 0)) {
      setErrorMsg('Phiếu này không còn khoản nào phải thu');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiPatch(`/thanh-toan/hoa-don/${hoaDon.id}/thu-tam-ung`, {
        soTien: canThu,
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
              <h3 className="font-bold text-gray-900">{laCls ? 'Thu phí cận lâm sàng' : 'Thu tạm ứng viện phí'}</h3>
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
            {laCls
              ? 'Kỹ thuật viên chỉ thực hiện cận lâm sàng sau khi bệnh nhân đóng phí. Khám xong, hệ thống tự trừ khoản này vào viện phí.'
              : 'Bệnh nhân chỉ vào hàng đợi bác sĩ sau khi đóng tạm ứng. Khám xong, hệ thống tự trừ tạm ứng vào viện phí: thiếu thì thu thêm, dư thì hoàn trả.'}
          </p>

          <div>
            <p className="text-xs font-bold text-gray-700 mb-1">Bảng kê</p>
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm">
              {bangKe === null ? (
                <p className="px-3 py-2.5 text-xs text-gray-400">Đang tải...</p>
              ) : bangKe.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-gray-400">{laCls ? 'Phí cận lâm sàng' : 'Tạm ứng phí khám'}</p>
              ) : bangKe.map((ct, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className={Number(ct.thanhTien) < 0 ? 'text-teal-700' : 'text-gray-800'}>{ct.moTa}</span>
                  <span className={`font-semibold whitespace-nowrap ${Number(ct.thanhTien) < 0 ? 'text-teal-700' : 'text-gray-900'}`}>
                    {formatCurrency(Number(ct.thanhTien))}
                  </span>
                </div>
              ))}
              {laCls && Number(hoaDon?.soTienGiam) > 0 && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-teal-700">
                  <span>Cấn trừ tạm ứng còn dư</span>
                  <span className="font-semibold whitespace-nowrap">{formatCurrency(-Number(hoaDon.soTienGiam))}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50 border border-violet-200 px-3.5 py-3">
              <span className="text-sm font-bold text-gray-700">Số tiền phải thu</span>
              <span className="text-xl font-black text-violet-700">{formatCurrency(canThu)}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {laCls
                ? 'Theo giá dịch vụ đã cấu hình, đã trừ BHYT và tạm ứng còn dư.'
                : 'Theo phí khám đã cấu hình, đã trừ BHYT và tiền cọc đặt lịch.'}
            </p>
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
