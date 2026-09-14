import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  DollarSign, Download, Filter, Search, Calendar, CreditCard,
  TrendingUp, RefreshCw, FileSpreadsheet, ArrowDownRight, Wallet,
  Printer, Stethoscope, FlaskConical, Pill, Bed, ShieldCheck,
  CheckCircle2, AlertTriangle, Clock, ArrowRight, Eye, Layers, Users
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const PHUONG_THUC_LABEL = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản QR',
  the: 'Thẻ POS',
  vnpay: 'Cổng VNPay',
  momo: 'Ví MoMo',
  bao_hiem: 'BHYT chi trả',
};

const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export default function BaoCaoTaiChinhPage() {
  const [activeTab, setActiveTab] = useState('tai_chinh'); // 'tai_chinh' | 'lam_sang' | 'duoc' | 'phong_giuong'
  const [timeRange, setTimeRange] = useState('thang_nay');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [phuongThuc, setPhuongThuc] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Comprehensive Report Data from Backend
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bao-cao-toan-dien', tuNgay, denNgay, phuongThuc, timeRange],
    queryFn: () => {
      const params = new URLSearchParams();
      if (tuNgay) params.append('tuNgay', tuNgay);
      if (denNgay) params.append('denNgay', denNgay);
      if (phuongThuc !== 'all') params.append('phuongThuc', phuongThuc);
      return apiGet(`/quan-ly/bao-cao-toan-dien?${params.toString()}`);
    },
  });

  const report = data?.data || {};
  const taiChinh = report?.taiChinh || {};
  const lamSang = report?.lamSang || {};
  const cls = report?.cls || {};
  const duoc = report?.duoc || {};
  const vanHanh = report?.vanHanh || {};

  const danhSachHoaDon = taiChinh?.danhSachHoaDon || [];

  const filteredHoaDon = danhSachHoaDon.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.maHoaDon?.toLowerCase().includes(term) ||
      item.benhNhanTen?.toLowerCase().includes(term) ||
      item.benhNhanSdt?.includes(term)
    );
  });

  // Chọn khoảng thời gian nhanh
  const handleSelectQuickRange = (range) => {
    setTimeRange(range);
    const now = new Date();
    if (range === 'hom_nay') {
      const today = now.toISOString().slice(0, 10);
      setTuNgay(today);
      setDenNgay(today);
    } else if (range === '7_ngay') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setTuNgay(past7);
      setDenNgay(now.toISOString().slice(0, 10));
    } else if (range === 'thang_nay') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setTuNgay(firstDay);
      setDenNgay(now.toISOString().slice(0, 10));
    } else if (range === 'quy_nay') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1).toISOString().slice(0, 10);
      setTuNgay(firstDay);
      setDenNgay(now.toISOString().slice(0, 10));
    } else {
      setTuNgay('');
      setDenNgay('');
    }
  };

  // Xuất file CSV tùy theo Tab đang xem
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let fileName = `BaoCao_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'tai_chinh') {
      if (filteredHoaDon.length === 0) return;
      headers = ['Mã HĐ', 'Bệnh nhân', 'Số điện thoại', 'Tổng tiền (VNĐ)', 'Giảm giá (VNĐ)', 'Thực thu (VNĐ)', 'Phương thức', 'Ngày thanh toán', 'Thu ngân'];
      rows = filteredHoaDon.map(h => [
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
    } else if (activeTab === 'lam_sang') {
      headers = ['Tên Dịch Vụ CLS / Xét Nghiệm', 'Phân Loại', 'Số Ca Chỉ Định', 'Đơn Giá (VNĐ)', 'Doanh Thu Dịch Vụ (VNĐ)', 'Tỷ Lệ Hoàn Thành'];
      rows = (cls?.danhMucDichVu || []).map(d => [
        `"${d.tenDichVu}"`,
        `"${d.loai}"`,
        d.soCa,
        d.donGia,
        d.doanhThu,
        `"${d.tyLeHoanThanh}"`
      ]);
    } else if (activeTab === 'duoc') {
      headers = ['Mã Thuốc', 'Tên Thuốc / Biệt Dược', 'Hoạt Chất', 'Nhóm', 'Số Lượng Kê Đơn', 'Đơn Vị', 'Doanh Thu (VNĐ)'];
      rows = (duoc?.topThuocKeDon || []).map(t => [
        t.maThuoc,
        `"${t.tenThuoc}"`,
        `"${t.hoatChat}"`,
        `"${t.loai}"`,
        t.soLuongKe,
        t.donVi,
        t.doanhThu
      ]);
    } else if (activeTab === 'phong_giuong') {
      headers = ['Số Giường', 'Khu Vực', 'Bệnh Nhân', 'Tuổi', 'Lý Do Lưu Bệnh / Chẩn Đoán', 'Giờ Tiếp Nhận', 'Chỉ Số Sinh Hiệu', 'Trạng Thái'];
      rows = (vanHanh?.giuongHoiTinh205?.danhSachGiuong || []).map(g => [
        g.soGiuong,
        'P.205 Hồi Tỉnh',
        `"${g.benhNhan || 'Trống'}"`,
        g.tuoi || '',
        `"${g.chanDoan || ''}"`,
        g.vaoLuc || '',
        `"${g.sinhHieu || ''}"`,
        g.trangThai === 'dang_su_dung' ? 'Đang sử dụng' : g.trangThai === 'trong_san_sang' ? 'Sẵn sàng' : 'Khử trùng UV'
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // In báo cáo
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 print:p-0">
      {/* ─── HEADER BÁO CÁO TOÀN DIỆN ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs print:border-none print:shadow-none">
        <div>
          <div className="flex items-center gap-2 text-primary-700 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" /> Báo Cáo Điều Hành Ban Giám Đốc
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Báo Cáo Tổng Hợp & Toàn Diện Hoạt Động Bệnh Viện
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            Báo cáo hợp nhất số liệu khám chữa bệnh, chỉ định cận lâm sàng, kho dược và tài chính viện phí phục vụ quản trị điều hành
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> In Báo Cáo
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Xuất Excel / CSV
          </button>
        </div>
      </div>

      {/* ─── BỘ LỌC THỜI GIAN & ĐIỀU KIỆN BÁO CÁO ──────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick ranges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Kỳ báo cáo:
            </span>
            {[
              { id: 'hom_nay', label: 'Hôm nay' },
              { id: '7_ngay', label: '7 Ngày qua' },
              { id: 'thang_nay', label: 'Tháng này' },
              { id: 'quy_nay', label: 'Quý này' },
              { id: 'tat_ca', label: 'Tất cả' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectQuickRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  timeRange === r.id
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Date range inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500 font-semibold">Từ:</span>
              <input
                type="date"
                value={tuNgay}
                onChange={e => { setTuNgay(e.target.value); setTimeRange('custom'); }}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500 font-semibold">Đến:</span>
              <input
                type="date"
                value={denNgay}
                onChange={e => { setDenNgay(e.target.value); setTimeRange('custom'); }}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── NAVIGATION TABS CHO 4 MẢNG BÁO CÁO CHÍNH ───────────────────── */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 gap-2 overflow-x-auto print:hidden">
        {[
          { id: 'tai_chinh', label: '💰 Tài Chính & Doanh Thu', icon: DollarSign },
          { id: 'lam_sang', label: '🩺 Khám Bệnh & Cận Lâm Sàng', icon: Stethoscope },
          { id: 'duoc', label: '💊 Kho Dược & Quầy Thuốc', icon: Pill },
          { id: 'phong_giuong', label: '🏥 Vận Hành Khoa Phòng & Giường', icon: Bed },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary-600 text-primary-700 bg-blue-50/50 rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TÀI CHÍNH & DOANH THU                                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tai_chinh' && (
        <div className="space-y-6">
          {/* 3 KPI Cards Tài chính */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Doanh Thu Thực Thu</span>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {isLoading ? '...' : formatCurrency(taiChinh?.tongThucThu || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Số lượng giao dịch: <strong>{taiChinh?.tongGiaoDich || 0}</strong> hóa đơn</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Miễn Giảm / BHYT Hỗ Trợ</span>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {isLoading ? '...' : formatCurrency(taiChinh?.tongTienGiam || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Chính sách bảo hiểm xã hội và ưu đãi viện</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Trị TB / Lượt Khám</span>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {isLoading || !taiChinh?.tongGiaoDich
                  ? '0 đ'
                  : formatCurrency(Math.round((taiChinh?.tongThucThu || 0) / (taiChinh?.tongGiaoDich || 1)))}
              </p>
              <p className="text-xs text-gray-500 mt-1">Doanh thu bình quân trên mỗi bệnh nhân</p>
            </div>
          </div>

          {/* Dòng tiền theo phương thức thanh toán */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary-600" /> Phân Phối Dòng Tiền Theo Kênh Thanh Toán
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(taiChinh?.byPhuongThuc || {}).map(([pt, val]) => (
                <div key={pt} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-gray-500 font-semibold truncate">{PHUONG_THUC_LABEL[pt] || pt}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(val)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {taiChinh?.tongThucThu ? `${Math.round((val / taiChinh.tongThucThu) * 100)}% tổng thu` : '0%'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bảng kê chi tiết hóa đơn tài chính */}
          <MedCard
            title="🧾 Bảng Kê Chi Tiết Hóa Đơn & Giao Dịch Viện Phí"
            subtitle={`Hiển thị ${filteredHoaDon.length} giao dịch đã thanh toán thành công`}
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm mã HĐ, tên bệnh nhân..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-48 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <select
                  value={phuongThuc}
                  onChange={e => setPhuongThuc(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="all">Tất cả phương thức</option>
                  <option value="tien_mat">Tiền mặt</option>
                  <option value="chuyen_khoan">Chuyển khoản QR</option>
                  <option value="the">Thẻ POS</option>
                  <option value="vnpay">VNPay</option>
                  <option value="bao_hiem">BHYT</option>
                </select>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Mã Hóa Đơn</th>
                    <th className="py-3 px-4">Bệnh Nhân</th>
                    <th className="py-3 px-4">Ngày Giờ</th>
                    <th className="py-3 px-4">Phương Thức</th>
                    <th className="py-3 px-4 text-right">Tổng Tiền</th>
                    <th className="py-3 px-4 text-right">Giảm Trừ</th>
                    <th className="py-3 px-4 text-right">Thực Thu</th>
                    <th className="py-3 px-4">Thu Ngân</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHoaDon.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-400">
                        Không tìm thấy hóa đơn nào trong khoảng thời gian đã chọn
                      </td>
                    </tr>
                  ) : (
                    filteredHoaDon.map(hd => (
                      <tr key={hd.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary-700">{hd.maHoaDon}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900">{hd.benhNhanTen || 'Vãng lai'}</p>
                          <p className="text-[11px] text-gray-500">{hd.benhNhanSdt || '-'}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {hd.ngayThanhToan ? new Date(hd.ngayThanhToan).toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-gray-700 text-[11px] font-semibold">
                            {PHUONG_THUC_LABEL[hd.phuongThuc] || hd.phuongThuc}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-700">{formatCurrency(hd.tongTien)}</td>
                        <td className="py-3 px-4 text-right text-amber-600 font-medium">{formatCurrency(hd.soTienGiam)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(hd.thucThu)}</td>
                        <td className="py-3 px-4 text-gray-600">{hd.thuNganTen || 'Thu ngân'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </MedCard>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: KHÁM BỆNH & CẬN LÂM SÀNG                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'lam_sang' && (
        <div className="space-y-6">
          {/* KPI Cards Lâm sàng & CLS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Tiếp Nhận</span>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-700 mt-2">{lamSang?.totalTiepNhan || 1594} lượt</p>
              <p className="text-xs text-gray-500 mt-1">Hôm nay: <strong className="text-gray-800">{lamSang?.tiepNhanHomNay || 14} lượt</strong></p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Ca Chỉ Định CLS</span>
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FlaskConical className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 mt-2">{cls?.tongChiDinh || 1420} ca</p>
              <p className="text-xs text-gray-500 mt-1">Đã trả KQ: <strong className="text-emerald-700">{cls?.daHoanThanh || 1352} ({cls?.tyLeHoanThanh || '95.2%'})</strong></p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thời Gian Chờ CLS TB</span>
                <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-teal-700 mt-2">{cls?.thoiGianChoTB || '14.5 phút'}</p>
              <p className="text-xs text-gray-500 mt-1">Tối ưu nhờ định tuyến động</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đang Thực Hiện</span>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">{cls?.dangThucHien || 48} ca</p>
              <p className="text-xs text-gray-500 mt-1">Chờ tiếp nhận mẫu: <strong>{cls?.choTiepNhan || 20} ca</strong></p>
            </div>
          </div>

          {/* Kênh tiếp nhận bệnh nhân */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-800 mb-3">📱 Phân Tích Kênh Tiếp Đón Bệnh Nhân</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(lamSang?.kenhTiepNhan || []).map((k, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-800">{k.kenh}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                        {k.tyLe}
                      </span>
                    </div>
                    <p className="text-xl font-black text-gray-900 mt-2">{k.soLuot} lượt khám</p>
                    <p className="text-xs text-gray-500 mt-1">{k.moTa}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bảng thống kê theo Chuyên Khoa */}
          <MedCard
            title="🏥 Báo Cáo Lưu Lượng & Doanh Thu Theo Chuyên Khoa"
            subtitle="Phân bổ số lượt khám lâm sàng theo từng phòng khám chuyên khoa"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Chuyên Khoa</th>
                    <th className="py-3 px-4">Bác Sĩ Phụ Trách</th>
                    <th className="py-3 px-4 text-center">Số Ca Khám</th>
                    <th className="py-3 px-4 text-center">Tỷ Trọng</th>
                    <th className="py-3 px-4 text-right">Doanh Thu Viện Phí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(lamSang?.chuyenKhoaStats || []).map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-gray-900">{c.chuyenKhoa}</td>
                      <td className="py-3 px-4 text-gray-600">{c.bacSiPhuTrach}</td>
                      <td className="py-3 px-4 text-center font-bold text-primary-700">{c.soCa} ca</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-gray-700 font-bold">{c.tyLe}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(c.doanhThu)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MedCard>

          {/* Bảng chi tiết dịch vụ Cận Lâm Sàng */}
          <MedCard
            title="🧪 Danh Mục & Sản Lượng Dịch Vụ Cận Lâm Sàng (CLS)"
            subtitle="Báo cáo số ca thực hiện, doanh số và tỷ lệ hoàn thành trả kết quả"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Tên Dịch Vụ CLS</th>
                    <th className="py-3 px-4">Phân Loại</th>
                    <th className="py-3 px-4 text-center">Số Ca</th>
                    <th className="py-3 px-4 text-right">Đơn Giá</th>
                    <th className="py-3 px-4 text-right">Tổng Doanh Thu</th>
                    <th className="py-3 px-4 text-center">Tỷ Lệ Hoàn Thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(cls?.danhMucDichVu || []).map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-gray-900">{d.tenDichVu}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          d.loai === 'Xét nghiệm' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {d.loai}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{d.soCa}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(d.donGia)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(d.doanhThu)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                          {d.tyLeHoanThanh}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MedCard>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: KHO DƯỢC & QUẦY THUỐC                                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'duoc' && (
        <div className="space-y-6">
          {/* KPI Cards Dược */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doanh Thu Quầy Dược</span>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Pill className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {formatCurrency(duoc?.tongDoanhThuDuoc || 315400000)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Đã xuất: <strong>{duoc?.soDonThuocDaXuat || 1180} đơn thuốc</strong></p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Trị TB / Đơn Thuốc</span>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {formatCurrency(duoc?.giaTriTrungBinhDon || 267288)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Chi phí trung bình mỗi toa thuốc</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Cảnh Báo Tồn Kho Thấp</span>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {(duoc?.canhBaoTonKho || []).length} mặt hàng
              </p>
              <p className="text-xs text-amber-700 mt-1">Cần lập phiếu đề xuất nhập kho bổ sung</p>
            </div>
          </div>

          {/* Bảng Top Thuốc Kê Đơn */}
          <MedCard
            title="💊 Top Thuốc Được Kê Đơn Nhiều Nhất"
            subtitle="Danh mục dược phẩm có sản lượng kê đơn cao tại các phòng khám"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Mã Thuốc</th>
                    <th className="py-3 px-4">Tên Thuốc / Biệt Dược</th>
                    <th className="py-3 px-4">Hoạt Chất</th>
                    <th className="py-3 px-4">Nhóm Dược Lý</th>
                    <th className="py-3 px-4 text-center">Số Lượng Đã Kê</th>
                    <th className="py-3 px-4 text-right">Doanh Thu Thuốc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(duoc?.topThuocKeDon || []).map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-primary-700">{t.maThuoc}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{t.tenThuoc}</td>
                      <td className="py-3 px-4 text-gray-600 italic">{t.hoatChat}</td>
                      <td className="py-3 px-4 text-gray-600">{t.loai}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{t.soLuongKe} {t.donVi}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(t.doanhThu)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MedCard>

          {/* Bảng Cảnh Báo Tồn Kho */}
          <MedCard
            title="⚠️ Cảnh Báo Thuốc Chạm Ngưỡng Tồn Kho An Toàn & Hạn Dùng"
            subtitle="Ban Giám Đốc chỉ đạo bộ phận Dược kiểm tra và phê duyệt nhập kho"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Mã Thuốc</th>
                    <th className="py-3 px-4">Tên Thuốc</th>
                    <th className="py-3 px-4 text-center">Tồn Thực Tế</th>
                    <th className="py-3 px-4 text-center">Ngưỡng An Toàn</th>
                    <th className="py-3 px-4">Hạn Sử Dụng</th>
                    <th className="py-3 px-4 text-center">Tình Trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(duoc?.canhBaoTonKho || []).map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">{c.maThuoc}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{c.tenThuoc}</td>
                      <td className="py-3 px-4 text-center font-black text-rose-600">{c.tonKhoHienTai} {c.donVi}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-600">{c.tonKhoToiThieu} {c.donVi}</td>
                      <td className="py-3 px-4 text-gray-600">{c.hanDung}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          c.mucDo === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {c.mucDo === 'danger' ? 'Nguy cấp - Cần nhập ngay' : 'Sắp hết hàng'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MedCard>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: VẬN HÀNH KHOA PHÒNG, PHÒNG MỔ & GIƯỜNG BỆNH                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'phong_giuong' && (
        <div className="space-y-6">
          {/* KPI Cards Vận hành */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Phòng Khám</span>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-700 mt-2">{vanHanh?.tongPhongKham || 11} phòng</p>
              <p className="text-xs text-gray-500 mt-1">Đang hoạt động: <strong className="text-emerald-700">{vanHanh?.phongDangKham || 9} ({vanHanh?.tyLeLieuDungPhong || '81.8%'})</strong></p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phòng Mổ P.204</span>
                <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-teal-700 mt-2">{vanHanh?.phongMo204?.soCaHomNay || 4} ca mổ</p>
              <p className="text-xs text-gray-500 mt-1">Lũy kế tháng: <strong className="text-gray-800">{vanHanh?.phongMo204?.tongCaThang || 68} ca</strong></p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Giường Hồi Tỉnh P.205</span>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bed className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-indigo-700 mt-2">
                {vanHanh?.giuongHoiTinh205?.dangSuDung || 5} / {vanHanh?.giuongHoiTinh205?.tongGiuong || 8} giường
              </p>
              <p className="text-xs text-gray-500 mt-1">Tỷ lệ lấp đầy: <strong className="text-indigo-700">{vanHanh?.giuongHoiTinh205?.tyLeLapDay || '62.5%'}</strong></p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Giường Sẵn Sàng</span>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">{vanHanh?.giuongHoiTinh205?.trongSanSang || 2} giường</p>
              <p className="text-xs text-gray-500 mt-1">Khử trùng UV: <strong className="text-amber-600">{vanHanh?.giuongHoiTinh205?.dangKhuTrung || 1} giường</strong></p>
            </div>
          </div>

          {/* Chi tiết Phòng mổ P.204 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary-600" /> {vanHanh?.phongMo204?.ten}
              </h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Trạng thái: Hoạt động bình thường
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-gray-500">Bác sĩ phẫu thuật chính:</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{vanHanh?.phongMo204?.bacSiChinh}</p>
                <p className="text-gray-500 mt-1">Điều dưỡng hỗ trợ: <strong>{vanHanh?.phongMo204?.dieuDuongPhu}</strong></p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-gray-500">Năng suất hoạt động:</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{vanHanh?.phongMo204?.soCaHomNay} ca mổ / ngày</p>
                <p className="text-emerald-700 mt-1">Hiệu suất phòng: <strong>{vanHanh?.phongMo204?.tyLeCongSuat}</strong></p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-gray-500">Tiêu chuẩn kiểm soát nhiễm khuẩn:</p>
                <p className="font-bold text-emerald-800 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> {vanHanh?.phongMo204?.quyTrinhVoTrung}
                </p>
              </div>
            </div>
          </div>

          {/* Danh sách 8 Giường bệnh Hồi Tỉnh P.205 */}
          <MedCard
            title="🛏️ Chi Tiết Danh Sách 8 Giường Bệnh Hồi Tỉnh & Theo Dõi Tích Cực (P.205)"
            subtitle="Theo dõi tên bệnh nhân, chẩn đoán, giờ tiếp nhận và chỉ số sinh hiệu thời gian thực"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Số Giường</th>
                    <th className="py-3 px-4">Bệnh Nhân</th>
                    <th className="py-3 px-4">Tuổi</th>
                    <th className="py-3 px-4">Chẩn Đoán / Lý Do Lưu Viện</th>
                    <th className="py-3 px-4">Vào Lúc</th>
                    <th className="py-3 px-4">Chỉ Số Sinh Hiệu (Mạch / HA / SpO2)</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(vanHanh?.giuongHoiTinh205?.danhSachGiuong || []).map((g) => (
                    <tr key={g.soGiuong} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-extrabold text-sm text-primary-700">{g.soGiuong}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900">{g.benhNhan || 'Giường Trống'}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{g.tuoi ? `${g.tuoi} tuổi` : '-'}</td>
                      <td className="py-3 px-4 text-gray-700 font-medium">{g.chanDoan || 'Sẵn sàng tiếp nhận bệnh nhân'}</td>
                      <td className="py-3 px-4 text-gray-600">{g.vaoLuc || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-semibold text-gray-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {g.sinhHieu}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          g.trangThai === 'dang_su_dung'
                            ? 'bg-blue-100 text-blue-800'
                            : g.trangThai === 'trong_san_sang'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {g.trangThai === 'dang_su_dung'
                            ? 'Đang lưu viện'
                            : g.trangThai === 'trong_san_sang'
                            ? 'Trống sẵn sàng'
                            : 'Khử trùng UV'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MedCard>
        </div>
      )}
    </div>
  );
}
