import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatDateTime } from '../../utils/formatDate';
import {
  FlaskConical, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  Download, BarChart3, PieChart as PieChartIcon, Activity, Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6'];

const TRANG_THAI_LABELS = {
  cho_lay_mau: { label: 'Chờ lấy mẫu', bg: 'bg-amber-50 text-amber-700' },
  dang_lay_mau: { label: 'Đang lấy mẫu', bg: 'bg-blue-50 text-blue-700' },
  dang_xu_ly: { label: 'Đang xử lý', bg: 'bg-indigo-50 text-indigo-700' },
  co_ket_qua: { label: 'Đã có kết quả', bg: 'bg-emerald-50 text-emerald-700' },
  huy: { label: 'Đã hủy', bg: 'bg-red-50 text-red-700' },
};

export default function ThongKeXetNghiemPage() {
  const [timeRange, setTimeRange] = useState('hom_nay');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['thong-ke-xet-nghiem', timeRange, tuNgay, denNgay],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tuNgay && denNgay) {
        params.append('tuNgay', tuNgay);
        params.append('denNgay', denNgay);
      } else {
        params.append('range', timeRange);
      }
      return apiGet(`/xet-nghiem/thong-ke?${params.toString()}`);
    },
  });

  const stats = data?.data;

  const handleExportCSV = () => {
    const list = stats?.danhSachMoiNhat || [];
    if (list.length === 0) return;
    const headers = ['Mã CLS', 'Tên dịch vụ', 'Loại', 'Trạng thái', 'Thời gian chỉ định', 'Thời gian hoàn thành'];
    const rows = list.map(c => [
      c.id,
      `"${c.tenDichVu || ''}"`,
      c.loai === 'cdha' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm máu',
      TRANG_THAI_LABELS[c.trangThai]?.label || c.trangThai,
      c.thoiGianChiDinh ? new Date(c.thoiGianChiDinh).toLocaleString('vi-VN') : '',
      c.thoiGianCoKetQua ? new Date(c.thoiGianCoKetQua).toLocaleString('vi-VN') : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaoCaoXetNghiem_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Thống Kê Báo Cáo Xét Nghiệm & CLS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi tiến độ xử lý cận lâm sàng, thời gian trả kết quả và cơ cấu dịch vụ
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
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Chỉ Định</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {isLoading ? '...' : `${stats?.tongChiDinh || 0} ca`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lệnh từ bác sĩ lâm sàng</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đã Có Kết Quả</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {isLoading ? '...' : `${stats?.daHoanThanh || 0} ca`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tỷ lệ hoàn thành: <strong>{stats?.tyLeHoanThanh || '0%'}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đang Xử Lý / Phân Tích</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            {isLoading ? '...' : `${stats?.dangXuLy || 0} ca`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Đang chạy máy / xét nghiệm</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chờ Lấy Mẫu</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {isLoading ? '...' : `${stats?.choLayMau || 0} ca`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Bệnh nhân đang chờ</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 dịch vụ chỉ định nhiều nhất */}
        <div className="lg:col-span-2">
          <MedCard
            title="📊 Top 5 Dịch Vụ Cận Lâm Sàng Được Thực Hiện Nhiều Nhất"
            subtitle="Số lượt thực hiện theo danh mục xét nghiệm / CĐHA"
          >
            <div className="h-64 w-full pt-2">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">Đang tải...</div>
              ) : (stats?.topDichVu || []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">Chưa có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topDichVu} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="ten" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v) => [`${v} ca`, 'Số lượng']} />
                    <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>

        {/* Phân loại xét nghiệm */}
        <div>
          <MedCard title="🔬 Cơ Cấu Dịch Vụ" subtitle="Xét nghiệm máu vs Chẩn đoán hình ảnh">
            <div className="h-64 w-full flex flex-col items-center justify-center">
              {isLoading ? (
                <div className="text-xs text-gray-400">Đang tải...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.coCauLoai || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(stats?.coCauLoai || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>
      </div>

      {/* Bảng danh sách 10 ca gần nhất */}
      <MedCard title="📋 Nhật Ký Chỉ Định Gần Đây" subtitle="Cập nhật trạng thái tiến trình xét nghiệm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b">
              <tr>
                <th className="px-4 py-3">Mã Lệnh</th>
                <th className="px-4 py-3">Tên Dịch Vụ Cận Lâm Sàng</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3">Thời Gian Chỉ Định</th>
                <th className="px-4 py-3">Thời Gian Có KQ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(stats?.danhSachMoiNhat || []).map((c, i) => {
                const st = TRANG_THAI_LABELS[c.trangThai] || { label: c.trangThai, bg: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary-700">#{c.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.tenDichVu}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.loai === 'cdha' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${st.bg}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(c.thoiGianChiDinh)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(c.thoiGianCoKetQua) || '--'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MedCard>
    </div>
  );
}
