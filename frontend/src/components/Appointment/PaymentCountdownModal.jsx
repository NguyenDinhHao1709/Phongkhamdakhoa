import { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Timer,
  X,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiGet, apiPost, apiPatch } from '../../services/api';

export default function PaymentCountdownModal({
  lichHenId,
  maLichHen,
  soTien = 40000,
  title = 'Xác nhận thanh toán',
  isTelehealth = false,
  hanThanhToan,
  onPaid,
  onCancelled,
  onPaymentError,
}) {
  const getInitialSeconds = () => {
    if (hanThanhToan) {
      const diff = Math.floor((new Date(hanThanhToan).getTime() - Date.now()) / 1000);
      // Chuẩn thời gian giữ chỗ thanh toán tối đa 15 phút (900 giây)
      return Math.min(15 * 60, Math.max(0, diff));
    }
    return 15 * 60; // 15 phút mặc định
  };

  const initialTotalSeconds = useRef(getInitialSeconds()).current || 15 * 60;
  const [secondsLeft, setSecondsLeft] = useState(getInitialSeconds());
  const [payData, setPayData] = useState(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const countdownIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const cancelledRef = useRef(false);

  // Thông tin ngân hàng phòng khám chính thức liên kết cổng thanh toán PayOS
  const cleanMa = (maLichHen || `LH${lichHenId}`).replace(/[^a-zA-Z0-9]/g, '');
  const displayAccountName = payData?.accountName || 'NGUYEN DINH HAO';
  const displayAccountNumber = '2729999996789';
  const vaAccountNumber = payData?.accountNumber || 'VQRQAMVOG0606';
  const displayBin = payData?.bin || '970422';
  const displayAmount = Number(payData?.amount || soTien || 40000);
  const displayDesc = payData?.description || `Coc ${cleanMa}`.slice(0, 25);

  // Link VietQR Napas dự phòng tức thì nếu chưa tải xong mã QR PayOS
  const fallbackQrImageUrl = `https://img.vietqr.io/image/${displayBin}-${vaAccountNumber}-compact2.png?amount=${displayAmount}&addInfo=${encodeURIComponent(displayDesc)}&accountName=${encodeURIComponent(displayAccountName)}`;

  // 1. Kết nối ngầm với PayOS ngay khi mở Modal để đăng ký đơn hàng & lấy orderCode
  useEffect(() => {
    let active = true;

    const connectPayOS = async () => {
      try {
        const res = await apiPost(`/payos/tao-link/${lichHenId}`);
        const realData = res?.data?.data || res?.data || res;
        if (active && (realData?.orderCode || realData?.checkoutUrl)) {
          setPayData(realData);
        }
      } catch (err) {
        console.warn('Lỗi kết nối nền PayOS:', err?.message || err);
      }
    };

    if (lichHenId) {
      connectPayOS();
    }

    return () => {
      active = false;
    };
  }, [lichHenId]);

  // 2. Đồng hồ đếm ngược 15 phút
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdownIntervalRef.current);
          if (!cancelledRef.current && !isPaidSuccess) {
            cancelledRef.current = true;
            handleAutoCancel();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(countdownIntervalRef.current);
  }, [isPaidSuccess]);

  // 3. Tự động kiểm tra trạng thái thanh toán (Polling mỗi 2.5 giây khi có orderCode)
  useEffect(() => {
    if (!payData?.orderCode || isPaidSuccess) return;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiGet(`/payos/kiem-tra/${payData.orderCode}`);
        const status = res?.data?.status || res?.status;
        if (status === 'PAID') {
          handlePaymentSuccess();
        }
      } catch (err) {
        // bỏ qua lỗi polling mạng
      }
    }, 2500);

    return () => clearInterval(pollingIntervalRef.current);
  }, [payData?.orderCode, isPaidSuccess]);

  const handlePaymentSuccess = async () => {
    if (isPaidSuccess) return;
    setIsPaidSuccess(true);
    clearInterval(countdownIntervalRef.current);
    clearInterval(pollingIntervalRef.current);
    cancelledRef.current = true;

    setTimeout(async () => {
      try {
        await onPaid();
      } catch (err) {
        onPaymentError?.(err);
      }
    }, 1000);
  };

  const handleAutoCancel = async () => {
    clearInterval(countdownIntervalRef.current);
    clearInterval(pollingIntervalRef.current);
    cancelledRef.current = true;
    try {
      await apiPatch(`/lich-hen/${lichHenId}/huy`, { lyDoHuy: 'Hết thời gian thanh toán' });
    } catch {
      // ignore
    }
    onCancelled?.();
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const displayTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const pct = Math.min(100, Math.max(0, (secondsLeft / initialTotalSeconds) * 100));
  const isUrgent = secondsLeft <= 120; // 2 phút cuối

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-6 border border-gray-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">
                Mã lịch hẹn: <span className="font-mono font-bold text-primary-600">{maLichHen}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoCancel}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Khi đã thanh toán thành công */}
        {isPaidSuccess ? (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-emerald-700">Thanh toán thành công!</h3>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              Hệ thống đã nhận tiền vào tài khoản phòng khám. Đang tạo phiếu hẹn và hoàn tất đăng ký...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
            </div>
          </div>
        ) : (
          <>
            {/* Countdown Box */}
            <div className={`rounded-2xl p-3.5 mb-3.5 text-center ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-primary-50/70 border border-primary-200/70'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold flex items-center gap-1.5 ${isUrgent ? 'text-red-600' : 'text-primary-700'}`}>
                  <Timer className="h-4 w-4" />
                  Thời gian giữ chỗ thanh toán
                </span>
                <span className={`text-2xl font-black font-mono tracking-tight ${isUrgent ? 'text-red-600' : 'text-primary-700'}`}>
                  {displayTime}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-primary-600'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* VietQR Box Hiển Thị Tức Thì (< 0.1s) */}
            <div className="space-y-3.5 mb-3.5">
              <div className="bg-gradient-to-br from-primary-900 to-indigo-950 p-4 rounded-2xl text-white text-center shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-primary-200 mb-2 px-1">
                  <span className="flex items-center gap-1 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> VietQR Napas 247
                  </span>
                  <span className="bg-primary-800/80 px-2 py-0.5 rounded text-[10px] font-mono">
                    PayOS Gateway
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-2.5 rounded-xl inline-block shadow-md mx-auto my-1">
                  {payData?.qrCode ? (
                    <QRCodeSVG
                      value={payData.qrCode}
                      size={170}
                      level="M"
                      className="rounded"
                    />
                  ) : (
                    <img
                      src={fallbackQrImageUrl}
                      alt="VietQR Chuyển khoản"
                      className="w-[170px] h-[170px] object-contain rounded"
                      loading="eager"
                    />
                  )}
                </div>

                <p className="text-xs text-primary-200 mt-1.5 font-medium">
                  Mở app ngân hàng quét mã QR để thanh toán chính xác 100%
                </p>
              </div>

              {/* Chi tiết tài khoản ngân hàng */}
              <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 text-xs space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Ngân hàng:</span>
                  <span className="font-bold text-gray-900">MB Bank (Quân Đội)</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Chủ tài khoản:</span>
                  <span className="font-bold text-gray-900 uppercase">{displayAccountName}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-primary-700 text-sm">{displayAccountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(displayAccountNumber, 'acc')}
                      className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedField === 'acc' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-rose-600 text-sm">
                      {displayAmount.toLocaleString('vi-VN')} đ
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(displayAmount), 'amount')}
                      className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedField === 'amount' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500">Nội dung chuyển:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-gray-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                      {displayDesc}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(displayDesc, 'desc')}
                      className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedField === 'desc' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Trạng thái lắng nghe thanh toán realtime chuẩn ERP y tế */}
              <div className="flex items-center justify-center text-xs px-3.5 py-2.5 bg-emerald-50/90 rounded-xl border border-emerald-200/80 text-emerald-800 text-center shadow-xs">
                <span className="flex items-center justify-center gap-2 font-medium">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Đang chờ thanh toán... Hệ thống sẽ tự động xác nhận sau khi nhận tiền
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {payData?.checkoutUrl && (
                <a
                  href={payData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                  <ExternalLink className="h-4 w-4" />
                  Mở trang thanh toán PayOS (Thẻ / ATM)
                </a>
              )}

              <button
                type="button"
                onClick={handleAutoCancel}
                className="w-full bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 py-2.5 rounded-2xl text-xs font-semibold border border-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
                Hủy và đóng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
