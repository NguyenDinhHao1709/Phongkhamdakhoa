import { useState, useEffect, useMemo } from 'react';
import {
  Layers, Building2, DoorOpen, Search, RefreshCw, CheckCircle2,
  AlertCircle, Plus, Edit2, Trash2, X, Check, Filter, Stethoscope,
  MapPin, ShieldAlert, Activity, Users, Info, Building, PhoneCall,
  Clock, ShieldCheck, Mail, HeartPulse, Save, Sparkles, Eye
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../services/api';
import useHospitalStore from '../../store/hospitalStore';

const STATUS_LABELS = {
  hoat_dong: { label: 'Đang hoạt động', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20' },
  bao_tri:   { label: 'Tạm bảo trì',   color: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20' },
  dong_cua:  { label: 'Đóng cửa / Ngừng', color: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20' },
};

const DEFAULT_HOSPITAL_INFO = {
  tenBenhVien: 'PHÒNG KHÁM ĐA KHOA',
  slogan: 'TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO',
  moTa: 'Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt của Bộ Y Tế.',
  soGiayPhep: '08922/BYT-GPHĐ',
  diaChi: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
  tongDai: '1900 8888',
  gioLamViec: '07:00 – 20:00 (Thứ 2 - CN)',
  email: 'hotro@phongkhamdakhoa.vn',
  tieuDeCapCuu: 'CẤP CỨU 24/24',
  hotlineCapCuu: '1900 8888',
  khauHieuCapCuu: 'Luôn sẵn sàng tiếp nhận & xử trí y tế',
  dichVuNoiBat: [
    'Khám bệnh Nội tổng quát & Tim mạch',
    'Khám Tai Mũi Họng & Nội soi',
    'Khám Nhi khoa & Dinh dưỡng',
    'Chẩn đoán hình ảnh & Xét nghiệm Laser',
    'Khám tư vấn từ xa (Telehealth)',
  ],
  banQuyen: '© 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa. Bản quyền thuộc về Phòng Khám Đa Khoa.',
};

export default function DanhMucDungChungPage() {
  const [activeTab, setActiveTab] = useState('phong_ban'); // 'phong_ban' | 'phong_kham' | 'thong_tin_benh_vien'
  const [data, setData] = useState({ phongBans: [], phongKhams: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKhoa, setFilterKhoa] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Toasts & feedback
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal State: Khoa / Phòng Ban
  const [modalPhongBan, setModalPhongBan] = useState({ open: false, mode: 'create', data: null });
  const [pbForm, setPbForm] = useState({ tenPhongBan: '', moTa: '' });
  const [pbSubmitting, setPbSubmitting] = useState(false);

  // Modal State: Phòng Khám Thực Tế
  const [modalPhongKham, setModalPhongKham] = useState({ open: false, mode: 'create', data: null });
  const [pkForm, setPkForm] = useState({
    tenPhong: '',
    viTri: '',
    chuyenKhoa: '',
    trangThai: 'hoat_dong',
    phongBanId: '',
  });
  const [pkSubmitting, setPkSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, item: null, loading: false });

  // Tab 3: Thông Tin Bệnh Viện State
  const [hospitalInfo, setHospitalInfo] = useState(DEFAULT_HOSPITAL_INFO);
  const [dichVuText, setDichVuText] = useState('');
  const [savingHospital, setSavingHospital] = useState(false);
  const [loadingHospital, setLoadingHospital] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDanhMuc = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/quan-ly/danh-muc-tong-hop');
      const d = res?.data || res;
      setData({
        phongBans: d.phongBans || [],
        phongKhams: d.phongKhams || [],
      });
    } catch (err) {
      console.error('Lỗi tải danh mục dùng chung:', err);
      showToast('error', 'Không thể tải dữ liệu danh mục dùng chung');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalInfo = async () => {
    setLoadingHospital(true);
    try {
      const res = await apiGet('/quan-ly/thong-tin-benh-vien');
      const info = res?.data || res || DEFAULT_HOSPITAL_INFO;
      const merged = { ...DEFAULT_HOSPITAL_INFO, ...info };
      setHospitalInfo(merged);
      setDichVuText(Array.isArray(merged.dichVuNoiBat) ? merged.dichVuNoiBat.join('\n') : '');
    } catch (err) {
      console.error('Lỗi tải thông tin bệnh viện:', err);
    } finally {
      setLoadingHospital(false);
    }
  };

  useEffect(() => {
    fetchDanhMuc();
    fetchHospitalInfo();
  }, []);

  // ─── KHOA / PHÒNG BAN ACTIONS ─────────────────────────────────
  const handleOpenCreatePB = () => {
    setPbForm({ tenPhongBan: '', moTa: '' });
    setModalPhongBan({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditPB = (pb) => {
    setPbForm({ tenPhongBan: pb.ten_phong_ban || '', moTa: pb.moTa || pb.mo_ta || '' });
    setModalPhongBan({ open: true, mode: 'edit', data: pb });
  };

  const handleSubmitPB = async (e) => {
    e.preventDefault();
    if (!pbForm.tenPhongBan.trim()) {
      showToast('error', 'Vui lòng nhập tên khoa / phòng ban');
      return;
    }
    setPbSubmitting(true);
    try {
      if (modalPhongBan.mode === 'create') {
        await apiPost('/quan-ly/phong-ban', {
          tenPhongBan: pbForm.tenPhongBan.trim(),
          moTa: pbForm.moTa.trim(),
        });
        showToast('success', 'Thêm mới khoa / phòng ban thành công!');
      } else {
        await apiPut(`/quan-ly/phong-ban/${modalPhongBan.data.id}`, {
          tenPhongBan: pbForm.tenPhongBan.trim(),
          moTa: pbForm.moTa.trim(),
        });
        showToast('success', 'Cập nhật khoa / phòng ban thành công!');
      }
      setModalPhongBan({ open: false, mode: 'create', data: null });
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu phòng ban');
    } finally {
      setPbSubmitting(false);
    }
  };

  // ─── PHÒNG KHÁM THỰC TẾ ACTIONS ───────────────────────────────
  const handleOpenCreatePK = () => {
    setPkForm({
      tenPhong: '',
      viTri: 'Tầng 1 - Khu A',
      chuyenKhoa: 'Nội tổng quát',
      trangThai: 'hoat_dong',
      phongBanId: data.phongBans[0]?.id || '',
    });
    setModalPhongKham({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditPK = (pk) => {
    setPkForm({
      tenPhong: pk.ten_phong || '',
      viTri: pk.vi_tri || '',
      chuyenKhoa: pk.chuyen_khoa || '',
      trangThai: pk.trang_thai || 'hoat_dong',
      phongBanId: pk.phong_ban_id || '',
    });
    setModalPhongKham({ open: true, mode: 'edit', data: pk });
  };

  const handleSubmitPK = async (e) => {
    e.preventDefault();
    if (!pkForm.tenPhong.trim()) {
      showToast('error', 'Vui lòng nhập tên phòng khám');
      return;
    }
    setPkSubmitting(true);
    try {
      const payload = {
        tenPhong: pkForm.tenPhong.trim(),
        viTri: pkForm.viTri.trim(),
        chuyenKhoa: pkForm.chuyenKhoa.trim(),
        trangThai: pkForm.trangThai,
        phongBanId: pkForm.phongBanId ? Number(pkForm.phongBanId) : null,
      };

      if (modalPhongKham.mode === 'create') {
        await apiPost('/quan-ly/phong-kham', payload);
        showToast('success', 'Thêm mới phòng khám thành công!');
      } else {
        await apiPut(`/quan-ly/phong-kham/${modalPhongKham.data.id}`, payload);
        showToast('success', 'Cập nhật thông tin phòng khám thành công!');
      }
      setModalPhongKham({ open: false, mode: 'create', data: null });
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu phòng khám');
    } finally {
      setPkSubmitting(false);
    }
  };

  const handleQuickTogglePKStatus = async (pk) => {
    const nextStatus = pk.trang_thai === 'hoat_dong' ? 'bao_tri' : 'hoat_dong';
    try {
      await apiPatch(`/quan-ly/phong-kham/${pk.id}/trang-thai`, { trangThai: nextStatus });
      showToast('success', `Đã chuyển phòng "${pk.ten_phong}" sang trạng thái ${STATUS_LABELS[nextStatus].label}`);
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Không thể đổi trạng thái phòng');
    }
  };

  // ─── DELETE ACTION (GENERIC) ──────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      if (deleteModal.type === 'phong_ban') {
        await apiDelete(`/quan-ly/phong-ban/${deleteModal.item.id}`);
        showToast('success', `Đã xóa khoa / phòng ban "${deleteModal.item.ten_phong_ban}"`);
      } else {
        const res = await apiDelete(`/quan-ly/phong-kham/${deleteModal.item.id}`);
        showToast('success', res?.message || `Đã xử lý xóa phòng khám "${deleteModal.item.ten_phong}"`);
      }
      setDeleteModal({ open: false, type: null, item: null, loading: false });
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Không thể xóa mục đã chọn');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ─── THÔNG TIN BỆNH VIỆN SUBMIT ──────────────────────────────
  const handleSaveHospitalInfo = async (e) => {
    e.preventDefault();
    setSavingHospital(true);
    try {
      const dvList = dichVuText
        .split('\n')
        .map(s => s.trim().replace(/^[•\-\*]\s*/, ''))
        .filter(Boolean);

      const payload = {
        ...hospitalInfo,
        dichVuNoiBat: dvList,
      };

      await apiPut('/quan-ly/thong-tin-benh-vien', payload);
      useHospitalStore.getState().setHospitalInfo(payload);
      showToast('success', 'Đã lưu cấu hình thông tin bệnh viện thành công! Header & Footer toàn hệ thống đã được cập nhật.');
      fetchHospitalInfo();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi khi lưu thông tin bệnh viện');
    } finally {
      setSavingHospital(false);
    }
  };

  // ─── FILTERED DATA ────────────────────────────────────────────
  const filteredPhongBans = useMemo(() => {
    return data.phongBans.filter(p => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.ten_phong_ban?.toLowerCase().includes(term) ||
        p.mo_ta?.toLowerCase().includes(term) ||
        String(p.id).includes(term)
      );
    });
  }, [data.phongBans, searchTerm]);

  const filteredPhongKhams = useMemo(() => {
    return data.phongKhams.filter(p => {
      const matchSearch = !searchTerm ||
        p.ten_phong?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.chuyen_khoa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vi_tri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ten_phong_ban?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchKhoa = filterKhoa === 'all' || String(p.phong_ban_id) === String(filterKhoa);
      const matchStatus = filterStatus === 'all' || p.trang_thai === filterStatus;

      return matchSearch && matchKhoa && matchStatus;
    });
  }, [data.phongKhams, searchTerm, filterKhoa, filterStatus]);

  const tabs = [
    { id: 'phong_ban', label: 'Khoa / Phòng Ban', icon: Building2, count: data.phongBans?.length || 0 },
    { id: 'phong_kham', label: 'Phòng Khám Thực Tế', icon: DoorOpen, count: data.phongKhams?.length || 0 },
    { id: 'thong_tin_benh_vien', label: 'Thông Tin Bệnh Viện', icon: Building, badge: 'Footer & Liên hệ' },
  ];

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-4 max-w-7xl mx-auto">
      {/* Toast Notice */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 transition-all animate-bounce-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Layers className="h-3.5 w-3.5" /> MASTER DATA MANAGEMENT
          </div>
          <h1 className="text-2xl font-black text-gray-900">Quản Lý Danh Mục Dùng Chung</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản trị cơ cấu phòng khám: Chuyên khoa, buồng khám thực tế và thông tin pháp lý, tổng đài, đường dây nóng cấp cứu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchDanhMuc(); fetchHospitalInfo(); }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>

          {activeTab === 'phong_ban' && (
            <button
              onClick={handleOpenCreatePB}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thêm Khoa / Phòng Ban
            </button>
          )}

          {activeTab === 'phong_kham' && (
            <button
              onClick={handleOpenCreatePK}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thêm Phòng Khám
            </button>
          )}

          {activeTab === 'thong_tin_benh_vien' && (
            <button
              onClick={handleSaveHospitalInfo}
              disabled={savingHospital}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{savingHospital ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined ? (
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {tab.count}
                </span>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1 & TAB 2 CONTROLS ───────────────────────────────── */}
      {activeTab !== 'thong_tin_benh_vien' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'phong_ban' ? 'Tìm tên khoa, phòng ban, mô tả...' : 'Tìm tên phòng, chuyên khoa, vị trí...'}
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          {activeTab === 'phong_kham' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterKhoa}
                onChange={(e) => setFilterKhoa(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tất cả Khoa / Phòng ban</option>
                {data.phongBans.map(pb => (
                  <option key={pb.id} value={pb.id}>{pb.ten_phong_ban}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="hoat_dong">Đang hoạt động</option>
                <option value="bao_tri">Tạm bảo trì</option>
                <option value="dong_cua">Đóng cửa</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT ─────────────────────────────────────────── */}
      {activeTab === 'thong_tin_benh_vien' ? (
        /* ─── TAB 3: THÔNG TIN BỆNH VIỆN & CƠ SỞ Y TẾ ────────────── */
        <div className="space-y-6">
          <form onSubmit={handleSaveHospitalInfo} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái: Form nhập liệu cấu hình (7 cột) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Định danh & Giấy phép */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary-600 flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Nhận Diện Cơ Sở Y Tế & Pháp Lý</h3>
                    <p className="text-xs text-gray-500">Tên thương hiệu, giấy phép hoạt động và khẩu hiệu</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Tên Cơ Sở Khám Chữa Bệnh / Phòng Khám <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={hospitalInfo.tenBenhVien || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, tenBenhVien: e.target.value })}
                        placeholder="Ví dụ: PHÒNG KHÁM ĐA KHOA..."
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Khẩu Hiệu / Tiêu Đề Phụ (Dưới logo navbar)
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.slogan || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, slogan: e.target.value })}
                        placeholder="Ví dụ: TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium text-primary-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Giới Thiệu Ngắn / Khẩu Hiệu Hoạt Động
                    </label>
                    <textarea
                      rows={2}
                      value={hospitalInfo.moTa || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, moTa: e.target.value })}
                      placeholder="Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt..."
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Số Giấy Phép Hoạt Động Y Tế
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.soGiayPhep || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, soGiayPhep: e.target.value })}
                        placeholder="Ví dụ: Giấy phép hoạt động số 08922/BYT-GPHĐ"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Bản Quyền / Footer Copyright
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.banQuyen || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, banQuyen: e.target.value })}
                        placeholder="© 2026 Hệ Thống Quản Lý Phòng Khám..."
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Thông tin liên hệ & Đón tiếp */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Thông Tin Liên Hệ & Đón Tiếp Bệnh Nhân</h3>
                    <p className="text-xs text-gray-500">Trụ sở phòng khám, tổng đài và khung giờ hoạt động</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      Địa Chỉ Trụ Sở Khám Bệnh <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hospitalInfo.diaChi || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, diaChi: e.target.value })}
                      placeholder="123 Nguyễn Văn Cừ, Quận 5, TP.HCM"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        Số Tổng Đài CSKH
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.tongDai || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, tongDai: e.target.value })}
                        placeholder="1900 8888"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Giờ Tiếp Đón Khám
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.gioLamViec || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, gioLamViec: e.target.value })}
                        placeholder="07:00 – 20:00 (Thứ 2 - CN)"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-purple-500" />
                        Email CSKH
                      </label>
                      <input
                        type="email"
                        value={hospitalInfo.email || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, email: e.target.value })}
                        placeholder="hotro@phongkhamdakhoa.vn"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Đường Dây Nóng Khẩn Cấp (Cấp Cứu 24/24) */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Đường Dây Nóng Khẩn Cấp (Cấp Cứu 24/24)</h3>
                    <p className="text-xs text-gray-500">Khối thông tin nổi bật xử trí tình huống khẩn cấp</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tiêu Đề Khối Cấp Cứu
                    </label>
                    <input
                      type="text"
                      value={hospitalInfo.tieuDeCapCuu || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, tieuDeCapCuu: e.target.value })}
                      placeholder="CẤP CỨU 24/24"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Số Hotline Cấp Cứu <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hospitalInfo.hotlineCapCuu || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, hotlineCapCuu: e.target.value })}
                      placeholder="1900 8888"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-black text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Khẩu Hiệu / Ghi Chú Túc Trực
                    </label>
                    <input
                      type="text"
                      value={hospitalInfo.khauHieuCapCuu || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, khauHieuCapCuu: e.target.value })}
                      placeholder="Luôn sẵn sàng tiếp nhận & xử trí y tế"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Dịch vụ nổi bật ở Footer */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Danh Mục Dịch Vụ Nổi Bật (Footer)</h3>
                    <p className="text-xs text-gray-500">Mỗi dòng là một dịch vụ y tế hiển thị trong danh sách footer</p>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={5}
                    value={dichVuText}
                    onChange={(e) => setDichVuText(e.target.value)}
                    placeholder="Khám bệnh Nội tổng quát & Tim mạch&#10;Khám Tai Mũi Họng & Nội soi&#10;Khám Nhi khoa & Dinh dưỡng&#10;Chẩn đoán hình ảnh & Xét nghiệm Laser&#10;Khám tư vấn từ xa (Telehealth)"
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Nhập mỗi dịch vụ trên một dòng riêng. Hệ thống tự động chuyển đổi thành danh sách gạch đầu dòng ở chân trang.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingHospital}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingHospital ? 'Đang lưu hệ thống...' : 'Lưu Thay Đổi Thông Tin Bệnh Viện'}</span>
                </button>
              </div>
            </div>

            {/* Cột phải: Xem trước trực quan (Live Preview - 5 cột) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-primary-600" />
                    Xem Trước Giao Diện Chân Trang (Live Preview)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Khớp 100% Trang Chủ
                  </span>
                </div>
                {/* Simulated Header Preview */}
                <div className="mb-4 space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    1. Xem trước Thanh Điều Hướng (Navbar Header):
                  </span>
                  <div className="rounded-2xl bg-white border border-gray-200 p-3 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shrink-0">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 tracking-tight leading-none uppercase">
                          {hospitalInfo.tenBenhVien || 'PHÒNG KHÁM ĐA KHOA'}
                        </span>
                        <span className="text-[9px] font-bold text-primary-700 tracking-wider uppercase mt-1">
                          {hospitalInfo.slogan || 'TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 hidden sm:block text-right">
                      <span>Hotline: <strong className="text-primary-700 font-bold">{hospitalInfo.tongDai || '1900 8888'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    2. Xem trước Chân Trang (Footer):
                  </span>
                  {/* Simulated Footer Box */}
                  <div className="rounded-2xl bg-slate-900 text-slate-400 p-6 shadow-inner text-xs space-y-6 border border-slate-800">
                  <div className="space-y-6">
                    {/* Cột 1: Tên & Giấy phép */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white font-black text-sm">
                        <Stethoscope className="h-4 w-4 text-primary-400" />
                        <span>{hospitalInfo.tenBenhVien || 'PHÒNG KHÁM ĐA KHOA'}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        {hospitalInfo.moTa || 'Cơ sở khám chữa bệnh đa khoa kỹ thuật cao...'}
                      </p>
                      <p className="text-emerald-400 text-[11px] font-semibold">
                        {hospitalInfo.soGiayPhep || 'Giấy phép hoạt động số 08922/BYT-GPHĐ'}
                      </p>
                    </div>

                    {/* Cột 2: Thông tin liên hệ */}
                    <div className="pt-2 border-t border-slate-800">
                      <h4 className="text-white font-bold text-xs mb-2">Thông Tin Liên Hệ</h4>
                      <ul className="space-y-1.5 text-slate-400 text-[11px]">
                        <li className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                          <span>{hospitalInfo.diaChi || '123 Nguyễn Văn Cừ, Quận 5, TP.HCM'}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <PhoneCall className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>Tổng đài: <strong className="text-white">{hospitalInfo.tongDai || '1900 8888'}</strong></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <span>Giờ làm: {hospitalInfo.gioLamViec || '07:00 – 20:00 (Thứ 2 - CN)'}</span>
                        </li>
                      </ul>
                    </div>

                    {/* Cột 3: Dịch vụ nổi bật */}
                    <div className="pt-2 border-t border-slate-800">
                      <h4 className="text-white font-bold text-xs mb-2">Dịch Vụ Nổi Bật</h4>
                      <ul className="space-y-1 text-slate-400 text-[11px]">
                        {(dichVuText ? dichVuText.split('\n').filter(Boolean) : hospitalInfo.dichVuNoiBat || []).map((dv, idx) => (
                          <li key={idx} className="line-clamp-1">• {dv.replace(/^[•\-\*]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Cột 4: Đường dây nóng */}
                    <div className="pt-2 border-t border-slate-800">
                      <h4 className="text-white font-bold text-xs mb-2">Đường Dây Nóng Khẩn Cấp</h4>
                      <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1">
                        <p className="text-slate-300 font-bold text-[10px] uppercase">
                          {hospitalInfo.tieuDeCapCuu || 'CẤP CỨU 24/24'}
                        </p>
                        <p className="text-xl font-black text-emerald-400 tracking-wide">
                          {hospitalInfo.hotlineCapCuu || '1900 8888'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {hospitalInfo.khauHieuCapCuu || 'Luôn sẵn sàng tiếp nhận & xử trí y tế'}
                        </p>
                      </div>
                    </div>

                    {/* Copyright line */}
                    <div className="pt-4 border-t border-slate-800 text-center text-slate-500 text-[10px]">
                      {hospitalInfo.banQuyen || '© 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      ) : (
        /* ─── TAB 1 & TAB 2 MAIN TABLES ───────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="font-medium">Đang tải danh mục dữ liệu...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ─── TAB 1: KHOA / PHÒNG BAN ──────────────────────────── */}
              {activeTab === 'phong_ban' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Tên Khoa / Phòng Ban</th>
                      <th className="px-6 py-3.5">Mô Tả Chức Năng</th>
                      <th className="px-6 py-3.5 text-center">Nhân Sự Trực Thuộc</th>
                      <th className="px-6 py-3.5 text-center">Phòng Khám Thuộc Khoa</th>
                      <th className="px-6 py-3.5 text-right">Thao Tác Quản Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPhongBans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                          Không tìm thấy khoa / phòng ban nào phù hợp với tìm kiếm
                        </td>
                      </tr>
                    ) : (
                      filteredPhongBans.map((pb) => (
                        <tr key={pb.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono text-gray-500 text-xs font-semibold">#{pb.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                              <span>{pb.ten_phong_ban}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs max-w-md">
                            {pb.mo_ta || <span className="text-gray-400 italic">Chưa có mô tả chức năng</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Users className="w-3 h-3" /> {pb.so_nhan_su || 0} nhân sự
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <DoorOpen className="w-3 h-3" /> {pb.so_phong_kham || 0} phòng
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditPB(pb)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                title="Chỉnh sửa khoa / phòng ban"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ open: true, type: 'phong_ban', item: pb, loading: false })}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa khoa / phòng ban"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* ─── TAB 2: PHÒNG KHÁM THỰC TẾ ────────────────────────── */}
              {activeTab === 'phong_kham' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Tên Phòng Khám</th>
                      <th className="px-6 py-3.5">Chuyên Khoa</th>
                      <th className="px-6 py-3.5">Vị Trí Tầng / Khu</th>
                      <th className="px-6 py-3.5">Khoa Trực Thuộc</th>
                      <th className="px-6 py-3.5 text-center">Trạng Thái</th>
                      <th className="px-6 py-3.5 text-right">Thao Tác Quản Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPhongKhams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                          Không tìm thấy phòng khám thực tế nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredPhongKhams.map((pk) => {
                        const st = STATUS_LABELS[pk.trang_thai] || STATUS_LABELS.hoat_dong;
                        return (
                          <tr key={pk.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 font-mono text-gray-500 text-xs font-semibold">#{pk.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900 flex items-center gap-2">
                                <DoorOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span>{pk.ten_phong}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                <Stethoscope className="w-3 h-3 text-primary-600" />
                                {pk.chuyen_khoa || 'Khám chung'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span>{pk.vi_tri || 'Tầng 1'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                              {pk.ten_phong_ban || <span className="text-gray-400 italic">Chưa liên kết</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleQuickTogglePKStatus(pk)}
                                title="Nhấp để đổi trạng thái nhanh"
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${st.color}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {st.label}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditPK(pk)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                  title="Chỉnh sửa thông tin phòng khám"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteModal({ open: true, type: 'phong_kham', item: pk, loading: false })}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Xóa phòng khám"
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
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: KHOA / PHÒNG BAN (CREATE / EDIT) ───────────────── */}
      {modalPhongBan.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {modalPhongBan.mode === 'create' ? 'Thêm Mới Khoa / Phòng Ban' : 'Chỉnh Sửa Khoa / Phòng Ban'}
                </h3>
              </div>
              <button
                onClick={() => setModalPhongBan({ open: false, mode: 'create', data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPB} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Khoa / Phòng Ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khoa Răng Hàm Mặt, Phòng Vật Tư Y Tế..."
                  value={pbForm.tenPhongBan}
                  onChange={(e) => setPbForm({ ...pbForm, tenPhongBan: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mô Tả Chức Năng & Nhiệm Vụ
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chức năng chuyên môn của khoa phòng..."
                  value={pbForm.moTa}
                  onChange={(e) => setPbForm({ ...pbForm, moTa: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalPhongBan({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={pbSubmitting}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {pbSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {modalPhongBan.mode === 'create' ? 'Tạo mới' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PHÒNG KHÁM THỰC TẾ (CREATE / EDIT) ─────────────── */}
      {modalPhongKham.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {modalPhongKham.mode === 'create' ? 'Thêm Mới Phòng Khám Thực Tế' : 'Chỉnh Sửa Phòng Khám'}
                </h3>
              </div>
              <button
                onClick={() => setModalPhongKham({ open: false, mode: 'create', data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPK} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Phòng Khám <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng 105 - Khám Mắt & Đo Khúc Xạ"
                  value={pkForm.tenPhong}
                  onChange={(e) => setPkForm({ ...pkForm, tenPhong: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Chuyên Khoa Phụ Trách
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nội khoa, Mắt, Tai Mũi Họng..."
                    value={pkForm.chuyenKhoa}
                    onChange={(e) => setPkForm({ ...pkForm, chuyenKhoa: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Vị Trí Tầng / Khu
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tầng 1 - Khu B"
                    value={pkForm.viTri}
                    onChange={(e) => setPkForm({ ...pkForm, viTri: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Khoa / Phòng Ban Trực Thuộc
                  </label>
                  <select
                    value={pkForm.phongBanId}
                    onChange={(e) => setPkForm({ ...pkForm, phongBanId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- Chưa gắn khoa phòng --</option>
                    {data.phongBans.map(pb => (
                      <option key={pb.id} value={pb.id}>{pb.ten_phong_ban}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Trạng Thái Hoạt Động
                  </label>
                  <select
                    value={pkForm.trangThai}
                    onChange={(e) => setPkForm({ ...pkForm, trangThai: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="hoat_dong">Đang hoạt động</option>
                    <option value="bao_tri">Tạm bảo trì</option>
                    <option value="dong_cua">Đóng cửa / Ngừng</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalPhongKham({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={pkSubmitting}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {pkSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {modalPhongKham.mode === 'create' ? 'Tạo mới' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CONFIRM DELETE ──────────────────────────────────── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-center text-lg font-bold text-gray-900">
              Xác Nhận Xóa Dữ Liệu?
            </h3>

            <p className="text-center text-sm text-gray-500 mt-2">
              Bạn có chắc chắn muốn xóa {deleteModal.type === 'phong_ban' ? 'khoa / phòng ban' : 'phòng khám'}{' '}
              <span className="font-bold text-gray-900">
                "{deleteModal.type === 'phong_ban' ? deleteModal.item?.ten_phong_ban : deleteModal.item?.ten_phong}"
              </span>
              ?
            </p>

            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                {deleteModal.type === 'phong_ban'
                  ? 'Nếu khoa phòng đang có nhân viên hoặc phòng khám trực thuộc, hệ thống sẽ ngăn chặn việc xóa trực tiếp để bảo vệ dữ liệu.'
                  : 'Nếu phòng khám đã phát sinh lượt khám hoặc lịch hẹn thực tế, hệ thống sẽ tự động chuyển sang trạng thái "Đóng cửa" để bảo toàn hồ sơ bệnh án.'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, type: null, item: null, loading: false })}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteModal.loading}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {deleteModal.loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
