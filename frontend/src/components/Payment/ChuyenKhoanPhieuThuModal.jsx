import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle2, QrCode, Copy, Check } from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import BankAppLinks from './BankAppLinks';
import { STK_PHONG_KHAM } from '../../utils/constants';

/**
 * Chuyển khoản VietQR (PayOS) cho phiếu tạm ứng phí khám / phí cận lâm sàng. Tiền vào là hệ thống tự ghi nhận
 * (webhook + đối soát), bệnh nhân không phải ra quầy thu ngân.
 * phieu: { id, maHoaDon, soTien, moTa }
 */
export default function ChuyenKhoanPhieuThuModal({ phieu, onClose, onSuccess }) {
  const [payData, setPayData] = useState(null);
  const [loi, setLoi] = useState('');
  const [daThanhToan, setDaThanhToan] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!phieu?.id) return undefined;
    let active = true;
    apiPost(`/payos/hoa-don/${phieu.id}/tao-link`)
      .then((res) => {
        if (!active) return;
        const data = res?.data ?? res;
        if (data?.daThanhToan) {
          setDaThanhToan(true);
          onSuccess?.();
        } else if (data?.qrCode) {
          setPayData(data);
        } else {
          setLoi('Không tạo được mã QR, vui lòng đóng tại quầy thu ngân.');
        }
      })
      .catch((err) => active && setLoi(err?.error?.message || err?.message || 'Không tạo được mã QR, vui lòng đóng tại quầy thu ngân.'));
    return () => {
      active = false;
    };
  }, [phieu?.id]);

  // Kiểm tra 4 giây/lần để báo bệnh nhân ngay khi tiền vào
  useEffect(() => {
    if (!phieu?.id || !payData?.orderCode || daThanhToan) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await apiGet(`/payos/hoa-don/${phieu.id}/kiem-tra`);
        if ((res?.data ?? res)?.isPaid) {
          setDaThanhToan(true);
          onSuccess?.();
        }
      } catch {
        // bỏ qua lỗi mạng khi kiểm tra
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [phieu?.id, payData?.orderCode, daThanhToan]);

  if (!phieu) return null;

  const copy = (text, key) => {
    navigator.clipboard.writeText(String(text));
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const dong = (label, value, key) => (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
      <div>
        <span className="block text-[10px] uppercase font-bold text-gray-500">{label}</span>
        <span className="font-bold text-gray-900">{value}</span>
      </div>
      <button type="button" onClick={() => copy(value, key)} className="p-1.5 rounded-md hover:bg-white cursor-pointer" title="Sao chép">
        {copied === key ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 my-auto">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Chuyển khoản</h3>
              <p className="text-xs text-gray-500">{phieu.moTa} • {phieu.maHoaDon}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {daThanhToan ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-emerald-700">Đã nhận thanh toán {formatCurrency(phieu.soTien)}</p>
              <p className="text-gray-600">Bạn không cần ra quầy thu ngân. Vui lòng theo dõi tiến độ khám trên màn hình.</p>
            </div>
          ) : loi ? (
            <p className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{loi}</p>
          ) : !payData ? (
            <div className="py-10 text-center text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
              Đang tạo mã QR...
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2">
                <QRCodeSVG value={payData.qrCode} size={200} level="M" className="rounded-lg" />
                <p className="text-lg font-bold text-blue-700">{formatCurrency(payData.amount)}</p>
                <p className="text-gray-500 text-center">Quét mã bằng app ngân hàng. Tiền vào là hệ thống tự xác nhận.</p>
              </div>
              <BankAppLinks
                accountNo={payData.accountNumber}
                bank={payData.bin}
                amount={payData.amount}
                content={payData.description}
                accountName={payData.accountName}
              />
              <div className="space-y-2">
                {dong('Số tài khoản', STK_PHONG_KHAM, 'stk')}
                {dong('Chủ tài khoản', payData.accountName, 'ten')}
                {dong('Nội dung (giữ nguyên)', payData.description, 'nd')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
