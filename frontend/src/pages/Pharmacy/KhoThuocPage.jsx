import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Pill,
  Package,
  Layers,
  X,
  Sparkles,
  Filter,
  Check,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { apiGet, apiDel } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import AddEditThuocModal from './AddEditThuocModal';

export default function KhoThuocPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingThuoc, setEditingThuoc] = useState(null);

  // Bộ lọc đơn giản
  const [filterStockStatus, setFilterStockStatus] = useState('all'); // 'all' | 'san_sang' | 'sap_het' | 'het_hang' | 'ngung_kd'
  const [filterDuongDung, setFilterDuongDung] = useState('all');
  const [filterDonViTinh, setFilterDonViTinh] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    setLoading(true);
    try {
      const res = await apiGet('/nha-thuoc/thuoc');
      if (res.data) setList(res.data);
    } catch (err) {
      console.error('Lỗi tải danh mục thuốc:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (id, tenThuoc) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${tenThuoc}" khỏi danh mục kho?`)) return;
    try {
      const res = await apiDel(`/nha-thuoc/thuoc/${id}`);
      alert(res?.message || 'Xóa thuốc thành công!');
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Không thể xóa thuốc này do đã phát sinh giao dịch.');
    }
  };

  // Danh sách đường dùng & ĐVT duy nhất từ dữ liệu thực tế
  const duongDungList = useMemo(() => {
    const set = new Set();
    list.forEach((item) => {
      if (item.duongDung) set.add(item.duongDung);
    });
    return Array.from(set);
  }, [list]);

  const donViTinhList = useMemo(() => {
    const set = new Set();
    list.forEach((item) => {
      if (item.donViTinh) set.add(item.donViTinh);
    });
    return Array.from(set);
  }, [list]);

  // Bộ lọc dữ liệu
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      // 1. Trạng thái tồn kho
      const stock = Number(item.tonKhoTong) || 0;
      const isStopped = item.trangThai === 'ngung_kinh_doanh';

      if (filterStockStatus === 'san_sang') {
        if (isStopped || stock <= 20) return false;
      } else if (filterStockStatus === 'sap_het') {
        if (isStopped || stock <= 0 || stock > 20) return false;
      } else if (filterStockStatus === 'het_hang') {
        if (isStopped || stock > 0) return false;
      } else if (filterStockStatus === 'ngung_kd') {
        if (!isStopped) return false;
      }

      // 2. Đường dùng
      if (filterDuongDung !== 'all' && item.duongDung !== filterDuongDung) {
        return false;
      }

      // 3. Đơn vị tính
      if (filterDonViTinh !== 'all' && item.donViTinh !== filterDonViTinh) {
        return false;
      }

      // 4. Tìm kiếm từ khóa
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchName = item.tenThuoc?.toLowerCase().includes(term);
        const matchCode = item.maThuoc?.toLowerCase().includes(term);
        const matchActive = item.tenHoatChat?.toLowerCase().includes(term);
        const matchBatch = item.maLo?.toLowerCase().includes(term);
        const matchRoute = item.duongDung?.toLowerCase().includes(term);
        const matchStrength = item.hamLuong?.toLowerCase().includes(term);

        if (!matchName && !matchCode && !matchActive && !matchBatch && !matchRoute && !matchStrength) {
          return false;
        }
      }

      return true;
    });
  }, [list, filterStockStatus, filterDuongDung, filterDonViTinh, searchTerm]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = list.length;
    let ready = 0;
    let low = 0;
    let outOfStock = 0;
    let stopped = 0;

    list.forEach((i) => {
      const s = Number(i.tonKhoTong) || 0;
      if (i.trangThai === 'ngung_kinh_doanh') {
        stopped++;
      } else if (s <= 0) {
        outOfStock++;
      } else if (s <= 20) {
        low++;
      } else {
        ready++;
      }
    });

    return { total, ready, low, outOfStock, stopped };
  }, [list]);

  const hasActiveFilters =
    filterStockStatus !== 'all' ||
    filterDuongDung !== 'all' ||
    filterDonViTinh !== 'all' ||
    Boolean(searchTerm.trim());

  const handleResetFilters = () => {
    setFilterStockStatus('all');
    setFilterDuongDung('all');
    setFilterDonViTinh('all');
    setSearchTerm('');
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-primary-600" />
              Danh Mục Thuốc & Tồn Kho
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Quản lý Dược & Theo dõi FEFO
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tra cứu thông tin thuốc, số lượng tồn kho khả dụng, hạn sử dụng và cảnh báo hết hàng tức thì.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-primary-600' : ''}`} />
            <span>Tải lại</span>
          </button>

          <button
            onClick={() => {
              setEditingThuoc(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-primary-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm thuốc mới</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Stat Cards Tương Tác & Lọc Nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Tổng danh mục */}
        <button
          onClick={() => setFilterStockStatus('all')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStockStatus === 'all'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng loại thuốc
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Pill className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2">{stats.total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Danh mục đang lưu trữ</p>
        </button>

        {/* Sẵn sàng / Còn hàng */}
        <button
          onClick={() => setFilterStockStatus('san_sang')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStockStatus === 'san_sang'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Sẵn sàng cấp
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{stats.ready}</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Tồn kho dồi dào (&gt;20)</p>
        </button>

        {/* Sắp hết hàng */}
        <button
          onClick={() => setFilterStockStatus('sap_het')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStockStatus === 'sap_het'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Sắp hết hàng
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">{stats.low}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">Cần dự trù nhập kho (≤20)</p>
        </button>

        {/* Hết hàng */}
        <button
          onClick={() => setFilterStockStatus('het_hang')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStockStatus === 'het_hang'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Hết hàng
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 mt-2">{stats.outOfStock}</p>
          <p className="text-[11px] text-rose-700 font-medium mt-0.5">Số lượng tồn = 0</p>
        </button>
      </div>

      {/* 3. Bộ Lọc Đơn Giản & Tinh Gọn */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        {/* Hàng 1: Tabs Trạng thái Tồn kho + Ô Tìm Kiếm */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Tabs tồn kho */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-medium mr-1">Tồn kho:</span>
            {[
              { key: 'all', label: 'Tất cả', count: stats.total },
              { key: 'san_sang', label: 'Sẵn sàng', count: stats.ready, isSuccess: true },
              { key: 'sap_het', label: 'Sắp hết', count: stats.low, isWarning: true },
              { key: 'het_hang', label: 'Hết hàng', count: stats.outOfStock, isDanger: true },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStockStatus(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStockStatus === tab.key
                    ? tab.isSuccess
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : tab.isWarning
                      ? 'bg-amber-600 text-white shadow-xs'
                      : tab.isDanger
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-primary-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterStockStatus === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên thuốc, hoạt chất, mã thuốc, mã lô..."
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Bộ lọc phụ (Đường dùng + Đơn vị tính + Nút reset) */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Lọc Đường dùng */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium">Đường dùng:</span>
              <select
                value={filterDuongDung}
                onChange={(e) => setFilterDuongDung(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
              >
                <option value="all">Tất cả đường dùng</option>
                {duongDungList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc Đơn vị tính */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium">Đơn vị tính:</span>
              <select
                value={filterDonViTinh}
                onChange={(e) => setFilterDonViTinh(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
              >
                <option value="all">Tất cả ĐVT</option>
                {donViTinhList.map((dvt) => (
                  <option key={dvt} value={dvt}>
                    {dvt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nút Xóa lọc nếu có active filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer ml-auto"
            >
              <X className="h-3.5 w-3.5" />
              <span>Đặt lại lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Table Section Gọn Gàng & Đẹp Mắt */}
      <div className="rounded-2xl bg-white shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              Danh sách thuốc ({filteredList.length})
            </span>
            {hasActiveFilters && (
              <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200">
                Đang lọc {filteredList.length} / {list.length} loại
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary-600 border-t-transparent mx-auto" />
            <p className="text-xs font-medium text-gray-500">Đang tải dữ liệu kho thuốc...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Không tìm thấy loại thuốc nào</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasActiveFilters
                  ? 'Thử thay đổi từ khóa hoặc đặt lại bộ lọc để tìm kiếm.'
                  : 'Chưa có thuốc nào trong danh mục kho.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Xóa bộ lọc & Tải lại
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3.5 px-4">Mã Thuốc</th>
                  <th className="py-3.5 px-4">Tên Thuốc / Hoạt Chất</th>
                  <th className="py-3.5 px-4 text-center">ĐVT</th>
                  <th className="py-3.5 px-4">Mã Lô & Hạn Dùng</th>
                  <th className="py-3.5 px-4">Đường Dùng & Hàm Lượng</th>
                  <th className="py-3.5 px-4 text-right">Đơn Giá Bán</th>
                  <th className="py-3.5 px-4 text-center">Tồn Kho</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredList.map((t) => {
                  const stock = Number(t.tonKhoTong) || 0;
                  const isStopped = t.trangThai === 'ngung_kinh_doanh';
                  const isOutOfStock = !isStopped && stock <= 0;
                  const isLow = !isStopped && stock > 0 && stock <= 20;
                  const isReady = !isStopped && stock > 20;

                  return (
                    <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* 1. Mã thuốc */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary-700">
                        <span className="bg-primary-50/80 border border-primary-200/60 px-2 py-1 rounded-lg">
                          {t.maThuoc}
                        </span>
                      </td>

                      {/* 2. Tên thuốc / Hoạt chất */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 text-xs">{t.tenThuoc}</p>
                        {t.tenHoatChat ? (
                          <p className="text-[11px] text-gray-400 mt-0.5">{t.tenHoatChat}</p>
                        ) : (
                          <p className="text-[11px] text-gray-300 italic">Chưa cập nhật hoạt chất</p>
                        )}
                      </td>

                      {/* 3. ĐVT */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          {t.donViTinh || 'Viên'}
                        </span>
                      </td>

                      {/* 4. Mã lô & Hạn dùng */}
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-mono font-bold text-primary-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/60">
                          {t.maLo || 'LÔ-CHUNG'}
                        </span>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-rose-500 shrink-0" />
                          <span>HSD:</span>
                          <span className="font-semibold text-gray-800">
                            {t.ngayHetHan
                              ? String(t.ngayHetHan).slice(0, 10).split('-').reverse().join('/')
                              : '---'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Đường dùng / Hàm lượng */}
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-gray-800">{t.duongDung || 'Uống'}</span>
                        {t.hamLuong && (
                          <span className="text-gray-400 block text-[10px] mt-0.5">
                            {t.hamLuong}
                          </span>
                        )}
                      </td>

                      {/* 6. Đơn giá bán */}
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                        {formatCurrency(t.giaBan)}
                      </td>

                      {/* 7. Tồn kho */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-extrabold text-sm ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {stock.toLocaleString()}
                        </span>
                      </td>

                      {/* 8. Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        {isStopped ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600 border border-gray-200">
                            Ngừng KD
                          </span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 border border-rose-200">
                            <AlertCircle className="h-3 w-3" /> Hết hàng
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-200">
                            <AlertTriangle className="h-3 w-3" /> Sắp hết
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Sẵn sàng
                          </span>
                        )}
                      </td>

                      {/* 9. Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingThuoc(t);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin & hạn dùng"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.tenThuoc)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa thuốc khỏi kho"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal Thêm / Chỉnh sửa Thuốc */}
      {isModalOpen && (
        <AddEditThuocModal
          thuoc={editingThuoc}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

