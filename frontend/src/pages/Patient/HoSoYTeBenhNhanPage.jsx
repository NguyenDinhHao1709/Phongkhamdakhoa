import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  FileText, Activity, Pill, FlaskConical, Stethoscope, User, AlertTriangle, Clock,
  Printer, ExternalLink, Eye, CheckCircle2, CreditCard, Search, Calendar,
  ChevronDown, ChevronUp, RotateCcw, X, Filter, Star
} from 'lucide-react';
import InPhieuKhamModal from '../../components/Print/InPhieuKhamModal';
import InDonThuocModal from '../../components/Print/InDonThuocModal';
import InKetQuaXetNghiemModal from '../../components/Print/InKetQuaXetNghiemModal';
import DanhGiaCaKhamModal from '../../components/Appointment/DanhGiaCaKhamModal';

export default function HoSoYTeBenhNhanPage() {
  const [printPhieuKham, setPrintPhieuKham] = useState({ open: false, record: null });
  const [printDonThuoc, setPrintDonThuoc] = useState({ open: false, donThuoc: null, record: null });
  const [printXetNghiem, setPrintXetNghiem] = useState({ open: false, items: [], record: null });
  const [reviewModalData, setReviewModalData] = useState({ isOpen: false, appointment: null });

  // Bộ lọc & Tìm kiếm hồ sơ y tế
  const [timeRange, setTimeRange] = useState('all'); // 'all', '7days', '30days', 'thisMonth', '3months', 'thisYear', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'has_thuoc', 'has_cls', 'da_hoan_thanh', 'dang_kham'

  // Quản lý trạng thái mở rộng từng lần khám (default thu gọn gọn gàng)
  const [expandedIds, setExpandedIds] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['emr-cua-toi'],
    queryFn: () => apiGet('/ho-so-benh-an/cua-toi'),
  });

  const res = data?.data;
  const records = Array.isArray(res) ? res : (res?.lichSuKham || []);
  const latestBenhNhan = res?.benhNhan || records[0]?.benhNhan;

  // Lọc danh sách hồ sơ y tế theo thời gian, loại và từ khóa tìm kiếm
  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const ba = item.benhAn || item.benhAnKham || item;
      const rawDate = ba.ngayKham || ba.taoLuc || item.ngayKham || item.taoLuc;
      const itemDate = rawDate ? new Date(rawDate) : null;
      const now = new Date();

      // 1. Lọc theo thời gian
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

      // 2. Lọc theo loại
      if (filterType === 'has_thuoc') {
        const dt = item.donThuoc || [];
        if (!dt || dt.length === 0) return false;
      } else if (filterType === 'has_cls') {
        const cls = (item.canLamSang || item.xetNghiem || []).filter(
          (c) => c.trangThai !== 'huy' && c.chiDinh?.trangThai !== 'huy'
        );
        if (!cls || cls.length === 0) return false;
      } else if (filterType === 'da_hoan_thanh') {
        if (ba.trangThai !== 'da_hoan_thanh') return false;
      } else if (filterType === 'dang_kham') {
        if (ba.trangThai === 'da_hoan_thanh') return false;
      }

      // 3. Tìm kiếm theo từ khóa
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const bacSiTen = (
          item.bacSiTen ||
          (typeof item.bacSi === 'string' ? item.bacSi : item.bacSi?.nhanVien?.hoTen) ||
          ''
        ).toLowerCase();
        const chanDoanXacDinh = (ba.chanDoanXacDinh || '').toLowerCase();
        const chanDoanSoBo = (ba.chanDoanSoBo || '').toLowerCase();
        const trieuChung = (ba.trieuChung || '').toLowerCase();
        const phuongPhapDieuTri = (ba.phuongPhapDieuTri || '').toLowerCase();
        const luotId = String(ba.luotTiepNhanId || '');

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
          luotId.includes(q);

        if (!matchMain && !matchThuoc && !matchCls) return false;
      }

      return true;
    });
  }, [records, timeRange, customStartDate, customEndDate, filterType, searchTerm]);

  const toggleExpand = (recordId) => {
    setExpandedIds((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  const isAllExpanded =
    filteredRecords.length > 0 &&
    filteredRecords.every((item, idx) => {
      const ba = item.benhAn || item.benhAnKham || item;
      const id = ba.id || ba.luotTiepNhanId || idx;
      return !!expandedIds[id];
    });

  const handleToggleAll = () => {
    if (isAllExpanded) {
      setExpandedIds({});
    } else {
      const next = {};
      filteredRecords.forEach((item, idx) => {
        const ba = item.benhAn || item.benhAnKham || item;
        const id = ba.id || ba.luotTiepNhanId || idx;
        next[id] = true;
      });
      setExpandedIds(next);
    }
  };

  const handleResetFilters = () => {
    setTimeRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchTerm('');
    setFilterType('all');
  };

  const hasActiveFilter =
    timeRange !== 'all' ||
    searchTerm.trim() !== '' ||
    filterType !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '';

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Tiêu đề */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" /> Hồ sơ y tế cá nhân (EMR)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Tra cứu lịch sử khám bệnh, chẩn đoán ICD-10, đơn thuốc và kết quả xét nghiệm được cập nhật trực tiếp từ phòng khám
        </p>
      </div>

      {/* Thông tin bệnh nhân */}
      {latestBenhNhan && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{latestBenhNhan.hoTen}</h2>
              <p className="text-xs text-gray-500 font-mono">
                Mã BN: {latestBenhNhan.maBenhNhan} {latestBenhNhan.soDienThoai && `• SĐT: ${latestBenhNhan.soDienThoai}`}
              </p>
            </div>
          </div>
          {(latestBenhNhan.diUng || latestBenhNhan.tienSuBenh) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
              {latestBenhNhan.diUng && (
                <span className="text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Dị ứng: {latestBenhNhan.diUng}
                </span>
              )}
              {latestBenhNhan.tienSuBenh && (
                <span className="text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
                  Tiền sử bệnh: {latestBenhNhan.tienSuBenh}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Thanh bộ lọc & tìm kiếm hồ sơ y tế */}
      {!isLoading && records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3.5 shadow-2xs">
          {/* Hàng 1: Ô tìm kiếm và nút Reset */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo bác sĩ, chẩn đoán ICD-10, triệu chứng, mã đơn thuốc, xét nghiệm..."
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
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

          {/* Hàng 2: Nút lọc thời gian nhanh */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1 mr-1">
              <Calendar className="h-3.5 w-3.5 text-blue-600" /> Thời gian:
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
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Khi chọn "Tùy chọn ngày": hiển thị input Từ ngày - Đến ngày */}
          {timeRange === 'custom' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs">
              <span className="font-semibold text-blue-800">Khoảng thời gian:</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-gray-600">Từ:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500"
                />
                <label className="text-gray-600">Đến:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Hàng 3: Lọc phân loại & Thống kê */}
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
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                    filterType === f.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <span className="text-xs text-gray-500 font-medium">
                Hiển thị <strong>{filteredRecords.length}</strong> / {records.length} lần khám
              </span>
              {filteredRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline ml-1 cursor-pointer"
                >
                  {isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <div className="h-8 w-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Đang nạp hồ sơ y tế điện tử từ CSDL phòng khám...</p>
        </div>
      )}

      {!isLoading && records.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30 text-blue-600" />
          <p className="text-base font-semibold text-gray-700">Chưa có lịch sử khám bệnh</p>
          <p className="text-xs text-gray-500 mt-1">Dữ liệu hồ sơ y tế sẽ được cập nhật tự động sau khi bác sĩ kết thúc lượt khám của bạn.</p>
        </div>
      )}

      {!isLoading && records.length > 0 && filteredRecords.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          <Filter className="h-9 w-9 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">Không tìm thấy lần khám nào phù hợp</p>
          <p className="text-xs text-gray-500 mt-1">Vui lòng thử chọn khoảng thời gian khác hoặc thay đổi từ khóa tìm kiếm.</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Xem tất cả hồ sơ
          </button>
        </div>
      )}

      {/* Danh sách các lần khám đã được lọc */}
      {filteredRecords.map((item, idx) => {
        const ba = item.benhAn || item.benhAnKham || item;
        const recordId = ba.id || ba.luotTiepNhanId || idx;
        const isExpanded = !!expandedIds[recordId];
        const bacSiTen = item.bacSiTen || (typeof item.bacSi === 'string' ? item.bacSi : item.bacSi?.nhanVien?.hoTen) || 'Bác sĩ điều trị';
        const donThuoc = item.donThuoc || [];
        const canLamSang = (item.canLamSang || item.xetNghiem || []).filter(
          (c) => c.trangThai !== 'huy' && c.chiDinh?.trangThai !== 'huy'
        );
        const sinhHieu = item.sinhHieu;
        const tongThuoc = donThuoc.reduce((acc, dt) => acc + (dt.chiTietDonThuoc?.length || dt.chiTiet?.length || 0), 0) || donThuoc.length;

        return (
          <div
            key={recordId}
            className={`bg-white rounded-xl border transition-all duration-200 ${
              isExpanded
                ? 'border-blue-300 shadow-md ring-1 ring-blue-100'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
            }`}
          >
            {/* Header lần khám gọn gàng */}
            <div className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                {/* Thông tin chính tóm tắt */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                    #{records.length - idx}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                        Lần khám ngày {formatDateTime(ba.ngayKham || ba.taoLuc)}
                      </h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        ba.trangThai === 'da_hoan_thanh'
                          ? 'text-green-700 bg-green-50 border-green-200'
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}>
                        {ba.trangThai === 'da_hoan_thanh' ? '✓ Đã hoàn thành' : '⏳ Đang khám'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <Stethoscope className="h-3.5 w-3.5 text-blue-600" /> {bacSiTen}
                      </span>
                      {ba.luotTiepNhanId && (
                        <span className="text-gray-400 font-mono">· Mã lượt khám #{ba.luotTiepNhanId}</span>
                      )}
                    </p>

                    {/* Tóm tắt chẩn đoán */}
                    {(ba.chanDoanXacDinh || ba.chanDoanSoBo) && (
                      <div className="text-xs text-gray-700 pt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-500">Chẩn đoán:</span>
                        <span className="font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 line-clamp-1">
                          {ba.chanDoanXacDinh || ba.chanDoanSoBo}
                        </span>
                      </div>
                    )}

                    {/* Mini tags tóm tắt nhanh số lượng thuốc, XN, viện phí */}
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
                      {item.hoaDon && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                          item.hoaDon.trangThai === 'da_thanh_toan'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <CreditCard className="h-3 w-3" />
                          {item.hoaDon.trangThai === 'da_thanh_toan'
                            ? `Đã thanh toán ${formatCurrency(item.hoaDon.thucThu)}`
                            : 'Chờ thanh toán viện phí'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Các nút in nhanh & Nút Xem chi tiết */}
                <div className="flex items-center gap-2 self-start lg:self-center flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full lg:w-auto justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrintPhieuKham({ open: true, record: item });
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
                        setPrintDonThuoc({ open: true, donThuoc: donThuoc[0], record: item });
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
                        setPrintXetNghiem({ open: true, items: canLamSang, record: item });
                      }}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center gap-1 transition cursor-pointer"
                      title="In kết quả xét nghiệm"
                    >
                      <FlaskConical className="h-3.5 w-3.5" /> <span className="hidden sm:inline">In kết quả ({canLamSang.length})</span>
                    </button>
                  )}

                  {ba.trangThai === 'da_hoan_thanh' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewModalData({
                          isOpen: true,
                          appointment: {
                            id: ba.lichHenId || item.lichHenId || item.id,
                            lichHenId: ba.lichHenId || item.lichHenId || null,
                            luotTiepNhanId: ba.luotTiepNhanId || item.luotTiepNhanId || null,
                            maLichHen: `Lần khám #${ba.id || item.id}`,
                            ngayHen: formatDate(ba.ngayKham || ba.taoLuc),
                            bacSi: { nhanVien: { hoTen: bacSiTen } },
                            chuyenKhoa: item.chuyenKhoa || 'Đa khoa',
                          },
                        });
                      }}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-200 hover:border-amber-300 hover:from-amber-100 hover:to-orange-100 flex items-center gap-1 transition cursor-pointer"
                      title="Đánh giá ca khám này"
                    >
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> <span className="hidden sm:inline">Đánh giá</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleExpand(recordId)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isExpanded
                        ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-200'
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

            {/* Chi tiết đầy đủ chỉ hiển thị khi người dùng bấm "Xem chi tiết" */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-4 sm:p-6 bg-slate-50/40 space-y-5">

            {/* Chẩn đoán & Sinh hiệu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Chẩn đoán & Lâm sàng
                </p>
                {ba.chanDoanXacDinh ? (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block">Chẩn đoán xác định (ICD-10):</span>
                    <p className="font-semibold text-gray-900 text-sm">{ba.chanDoanXacDinh}</p>
                  </div>
                ) : null}
                {ba.chanDoanSoBo && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block">Chẩn đoán sơ bộ:</span>
                    <p className="font-medium text-gray-800 text-xs">{ba.chanDoanSoBo}</p>
                  </div>
                )}
                {ba.trieuChung && (
                  <p className="text-xs text-gray-600 pt-1 border-t border-blue-100">
                    <strong>Triệu chứng:</strong> {ba.trieuChung}
                  </p>
                )}
                {ba.phuongPhapDieuTri && (
                  <p className="text-xs text-gray-600">
                    <strong>Hướng điều trị:</strong> {ba.phuongPhapDieuTri}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-blue-600" /> Chỉ số sinh hiệu
                </p>
                {sinhHieu ? (
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-700 pt-1">
                    <span>Huyết áp: <strong>{sinhHieu.huyet_ap_tam_thu || sinhHieu.huyetApTamThu || 120}/{sinhHieu.huyet_ap_tam_truong || sinhHieu.huyetApTamTruong || 80} mmHg</strong></span>
                    <span>Nhiệt độ: <strong>{sinhHieu.nhiet_do_c || sinhHieu.nhietDoC || 36.8} °C</strong></span>
                    <span>Mạch: <strong>{sinhHieu.mach || sinhHieu.nhip_tim || 75} lần/phút</strong></span>
                    <span>SpO2: <strong>{sinhHieu.spo2 || 98}%</strong></span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-2">Chưa ghi nhận chỉ số sinh hiệu</p>
                )}
                {ba.taiKham && (
                  <div className="pt-2 border-t border-gray-200 text-xs text-blue-600 font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Hẹn tái khám: {formatDate(ba.taiKham)}
                  </div>
                )}
              </div>
            </div>

            {/* Kết quả Cận lâm sàng / Xét nghiệm */}
            {canLamSang && canLamSang.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4 text-blue-600" /> Kết quả Xét nghiệm & CĐHA ({canLamSang.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPrintXetNghiem({ open: true, items: canLamSang, record: item })}
                    className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
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
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                                {dv.maDichVu || 'XN'}
                              </span>
                              <span className="font-semibold text-gray-900 text-sm">{dv.tenDichVu || 'Xét nghiệm'}</span>
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

                        {/* Hiển thị chi tiết kết quả */}
                        {isCoKetQua && kq ? (
                          <div className="space-y-3">
                            {/* Grid chỉ số */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                  Kết quả đo đạc:
                                </span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-semibold text-blue-700">{giaTri || '—'}</span>
                                  {donVi && <span className="text-xs font-medium text-blue-600">{donVi}</span>}
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

                            {/* Nhận xét chuyên môn */}
                            {nhanXet && (
                              <div className="rounded-lg bg-gray-50 p-2.5 border border-gray-200 text-xs text-gray-800 space-y-1">
                                <span className="font-semibold text-gray-700 flex items-center gap-1">
                                  💬 Đánh giá & Nhận xét của Kỹ thuật viên:
                                </span>
                                <p className="italic text-gray-600 pl-2 border-l-2 border-blue-300">
                                  "{nhanXet}"
                                </p>
                              </div>
                            )}

                            {/* Tệp đính kèm */}
                            {fileUrl && (
                              <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                                    📎 Tệp kết quả đính kèm (Ảnh chẩn đoán / File PDF)
                                  </span>
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                                  >
                                    Mở trong tab mới <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>

                                {isImage ? (
                                  <div className="flex items-center gap-3 pt-1">
                                    <img
                                      src={fileUrl}
                                      alt="Ảnh kết quả cận lâm sàng"
                                      className="h-20 w-28 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition"
                                      onClick={() => window.open(fileUrl, '_blank')}
                                    />
                                    <div className="text-xs text-gray-500 space-y-1">
                                      <p className="font-medium text-gray-700">Ảnh kết quả siêu âm / X-Quang / Nội soi</p>
                                      <p className="text-[11px] text-gray-400">Nhấn vào ảnh để xem kích thước gốc phóng to</p>
                                      <button
                                        type="button"
                                        onClick={() => window.open(fileUrl, '_blank')}
                                        className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline text-[11px]"
                                      >
                                        <Eye className="h-3 w-3" /> Xem ảnh cỡ lớn
                                      </button>
                                    </div>
                                  </div>
                                ) : isCoKetQua ? (
                                  <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-xs text-green-700 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                    <span>Kết quả đã hoàn tất và đang được đồng bộ. Vui lòng tải lại hồ sơ sau ít phút nếu chưa hiển thị chi tiết.</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-5 w-5 text-blue-600" />
                                      <span className="text-xs font-semibold text-gray-700">Tài liệu kết quả y khoa (.PDF)</span>
                                    </div>
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-semibold text-blue-600 bg-white px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition"
                                    >
                                      Xem tài liệu ↗
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Nút in chi tiết */}
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setPrintXetNghiem({ open: true, items: [c], record: item })}
                                className="text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" /> Xem bản in phiếu kết quả này
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                            <span>Mẫu bệnh phẩm đang được phòng xét nghiệm xử lý. Bệnh nhân vui lòng theo dõi hoặc làm theo hướng dẫn của điều dưỡng.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Đơn thuốc đã kê */}
            {donThuoc && donThuoc.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-blue-600" /> Đơn thuốc được bác sĩ kê
                </h4>
                {donThuoc.map((dt) => (
                  <div key={dt.id} className="rounded-xl border border-gray-200 overflow-hidden text-sm">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 flex justify-between border-b border-gray-200">
                      <span>Mã đơn thuốc: #{dt.maDonThuoc || dt.id}</span>
                      <span className={dt.trangThai === 'da_phat' ? 'text-green-700' : 'text-gray-600'}>
                        {dt.trangThai === 'da_phat' ? '✓ Đã lấy thuốc' : 'Đơn thuốc mới'}
                      </span>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2">Tên thuốc</th>
                          <th className="px-4 py-2 text-center">ĐVT</th>
                          <th className="px-4 py-2 text-center">SL</th>
                          <th className="px-4 py-2">Hướng dẫn sử dụng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {(dt.chiTietDonThuoc || dt.chiTiet || []).map((ct) => (
                          <tr key={ct.id}>
                            <td className="px-4 py-2.5 font-semibold text-gray-900">{ct.thuoc?.tenThuoc || 'Thuốc'}</td>
                            <td className="px-4 py-2.5 text-center text-gray-600">{ct.dvt || ct.thuoc?.donViTinh || 'Viên'}</td>
                            <td className="px-4 py-2.5 text-center font-semibold text-blue-600">{ct.soLuong}</td>
                            <td className="px-4 py-2.5 text-gray-600">{ct.lieuDung || ct.huongDanSuDung || 'Uống theo chỉ định'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* Hóa đơn viện phí & Biên lai thanh toán */}
            {item.hoaDon && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-600" /> Hóa đơn viện phí & Thanh toán
                  </h4>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    item.hoaDon.trangThai === 'da_thanh_toan'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    {item.hoaDon.trangThai === 'da_thanh_toan' ? '✓ Đã thanh toán viện phí' : 'Chờ thanh toán tại quầy'}
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                    <div>
                      <span className="text-gray-500">Mã hóa đơn: </span>
                      <span className="font-mono font-bold text-gray-900">{item.hoaDon.maHoaDon}</span>
                    </div>
                    {item.hoaDon.ngayThanhToan && (
                      <div className="text-gray-500">
                        Thời gian thanh toán: <span className="font-medium text-gray-700">{formatDateTime(item.hoaDon.ngayThanhToan)}</span>
                        {item.hoaDon.phuongThucThanhToan && ` (${item.hoaDon.phuongThucThanhToan})`}
                      </div>
                    )}
                  </div>

                  {item.hoaDon.chiTiet && item.hoaDon.chiTiet.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[11px] font-semibold text-gray-600 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2">Dịch vụ / Danh mục viện phí</th>
                            <th className="px-3 py-2 text-center">Phân loại</th>
                            <th className="px-3 py-2 text-center">SL</th>
                            <th className="px-3 py-2 text-right">Đơn giá</th>
                            <th className="px-3 py-2 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {item.hoaDon.chiTiet.map((ct, cIdx) => (
                            <tr key={cIdx} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {ct.moTa || 'Khoản thu viện phí'}
                              </td>
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
                      <span className="font-medium text-gray-800">{formatCurrency(item.hoaDon.tongTien)}</span>
                    </div>
                    {item.hoaDon.soTienGiam > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>BHYT chi trả:</span>
                        <span className="font-medium">- {formatCurrency(item.hoaDon.soTienGiam)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200">
                      <span>Số tiền thực thu:</span>
                      <span className="text-primary-600 font-bold">{formatCurrency(item.hoaDon.thucThu)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nút thu gọn ở cuối phần chi tiết */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => toggleExpand(recordId)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <ChevronUp className="h-3.5 w-3.5" /> Thu gọn lần khám này
              </button>
            </div>
          </div>
        )}
      </div>
    );
  })}

      {/* Modal In Phiếu Khám Bệnh cho Bệnh Nhân */}
      <InPhieuKhamModal
        isOpen={printPhieuKham.open}
        onClose={() => setPrintPhieuKham({ open: false, record: null })}
        benhAn={printPhieuKham.record?.benhAn || printPhieuKham.record?.benhAnKham || printPhieuKham.record}
        benhNhan={latestBenhNhan || printPhieuKham.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printPhieuKham.record?.bacSiTen || printPhieuKham.record?.bacSi?.nhanVien?.hoTen || (typeof printPhieuKham.record?.bacSi === 'string' ? printPhieuKham.record?.bacSi : 'Bác sĩ điều trị') } }}
        sinhHieu={printPhieuKham.record?.sinhHieu}
        dsXetNghiem={(printPhieuKham.record?.canLamSang || printPhieuKham.record?.xetNghiem || [])
          .filter((c) => c.trangThai !== 'huy' && c.chiDinh?.trangThai !== 'huy')
          .map((c) => ({
            tenDichVu: c.dichVu?.tenDichVu,
            ketQua: c.ketQua ? `${c.ketQua.gia_tri || c.ketQua.giaTri || ''} ${c.ketQua.don_vi || c.ketQua.donVi || ''}` : 'Chờ KQ',
            ghiChuKetQua: c.ketQua?.nhan_xet || c.ketQua?.nhanXet || '',
          }))}
      />

      {/* Modal In Đơn Thuốc cho Bệnh Nhân */}
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
        benhNhan={latestBenhNhan || printDonThuoc.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printDonThuoc.record?.bacSiTen || printDonThuoc.record?.bacSi?.nhanVien?.hoTen || (typeof printDonThuoc.record?.bacSi === 'string' ? printDonThuoc.record?.bacSi : 'Bác sĩ điều trị') } }}
        chanDoan={printDonThuoc.record?.chanDoanXacDinh || printDonThuoc.record?.benhAn?.chanDoanXacDinh || printDonThuoc.record?.benhAnKham?.chanDoanXacDinh || 'Đơn thuốc điều trị ngoại trú'}
      />

      {/* Modal In & Xem Phiếu Kết Quả Xét Nghiệm / CĐHA */}
      <InKetQuaXetNghiemModal
        isOpen={printXetNghiem.open}
        onClose={() => setPrintXetNghiem({ open: false, items: [], record: null })}
        items={printXetNghiem.items}
        record={printXetNghiem.record}
        benhNhan={latestBenhNhan || printXetNghiem.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printXetNghiem.record?.bacSiTen || printXetNghiem.record?.bacSi?.nhanVien?.hoTen || (typeof printXetNghiem.record?.bacSi === 'string' ? printXetNghiem.record?.bacSi : 'Bác sĩ điều trị') } }}
      />

      {/* Modal Đánh Giá Trải Nghiệm Ca Khám */}
      <DanhGiaCaKhamModal
        isOpen={reviewModalData.isOpen}
        appointment={reviewModalData.appointment}
        onClose={() => setReviewModalData({ isOpen: false, appointment: null })}
      />
    </div>
  );
}
