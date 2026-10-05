import { useState, useEffect, useMemo } from 'react';
import {
  FileText, RefreshCw, Search, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiGet } from '../../services/api';

export default function NhatKyHeThongPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loaiNhatKy, setLoaiNhatKy] = useState('TAT_CA');
  const [hanhDong, setHanhDong] = useState('TAT_CA');
  const [timeRange, setTimeRange] = useState('TAT_CA');

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 15;

  const fetchData = async () => {
    setLoading(true);
    try {
      let params = `?page=1&limit=100`;
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

  // Client search filter
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const kw = search.trim().toLowerCase();
    return logs.filter(item =>
      (item.nhanVien && item.nhanVien.toLowerCase().includes(kw)) ||
      (item.email && item.email.toLowerCase().includes(kw)) ||
      (item.chucNang && item.chucNang.toLowerCase().includes(kw)) ||
      (item.thaoTac && item.thaoTac.toLowerCase().includes(kw)) ||
      (item.noiDung && item.noiDung.toLowerCase().includes(kw)) ||
      (item.tenNguoiDung && item.tenNguoiDung.toLowerCase().includes(kw)) ||
      (item.moTa && item.moTa.toLowerCase().includes(kw))
    );
  }, [logs, search]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / limit) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLogs.slice(start, start + limit);
  }, [filteredLogs, page, limit]);

  // Xuất file CSV
  const handleExportCSV = () => {
    const headers = ['Nhân viên', 'Email', 'Chức năng', 'Thao tác', 'Thời gian', 'Rủi ro', 'Kết quả', 'Nội dung'];
    const rows = filteredLogs.map(item => [
      `"${item.nhanVien || item.tenNguoiDung || ''}"`,
      `"${item.email || ''}"`,
      `"${item.chucNang || ''}"`,
      `"${item.thaoTac || ''}"`,
      `"${formatThoiGian(item.thoiGian)}"`,
      `"${item.ruiRo || ''}"`,
      `"${item.ketQua || ''}"`,
      `"${(item.noiDung || item.moTa || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    link.download = `nhat_ky_he_thong_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Format thời gian dd/MM/yyyy HH:mm
  const formatThoiGian = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  // Badge rủi ro
  const renderRuiRo = (ruiRo) => {
    if (!ruiRo) return <span className="text-gray-400">—</span>;
    const lower = ruiRo.toLowerCase();
    if (lower.includes('nghiêm trọng') || lower.includes('cao')) {
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">{ruiRo}</span>;
    }
    if (lower.includes('cảnh báo') || lower.includes('trung bình')) {
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">{ruiRo}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{ruiRo}</span>;
  };

  // Badge kết quả
  const renderKetQua = (ketQua) => {
    if (!ketQua) return <span className="text-gray-400">—</span>;
    const lower = ketQua.toLowerCase();
    if (lower.includes('thất bại') || lower.includes('lỗi')) {
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">{ketQua}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{ketQua}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* ─── HEADER + FILTERS ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo nhân viên, tính năng, nội dung..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Xuất file
          </button>
          <button
            onClick={() => { setPage(1); fetchData(); }}
            disabled={loading}
            className="p-2 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all disabled:opacity-60"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── BỘ LỌC ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Filter Mức độ */}
        <select
          value={loaiNhatKy}
          onChange={(e) => { setLoaiNhatKy(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="TAT_CA">-- Tất cả mức độ --</option>
          <option value="INFO">ℹ️ INFO (Thông tin)</option>
          <option value="SECURITY">🔒 SECURITY (Bảo mật)</option>
          <option value="WARNING">⚠️ WARNING (Cảnh báo)</option>
          <option value="ERROR">❌ ERROR (Lỗi hệ thống)</option>
        </select>

        {/* Filter Thời gian */}
        <select
          value={timeRange}
          onChange={(e) => { setTimeRange(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="TAT_CA">-- Mọi thời gian --</option>
          <option value="HOM_NAY">Hôm nay</option>
          <option value="7_NGAY">7 ngày qua</option>
          <option value="30_NGAY">30 ngày qua</option>
        </select>

        {/* Filter Hành động */}
        <select
          value={hanhDong}
          onChange={(e) => { setHanhDong(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

        {/* Xóa bộ lọc */}
        {(search || loaiNhatKy !== 'TAT_CA' || hanhDong !== 'TAT_CA' || timeRange !== 'TAT_CA') && (
          <button
            onClick={() => {
              setSearch('');
              setLoaiNhatKy('TAT_CA');
              setHanhDong('TAT_CA');
              setTimeRange('TAT_CA');
              setPage(1);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* ─── BẢNG NHẬT KÝ ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Nhân Viên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Chức Năng</th>
                <th className="py-3 px-4">Thao Tác</th>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Rủi Ro</th>
                <th className="py-3 px-4">Kết Quả</th>
                <th className="py-3 px-4">Nội Dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Đang tải nhật ký...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    Không tìm thấy nhật ký nào.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.nhanVien || item.tenNguoiDung || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {item.email || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                      {item.chucNang || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {item.thaoTac || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatThoiGian(item.thoiGian)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderRuiRo(item.ruiRo)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderKetQua(item.ketQua)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={item.noiDung || item.moTa || ''}>
                      {item.noiDung || item.moTa || '—'}
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
    </div>
  );
}
