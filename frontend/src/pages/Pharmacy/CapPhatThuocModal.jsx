import { useState, useEffect } from 'react';
import { Pill, CheckCircle, X, AlertTriangle, PackageCheck } from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function CapPhatThuocModal({ donThuocId, onClose, onSuccess }) {
  const [donThuoc, setDonThuoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [donThuocId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/nha-thuoc/don-thuoc/${donThuocId}`);
      if (res.data) setDonThuoc(res.data);
    } catch (err) {
      setErrorMsg('Không thể lấy chi tiết đơn thuốc');
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiPost(`/nha-thuoc/don-thuoc/${donThuocId}/cap-phat`);
      alert('Xuất kho & Cấp phát đơn thuốc thành công!');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setErrorMsg(err?.error?.message || 'Lỗi khi cấp phát đơn thuốc');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm font-medium text-gray-600">Đang tra cứu tồn kho FEFO...</p>
        </div>
      </div>
    );
  }

  const checkInsufficient = donThuoc?.chiTiet?.some((i) => !i.duTonKho);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-mint text-medical-teal">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Đơn thuốc: {donThuoc?.maDonThuoc}</h3>
              <p className="text-xs text-gray-500">
                Bác sĩ kê: <span className="font-semibold text-gray-700">{donThuoc?.bacSi || 'N/A'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700 border border-danger-200">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {checkInsufficient && (
            <div className="flex items-center gap-2 rounded-lg bg-warning-light p-3 text-xs font-medium text-warning-main border border-warning-main/30">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Cảnh báo: Có thuốc không đủ tồn kho khả dụng để xuất đơn!</span>
            </div>
          )}

          {/* Table chi tiết đơn thuốc */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Danh sách thuốc kê đơn</h4>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                  <tr>
                    <th className="px-4 py-2.5">Tên thuốc</th>
                    <th className="px-4 py-2.5 text-center">ĐVT</th>
                    <th className="px-4 py-2.5 text-center">Số lượng</th>
                    <th className="px-4 py-2.5">Lô đề xuất (FEFO)</th>
                    <th className="px-4 py-2.5 text-right">Đơn giá</th>
                    <th className="px-4 py-2.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {donThuoc?.chiTiet?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.tenThuoc}</div>
                        <div className="text-xs text-gray-500">HDSD: {item.lieuDung || 'Theo chỉ định'}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-gray-600">{item.donViTinh}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{item.soLuong}</td>
                      <td className="px-4 py-3">
                        {item.loThuocGợiÝ ? (
                          <div className="text-xs">
                            <span className="font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                              Lô {item.loThuocGợiÝ.maLo}
                            </span>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              Hạn dùng: {formatDate(item.loThuocGợiÝ.ngayHetHan)} (Còn: {item.loThuocGợiÝ.soLuongTon})
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-danger-main font-semibold">❌ Tồn kho 0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">{formatCurrency(item.giaBan)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.thanhTien)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 pt-2 border-t text-sm">
            <span className="font-medium text-gray-600">Tổng giá trị đơn thuốc:</span>
            <span className="text-xl font-bold text-primary-600">{formatCurrency(donThuoc?.tongTienDonThuoc)}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t px-6 py-4 bg-gray-50 rounded-b-2xl">
          <MedButton variant="secondary" onClick={onClose}>
            Đóng
          </MedButton>
          {donThuoc?.trangThai !== 'da_cap_phat' && (
            <MedButton
              variant="primary"
              loading={submitting}
              disabled={checkInsufficient}
              onClick={handleDispense}
              leftIcon={<PackageCheck className="h-4 w-4" />}
            >
              Xác nhận Xuất kho & Cấp phát
            </MedButton>
          )}
        </div>
      </div>
    </div>
  );
}

