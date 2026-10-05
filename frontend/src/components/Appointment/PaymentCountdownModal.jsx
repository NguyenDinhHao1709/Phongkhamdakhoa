import { useState, useEffect, useRef } from 'react';
import { CreditCard, Timer, X, ShieldCheck } from 'lucide-react';
import { apiPatch } from '../../services/api';

const PAYMENT_SECONDS = 10 * 60; // 10 phút

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
      return Math.max(0, diff);
    }
    return 15 * 60; // 15 phút mặc định
  };

  const initialTotalSeconds = useRef(getInitialSeconds()).current || 15 * 60;
  const [secondsLeft, setSecondsLeft] = useState(getInitialSeconds());
  const intervalRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          if (!cancelledRef.current) {
            cancelledRef.current = true;
            handleAutoCancel();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleAutoCancel = async () => {
    try {
      await apiPatch(`/lich-hen/${lichHenId}/huy`, { lyDoHuy: 'Hết thời gian thanh toán' });
    } catch {
      // ignore
    }
    onCancelled?.();
  };

  const handlePay = async () => {
    clearInterval(intervalRef.current);
    cancelledRef.current = true;
    try {
      await onPaid();
    } catch (err) {
      cancelledRef.current = false;
      onPaymentError?.(err);
    }
  };

  const hours = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;
  
  const displayTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const pct = Math.min(100, Math.max(0, (secondsLeft / initialTotalSeconds) * 100));
  const isUrgent = secondsLeft <= 120; // 2 phút cuối

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">
              Mã lịch hẹn: <span className="font-mono font-bold text-primary-600">{maLichHen}</span>
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div className={`rounded-2xl p-5 mb-5 text-center ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-primary-50/60 border border-primary-200/60'}`}>
          <p className={`text-xs font-semibold mb-2 flex items-center justify-center gap-1.5 ${isUrgent ? 'text-red-600' : 'text-primary-700'}`}>
            <Timer className="h-4 w-4" />
            Thời gian còn lại để hoàn tất thanh toán
          </p>
          <p className={`text-4xl sm:text-5xl font-black font-mono tabular-nums tracking-tight ${isUrgent ? 'text-red-600' : 'text-primary-700'}`}>
            {displayTime}
          </p>
          {/* Progress bar */}
          <div className="mt-3.5 h-2 bg-gray-200/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-primary-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isUrgent && (
            <p className="mt-2 text-xs text-red-600 font-medium">⚠ Sắp hết thời gian — vui lòng hoàn tất giao dịch!</p>
          )}
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200/80">
          <div>
            <span className="text-xs text-gray-500 block">
              {isTelehealth ? 'Phí tư vấn khám trực tuyến:' : 'Tạm ứng phí khám (1/5):'}
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Cổng thanh toán bảo mật
            </span>
          </div>
          <span className="text-xl font-black text-primary-700">
            {Number(soTien).toLocaleString('vi-VN')} đ
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-5 text-center leading-relaxed">
          {isTelehealth
            ? 'Theo quy định bảo mật Telemedicine, cuộc gọi video chỉ kích hoạt sau khi thanh toán thành công.'
            : 'Khoản tạm ứng 40.000 đ (1/5 phí khám 200.000 đ) để xác nhận giữ chỗ bác sĩ. Nếu quá thời hạn mà chưa thanh toán, lịch hẹn sẽ tự động bị hủy.'}
        </p>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handlePay}
            className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Xác nhận thanh toán ngay (VNPay / MoMo)
          </button>
          <button
            onClick={handleAutoCancel}
            className="w-full bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 py-2.5 rounded-2xl text-xs font-semibold border border-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
            Hủy và đóng
          </button>
        </div>
      </div>
    </div>
  );
}
