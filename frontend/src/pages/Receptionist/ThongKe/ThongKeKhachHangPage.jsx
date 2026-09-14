import { useState, useEffect, useMemo } from 'react';
import {
  Users, CalendarCheck, Clock, CheckCircle2, XCircle, TrendingUp, BarChart2,
  Search, Filter, Download, Printer, RefreshCw, Activity, Heart,
  Stethoscope, Eye, ChevronLeft, ChevronRight, UserCheck, ShieldAlert
} from 'lucide-react';
import { apiGet } from '../../../services/api';
import { formatDateTime } from '../../../utils/formatDate';

export default function ThongKeKhachHangPage() {
  const [timeRange, setTimeRange] = useState('tat_ca');
  const [stats, setStats] = useState(null);
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc danh sách
  const [search, setSearch] = useState('');
  const [selectedPhong, setSelectedPhong] = useState('TAT_CA');
  const [selectedTrangThai, setSelectedTrangThai] = useState('TAT_CA');
  const [selectedLoai, setSelectedLoai] = useState('TAT_CA');

  // Phân trang
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modal chi tiết
  const [selectedItem, setSelectedItem] = useState(null);

  // Tải dữ liệu từ backend
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Tải thống kê KPI & biểu đồ
      const statsRes = await apiGet(`/tiep-nhan/bao-cao/thong-ke?khoangThoiGian=${timeRange}`);
      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      // 2. Tải danh sách lượt tiếp nhận (100 lượt mới nhất để lọc mượt mà)
      let listParams = `?khoangThoiGian=${timeRange}&limit=100`;
      if (selectedPhong !== 'TAT_CA') listParams += `&phongKhamId=${selectedPhong}`;
      if (selectedTrangThai !== 'TAT_CA') listParams += `&trangThai=${selectedTrangThai}`;
      if (selectedLoai !== 'TAT_CA') listParams += `&loaiTiepNhan=${selectedLoai}`;
      if (search.trim()) listParams += `&search=${encodeURIComponent(search.trim())}`;

      const listRes = await apiGet(`/tiep-nhan/bao-cao/danh-sach${listParams}`);
      const items = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data?.data || []);
      setListData(items);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu báo cáo tiếp nhận:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, selectedPhong, selectedTrangThai, selectedLoai]);

  // Lọc client-side cho tìm kiếm tức thời
  const filteredList = useMemo(() => {
    if (!search.trim()) return listData;
    const kw = search.trim().toLowerCase();
    return listData.filter(item => {
      const bnName = item.benhNhan?.hoTen?.toLowerCase() || '';
      const bnPhone = item.benhNhan?.soDienThoai?.toLowerCase() || '';
      const bnCode = item.benhNhan?.maBenhNhan?.toLowerCase() || '';
      const stt = item.maSoThuTu?.toLowerCase() || '';
      const room = item.phongKham?.ten_phong?.toLowerCase() || '';
      const doctor = item.bacSi?.nhanVien?.hoTen?.toLowerCase() || '';
      return (
        bnName.includes(kw) ||
        bnPhone.includes(kw) ||
        bnCode.includes(kw) ||
        stt.includes(kw) ||
        room.includes(kw) ||
        doctor.includes(kw)
      );
    });
  }, [listData, search]);

  // Phân trang
  const totalPages = Math.ceil(filteredList.length / limit) || 1;
  const paginatedList = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredList.slice(start, start + limit);
  }, [filteredList, page, limit]);

  // Xuất file CSV
  const handleExportCSV = () => {
    const headers = [
      'STT', 'Mã Tiếp Nhận', 'Mã Bệnh Nhân', 'Họ Tên', 'Năm Sinh', 'Giới Tính',
      'Số Điện Thoại', 'Phòng Khám', 'Bác Sĩ', 'Thời Gian Đến', 'Huyết Áp',
      'Mạch', 'Nhiệt Độ', 'SpO2', 'Hình Thức', 'Trạng Thái'
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      `"${item.maSoThuTu || ''}"`,
      `"${item.benhNhan?.maBenhNhan || ''}"`,
      `"${item.benhNhan?.hoTen || ''}"`,
      `"${item.benhNhan?.ngaySinh ? item.benhNhan.ngaySinh.slice(0, 4) : ''}"`,
      `"${item.benhNhan?.gioiTinh === 'nam' ? 'Nam' : item.benhNhan?.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}"`,
      `"${item.benhNhan?.soDienThoai || ''}"`,
      `"${item.phongKham?.ten_phong || 'Chưa chỉ định'}"`,
      `"${item.bacSi?.nhanVien?.hoTen || 'Chưa chỉ định'}"`,
      `"${item.thoiGianDen ? new Date(item.thoiGianDen).toLocaleString('vi-VN') : ''}"`,
      `"${item.sinhHieu?.huyetApTamThu ? `${item.sinhHieu.huyetApTamThu}/${item.sinhHieu.huyetApTamTruong || 80}` : '—'}"`,
      `"${item.sinhHieu?.nhipTim ? `${item.sinhHieu.nhipTim} bpm` : '—'}"`,
      `"${item.sinhHieu?.nhietDoC ? `${item.sinhHieu.nhietDoC}°C` : '—'}"`,
      `"${item.sinhHieu?.spo2 ? `${item.sinhHieu.spo2}%` : '—'}"`,
      `"${item.lichHenId ? 'Đặt hẹn online' : 'Khám trực tiếp'}"`,
      `"${item.trangThai || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    link.download = `bao_cao_tiep_don_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // In báo cáo
  const handlePrint = () => {
    window.print();
  };

  // Helper render badge trạng thái
  const renderBadgeTrangThai = (status) => {
    switch (status) {
      case 'cho_kham':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ khám
          </span>
        );
      case 'dang_kham':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Đang khám
          </span>
        );
      case 'hoan_thanh':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã khám
          </span>
        );
      case 'da_huy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  // Tính max count khung giờ để vẽ biểu đồ thanh cột
  const maxKhungGio = useMemo(() => {
    if (!stats?.khungGio) return 1;
    return Math.max(...stats.khungGio.map(k => k.count), 1);
  }, [stats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* ─── 1. HEADER DASHBOARD & TIME FILTER ──────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              RECEPTION ANALYTICS & DASHBOARD
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Đồng bộ thời gian thực
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
            Báo Cáo & Dashboard Tiếp Đón Bệnh Nhân
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Giám sát toàn diện lưu lượng bệnh nhân tại quầy tiếp tân, tỷ lệ phân luồng và kết quả khám thực tế.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={timeRange}
            onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white font-medium text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="tat_ca">Toàn bộ thời gian (Tổng thể)</option>
            <option value="hom_nay">Hôm nay ({new Date().toLocaleDateString('vi-VN')})</option>
            <option value="7_ngay">7 ngày gần nhất</option>
            <option value="thang_nay">Tháng này (Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()})</option>
          </select>

          <button
            onClick={() => { setPage(1); fetchData(); }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition-all disabled:opacity-60"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 shadow-sm transition-all"
            title="Xuất file CSV báo cáo"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-sm transition-all"
            title="In trang báo cáo"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">In báo cáo</span>
          </button>
        </div>
      </div>

      {/* ─── 2. HÀNG 5 THẺ METRIC STAT CARDS ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Thẻ 1: Tổng lượt */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-1.5 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng Tiếp Nhận</span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {stats?.tongLuot?.toLocaleString('vi-VN') || 0}
          </p>
          <p className="text-xs text-gray-500">Lượt đăng ký tại quầy</p>
        </div>

        {/* Thẻ 2: Đặt hẹn trước */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-1.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Đặt Lịch Online</span>
            <CalendarCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-700">
            {stats?.datLichCount?.toLocaleString('vi-VN') || 0}
          </p>
          <p className="text-xs text-indigo-600">Đã cọc & xác nhận trước</p>
        </div>

        {/* Thẻ 3: Khám vãng lai */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-1.5 hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Khám Vãng Lai</span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700">
            {stats?.vangLaiCount?.toLocaleString('vi-VN') || 0}
          </p>
          <p className="text-xs text-amber-600">Đến trực tiếp đăng ký</p>
        </div>

        {/* Thẻ 4: Đã khám xong */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-1.5 hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Hoàn Thành Khám</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-700">
              {stats?.hoanThanhCount?.toLocaleString('vi-VN') || 0}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              ({stats?.tyLeHoanThanh || 0}%)
            </span>
          </div>
          <p className="text-xs text-gray-500">Đã xong quy trình khám</p>
        </div>

        {/* Thẻ 5: Đang phục vụ */}
        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-1.5 hover:border-cyan-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Đang Phục Vụ</span>
            <Stethoscope className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-cyan-700">
              {(stats?.choKhamCount || 0) + (stats?.dangKhamCount || 0)}
            </span>
            <span className="text-xs text-gray-500 font-normal">
              ({stats?.choKhamCount || 0} chờ / {stats?.dangKhamCount || 0} khám)
            </span>
          </div>
          <p className="text-xs text-gray-500">Hiện đang tại các phòng</p>
        </div>
      </div>

      {/* ─── 3. BIỂU ĐỒ & KHỐI PHÂN TÍCH ĐỒ HỌA ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ 1: Phân bổ theo Phòng khám & Chuyên khoa */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-blue-600" />
              Phân Bổ Lượt Khám Theo Chuyên Khoa & Phòng
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              Tỷ trọng / Tổng lượt
            </span>
          </div>

          <div className="space-y-3.5">
            {stats?.theoPhongKham && stats.theoPhongKham.length > 0 ? (
              stats.theoPhongKham.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-800 font-semibold truncate max-w-[280px]">
                      {item.tenPhong}
                      <span className="ml-1.5 text-[11px] font-normal text-gray-500">
                        ({item.chuyenKhoa})
                      </span>
                    </span>
                    <span className="text-gray-700 font-mono font-bold">
                      {item.soLuot} lượt ({item.tyLe}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-blue-600' :
                        idx === 1 ? 'bg-indigo-500' :
                        idx === 2 ? 'bg-emerald-500' :
                        idx === 3 ? 'bg-amber-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.max(item.tyLe, 2)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">Chưa có dữ liệu phòng khám</p>
            )}
          </div>
        </div>

        {/* Biểu đồ 2: Lưu lượng theo Khung giờ trong ngày (Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Lưu Lượng Bệnh Nhân Theo Khung Giờ (07h - 19h)
            </h3>
            <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Phân luồng đón tiếp
            </span>
          </div>

          {/* Bar chart trực quan dạng cột */}
          <div className="pt-2">
            <div className="grid grid-cols-6 gap-2 h-44 items-end pb-2 border-b border-gray-200">
              {stats?.khungGio && stats.khungGio.map((kg, i) => {
                const heightPct = Math.round((kg.count / maxKhungGio) * 100);
                const isPeak = kg.count === maxKhungGio && kg.count > 0;
                return (
                  <div key={i} className="flex flex-col items-center h-full justify-end group">
                    {/* Tooltip hiển thị số */}
                    <span className={`text-[11px] font-bold font-mono mb-1 transition-all ${
                      isPeak ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {kg.count}
                    </span>
                    {/* Cột bar */}
                    <div
                      className={`w-full max-w-[38px] rounded-t-lg transition-all duration-500 group-hover:opacity-80 ${
                        isPeak
                          ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm'
                          : 'bg-gradient-to-t from-blue-400 to-blue-200'
                      }`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Nhãn khung giờ */}
            <div className="grid grid-cols-6 gap-2 pt-2 text-center">
              {stats?.khungGio && stats.khungGio.map((kg, i) => (
                <div key={i}>
                  <p className="text-[11px] font-bold text-gray-800 truncate">{kg.khung}</p>
                  <p className="text-[10px] text-gray-500 truncate">{kg.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC ĐA TIÊU CHÍ ──────── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên bệnh nhân, số điện thoại, mã bệnh nhân, mã số tiếp đón..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
            />
          </div>

          {/* Lọc phòng khám */}
          <div className="w-full md:w-56">
            <select
              value={selectedPhong}
              onChange={(e) => { setSelectedPhong(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">-- Tất cả phòng khám --</option>
              <option value="1">Phòng 101 - Khám Nội Tổng Quát</option>
              <option value="2">Phòng 102 - Khám Tim Mạch & HA</option>
              <option value="3">Phòng 103 - Khám Nhi Khoa & TMH</option>
              <option value="4">Phòng 201 - Lấy Mẫu Xét Nghiệm</option>
              <option value="5">Phòng 202 - Siêu Âm Màu</option>
              <option value="6">Phòng 203 - Chụp X-Quang KTS</option>
            </select>
          </div>

          {/* Lọc trạng thái */}
          <div className="w-full md:w-44">
            <select
              value={selectedTrangThai}
              onChange={(e) => { setSelectedTrangThai(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">-- Tất cả trạng thái --</option>
              <option value="cho_kham">Chờ khám</option>
              <option value="dang_kham">Đang khám</option>
              <option value="hoan_thanh">Đã hoàn thành</option>
              <option value="da_huy">Đã hủy</option>
            </select>
          </div>

          {/* Lọc loại tiếp nhận */}
          <div className="w-full md:w-44">
            <select
              value={selectedLoai}
              onChange={(e) => { setSelectedLoai(e.target.value); setPage(1); }}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">-- Mọi hình thức --</option>
              <option value="dat_lich">Đặt lịch online</option>
              <option value="vang_lai">Khám vãng lai</option>
            </select>
          </div>
        </div>

        {/* Dòng tóm tắt số kết quả & Reset */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Tìm thấy <strong className="text-gray-900 font-bold">{filteredList.length}</strong> lượt tiếp nhận phù hợp
          </span>
          {(search || selectedPhong !== 'TAT_CA' || selectedTrangThai !== 'TAT_CA' || selectedLoai !== 'TAT_CA') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedPhong('TAT_CA');
                setSelectedTrangThai('TAT_CA');
                setSelectedLoai('TAT_CA');
                setPage(1);
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ─── 5. BẢNG DỮ LIỆU BÁO CÁO CHI TIẾT ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm">Danh Sách Bệnh Nhân Tiếp Đón Chi Tiết</h3>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-semibold">
              {filteredList.length} bản ghi
            </span>
          </div>
          <span className="text-xs text-gray-400">Trang {page} / {totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 w-28">Số TT / Mã</th>
                <th className="py-3 px-4 w-52">Bệnh Nhân</th>
                <th className="py-3 px-4 w-44">Phòng Khám</th>
                <th className="py-3 px-4 w-40">Bác Sĩ Phụ Trách</th>
                <th className="py-3 px-4 w-36">Thời Gian Đến</th>
                <th className="py-3 px-4 w-44">Sinh Hiệu Ban Đầu</th>
                <th className="py-3 px-4 w-32 text-center">Hình Thức</th>
                <th className="py-3 px-4 w-28 text-center">Trạng Thái</th>
                <th className="py-3 px-4 w-16 text-center">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Đang tải danh sách báo cáo tiếp đón...
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-gray-500">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    Không tìm thấy lượt tiếp đón nào khớp với tiêu chí tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center text-xs text-gray-400 font-mono">
                      {(page - 1) * limit + idx + 1}
                    </td>

                    {/* Số TT / Mã */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold font-mono text-sm text-blue-700">
                        {item.maSoThuTu || `A${item.id}`}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {item.benhNhan?.maBenhNhan || 'BN---'}
                      </div>
                    </td>

                    {/* Bệnh nhân */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 text-xs">
                        {item.benhNhan?.hoTen || 'Chưa có tên'}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{item.benhNhan?.gioiTinh === 'nam' ? 'Nam' : item.benhNhan?.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}</span>
                        <span>•</span>
                        <span>{item.benhNhan?.ngaySinh ? item.benhNhan.ngaySinh.slice(0, 4) : '—'}</span>
                        <span>•</span>
                        <span className="font-mono text-gray-600">{item.benhNhan?.soDienThoai || '—'}</span>
                      </div>
                    </td>

                    {/* Phòng khám */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-gray-800">
                        {item.phongKham?.ten_phong || 'Chưa chỉ định phòng'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {item.phongKham?.chuyen_khoa || 'Nội tổng quát'}
                      </div>
                    </td>

                    {/* Bác sĩ */}
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      <div className="font-medium text-gray-800">
                        {item.bacSi?.nhanVien?.hoTen || 'Đang phân công'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {item.bacSi?.chuyenKhoa || ''}
                      </div>
                    </td>

                    {/* Thời gian đến */}
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      <div className="font-medium text-gray-800">
                        {item.thoiGianDen ? formatDateTime(item.thoiGianDen) : '—'}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {item.thoiGianDen ? new Date(item.thoiGianDen).toLocaleTimeString('vi-VN') : ''}
                      </div>
                    </td>

                    {/* Sinh hiệu */}
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      {item.sinhHieu ? (
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div className="text-gray-800 font-medium">
                            HA: <span className="text-blue-700 font-bold">{item.sinhHieu.huyetApTamThu || '—'}/{item.sinhHieu.huyetApTamTruong || '80'}</span> mmHg
                          </div>
                          <div className="text-gray-500">
                            Mạch: <span className="text-emerald-700 font-bold">{item.sinhHieu.nhipTim || '—'}</span> bpm • T°: {item.sinhHieu.nhietDoC ? `${item.sinhHieu.nhietDoC}°C` : '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa đo</span>
                      )}
                    </td>

                    {/* Hình thức */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.lichHenId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <CalendarCheck className="w-3 h-3" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          <Clock className="w-3 h-3 text-gray-500" />
                          Tại quầy
                        </span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderBadgeTrangThai(item.trangThai)}
                    </td>

                    {/* Chi tiết */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Xem chi tiết lượt khám & sinh hiệu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── PHÂN TRANG ─────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Hiển thị từ <strong className="font-semibold text-gray-700">{(page - 1) * limit + 1}</strong> đến{' '}
              <strong className="font-semibold text-gray-700">{Math.min(page * limit, filteredList.length)}</strong> trên{' '}
              <strong className="font-semibold text-gray-700">{filteredList.length}</strong> kết quả
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 6. MODAL XEM CHI TIẾT SINH HIỆU & TIẾP ĐÓN ─────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
                  CHI TIẾT LƯỢT TIẾP ĐÓN #{selectedItem.maSoThuTu || selectedItem.id}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {selectedItem.benhNhan?.hoTen || 'Bệnh nhân'}
                </h3>
              </div>
              <div>{renderBadgeTrangThai(selectedItem.trangThai)}</div>
            </div>

            {/* Thông tin bệnh nhân & phòng khám */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200/70 text-xs">
              <div>
                <p className="text-gray-500">Mã bệnh nhân</p>
                <p className="font-bold text-gray-900 mt-0.5 font-mono">{selectedItem.benhNhan?.maBenhNhan || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Số điện thoại</p>
                <p className="font-semibold text-gray-900 mt-0.5 font-mono">{selectedItem.benhNhan?.soDienThoai || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phòng khám điều phối</p>
                <p className="font-semibold text-blue-700 mt-0.5">{selectedItem.phongKham?.ten_phong || 'Chưa chỉ định'}</p>
              </div>
              <div>
                <p className="text-gray-500">Bác sĩ phụ trách</p>
                <p className="font-semibold text-gray-900 mt-0.5">{selectedItem.bacSi?.nhanVien?.hoTen || 'Chưa chỉ định'}</p>
              </div>
              <div>
                <p className="text-gray-500">Thời gian đến</p>
                <p className="font-medium text-gray-800 mt-0.5 font-mono">
                  {selectedItem.thoiGianDen ? new Date(selectedItem.thoiGianDen).toLocaleString('vi-VN') : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Hình thức đăng ký</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {selectedItem.lichHenId ? 'Đặt lịch hẹn trực tuyến' : 'Khám vãng lai tại quầy'}
                </p>
              </div>
            </div>

            {/* Thông số sinh hiệu */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" /> Chỉ Số Sinh Hiệu Ban Đầu
              </p>
              {selectedItem.sinhHieu ? (
                <div className="grid grid-cols-3 gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Huyết Áp</p>
                    <p className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                      {selectedItem.sinhHieu.huyetApTamThu || '—'}/{selectedItem.sinhHieu.huyetApTamTruong || '80'}
                    </p>
                    <span className="text-[10px] text-gray-400">mmHg</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Nhịp Tim / Mạch</p>
                    <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                      {selectedItem.sinhHieu.nhipTim || '—'}
                    </p>
                    <span className="text-[10px] text-gray-400">lần/phút</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Thân Nhiệt</p>
                    <p className="text-sm font-bold text-amber-600 font-mono mt-0.5">
                      {selectedItem.sinhHieu.nhietDoC ? `${selectedItem.sinhHieu.nhietDoC}°C` : '—'}
                    </p>
                    <span className="text-[10px] text-gray-400">Độ C</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">SpO2</p>
                    <p className="text-sm font-bold text-cyan-600 font-mono mt-0.5">
                      {selectedItem.sinhHieu.spo2 ? `${selectedItem.sinhHieu.spo2}%` : '—'}
                    </p>
                    <span className="text-[10px] text-gray-400">Oxy máu</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Chiều Cao</p>
                    <p className="text-sm font-bold text-gray-800 font-mono mt-0.5">
                      {selectedItem.sinhHieu.chieuCaoCm ? `${selectedItem.sinhHieu.chieuCaoCm} cm` : '—'}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 text-center">
                    <p className="text-[11px] text-gray-500">Cân Nặng</p>
                    <p className="text-sm font-bold text-gray-800 font-mono mt-0.5">
                      {selectedItem.sinhHieu.canNangKg ? `${selectedItem.sinhHieu.canNangKg} kg` : '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400">
                  Lượt khám này chưa ghi nhận số liệu sinh hiệu ban đầu.
                </div>
              )}
            </div>

            {/* Dị ứng & tiền sử nếu có */}
            {(selectedItem.benhNhan?.diUng || selectedItem.benhNhan?.tienSuBenh) && (
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                {selectedItem.benhNhan?.diUng && (
                  <p className="text-amber-900 font-medium">
                    ⚠️ <strong>Dị ứng:</strong> {selectedItem.benhNhan.diUng}
                  </p>
                )}
                {selectedItem.benhNhan?.tienSuBenh && (
                  <p className="text-amber-800">
                    📋 <strong>Tiền sử bệnh:</strong> {selectedItem.benhNhan.tienSuBenh}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
