import { useEffect, useState, useMemo } from 'react';
import {
  Wallet, RefreshCw, Printer, Search, FileText, CheckCircle2,
  CircleCheck, X, Building2, AlertTriangle, ArrowRight, ShieldCheck,
  CreditCard, DollarSign, Calendar, Eye, Send, PackageCheck, PlusCircle,
  Receipt
} from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import useAuthStore from '../../store/authStore';
import LapPhieuChiHoatDongModal from './LapPhieuChiHoatDongModal';
import InPhieuChiModal from './InPhieuChiModal';
import InSoCongNoModal from './InSoCongNoModal';

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN');
  } catch {
    return dateString;
  }
};

const PAYMENT_METHOD_LABELS = {
  chuyen_khoan: 'Chuyển khoản ngân hàng',
  tien_mat: 'Tiền mặt tại quỹ',
  the: 'Thẻ / POS',
};

const LOAI_CHI_LABELS = {
  dien_nuoc: { label: 'Điện, nước, viễn thông', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  rac_thai_y_te: { label: 'Rác thải y tế & MT', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  van_phong_pham: { label: 'Văn phòng phẩm, in ấn', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  vat_tu_tieu_hao: { label: 'Vật tư y tế tiêu hao', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  sua_chua_bao_tri: { label: 'Sửa chữa & bảo trì', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  khac: { label: 'Chi phí vận hành khác', badge: 'bg-gray-100 text-gray-800 border-gray-200' },
};

export default function ChiTraNhaCungCapPage() {
  // Phân hệ chính: Mua thuốc NCC (AP) vs Chi hoạt động (OPEX)
  const [mainSection, setMainSection] = useState('mua_thuoc'); // 'mua_thuoc' | 'chi_hoat_dong'

  // Dữ liệu AP Mua thuốc
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('cho_chi'); // 'cho_chi', 'da_chi', 'tat_ca'
  const [searchTerm, setSearchTerm] = useState('');

  // Dữ liệu OPEX Chi hoạt động
  const [opexList, setOpexList] = useState([]);
  const [opexLoading, setOpexLoading] = useState(false);
  const [opexFilterLoai, setOpexFilterLoai] = useState('all');
  const [opexSearch, setOpexSearch] = useState('');
  const [openLapOpexModal, setOpenLapOpexModal] = useState(false);

  // Modal Đối chiếu 3 bên & Lập Phiếu Chi Mua Thuốc
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    soTien: '',
    phuongThucChi: 'chuyen_khoan',
    soChungTuChi: '',
    soHoaDonNcc: '',
    ngayHoaDonNcc: new Date().toISOString().slice(0, 10),
    ghiChu: '',
  });
  const [paymentChecks, setPaymentChecks] = useState({
    daDoiChieuNhapKho: false,
    daDoiChieuSoLuong: false,
    daDoiChieuHoaDon: false,
  });
  const [paymentError, setPaymentError] = useState('');

  // Modal In Phiếu Chi
  const [printVoucher, setPrintVoucher] = useState(null);
  // Modal In Sổ Kế Toán (A4)
  const [openPrintSoKeToan, setOpenPrintSoKeToan] = useState(false);

  const { user } = useAuthStore();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/nha-thuoc/mua-hang');
      const apList = (res.data || []).filter((item) =>
        ['da_nhap_kho', 'giao_mot_phan', 'da_kiem_nhan'].includes(item.trangThai)
      );
      setList(apList);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải sổ công nợ nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  };

  const loadOpexData = async () => {
    setOpexLoading(true);
    try {
      const res = await apiGet('/thanh-toan/phieu-chi-hoat-dong');
      setOpexList(res?.data?.data || res?.data || []);
    } catch (err) {
      console.error('Lỗi tải phiếu chi hoạt động:', err);
    } finally {
      setOpexLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadOpexData();
  }, []);

  // Mở modal đối chiếu & lập phiếu chi mua thuốc
  const openPayment = (request) => {
    setPaymentModal(request);
    setPaymentError('');
    setPaymentChecks({
      daDoiChieuNhapKho: false,
      daDoiChieuSoLuong: false,
      daDoiChieuHoaDon: false,
    });
    setPaymentForm({
      soTien: String(request.tongThucTe || 0),
      phuongThucChi: 'chuyen_khoan',
      soChungTuChi: `PC-${request.maYeuCau}-${Date.now().toString().slice(-4)}`,
      soHoaDonNcc: request.soHoaDonNcc || `HD-${Date.now().toString().slice(-6)}`,
      ngayHoaDonNcc: request.ngayHoaDonNcc ? String(request.ngayHoaDonNcc).slice(0, 10) : new Date().toISOString().slice(0, 10),
      ghiChu: 'Thanh toán tiền thuốc theo phiếu kiểm nhận đạt chất lượng',
    });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentChecks.daDoiChieuNhapKho || !paymentChecks.daDoiChieuSoLuong || !paymentChecks.daDoiChieuHoaDon) {
      setPaymentError('Kế toán / Thu ngân bắt buộc phải tích đủ 3 bước kiểm tra 3-Way Matching trước khi chi tiền.');
      return;
    }
    if (!paymentForm.soChungTuChi.trim()) {
      setPaymentError('Số chứng từ chi (Phiếu chi) là bắt buộc.');
      return;
    }
    if (!paymentForm.soHoaDonNcc.trim()) {
      setPaymentError('Số hóa đơn tài chính của Nhà cung cấp là bắt buộc để lưu sổ sách thuế & công nợ.');
      return;
    }

    try {
      await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${paymentModal.id}/chi-tra`, {
        soTien: Number(paymentForm.soTien),
        phuongThucChi: paymentForm.phuongThucChi,
        soChungTuChi: paymentForm.soChungTuChi.trim(),
        soHoaDonNcc: paymentForm.soHoaDonNcc.trim(),
        ngayHoaDonNcc: paymentForm.ngayHoaDonNcc,
        ghiChu: paymentForm.ghiChu.trim(),
      });
      setPaymentModal(null);
      await loadData();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể ghi nhận phiếu chi.';
      setPaymentError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  // Thống kê KPIs tài chính AP Mua Thuốc
  const apStats = useMemo(() => {
    const tongGiaTriNhap = list.reduce((sum, x) => sum + Number(x.tongThucTe || 0), 0);
    const daChiList = list.filter((x) => x.trangThaiChiTra === 'da_chi');
    const tongDaChi = daChiList.reduce((sum, x) => sum + Number(x.soTienChiTra || x.tongThucTe || 0), 0);
    const choChiList = list.filter((x) => x.trangThaiChiTra !== 'da_chi');
    const tongChoChi = choChiList.reduce((sum, x) => sum + Number(x.tongThucTe || 0), 0);

    return {
      tongGiaTriNhap,
      tongDaChi,
      tongChoChi,
      soHoSoChoChi: choChiList.length,
      soHoSoDaChi: daChiList.length,
    };
  }, [list]);

  // Thống kê KPIs tài chính OPEX
  const opexStats = useMemo(() => {
    const tongChi = opexList.reduce((sum, x) => sum + Number(x.soTien || 0), 0);
    const tienMat = opexList
      .filter((x) => (x.phuongThucChi || 'tien_mat') === 'tien_mat')
      .reduce((sum, x) => sum + Number(x.soTien || 0), 0);
    const chuyenKhoan = tongChi - tienMat;
    return {
      tongChi,
      tienMat,
      chuyenKhoan,
      soPhieu: opexList.length,
    };
  }, [opexList]);

  // Lọc AP Mua thuốc
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      if (activeTab === 'cho_chi' && item.trangThaiChiTra === 'da_chi') return false;
      if (activeTab === 'da_chi' && item.trangThaiChiTra !== 'da_chi') return false;

      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      const matchMa = item.maYeuCau?.toLowerCase().includes(s);
      const matchNcc = item.nhaCungCap?.tenNhaCungCap?.toLowerCase().includes(s);
      const matchHd = item.soHoaDonNcc?.toLowerCase().includes(s);
      const matchPc = item.soChungTuChi?.toLowerCase().includes(s);
      return matchMa || matchNcc || matchHd || matchPc;
    });
  }, [list, activeTab, searchTerm]);

  // Lọc OPEX Chi hoạt động
  const filteredOpex = useMemo(() => {
    return opexList.filter((item) => {
      if (opexFilterLoai !== 'all' && item.loaiChi !== opexFilterLoai) return false;
      if (!opexSearch.trim()) return true;
      const s = opexSearch.toLowerCase();
      const matchMa = item.maPhieuChi?.toLowerCase().includes(s);
      const matchKhoan = item.khoanChi?.toLowerCase().includes(s);
      const matchNhan = item.nguoiNhan?.toLowerCase().includes(s);
      const matchCt = item.chungTuGoc?.toLowerCase().includes(s);
      return matchMa || matchKhoan || matchNhan || matchCt;
    });
  }, [opexList, opexFilterLoai, opexSearch]);

  return (
    <div className="space-y-6 pb-16 font-sans text-gray-800 animate-fade-in">
      {/* ─── 1. HEADER CHUYÊN TRÁCH THU NGÂN / KẾ TOÁN AP & OPEX ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Wallet className="h-3.5 w-3.5" /> BỘ PHẬN KẾ TOÁN THANH TOÁN & CHI PHÍ VẬN HÀNH (AP / OPEX)
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
              Sổ Quản Lý Chi Trả & Chi Phí Vận Hành Phòng Khám
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kiểm soát công nợ mua thuốc nhà cung cấp (AP 3-Way Matching) và lập phiếu chi hoạt động vận hành (OPEX).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenLapOpexModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Lập Phiếu Chi Vận Hành</span>
            </button>
            <button
              type="button"
              onClick={() => {
                loadData();
                loadOpexData();
              }}
              disabled={loading || opexLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 active:scale-95 disabled:opacity-75 cursor-pointer"
              title="Đồng bộ lại danh sách mới nhất"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-600 ${loading || opexLoading ? 'animate-spin' : ''}`} />
              <span>{loading || opexLoading ? 'Đang nạp...' : 'Làm mới'}</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenPrintSoKeToan(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-emerald-600" />
              <span>In Sổ Kế Toán</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error} <button type="button" onClick={loadData} className="ml-2 font-bold underline">Thử lại</button>
          </div>
        )}

        {/* ─── THANH CHUYỂN ĐỔI 2 PHÂN HỆ CHI TIỀN ─── */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setMainSection('mua_thuoc')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mainSection === 'mua_thuoc'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <PackageCheck className="h-4 w-4" />
            <span>1. Sổ Công Nợ Thuốc NCC (AP)</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${mainSection === 'mua_thuoc' ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {list.length} đơn
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainSection('chi_hoat_dong')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mainSection === 'chi_hoat_dong'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>2. Chi Phí Hoạt Động & Vận Hành (OPEX)</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${mainSection === 'chi_hoat_dong' ? 'bg-purple-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {opexList.length} phiếu chi
            </span>
          </button>
        </div>

        {/* ─── 2. FINANCIAL KPI CARDS THEO TỪNG PHÂN HỆ ─── */}
        {mainSection === 'mua_thuoc' ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs font-semibold text-blue-700">1. Tổng Tiền Hàng Nhập Kho</p>
              <p className="mt-1.5 text-2xl font-black text-blue-900">{formatMoney(apStats.tongGiaTriNhap)}</p>
              <p className="mt-0.5 text-[11px] text-blue-600">Đã qua kiểm nhận y tế đạt chuẩn</p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <p className="text-xs font-semibold text-amber-700">2. Công Nợ Còn Phải Trả</p>
              <p className="mt-1.5 text-2xl font-black text-amber-900">{formatMoney(apStats.tongChoChi)}</p>
              <p className="mt-0.5 text-[11px] text-amber-600">{apStats.soHoSoChoChi} hồ sơ chờ lập phiếu chi</p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-xs font-semibold text-emerald-700">3. Đã Chi Trả Nhà Cung Cấp</p>
              <p className="mt-1.5 text-2xl font-black text-emerald-900">{formatMoney(apStats.tongDaChi)}</p>
              <p className="mt-0.5 text-[11px] text-emerald-600">{apStats.soHoSoDaChi} hồ sơ đã xuất phiếu chi</p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <p className="text-xs font-semibold text-purple-700">4. Quy Trình Đối Chiếu Kế Toán</p>
              <p className="mt-1.5 text-lg font-bold text-purple-900">3-Way Matching</p>
              <p className="mt-0.5 text-[11px] text-purple-600">Đơn PO ↔ Thực nhận GRN ↔ Hóa đơn VAT</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <p className="text-xs font-semibold text-purple-700">1. Tổng Chi Phí Hoạt Động (OPEX)</p>
              <p className="mt-1.5 text-2xl font-black text-purple-900">{formatMoney(opexStats.tongChi)}</p>
              <p className="mt-0.5 text-[11px] text-purple-600">{opexStats.soPhieu} chứng từ phiếu chi hợp lệ</p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-xs font-semibold text-emerald-700">2. Chi Tiền Mặt Tại Quỹ</p>
              <p className="mt-1.5 text-2xl font-black text-emerald-900">{formatMoney(opexStats.tienMat)}</p>
              <p className="mt-0.5 text-[11px] text-emerald-600">Trực tiếp xuất quỹ tiền mặt phòng khám</p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs font-semibold text-blue-700">3. Chi Chuyển Khoản Ngân Hàng</p>
              <p className="mt-1.5 text-2xl font-black text-blue-900">{formatMoney(opexStats.chuyenKhoan)}</p>
              <p className="mt-0.5 text-[11px] text-blue-600">Thanh toán qua tài khoản ngân hàng</p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <p className="text-xs font-semibold text-amber-700">4. Chứng Từ & Mẫu In Chuẩn</p>
              <p className="mt-1.5 text-lg font-bold text-amber-900">Mẫu 02-TT / BTC</p>
              <p className="mt-0.5 text-[11px] text-amber-600">Thông tư 200/2014 & 133/2016/TT-BTC</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── PHÂN HỆ 1: SỔ CÔNG NỢ MUA THUỐC (AP) ─── */}
      {mainSection === 'mua_thuoc' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
              {[
                { id: 'cho_chi', label: 'Cần thanh toán / Chờ chi', count: apStats.soHoSoChoChi, badgeColor: 'bg-amber-100 text-amber-800' },
                { id: 'da_chi', label: 'Đã thanh toán', count: apStats.soHoSoDaChi, badgeColor: 'bg-emerald-100 text-emerald-800' },
                { id: 'tat_ca', label: 'Tất cả hồ sơ', count: list.length, badgeColor: 'bg-gray-200 text-gray-700' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${tab.badgeColor}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo mã đơn, NCC, hóa đơn VAT, phiếu chi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                <p className="mt-2">Đang tải danh sách công nợ...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-12 text-center">
                <Wallet className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-700">Không có hồ sơ công nợ nào trong danh mục này.</p>
                <p className="text-xs text-gray-400">Các lô thuốc sau khi được Dược sĩ kiểm nhận đạt tiêu chuẩn sẽ tự động hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="py-3 pl-4">Mã chứng từ & Ngày nhập</th>
                      <th className="py-3">Nhà cung cấp</th>
                      <th className="py-3 text-right">Dự toán PO</th>
                      <th className="py-3 text-right text-blue-900 font-bold">Thực nhận QC</th>
                      <th className="py-3">Hóa đơn VAT (NCC)</th>
                      <th className="py-3">Phiếu chi (Kế toán)</th>
                      <th className="py-3 text-center">Trạng thái</th>
                      <th className="py-3 text-center pr-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredList.map((item) => {
                      const isPaid = item.trangThaiChiTra === 'da_chi';
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 pl-4">
                            <span className="font-mono font-bold text-gray-900">{item.maYeuCau}</span>
                            <span className="block text-[10px] text-gray-400">Nhập ngày: {formatDate(item.ngayKiemNhan || item.ngayTao)}</span>
                          </td>

                          <td className="py-3 font-semibold text-gray-800">
                            <div>{item.nhaCungCap?.tenNhaCungCap || 'Chưa chọn'}</div>
                            {item.nhaCungCap?.soDienThoai && (
                              <div className="text-[10px] text-gray-400">SĐT: {item.nhaCungCap.soDienThoai}</div>
                            )}
                          </td>

                          <td className="py-3 text-right text-gray-600">
                            {formatMoney(item.tongDuToan)}
                          </td>

                          <td className="py-3 text-right text-sm font-extrabold text-blue-900">
                            {formatMoney(item.tongThucTe)}
                            {item.trangThai === 'giao_mot_phan' && (
                              <span className="block text-[10px] font-medium text-amber-600">Đã trừ hàng hỏng/thiếu</span>
                            )}
                          </td>

                          <td className="py-3">
                            {item.soHoaDonNcc ? (
                              <div>
                                <span className="font-mono font-semibold text-gray-900">{item.soHoaDonNcc}</span>
                                <span className="block text-[10px] text-gray-400">Ngày: {formatDate(item.ngayHoaDonNcc)}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] italic text-gray-400">Chưa ghi nhận</span>
                            )}
                          </td>

                          <td className="py-3">
                            {item.soChungTuChi ? (
                              <div>
                                <span className="font-mono font-semibold text-purple-700">{item.soChungTuChi}</span>
                                <span className="block text-[10px] text-gray-400">{PAYMENT_METHOD_LABELS[item.phuongThucChi] || item.phuongThucChi}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] italic text-gray-400">Chưa lập</span>
                            )}
                          </td>

                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {isPaid ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'}
                            </span>
                          </td>

                          <td className="py-3 text-center pr-4">
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => openPayment(item)}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700 cursor-pointer"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                <span>Đối chiếu & Lập phiếu chi</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPrintVoucher({
                                  soChungTu: item.soChungTuChi || `PC-${item.maYeuCau}`,
                                  ngayLap: item.ngayChiTra || item.capNhatLuc,
                                  doiTuong: item.nhaCungCap?.tenNhaCungCap,
                                  dienGiai: `Thanh toán tiền mua dược phẩm theo đơn #${item.maYeuCau}, HĐ GTGT ${item.soHoaDonNcc || ''}`,
                                  soTien: item.soTienChiTra || item.tongThucTe,
                                  phuongThuc: item.phuongThucChi || 'chuyen_khoan',
                                  chungTuGoc: `HĐ ${item.soHoaDonNcc || '---'}, GRN #${item.maYeuCau}`,
                                  nguoiLap: user?.hoTen,
                                })}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>In Phiếu Chi</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── PHÂN HỆ 2: CHI PHÍ HOẠT ĐỘNG VẬN HÀNH (OPEX) ─── */}
      {mainSection === 'chi_hoat_dong' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Lọc loại chi phí */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500">Loại chi phí:</span>
              <select
                value={opexFilterLoai}
                onChange={(e) => setOpexFilterLoai(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white font-medium focus:ring-1 focus:ring-purple-500"
              >
                <option value="all">⚡ Tất cả phân loại chi</option>
                <option value="dien_nuoc">Điện, nước, viễn thông</option>
                <option value="rac_thai_y_te">Rác thải y tế & MT</option>
                <option value="van_phong_pham">Văn phòng phẩm, in ấn</option>
                <option value="vat_tu_tieu_hao">Vật tư y tế tiêu hao</option>
                <option value="sua_chua_bao_tri">Sửa chữa, bảo trì máy</option>
                <option value="khac">Chi phí khác</option>
              </select>
            </div>

            {/* Tìm kiếm OPEX */}
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã PC, tên khoản chi, người nhận..."
                value={opexSearch}
                onChange={(e) => setOpexSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {opexLoading ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <RefreshCw className="mx-auto h-7 w-7 animate-spin text-purple-600" />
                <p className="mt-2">Đang tải phiếu chi hoạt động...</p>
              </div>
            ) : filteredOpex.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-700">Chưa có phiếu chi hoạt động nào.</p>
                <p className="text-xs text-gray-400 mt-1">Bấm nút "+ Lập Phiếu Chi Vận Hành" để phát hành phiếu chi điện nước, rác y tế, bảo trì...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="py-3 pl-4">Số Phiếu Chi & Ngày</th>
                      <th className="py-3">Phân loại chi</th>
                      <th className="py-3">Nội dung khoản chi</th>
                      <th className="py-3">Người / Đơn vị nhận</th>
                      <th className="py-3 text-right">Số tiền chi</th>
                      <th className="py-3">Hình thức</th>
                      <th className="py-3">Chứng từ gốc</th>
                      <th className="py-3 text-center pr-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOpex.map((item) => {
                      const loaiCfg = LOAI_CHI_LABELS[item.loaiChi] || LOAI_CHI_LABELS.khac;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 pl-4">
                            <span className="font-mono font-bold text-purple-800">{item.maPhieuChi}</span>
                            <span className="block text-[10px] text-gray-400">{formatDate(item.ngayChi)}</span>
                          </td>

                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${loaiCfg.badge}`}>
                              {loaiCfg.label}
                            </span>
                          </td>

                          <td className="py-3 font-semibold text-gray-900 max-w-[220px]">
                            <div className="truncate" title={item.khoanChi}>{item.khoanChi}</div>
                            {item.ghiChu && <div className="text-[10px] text-gray-400 truncate">{item.ghiChu}</div>}
                          </td>

                          <td className="py-3 font-medium text-gray-700">
                            {item.nguoiNhan}
                          </td>

                          <td className="py-3 text-right font-extrabold text-sm text-emerald-700">
                            {formatMoney(item.soTien)}
                          </td>

                          <td className="py-3">
                            <span className="text-gray-700 font-medium">
                              {item.phuongThucChi === 'tien_mat' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}
                            </span>
                          </td>

                          <td className="py-3 font-mono text-[11px] text-gray-500">
                            {item.chungTuGoc || '---'}
                          </td>

                          <td className="py-3 text-center pr-4">
                            <button
                              type="button"
                              onClick={() => setPrintVoucher({
                                soChungTu: item.maPhieuChi,
                                ngayLap: item.ngayChi,
                                doiTuong: item.nguoiNhan,
                                dienGiai: item.khoanChi,
                                soTien: item.soTien,
                                phuongThuc: item.phuongThucChi,
                                chungTuGoc: item.chungTuGoc,
                                nguoiLap: item.nguoiLap?.hoTen || user?.hoTen,
                              })}
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>In Phiếu Chi</span>
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
        </>
      )}

      {/* ─── MODAL 1: ĐỐI CHIẾU 3 BÊN & LẬP PHIẾU CHI MUA THUỐC (3-WAY MATCHING) ─── */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitPayment} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Nghiệp vụ Kế toán AP · Đối chiếu 3 bên (3-Way Matching)
                </span>
                <h2 className="mt-1 text-xl font-bold text-gray-900">Kiểm Tra Hồ Sơ & Lập Phiếu Chi Nhà Cung Cấp</h2>
                <p className="text-xs text-gray-500">
                  Chứng từ: <span className="font-mono font-bold text-gray-800">{paymentModal.maYeuCau}</span> · NCC: <b>{paymentModal.nhaCungCap?.tenNhaCungCap}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {paymentError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {paymentError}
              </div>
            )}

            {/* BẢNG ĐỐI CHIẾU 3 CỘT: PO vs GRN vs HÓA ĐƠN NCC */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Đối chiếu 3 bên (3-Way Matching Verification)
              </label>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <span>1. Đơn đặt hàng (PO)</span>
                    <Send className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-gray-600">Tổng tiền dự toán: <b className="text-gray-900">{formatMoney(paymentModal.tongDuToan)}</b></p>
                    <p className="text-gray-600">Số lượng mặt hàng: <b className="text-gray-900">{paymentModal.chiTiet?.length}</b></p>
                    <p className="text-gray-600">Đơn vị thụ hưởng: <b className="text-gray-900">{paymentModal.nhaCungCap?.tenNhaCungCap}</b></p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span>2. Kiểm nhận thực tế (GRN)</span>
                    <PackageCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-gray-600">Giá trị thực tế nhập kho: <b className="text-blue-900">{formatMoney(paymentModal.tongThucTe)}</b></p>
                    <p className="text-gray-600">Kết quả QC: <b className="text-emerald-700">Đã qua kiểm nghiệm GSP</b></p>
                    <p className="text-gray-600">Lô SX & Hạn dùng: <b className="text-gray-900">Khớp quy chuẩn FEFO</b></p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>3. Hóa đơn & Chi trả (AP)</span>
                    <Wallet className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-gray-600">Số tiền duyệt thanh toán: <b className="text-emerald-800 text-sm">{formatMoney(paymentModal.tongThucTe)}</b></p>
                    <p className="text-[11px] text-gray-500">Chỉ thanh toán số lượng đạt chất lượng</p>
                    <p className="text-[11px] text-gray-500">Đã loại trừ hàng hỏng/thiếu nếu có</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BẢNG CHI TIẾT MẶT HÀNG THỰC NHẬN */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Chi tiết đối soát từng loại thuốc</label>
              <div className="mt-1 overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500">
                    <tr className="border-b border-gray-200">
                      <th className="py-2 pl-3">Tên thuốc</th>
                      <th className="py-2 text-right">SL Đặt</th>
                      <th className="py-2 text-right">SL Giao</th>
                      <th className="py-2 text-right text-emerald-700 font-bold">SL Đạt QC</th>
                      <th className="py-2 text-right text-rose-700">Hỏng/Thiếu</th>
                      <th className="py-2 text-right">Đơn giá</th>
                      <th className="py-2 text-right pr-3 font-bold">Thành tiền hợp lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paymentModal.chiTiet?.map((ct) => {
                      const thanhTien = (Number(ct.soLuongDatChatLuong ?? ct.soLuongDat) || 0) * (Number(ct.donGiaChon || ct.donGiaBao) || 0);
                      return (
                        <tr key={ct.id}>
                          <td className="py-2 pl-3 font-medium text-gray-900">
                            {ct.tenThuoc}
                            <span className="block text-[10px] text-gray-400">Lô: {ct.maLo || '-'} · HSD: {formatDate(ct.ngayHetHan)}</span>
                          </td>
                          <td className="py-2 text-right text-gray-600">{ct.soLuongDat}</td>
                          <td className="py-2 text-right text-gray-600">{ct.soLuongGiao}</td>
                          <td className="py-2 text-right font-bold text-emerald-600">{ct.soLuongDatChatLuong}</td>
                          <td className="py-2 text-right">
                            {Number(ct.soLuongHong || 0) > 0 && <span className="text-rose-600 font-semibold">{ct.soLuongHong} </span>}
                            {Number(ct.soLuongThieu || 0) > 0 && <span className="text-amber-600 font-medium">({ct.soLuongThieu})</span>}
                            {!Number(ct.soLuongHong) && !Number(ct.soLuongThieu) && <span className="text-gray-400">-</span>}
                          </td>
                          <td className="py-2 text-right text-gray-700">{formatMoney(ct.donGiaChon || ct.donGiaBao)}</td>
                          <td className="py-2 text-right pr-3 font-bold text-gray-900">{formatMoney(thanhTien)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Checklist 3 tiêu chí */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Cam kết kiểm toán 3-Way Matching *
              </label>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                {[
                  { key: 'daDoiChieuNhapKho', title: 'Phiếu nhập kho hợp lệ', desc: 'Hàng đã được Dược sĩ kiểm nghiệm GSP đủ điều kiện' },
                  { key: 'daDoiChieuSoLuong', title: 'Khớp số lượng & đơn giá', desc: 'Đã đối trừ số lượng hỏng/thiếu theo đúng thực tế' },
                  { key: 'daDoiChieuHoaDon', title: 'Hóa đơn tài chính hợp pháp', desc: 'Có hóa đơn GTGT / Phiếu xuất kho NCC hợp lệ' },
                ].map((chk) => (
                  <label
                    key={chk.key}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      paymentChecks[chk.key] ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950' : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={paymentChecks[chk.key]}
                        onChange={(e) => setPaymentChecks((prev) => ({ ...prev, [chk.key]: e.target.checked }))}
                        className="text-emerald-600"
                      />
                      <span className="text-xs font-bold">{chk.title}</span>
                    </div>
                    <p className="mt-1 pl-5 text-[11px] text-gray-500">{chk.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Form Fields: Hóa đơn & Phiếu chi */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700">Số Hóa Đơn NCC (VAT) *</label>
                <input
                  required
                  placeholder="Ví dụ: HD-0012948"
                  value={paymentForm.soHoaDonNcc}
                  onChange={(e) => setPaymentForm({ ...paymentForm, soHoaDonNcc: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Ngày hóa đơn NCC *</label>
                <input
                  required
                  type="date"
                  value={paymentForm.ngayHoaDonNcc}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ngayHoaDonNcc: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Số Phiếu Chi (Kế toán) *</label>
                <input
                  required
                  placeholder="PC-..."
                  value={paymentForm.soChungTuChi}
                  onChange={(e) => setPaymentForm({ ...paymentForm, soChungTuChi: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Số tiền chi (đ) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={paymentModal.tongThucTe}
                  value={paymentForm.soTien}
                  onChange={(e) => setPaymentForm({ ...paymentForm, soTien: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Phương thức thanh toán *</label>
                <select
                  value={paymentForm.phuongThucChi}
                  onChange={(e) => setPaymentForm({ ...paymentForm, phuongThucChi: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="chuyen_khoan">Chuyển khoản ngân hàng</option>
                  <option value="tien_mat">Tiền mặt tại quỹ</option>
                  <option value="the">Thẻ / POS</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Ghi chú kế toán</label>
                <input
                  value={paymentForm.ghiChu}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ghiChu: e.target.value })}
                  placeholder="Thanh toán đợt 1 / đủ..."
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
              >
                Lập Phiếu Chi & Lưu Sổ Quỹ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL 2: LẬP PHIẾU CHI VẬN HÀNH (OPEX) ─── */}
      {openLapOpexModal && (
        <LapPhieuChiHoatDongModal
          onClose={() => setOpenLapOpexModal(false)}
          onSuccess={() => {
            loadOpexData();
            loadData();
          }}
          onOpenPrint={setPrintVoucher}
        />
      )}

      {/* ─── MODAL 3: IN PHIẾU CHI TIỀN (CHUẨN BỘ TÀI CHÍNH MẪU 02-TT) ─── */}
      {printVoucher && (
        <InPhieuChiModal
          voucher={printVoucher}
          onClose={() => setPrintVoucher(null)}
        />
      )}

      {/* ─── MODAL 4: IN SỔ KẾ TOÁN CHI TRẢ & QUẢN LÝ CÔNG NỢ A4 ─── */}
      {openPrintSoKeToan && (
        <InSoCongNoModal
          apList={filteredList}
          opexList={filteredOpex}
          apStats={apStats}
          opexStats={opexStats}
          mainSection={mainSection}
          onClose={() => setOpenPrintSoKeToan(false)}
        />
      )}
    </div>
  );
}
