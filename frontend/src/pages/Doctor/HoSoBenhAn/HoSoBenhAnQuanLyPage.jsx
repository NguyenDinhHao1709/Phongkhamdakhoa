import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { apiGet } from '../../../services/api';
import { formatDateTime, formatDate, tinhTuoi } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';
import {
  ClipboardList, Search, User, FileText, Activity, FlaskConical, Pill, Calendar,
  Clock, Printer, ExternalLink, Eye, CheckCircle2, CreditCard, ChevronDown,
  ChevronUp, RotateCcw, X, Filter, Stethoscope, AlertTriangle
} from 'lucide-react';
import InPhieuKhamModal from '../../../components/Print/InPhieuKhamModal';
import InDonThuocModal from '../../../components/Print/InDonThuocModal';
import InKetQuaXetNghiemModal from '../../../components/Print/InKetQuaXetNghiemModal';

export default function HoSoBenhAnQuanLyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBenhNhan, setSelectedBenhNhan] = useState(null);

  // Bộ lọc lịch sử khám của bệnh nhân
  const [historySearch, setHistorySearch] = useState('');
  const [timeRange, setTimeRange] = useState('all'); // 'all', '7days', '30days', 'thisMonth', '3months', 'thisYear', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'has_thuoc', 'has_cls', 'da_hoan_thanh', 'dang_kham'

  // Quản lý các lượt khám mở rộng
  const [expandedIds, setExpandedIds] = useState({});

  // Modals in ấn
  const [printPhieuKham, setPrintPhieuKham] = useState({ open: false, record: null });
  const [printDonThuoc, setPrintDonThuoc] = useState({ open: false, donThuoc: null, record: null });
  const [printXetNghiem, setPrintXetNghiem] = useState({ open: false, items: [], record: null });

  // 1. Lấy danh sách bệnh nhân
  const { data: bnData, isLoading: bnLoading } = useQuery({
    queryKey: ['benh-nhan-list-emr', searchTerm],
    queryFn: () => apiGet(`/benh-nhan?q=${encodeURIComponent(searchTerm)}&search=${encodeURIComponent(searchTerm)}`),
  });

  const bnList = bnData?.data || [];
  const activeBn = selectedBenhNhan || bnList[0];

  // 2. Lấy toàn bộ lịch sử khám bệnh chi tiết của bệnh nhân đã chọn
  const { data: hsData, isLoading: hsLoading } = useQuery({
    queryKey: ['ho-so-kham-emr', activeBn?.id],
    queryFn: () => apiGet(`/ho-so-benh-an/lich-su/${activeBn?.id}`),
    enabled: !!activeBn?.id,
  });

  const hoSoList = hsData?.data || [];

  // 3. Lọc lịch sử khám theo thời gian, loại và từ khóa tìm kiếm
  const filteredHoSoList = useMemo(() => {
    return hoSoList.filter((item) => {
      const rawDate = item.ngayKham || item.taoLuc;
      const itemDate = rawDate ? new Date(rawDate) : null;
      const now = new Date();

      // Lọc theo thời gian
      if (itemDate && !isNaN(itemDate.getTime())) {
        if (timeRange === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          if (itemDate < sevenDaysAgo) return false;
        } else if (timeRange === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          thirtyDaysAgo.setHours(0, 0, 0, 0);
          if (itemDate < thirtyDaysAgo) return false;
        } else if (timeRange === 'thisMonth') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          if (itemDate < startOfMonth) return false;
        } else if (timeRange === '3months') {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          threeMonthsAgo.setHours(0, 0, 0, 0);
          if (itemDate < threeMonthsAgo) return false;
        } else if (timeRange === 'thisYear') {
          const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          if (itemDate < startOfYear) return false;
        } else if (timeRange === 'custom') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }
        }
      }

      // Lọc theo phân loại
      if (filterType === 'has_thuoc') {
        const dt = item.donThuoc || [];
        if (!dt || dt.length === 0) return false;
      } else if (filterType === 'has_cls') {
        const cls = (item.canLamSang || item.xetNghiem || []).filter(
          (c) => c.trangThai !== 'huy' && c.chiDinh?.trangThai !== 'huy'
        );
        if (!cls || cls.length === 0) return false;
      } else if (filterType === 'da_hoan_thanh') {
        if (item.trangThai !== 'da_hoan_thanh') return false;
      } else if (filterType === 'dang_kham') {
        if (item.trangThai === 'da_hoan_thanh') return false;
      }

      // Tìm kiếm theo từ khóa
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const bacSiTen = (
          item.bacSiTen ||
          (typeof item.bacSi === 'string' ? item.bacSi : item.bacSi?.nhanVien?.hoTen) ||
          ''
        ).toLowerCase();
        const chanDoanXacDinh = (item.chanDoanXacDinh || '').toLowerCase();
        const chanDoanSoBo = (item.chanDoanSoBo || '').toLowerCase();
        const trieuChung = (item.trieuChung || '').toLowerCase();
        const phuongPhapDieuTri = (item.phuongPhapDieuTri || '').toLowerCase();
        const maIcd10 = (item.maIcd10 || '').toLowerCase();
        const luotId = String(item.luotTiepNhanId || '');

        const donThuoc = item.donThuoc || [];
        const matchThuoc = donThuoc.some((dt) =>
          (dt.chiTietDonThuoc || dt.chiTiet || []).some((ct) =>
            (ct.thuoc?.tenThuoc || '').toLowerCase().includes(q)
          )
        );

        const canLamSang = item.canLamSang || item.xetNghiem || [];
        const matchCls = canLamSang.some((c) =>
          (c.dichVu?.tenDichVu || '').toLowerCase().includes(q) ||
          (c.dichVu?.maDichVu || '').toLowerCase().includes(q)
        );

        const matchMain =
          bacSiTen.includes(q) ||
          chanDoanXacDinh.includes(q) ||
          chanDoanSoBo.includes(q) ||
          trieuChung.includes(q) ||
          phuongPhapDieuTri.includes(q) ||
          maIcd10.includes(q) ||
          luotId.includes(q);

        if (!matchMain && !matchThuoc && !matchCls) return false;
      }

      return true;
    });
  }, [hoSoList, timeRange, customStartDate, customEndDate, filterType, historySearch]);

  const toggleExpand = (recordId) => {
    setExpandedIds((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  const isAllExpanded =
    filteredHoSoList.length > 0 &&
    filteredHoSoList.every((item, idx) => {
      const id = item.id || item.luotTiepNhanId || idx;
      return !!expandedIds[id];
    });

  const handleToggleAll = () => {
    if (isAllExpanded) {
      setExpandedIds({});
    } else {
      const next = {};
      filteredHoSoList.forEach((item, idx) => {
        const id = item.id || item.luotTiepNhanId || idx;
        next[id] = true;
      });
      setExpandedIds(next);
    }
  };

  const handleResetFilters = () => {
    setTimeRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setHistorySearch('');
    setFilterType('all');
  };

  const hasActiveFilter =
    timeRange !== 'all' ||
    historySearch.trim() !== '' ||
    filterType !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary-600" /> Quản lý Hồ sơ Bệnh án (EMR)
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Tra cứu toàn diện lịch sử khám bệnh, chẩn đoán ICD-10, kết quả xét nghiệm, CĐHA, đơn thuốc và viện phí theo từng lượt khám
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-13rem)]">
        {/* Cột trái: Tìm kiếm bệnh nhân */}
        <MedCard className="flex flex-col h-full overflow-hidden p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm bệnh nhân (Tên, Mã BN, SĐT)..."
              className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {bnLoading && <p className="text-center text-sm text-gray-400 py-6">Đang tải danh sách...</p>}
            {!bnLoading && bnList.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">Không tìm thấy bệnh nhân nào</p>
            )}
            {bnList.map((bn) => (
              <div
                key={bn.id}
                onClick={() => {
                  setSelectedBenhNhan(bn);
                  setExpandedIds({});
                  handleResetFilters();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  activeBn?.id === bn.id
                    ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-700">{bn.maBenhNhan}</span>
                  <span className="text-xs text-gray-500">{bn.gioiTinh === 'nam' ? 'Nam' : 'Nữ'} • {tinhTuoi(bn.ngaySinh)}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm mt-0.5">{bn.hoTen}</p>
                <p className="text-xs text-gray-500 mt-0.5">SĐT: {bn.soDienThoai}</p>
              </div>
            ))}
          </div>
        </MedCard>

        {/* Cột phải: Chi tiết Hồ sơ Bệnh án EMR */}
        {activeBn ? (
          <div className="lg:col-span-2 flex flex-col h-full overflow-y-auto space-y-4 pr-1">
            {/* Thẻ thông tin tổng quan bệnh nhân */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900">{activeBn.hoTen}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                      {activeBn.gioiTinh === 'nam' ? 'Nam' : 'Nữ'} • {tinhTuoi(activeBn.ngaySinh)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mã BN: <span className="font-mono font-bold text-gray-700">{activeBn.maBenhNhan}</span> | SĐT: {activeBn.soDienThoai || 'Chưa cập nhật'} | Địa chỉ: {activeBn.diaChi || 'Chưa cập nhật'}
                  </p>
                  {(activeBn.diUng || activeBn.tienSuDiUng || activeBn.tienSuBenh) && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
                      {(activeBn.diUng || activeBn.tienSuDiUng) && (
                        <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                          <AlertTriangle className="h-3 w-3" /> Dị ứng: {activeBn.diUng || activeBn.tienSuDiUng}
                        </span>
                      )}
                      {activeBn.tienSuBenh && (
                        <span className="text-gray-700 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                          Tiền sử bệnh: {activeBn.tienSuBenh}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thanh công cụ lọc lịch sử khám */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-2xs">
              {/* Ô tìm kiếm từ khóa trong lịch sử khám */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Tìm trong lịch sử: Bệnh gì, mã ICD-10, triệu chứng, tên thuốc, xét nghiệm..."
                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50/50 focus:bg-white transition"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Xóa bộ lọc
                  </button>
                )}
              </div>

              {/* Lọc nhanh theo thời gian */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1 mr-1">
                  <Calendar className="h-3.5 w-3.5 text-primary-600" /> Thời gian:
                </span>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: '7days', label: '7 ngày qua' },
                  { id: '30days', label: '30 ngày qua' },
                  { id: 'thisMonth', label: 'Tháng này' },
                  { id: '3months', label: '3 tháng qua' },
                  { id: 'thisYear', label: 'Năm nay' },
                  { id: 'custom', label: 'Tùy chọn ngày' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTimeRange(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      timeRange === tab.id
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tùy chọn khoảng ngày */}
              {timeRange === 'custom' && (
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-primary-50/50 rounded-lg border border-primary-100 text-xs">
                  <span className="font-semibold text-primary-800">Khoảng thời gian:</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-gray-600">Từ:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-primary-500"
                    />
                    <label className="text-gray-600">Đến:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Lọc phân loại & Thống kê */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Phân loại:</span>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'has_thuoc', label: 'Có đơn thuốc' },
                    { id: 'has_cls', label: 'Có xét nghiệm / CĐHA' },
                    { id: 'da_hoan_thanh', label: 'Đã hoàn thành' },
                    { id: 'dang_kham', label: 'Đang khám' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterType(f.id)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                        filterType === f.id
                          ? 'bg-primary-50 border-primary-300 text-primary-700 font-semibold'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-xs text-gray-500 font-medium">
                    Lịch sử: <strong>{filteredHoSoList.length}</strong> / {hoSoList.length} lượt khám
                  </span>
                  {filteredHoSoList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold underline ml-1 cursor-pointer"
                    >
                      {isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Danh sách các lần khám */}
            <div className="space-y-4">
              {hsLoading && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  <div className="h-7 w-7 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm font-medium">Đang tải hồ sơ bệnh án...</p>
                </div>
              )}

              {!hsLoading && hoSoList.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  <FileText className="h-9 w-9 mx-auto mb-2 opacity-30 text-primary-600" />
                  <p className="text-sm font-semibold text-gray-700">Bệnh nhân chưa có hồ sơ khám bệnh nào</p>
                  <p className="text-xs text-gray-500 mt-1">Hồ sơ sẽ xuất hiện sau khi bác sĩ tạo phiếu khám tại phòng khám lâm sàng.</p>
                </div>
              )}

              {!hsLoading && hoSoList.length > 0 && filteredHoSoList.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">Không tìm thấy lượt khám phù hợp</p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2.5 px-3 py-1 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Xem tất cả lượt khám
                  </button>
                </div>
              )}

              {filteredHoSoList.map((hs, idx) => {
                const recordId = hs.id || hs.luotTiepNhanId || idx;
                const isExpanded = !!expandedIds[recordId];
                const bacSiTen = hs.bacSiTen || hs.bacSi?.nhanVien?.hoTen || 'Bác sĩ chuyên khoa';
                const donThuoc = hs.donThuoc || [];
                const canLamSang = (hs.canLamSang || hs.xetNghiem || []).filter(
                  (c) => c.trangThai !== 'huy' && c.chiDinh?.trangThai !== 'huy'
                );
                const sinhHieu = hs.sinhHieu;
                const tongThuoc = donThuoc.reduce((acc, dt) => acc + (dt.chiTietDonThuoc?.length || dt.chiTiet?.length || 0), 0) || donThuoc.length;

                return (
                  <div
                    key={recordId}
                    className={`bg-white rounded-xl border transition-all duration-200 ${
                      isExpanded
                        ? 'border-primary-300 shadow-md ring-1 ring-primary-100'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Header tóm tắt lượt khám */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                        {/* Thông tin chính */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 font-bold text-sm border border-primary-100">
                            #{hoSoList.length - idx}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-primary-600" />
                                Lần khám ngày {formatDateTime(hs.ngayKham || hs.taoLuc)}
                              </h4>
                              <StatusBadge status={hs.trangThai === 'da_hoan_thanh' ? 'hoan_thanh' : 'dang_kham'} size="sm" />
                            </div>

                            <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1 font-medium text-gray-700">
                                <Stethoscope className="h-3.5 w-3.5 text-primary-600" /> {bacSiTen}
                              </span>
                              {hs.luotTiepNhanId && (
                                <span className="text-gray-400 font-mono">· Mã lượt khám #{hs.luotTiepNhanId}</span>
                              )}
                            </p>

                            {/* Chẩn đoán bệnh */}
                            <div className="text-xs text-gray-700 pt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-500">Chẩn đoán:</span>
                              <span className="font-bold text-primary-800 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                                {hs.chanDoanXacDinh || hs.chanDoanSoBo || 'Chưa chẩn đoán'}
                              </span>
                              {hs.maIcd10 && (
                                <span className="inline-block bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                  ICD-10: {hs.maIcd10}
                                </span>
                              )}
                            </div>

                            {/* Triệu chứng tóm tắt */}
                            {hs.trieuChung && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                <strong className="text-gray-600">Triệu chứng:</strong> {hs.trieuChung}
                              </p>
                            )}

                            {/* Mini badges số lượng thuốc, XN, sinh hiệu */}
                            <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                              {donThuoc && donThuoc.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                  <Pill className="h-3 w-3 text-emerald-600" /> {tongThuoc} loại thuốc
                                </span>
                              )}
                              {canLamSang && canLamSang.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                  <FlaskConical className="h-3 w-3 text-purple-600" /> {canLamSang.length} xét nghiệm & CĐHA
                                </span>
                              )}
                              {sinhHieu && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                  <Activity className="h-3 w-3 text-blue-600" /> HA: {sinhHieu.huyet_ap_tam_thu || sinhHieu.huyetApTamThu || 120}/{sinhHieu.huyet_ap_tam_truong || sinhHieu.huyetApTamTruong || 80}
                                </span>
                              )}
                              {hs.hoaDon && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                  hs.hoaDon.trangThai === 'da_thanh_toan'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  <CreditCard className="h-3 w-3" />
                                  {hs.hoaDon.trangThai === 'da_thanh_toan'
                                    ? `Viện phí: ${formatCurrency(hs.hoaDon.thucThu)}`
                                    : 'Chờ thanh toán'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nút in & Nút Xem chi tiết */}
                        <div className="flex items-center gap-2 self-start lg:self-center flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full lg:w-auto justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintPhieuKham({ open: true, record: hs });
                            }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 transition cursor-pointer"
                            title="In phiếu khám bệnh"
                          >
                            <Printer className="h-3.5 w-3.5" /> <span className="hidden sm:inline">In phiếu khám</span>
                          </button>
                          {donThuoc && donThuoc.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintDonThuoc({ open: true, donThuoc: donThuoc[0], record: hs });
                              }}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 flex items-center gap-1 transition cursor-pointer"
                              title="In đơn thuốc"
                            >
                              <Printer className="h-3.5 w-3.5" /> <span className="hidden sm:inline">In đơn thuốc</span>
                            </button>
                          )}
                          {canLamSang && canLamSang.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintXetNghiem({ open: true, items: canLamSang, record: hs });
                              }}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center gap-1 transition cursor-pointer"
                              title="In kết quả xét nghiệm"
                            >
                              <FlaskConical className="h-3.5 w-3.5" /> <span className="hidden sm:inline">In kết quả ({canLamSang.length})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleExpand(recordId)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                              isExpanded
                                ? 'bg-primary-600 text-white hover:bg-primary-700 ring-2 ring-primary-200'
                                : 'bg-gray-900 text-white hover:bg-gray-800'
                            }`}
                          >
                            {isExpanded ? (
                              <>
                                Thu gọn <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Xem chi tiết <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết chuyên sâu của lượt khám */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 sm:p-6 bg-slate-50/40 space-y-5">
                        {/* 1. Chẩn đoán & Sinh hiệu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Chẩn đoán lâm sàng */}
                          <div className="rounded-xl bg-blue-50/80 p-4 border border-blue-100 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" /> Chẩn đoán & Lâm sàng
                            </p>
                            <div>
                              <span className="text-xs font-medium text-gray-500 block">Chẩn đoán xác định:</span>
                              <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5 flex-wrap">
                                {hs.chanDoanXacDinh || 'Chưa có chẩn đoán xác định'}
                                {hs.maIcd10 && (
                                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded border border-purple-200">
                                    ICD-10: {hs.maIcd10}
                                  </span>
                                )}
                              </p>
                            </div>
                            {hs.chanDoanSoBo && (
                              <div>
                                <span className="text-xs font-medium text-gray-500 block">Chẩn đoán sơ bộ:</span>
                                <p className="font-medium text-gray-800 text-xs">{hs.chanDoanSoBo}</p>
                              </div>
                            )}
                            {hs.trieuChung && (
                              <p className="text-xs text-gray-600 pt-1 border-t border-blue-100">
                                <strong>Triệu chứng lâm sàng:</strong> {hs.trieuChung}
                              </p>
                            )}
                            {hs.phuongPhapDieuTri && (
                              <p className="text-xs text-gray-600">
                                <strong>Hướng điều trị & Lời khuyên:</strong> {hs.phuongPhapDieuTri}
                              </p>
                            )}
                            {hs.ghiChu && (
                              <p className="text-xs text-gray-500 italic">
                                <strong>Ghi chú:</strong> {hs.ghiChu}
                              </p>
                            )}
                          </div>

                          {/* Chỉ số sinh hiệu */}
                          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                              <Activity className="h-3.5 w-3.5 text-primary-600" /> Chỉ số sinh hiệu
                            </p>
                            {sinhHieu ? (
                              <div className="grid grid-cols-2 gap-2.5 text-xs font-medium text-gray-700 pt-1">
                                <div className="p-2 bg-white rounded-lg border border-gray-200">
                                  <span className="text-gray-400 block text-[10px]">Huyết áp:</span>
                                  <strong className="text-gray-900 text-sm">
                                    {sinhHieu.huyet_ap_tam_thu || sinhHieu.huyetApTamThu || 120}/{sinhHieu.huyet_ap_tam_truong || sinhHieu.huyetApTamTruong || 80}
                                  </strong> <span className="text-gray-500 text-[10px]">mmHg</span>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-gray-200">
                                  <span className="text-gray-400 block text-[10px]">Nhiệt độ:</span>
                                  <strong className="text-gray-900 text-sm">
                                    {sinhHieu.nhiet_do_c || sinhHieu.nhietDoC || 36.8}
                                  </strong> <span className="text-gray-500 text-[10px]">°C</span>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-gray-200">
                                  <span className="text-gray-400 block text-[10px]">Nhịp tim / Mạch:</span>
                                  <strong className="text-gray-900 text-sm">
                                    {sinhHieu.mach || sinhHieu.nhip_tim || 75}
                                  </strong> <span className="text-gray-500 text-[10px]">lần/phút</span>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-gray-200">
                                  <span className="text-gray-400 block text-[10px]">Nồng độ SpO2:</span>
                                  <strong className="text-gray-900 text-sm">
                                    {sinhHieu.spo2 || 98}
                                  </strong> <span className="text-gray-500 text-[10px]">%</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 py-3">Chưa ghi nhận chỉ số sinh hiệu</p>
                            )}
                            {hs.taiKham && (
                              <div className="pt-2 border-t border-gray-200 text-xs text-primary-600 font-semibold flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> Hẹn tái khám: {formatDate(hs.taiKham)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Kết quả Cận lâm sàng & Xét nghiệm */}
                        {canLamSang && canLamSang.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                <FlaskConical className="h-4 w-4 text-purple-600" /> Kết quả Xét nghiệm & CĐHA ({canLamSang.length})
                              </h5>
                              <button
                                type="button"
                                onClick={() => setPrintXetNghiem({ open: true, items: canLamSang, record: hs })}
                                className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                              >
                                <Printer className="h-3.5 w-3.5" /> In phiếu kết quả ({canLamSang.length})
                              </button>
                            </div>

                            <div className="space-y-3">
                              {canLamSang.map((c) => {
                                const kq = c.ketQua;
                                const dv = c.dichVu || {};
                                const giaTri = kq?.giaTri ?? kq?.gia_tri;
                                const donVi = kq?.donVi ?? kq?.don_vi ?? dv.donViKetQua ?? '';
                                const thamChieu = dv.giaTriBinhThuong || 'Bình thường';
                                const nhanXet = kq?.nhanXet ?? kq?.nhan_xet;
                                const fileDinhKem = kq?.fileDinhKem ?? kq?.file_dinh_kem;
                                const fileUrl = fileDinhKem ? (fileDinhKem.startsWith('http') ? fileDinhKem : `http://localhost:5000${fileDinhKem}`) : null;
                                const isImage = fileDinhKem && fileDinhKem.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                                const isCoKetQua = c.trangThai === 'co_ket_qua' || !!kq;

                                return (
                                  <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase font-mono">
                                            {dv.maDichVu || 'CLS'}
                                          </span>
                                          <span className="font-semibold text-gray-900 text-sm">{dv.tenDichVu || 'Cận lâm sàng'}</span>
                                          <span className="text-xs text-gray-400">
                                            ({dv.loai === 'cdha' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm y khoa'})
                                          </span>
                                        </div>
                                        {c.thoiGianChiDinh && (
                                          <p className="text-[11px] text-gray-500">
                                            Chỉ định lúc: {formatDateTime(c.thoiGianChiDinh)}
                                          </p>
                                        )}
                                      </div>

                                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border ${
                                        isCoKetQua ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}>
                                        {isCoKetQua ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                        {isCoKetQua ? 'Đã có kết quả' : 'Đang xử lý'}
                                      </span>
                                    </div>

                                    {isCoKetQua && kq ? (
                                      <div className="space-y-3">
                                        {/* Bảng chỉ số đo đạc */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
                                          <div className="space-y-0.5">
                                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                              Kết quả đo đạc:
                                            </span>
                                            <div className="flex items-baseline gap-1">
                                              <span className="text-lg font-bold text-purple-700">{giaTri || '—'}</span>
                                              {donVi && <span className="text-xs font-medium text-purple-600">{donVi}</span>}
                                            </div>
                                          </div>

                                          <div className="space-y-0.5">
                                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                              Tham chiếu chuẩn:
                                            </span>
                                            <span className="text-sm font-medium text-gray-700">{thamChieu}</span>
                                          </div>

                                          <div className="space-y-0.5">
                                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                              Thời gian hoàn thành:
                                            </span>
                                            <span className="text-xs text-gray-600">
                                              {formatDateTime(kq.thoiGianNhap || c.thoiGianCoKetQua || new Date())}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Đánh giá KTV */}
                                        {nhanXet && (
                                          <div className="rounded-lg bg-gray-50 p-2.5 border border-gray-200 text-xs text-gray-800 space-y-1">
                                            <span className="font-semibold text-gray-700 flex items-center gap-1">
                                              💬 Đánh giá & Nhận xét của Kỹ thuật viên:
                                            </span>
                                            <p className="italic text-gray-600 pl-2 border-l-2 border-purple-300">
                                              "{nhanXet}"
                                            </p>
                                          </div>
                                        )}

                                        {/* Tệp đính kèm / Ảnh chẩn đoán */}
                                        {fileUrl && (
                                          <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                                                📎 Tệp kết quả đính kèm (Ảnh chẩn đoán / PDF)
                                              </span>
                                              <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
                                              >
                                                Mở tab mới <ExternalLink className="h-3 w-3" />
                                              </a>
                                            </div>

                                            {isImage ? (
                                              <div className="flex items-center gap-3 pt-1">
                                                <img
                                                  src={fileUrl}
                                                  alt="Ảnh kết quả"
                                                  className="h-20 w-28 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition"
                                                  onClick={() => window.open(fileUrl, '_blank')}
                                                />
                                                <div className="text-xs text-gray-500 space-y-1">
                                                  <p className="font-medium text-gray-700">Ảnh kết quả siêu âm / X-Quang / Nội soi</p>
                                                  <button
                                                    type="button"
                                                    onClick={() => window.open(fileUrl, '_blank')}
                                                    className="inline-flex items-center gap-1 text-primary-600 font-semibold hover:underline text-[11px]"
                                                  >
                                                    <Eye className="h-3 w-3" /> Xem ảnh kích thước gốc
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center gap-2">
                                                  <FileText className="h-5 w-5 text-primary-600" />
                                                  <span className="text-xs font-semibold text-gray-700">Tài liệu y khoa (.PDF)</span>
                                                </div>
                                                <a
                                                  href={fileUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-xs font-semibold text-primary-600 bg-white px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition"
                                                >
                                                  Xem tài liệu ↗
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                                        <span>Đang thực hiện xét nghiệm / cận lâm sàng... Kết quả sẽ cập nhật ngay khi KTV hoàn thành.</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. Đơn thuốc đã kê */}
                        {donThuoc && donThuoc.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                              <Pill className="h-4 w-4 text-emerald-600" /> Đơn thuốc được bác sĩ kê ({tongThuoc} loại)
                            </h5>
                            {donThuoc.map((dt) => (
                              <div key={dt.id} className="rounded-xl border border-gray-200 overflow-hidden text-sm bg-white">
                                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 flex justify-between border-b border-gray-200">
                                  <span>Mã đơn thuốc: #{dt.maDonThuoc || dt.id}</span>
                                  <span className={dt.trangThai === 'da_phat' ? 'text-green-700 font-bold' : 'text-gray-600'}>
                                    {dt.trangThai === 'da_phat' ? '✓ Đã cấp phát thuốc' : 'Đơn thuốc mới'}
                                  </span>
                                </div>
                                <table className="w-full text-left">
                                  <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
                                    <tr>
                                      <th className="px-4 py-2">Tên thuốc</th>
                                      <th className="px-4 py-2 text-center">ĐVT</th>
                                      <th className="px-4 py-2 text-center">SL</th>
                                      <th className="px-4 py-2">Hướng dẫn sử dụng & Liều dùng</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-xs">
                                    {(dt.chiTietDonThuoc || dt.chiTiet || []).map((ct) => (
                                      <tr key={ct.id}>
                                        <td className="px-4 py-2.5 font-semibold text-gray-900">{ct.thuoc?.tenThuoc || 'Thuốc'}</td>
                                        <td className="px-4 py-2.5 text-center text-gray-600">{ct.dvt || ct.thuoc?.donViTinh || 'Viên'}</td>
                                        <td className="px-4 py-2.5 text-center font-bold text-primary-600">{ct.soLuong}</td>
                                        <td className="px-4 py-2.5 text-gray-600">{ct.lieuDung || ct.huongDanSuDung || 'Uống theo chỉ định'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 4. Hóa đơn viện phí & thanh toán */}
                        {hs.hoaDon && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                <CreditCard className="h-4 w-4 text-primary-600" /> Hóa đơn viện phí & Thanh toán
                              </h5>
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                hs.hoaDon.trangThai === 'da_thanh_toan'
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-amber-700 bg-amber-50 border-amber-200'
                              }`}>
                                {hs.hoaDon.trangThai === 'da_thanh_toan' ? '✓ Đã thanh toán viện phí' : 'Chờ thanh toán tại quầy'}
                              </span>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                                <div>
                                  <span className="text-gray-500">Mã hóa đơn: </span>
                                  <span className="font-mono font-bold text-gray-900">{hs.hoaDon.maHoaDon}</span>
                                </div>
                                {hs.hoaDon.ngayThanhToan && (
                                  <div className="text-gray-500">
                                    Thời gian: <span className="font-medium text-gray-700">{formatDateTime(hs.hoaDon.ngayThanhToan)}</span>
                                    {hs.hoaDon.phuongThucThanhToan && ` (${hs.hoaDon.phuongThucThanhToan})`}
                                  </div>
                                )}
                              </div>

                              {hs.hoaDon.chiTiet && hs.hoaDon.chiTiet.length > 0 && (
                                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                  <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[11px] font-semibold text-gray-600 border-b border-gray-200">
                                      <tr>
                                        <th className="px-3 py-2">Dịch vụ viện phí</th>
                                        <th className="px-3 py-2 text-center">Phân loại</th>
                                        <th className="px-3 py-2 text-center">SL</th>
                                        <th className="px-3 py-2 text-right">Đơn giá</th>
                                        <th className="px-3 py-2 text-right">Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                      {hs.hoaDon.chiTiet.map((ct, cIdx) => (
                                        <tr key={cIdx} className="hover:bg-gray-50/50">
                                          <td className="px-3 py-2 font-medium text-gray-900">{ct.moTa || 'Khoản thu'}</td>
                                          <td className="px-3 py-2 text-center">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                              ct.loaiPhi === 'kham_benh'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : ct.loaiPhi === 'xet_nghiem' || ct.loaiPhi === 'cdha'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }`}>
                                              {ct.loaiPhi === 'kham_benh' ? 'Khám bệnh' : (ct.loaiPhi === 'xet_nghiem' || ct.loaiPhi === 'cdha') ? 'Cận lâm sàng' : 'Thuốc'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-center text-gray-700 font-semibold">{ct.soLuong || 1}</td>
                                          <td className="px-3 py-2 text-right font-mono text-gray-700">{formatCurrency(ct.donGia)}</td>
                                          <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">{formatCurrency(ct.thanhTien)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              <div className="pt-2 border-t border-gray-200 space-y-1">
                                <div className="flex justify-between text-gray-600">
                                  <span>Tổng viện phí:</span>
                                  <span className="font-medium text-gray-800">{formatCurrency(hs.hoaDon.tongTien)}</span>
                                </div>
                                {hs.hoaDon.soTienGiam > 0 && (
                                  <div className="flex justify-between text-emerald-700">
                                    <span>BHYT chi trả:</span>
                                    <span className="font-medium">- {formatCurrency(hs.hoaDon.soTienGiam)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200">
                                  <span>Số tiền thực thu:</span>
                                  <span className="text-primary-600 font-bold">{formatCurrency(hs.hoaDon.thucThu)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Nút thu gọn ở cuối card */}
                        <div className="pt-2 flex justify-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(recordId)}
                            className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <ChevronUp className="h-3.5 w-3.5" /> Thu gọn lượt khám này
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm text-gray-400">Chọn bệnh nhân ở danh sách bên trái để xem Hồ sơ Bệnh án EMR</p>
          </div>
        )}
      </div>

      {/* Modal In Phiếu Khám */}
      <InPhieuKhamModal
        isOpen={printPhieuKham.open}
        onClose={() => setPrintPhieuKham({ open: false, record: null })}
        benhAn={printPhieuKham.record?.benhAn || printPhieuKham.record?.benhAnKham || printPhieuKham.record}
        benhNhan={activeBn || printPhieuKham.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printPhieuKham.record?.bacSiTen || printPhieuKham.record?.bacSi?.nhanVien?.hoTen || 'Bác sĩ điều trị' } }}
        sinhHieu={printPhieuKham.record?.sinhHieu}
        dsXetNghiem={(printPhieuKham.record?.canLamSang || printPhieuKham.record?.xetNghiem || [])
          .filter((c) => c.trangThai !== 'huy' && c.chiDinh?.trangThai !== 'huy')
          .map((c) => ({
            tenDichVu: c.dichVu?.tenDichVu,
            ketQua: c.ketQua ? `${c.ketQua.gia_tri || c.ketQua.giaTri || ''} ${c.ketQua.don_vi || c.ketQua.donVi || ''}` : 'Chờ KQ',
            ghiChuKetQua: c.ketQua?.nhan_xet || c.ketQua?.nhanXet || '',
          }))}
      />

      {/* Modal In Đơn Thuốc */}
      <InDonThuocModal
        isOpen={printDonThuoc.open}
        onClose={() => setPrintDonThuoc({ open: false, donThuoc: null, record: null })}
        donThuoc={printDonThuoc.donThuoc ? {
          ...printDonThuoc.donThuoc,
          chiTiet: (printDonThuoc.donThuoc.chiTiet || printDonThuoc.donThuoc.chiTietDonThuoc || []).map((ct) => ({
            thuoc: ct.thuoc,
            soLuong: ct.soLuong,
            lieuDung: ct.lieuDung || ct.huongDanSuDung,
            donViTinh: ct.thuoc?.donViTinh || ct.dvt || 'Viên',
          })),
        } : null}
        benhNhan={activeBn || printDonThuoc.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printDonThuoc.record?.bacSiTen || printDonThuoc.record?.bacSi?.nhanVien?.hoTen || 'Bác sĩ điều trị' } }}
        chanDoan={printDonThuoc.record?.chanDoanXacDinh || printDonThuoc.record?.benhAn?.chanDoanXacDinh || 'Đơn thuốc điều trị ngoại trú'}
      />

      {/* Modal In Kết Quả Xét Nghiệm */}
      <InKetQuaXetNghiemModal
        isOpen={printXetNghiem.open}
        onClose={() => setPrintXetNghiem({ open: false, items: [], record: null })}
        items={printXetNghiem.items}
        record={printXetNghiem.record}
        benhNhan={activeBn || printXetNghiem.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printXetNghiem.record?.bacSiTen || printXetNghiem.record?.bacSi?.nhanVien?.hoTen || 'Bác sĩ điều trị' } }}
      />
    </div>
  );
}
