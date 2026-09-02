import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { apiGet } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import {
  BarChart3, AlertTriangle, Clock, DollarSign, Download, Printer, Search, Pill,
  FileSpreadsheet, ShoppingCart, PlusCircle, ClipboardCheck, ArrowUpRight, TrendingUp, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, Legend
} from 'recharts';

export default function ThongKeNhaThuocPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['thong-ke-nha-thuoc'],
    queryFn: () => apiGet('/nha-thuoc/thong-ke'),
  });

  const stats = data?.data || {
    tongSoThuoc: 0,
    sapHetHang: 0,
    sapHetHanCount: 0,
    donXuatTrongNgay: 0,
    tongGiaTriKho: 0,
    top10Thuoc: [],
    luuLuongGiaoDich: [],
    canhBaoRuiRo: [],
    lichSuGiaoDich: [],
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

  const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#6366F1', '#F97316'];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Quick Actions Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-600" /> Báo Cáo & Thống Kê Dược Phẩm
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Theo dõi lưu lượng xuất nhập, cảnh báo rủi ro tồn kho FEFO và quản lý tài sản dược
          </p>
        </div>

        {/* Cụm nút thao tác nhanh (Quick Action Toolbar) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<ShoppingCart className="h-4 w-4 text-emerald-600" />}
            onClick={() => navigate('/nha-thuoc/don-thuoc')}
          >
            Cấp phát / Bán thuốc
          </MedButton>
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<PlusCircle className="h-4 w-4 text-primary-600" />}
            onClick={() => navigate('/nha-thuoc/kho-thuoc')}
          >
            Nhập kho dược
          </MedButton>
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
            Xuất Excel/CSV
          </MedButton>
        </div>
      </div>

      {/* 1. THẺ CHỈ SỐ TỔNG QUAN (KPI CARDS - TOP LEVEL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MedCard className="bg-gradient-to-br from-blue-50/80 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Đơn Xuất Trong Ngày</p>
              <h3 className="text-3xl font-extrabold text-blue-900 mt-1">{stats.donXuatTrongNgay} <span className="text-xs font-normal text-blue-600">đơn</span></h3>
              <p className="text-[11px] text-blue-600/80 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Đã hoàn tất cấp phát
              </p>
            </div>
            <div className="p-3.5 bg-blue-100 rounded-2xl text-blue-600 shadow-2xs">
              <ClipboardCheck className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-amber-50/80 to-white border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Dưới Định Mức An Toàn</p>
              <h3 className="text-3xl font-extrabold text-amber-900 mt-1">{stats.sapHetHang} <span className="text-xs font-normal text-amber-600">mã</span></h3>
              <p className="text-[11px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Cần lập phiếu nhập gấp
              </p>
            </div>
            <div className="p-3.5 bg-amber-100 rounded-2xl text-amber-600 shadow-2xs">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-rose-50/80 to-white border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Lô Cận Date (&le; 60 ngày)</p>
              <h3 className="text-3xl font-extrabold text-rose-900 mt-1">{stats.sapHetHanCount} <span className="text-xs font-normal text-rose-600">lô</span></h3>
              <p className="text-[11px] text-rose-700 mt-1 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" /> Ưu tiên xuất FEFO
              </p>
            </div>
            <div className="p-3.5 bg-rose-100 rounded-2xl text-rose-600 shadow-2xs">
              <Clock className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tổng Giá Trị Kho Dược</p>
              <h3 className="text-2xl font-extrabold text-emerald-900 mt-1">{formatCurrency(stats.tongGiaTriKho)}</h3>
              <p className="text-[11px] text-emerald-600/90 mt-1 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {stats.tongSoThuoc} danh mục thuốc
              </p>
            </div>
            <div className="p-3.5 bg-emerald-100 rounded-2xl text-emerald-600 shadow-2xs">
              <DollarSign className="h-7 w-7" />
            </div>
          </div>
        </MedCard>
      </div>

      {/* 2. BẢNG CẢNH BÁO RỦI RO TỒN KHO (QUAN TRỌNG NHẤT) */}
      <MedCard
        title="⚠️ Bảng Cảnh Báo Rủi Ro Tồn Kho & Cận Hạn Sử Dụng (Xử lý ngay)"
        subtitle="Danh sách các loại thuốc đã cạn kiệt hoặc các lô thuốc sắp hết hạn cần ưu tiên xử lý"
      >
        {stats.canhBaoRuiRo && stats.canhBaoRuiRo.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-red-100">
            <table className="w-full text-left border-collapse">
              <thead className="bg-red-50/60 text-xs font-bold text-red-900 uppercase tracking-wider border-b border-red-100">
                <tr>
                  <th className="px-4 py-3">Mã Thuốc</th>
                  <th className="px-4 py-3">Tên Thuốc / Lô Hàng</th>
                  <th className="px-4 py-3">Loại Rủi Ro</th>
                  <th className="px-4 py-3 text-right">Số Lượng Tồn</th>
                  <th className="px-4 py-3 text-center">Hạn Sử Dụng</th>
                  <th className="px-4 py-3 text-right">Hành Động Đề Xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {stats.canhBaoRuiRo.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{item.maThuoc}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.tenThuoc}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        item.mucDo === 'nguy_cap' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <AlertTriangle className="h-3 w-3" /> {item.loaiRuiRo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-gray-900">{item.soLuong} {item.donViTinh}</td>
                    <td className="px-4 py-3 text-center text-xs font-mono font-medium text-gray-600">{item.hanDung}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        onClick={() => navigate('/nha-thuoc/kho-thuoc')}>
                        {item.hanhDong} <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
            <p className="text-sm font-bold text-emerald-800">Kho thuốc an toàn</p>
            <p className="text-xs text-emerald-600 mt-0.5">Không có loại thuốc nào cạn kiệt hay cận date quá mức quy định</p>
          </div>
        )}
      </MedCard>

      {/* 3. BIỂU ĐỒ THỐNG KÊ & PHÂN TÍCH (CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 thuốc xuất nhiều nhất (Biểu đồ cột ngang) */}
        <MedCard
          title="Top 10 Thuốc Xuất Nhiều Nhất Trong Tuần"
          subtitle="Giúp dược sĩ chủ động cắt liều sẵn và bố trí vị trí tiện lấy trên kệ"
        >
          {stats.top10Thuoc && stats.top10Thuoc.length > 0 ? (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.top10Thuoc}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="tenThuoc" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(val) => [`${val} đơn vị`, 'Số lượng đã xuất']} />
                  <Bar dataKey="tongDaBan" radius={[0, 8, 8, 0]}>
                    {stats.top10Thuoc.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">Chưa có giao dịch xuất thuốc trong tuần</p>
          )}
        </MedCard>

        {/* Lưu lượng xuất/nhập kho (Biểu đồ đường) */}
        <MedCard
          title="Lưu Lượng Xuất / Nhập Kho Trong Tuần"
          subtitle="Theo dõi tần suất giao dịch để điều phối nhân sự trực quầy giờ cao điểm"
        >
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.luuLuongGiaoDich} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorXuat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNhap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="ngay" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="soDonXuat" name="Đơn xuất kho" stroke="#2563EB" fillOpacity={1} fill="url(#colorXuat)" />
                <Area type="monotone" dataKey="soNhapKho" name="Lô nhập kho" stroke="#10B981" fillOpacity={1} fill="url(#colorNhap)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MedCard>
      </div>

      {/* 4. LỊCH SỬ GIAO DỊCH GẦN ĐÂY */}
      <MedCard
        title="Lịch Sử Đơn Xuất Kho / Cấp Phát Gần Nhất"
        subtitle="Tra cứu nhanh 5-10 đơn thuốc vừa xử lý khi bệnh nhân hoặc bác sĩ thắc mắc"
      >
        {stats.lichSuGiaoDich && stats.lichSuGiaoDich.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Mã Đơn Thuốc</th>
                  <th className="px-4 py-3">Bác Sĩ Kê</th>
                  <th className="px-4 py-3">Số Lượng Món</th>
                  <th className="px-4 py-3">Thời Gian Kê</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {stats.lichSuGiaoDich.map((dt) => (
                  <tr key={dt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary-700">{dt.maDonThuoc}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{dt.bacSi}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{dt.soMon} loại thuốc</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(dt.ngayKe)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={dt.trangThai} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate('/nha-thuoc/don-thuoc')}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700"
                      >
                        Xem chi tiết &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-8 text-center">Chưa có lịch sử giao dịch gần đây</p>
        )}
      </MedCard>
    </div>
  );
}
