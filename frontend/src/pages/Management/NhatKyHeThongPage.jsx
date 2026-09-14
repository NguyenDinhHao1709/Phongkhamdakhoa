import { useState, useEffect, useMemo } from 'react';
import {
  FileText, ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw,
  Search, Download, Calendar, Filter, User, Shield, Server,
  Lock, Clock, ChevronLeft, ChevronRight, Eye, Info
} from 'lucide-react';
import { apiGet } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';

export default function NhatKyHeThongPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    todayLogs: 0,
    securityLogs: 0,
    errorLogs: 0,
    warningLogs: 0,
    infoLogs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loaiNhatKy, setLoaiNhatKy] = useState('TAT_CA');
  const [hanhDong, setHanhDong] = useState('TAT_CA');
  const [timeRange, setTimeRange] = useState('TAT_CA');
  const [selectedLog, setSelectedLog] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get stats
      const statsRes = await apiGet('/quan-ly/nhat-ky/thong-ke');
      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      // 2. Build params
      let params = `?page=1&limit=100`; // lấy tối đa 100 log để lọc và phân trang mượt
      if (loaiNhatKy !== 'TAT_CA') params += `&loaiNhatKy=${loaiNhatKy}`;
      if (hanhDong !== 'TAT_CA') params += `&hanhDong=${hanhDong}`;
      if (search.trim()) params += `&search=${encodeURIComponent(search.trim())}`;

      if (timeRange === 'HOM_NAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        params += `&tuNgay=${todayStr}`;
      } else if (timeRange === '7_NGAY') {
        const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        params += `&tuNgay=${d.toISOString().slice(0, 10)}`;
      } else if (timeRange === '30_NGAY') {
        const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        params += `&tuNgay=${d.toISOString().slice(0, 10)}`;
      }

      const logsRes = await apiGet(`/quan-ly/nhat-ky${params}`);
      const items = Array.isArray(logsRes?.data) ? logsRes.data : (logsRes?.data?.items || []);
      setLogs(items);
    } catch (err) {
      console.error('Lỗi khi tải nhật ký hệ thống:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [loaiNhatKy, hanhDong, timeRange]);

  // Client search filter refinement
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const kw = search.trim().toLowerCase();
    return logs.filter(item =>
      (item.tenNguoiDung && item.tenNguoiDung.toLowerCase().includes(kw)) ||
      (item.moTa && item.moTa.toLowerCase().includes(kw)) ||
      (item.hanhDong && item.hanhDong.toLowerCase().includes(kw)) ||
      (item.diaChiIp && item.diaChiIp.toLowerCase().includes(kw)) ||
      (item.vaiTro && item.vaiTro.toLowerCase().includes(kw))
    );
  }, [logs, search]);

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / limit) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLogs.slice(start, start + limit);
  }, [filteredLogs, page, limit]);

  // Xuất file JSON
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredLogs, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = jsonString;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    downloadAnchor.download = `audit_logs_${timestamp}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Xuất file CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Thời gian', 'Tài khoản', 'Vai trò', 'Hành động', 'Mức độ', 'Mô tả', 'Địa chỉ IP'];
    const rows = filteredLogs.map(item => [
      item.id,
      new Date(item.thoiGian).toLocaleString('vi-VN'),
      `"${item.tenNguoiDung || ''}"`,
      `"${item.vaiTro || ''}"`,
      `"${item.hanhDong || ''}"`,
      `"${item.loaiNhatKy || ''}"`,
      `"${(item.moTa || '').replace(/"/g, '""')}"`,
      `"${item.diaChiIp || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    link.download = `audit_logs_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Helper Badge mức độ
  const renderBadgeLoai = (loai) => {
    switch (loai) {
      case 'SECURITY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Lock className="w-3 h-3 text-purple-600" />
            SECURITY
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <ShieldAlert className="w-3 h-3 text-red-600" />
            ERROR
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3 text-blue-600" />
            INFO
          </span>
        );
    }
  };

  // Helper vai trò
  const renderVaiTroBadge = (vaiTro) => {
    const map = {
      quan_tri_vien: { text: 'Admin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      quan_tri_vien_cap_cao: { text: 'Super Admin', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      ban_giam_doc: { text: 'Giám Đốc', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      bac_si: { text: 'Bác Sĩ', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      tiep_tan: { text: 'Tiếp Tân', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      ky_thuat_vien: { text: 'KTV', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      nhan_vien_nha_thuoc: { text: 'Dược Sĩ', color: 'bg-teal-50 text-teal-700 border-teal-200' },
      thu_ngan: { text: 'Thu Ngân', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      he_thong: { text: 'Hệ Thống', color: 'bg-gray-100 text-gray-700 border-gray-300' },
      khach: { text: 'Khách', color: 'bg-gray-50 text-gray-500 border-gray-200' },
    };
    const item = map[vaiTro] || { text: vaiTro, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${item.color}`}>
        {item.text}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              AUDIT & SECURITY LOGS
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Cập nhật thời gian thực
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Nhật Ký Hoạt Động & Kiểm Toán Hệ Thống
          </h1>
          <p className="text-sm text-gray-500">
            Giám sát toàn diện các hành động người dùng, cảnh báo an toàn thông tin và truy vết sự kiện phòng khám.
          </p>
        </div>

        {/* Buttons Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setPage(1); fetchData(); }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Xuất file CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Xuất JSON
          </button>
        </div>
      </div>

      {/* ─── 4 THẺ THỐNG KÊ KPI ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng sự kiện */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Tổng Sự Kiện</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.totalLogs}</p>
            <p className="text-xs text-gray-500 mt-0.5">Bản ghi lưu trữ trong CSDL</p>
          </div>
        </div>

        {/* Card 2: Sự kiện hôm nay */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Sự Kiện Hôm Nay</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.todayLogs}</p>
            <p className="text-xs text-gray-500 mt-0.5">Các thao tác trong 24h qua</p>
          </div>
        </div>

        {/* Card 3: Cảnh báo bảo mật */}
        <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm flex items-center gap-4 bg-gradient-to-br from-white to-purple-50/40">
          <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-purple-700 tracking-wider">An Ninh & Bảo Mật</p>
            <p className="text-2xl font-bold text-purple-700 mt-0.5">{stats.securityLogs}</p>
            <p className="text-xs text-purple-600 mt-0.5">Đăng nhập, đổi mật khẩu, IP lạ</p>
          </div>
        </div>

        {/* Card 4: Lỗi & Cảnh báo */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Lỗi & Cảnh Báo</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-red-600">{stats.errorLogs}</span>
              <span className="text-sm font-semibold text-amber-600">/ {stats.warningLogs} warn</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Sự cố gateway, timeout kết nối</p>
          </div>
        </div>
      </div>

      {/* ─── BỘ LỌC TÌM KIẾM ────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên người dùng, nội dung mô tả, hành động, địa chỉ IP..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
            />
          </div>

          {/* Filter Mức độ */}
          <div className="w-full md:w-44">
            <select
              value={loaiNhatKy}
              onChange={(e) => { setLoaiNhatKy(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">-- Tất cả mức độ --</option>
              <option value="INFO">ℹ️ INFO (Thông tin)</option>
              <option value="SECURITY">🔒 SECURITY (Bảo mật)</option>
              <option value="WARNING">⚠️ WARNING (Cảnh báo)</option>
              <option value="ERROR">❌ ERROR (Lỗi hệ thống)</option>
            </select>
          </div>

          {/* Filter Thời gian */}
          <div className="w-full md:w-40">
            <select
              value={timeRange}
              onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">-- Mọi thời gian --</option>
              <option value="HOM_NAY">Hôm nay</option>
              <option value="7_NGAY">7 ngày qua</option>
              <option value="30_NGAY">30 ngày qua</option>
            </select>
          </div>

          {/* Filter Hành động */}
          <div className="w-full md:w-48">
            <select
              value={hanhDong}
              onChange={(e) => { setHanhDong(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TAT_CA">-- Mọi loại hành động --</option>
              <option value="DANG_NHAP_THANH_CONG">Đăng nhập thành công</option>
              <option value="DANG_NHAP_THAT_BAI">Đăng nhập thất bại</option>
              <option value="DAT_LAI_MAT_KHAU">Đặt lại mật khẩu</option>
              <option value="KHOA_TAI_KHOAN">Khóa tài khoản</option>
              <option value="CAP_NHAT_PHAN_QUYEN">Cập nhật phân quyền</option>
              <option value="SAO_LUU_CSDL">Sao lưu CSDL</option>
              <option value="PHE_DUYET_DON">Phê duyệt đơn</option>
              <option value="PHAN_CA_LAM_VIEC">Phân ca làm việc</option>
              <option value="TIEP_NHAN_BENH_NHAN">Tiếp nhận bệnh nhân</option>
            </select>
          </div>
        </div>

        {/* Status text count */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Tìm thấy <strong className="text-gray-900 font-semibold">{filteredLogs.length}</strong> sự kiện nhật ký phù hợp
          </span>
          {(search || loaiNhatKy !== 'TAT_CA' || hanhDong !== 'TAT_CA' || timeRange !== 'TAT_CA') && (
            <button
              onClick={() => {
                setSearch('');
                setLoaiNhatKy('TAT_CA');
                setHanhDong('TAT_CA');
                setTimeRange('TAT_CA');
                setPage(1);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ─── BẢNG NHẬT KÝ CHI TIẾT ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-40">Thời Gian</th>
                <th className="py-3 px-4 w-44">Người Thực Hiện</th>
                <th className="py-3 px-4 w-44">Hành Động</th>
                <th className="py-3 px-4">Mô Tả Chi Tiết</th>
                <th className="py-3 px-4 w-28 text-center">Mức Độ</th>
                <th className="py-3 px-4 w-32">Địa Chỉ IP</th>
                <th className="py-3 px-4 w-16 text-center">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Đang tải nhật ký kiểm toán hệ thống...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    Không tìm thấy sự kiện nhật ký nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center text-xs text-gray-400 font-mono">
                      {(page - 1) * limit + idx + 1}
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {formatDateTime(item.thoiGian)}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(item.thoiGian).toLocaleTimeString('vi-VN')}
                      </div>
                    </td>

                    {/* Người thực hiện */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.tenNguoiDung ? item.tenNguoiDung.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 text-xs">
                            {item.tenNguoiDung}
                          </div>
                          <div>{renderVaiTroBadge(item.vaiTro)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Hành động */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                        {item.hanhDong}
                      </span>
                    </td>

                    {/* Mô tả */}
                    <td className="py-3.5 px-4 text-xs text-gray-700 leading-relaxed">
                      {item.moTa}
                    </td>

                    {/* Mức độ */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderBadgeLoai(item.loaiNhatKy)}
                    </td>

                    {/* Địa chỉ IP */}
                    <td className="py-3.5 px-4 text-xs text-gray-600 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-gray-400" />
                        {item.diaChiIp || '127.0.0.1'}
                      </div>
                    </td>

                    {/* Action xem chi tiết */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(item)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Xem chi tiết sự kiện"
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

        {/* ─── PHÂN TRANG ────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Hiển thị từ <strong className="font-semibold text-gray-700">{(page - 1) * limit + 1}</strong> đến{' '}
              <strong className="font-semibold text-gray-700">{Math.min(page * limit, filteredLogs.length)}</strong> trên{' '}
              <strong className="font-semibold text-gray-700">{filteredLogs.length}</strong> kết quả
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

      {/* ─── MODAL CHI TIẾT SỰ KIỆN ─────────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
                  CHI TIẾT NHẬT KÝ #{selectedLog.id}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {selectedLog.hanhDong}
                </h3>
              </div>
              <div>{renderBadgeLoai(selectedLog.loaiNhatKy)}</div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200/70">
                <div>
                  <p className="text-xs text-gray-500">Người thực hiện</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selectedLog.tenNguoiDung}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vai trò</p>
                  <div className="mt-0.5">{renderVaiTroBadge(selectedLog.vaiTro)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Thời gian ghi nhận</p>
                  <p className="font-medium text-gray-800 mt-0.5 font-mono text-xs">
                    {new Date(selectedLog.thoiGian).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Địa chỉ IP</p>
                  <p className="font-medium text-gray-800 mt-0.5 font-mono text-xs">
                    {selectedLog.diaChiIp || '127.0.0.1'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-medium">Nội dung chi tiết sự kiện</p>
                <div className="mt-1 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 text-xs leading-relaxed">
                  {selectedLog.moTa}
                </div>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">User Agent / Trình duyệt</p>
                  <p className="mt-1 text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded border border-gray-200 truncate">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

