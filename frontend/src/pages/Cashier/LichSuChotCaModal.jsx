import { useState, useEffect } from 'react';
import { X, RefreshCw, Printer, ShieldCheck, History, ArrowRight } from 'lucide-react';
import { apiGet } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function LichSuChotCaModal({ onClose, onSelectRecord }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/thanh-toan/chot-ca/lich-su');
      setList(res?.data?.data || res?.data || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử chốt ca:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Sổ Lịch Sử Chốt Ca & Bàn Giao Két Tiền</h3>
              <p className="text-xs text-gray-500">Xem lại các biên bản bàn giao ca trực và in lại chứng từ đối soát</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Table */}
        <div className="p-6">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
              <p className="mt-2">Đang tải lịch sử bàn giao ca...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-700">Chưa có lượt chốt ca nào được ghi nhận.</p>
              <p className="text-xs text-gray-400 mt-1">Khi kết thúc ca trực, bấm "Chốt Ca & Bàn Giao Két" để lập biên bản.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-3 pl-4">Mã biên bản</th>
                    <th className="py-3">Thời gian ca</th>
                    <th className="py-3">Thu ngân giao</th>
                    <th className="py-3">Thu ngân nhận</th>
                    <th className="py-3 text-right">Tiền thực đếm</th>
                    <th className="py-3 text-right">Chênh lệch</th>
                    <th className="py-3 text-center">Trạng thái</th>
                    <th className="py-3 text-center pr-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((item) => {
                    const diff = Number(item.chenhLech || 0);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 pl-4 font-mono font-bold text-gray-900">
                          {item.maChotCa}
                        </td>
                        <td className="py-3 text-[11px] text-gray-600">
                          <div>Từ: {formatDateTime(item.thoiGianBatDau)}</div>
                          <div>Đến: {formatDateTime(item.thoiGianKetThuc)}</div>
                        </td>
                        <td className="py-3 font-semibold text-gray-800">
                          {item.thuNgan?.hoTen || 'Thu ngân'}
                        </td>
                        <td className="py-3 font-medium text-gray-700">
                          {item.nguoiNhanCa?.hoTen || 'Chưa bàn giao'}
                        </td>
                        <td className="py-3 text-right font-bold text-blue-800">
                          {formatCurrency(item.tienMatThucTe)}
                        </td>
                        <td className="py-3 text-right font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              diff === 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : diff > 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {diff === 0 ? 'Khớp (0 đ)' : formatCurrency(diff)}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {item.trangThai === 'da_ban_giao' ? 'Đã bàn giao' : 'Đã chốt'}
                          </span>
                        </td>
                        <td className="py-3 text-center pr-4">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectRecord(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>In Biên Bản</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

