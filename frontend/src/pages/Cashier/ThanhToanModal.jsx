import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Printer, X, DollarSign, AlertCircle } from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatCurrency } from '../../utils/formatCurrency';

export default function ThanhToanModal({ hoaDonId, onClose, onSuccess }) {
  const [hoaDon, setHoaDon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phuongThuc, setPhuongThuc] = useState('tien_mat');
  const [soTienGiam, setSoTienGiam] = useState(0);
  const [ghiChu, setGhiChu] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [hoaDonId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/thanh-toan/${hoaDonId}`);
      if (res.data) {
        setHoaDon(res.data);
        setSoTienGiam(res.data.soTienGiam || 0);
        if (res.data.phuongThucThanhToan) setPhuongThuc(res.data.phuongThucThanhToan);
      }
    } catch (err) {
      setErrorMsg('Không thể lấy thông tin hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPay = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiPatch(`/thanh-toan/${hoaDonId}/xac-nhan`, {
        phuongThucThanhToan: phuongThuc,
        soTienGiam: Number(soTienGiam),
        ghiChu,
      });
      alert('Thanh toán hóa đơn thành công!');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setErrorMsg(err?.error?.message || 'Có lỗi xảy ra khi xác nhận thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm font-medium text-gray-600">Đang tải chi tiết hóa đơn...</p>
        </div>
      </div>
    );
  }

  const tongTien = hoaDon?.tongTien || 0;
  const thucThu = Math.max(0, tongTien - Number(soTienGiam));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Hóa đơn: {hoaDon?.maHoaDon}</h3>
              <p className="text-xs text-gray-500">
                Bệnh nhân: <span className="font-semibold text-gray-700">{hoaDon?.benhNhan?.hoTen}</span> ({hoaDon?.benhNhan?.maBenhNhan})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700 border border-danger-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chi tiết bảng kê */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Bảng kê chi tiết chi phí</h4>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                  <tr>
                    <th className="px-4 py-2.5">Khoản chi phí</th>
                    <th className="px-4 py-2.5 text-center">SL</th>
                    <th className="px-4 py-2.5 text-right">Đơn giá</th>
                    <th className="px-4 py-2.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {hoaDon?.chiTiet?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.moTa || item.loaiPhi}</td>
                      <td className="px-4 py-3 text-center">{item.soLuong}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.donGia)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.thanhTien)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tính toán thanh toán */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Phương thức thanh toán</label>
                <select
                  value={phuongThuc}
                  onChange={(e) => setPhuongThuc(e.target.value)}
                  disabled={hoaDon?.trangThai === 'da_thanh_toan'}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="tien_mat">💵 Tiền mặt</option>
                  <option value="chuyen_khoan">🏦 Chuyển khoản ngân hàng</option>
                  <option value="the">💳 Thẻ ATM / QTM</option>
                  <option value="vnpay">📲 VNPay QR</option>
                  <option value="momo">📱 Ví MoMo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Ghi chú thanh toán</label>
                <input
                  type="text"
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  disabled={hoaDon?.trangThai === 'da_thanh_toan'}
                  placeholder="Ghi chú thêm (nếu có)..."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tổng tiền dịch vụ:</span>
                <span className="font-medium">{formatCurrency(tongTien)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Giảm giá / Chiết khấu:</span>
                <input
                  type="number"
                  min="0"
                  value={soTienGiam}
                  onChange={(e) => setSoTienGiam(e.target.value)}
                  disabled={hoaDon?.trangThai === 'da_thanh_toan'}
                  className="w-28 rounded border border-gray-300 p-1 text-right text-sm font-semibold"
                />
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Thực thu:</span>
                <span className="text-xl font-bold text-primary-600">{formatCurrency(thucThu)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t px-6 py-4 bg-gray-50 rounded-b-2xl">
          <MedButton variant="ghost" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
            In hóa đơn
          </MedButton>

          <div className="flex gap-2">
            <MedButton variant="secondary" onClick={onClose}>
              Đóng
            </MedButton>
            {hoaDon?.trangThai !== 'da_thanh_toan' && (
              <MedButton
                variant="primary"
                loading={submitting}
                onClick={handleConfirmPay}
                leftIcon={<CheckCircle className="h-4 w-4" />}
              >
                Xác nhận thu tiền
              </MedButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

