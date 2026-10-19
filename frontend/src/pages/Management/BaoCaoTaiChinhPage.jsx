import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const formatLocalDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
import {
  DollarSign, Download, Search, Calendar, CreditCard,
  TrendingUp, RefreshCw, ArrowDownRight, Wallet,
  Printer, Stethoscope, FlaskConical, Pill, ShieldCheck,
  AlertTriangle, Clock, Users
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import InBaoCaoToanDienGiamDocModal from './InBaoCaoToanDienGiamDocModal';

const PHUONG_THUC_LABEL = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản QR',
  the: 'Thẻ POS',
  vnpay: 'Cổng VNPay',
  momo: 'Ví MoMo',
  bao_hiem: 'BHYT chi trả',
};

const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

function PaginationControl({ currentPage, totalItems, pageSize = 20, onPageChange }) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalItems <= pageSize) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-xl text-xs text-gray-600 mt-2">
      <div>
        Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> trong tổng số <strong>{totalItems}</strong> mục
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors"
        >
          Trước
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
            if (p === 2 || p === totalPages - 1) return <span key={p} className="px-1 text-gray-400">...</span>;
            return null;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-colors ${
                currentPage === p
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-white hover:bg-slate-100 text-gray-700'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

export default function BaoCaoTaiChinhPage() {
  const currentDate = new Date();
  const initialFirstDay = formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const initialToday = formatLocalDate(currentDate);

  const [activeTab, setActiveTab] = useState('tai_chinh'); // 'tai_chinh' | 'lam_sang' | 'duoc'
  const [timeRange, setTimeRange] = useState('thang_nay');
  const [tuNgay, setTuNgay] = useState(initialFirstDay);
  const [denNgay, setDenNgay] = useState(initialToday);
  const [phuongThuc, setPhuongThuc] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Sub-views khi bấm vào từng thẻ nhỏ
  const [taiChinhSubView, setTaiChinhSubView] = useState('thu'); // 'thu' | 'chi'
  const [lamSangSubView, setLamSangSubView] = useState('tiep_nhan'); // 'tiep_nhan' | 'cls'
  const [duocSubView, setDuocSubView] = useState('ton_kho'); // 'ton_kho' | 'don_thuoc' | 'can_date' | 'sap_het'

  // Ref để tự động cuộn xuống bảng chi tiết
  const detailTableRef = useRef(null);
  const handleSelectDrillDown = (callback) => {
    if (callback) callback();
    setTimeout(() => {
      if (detailTableRef.current) {
        detailTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Trang phân trang (20 mục / trang)
  const [pageThu, setPageThu] = useState(1);
  const [pageChi, setPageChi] = useState(1);
  const [pageTiepNhan, setPageTiepNhan] = useState(1);
  const [pageCls, setPageCls] = useState(1);
  const [pageTonKho, setPageTonKho] = useState(1);
  const [pageDonThuoc, setPageDonThuoc] = useState(1);
  const [pageCanDate, setPageCanDate] = useState(1);
  const [pageSapHet, setPageSapHet] = useState(1);

  // Từ khóa tìm kiếm cho từng subview
  const [searchChiTerm, setSearchChiTerm] = useState('');
  const [searchTiepNhan, setSearchTiepNhan] = useState('');
  const [searchCls, setSearchCls] = useState('');
  const [searchDuoc, setSearchDuoc] = useState('');

  // Fetch Comprehensive Report Data from Backend
  const { data, isLoading, isFetching, refetch } = useQuery({
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
  const soQuy = report?.soQuy || {};
  const lamSang = report?.lamSang || {};
  const cls = report?.cls || {};
  const duoc = report?.duoc || {};

  const danhSachHoaDon = taiChinh?.danhSachHoaDon || [];
  const danhSachChiPhi = soQuy?.danhSachChiPhi || [];
  const danhSachTiepNhan = lamSang?.danhSachTiepNhan || [];
  const danhSachChiDinhCls = cls?.danhSachChiDinhCls || [];
  const danhSachTonKhoChiTiet = duoc?.danhSachTonKhoChiTiet || [];
  const danhSachDonThuocXuat = duoc?.danhSachDonThuocXuat || [];
  const canhBaoTonKho = duoc?.canhBaoTonKho || [];

  // Lọc và phân trang cho Hóa Đơn Thu
  const filteredHoaDon = danhSachHoaDon.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.maHoaDon?.toLowerCase().includes(term) ||
      item.benhNhanTen?.toLowerCase().includes(term) ||
      item.benhNhanSdt?.includes(term)
    );
  });
  const paginatedHoaDon = filteredHoaDon.slice((pageThu - 1) * 20, pageThu * 20);

  // Lọc và phân trang cho Chi Phí Hoạt Động & NCC
  const filteredChiPhi = danhSachChiPhi.filter(item => {
    if (!searchChiTerm.trim()) return true;
    const term = searchChiTerm.toLowerCase();
    return (
      item.maPhieu?.toLowerCase().includes(term) ||
      item.loaiChi?.toLowerCase().includes(term) ||
      item.khoanChi?.toLowerCase().includes(term) ||
      item.nguoiNhan?.toLowerCase().includes(term) ||
      item.nguoiChi?.toLowerCase().includes(term)
    );
  });
  const paginatedChiPhi = filteredChiPhi.slice((pageChi - 1) * 20, pageChi * 20);

  // Lọc và phân trang cho Tiếp Nhận
  const filteredTiepNhan = danhSachTiepNhan.filter(item => {
    if (!searchTiepNhan.trim()) return true;
    const term = searchTiepNhan.toLowerCase();
    return (
      String(item.maSoThuTu || '').toLowerCase().includes(term) ||
      item.benhNhanTen?.toLowerCase().includes(term) ||
      item.benhNhanSdt?.includes(term) ||
      item.bacSiTen?.toLowerCase().includes(term) ||
      item.chuyenKhoa?.toLowerCase().includes(term)
    );
  });
  const paginatedTiepNhan = filteredTiepNhan.slice((pageTiepNhan - 1) * 20, pageTiepNhan * 20);

  // Lọc và phân trang cho Chỉ Định CLS
  const filteredChiDinhCls = danhSachChiDinhCls.filter(item => {
    if (!searchCls.trim()) return true;
    const term = searchCls.toLowerCase();
    return (
      item.tenDichVu?.toLowerCase().includes(term) ||
      item.benhNhanTen?.toLowerCase().includes(term) ||
      item.benhNhanSdt?.includes(term) ||
      item.bacSiTen?.toLowerCase().includes(term) ||
      item.loaiDichVu?.toLowerCase().includes(term)
    );
  });
  const paginatedChiDinhCls = filteredChiDinhCls.slice((pageCls - 1) * 20, pageCls * 20);

  // Lọc và phân trang cho Tồn Kho Dược
  const filteredTonKho = danhSachTonKhoChiTiet.filter(item => {
    if (!searchDuoc.trim()) return true;
    const term = searchDuoc.toLowerCase();
    return (
      item.maThuoc?.toLowerCase().includes(term) ||
      item.tenThuoc?.toLowerCase().includes(term) ||
      item.tenHoatChat?.toLowerCase().includes(term) ||
      item.maLo?.toLowerCase().includes(term) ||
      item.nhaCungCap?.toLowerCase().includes(term)
    );
  });
  const paginatedTonKho = filteredTonKho.slice((pageTonKho - 1) * 20, pageTonKho * 20);

  // Lọc và phân trang cho Đơn Thuốc Xuất
  const filteredDonThuoc = danhSachDonThuocXuat.filter(item => {
    if (!searchDuoc.trim()) return true;
    const term = searchDuoc.toLowerCase();
    return (
      item.maDonThuoc?.toLowerCase().includes(term) ||
      item.benhNhanTen?.toLowerCase().includes(term) ||
      item.benhNhanSdt?.includes(term) ||
      item.bacSiTen?.toLowerCase().includes(term)
    );
  });
  const paginatedDonThuoc = filteredDonThuoc.slice((pageDonThuoc - 1) * 20, pageDonThuoc * 20);

  // Lọc và phân trang Cận Date FEFO (thuốc có soNgayHetHan <= 90)
  const filteredCanDate = danhSachTonKhoChiTiet.filter(item => {
    const matchSearch = !searchDuoc.trim() || item.tenThuoc?.toLowerCase().includes(searchDuoc.toLowerCase()) || item.maThuoc?.toLowerCase().includes(searchDuoc.toLowerCase());
    return matchSearch && item.soNgayHetHan <= 90;
  });
  const paginatedCanDate = filteredCanDate.slice((pageCanDate - 1) * 20, pageCanDate * 20);

  // Lọc và phân trang Sắp Hết Hàng (tồn <= 100 hoặc tồn theo lô <= 20)
  const filteredSapHet = danhSachTonKhoChiTiet.filter(item => {
    const matchSearch = !searchDuoc.trim() || item.tenThuoc?.toLowerCase().includes(searchDuoc.toLowerCase()) || item.maThuoc?.toLowerCase().includes(searchDuoc.toLowerCase());
    return matchSearch && (item.tonKhoTong <= 100 || item.tonLo <= 20);
  });
  const paginatedSapHet = filteredSapHet.slice((pageSapHet - 1) * 20, pageSapHet * 20);

  // Tổng số cảnh báo đồng bộ chuẩn xác giữa Thẻ KPI và Bảng danh sách chi tiết
  const totalCanDateCount = danhSachTonKhoChiTiet.filter(item => item.soNgayHetHan <= 90).length;
  const totalSapHetCount = danhSachTonKhoChiTiet.filter(item => item.tonKhoTong <= 100 || item.tonLo <= 20).length;

  // Chọn khoảng thời gian nhanh
  const handleSelectQuickRange = (range) => {
    setTimeRange(range);
    const now = new Date();
    if (range === 'hom_nay') {
      const today = formatLocalDate(now);
      setTuNgay(today);
      setDenNgay(today);
    } else if (range === '7_ngay') {
      const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setTuNgay(formatLocalDate(past7));
      setDenNgay(formatLocalDate(now));
    } else if (range === 'thang_nay') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setTuNgay(formatLocalDate(firstDay));
      setDenNgay(formatLocalDate(now));
    } else if (range === 'quy_nay') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1);
      setTuNgay(formatLocalDate(firstDay));
      setDenNgay(formatLocalDate(now));
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

  const getTimeRangeStr = () => {
    if (timeRange === 'hom_nay') return `Hôm nay (${formatDate(tuNgay || new Date())})`;
    if (timeRange === '7_ngay') return `7 ngày qua (${formatDate(tuNgay)} - ${formatDate(denNgay)})`;
    if (timeRange === 'thang_nay') return `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()} (${formatDate(tuNgay)} - ${formatDate(denNgay)})`;
    if (timeRange === 'quy_nay') return `Quý ${Math.floor(new Date().getMonth() / 3) + 1}/${new Date().getFullYear()} (${formatDate(tuNgay)} - ${formatDate(denNgay)})`;
    if (timeRange === 'tat_ca') return 'Toàn thời gian';
    if (tuNgay && denNgay) {
      if (tuNgay === denNgay) return `Ngày ${formatDate(tuNgay)}`;
      return `Từ ${formatDate(tuNgay)} đến ${formatDate(denNgay)}`;
    }
    if (tuNgay) return `Từ ngày ${formatDate(tuNgay)}`;
    return 'Giai đoạn thống kê';
  };

  // In báo cáo
  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 print:p-0">
      {/* ─── NỘI DUNG GIAO DIỆN TRANG - ẨN HOÀN TOÀN KHI IN ĐỂ TRÁNH TRANG TRẮNG THỪA ─── */}
      <div className="print:hidden space-y-6">
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
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors disabled:opacity-75 cursor-pointer"
            title="Tải lại số liệu báo cáo mới nhất từ CSDL"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary-600 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Đang làm mới...' : 'Làm mới'}</span>
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

      {/* ─── NAVIGATION TABS CHO 3 MẢNG BÁO CÁO CHÍNH ───────────────────── */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 gap-2 overflow-x-auto print:hidden">
        {[
          { id: 'tai_chinh', label: '💰 Sổ Quỹ & Doanh Thu Viện Phí', icon: DollarSign },
          { id: 'lam_sang', label: '🩺 Khám Bệnh & Cận Lâm Sàng (CLS)', icon: Stethoscope },
          { id: 'duoc', label: '💊 Kho Dược & Tồn Kho FEFO', icon: Pill },
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
          {/* 4 KPI Cards Sổ Quỹ & Dòng tiền Toàn Viện - Có thể bấm để xem chi tiết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => handleSelectDrillDown(() => { setTaiChinhSubView('thu'); setPageThu(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                taiChinhSubView === 'thu'
                  ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/20 shadow-md'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
              }`}
              title="Bấm để xem danh sách chi tiết các hóa đơn thu viện phí"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${taiChinhSubView === 'thu' ? 'bg-blue-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Tổng Thu Viện Phí
                </span>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {isLoading ? '...' : formatCurrency(taiChinh?.tongThucThu || 0)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Đã phát hành: <strong>{taiChinh?.tongGiaoDich || 0}</strong> HĐ</p>
                <span className="text-[10px] font-semibold text-blue-600/85 hover:text-blue-700 hover:underline">Chi tiết →</span>
              </div>
            </div>

            <div
              onClick={() => handleSelectDrillDown(() => { setTaiChinhSubView('chi'); setPageChi(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                taiChinhSubView === 'chi'
                  ? 'border-rose-500 ring-2 ring-rose-400 bg-rose-50/20 shadow-md'
                  : 'border-slate-200 hover:border-rose-300 hover:shadow-xs'
              }`}
              title="Bấm để xem danh sách chi tiết các khoản chi hoạt động & mua thuốc NCC"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${taiChinhSubView === 'chi' ? 'bg-rose-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Tổng Chi Hoạt Động & NCC
                </span>
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-2">
                {isLoading ? '...' : formatCurrency(soQuy?.tongChiHoatDong || 0)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-rose-700">Chi NCC: <strong>{formatCurrency(soQuy?.chiMuaThuocNcc || 0)}</strong></p>
                <span className="text-[10px] font-semibold text-rose-600/85 hover:text-rose-700 hover:underline">Chi tiết →</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-200 bg-emerald-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Thực Thu Ròng (Dòng Tiền)</span>
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                {isLoading ? '...' : formatCurrency(soQuy?.thucThuRong || (taiChinh?.tongThucThu || 0))}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Sau khi khấu trừ các khoản chi trả NCC</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cơ Cấu Tiền Mặt / Điện Tử</span>
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <p className="text-base font-bold text-gray-900 mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">💵 Tiền mặt két:</span>
                <span className="font-extrabold text-purple-900">{formatCurrency(soQuy?.tienMatTaiKet || taiChinh?.byPhuongThuc?.tien_mat || 0)}</span>
              </p>
              <p className="text-base font-bold text-gray-900 mt-1 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">💳 Điện tử (QR/POS/BHYT):</span>
                <span className="font-extrabold text-blue-700">{formatCurrency(soQuy?.chuyenKhoanNganHang || (Number(taiChinh?.tongThucThu || 0) - Number(soQuy?.tienMatTaiKet || 0)))}</span>
              </p>
            </div>
          </div>

          {/* Dòng tiền theo phương thức thanh toán */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary-600" /> Phân Phối Dòng Tiền Theo Kênh Thanh Toán
              </h3>
              <span className="text-xs text-gray-500 italic">Bấm vào từng kênh để lọc nhanh danh sách giao dịch</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(taiChinh?.byPhuongThuc || {}).map(([pt, val]) => {
                const isSelected = phuongThuc === pt && taiChinhSubView === 'thu';
                return (
                  <div
                    key={pt}
                    onClick={() => {
                      handleSelectDrillDown(() => {
                        setPhuongThuc(pt);
                        setTaiChinhSubView('thu');
                        setPageThu(1);
                      });
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-primary-500 ring-2 ring-primary-300 shadow-xs'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-xs text-gray-500 font-semibold truncate">{PHUONG_THUC_LABEL[pt] || pt}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(val)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {taiChinh?.tongThucThu ? `${Math.round((val / taiChinh.tongThucThu) * 100)}% tổng thu` : '0%'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wrapper vùng bảng chi tiết có ref để cuộn mượt mà */}
          <div ref={detailTableRef} className="scroll-mt-6">

          {/* TAB CON 1: BẢNG KÊ THU (HÓA ĐƠN VIỆN PHÍ) */}
          {taiChinhSubView === 'thu' && (
            <MedCard
              title="🧾 Bảng Kê Chi Tiết Hóa Đơn & Giao Dịch Viện Phí"
              subtitle={`Hiển thị ${filteredHoaDon.length} giao dịch đã thanh toán thành công (20 giao dịch/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã HĐ, tên bệnh nhân..."
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setPageThu(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-48 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <select
                    value={phuongThuc}
                    onChange={e => { setPhuongThuc(e.target.value); setPageThu(1); }}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="all">Tất cả phương thức</option>
                    <option value="tien_mat">Tiền mặt</option>
                    <option value="chuyen_khoan">Chuyển khoản QR</option>
                    <option value="the">Thẻ POS</option>
                    <option value="vnpay">VNPay</option>
                    <option value="momo">MoMo</option>
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
                    {paginatedHoaDon.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-400">
                          Không tìm thấy hóa đơn nào trong khoảng thời gian đã chọn
                        </td>
                      </tr>
                    ) : (
                      paginatedHoaDon.map(hd => (
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
              <PaginationControl
                currentPage={pageThu}
                totalItems={filteredHoaDon.length}
                pageSize={20}
                onPageChange={setPageThu}
              />
            </MedCard>
          )}

          {/* TAB CON 2: BẢNG KÊ CHI (CHI PHÍ HOẠT ĐỘNG & CHI TRẢ THUỐC NCC) */}
          {taiChinhSubView === 'chi' && (
            <MedCard
              title="💸 Bảng Kê Chi Tiết Chi Hoạt Động & Chi Trả Nhà Cung Cấp"
              subtitle={`Hiển thị ${filteredChiPhi.length} khoản chi đã hoàn tất (20 khoản chi/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã phiếu, người nhận, lý do chi..."
                      value={searchChiTerm}
                      onChange={e => { setSearchChiTerm(e.target.value); setPageChi(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-60 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSelectDrillDown(() => { setTaiChinhSubView('thu'); setPageThu(1); })}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    ← Quay lại bảng thu
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-50/60 text-rose-800 font-bold uppercase tracking-wider border-b border-rose-100">
                    <tr>
                      <th className="py-3 px-4">Mã Phiếu / Đơn Chi</th>
                      <th className="py-3 px-4">Khoản Mục Chi</th>
                      <th className="py-3 px-4">Người Nhận / Đối Tác</th>
                      <th className="py-3 px-4">Ngày Chi</th>
                      <th className="py-3 px-4">Phương Thức</th>
                      <th className="py-3 px-4 text-right">Số Tiền Chi</th>
                      <th className="py-3 px-4">Người Thực Hiện</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedChiPhi.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-gray-400">
                          Chưa có khoản chi hoạt động hay chi trả NCC nào trong kỳ báo cáo này
                        </td>
                      </tr>
                    ) : (
                      paginatedChiPhi.map(cp => (
                        <tr key={cp.id + '-' + cp.maPhieu} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-rose-700">{cp.maPhieu}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{cp.loaiChi}</p>
                            <p className="text-[11px] text-gray-500">{cp.khoanChi || cp.ghiChu || '-'}</p>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">{cp.nguoiNhan || '-'}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {cp.ngayChi ? new Date(cp.ngayChi).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-gray-700 text-[11px] font-semibold">
                              {PHUONG_THUC_LABEL[cp.phuongThucChi] || cp.phuongThucChi}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                            {formatCurrency(cp.soTien)}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{cp.nguoiChi || 'Thủ quỹ'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControl
                currentPage={pageChi}
                totalItems={filteredChiPhi.length}
                pageSize={20}
                onPageChange={setPageChi}
              />
            </MedCard>
          )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: KHÁM BỆNH & CẬN LÂM SÀNG                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'lam_sang' && (
        <div className="space-y-6">
          {/* KPI Cards Lâm sàng & CLS - Bấm để chuyển bảng chi tiết */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div
              onClick={() => handleSelectDrillDown(() => { setLamSangSubView('tiep_nhan'); setPageTiepNhan(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                lamSangSubView === 'tiep_nhan'
                  ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/20 shadow-md'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
              }`}
              title="Bấm để xem danh sách chi tiết các lượt tiếp nhận khám bệnh"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${lamSangSubView === 'tiep_nhan' ? 'bg-blue-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Tổng Tiếp Nhận
                </span>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-700 mt-2">{lamSang?.totalTiepNhan ?? 0} lượt</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Hôm nay: <strong className="text-gray-800">{lamSang?.tiepNhanHomNay || 0}</strong></p>
                <span className="text-[10px] font-semibold text-blue-600/85 hover:text-blue-700 hover:underline">Chi tiết →</span>
              </div>
            </div>

            <div
              onClick={() => handleSelectDrillDown(() => { setLamSangSubView('cls'); setPageCls(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                lamSangSubView === 'cls'
                  ? 'border-purple-500 ring-2 ring-purple-400 bg-purple-50/20 shadow-md'
                  : 'border-slate-200 hover:border-purple-300 hover:shadow-xs'
              }`}
              title="Bấm để xem danh sách chi tiết các ca chỉ định cận lâm sàng"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${lamSangSubView === 'cls' ? 'bg-purple-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Tổng Ca Chỉ Định CLS
                </span>
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FlaskConical className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 mt-2">{cls?.tongChiDinh || 0} ca</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Đã có KQ: <strong className="text-emerald-700">{cls?.tyLeHoanThanh || '100%'}</strong></p>
                <span className="text-[10px] font-semibold text-purple-600/85 hover:text-purple-700 hover:underline">Chi tiết →</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thời Gian Chờ CLS TB</span>
                <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-teal-700 mt-2">{cls?.thoiGianChoTB || '14.5 phút'}</p>
              <p className="text-xs text-gray-500 mt-1">Tối ưu nhờ định tuyến thông minh</p>
            </div>

            <div
              onClick={() => handleSelectDrillDown(() => { setLamSangSubView('cls'); setPageCls(1); })}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer shadow-2xs"
              title="Bấm để xem các ca chỉ định CLS đang xử lý"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đang Thực Hiện</span>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">{cls?.dangThucHien ?? 0} ca</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>Chờ lấy mẫu: <strong>{cls?.choTiepNhan ?? 0} ca</strong></span>
                <span className="text-[10px] font-semibold text-amber-700/85 hover:text-amber-800 hover:underline">Chi tiết →</span>
              </div>
            </div>
          </div>

          {/* Kênh tiếp nhận bệnh nhân */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-800 mb-3">📱 Phân Tích Kênh Tiếp Đón Bệnh Nhân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Bảng tổng hợp theo Chuyên Khoa & Dịch vụ CLS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bảng thống kê theo Chuyên Khoa */}
            <MedCard
              title="🏥 Lưu Lượng Theo Chuyên Khoa"
              subtitle="Phân bổ số lượt khám theo từng chuyên khoa"
            >
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Chuyên Khoa</th>
                      <th className="py-2.5 px-3">Bác Sĩ Phụ Trách</th>
                      <th className="py-2.5 px-3 text-center">Số Ca</th>
                      <th className="py-2.5 px-3 text-right">Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(lamSang?.chuyenKhoaStats || []).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-gray-400">Chưa có dữ liệu</td>
                      </tr>
                    ) : (
                      (lamSang?.chuyenKhoaStats || []).map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-gray-900">{c.chuyenKhoa}</td>
                          <td className="py-2.5 px-3 text-gray-600">{c.bacSiPhuTrach}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-primary-700">{c.soCa} ca</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(c.doanhThu)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </MedCard>

            {/* Bảng chi tiết dịch vụ Cận Lâm Sàng */}
            <MedCard
              title="🧪 Sản Lượng Dịch Vụ Cận Lâm Sàng (CLS)"
              subtitle="Số ca và tỷ lệ hoàn thành trả kết quả"
            >
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Tên Dịch Vụ</th>
                      <th className="py-2.5 px-3">Loại</th>
                      <th className="py-2.5 px-3 text-center">Số Ca</th>
                      <th className="py-2.5 px-3 text-right">Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(cls?.danhMucDichVu || []).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-gray-400">Chưa có dịch vụ</td>
                      </tr>
                    ) : (
                      (cls?.danhMucDichVu || []).map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-gray-900 truncate max-w-[140px]">{d.tenDichVu}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.loai === 'Xét nghiệm' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {d.loai}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-gray-800">{d.soCa}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(d.doanhThu)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </MedCard>
          </div>

          {/* Wrapper vùng bảng chi tiết có ref để cuộn mượt mà */}
          <div ref={detailTableRef} className="scroll-mt-6">

          {/* TAB CON 1: BẢNG KÊ CHI TIẾT LƯỢT TIẾP NHẬN BỆNH NHÂN */}
          {lamSangSubView === 'tiep_nhan' && (
            <MedCard
              title="📋 Bảng Kê Chi Tiết Lượt Tiếp Nhận Bệnh Nhân"
              subtitle={`Hiển thị ${filteredTiepNhan.length} lượt tiếp đón trong kỳ (20 lượt/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã số, tên bệnh nhân, bác sĩ..."
                      value={searchTiepNhan}
                      onChange={e => { setSearchTiepNhan(e.target.value); setPageTiepNhan(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-60 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSelectDrillDown(() => { setLamSangSubView('cls'); setPageCls(1); })}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                  >
                    Xem chỉ định CLS →
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-blue-50/60 text-blue-900 font-bold uppercase tracking-wider border-b border-blue-100">
                    <tr>
                      <th className="py-3 px-4">Mã / Số Thứ Tự</th>
                      <th className="py-3 px-4">Bệnh Nhân</th>
                      <th className="py-3 px-4">Phòng Khám / Chuyên Khoa</th>
                      <th className="py-3 px-4">Bác Sĩ Phụ Trách</th>
                      <th className="py-3 px-4">Kênh Tiếp Đón</th>
                      <th className="py-3 px-4">Thời Gian Đến</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTiepNhan.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-gray-400">
                          Không tìm thấy lượt tiếp nhận nào trong khoảng thời gian đã chọn
                        </td>
                      </tr>
                    ) : (
                      paginatedTiepNhan.map(tn => (
                        <tr key={tn.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-primary-700">#{tn.maSoThuTu}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{tn.benhNhanTen}</p>
                            <p className="text-[11px] text-gray-500">{tn.benhNhanSdt} • {tn.benhNhanGioiTinh || '-'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-gray-800">{tn.tenPhong || tn.chuyenKhoa}</p>
                            <p className="text-[11px] text-gray-500">{tn.chuyenKhoa}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{tn.bacSiTen}</td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-gray-700 text-[11px] font-semibold">
                              {tn.nguonDonTiep}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {tn.thoiGianDen ? new Date(tn.thoiGianDen).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              tn.trangThai === 'hoan_tat' || tn.trangThai === 'da_kham'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tn.trangThai === 'dang_kham'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {tn.trangThai === 'hoan_tat' || tn.trangThai === 'da_kham' ? 'Đã khám' : tn.trangThai === 'dang_kham' ? 'Đang khám' : 'Đang chờ'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControl
                currentPage={pageTiepNhan}
                totalItems={filteredTiepNhan.length}
                pageSize={20}
                onPageChange={setPageTiepNhan}
              />
            </MedCard>
          )}

          {/* TAB CON 2: BẢNG KÊ CHI TIẾT CA CHỈ ĐỊNH CẬN LÂM SÀNG */}
          {lamSangSubView === 'cls' && (
            <MedCard
              title="🧪 Bảng Kê Chi Tiết Ca Chỉ Định Cận Lâm Sàng & Kết Quả"
              subtitle={`Hiển thị ${filteredChiDinhCls.length} ca chỉ định CLS trong kỳ (20 ca/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm tên dịch vụ, bệnh nhân, bác sĩ..."
                      value={searchCls}
                      onChange={e => { setSearchCls(e.target.value); setPageCls(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-60 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSelectDrillDown(() => { setLamSangSubView('tiep_nhan'); setPageTiepNhan(1); })}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    ← Xem tiếp nhận
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-purple-50/60 text-purple-900 font-bold uppercase tracking-wider border-b border-purple-100">
                    <tr>
                      <th className="py-3 px-4">Mã Chỉ Định</th>
                      <th className="py-3 px-4">Tên Dịch Vụ Kỹ Thuật</th>
                      <th className="py-3 px-4">Phân Loại</th>
                      <th className="py-3 px-4">Bệnh Nhân</th>
                      <th className="py-3 px-4">Bác Sĩ Chỉ Định</th>
                      <th className="py-3 px-4 text-right">Đơn Giá</th>
                      <th className="py-3 px-4">Thời Gian Chỉ Định</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedChiDinhCls.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-400">
                          Không tìm thấy ca chỉ định cận lâm sàng nào trong khoảng thời gian đã chọn
                        </td>
                      </tr>
                    ) : (
                      paginatedChiDinhCls.map(c => (
                        <tr key={c.id} className="hover:bg-purple-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-purple-700">#CLS-{c.id}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{c.tenDichVu}</p>
                            {c.ghiChu && <p className="text-[11px] text-gray-500 italic">{c.ghiChu}</p>}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              c.loaiDichVu === 'Xét nghiệm' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {c.loaiDichVu}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{c.benhNhanTen}</p>
                            <p className="text-[11px] text-gray-500">{c.benhNhanSdt}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{c.bacSiTen}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(c.donGia)}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {c.thoiGianChiDinh ? new Date(c.thoiGianChiDinh).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              c.trangThai === 'co_ket_qua'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.trangThai === 'dang_xu_ly' || c.trangThai === 'dang_lay_mau'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-gray-700'
                            }`}>
                              {c.trangThai === 'co_ket_qua' ? 'Đã có kết quả' : c.trangThai === 'dang_xu_ly' ? 'Đang thực hiện' : c.trangThai === 'dang_lay_mau' ? 'Đang lấy mẫu' : 'Chờ lấy mẫu'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControl
                currentPage={pageCls}
                totalItems={filteredChiDinhCls.length}
                pageSize={20}
                onPageChange={setPageCls}
              />
            </MedCard>
          )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: KHO DƯỢC & QUẦY THUỐC                                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'duoc' && (
        <div className="space-y-6">
          {/* 4 KPI Cards Quản Trị Kho Dược & FEFO - Bấm để xem chi tiết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => handleSelectDrillDown(() => { setDuocSubView('ton_kho'); setPageTonKho(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                duocSubView === 'ton_kho'
                  ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/20 shadow-md'
                  : 'border-slate-200 hover:border-emerald-300 hover:shadow-xs'
              }`}
              title="Bấm để xem bảng kê toàn bộ danh mục thuốc và tồn kho"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${duocSubView === 'ton_kho' ? 'bg-emerald-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Tổng Giá Trị Kho Dược
                </span>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {formatCurrency(duoc?.tongGiaTriKho || 0)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Đang lưu hành: <strong>{duoc?.tongSoMatHang || 0}</strong> mặt hàng</p>
                <span className="text-[10px] font-semibold text-emerald-600/85 hover:text-emerald-700 hover:underline">Chi tiết →</span>
              </div>
            </div>

            <div
              onClick={() => handleSelectDrillDown(() => { setDuocSubView('don_thuoc'); setPageDonThuoc(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                duocSubView === 'don_thuoc'
                  ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/20 shadow-md'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
              }`}
              title="Bấm để xem danh sách chi tiết các đơn thuốc đã xuất bán"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${duocSubView === 'don_thuoc' ? 'bg-blue-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Doanh Thu Kê Đơn
                </span>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pill className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {formatCurrency(duoc?.tongDoanhThuDuoc || 0)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Số toa xuất: <strong>{duoc?.soDonThuocDaXuat ?? 0}</strong> toa</p>
                <span className="text-[10px] font-semibold text-blue-600/85 hover:text-blue-700 hover:underline">Chi tiết →</span>
              </div>
            </div>

            <div
              onClick={() => handleSelectDrillDown(() => { setDuocSubView('can_date'); setPageCanDate(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                duocSubView === 'can_date'
                  ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/30 shadow-md'
                  : 'border-amber-200 bg-amber-50/20 hover:border-amber-400 hover:shadow-xs'
              }`}
              title="Bấm để xem danh sách các lô thuốc cận date theo nguyên tắc FEFO"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${duocSubView === 'can_date' ? 'bg-amber-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Cảnh Báo Cận Date (FEFO)
                </span>
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {totalCanDateCount || duoc?.thuocCanDateFEFO || 0} mặt hàng
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-amber-800">Ưu tiên xuất trước FEFO</p>
                <span className="text-[10px] font-semibold text-amber-700/85 hover:text-amber-800 hover:underline">Chi tiết →</span>
              </div>
            </div>

            <div
              onClick={() => handleSelectDrillDown(() => { setDuocSubView('sap_het'); setPageSapHet(1); })}
              className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer ${
                duocSubView === 'sap_het'
                  ? 'border-rose-500 ring-2 ring-rose-400 bg-rose-50/30 shadow-md'
                  : 'border-rose-200 bg-rose-50/20 hover:border-rose-400 hover:shadow-xs'
              }`}
              title="Bấm để xem danh sách các loại thuốc chạm ngưỡng tồn cần nhập gấp"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${duocSubView === 'sap_het' ? 'bg-rose-600 animate-pulse' : 'bg-transparent'}`}></span>
                  Cảnh Báo Sắp Hết Hàng
                </span>
                <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-2">
                {totalSapHetCount || duoc?.thuocSapHetHang || 0} mặt hàng
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-rose-700">Chạm ngưỡng an toàn</p>
                <span className="text-[10px] font-semibold text-rose-600/85 hover:text-rose-700 hover:underline">Chi tiết →</span>
              </div>
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
                  {(duoc?.topThuocKeDon || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400 font-medium">
                        Chưa có dữ liệu đơn thuốc kê đơn trong khoảng thời gian này
                      </td>
                    </tr>
                  ) : (
                    (duoc?.topThuocKeDon || []).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-primary-700">{t.maThuoc}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{t.tenThuoc}</td>
                        <td className="py-3 px-4 text-gray-600 italic">{t.hoatChat}</td>
                        <td className="py-3 px-4 text-gray-600">{t.loai}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-800">{t.soLuongKe} {t.donVi}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(t.doanhThu)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </MedCard>

          {/* Wrapper vùng bảng chi tiết kho dược có ref để cuộn mượt mà */}
          <div ref={detailTableRef} className="scroll-mt-6">

          {/* TAB CON 1: BẢNG KÊ TOÀN BỘ KHO DƯỢC */}
          {duocSubView === 'ton_kho' && (
            <MedCard
              title="💊 Bảng Kê Toàn Bộ Danh Mục Thuốc & Tồn Kho Dược"
              subtitle={`Hiển thị ${filteredTonKho.length} mặt hàng dược phẩm (20 mặt hàng/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã, tên thuốc, hoạt chất, số lô..."
                      value={searchDuoc}
                      onChange={e => { setSearchDuoc(e.target.value); setPageTonKho(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-64 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSelectDrillDown(() => { setDuocSubView('don_thuoc'); setPageDonThuoc(1); })}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    Xem đơn thuốc →
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-emerald-50/60 text-emerald-900 font-bold uppercase tracking-wider border-b border-emerald-100">
                    <tr>
                      <th className="py-3 px-4">Mã Thuốc</th>
                      <th className="py-3 px-4">Tên Thuốc / Biệt Dược</th>
                      <th className="py-3 px-4">Hoạt Chất</th>
                      <th className="py-3 px-4">Số Lô (Lot)</th>
                      <th className="py-3 px-4">Hạn Sử Dụng</th>
                      <th className="py-3 px-4 text-center">Tồn Kho</th>
                      <th className="py-3 px-4 text-right">Giá Vốn</th>
                      <th className="py-3 px-4 text-right">Giá Bán</th>
                      <th className="py-3 px-4 text-right">Tổng Giá Trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTonKho.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-8 text-gray-400">
                          Không tìm thấy mặt hàng thuốc nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      paginatedTonKho.map(t => (
                        <tr key={t.id + '-' + (t.maLo || 'default')} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-emerald-800">{t.maThuoc}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{t.tenThuoc}</p>
                            <p className="text-[11px] text-gray-500">{t.tenLoai || 'Thuốc'}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-600 italic">{t.tenHoatChat}</td>
                          <td className="py-3 px-4 font-mono text-gray-700">{t.maLo}</td>
                          <td className="py-3 px-4">
                            <span className={t.soNgayHetHan <= 90 ? 'text-amber-700 font-bold' : 'text-gray-600'}>
                              {t.ngayHetHan ? new Date(t.ngayHetHan).toLocaleDateString('vi-VN') : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-gray-800">
                            {t.tonKhoTong} {t.donViTinh}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(t.giaNhap)}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(t.giaBan)}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700">
                            {formatCurrency(t.tonKhoTong * t.giaBan)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControl
                currentPage={pageTonKho}
                totalItems={filteredTonKho.length}
                pageSize={20}
                onPageChange={setPageTonKho}
              />
            </MedCard>
          )}

          {/* TAB CON 2: BẢNG KÊ CHI TIẾT ĐƠN THUỐC XUẤT BÁN */}
          {duocSubView === 'don_thuoc' && (
            <MedCard
              title="📋 Bảng Kê Chi Tiết Đơn Thuốc Đã Xuất Bán"
              subtitle={`Hiển thị ${filteredDonThuoc.length} đơn thuốc kê đơn trong kỳ (20 đơn/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã đơn, tên bệnh nhân, bác sĩ..."
                      value={searchDuoc}
                      onChange={e => { setSearchDuoc(e.target.value); setPageDonThuoc(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSelectDrillDown(() => { setDuocSubView('ton_kho'); setPageTonKho(1); })}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    ← Xem tồn kho
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-blue-50/60 text-blue-900 font-bold uppercase tracking-wider border-b border-blue-100">
                    <tr>
                      <th className="py-3 px-4">Mã Đơn Thuốc</th>
                      <th className="py-3 px-4">Bệnh Nhân</th>
                      <th className="py-3 px-4">Bác Sĩ Kê Đơn</th>
                      <th className="py-3 px-4">Ngày Kê</th>
                      <th className="py-3 px-4 text-right">Tổng Tiền Thuốc</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedDonThuoc.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400">
                          Chưa có đơn thuốc nào phát sinh trong khoảng thời gian này
                        </td>
                      </tr>
                    ) : (
                      paginatedDonThuoc.map(dt => (
                        <tr key={dt.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-primary-700">{dt.maDonThuoc}</td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{dt.benhNhanTen}</p>
                            <p className="text-[11px] text-gray-500">{dt.benhNhanSdt}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{dt.bacSiTen}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {dt.ngayKe ? new Date(dt.ngayKe).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                            {formatCurrency(dt.tongTien)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800">
                              {dt.trangThai === 'da_cap_phat' ? 'Đã cấp phát' : 'Hoàn tất'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControl
                currentPage={pageDonThuoc}
                totalItems={filteredDonThuoc.length}
                pageSize={20}
                onPageChange={setPageDonThuoc}
              />
            </MedCard>
          )}

          {/* TAB CON 3: BẢNG THEO DÕI THUỐC CẬN DATE (FEFO) */}
          {duocSubView === 'can_date' && (
            <MedCard
              title="⚠️ Danh Sách Lô Thuốc Cận Date Ưu Tiên Xuất Theo Nguyên Tắc FEFO"
              subtitle={`Hiển thị ${filteredCanDate.length} lô thuốc có hạn sử dụng dưới 90 ngày (20 lô/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm tên thuốc, mã thuốc..."
                      value={searchDuoc}
                      onChange={e => { setSearchDuoc(e.target.value); setPageCanDate(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-60 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSelectDrillDown(() => { setDuocSubView('ton_kho'); setPageTonKho(1); })}
                    className="px-3 py-1.5 bg-slate-100 text-gray-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    ← Về kho dược
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-50/70 text-amber-900 font-bold uppercase tracking-wider border-b border-amber-200">
                    <tr>
                      <th className="py-3 px-4">Mã Thuốc</th>
                      <th className="py-3 px-4">Tên Thuốc / Biệt Dược</th>
                      <th className="py-3 px-4">Số Lô (Lot)</th>
                      <th className="py-3 px-4">Hạn Sử Dụng (Exp)</th>
                      <th className="py-3 px-4 text-center">Số Ngày Còn Lại</th>
                      <th className="py-3 px-4 text-center">Số Lượng Tồn</th>
                      <th className="py-3 px-4 text-center">Chỉ Đạo FEFO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedCanDate.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-emerald-600 font-semibold">
                          Tất cả các lô thuốc đều có hạn dùng an toàn trên 90 ngày
                        </td>
                      </tr>
                    ) : (
                      paginatedCanDate.map((c, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-900">{c.maThuoc}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{c.tenThuoc}</td>
                          <td className="py-3 px-4 font-mono text-gray-700">{c.maLo}</td>
                          <td className="py-3 px-4 font-bold text-rose-700">
                            {c.ngayHetHan ? new Date(c.ngayHetHan).toLocaleDateString('vi-VN') : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              c.soNgayHetHan <= 30 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              Còn {c.soNgayHetHan} ngày
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-gray-800">{c.tonLo || c.tonKhoTong} {c.donViTinh}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-red-100 text-red-800">
                              Ưu tiên xuất trước (FEFO)
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControl
                currentPage={pageCanDate}
                totalItems={filteredCanDate.length}
                pageSize={20}
                onPageChange={setPageCanDate}
              />
            </MedCard>
          )}

          {/* TAB CON 4: BẢNG THUỐC SẮP HẾT HÀNG / TỒN DƯỚI NGƯỠNG */}
          {duocSubView === 'sap_het' && (
            <MedCard
              title="🚨 Danh Sách Thuốc Chạm Ngưỡng Tồn Kho Tối Thiểu Cần Nhập"
              subtitle={`Hiển thị ${filteredSapHet.length} mặt hàng thuốc có số lượng tồn thấp (20 mặt hàng/trang)`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm tên thuốc, mã thuốc..."
                      value={searchDuoc}
                      onChange={e => { setSearchDuoc(e.target.value); setPageSapHet(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs w-60 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleSelectDrillDown(() => { setDuocSubView('ton_kho'); setPageTonKho(1); })}
                    className="px-3 py-1.5 bg-slate-100 text-gray-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    ← Về kho dược
                  </button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-50/70 text-rose-900 font-bold uppercase tracking-wider border-b border-rose-200">
                    <tr>
                      <th className="py-3 px-4">Mã Thuốc</th>
                      <th className="py-3 px-4">Tên Thuốc / Biệt Dược</th>
                      <th className="py-3 px-4">Số Lô (Lot)</th>
                      <th className="py-3 px-4 text-center">Tồn Lô / Tổng Tồn</th>
                      <th className="py-3 px-4 text-center">Ngưỡng An Toàn</th>
                      <th className="py-3 px-4 text-center">Tình Trạng</th>
                      <th className="py-3 px-4 text-right">Đơn Giá Bán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedSapHet.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-emerald-600 font-semibold">
                          Tất cả các loại thuốc đều đảm bảo mức tồn kho an toàn
                        </td>
                      </tr>
                    ) : (
                      paginatedSapHet.map((s, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-rose-900">{s.maThuoc}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{s.tenThuoc}</td>
                          <td className="py-3 px-4 font-mono text-gray-700">{s.maLo || 'LO-CHUNG'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-black text-rose-600 text-sm">{s.tonLo}</span>
                            <span className="text-xs text-gray-500"> / {s.tonKhoTong} {s.donViTinh}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-600">100 {s.donViTinh}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              s.tonKhoTong === 0
                                ? 'bg-rose-200 text-rose-900'
                                : s.tonLo <= 20
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {s.tonKhoTong === 0
                                ? 'Hết hàng toàn viện'
                                : s.tonLo <= 20
                                ? `Lô sắp hết (${s.tonLo} ${s.donViTinh})`
                                : `Tổng tồn thấp (${s.tonKhoTong} ${s.donViTinh})`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-800">{formatCurrency(s.giaBan)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControl
                currentPage={pageSapHet}
                totalItems={filteredSapHet.length}
                pageSize={20}
                onPageChange={setPageSapHet}
              />
            </MedCard>
          )}
          </div>
        </div>
      )}
      </div>

      {/* Modal In Báo Cáo Toàn Diện Khổ A4 Cho Giám Đốc */}
      <InBaoCaoToanDienGiamDocModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        report={report}
        timeRangeStr={getTimeRangeStr()}
      />
    </div>
  );
}
