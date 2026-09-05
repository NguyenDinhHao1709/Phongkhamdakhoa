import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import InHoaDonModal from './InHoaDonModal';
import {
  DollarSign, Receipt, CreditCard, Clock, RefreshCw, Download,
  Wallet, CheckCircle2, AlertCircle, ArrowUpRight, Printer
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

const PHUONG_THUC_LABELS = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản QR',
  the: 'Thẻ POS',
  vnpay: 'Cổng VNPay',
  momo: 'Ví MoMo',
  bao_hiem: 'BHYT',
};

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function ThongKeThuNganPage() {
  const [timeRange, setTimeRange] = useState('hom_nay');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['thong-ke-thu-ngan', timeRange, tuNgay, denNgay],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tuNgay && denNgay) {
        params.append('tuNgay', tuNgay);
        params.append('denNgay', denNgay);
      } else {
        params.append('range', timeRange);
      }
      return apiGet(`/thanh-toan/thong-ke-thu-ngan?${params.toString()}`);
    },
  });

  const stats = data?.data;
  const byPhuongThuc = stats?.byPhuongThuc || {};

  const pieData = Object.entries(byPhuongThuc).map(([k, v]) => ({
    name: PHUONG_THUC_LABELS[k] || k,
    value: Number(v),
  }));

  const handleExportCSV = () => {
    const list = stats?.giaoDichGanNhat || [];
    if (list.length === 0) return;
    const headers = ['Mã HĐ', 'Bệnh nhân', 'Số điện thoại', 'Thực thu', 'Phương thức', 'Ngày thanh toán', 'Thu ngân'];
    const rows = list.map(h => [
      h.maHoaDon,
      `"${h.benhNhanTen || ''}"`,
      h.benhNhanSdt || '',
      h.thucThu,
      PHUONG_THUC_LABELS[h.phuongThuc] || h.phuongThuc,
      h.ngayThanhToan ? new Date(h.ngayThanhToan).toLocaleString('vi-VN') : '',
      `"${h.thuNganTen || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaoCaoThuNgan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Báo Cáo Doanh Thu Thu Ngân</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tổng hợp doanh thu ca trực, đối soát tiền mặt & chuyển khoản ngân hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="h-4 w-4" /> Xuất Báo Cáo CSV
          </button>
        </div>
      </div>

      {/* Quick Time Filter */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-gray-200 p-3 shadow-2xs">
        <span className="text-xs font-bold text-gray-500 mr-2">Thời gian:</span>
        {[
          { key: 'hom_nay', label: 'Hôm nay' },
          { key: 'tuan_nay', label: 'Tuần này' },
          { key: 'thang_nay', label: 'Tháng này' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setTimeRange(tab.key); setTuNgay(''); setDenNgay(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeRange === tab.key && !tuNgay
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-auto text-xs">
          <span>Từ:</span>
          <input
            type="date"
            value={tuNgay}
            onChange={e => { setTuNgay(e.target.value); setTimeRange(''); }}
            className="border rounded-lg px-2 py-1"
          />
          <span>Đến:</span>
          <input
            type="date"
            value={denNgay}
            onChange={e => { setDenNgay(e.target.value); setTimeRange(''); }}
            className="border rounded-lg px-2 py-1"
          />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Thực Thu</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {isLoading ? '...' : formatCurrency(stats?.tongThucThu || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Đã vào quỹ phòng khám</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hóa Đơn Đã Thu</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {isLoading ? '...' : `${stats?.soHoaDonDaThu || 0} HĐ`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Giao dịch hoàn tất</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đang Chờ Thanh Toán</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {isLoading ? '...' : `${stats?.soHoaDonChoThu || 0} HĐ`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Chờ bệnh nhân nộp phí</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Tiền Miễn Giảm</span>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 mt-2">
            {isLoading ? '...' : formatCurrency(stats?.tongTienGiam || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Hỗ trợ chính sách / BHYT</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doanh thu theo giờ hôm nay */}
        <div className="lg:col-span-2">
          <MedCard
            title="⏱️ Dòng Tiền Theo Giờ Trong Ca (Hôm Nay)"
            subtitle="Tổng số tiền thực thu tại quầy theo các khung giờ"
          >
            <div className="h-64 w-full pt-2">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chartTheoGio || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="gio" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => [formatCurrency(v), 'Thực thu']} />
                    <Bar dataKey="tien" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>

        {/* Phương thức thanh toán */}
        <div>
          <MedCard title="💳 Cơ Cấu Phương Thức" subtitle="Tiền mặt vs Chuyển khoản QR / Thẻ">
            <div className="h-64 w-full flex flex-col items-center justify-center">
              {isLoading ? (
                <div className="text-xs text-gray-400">Đang tải...</div>
              ) : pieData.length === 0 ? (
                <div className="text-xs text-gray-400">Chưa có giao dịch thanh toán</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>
      </div>

      {/* Giao dịch gần nhất */}
      <MedCard title="🧾 10 Giao Dịch Thu Ngân Gần Nhất" subtitle="Bấm in để cấp lại biên lai cho bệnh nhân">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b">
              <tr>
                <th className="px-4 py-3">Mã HĐ</th>
                <th className="px-4 py-3">Bệnh Nhân</th>
                <th className="px-4 py-3 text-right">Số Tiền</th>
                <th className="px-4 py-3 text-center">Phương Thức</th>
                <th className="px-4 py-3">Thời Gian</th>
                <th className="px-4 py-3 text-center">In Phiếu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(stats?.giaoDichGanNhat || []).map((h, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary-700">{h.maHoaDon}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{h.benhNhanTen}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(h.thucThu)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      {PHUONG_THUC_LABELS[h.phuongThuc] || h.phuongThuc}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(h.ngayThanhToan)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={async () => {
                        const res = await apiGet(`/thanh-toan/${h.id}`);
                        setSelectedInvoice(res?.data || res);
                      }}
                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="In lại phiếu thu"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MedCard>

      {/* In hóa đơn modal */}
      {selectedInvoice && (
        <InHoaDonModal hoaDon={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}
