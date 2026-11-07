import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  DollarSign, Search, Filter, Plus, Edit3, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, Layers, Stethoscope, FlaskConical,
  Activity, HelpCircle, X, ShieldAlert, TrendingUp, Tag, FileText, Check,
  CreditCard, Calendar, Clock, ShieldCheck, Settings2, Info,
  Building2, Video, Download
} from 'lucide-react';
import api from '../../services/api';

const LOAI_OPTIONS = [
  { value: 'tat_ca', label: 'Tất cả danh mục' },
  { value: 'kham_benh', label: 'Khám bệnh lâm sàng' },
  { value: 'xet_nghiem', label: 'Xét nghiệm sinh hóa & huyết học' },
  { value: 'cdha', label: 'Chẩn đoán hình ảnh (CĐHA)' },
  { value: 'khac', label: 'Thủ thuật & Khác' },
];

const LOAI_BADGE = {
  kham_benh: { label: 'Khám bệnh', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  xet_nghiem: { label: 'Xét nghiệm', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cdha: { label: 'CĐHA & Siêu âm', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  khac: { label: 'Thủ thuật/Khác', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export default function QuanLyBangGiaDichVuPage() {
  const [activeTab, setActiveTab] = useState('dich_vu'); // 'dich_vu' | 'tien_coc'

  // Service State
  const [dichVuList, setDichVuList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filter & Search for Services
  const [filterLoai, setFilterLoai] = useState('tat_ca');
  const [filterTrangThai, setFilterTrangThai] = useState('tat_ca');
  const [searchTerm, setSearchTerm] = useState('');

  // Service Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    maDichVu: '',
    tenDichVu: '',
    loai: 'kham_benh',
    gia: '',
    donViKetQua: 'Lượt',
    giaTriBinhThuong: 'Bình thường',
    boPhanThucHien: '',
    mauBenhPham: '',
    moTa: '',
    trangThai: 'hoat_dong',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  // Deposit Configuration State
  const [cauHinhTienCoc, setCauHinhTienCoc] = useState([]);
  const [loadingCoc, setLoadingCoc] = useState(false);
  const [modalCocOpen, setModalCocOpen] = useState(false);
  const [editingCoc, setEditingCoc] = useState(null);
  const [cocFormData, setCocFormData] = useState({
    tenHinhThuc: '',
    phiKhamMacDinh: 200000,
    phanTramCoc: 20,
    soTienCoc: 40000,
    thoiGianHuyHoanCocGio: 2,
    phanTramHoanCoc: 100,
    choPhepDatTruocNgayMin: 1,
    choPhepDatTruocNgayMax: 30,
    apDungTuDong: true,
    moTa: '',
    ghiChuHoanCoc: '',
  });

  // Hiển thị thông báo Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load danh sách dịch vụ & thống kê
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/quan-ly/dich-vu-kham-chua-benh', {
        params: {
          loai: filterLoai,
          trangThai: filterTrangThai,
          tuKhoa: searchTerm,
        },
      });
      const resData = res?.data || res;
      if (resData?.success) {
        setDichVuList(Array.isArray(resData.data) ? resData.data : []);
        setStats(resData.stats || null);
      } else if (Array.isArray(resData)) {
        setDichVuList(resData);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục bảng giá dịch vụ:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách dịch vụ khám chữa bệnh');
    } finally {
      setLoading(false);
    }
  };

  // Load cấu hình tiền cọc
  const fetchCauHinhTienCoc = async () => {
    setLoadingCoc(true);
    try {
      const res = await api.get('/quan-ly/cau-hinh-tien-coc');
      const resData = res?.data || res;
      const items = resData?.data || (Array.isArray(resData) ? resData : []);
      setCauHinhTienCoc(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Lỗi tải cấu hình tiền cọc:', err);
    } finally {
      setLoadingCoc(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCauHinhTienCoc();
  }, [filterLoai, filterTrangThai]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Format tiền tệ VNĐ
  const formatVND = (val) => {
    return new Intl.NumberFormat('vi-VN').format(Number(val) || 0) + ' đ';
  };

  // Xử lý mở Modal thêm / sửa dịch vụ
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      maDichVu: '',
      tenDichVu: '',
      loai: 'kham_benh',
      gia: '',
      donViKetQua: 'Lượt',
      giaTriBinhThuong: 'Bình thường',
      boPhanThucHien: 'Phòng khám chuyên khoa',
      mauBenhPham: '',
      moTa: '',
      trangThai: 'hoat_dong',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      maDichVu: item.maDichVu || '',
      tenDichVu: item.tenDichVu || '',
      loai: item.loai || 'kham_benh',
      gia: item.gia || '',
      donViKetQua: item.donViKetQua || '',
      giaTriBinhThuong: item.giaTriBinhThuong || '',
      boPhanThucHien: item.boPhanThucHien || '',
      mauBenhPham: item.mauBenhPham || '',
      moTa: item.moTa || '',
      trangThai: item.trangThai || 'hoat_dong',
    });
    setModalOpen(true);
  };

  // Submit Form Lưu / Cập nhật Dịch vụ
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.maDichVu.trim() || !formData.tenDichVu.trim() || formData.gia === '') {
      showToast('Vui lòng điền mã dịch vụ, tên dịch vụ và giá', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await api.patch(`/quan-ly/dich-vu-kham-chua-benh/${editingItem.id}`, {
          tenDichVu: formData.tenDichVu,
          loai: formData.loai,
          gia: Number(formData.gia),
          donViKetQua: formData.donViKetQua,
          giaTriBinhThuong: formData.giaTriBinhThuong,
          boPhanThucHien: formData.boPhanThucHien,
          mauBenhPham: formData.mauBenhPham,
          moTa: formData.moTa,
          trangThai: formData.trangThai,
        });
        showToast(`Đã cập nhật bảng giá "${formData.tenDichVu}" thành công`);
      } else {
        await api.post('/quan-ly/dich-vu-kham-chua-benh', {
          ...formData,
          gia: Number(formData.gia),
        });
        showToast(`Đã thêm mới dịch vụ "${formData.tenDichVu}" vào bảng giá`);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Lỗi lưu dịch vụ:', err);
      showToast(err.response?.data?.message || 'Không thể lưu dịch vụ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Đổi trạng thái hoạt động dịch vụ
  const handleToggleTrangThai = async (item) => {
    try {
      const res = await api.patch(`/quan-ly/dich-vu-kham-chua-benh/${item.id}/trang-thai`);
      showToast(res.data?.message || 'Cập nhật trạng thái thành công');
      fetchData();
    } catch (err) {
      console.error('Lỗi đổi trạng thái:', err);
      showToast(err.response?.data?.message || 'Không thể đổi trạng thái', 'error');
    }
  };

  // Xác nhận xóa dịch vụ
  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      const res = await api.delete(`/quan-ly/dich-vu-kham-chua-benh/${deleteConfirmItem.id}`);
      showToast(res.data?.message || 'Đã xóa dịch vụ');
      setDeleteConfirmItem(null);
      fetchData();
    } catch (err) {
      console.error('Lỗi xóa dịch vụ:', err);
      showToast(err.response?.data?.message || 'Không thể xóa dịch vụ', 'error');
    }
  };

  // Mở modal chỉnh sửa Tiền cọc
  const handleOpenEditCocModal = (coc) => {
    setEditingCoc(coc);
    setCocFormData({
      tenHinhThuc: coc.tenHinhThuc || '',
      phiKhamMacDinh: coc.phiKhamMacDinh || 200000,
      phanTramCoc: coc.phanTramCoc || 20,
      soTienCoc: coc.soTienCoc || 40000,
      thoiGianHuyHoanCocGio: coc.thoiGianHuyHoanCocGio || 2,
      phanTramHoanCoc: coc.phanTramHoanCoc || 100,
      choPhepDatTruocNgayMin: coc.choPhepDatTruocNgayMin !== undefined && coc.choPhepDatTruocNgayMin !== null ? Number(coc.choPhepDatTruocNgayMin) : 0,
      choPhepDatTruocNgayMax: coc.choPhepDatTruocNgayMax !== undefined && coc.choPhepDatTruocNgayMax !== null ? Number(coc.choPhepDatTruocNgayMax) : 30,
      apDungTuDong: coc.apDungTuDong !== undefined ? coc.apDungTuDong : true,
      moTa: coc.moTa || '',
      ghiChuHoanCoc: coc.ghiChuHoanCoc || '',
    });
    setModalCocOpen(true);
  };

  // Lưu chỉnh sửa Tiền cọc
  const handleSubmitCoc = async (e) => {
    e.preventDefault();
    if (!editingCoc) return;
    setSubmitting(true);
    try {
      await api.patch(`/quan-ly/cau-hinh-tien-coc/${editingCoc.id}`, {
        tenHinhThuc: cocFormData.tenHinhThuc,
        phiKhamMacDinh: Number(cocFormData.phiKhamMacDinh),
        phanTramCoc: Number(cocFormData.phanTramCoc),
        soTienCoc: Number(cocFormData.soTienCoc),
        thoiGianHuyHoanCocGio: Number(cocFormData.thoiGianHuyHoanCocGio),
        phanTramHoanCoc: Number(cocFormData.phanTramHoanCoc),
        choPhepDatTruocNgayMin: cocFormData.choPhepDatTruocNgayMin !== '' && !isNaN(cocFormData.choPhepDatTruocNgayMin) ? Math.max(0, Number(cocFormData.choPhepDatTruocNgayMin)) : 0,
        choPhepDatTruocNgayMax: cocFormData.choPhepDatTruocNgayMax !== '' && !isNaN(cocFormData.choPhepDatTruocNgayMax) ? Math.max(1, Number(cocFormData.choPhepDatTruocNgayMax)) : 30,
        apDungTuDong: cocFormData.apDungTuDong,
        moTa: cocFormData.moTa,
        ghiChuHoanCoc: cocFormData.ghiChuHoanCoc,
      });
      showToast(`Đã cập nhật chính sách tiền cọc "${cocFormData.tenHinhThuc}" thành công!`);
      setModalCocOpen(false);
      fetchCauHinhTienCoc();
    } catch (err) {
      console.error('Lỗi cập nhật tiền cọc:', err);
      showToast(err.response?.data?.message || 'Không thể lưu cấu hình tiền cọc', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Xuất file Excel Bảng giá dịch vụ khám chữa bệnh
  const handleExportExcel = () => {
    if (!dichVuList || dichVuList.length === 0) {
      showToast('Không có dữ liệu bảng giá để xuất file!', 'error');
      return;
    }

    const LOAI_TEXT = {
      kham_benh: 'Khám bệnh lâm sàng',
      xet_nghiem: 'Xét nghiệm sinh hóa & huyết học',
      cdha: 'Chẩn đoán hình ảnh (CĐHA)',
      khac: 'Thủ thuật & Khác',
    };

    const rows = dichVuList.map((dv, idx) => ({
      'STT': idx + 1,
      'Mã Dịch Vụ': dv.maDichVu || '',
      'Tên Dịch Vụ Kỹ Thuật': dv.tenDichVu || '',
      'Phân Loại': LOAI_TEXT[dv.loai] || dv.loai || '',
      'Đơn Giá (VNĐ)': Number(dv.gia) || 0,
      'Đơn Vị Tính': dv.donViKetQua || 'Lượt',
      'Bộ Phận Thực Hiện': dv.boPhanThucHien || 'Phòng khám chuyên khoa',
      'Mẫu Bệnh Phẩm': dv.mauBenhPham || '—',
      'Trị Số Tham Chiếu / Bình Thường': dv.giaTriBinhThuong || 'Bình thường',
      'Trạng Thái Áp Dụng': dv.trangThai === 'hoat_dong' ? 'Đang hoạt động' : 'Tạm ngưng',
      'Mô Tả Chi Tiết': dv.moTa || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã DV
      { wch: 35 }, // Tên DV
      { wch: 25 }, // Phân loại
      { wch: 16 }, // Đơn giá
      { wch: 12 }, // ĐVT
      { wch: 25 }, // Bộ phận
      { wch: 18 }, // Mẫu bệnh phẩm
      { wch: 25 }, // Tham chiếu
      { wch: 18 }, // Trạng thái
      { wch: 30 }, // Mô tả
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangGiaDichVu');
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `Bang_Gia_Dich_Vu_Kham_Chua_Benh_${nowStr}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ─── TOAST NOTIFICATION ──────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── HEADER BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-50 text-primary-600 font-bold">
              <DollarSign className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Quản Lý Biểu Phí & Bảng Giá Khám Chữa Bệnh
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Thiết lập giá khám chuyên khoa, xét nghiệm, CĐHA và chính sách tiền cọc giữ chỗ khi bệnh nhân đặt lịch trước
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Xuất file Excel toàn bộ bảng giá dịch vụ khám chữa bệnh"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel Bảng Giá</span>
          </button>

          <button
            onClick={() => { fetchData(); fetchCauHinhTienCoc(); }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading || loadingCoc ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          {activeTab === 'dich_vu' && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Dịch Vụ Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── TOP MAIN TABS: DỊCH VỤ KHÁM & TIỀN CỌC ĐẶT LỊCH ───── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('dich_vu')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'dich_vu'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bảng Giá Khám & Kỹ Thuật ({dichVuList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tien_coc')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'tien_coc'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Quy Định Tiền Cọc Đặt Lịch Trước ({cauHinhTienCoc.length})</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: QUẢN LÝ DỊCH VỤ KHÁM CHỮA BỆNH & XÉT NGHIỆM
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'dich_vu' && (
        <>
          {/* KPI Stats Summary */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng dịch vụ</span>
                <div className="text-xl font-black text-slate-800 mt-1">{stats.tongDichVu}</div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Đã niêm yết trong viện</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đang áp dụng</span>
                <div className="text-xl font-black text-emerald-700 mt-1">{stats.hoatDong}</div>
                <span className="text-[10px] text-emerald-600/80 font-medium mt-0.5 block">Hiển thị cho bệnh nhân</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Tạm dừng</span>
                <div className="text-xl font-black text-amber-700 mt-1">{stats.tamNgung}</div>
                <span className="text-[10px] text-amber-600/80 font-medium mt-0.5 block">Ngừng tiếp nhận</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Khám lâm sàng</span>
                <div className="text-xl font-black text-slate-800 mt-1">{stats.khamBenh}</div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Các phòng chuyên khoa</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Xét nghiệm</span>
                <div className="text-xl font-black text-slate-800 mt-1">{stats.xetNghiem}</div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Sinh hóa, huyết học...</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CĐHA & Siêu âm</span>
                <div className="text-xl font-black text-slate-800 mt-1">{stats.cdha}</div>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">X-quang, MRI, Siêu âm</span>
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên dịch vụ, mã DV (VD: KB001, XN002), khoa phòng..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterLoai}
                onChange={(e) => setFilterLoai(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-primary-500"
              >
                {LOAI_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={filterTrangThai}
                onChange={(e) => setFilterTrangThai(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-primary-500"
              >
                <option value="tat_ca">Tất cả trạng thái</option>
                <option value="hoat_dong">Đang hoạt động</option>
                <option value="ngung">Tạm ngừng</option>
              </select>
            </div>
          </div>

          {/* Service Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 w-12 text-center">STT</th>
                    <th className="py-3.5 px-4 w-28">Mã DV</th>
                    <th className="py-3.5 px-4">Tên dịch vụ khám / Kỹ thuật</th>
                    <th className="py-3.5 px-4 w-36">Phân loại</th>
                    <th className="py-3.5 px-4 w-40 text-right">Đơn giá niêm yết</th>
                    <th className="py-3.5 px-4 w-48">Bộ phận thực hiện</th>
                    <th className="py-3.5 px-4 w-32 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 w-28 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {loading && dichVuList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500 mb-2" />
                        <span>Đang tải bảng giá dịch vụ y tế...</span>
                      </td>
                    </tr>
                  ) : dichVuList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">Không tìm thấy dịch vụ nào</p>
                        <p className="text-xs text-slate-400 mt-0.5">Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc</p>
                      </td>
                    </tr>
                  ) : (
                    dichVuList.map((item, index) => {
                      const badge = LOAI_BADGE[item.loai] || LOAI_BADGE.khac;
                      const isHoatDong = item.trangThai === 'hoat_dong';

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-400 text-xs">
                            {index + 1}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-primary-700 text-xs">
                            {item.maDichVu}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 group-hover:text-primary-700 transition-colors">
                              {item.tenDichVu}
                            </div>
                            {item.moTa && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                {item.moTa}
                              </p>
                            )}
                            {item.giaTriBinhThuong && (
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Tham chiếu: {item.giaTriBinhThuong} ({item.donViKetQua || 'Đơn vị'})
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="text-sm font-black text-slate-900">
                              {formatVND(item.gia)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              /{item.donViKetQua || 'Lượt'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 text-xs">
                            <div className="font-medium text-slate-700">{item.boPhanThucHien || 'Phòng khám đa khoa'}</div>
                            {item.mauBenhPham && (
                              <span className="text-[11px] text-slate-400">Mẫu: {item.mauBenhPham}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleTrangThai(item)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                isHoatDong
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                              title="Click để đổi trạng thái"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isHoatDong ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{isHoatDong ? 'Hoạt động' : 'Tạm ngừng'}</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Điều chỉnh thông tin & đơn giá"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmItem(item)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa dịch vụ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: QUẢN LÝ QUY ĐỊNH TIỀN CỌC ĐẶT LỊCH TRƯỚC
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'tien_coc' && (
        <div className="space-y-6">
          <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-700 space-y-1">
              <p className="font-bold text-slate-900">
                Chính sách tiền cọc nhằm đảm bảo tỷ lệ đến khám thực tế & phân bổ tối ưu thời gian của Bác sĩ:
              </p>
              <p>
                • <strong>Khám trực tiếp:</strong> Thường tạm ứng từ 10% - 30% giá khám để giữ khung giờ (STT) phòng khám.
              </p>
              <p>
                • <strong>Khám từ xa Telehealth:</strong> Thường yêu cầu thanh toán 100% trước để kích hoạt phòng khám Video Call HD 1-1.
              </p>
              <p>
                • Bệnh nhân hủy lịch đúng hạn (trước mốc giờ quy định) sẽ được hoàn trả tiền cọc tự động qua tài khoản/cổng thanh toán.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cauHinhTienCoc.map((coc) => (
              <div
                key={coc.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`p-2 rounded-xl ${
                        coc.loaiHinhThuc === 'truc_tuyen' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {coc.loaiHinhThuc === 'truc_tuyen' ? <Video className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </span>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{coc.tenHinhThuc}</h3>
                        <span className="text-[11px] font-mono text-slate-400">Hình thức: {coc.loaiHinhThuc}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Áp dụng tự động
                    </span>
                  </div>

                  {/* Pricing Overview */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Phí khám cơ bản:</span>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        {formatVND(coc.phiKhamMacDinh)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Mức cọc tạm ứng:</span>
                      <div className="text-base font-black text-primary-700 mt-0.5">
                        {formatVND(coc.soTienCoc)} <span className="text-xs font-semibold text-primary-600">({coc.phanTramCoc}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Conditions & Policies */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Mốc hủy hoàn cọc tối thiểu:</span>
                      <span className="font-bold text-slate-800">Trước {coc.thoiGianHuyHoanCocGio} tiếng</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Tỷ lệ hoàn tiền cọc đúng hạn:</span>
                      <span className="font-bold text-emerald-700">{coc.phanTramHoanCoc}% tiền cọc</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Cho phép đặt trước:</span>
                      <span className="font-bold text-slate-800">
                        {coc.choPhepDatTruocNgayMin === 0 ? `Từ hôm nay (0) đến ${coc.choPhepDatTruocNgayMax} ngày` : `Từ ${coc.choPhepDatTruocNgayMin} đến ${coc.choPhepDatTruocNgayMax} ngày`}
                      </span>
                    </div>
                  </div>

                  {/* Policy Notes */}
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70 text-xs space-y-1">
                    <p className="font-bold text-slate-700">Ghi chú & Hướng dẫn hoàn cọc:</p>
                    <p className="text-slate-600 leading-relaxed">{coc.ghiChuHoanCoc}</p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-end">
                  <button
                    onClick={() => handleOpenEditCocModal(coc)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Điều Chỉnh Mức Cọc & Quy Định</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL ĐIỀU CHỈNH TIỀN CỌC ĐẶT LỊCH (BAN GIÁM ĐỐC) ───── */}
      {modalCocOpen && editingCoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-100 text-primary-700 font-bold">
                  <Settings2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Điều Chỉnh Quy Định Tiền Cọc Đặt Lịch
                  </h3>
                  <span className="text-xs text-slate-500">{editingCoc.tenHinhThuc}</span>
                </div>
              </div>
              <button
                onClick={() => setModalCocOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCoc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên hình thức khám
                </label>
                <input
                  type="text"
                  required
                  value={cocFormData.tenHinhThuc}
                  onChange={(e) => setCocFormData({ ...cocFormData, tenHinhThuc: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Giá khám mặc định */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá khám niêm yết (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cocFormData.phiKhamMacDinh}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setCocFormData({ ...cocFormData, phiKhamMacDinh: '', soTienCoc: 0 });
                        return;
                      }
                      const phi = Number(raw);
                      const pt = Number(cocFormData.phanTramCoc || 0);
                      setCocFormData({
                        ...cocFormData,
                        phiKhamMacDinh: phi,
                        soTienCoc: Math.round((phi * pt) / 100),
                      });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-bold"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    = {formatVND(cocFormData.phiKhamMacDinh || 0)}
                  </span>
                </div>

                {/* Phần trăm cọc */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phần trăm tạm ứng cọc (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={cocFormData.phanTramCoc}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setCocFormData({ ...cocFormData, phanTramCoc: '', soTienCoc: 0 });
                        return;
                      }
                      const pt = Number(raw);
                      const phi = Number(cocFormData.phiKhamMacDinh || 0);
                      setCocFormData({
                        ...cocFormData,
                        phanTramCoc: pt,
                        soTienCoc: Math.round((phi * pt) / 100),
                      });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-bold"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Khuyến nghị: 20% (trực tiếp), 100% (online)
                  </span>
                </div>
              </div>

              {/* Số tiền cọc tính toán */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số tiền cọc thực tế thu của bệnh nhân (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cocFormData.soTienCoc}
                  onChange={(e) => setCocFormData({ ...cocFormData, soTienCoc: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-primary-300 focus:outline-hidden focus:border-primary-600 font-black text-primary-700 text-base"
                />
                <span className="text-xs font-bold text-emerald-600 mt-1 block">
                  Bệnh nhân cần nạp: {formatVND(cocFormData.soTienCoc || 0)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Thời gian hủy hoàn cọc tối thiểu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời gian hủy tối thiểu để hoàn cọc (Tiếng)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cocFormData.thoiGianHuyHoanCocGio}
                    onChange={(e) => setCocFormData({ ...cocFormData, thoiGianHuyHoanCocGio: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-bold"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    VD: Trước 2 tiếng (trực tiếp) hoặc 24 tiếng (online)
                  </span>
                </div>

                {/* Phần trăm hoàn cọc */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tỷ lệ hoàn tiền cọc khi hủy đúng hạn (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={cocFormData.phanTramHoanCoc}
                    onChange={(e) => setCocFormData({ ...cocFormData, phanTramHoanCoc: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-bold"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Mặc định: 100% hoàn tiền
                  </span>
                </div>
              </div>

              {/* Ràng buộc ngày đặt trước */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đặt trước tối thiểu (Ngày)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cocFormData.choPhepDatTruocNgayMin}
                    onChange={(e) => setCocFormData({ ...cocFormData, choPhepDatTruocNgayMin: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đặt trước tối đa (Ngày)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cocFormData.choPhepDatTruocNgayMax}
                    onChange={(e) => setCocFormData({ ...cocFormData, choPhepDatTruocNgayMax: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-bold"
                  />
                </div>
              </div>

              {/* Ghi chú chính sách hoàn cọc hiển thị cho bệnh nhân */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả & Hướng dẫn hoàn cọc cho bệnh nhân
                </label>
                <textarea
                  rows="3"
                  value={cocFormData.ghiChuHoanCoc}
                  onChange={(e) => setCocFormData({ ...cocFormData, ghiChuHoanCoc: e.target.value })}
                  placeholder="Ghi rõ điều kiện hoàn hủy cọc..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 leading-relaxed"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCocOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Quy Định Tiền Cọc</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL THÊM / CẬP NHẬT DỊCH VỤ ──────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-100 text-primary-700 font-bold">
                  {editingItem ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {editingItem ? 'Điều Chỉnh Thông Tin & Giá Dịch Vụ' : 'Thêm Dịch Vụ / Kỹ Thuật Y Tế Mới'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã dịch vụ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={formData.maDichVu}
                    onChange={(e) => setFormData({ ...formData, maDichVu: e.target.value.toUpperCase() })}
                    placeholder="VD: KB005, XN012, CD008"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 disabled:bg-slate-100 disabled:text-slate-500 font-mono font-bold"
                  />
                  {editingItem && (
                    <span className="text-[10px] text-slate-400">Mã dịch vụ không được thay đổi sau khi tạo</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân loại chuyên khoa <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.loai}
                    onChange={(e) => setFormData({ ...formData, loai: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-medium"
                  >
                    <option value="kham_benh">Khám bệnh lâm sàng</option>
                    <option value="xet_nghiem">Xét nghiệm sinh hóa & huyết học</option>
                    <option value="cdha">Chẩn đoán hình ảnh (CĐHA)</option>
                    <option value="khac">Thủ thuật & Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên dịch vụ y tế <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenDichVu}
                  onChange={(e) => setFormData({ ...formData, tenDichVu: e.target.value })}
                  placeholder="VD: Khám chuyên khoa Nội Tổng Quát, Định lượng Cholesterol..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn giá niêm yết (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={formData.gia}
                      onChange={(e) => setFormData({ ...formData, gia: e.target.value })}
                      placeholder="VD: 150000"
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 font-bold text-slate-900 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      VNĐ
                    </span>
                  </div>
                  {formData.gia && (
                    <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                      = {formatVND(formData.gia)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn vị tính / Đơn vị kết quả
                  </label>
                  <input
                    type="text"
                    value={formData.donViKetQua}
                    onChange={(e) => setFormData({ ...formData, donViKetQua: e.target.value })}
                    placeholder="VD: Lượt, Gói, mmol/L, mg/dL..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khoa / Bộ phận thực hiện
                  </label>
                  <input
                    type="text"
                    value={formData.boPhanThucHien}
                    onChange={(e) => setFormData({ ...formData, boPhanThucHien: e.target.value })}
                    placeholder="VD: Khoa Khám bệnh, Khoa Xét nghiệm, Khoa CĐHA..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mẫu bệnh phẩm / Vị trí khảo sát
                  </label>
                  <input
                    type="text"
                    value={formData.mauBenhPham}
                    onChange={(e) => setFormData({ ...formData, mauBenhPham: e.target.value })}
                    placeholder="VD: Máu toàn phần, Nước tiểu, Ổ bụng..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giá trị tham chiếu / Chỉ số bình thường
                </label>
                <input
                  type="text"
                  value={formData.giaTriBinhThuong}
                  onChange={(e) => setFormData({ ...formData, giaTriBinhThuong: e.target.value })}
                  placeholder="VD: 3.9 - 6.4 mmol/L, Bình thường, Theo kết luận Bác sĩ..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả dịch vụ & Hướng dẫn bệnh nhân chuẩn bị
                </label>
                <textarea
                  rows="2"
                  value={formData.moTa}
                  onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                  placeholder="VD: Nhịn ăn tối thiểu 6-8 tiếng trước khi lấy máu..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs font-bold text-slate-700">Trạng thái:</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="trangThai"
                    value="hoat_dong"
                    checked={formData.trangThai === 'hoat_dong'}
                    onChange={() => setFormData({ ...formData, trangThai: 'hoat_dong' })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Hoạt động (Hiển thị ra bảng giá)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="trangThai"
                    value="ngung"
                    checked={formData.trangThai === 'ngung'}
                    onChange={() => setFormData({ ...formData, trangThai: 'ngung' })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Tạm ngừng</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Lưu Thay Đổi' : 'Tạo Dịch Vụ Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL XÁC NHẬN XÓA ─────────────────────────────────── */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-50 text-red-600">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <div>
                <h4 className="font-black text-slate-900 text-base">Xác Nhận Xóa Dịch Vụ</h4>
                <p className="text-xs text-slate-500 mt-0.5">Hành động này có thể ảnh hưởng đến bảng giá</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa dịch vụ{' '}
              <strong className="text-slate-900">{deleteConfirmItem.tenDichVu}</strong> (Mã:{' '}
              <span className="font-mono text-primary-700">{deleteConfirmItem.maDichVu}</span>)?
            </p>
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              * Ghi chú: Nếu dịch vụ đã phát sinh chỉ định cận lâm sàng trong hồ sơ bệnh án, hệ thống sẽ tự động chuyển sang trạng thái <strong>"Tạm ngừng"</strong> để bảo toàn lịch sử y tế.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
