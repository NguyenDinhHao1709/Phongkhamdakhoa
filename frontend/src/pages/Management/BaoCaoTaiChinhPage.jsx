import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import {
  DollarSign, Download, Filter, Search, Calendar, CreditCard,
  TrendingUp, RefreshCw, FileSpreadsheet, ArrowDownRight, Wallet
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

const PHUONG_THUC_LABEL = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản QR',
  the: 'Thẻ POS',
  vnpay: 'Cổng VNPay',
  momo: 'Ví MoMo',
  bao_hiem: 'BHYT',
};

export default function BaoCaoTaiChinhPage() {
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [phuongThuc, setPhuongThuc] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bao-cao-tai-chinh', tuNgay, denNgay, phuongThuc],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tuNgay) params.append('tuNgay', tuNgay);
      if (denNgay) params.append('denNgay', denNgay);
      if (phuongThuc !== 'all') params.append('phuongThuc', phuongThuc);
      return apiGet(`/quan-ly/bao-cao-tai-chinh?${params.toString()}`);
    },
  });

  const report = data?.data;
  const list = report?.danhSachHoaDon || [];

  const filteredList = list.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.maHoaDon?.toLowerCase().includes(term) ||
      item.benhNhanTen?.toLowerCase().includes(term) ||
      item.benhNhanSdt?.includes(term)
    );
  });

  // Xuất CSV báo cáo
  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ['Mã HĐ', 'Bệnh nhân', 'Số điện thoại', 'Tổng tiền', 'Giảm giá', 'Thực thu', 'Phương thức', 'Ngày thanh toán', 'Thu ngân'];
    const rows = filteredList.map(h => [
      h.maHoaDon,
      `"${h.benhNhanTen || ''}"`,
      h.benhNhanSdt || '',
      h.tongTien,
      h.soTienGiam,
      h.thucThu,
      PHUONG_THUC_LABEL[h.phuongThuc] || h.phuongThuc,
      h.ngayThanhToan ? new Date(h.ngayThanhToan).toLocaleString('vi-VN') : '',
      `"${h.thuNganTen || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaoCaoDoanhThu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Báo Cáo Tài Chính & Doanh Thu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tra cứu dòng tiền, phân loại doanh thu viện phí và xuất báo cáo tài chính
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
            disabled={filteredList.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" /> Xuất Excel / CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Doanh Thu Thực Thu</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {isLoading ? '...' : formatCurrency(report?.tongThucThu || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Số giao dịch: <strong>{report?.tongGiaoDich || 0}</strong> hóa đơn</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Tiền Miễn Giảm / BHYT</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {isLoading ? '...' : formatCurrency(report?.tongTienGiam || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Hỗ trợ bệnh nhân theo chính sách</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Trị TB / Giao Dịch</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">
            {isLoading || !report?.tongGiaoDich
              ? '0 đ'
              : formatCurrency(Math.round((report?.tongThucThu || 0) / (report?.tongGiaoDich || 1)))}
          </p>
          <p className="text-xs text-gray-500 mt-1">Doanh thu bình quân mỗi lượt</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Từ ngày:</span>
            <input
              type="date"
              value={tuNgay}
              onChange={e => setTuNgay(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Đến ngày:</span>
            <input
              type="date"
              value={denNgay}
              onChange={e => setDenNgay(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Phương thức:</span>
            <select
              value={phuongThuc}
              onChange={e => setPhuongThuc(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary-500 bg-white"
            >
              <option value="all">Tất cả phương thức</option>
              <option value="tien_mat">Tiền mặt</option>
              <option value="chuyen_khoan">Chuyển khoản QR</option>
              <option value="the">Thẻ POS</option>
              <option value="vnpay">VNPay</option>
              <option value="momo">MoMo</option>
              <option value="bao_hiem">Bảo hiểm</option>
            </select>
          </div>

          {(tuNgay || denNgay || phuongThuc !== 'all') && (
            <button
              onClick={() => { setTuNgay(''); setDenNgay(''); setPhuongThuc('all'); }}
              className="text-xs text-red-600 hover:underline font-semibold"
            >
              Xóa bộ lọc
            </button>
          )}

          {/* Search */}
          <div className="ml-auto relative min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm mã HĐ, tên BN, SĐT..."
              className="w-full text-xs border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Biểu đồ dòng tiền */}
      {(report?.timelineData || []).length > 0 && (
        <MedCard title="📈 Xu Hướng Doanh Thu Theo Ngày" subtitle="Tổng thực thu đã tất toán">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="ngay" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(v), 'Doanh thu']} />
                <Bar dataKey="tongTien" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MedCard>
      )}

      {/* Bảng kê chi tiết hóa đơn */}
      <MedCard title="📑 Danh Sách Hóa Đơn Tất Toán" subtitle={`Hiển thị ${filteredList.length} giao dịch`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Mã Hóa Đơn</th>
                <th className="px-4 py-3">Bệnh Nhân</th>
                <th className="px-4 py-3 text-right">Tổng Tiền</th>
                <th className="px-4 py-3 text-right">Giảm Giá</th>
                <th className="px-4 py-3 text-right">Thực Thu</th>
                <th className="px-4 py-3 text-center">Phương Thức</th>
                <th className="px-4 py-3">Ngày Thu</th>
                <th className="px-4 py-3">Thu Ngân</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-6 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
              ) : filteredList.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Không tìm thấy giao dịch nào phù hợp</td></tr>
              ) : (
                filteredList.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary-700">{h.maHoaDon}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{h.benhNhanTen}</p>
                      <p className="text-[11px] text-gray-500">{h.benhNhanSdt || 'Chưa có SĐT'}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-600">{formatCurrency(h.tongTien)}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">
                      {h.soTienGiam > 0 ? `-${formatCurrency(h.soTienGiam)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">
                      {formatCurrency(h.thucThu)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                        {PHUONG_THUC_LABEL[h.phuongThuc] || h.phuongThuc}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(h.ngayThanhToan)}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{h.thuNganTen || 'Hệ thống'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </MedCard>
    </div>
  );
}
