import { useState, useEffect, useMemo } from 'react';
import {
  X, ShieldCheck, Coins, CheckCircle2, AlertTriangle,
  User, Clock, Calculator, ArrowRight, DollarSign, Wallet
} from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import useAuthStore from '../../store/authStore';

const DENOMINATIONS = [
  { key: '500k', value: 500000, label: '500.000 đ' },
  { key: '200k', value: 200000, label: '200.000 đ' },
  { key: '100k', value: 100000, label: '100.000 đ' },
  { key: '50k', value: 50000, label: '50.000 đ' },
  { key: '20k', value: 20000, label: '20.000 đ' },
  { key: '10k', value: 10000, label: '10.000 đ' },
  { key: '5k', value: 5000, label: '5.000 đ' },
  { key: '2k', value: 2000, label: '2.000 đ' },
  { key: '1k', value: 1000, label: '1.000 đ' },
];

export default function ChotCaModal({ onClose, onSuccess, defaultSystemCash = 0 }) {
  const { user } = useAuthStore();

  // Thời gian ca
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentTimeStr = now.toTimeString().slice(0, 5);

  const [thoiGianBatDau, setThoiGianBatDau] = useState(`${todayStr}T07:00`);
  const [thoiGianKetThuc, setThoiGianKetThuc] = useState(`${todayStr}T${currentTimeStr}`);

  // Mệnh giá tiền mặt
  const [counts, setCounts] = useState({
    '500k': '',
    '200k': '',
    '100k': '',
    '50k': '',
    '20k': '',
    '10k': '',
    '5k': '',
    '2k': '',
    '1k': '',
  });

  // Người nhận ca
  const [cashiers, setCashiers] = useState([]);
  const [nguoiNhanCaId, setNguoiNhanCaId] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tải danh sách thu ngân nhận ca
  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet('/thanh-toan/danh-sach-thu-ngan');
        const raw = res?.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.data?.data)
          ? raw.data.data
          : [];
        setCashiers(list);
      } catch (err) {
        console.error('Không thể lấy danh sách thu ngân:', err);
      }
    })();
  }, []);

  // Loại trừ chính mình khỏi danh sách người nhận bàn giao
  const availableCashiers = useMemo(() => {
    return cashiers.filter((c) => {
      if (user?.id && (c.nguoiDungId === user.id || c.nguoi_dung_id === user.id)) return false;
      if (user?.nhanVienId && c.id === user.nhanVienId) return false;
      if (user?.tenDangNhap && c.hoTen?.toLowerCase() === user.tenDangNhap?.toLowerCase()) return false;
      return true;
    });
  }, [cashiers, user]);

  const handleCountChange = (key, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    setCounts((prev) => ({ ...prev, [key]: num }));
  };

  // Tính tổng tiền mặt thực tế từ bảng đếm tờ
  const tienMatThucTe = useMemo(() => {
    return DENOMINATIONS.reduce((sum, den) => {
      const q = Number(counts[den.key] || 0);
      return sum + q * den.value;
    }, 0);
  }, [counts]);

  // Tiền hệ thống và chênh lệch
  const tienMatHeThong = Number(defaultSystemCash || 0);
  const chenhLech = tienMatThucTe - tienMatHeThong;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!thoiGianBatDau || !thoiGianKetThuc) {
      setErrorMsg('Vui lòng chọn thời gian bắt đầu và kết thúc ca trực.');
      return;
    }

    setSubmitting(true);
    try {
      // Chuẩn bị chiTietMenhGia
      const cleanMenhGia = {};
      DENOMINATIONS.forEach((d) => {
        cleanMenhGia[d.key] = Number(counts[d.key] || 0);
      });

      const res = await apiPost('/thanh-toan/chot-ca', {
        thoiGianBatDau,
        thoiGianKetThuc,
        tienMatThucTe,
        chiTietMenhGia: cleanMenhGia,
        nguoiNhanCaId: nguoiNhanCaId ? Number(nguoiNhanCaId) : undefined,
        ghiChu: ghiChu.trim() || undefined,
      });

      alert('Đã chốt ca làm việc và ghi nhận kiểm kê két tiền thành công!');
      onSuccess?.(res?.data?.data || res?.data);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi chốt ca.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-emerald-50/80 border-emerald-100">
          <div className="flex items-center gap-2.5 text-emerald-950">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Chốt Ca Trực & Kiểm Kê Két Tiền Mặt</h3>
              <p className="text-xs text-emerald-700">So khớp tiền mặt thực tế vs Tiền hệ thống & Lập biên bản bàn giao</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Khoảng thời gian ca trực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Thời gian bắt đầu ca
              </label>
              <input
                type="datetime-local"
                value={thoiGianBatDau}
                onChange={(e) => setThoiGianBatDau(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Thời gian kết thúc ca
              </label>
              <input
                type="datetime-local"
                value={thoiGianKetThuc}
                onChange={(e) => setThoiGianKetThuc(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                required
              />
            </div>
          </div>

          {/* 2. Bảng kiểm kê mệnh giá chi tiết */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Kiểm đếm chi tiết mệnh giá tiền mặt trong két
              </label>
              <span className="text-[11px] text-gray-500 italic">Nhập số lượng từng loại tờ tiền</span>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-[11px] font-bold uppercase text-gray-600">
                  <tr>
                    <th className="py-2 pl-3">Mệnh giá</th>
                    <th className="py-2 text-center w-28">Số lượng (tờ)</th>
                    <th className="py-2 text-right pr-3">Thành tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DENOMINATIONS.map((den) => {
                    const count = counts[den.key];
                    const subtotal = Number(count || 0) * den.value;
                    return (
                      <tr key={den.key} className="hover:bg-gray-50/60">
                        <td className="py-1.5 pl-3 font-semibold text-gray-800">
                          {den.label}
                        </td>
                        <td className="py-1.5 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={count}
                            onChange={(e) => handleCountChange(den.key, e.target.value)}
                            className="w-20 px-2 py-1 text-center font-mono font-bold text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                        </td>
                        <td className="py-1.5 text-right pr-3 font-mono font-medium text-gray-700">
                          {subtotal > 0 ? formatCurrency(subtotal) : '0 đ'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. So khớp đối soát két tự động */}
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Tiền mặt ghi nhận trên hệ thống ca trực:</span>
              <span className="font-bold text-gray-900">{formatCurrency(tienMatHeThong)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Tiền mặt thực tế kiểm kê tại két:</span>
              <span className="text-base font-black text-blue-700">{formatCurrency(tienMatThucTe)}</span>
            </div>

            <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800">Chênh lệch đối soát két:</span>
              <div className="text-right">
                <span
                  className={`text-sm font-black px-2.5 py-1 rounded-lg border ${
                    chenhLech === 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : chenhLech > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {chenhLech === 0
                    ? '✓ Khớp 100% (0 đ)'
                    : chenhLech > 0
                    ? `+ Thừa: ${formatCurrency(chenhLech)}`
                    : `- Thiếu: ${formatCurrency(Math.abs(chenhLech))}`}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Chọn người nhận ca & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nhân viên nhận bàn giao ca
              </label>
              <select
                value={nguoiNhanCaId}
                onChange={(e) => setNguoiNhanCaId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="">
                  {availableCashiers.length > 0
                    ? '-- Chọn thu ngân nhận ca tiếp theo --'
                    : '-- Không có thu ngân khác để bàn giao --'}
                </option>
                {availableCashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.hoTen} ({c.chucVu || 'Thu ngân'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Ghi chú bàn giao ca
              </label>
              <input
                type="text"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Ghi chú về chênh lệch két hoặc tồn đọng..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Đang chốt ca...' : 'Xác nhận Chốt Ca & Xuất Biên Bản'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

