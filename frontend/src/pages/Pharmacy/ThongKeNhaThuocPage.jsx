import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { apiGet } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  BarChart3, Package, AlertTriangle, Clock, DollarSign, Download, Printer, Search, Pill, FileSpreadsheet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function ThongKeNhaThuocPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['thong-ke-nha-thuoc'],
    queryFn: () => apiGet('/nha-thuoc/thong-ke'),
  });

  const stats = data?.data || {
    tongSoThuoc: 0,
    sapHetHang: 0,
    sapHetHanCount: 0,
    tongGiaTriKho: 0,
    topThuoc: [],
    listThuoc: [],
  };

  const filteredList = (stats.listThuoc || []).filter((t) =>
    t.tenThuoc.toLowerCase().includes(search.toLowerCase()) ||
    t.maThuoc.toLowerCase().includes(search.toLowerCase())
  );

  // Xuất file CSV báo cáo kho thuốc
  const handleExportCSV = () => {
    const headers = ['Mã Thuốc', 'Tên Thuốc', 'Đơn Vị Tính', 'Đơn Giá (VNĐ)', 'Tồn Kho Tổng', 'Thành Tiền (VNĐ)', 'Trạng Thái'];
    const rows = filteredList.map((t) => [
      t.maThuoc,
      `"${t.tenThuoc}"`,
      t.donViTinh,
      t.giaBan,
      t.tonKhoTong,
      t.giaBan * t.tonKhoTong,
      t.trangThai === 'canh_bao' ? 'Cảnh báo tồn ít' : t.trangThai === 'het_hang' ? 'Hết hàng' : 'Còn hàng',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Kho_Thuoc_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-600" /> Thống Kê & Báo Cáo Nhà Thuốc
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Báo cáo tổng quan tồn kho, giá trị tài sản kho dược và top thuốc cấp phát
          </p>
        </div>

        <div className="flex items-center gap-3">
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            In Báo Cáo
          </MedButton>
          <MedButton
            variant="primary"
            size="sm"
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Xuất Báo Cáo Excel/CSV
          </MedButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MedCard className="bg-blue-50/50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Tổng Danh Mục Thuốc</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-1">{stats.tongSoThuoc} <span className="text-xs font-normal">loại</span></h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Pill className="h-6 w-6" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-amber-50/50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Sắp Hết Hàng (&le; 20)</p>
              <h3 className="text-2xl font-bold text-amber-900 mt-1">{stats.sapHetHang} <span className="text-xs font-normal">loại</span></h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-rose-50/50 border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Lô Cận Hạn (&le; 60 ngày)</p>
              <h3 className="text-2xl font-bold text-rose-900 mt-1">{stats.sapHetHanCount} <span className="text-xs font-normal">lô</span></h3>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Tổng Giá Trị Kho Thuốc</p>
              <h3 className="text-xl font-bold text-emerald-900 mt-1">{formatCurrency(stats.tongGiaTriKho)}</h3>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </MedCard>
      </div>

      {/* Chart */}
      <MedCard title="Top 5 Thuốc Cấp Phát / Bán Chạy Nhất">
        {stats.topThuoc && stats.topThuoc.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topThuoc} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="tenThuoc" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val) => [`${val} đơn vị`, 'Đã bán/cấp phát']} />
                <Bar dataKey="tongDaBan" radius={[8, 8, 0, 0]}>
                  {stats.topThuoc.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu giao dịch cấp phát thuốc</p>
        )}
      </MedCard>

      {/* Detail Table */}
      <MedCard title="Báo Cáo Chi Tiết Tồn Kho & Giá Trị Dược Phẩm">
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã thuốc..."
              className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">Hiển thị {filteredList.length} loại thuốc</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Mã Thuốc</th>
                <th className="px-4 py-3">Tên Dược Phẩm</th>
                <th className="px-4 py-3">Đơn Vị</th>
                <th className="px-4 py-3 text-right">Đơn Giá</th>
                <th className="px-4 py-3 text-right">Tồn Kho</th>
                <th className="px-4 py-3 text-right">Thành Tiền</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-gray-400">Đang tải báo cáo...</td></tr>
              )}
              {filteredList.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-primary-700">{t.maThuoc}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{t.tenThuoc}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.donViTinh}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{formatCurrency(t.giaBan)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{t.tonKhoTong}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(t.giaBan * t.tonKhoTong)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={t.trangThai} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MedCard>
    </div>
  );
}

