import { useState, useEffect } from 'react';
import {
  Bell, CheckCircle2, AlertTriangle, ShieldCheck, Eye,
  ArrowRight, Clock, Wallet, Check, Sparkles
} from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import InBienBanChotCaModal from './InBienBanChotCaModal';

export default function CaTrucBanner({ onShiftAccepted }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [selectedRecordToView, setSelectedRecordToView] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchShiftInfo = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/thanh-toan/chot-ca/ca-hien-tai');
      const shiftData = res?.data?.data !== undefined ? res.data.data : (res?.data !== undefined ? res.data : res);
      if (shiftData) {
        setData(shiftData);
      }
    } catch (err) {
      console.error('Lỗi lấy thông tin ca trực:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftInfo();
  }, []);

  const handleAcceptShift = async (chotCaId) => {
    try {
      setAccepting(true);
      await apiPost(`/thanh-toan/chot-ca/${chotCaId}/xac-nhan-nhan-ca`);
      setSuccessMsg('Tiếp nhận bàn giao ca và mở két tiền thành công!');
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchShiftInfo();
      if (onShiftAccepted) onShiftAccepted();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Không thể xác nhận nhận ca');
    } finally {
      setAccepting(false);
    }
  };

  const banGiao = data?.banGiaoChoNhan;
  const caHienTai = data?.caHienTai;

  if (loading && !data) return null;

  return (
    <div className="space-y-3">
      {/* ─── 1. BANNER CẢNH BÁO: CÓ BIÊN BẢN BÀN GIAO ĐANG CHỜ TIẾP NHẬN ─── */}
      {banGiao && (
        <div className="rounded-2xl border-2 border-amber-300 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 shadow-md animate-fade-in">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="rounded-2xl bg-amber-500 p-2.5 text-white shadow-sm ring-4 ring-amber-100">
                <Bell className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 uppercase tracking-wide">
                  🔔 Bàn Giao Ca Trực Đang Chờ Bạn Tiếp Nhận
                </div>
                <h3 className="mt-1 text-base font-black text-gray-900">
                  Thu ngân {banGiao.thuNgan?.hoTen || 'ca trước'} đã chốt ca và bàn giao két tiền
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700">
                  <span>
                    Mã biên bản: <b className="font-mono text-amber-900">{banGiao.maChotCa}</b>
                  </span>
                  <span>•</span>
                  <span>
                    Thời gian bàn giao: <b>{formatDateTime(banGiao.thoiGianKetThuc || banGiao.taoLuc)}</b>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    <Wallet className="h-3.5 w-3.5" /> Tiền thực kiểm kê: {formatCurrency(banGiao.tienMatThucTe)}
                  </span>
                </div>
                {banGiao.ghiChu && (
                  <p className="mt-1.5 text-xs italic text-gray-600 bg-white/70 p-1.5 rounded-lg border border-amber-200">
                    Ghi chú từ ca trước: "{banGiao.ghiChu}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRecordToView(banGiao)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100/60 active:scale-95 transition-all cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>Xem Chi Tiết Mệnh Giá</span>
              </button>
              <button
                type="button"
                disabled={accepting}
                onClick={() => handleAcceptShift(banGiao.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-5 py-2 text-xs font-black text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-75"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{accepting ? 'Đang tiếp nhận...' : 'Xác Nhận Nhận Két & Mở Ca'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo tiếp nhận thành công */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500 p-3 text-xs font-bold text-white shadow-xs animate-fade-in">
          <Check className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── 2. HUY HIỆU: CA TRỰC ĐANG HOẠT ĐỘNG (ACTIVE SHIFT BADGE) ─── */}
      {!banGiao && caHienTai && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50/80 to-teal-50/80 px-4 py-2.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span>
              <b>Ca trực đang hoạt động:</b> Tiếp nhận ca lúc{' '}
              <b className="font-mono text-emerald-950">
                {formatDateTime(caHienTai.thoiGianNhanCa || caHienTai.thoiGianBatDau || caHienTai.taoLuc)}
              </b>
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-700">
              Tiền mặt nhận đầu ca:{' '}
              <b className="font-bold text-emerald-800">{formatCurrency(caHienTai.tienMatThucTe)}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedRecordToView(caHienTai)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" /> Xem biên bản đầu ca ({caHienTai.maChotCa})
            </button>
          </div>
        </div>
      )}

      {/* Modal xem trước biên bản bàn giao nếu thu ngân muốn kiểm tra */}
      {selectedRecordToView && (
        <InBienBanChotCaModal
          record={selectedRecordToView}
          onClose={() => setSelectedRecordToView(null)}
        />
      )}
    </div>
  );
}

