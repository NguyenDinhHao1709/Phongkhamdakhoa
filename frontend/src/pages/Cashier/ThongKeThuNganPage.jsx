import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import InHoaDonModal from './InHoaDonModal';
import InPhieuChiModal from './InPhieuChiModal';
import ChotCaModal from './ChotCaModal';
import InBienBanChotCaModal from './InBienBanChotCaModal';
import LichSuChotCaModal from './LichSuChotCaModal';
import InBaoCaoSoQuyModal from './InBaoCaoSoQuyModal';
import CaTrucBanner from './CaTrucBanner';
import GuiBaoCaoModal from '../../components/Report/GuiBaoCaoModal';
import LichSuBaoCaoModal from '../../components/Report/LichSuBaoCaoModal';
import {
  DollarSign, Receipt, CreditCard, Clock, RefreshCw, Download,
  Wallet, CheckCircle2, AlertCircle, ArrowUpRight, Printer,
  FileSpreadsheet, ArrowDownRight, TrendingUp, Building2,
  Calendar, Layers, FileText, Check, X, ShieldCheck, History, Send
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

const COLORS = ['#10B981', '#2563EB', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function ThongKeThuNganPage() {
  const { user } = useAuthStore();
  const [timeRange, setTimeRange] = useState('hom_nay');
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null); // Cho in Phiếu Chi
  const [phamVi, setPhamVi] = useState('toan_vien'); // 'toan_vien' (mặc định khớp trang Quản lý HĐ) | 'ca_nhan' (két cá nhân)
  const [documentFilter, setDocumentFilter] = useState('tat_ca'); // 'tat_ca', 'phieu_thu', 'phieu_chi'
  const [searchChungTu, setSearchChungTu] = useState('');
  const [justRefreshed, setJustRefreshed] = useState(false);

  // Modals Chốt Ca & Bàn Giao Két
  const [openChotCaModal, setOpenChotCaModal] = useState(false);
  const [openLichSuModal, setOpenLichSuModal] = useState(false);
  const [chotCaRecord, setChotCaRecord] = useState(null);
  const [openBaoCaoModal, setOpenBaoCaoModal] = useState(false);
  const [isGuiBaoCaoOpen, setIsGuiBaoCaoOpen] = useState(false);
  const [isLichSuBaoCaoOpen, setIsLichSuBaoCaoOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['thong-ke-thu-ngan', user?.id, timeRange, tuNgay, denNgay, phamVi],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('phamVi', phamVi);
      if (tuNgay || denNgay) {
        if (tuNgay) params.append('tuNgay', tuNgay);
        if (denNgay) params.append('denNgay', denNgay);
      } else {
        params.append('range', timeRange || 'tat_ca');
      }
      return apiGet(`/thanh-toan/thong-ke-thu-ngan?${params.toString()}`);
    },
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const stats = data?.data;
  const byPhuongThuc = stats?.byPhuongThuc || {};
  const chungTu = stats?.danhSachChungTu || [];

  // Lọc danh sách chứng từ
  const filteredChungTu = useMemo(() => {
    return chungTu.filter((item) => {
      if (documentFilter !== 'tat_ca' && item.loai !== documentFilter) return false;
      if (!searchChungTu.trim()) return true;
      const kw = searchChungTu.toLowerCase();
      const matchSo = item.soChungTu?.toLowerCase().includes(kw);
      const matchDt = item.doiTuong?.toLowerCase().includes(kw);
      const matchDg = item.dienGiai?.toLowerCase().includes(kw);
      return matchSo || matchDt || matchDg;
    });
  }, [chungTu, documentFilter, searchChungTu]);

  const pieData = useMemo(() => {
    return Object.entries(byPhuongThuc).map(([k, v]) => ({
      name: PHUONG_THUC_LABELS[k] || k,
      value: Number(v),
    }));
  }, [byPhuongThuc]);

  // Bảng đối soát quỹ theo từng phương thức thanh toán
  const cashReconciliation = useMemo(() => {
    const list = chungTu || [];
    const map = {};
    Object.keys(PHUONG_THUC_LABELS).forEach((k) => {
      map[k] = { thu: 0, chi: 0, ton: 0 };
    });

    list.forEach((c) => {
      const pt = c.phuongThuc || 'tien_mat';
      if (!map[pt]) map[pt] = { thu: 0, chi: 0, ton: 0 };
      const amount = Number(c.soTien || 0);
      if (c.loai === 'phieu_thu') {
        map[pt].thu += amount;
      } else if (c.loai === 'phieu_chi') {
        map[pt].chi += amount;
      }
      map[pt].ton = map[pt].thu - map[pt].chi;
    });

    return Object.entries(map)
      .map(([pt, vals]) => ({
        phuongThuc: pt,
        label: PHUONG_THUC_LABELS[pt] || pt,
        ...vals,
      }))
      .filter((row) => row.thu > 0 || row.chi > 0);
  }, [chungTu]);

  const currentTienMat = useMemo(() => {
    return cashReconciliation.find((r) => r.phuongThuc === 'tien_mat')?.ton || 0;
  }, [cashReconciliation]);

  const handleExportCSV = () => {
    const list = filteredChungTu;
    if (list.length === 0) return;
    const headers = ['Loại chứng từ', 'Số chứng từ', 'Đối tượng giao dịch', 'Diễn giải nội dung', 'Số tiền (VNĐ)', 'Phương thức', 'Ngày lập'];
    const rows = list.map((h) => [
      h.loai === 'phieu_thu' ? 'Phiếu thu (+)' : 'Phiếu chi (-)',
      h.soChungTu,
      `"${h.doiTuong || ''}"`,
      `"${h.dienGiai || ''}"`,
      h.loai === 'phieu_thu' ? h.soTien : -h.soTien,
      PHUONG_THUC_LABELS[h.phuongThuc] || h.phuongThuc,
      h.ngayLap ? new Date(h.ngayLap).toLocaleString('vi-VN') : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SoChungTuThuChi_ERP_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintChungTu = async (item) => {
    if (item.loai === 'phieu_thu') {
      try {
        const invoiceId = item.hoaDonId || item.id;
        const res = await apiGet(`/thanh-toan/${invoiceId}`);
        setSelectedInvoice(res?.data || res);
      } catch {
        alert('Không thể mở biên lai thu tiền');
      }
    } else {
      setSelectedVoucher(item);
    }
  };

  const getKyBaoCaoLabel = () => {
    if (tuNgay && denNgay) return `Từ ${formatDate(tuNgay)} đến ${formatDate(denNgay)}`;
    if (tuNgay) return `Từ ngày ${formatDate(tuNgay)}`;
    if (timeRange === 'ca_hien_tai') return 'Ca trực hiện tại';
    if (timeRange === 'hom_nay') return `Hôm nay (${formatDate(new Date())})`;
    if (timeRange === 'tuan_nay') return 'Tuần này';
    if (timeRange === 'thang_nay') return `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    if (timeRange === 'quy_nay') return `Quý ${Math.floor(new Date().getMonth() / 3) + 1}/${new Date().getFullYear()}`;
    if (timeRange === 'tat_ca') return 'Toàn thời gian';
    return `Kỳ ${timeRange || 'thống kê'}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans text-gray-800">
      {/* ─── BANNER QUẢN LÝ TIẾP NHẬN CA TRỰC & BÀN GIAO KÉT TIỀN ─── */}
      <CaTrucBanner onShiftAccepted={() => refetch()} />

      {/* ─── 1. HEADER BÁO CÁO TÀI CHÍNH KẾ TOÁN ERP ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-100">
              <Receipt className="h-3.5 w-3.5 text-emerald-600" /> BÁO CÁO TÀI CHÍNH THU - CHI & DÒNG TIỀN QUỸ (ERP CASH FLOW)
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
              Báo Cáo Thống Kê Thu - Chi & Đối Soát Quỹ
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 flex items-center gap-2">
              {stats?.isCaNhan ? (
                <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
                  <Wallet className="h-3.5 w-3.5 text-blue-500" />
                  Đối soát ca trực thu ngân: <strong className="font-bold text-blue-800">{stats?.tenThuNgan || user?.hoTen}</strong>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                  Doanh thu viện phí (Phiếu Thu) & chi trả NCC (Phiếu Chi) toàn phòng khám
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col items-start xl:items-end gap-2.5 shrink-0">
            {/* Cụm 1: Nghiệp vụ Ca trực & Báo cáo Ban Giám Đốc */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenChotCaModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Chốt ca trực & Kiểm kê két tiền mặt"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Chốt Ca & Bàn Giao Két</span>
              </button>

              <button
                type="button"
                onClick={() => setOpenLichSuModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Xem lịch sử các lần chốt ca"
              >
                <History className="h-3.5 w-3.5 text-blue-600" />
                <span>Lịch Sử Chốt Ca</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuiBaoCaoOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Gửi báo cáo ca trực lên Ban Giám Đốc"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Gửi Báo Cáo BGĐ</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLichSuBaoCaoOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Xem lịch sử báo cáo & ý kiến chỉ đạo từ Ban Giám Đốc"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>Lịch Sử & Chỉ Đạo</span>
              </button>
            </div>

            {/* Cụm 2: Nhóm tiện ích kết xuất dữ liệu (Làm mới • In • Xuất CSV) */}
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50/80 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:shadow-2xs transition active:scale-95 disabled:opacity-75 cursor-pointer whitespace-nowrap"
                title="Đồng bộ lại số liệu mới nhất từ CSDL"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isFetching ? 'animate-spin' : ''}`} />
                <span>{isFetching ? 'Đang nạp...' : justRefreshed ? 'Đã làm mới!' : 'Làm mới'}</span>
              </button>
              <div className="h-3.5 w-px bg-gray-200" />
              <button
                type="button"
                onClick={() => setOpenBaoCaoModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="In phiếu báo cáo tổng hợp"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-600" />
                <span>In Báo Cáo</span>
              </button>
              <div className="h-3.5 w-px bg-gray-200" />
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-white hover:shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Xuất dữ liệu định dạng file Excel / CSV"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Xuất Sổ CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── THANH ĐIỀU KHIỂN & BỘ LỌC TÍCH HỢP (UNIFIED CONTROL BAR) ─── */}
        <div className="mt-5 rounded-2xl bg-slate-50/80 p-3 border border-slate-200/80 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Phạm vi thống kê */}
            <div className="inline-flex rounded-xl bg-white p-1 shadow-2xs border border-gray-200">
              <button
                type="button"
                onClick={() => setPhamVi('toan_vien')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  phamVi === 'toan_vien'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Toàn phòng khám (Tổng viện)</span>
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${phamVi === 'toan_vien' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {stats?.soHoaDonToanVien ? `${stats.soHoaDonToanVien} HĐ` : '37 HĐ'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPhamVi('ca_nhan')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  phamVi === 'ca_nhan'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>Ca trực của tôi (Két cá nhân)</span>
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${phamVi === 'ca_nhan' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {stats?.soHoaDonCaNhan ? `${stats.soHoaDonCaNhan} HĐ` : '4 HĐ'}
                </span>
              </button>
            </div>

            <div className="h-5 w-px bg-gray-300 hidden md:block" />

            {/* 2. Chu kỳ thời gian */}
            <div className="inline-flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
              {[
                { key: 'ca_hien_tai', label: '🎯 Ca Hiện Tại' },
                { key: 'hom_nay', label: 'Hôm nay' },
                { key: 'tuan_nay', label: 'Tuần này' },
                { key: 'thang_nay', label: 'Tháng này' },
                { key: 'quy_nay', label: 'Quý này' },
                { key: 'tat_ca', label: 'Toàn thời gian' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setTimeRange(tab.key);
                    setTuNgay('');
                    setDenNgay('');
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    timeRange === tab.key && !tuNgay && !denNgay
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Khoảng ngày tùy chọn */}
          <div className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs self-start xl:self-auto">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-500 font-medium whitespace-nowrap">Từ</span>
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => {
                setTuNgay(e.target.value);
                setTimeRange('');
              }}
              className="bg-transparent text-xs text-gray-800 font-medium focus:outline-none"
            />
            <span className="text-gray-400 font-bold">➔</span>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => {
                setDenNgay(e.target.value);
                setTimeRange('');
              }}
              className="bg-transparent text-xs text-gray-800 font-medium focus:outline-none"
            />
            {(tuNgay || denNgay) && (
              <button
                type="button"
                onClick={() => {
                  setTuNgay('');
                  setDenNgay('');
                  setTimeRange('tat_ca');
                }}
                className="ml-1 text-gray-400 hover:text-rose-600 cursor-pointer p-0.5 rounded transition"
                title="Xóa khoảng ngày và quay về Toàn thời gian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. 4 THẺ TÀI CHÍNH CỐT LÕI (CASH FLOW ERP METRICS) ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tổng Thực Thu */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <ArrowDownRight className="h-4 w-4 text-emerald-600" />
              1. Tổng Thực Thu (+)
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {stats?.soPhieuThu ?? stats?.soHoaDonDaThu ?? 0} Phiếu Thu
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">
            {isLoading ? '...' : formatCurrency(stats?.tongPhieuThu ?? stats?.tongThucThu ?? 0)}
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            {phamVi === 'toan_vien' ? 'Toàn bộ viện phí đã thu của toàn phòng khám' : `Viện phí do ${stats?.tenThuNgan || user?.hoTen || 'thu ngân'} thu`}
          </p>
        </div>

        {/* Card 2: Tổng Thực Chi */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-rose-600" />
              2. Tổng Thực Chi (-)
            </span>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
              {stats?.soPhieuChi ?? 0} Phiếu Chi
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">
            {isLoading ? '...' : formatCurrency(stats?.tongPhieuChi ?? 0)}
          </p>
          <p className="mt-1 text-xs text-rose-600">Chi trả mua thuốc cho các Nhà cung cấp</p>
        </div>

        {/* Card 3: Dòng Tiền Thuần */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              3. Dòng Tiền Thuần (=)
            </span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
              Thu - Chi
            </span>
          </div>
          <p className={`mt-2 text-2xl font-black ${Number(stats?.soDuDongTien || 0) >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {isLoading ? '...' : formatCurrency(stats?.soDuDongTien ?? ((stats?.tongThucThu || 0) - (stats?.tongPhieuChi || 0)))}
          </p>
          <p className="mt-1 text-xs text-blue-600">Tăng/giảm quỹ thực tế trong kỳ</p>
        </div>

        {/* Card 4: Công Nợ & Miễn Giảm */}
        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-purple-600" />
              4. Công Nợ & Giảm Trừ
            </span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
              Kế toán
            </span>
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {stats?.soHoaDonChoThu || 0} HĐ chờ thu
          </p>
          <p className="mt-0.5 text-xs text-purple-700 font-medium">
            Miễn giảm / BHYT: <b>{formatCurrency(stats?.tongTienGiam || 0)}</b>
          </p>
        </div>
      </div>

      {/* ─── 3. BẢNG ĐỐI SOÁT QUỸ THEO KÊNH THANH TOÁN (CASH RECONCILIATION) ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Bảng Đối Soát Quỹ Theo Phương Thức Thanh Toán (Kiểm Kê Két & Chốt Ca)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Phân loại chi tiết dòng tiền vào và ra theo từng kênh phục vụ bàn giao ca trực và đối soát sao kê ngân hàng.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-600">
                <th className="py-2.5 pl-4">Phương thức thanh toán</th>
                <th className="py-2.5 text-right text-emerald-700">Tổng Thu (+)</th>
                <th className="py-2.5 text-right text-rose-700">Tổng Chi (-)</th>
                <th className="py-2.5 text-right font-extrabold text-blue-900 pr-4">Số Dư Quỹ Thực Tồn (=)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cashReconciliation.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    Chưa phát sinh giao dịch thu chi trong chu kỳ đã chọn.
                  </td>
                </tr>
              ) : (
                cashReconciliation.map((r) => (
                  <tr key={r.phuongThuc} className="hover:bg-gray-50/60">
                    <td className="py-2.5 pl-4 font-semibold text-gray-800 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {r.label}
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-700">
                      {formatCurrency(r.thu)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-rose-700">
                      {formatCurrency(r.chi)}
                    </td>
                    <td className="py-2.5 text-right font-black text-blue-900 pr-4 text-sm">
                      {formatCurrency(r.ton)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {cashReconciliation.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold border-t border-gray-200">
                  <td className="py-2.5 pl-4 uppercase text-gray-800">TỔNG CỘNG TOÀN BỘ QUỸ:</td>
                  <td className="py-2.5 text-right text-emerald-700">{formatCurrency(stats?.tongPhieuThu ?? stats?.tongThucThu ?? 0)}</td>
                  <td className="py-2.5 text-right text-rose-700">{formatCurrency(stats?.tongPhieuChi ?? 0)}</td>
                  <td className="py-2.5 text-right text-blue-900 pr-4 text-sm">
                    {formatCurrency(stats?.soDuDongTien ?? ((stats?.tongThucThu || 0) - (stats?.tongPhieuChi || 0)))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ─── 4. BIỂU ĐỒ DÒNG TIỀN THEO GIỜ & CƠ CẤU PHƯƠNG THỨC ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MedCard
            title="⏱️ Dòng Tiền Theo Giờ Trong Ca (Hôm Nay)"
            subtitle="Tổng số tiền thực thu tại quầy theo các khung giờ trực"
          >
            <div className="h-64 w-full pt-2">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">Đang tải biểu đồ...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chartTheoGio || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="gio" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => [formatCurrency(v), 'Thực thu']} />
                    <Bar dataKey="tien" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>

        <div>
          <MedCard title="💳 Cơ Cấu Phương Thức Thanh Toán" subtitle="Tỷ trọng Tiền mặt vs Chuyển khoản QR vs Thẻ">
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
                      innerRadius={45}
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

      {/* ─── 5. SỔ NHẬT KÝ CHỨNG TỪ THU - CHI CHUẨN KẾ TOÁN (GENERAL CASH BOOK) ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Sổ Nhật Ký Chứng Từ Kế Toán Thu - Chi (Cash Book)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tập hợp toàn bộ Phiếu Thu (viện phí khám, thuốc) và Phiếu Chi (tiền thuốc nhà cung cấp) trong kỳ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
              {[
                { id: 'tat_ca', label: 'Tất cả', count: chungTu.length },
                { id: 'phieu_thu', label: 'Phiếu thu (+)', count: chungTu.filter((x) => x.loai === 'phieu_thu').length },
                { id: 'phieu_chi', label: 'Phiếu chi (-)', count: chungTu.filter((x) => x.loai === 'phieu_chi').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDocumentFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    documentFilter === tab.id
                      ? 'bg-white text-emerald-700 shadow-sm font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Tìm số chứng từ, đối tượng..."
                value={searchChungTu}
                onChange={(e) => setSearchChungTu(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white pl-3 pr-7 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 w-56"
              />
              {searchChungTu && (
                <button
                  type="button"
                  onClick={() => setSearchChungTu('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {(tuNgay || denNgay || searchChungTu || documentFilter !== 'tat_ca') && (
              <button
                type="button"
                onClick={() => {
                  setTuNgay('');
                  setDenNgay('');
                  setTimeRange('tat_ca');
                  setDocumentFilter('tat_ca');
                  setSearchChungTu('');
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                title="Khôi phục toàn bộ điều kiện lọc về mặc định"
              >
                <X className="h-3 w-3" /> Đặt lại lọc
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-600">
                <th className="py-3 pl-4">Loại</th>
                <th className="py-3">Số chứng từ</th>
                <th className="py-3">Đối tượng giao dịch</th>
                <th className="py-3">Diễn giải nội dung thu / chi</th>
                <th className="py-3 text-center">Phương thức</th>
                <th className="py-3 text-right">Số tiền</th>
                <th className="py-3">Ngày lập</th>
                <th className="py-3 text-center pr-4">In chứng từ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredChungTu.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400">
                    Chưa có chứng từ nào phù hợp với bộ lọc trong kỳ.
                  </td>
                </tr>
              ) : (
                filteredChungTu.map((item, idx) => {
                  const isThu = item.loai === 'phieu_thu';
                  return (
                    <tr key={`${item.loai}-${item.soChungTu}-${idx}`} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 pl-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isThu
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {isThu ? '+ Thu' : '- Chi'}
                        </span>
                      </td>

                      <td className="py-3 font-mono font-bold text-gray-900">
                        {item.soChungTu}
                      </td>

                      <td className="py-3 font-semibold text-gray-800">
                        {item.doiTuong}
                      </td>

                      <td className="py-3 text-gray-600 max-w-xs truncate" title={item.dienGiai}>
                        {item.dienGiai}
                      </td>

                      <td className="py-3 text-center">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                          {PHUONG_THUC_LABELS[item.phuongThuc] || item.phuongThuc}
                        </span>
                      </td>

                      <td className={`py-3 text-right font-extrabold text-sm ${isThu ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isThu ? '+' : '-'}{formatCurrency(item.soTien)}
                      </td>

                      <td className="py-3 text-gray-500 text-[11px]">
                        {formatDateTime(item.ngayLap)}
                      </td>

                      <td className="py-3 text-center pr-4">
                        <button
                          type="button"
                          onClick={() => handlePrintChungTu(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                          title="In chứng từ"
                        >
                          <Printer className="h-3.5 w-3.5 text-gray-500" />
                          <span>In phiếu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL IN PHIẾU THU (HÓA ĐƠN VIỆN PHÍ) ─── */}
      {selectedInvoice && (
        <InHoaDonModal hoaDon={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      {/* ─── MODAL IN PHIẾU CHI TIỀN (PAYMENT VOUCHER) ─── */}
      {/* Modal In Phiếu Chi Tiền Chuẩn Mẫu 02-TT Bộ Tài Chính */}
      {selectedVoucher && (
        <InPhieuChiModal
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      )}

      {/* Modal Chốt Ca Làm Việc & Kiểm Kê Két Tiền */}
      {openChotCaModal && (
        <ChotCaModal
          onClose={() => setOpenChotCaModal(false)}
          defaultSystemCash={currentTienMat}
          onSuccess={(record) => {
            refetch();
            setChotCaRecord(record);
          }}
        />
      )}

      {/* Modal Sổ Lịch Sử Chốt Ca & Đối Soát */}
      {openLichSuModal && (
        <LichSuChotCaModal
          onClose={() => setOpenLichSuModal(false)}
          onSelectRecord={(rec) => {
            setOpenLichSuModal(false);
            setChotCaRecord(rec);
          }}
        />
      )}

      {/* Modal In Biên Bản Bàn Giao Ca Trực */}
      {chotCaRecord && (
        <InBienBanChotCaModal
          record={chotCaRecord}
          onClose={() => setChotCaRecord(null)}
        />
      )}

      {/* Modal In Báo Cáo Sổ Quỹ & Dòng Tiền (A4 Chuẩn Kế Toán) */}
      {openBaoCaoModal && (
        <InBaoCaoSoQuyModal
          stats={stats}
          chungTu={filteredChungTu}
          filterInfo={{ tuNgay, denNgay, timeRange, phamVi }}
          onClose={() => setOpenBaoCaoModal(false)}
        />
      )}

      {/* Modal Gửi Báo Cáo lên Ban Giám Đốc */}
      <GuiBaoCaoModal
        isOpen={isGuiBaoCaoOpen}
        onClose={() => setIsGuiBaoCaoOpen(false)}
        boPhan="thu_ngan"
        tenBoPhan="Bộ phận Thu ngân & Kế toán Viện phí"
        kyBaoCaoMacDinh={getKyBaoCaoLabel()}
        tieuDeMacDinh={`Báo cáo thu - chi viện phí & đối soát sổ quỹ - ${getKyBaoCaoLabel()}`}
        soLieuSnapshot={{
          kyBaoCao: getKyBaoCaoLabel(),
          phamVi: phamVi === 'toan_vien' ? 'Toàn viện' : 'Ca trực cá nhân',
          tongThuVienPhi: Number(stats?.tongThucThu ?? stats?.tongPhieuThu ?? stats?.tongThu ?? 0),
          tongChiNhaCungCap: Number(stats?.tongPhieuChi ?? stats?.tongChi ?? 0),
          thucThuRong: Number(stats?.soDuDongTien ?? stats?.soDuQuyRong ?? 0),
          soLuongHoaDon: stats?.soPhieuThu ?? stats?.soHoaDonDaThu ?? stats?.soLuongHoaDon ?? 0,
          soLuongPhieuChi: stats?.soPhieuChi ?? stats?.soLuongPhieuChi ?? 0,
          tienMatTaiKet: currentTienMat || stats?.tienMatTaiKet || stats?.tienMat || 0,
          chuyenKhoanNganHang: byPhuongThuc?.chuyen_khoan || stats?.chuyenKhoan || 0,
        }}
      />

      {/* Modal Xem Lịch Sử Báo Cáo & Ý Kiến Chỉ Đạo */}
      <LichSuBaoCaoModal
        isOpen={isLichSuBaoCaoOpen}
        onClose={() => setIsLichSuBaoCaoOpen(false)}
        boPhan="thu_ngan"
        tenBoPhan="Bộ phận Thu ngân & Kế toán Viện phí"
      />
    </div>
  );
}
