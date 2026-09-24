import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserCheck,
  Stethoscope,
  Clock,
  ShieldCheck,
  Eye,
  Phone,
  User,
  Mail,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { formatDate } from '../../../utils/formatDate';
import DanhGiaCaKhamModal from '../../../components/Appointment/DanhGiaCaKhamModal';

const CHUYEN_KHOA_LIST = [
  'Nội tổng quát',
  'Ngoại khoa',
  'Nhi khoa',
  'Tai Mũi Họng',
  'Tim mạch',
  'Cơ Xương Khớp',
  'Răng Hàm Mặt',
  'Mắt',
];

const ITEMS_PER_PAGE = 10;

const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function LichHenQuanLyPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Bộ lọc thời gian & Preset nhanh
  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const currentQuarter = useMemo(() => Math.floor(new Date().getMonth() / 3) + 1, []);

  const [activePreset, setActivePreset] = useState('hom_nay');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedQuarter, setSelectedQuarter] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterBacSiId, setFilterBacSiId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [bacSiList, setBacSiList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLichHen, setSelectedLichHen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [reviewModalData, setReviewModalData] = useState({
    isOpen: false,
    appointment: null,
  });

  // Quản lý bệnh nhân khi Tiếp nhận khám ngay
  const [patientMode, setPatientMode] = useState('account');
  const [patientAccounts, setPatientAccounts] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form tạo lịch hẹn mới tại quầy
  const [formData, setFormData] = useState({
    benhNhanId: null,
    hoTen: '',
    soDienThoai: '',
    ngayHen: formatLocalDate(new Date()),
    gioHen: '08:00',
    chuyenKhoa: '',
    bacSiId: '',
    lyDoKham: '',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    fetchBacSi();
  }, []);

  useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [fromDate, toDate, filterBacSiId]);

  const normalizeText = (text) => {
    return (text || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  };

  const getInitials = (name) => {
    if (!name) return 'BN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarBg = (name) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const fetchPatientAccounts = async () => {
    setLoadingPatients(true);
    try {
      const res = await apiGet('/benh-nhan', { limit: 200 });
      const items = res?.data || [];
      const withAccounts = items.filter(
        (p) => p.nguoiDungId != null || p.nguoi_dung_id != null || p.nguoiDung != null
      );
      setPatientAccounts(withAccounts);
    } catch (err) {
      console.error('Lỗi lấy danh sách bệnh nhân có tài khoản:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (showAddModal) {
      fetchPatientAccounts();
    }
  }, [showAddModal]);

  const filteredPatientAccounts = useMemo(() => {
    if (!patientSearch.trim()) return patientAccounts;
    const s = normalizeText(patientSearch);
    return patientAccounts.filter(
      (p) =>
        normalizeText(p.hoTen).includes(s) ||
        normalizeText(p.soDienThoai).includes(s) ||
        normalizeText(p.maBenhNhan).includes(s) ||
        normalizeText(p.email).includes(s) ||
        normalizeText(p.nguoiDung?.tenDangNhap).includes(s)
    );
  }, [patientAccounts, patientSearch]);

  const fetchBacSi = async () => {
    try {
      const res = await apiGet('/nhan-vien/bac-si-public');
      if (res.data) setBacSiList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (fromDate && toDate && fromDate === toDate) {
        params.ngay = fromDate;
      } else {
        if (fromDate) params.tuNgay = fromDate;
        if (toDate) params.denNgay = toDate;
      }
      if (filterBacSiId) params.bacSiId = filterBacSiId;

      const res = await apiGet('/lich-hen', params);
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.data || [];
        setList(items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetKey) => {
    const n = new Date();
    setActivePreset(presetKey);

    switch (presetKey) {
      case 'hom_nay': {
        const today = formatLocalDate(n);
        setFromDate(today);
        setToDate(today);
        setSelectedQuarter('');
        break;
      }
      case 'ngay_mai': {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        const tomStr = formatLocalDate(tom);
        setFromDate(tomStr);
        setToDate(tomStr);
        setSelectedQuarter('');
        break;
      }
      case '7_ngay_qua': {
        const p7 = new Date();
        p7.setDate(p7.getDate() - 6);
        setFromDate(formatLocalDate(p7));
        setToDate(formatLocalDate(n));
        setSelectedQuarter('');
        break;
      }
      case 'thang_nay': {
        const first = new Date(n.getFullYear(), n.getMonth(), 1);
        const last = new Date(n.getFullYear(), n.getMonth() + 1, 0);
        setFromDate(formatLocalDate(first));
        setToDate(formatLocalDate(last));
        setSelectedQuarter('');
        break;
      }
      case 'quy_nay': {
        const q = Math.floor(n.getMonth() / 3) + 1;
        const startMonth = (q - 1) * 3;
        const first = new Date(n.getFullYear(), startMonth, 1);
        const last = new Date(n.getFullYear(), startMonth + 3, 0);
        setFromDate(formatLocalDate(first));
        setToDate(formatLocalDate(last));
        setSelectedQuarter(String(q));
        break;
      }
      case 'all': {
        setFromDate('');
        setToDate('');
        setSelectedQuarter('');
        break;
      }
      default:
        break;
    }
  };

  const handleSelectQuarter = (qNum) => {
    const q = Number(qNum);
    if (!q) {
      handleSelectPreset('all');
      return;
    }
    const n = new Date();
    const startMonth = (q - 1) * 3;
    const first = new Date(n.getFullYear(), startMonth, 1);
    const last = new Date(n.getFullYear(), startMonth + 3, 0);
    setFromDate(formatLocalDate(first));
    setToDate(formatLocalDate(last));
    setActivePreset(`quy_${q}`);
    setSelectedQuarter(String(q));
  };

  const handleUpdateStatus = async (id, newStatus, currentVersion = 0) => {
    setActionLoadingId(id);
    try {
      await apiPatch(`/lich-hen/${id}/trang-thai`, {
        trangThai: newStatus,
        phienBan: currentVersion,
      });
      await fetchData();
      if (selectedLichHen?.id === id) {
        setSelectedLichHen((prev) => (prev ? { ...prev, trangThai: newStatus } : null));
      }
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAutoAssign = async (id) => {
    setActionLoadingId(id);
    try {
      await apiPost(`/lich-hen/${id}/tu-dong-phan-cong`);
      alert('Đã tự động tìm và phân công bác sĩ phù hợp.');
      await fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Chưa tìm được bác sĩ phù hợp cho lịch hẹn');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      let chosenSpecialty = formData.chuyenKhoa;
      if (formData.bacSiId) {
        const foundDoctor = bacSiList.find((bs) => bs.id === Number(formData.bacSiId));
        if (foundDoctor?.chuyenKhoa) {
          chosenSpecialty = foundDoctor.chuyenKhoa;
        }
      }

      const payload = {
        hoTen: formData.hoTen.trim(),
        soDienThoai: formData.soDienThoai.trim(),
        bacSiId: formData.bacSiId ? Number(formData.bacSiId) : null,
        chuyenKhoa: chosenSpecialty,
        ghiChu: formData.lyDoKham,
      };

      const res = await apiPost('/tiep-nhan/tai-quay', payload);
      alert(`Đã tiếp nhận bệnh nhân vào hàng đợi thành công!\n${res?.message || ''}`);
      setShowAddModal(false);
      setSelectedPatient(null);
      setFormData({
        benhNhanId: null,
        hoTen: '',
        soDienThoai: '',
        ngayHen: new Date().toISOString().split('T')[0],
        gioHen: '08:00',
        chuyenKhoa: '',
        bacSiId: '',
        lyDoKham: '',
      });
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi khi tiếp nhận khám ngay');
    }
  };

  const filteredBacSi = formData.chuyenKhoa
    ? bacSiList.filter((bs) => (bs.chuyenKhoa || '').toLowerCase().includes(formData.chuyenKhoa.toLowerCase()))
    : bacSiList;

  const handleTriggerReminder = async () => {
    setSendingReminder(true);
    try {
      const res = await apiPost('/lich-hen/nhac-lich-tu-dong');
      alert(`✓ KẾT QUẢ QUÉT NHẮC LỊCH:\n${res?.message || 'Đã gửi nhắc lịch thành công!'}`);
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Không thể gửi nhắc lịch tự động');
    } finally {
      setSendingReminder(false);
    }
  };

  // Tính toán thống kê nhanh
  const stats = useMemo(() => {
    const total = list.length;
    const choXacNhan = list.filter((lh) => lh.trangThai === 'cho_xac_nhan').length;
    const daXacNhan = list.filter((lh) => lh.trangThai === 'da_xac_nhan').length;
    const hoanThanh = list.filter((lh) => lh.trangThai === 'hoan_thanh').length;
    const daHuy = list.filter((lh) => lh.trangThai === 'da_huy').length;
    const choPhanCong = list.filter((lh) => !lh.bacSiId && lh.trangThai !== 'da_huy').length;

    return { total, choXacNhan, daXacNhan, hoanThanh, daHuy, choPhanCong };
  }, [list]);

  // Lọc tìm kiếm theo trạng thái và từ khóa
  const filteredList = useMemo(() => {
    let result = list;
    if (filterStatus) {
      result = result.filter((lh) => lh.trangThai === filterStatus);
    }
    if (debouncedKeyword.trim()) {
      const kw = normalizeText(debouncedKeyword);
      result = result.filter((lh) => {
        const bnName = normalizeText(lh.benhNhan?.hoTen);
        const bnPhone = normalizeText(lh.benhNhan?.soDienThoai);
        const bsName = normalizeText(lh.bacSi?.nhanVien?.hoTen);
        const ma = normalizeText(lh.maLichHen);
        return bnName.includes(kw) || bnPhone.includes(kw) || bsName.includes(kw) || ma.includes(kw);
      });
    }

    // Sắp xếp: Nếu trong 1 ngày duy nhất thì sắp theo giờ tăng dần (sáng -> chiều).
    // Nếu nhiều ngày thì ưu tiên ngày mới nhất trước, cùng ngày thì giờ tăng dần.
    return [...result].sort((a, b) => {
      const dateA = a.ngayHen ? String(a.ngayHen).slice(0, 10) : '';
      const dateB = b.ngayHen ? String(b.ngayHen).slice(0, 10) : '';
      if (fromDate && toDate && fromDate === toDate) {
        return (a.gioHen || '').localeCompare(b.gioHen || '');
      }
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // Ngày mới hơn lên đầu
      }
      return (a.gioHen || '').localeCompare(b.gioHen || '');
    });
  }, [list, filterStatus, debouncedKeyword, fromDate, toDate]);

  // Phân trang
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredList, currentPage]);

  return (
    <div className="space-y-5">
      {/* 1. Header tinh gọn */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Quản lý Lịch hẹn Khám bệnh
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
              Tiếp tân
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi, tiếp nhận, phê duyệt và điều phối bác sĩ khám bệnh cho bệnh nhân.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTriggerReminder}
            disabled={sendingReminder}
            title="Quét gửi email nhắc hẹn cho các lịch trong 24h tới"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Mail className={`h-3.5 w-3.5 ${sendingReminder ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">Quét & Nhắc hẹn 24h</span>
            <span className="sm:hidden">Nhắc hẹn</span>
          </button>

          <button
            onClick={fetchData}
            title="Làm mới dữ liệu"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-xs shadow-primary-500/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tiếp nhận khám ngay</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ Thống kê nhanh (Interactive Quick Filter Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Tổng số */}
        <div
          onClick={() => setFilterStatus('')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === ''
              ? 'bg-primary-50/70 border-primary-300 ring-2 ring-primary-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Tổng lịch hẹn</span>
            <Calendar className="h-4 w-4 text-primary-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Tất cả lịch trong hệ thống</div>
        </div>

        {/* Chờ xác nhận */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'cho_xac_nhan' ? '' : 'cho_xac_nhan')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'cho_xac_nhan'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">Chờ duyệt</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 mt-1">{stats.choXacNhan}</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">Cần tiếp tân phê duyệt</div>
        </div>

        {/* Đã xác nhận */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'da_xac_nhan' ? '' : 'da_xac_nhan')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'da_xac_nhan'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700">Đã xác nhận</span>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-900 mt-1">{stats.daXacNhan}</div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">Sẵn sàng đến khám</div>
        </div>

        {/* Hoàn thành */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'hoan_thanh' ? '' : 'hoan_thanh')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'hoan_thanh'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Đã hoàn thành</span>
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{stats.hoanThanh}</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Đã khám xong</div>
        </div>

        {/* Đã hủy */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'da_huy' ? '' : 'da_huy')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all col-span-2 sm:col-span-1 ${
            filterStatus === 'da_huy'
              ? 'bg-red-50/80 border-red-300 ring-2 ring-red-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-700">Đã hủy</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-xl font-bold text-red-900 mt-1">{stats.daHuy}</div>
          <div className="text-[11px] text-red-600/80 mt-0.5">Bệnh nhân / Quầy hủy</div>
        </div>
      </div>

      {/* 3. Bộ lọc & Tìm kiếm hiện đại */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Tìm kiếm từ khóa */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tên BN, SĐT, mã lịch..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all placeholder:text-gray-400"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc khoảng Ngày: Từ ngày -> Đến ngày */}
          <div className="lg:col-span-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className="text-[11px] font-medium text-gray-400 shrink-0">Từ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset('custom');
                  setSelectedQuarter('');
                }}
                className="w-full text-xs sm:text-sm bg-transparent border-0 outline-none text-gray-800 p-0"
              />
            </div>
            <span className="text-gray-300 select-none">-</span>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className="text-[11px] font-medium text-gray-400 shrink-0">Đến:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset('custom');
                  setSelectedQuarter('');
                }}
                className="w-full text-xs sm:text-sm bg-transparent border-0 outline-none text-gray-800 p-0"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                title="Xóa lọc ngày"
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Bác sĩ */}
          <div className="lg:col-span-2">
            <select
              value={filterBacSiId}
              onChange={(e) => setFilterBacSiId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all"
            >
              <option value="">-- Bác sĩ --</option>
              {bacSiList.map((bs) => (
                <option key={bs.id} value={bs.id}>
                  BS. {bs.hoTen}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng thái */}
          <div className="lg:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all"
            >
              <option value="">-- Trạng thái --</option>
              <option value="cho_thanh_toan">Chờ thanh toán cọc</option>
              <option value="cho_xac_nhan">Chờ xác nhận</option>
              <option value="da_xac_nhan">Đã xác nhận</option>
              <option value="hoan_thanh">Hoàn thành</option>
              <option value="da_huy">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Quick Date Presets & Filter Tags */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5 text-xs border-t border-gray-50">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-400 font-medium mr-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary-600" />
              Lọc nhanh:
            </span>

            {/* Hôm nay */}
            <button
              type="button"
              onClick={() => handleSelectPreset('hom_nay')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activePreset === 'hom_nay'
                  ? 'bg-primary-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Hôm nay
            </button>

            {/* Ngày mai */}
            <button
              type="button"
              onClick={() => handleSelectPreset('ngay_mai')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activePreset === 'ngay_mai'
                  ? 'bg-primary-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ngày mai
            </button>

            {/* 7 ngày qua */}
            <button
              type="button"
              onClick={() => handleSelectPreset('7_ngay_qua')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activePreset === '7_ngay_qua'
                  ? 'bg-primary-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              7 ngày qua
            </button>

            {/* Tháng này */}
            <button
              type="button"
              onClick={() => handleSelectPreset('thang_nay')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activePreset === 'thang_nay'
                  ? 'bg-primary-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tháng này
            </button>

            {/* Quý này */}
            <button
              type="button"
              onClick={() => handleSelectPreset('quy_nay')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activePreset === 'quy_nay'
                  ? 'bg-primary-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Quý này (Q{currentQuarter})
            </button>

            {/* Chọn Quý cụ thể */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedQuarter}
                onChange={(e) => handleSelectQuarter(e.target.value)}
                className={`px-2 py-1 rounded-lg font-medium text-xs border outline-none cursor-pointer transition-all ${
                  activePreset.startsWith('quy_') && activePreset !== 'quy_nay'
                    ? 'bg-primary-50 border-primary-300 text-primary-700 font-semibold'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <option value="">Chọn Quý...</option>
                <option value="1">Quý 1 (T1 - T3)</option>
                <option value="2">Quý 2 (T4 - T6)</option>
                <option value="3">Quý 3 (T7 - T9)</option>
                <option value="4">Quý 4 (T10 - T12)</option>
              </select>
            </div>

            {/* Tất cả ngày */}
            <button
              type="button"
              onClick={() => handleSelectPreset('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activePreset === 'all'
                  ? 'bg-gray-800 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả ngày
            </button>
          </div>

          <div className="text-gray-500">
            Hiển thị <strong className="text-gray-900">{filteredList.length}</strong> / {list.length} lịch hẹn
          </div>
        </div>
      </div>

      {/* 4. Bảng Lịch hẹn chuyên nghiệp & tinh tế */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mx-auto mb-3" />
            <p className="text-xs text-gray-500 font-medium">Đang tải danh sách lịch hẹn...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Không tìm thấy lịch hẹn phù hợp</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Vui lòng thử thay đổi điều kiện lọc ngày, bác sĩ hoặc từ khóa tìm kiếm.
              </p>
            </div>
            {(fromDate || toDate || filterStatus || filterBacSiId || searchKeyword) && (
              <button
                type="button"
                onClick={() => {
                  handleSelectPreset('all');
                  setFilterStatus('');
                  setFilterBacSiId('');
                  setSearchKeyword('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại tất cả bộ lọc</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3 px-4">Mã lịch hẹn</th>
                  <th className="py-3 px-4">Bệnh nhân</th>
                  <th className="py-3 px-4">Giờ & Ngày hẹn</th>
                  <th className="py-3 px-4">Bác sĩ phụ trách</th>
                  <th className="py-3 px-4">Tạm ứng cọc</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs text-gray-700">
                {paginatedList.map((lh) => {
                  const patientName = lh.benhNhan?.hoTen || 'Bệnh nhân';
                  const initials = getInitials(patientName);
                  const avatarColor = getAvatarBg(patientName);
                  const timeFormatted = lh.gioHen ? String(lh.gioHen).substring(0, 5) : '--:--';
                  const isToday = lh.ngayHen && lh.ngayHen.startsWith(todayStr);

                  return (
                    <tr
                      key={lh.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Mã Lịch Hẹn */}
                      <td className="py-3 px-4">
                        <span className="inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200/60 group-hover:border-primary-200 group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors">
                          {lh.maLichHen || `#${lh.id}`}
                        </span>
                      </td>

                      {/* Bệnh Nhân */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${avatarColor}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {patientName}
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span>{lh.benhNhan?.soDienThoai || '---'}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Ngày & Giờ Hẹn */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {timeFormatted}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <span>{formatDate(lh.ngayHen)}</span>
                          {isToday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bác Sĩ / Chuyên Khoa */}
                      <td className="py-3 px-4">
                        {lh.bacSi?.nhanVien?.hoTen ? (
                          <div>
                            <p className="font-bold text-gray-900 text-xs flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5 text-primary-600" />
                              BS. {lh.bacSi.nhanVien.hoTen}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {lh.bacSi.chuyenKhoa || 'Đa khoa'}
                            </p>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                            <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                            <span>Chờ phân công</span>
                          </div>
                        )}
                      </td>

                      {/* Tạm Ứng (1/5) */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 40.000 đ
                        </span>
                      </td>

                      {/* Trạng Thái */}
                      <td className="py-3 px-4">
                        <StatusBadge status={lh.trangThai} />
                      </td>

                      {/* Thao Tác Nhanh */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Xem Chi Tiết */}
                          <button
                            onClick={() => setSelectedLichHen(lh)}
                            title="Xem chi tiết lịch hẹn"
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Đánh Giá Bác Sĩ (Nếu đã hoàn thành) */}
                          {lh.trangThai === 'hoan_thanh' && (
                            <button
                              onClick={() =>
                                setReviewModalData({
                                  isOpen: true,
                                  appointment: {
                                    id: lh.id,
                                    lichHenId: lh.id,
                                    maLichHen: lh.maLichHen,
                                    ngayHen: lh.ngayHen,
                                    bacSi: lh.bacSi || { nhanVien: { hoTen: 'Bác sĩ phụ trách' } },
                                    chuyenKhoa: lh.bacSi?.chuyenKhoa || 'Đa khoa',
                                  },
                                })
                              }
                              title="Xem đánh giá của bệnh nhân"
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                            </button>
                          )}

                          {/* Phân Công Tự Động (Nếu chưa có Bác sĩ) */}
                          {!lh.bacSiId && lh.trangThai !== 'da_huy' && (
                            <button
                              onClick={() => handleAutoAssign(lh.id)}
                              disabled={actionLoadingId === lh.id}
                              title="Hệ thống tự động tìm và gán bác sĩ trực phù hợp"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100 rounded-lg transition-colors"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Gán BS</span>
                            </button>
                          )}

                          {/* Duyệt Nhanh (Nếu chờ xác nhận) */}
                          {lh.trangThai !== 'da_xac_nhan' &&
                            lh.trangThai !== 'da_huy' &&
                            lh.trangThai !== 'hoan_thanh' && (
                              <button
                                onClick={() => handleUpdateStatus(lh.id, 'da_xac_nhan', lh.phienBan)}
                                disabled={actionLoadingId === lh.id}
                                title="Xác nhận lịch hẹn cho bệnh nhân"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs transition-all active:scale-95"
                              >
                                <Check className="h-3 w-3" />
                                <span>Duyệt</span>
                              </button>
                            )}

                          {/* Hủy Lịch */}
                          {lh.trangThai !== 'da_huy' && lh.trangThai !== 'hoan_thanh' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc chắn muốn hủy lịch hẹn ${lh.maLichHen || ''}?`)) {
                                  handleUpdateStatus(lh.id, 'da_huy', lh.phienBan);
                                }
                              }}
                              disabled={actionLoadingId === lh.id}
                              title="Hủy lịch hẹn này"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Phân trang */}
        {filteredList.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50/40">
            <div>
              Hiển thị <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> -{' '}
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length)}</strong> trong{' '}
              <strong>{filteredList.length}</strong> kết quả
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-2.5 font-semibold text-gray-700">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Modal Xem Chi Tiết Lịch Hẹn */}
      {selectedLichHen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200 font-mono">
                  {selectedLichHen.maLichHen || `#${selectedLichHen.id}`}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">Chi tiết Lịch hẹn Khám bệnh</h3>
              </div>
              <button
                onClick={() => setSelectedLichHen(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-gray-700">
              {/* Thông tin Bệnh nhân */}
              <div className="bg-gray-50/90 p-3.5 rounded-xl border border-gray-100 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase text-gray-400 tracking-wide">
                  Thông tin Bệnh nhân
                </p>
                <p className="font-bold text-gray-900 text-base">
                  {selectedLichHen.benhNhan?.hoTen || 'Bệnh nhân'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                  <p>
                    Số điện thoại: <strong>{selectedLichHen.benhNhan?.soDienThoai || '---'}</strong>
                  </p>
                  <p>
                    Email: <strong>{selectedLichHen.benhNhan?.email || '---'}</strong>
                  </p>
                </div>
              </div>

              {/* Thời gian & Bác sĩ */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/60">
                  <p className="text-[11px] text-blue-700 font-semibold">Thời gian hẹn:</p>
                  <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">
                    {selectedLichHen.gioHen ? String(selectedLichHen.gioHen).substring(0, 5) : '--:--'}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{formatDate(selectedLichHen.ngayHen)}</p>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/60">
                  <p className="text-[11px] text-blue-700 font-semibold">Bác sĩ phụ trách:</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">
                    {selectedLichHen.bacSi?.nhanVien?.hoTen
                      ? `BS. ${selectedLichHen.bacSi.nhanVien.hoTen}`
                      : 'Chưa phân công'}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {selectedLichHen.bacSi?.chuyenKhoa || 'Đa khoa'}
                  </p>
                </div>
              </div>

              {/* Tạm ứng cọc */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/70 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-800 font-medium">Khoản tạm ứng (1/5 phí khám):</p>
                  <p className="text-base font-extrabold text-emerald-700">40.000 đ</p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                  Đã xác nhận cọc
                </span>
              </div>

              {/* Lý do khám */}
              {selectedLichHen.lyDoKham && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">Lý do khám / Triệu chứng:</p>
                  <p className="text-xs sm:text-sm text-gray-800 mt-1 leading-relaxed">
                    {selectedLichHen.lyDoKham}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedLichHen(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Đóng
              </button>

              {selectedLichHen.trangThai === 'hoan_thanh' && (
                <button
                  onClick={() => {
                    setSelectedLichHen(null);
                    setReviewModalData({
                      isOpen: true,
                      appointment: {
                        id: selectedLichHen.id,
                        lichHenId: selectedLichHen.id,
                        maLichHen: selectedLichHen.maLichHen,
                        ngayHen: selectedLichHen.ngayHen,
                        bacSi: selectedLichHen.bacSi || { nhanVien: { hoTen: 'Bác sĩ phụ trách' } },
                        chuyenKhoa: selectedLichHen.bacSi?.chuyenKhoa || 'Đa khoa',
                      },
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors"
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  <span>Xem đánh giá</span>
                </button>
              )}

              {selectedLichHen.trangThai !== 'da_xac_nhan' &&
                selectedLichHen.trangThai !== 'da_huy' &&
                selectedLichHen.trangThai !== 'hoan_thanh' && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedLichHen.id, 'da_xac_nhan', selectedLichHen.phienBan)
                    }
                    className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-all"
                  >
                    Duyệt lịch hẹn
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Tiếp nhận bệnh nhân khám ngay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tiếp nhận bệnh nhân khám ngay</h3>
                <p className="text-xs text-gray-500">Cấp số thứ tự và phân phòng khám trực tiếp tại quầy</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chuyển đổi Mode: Tài khoản vs Vãng lai */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setPatientMode('account')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  patientMode === 'account'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Bệnh nhân có tài khoản ({patientAccounts.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientMode('manual');
                  setSelectedPatient(null);
                  setFormData((prev) => ({ ...prev, benhNhanId: null }));
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  patientMode === 'manual'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <User className="h-4 w-4" />
                Bệnh nhân mới / Vãng lai
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs sm:text-sm">
              {patientMode === 'account' && (
                <div className="space-y-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-900">
                      Tìm tài khoản bệnh nhân đã có *
                    </label>
                    {selectedPatient && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setFormData((prev) => ({ ...prev, benhNhanId: null, hoTen: '', soDienThoai: '' }));
                        }}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Chọn bệnh nhân khác
                      </button>
                    )}
                  </div>

                  {!selectedPatient ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Tìm nhanh theo Họ tên, SĐT, Mã BN..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 text-gray-800"
                        />
                      </div>

                      <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-inner">
                        {loadingPatients ? (
                          <div className="p-4 text-center text-xs text-gray-500">
                            Đang tải danh sách tài khoản...
                          </div>
                        ) : filteredPatientAccounts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-500">
                            Không tìm thấy tài khoản bệnh nhân nào phù hợp. Bạn có thể chuyển sang tab &quot;Bệnh
                            nhân mới / Vãng lai&quot;.
                          </div>
                        ) : (
                          filteredPatientAccounts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedPatient(p);
                                setFormData((prev) => ({
                                  ...prev,
                                  benhNhanId: p.id,
                                  hoTen: p.hoTen,
                                  soDienThoai: p.soDienThoai || '',
                                }));
                              }}
                              className="p-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900">{p.hoTen}</span>
                                  <span className="font-mono text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                                    {p.maBenhNhan}
                                  </span>
                                </div>
                                <p className="text-gray-500 text-[11px] mt-0.5">
                                  SĐT: <span className="font-medium text-gray-700">{p.soDienThoai || 'Chưa cập nhật'}</span>
                                  {p.nguoiDung?.tenDangNhap && ` · TK: ${p.nguoiDung.tenDangNhap}`}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3" /> Đã liên kết
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-3 border border-blue-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{selectedPatient.hoTen}</span>
                          <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                            {selectedPatient.maBenhNhan}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          Đã chọn
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        SĐT: <span className="font-semibold text-gray-800">{selectedPatient.soDienThoai || 'Chưa có'}</span>
                        {selectedPatient.ngaySinh && ` · Ngày sinh: ${formatDate(selectedPatient.ngaySinh)}`}
                        {selectedPatient.gioiTinh && ` · Giới tính: ${selectedPatient.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Họ và tên bệnh nhân *</label>
                <input
                  type="text"
                  required
                  value={formData.hoTen}
                  onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                  placeholder="Nhập họ tên bệnh nhân..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Số điện thoại *</label>
                <input
                  type="text"
                  required
                  value={formData.soDienThoai}
                  onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                  placeholder="0912345678..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Chuyên khoa *</label>
                <select
                  required
                  value={formData.chuyenKhoa}
                  onChange={(e) => setFormData({ ...formData, chuyenKhoa: e.target.value, bacSiId: '' })}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 text-gray-800"
                >
                  <option value="">-- Chọn chuyên khoa để hệ thống phân công --</option>
                  {CHUYEN_KHOA_LIST.map((ck) => (
                    <option key={ck} value={ck}>
                      {ck}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Bác sĩ phụ trách (Tùy chọn)</label>
                <select
                  value={formData.bacSiId}
                  onChange={(e) => setFormData({ ...formData, bacSiId: e.target.value })}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 text-gray-800"
                >
                  <option value="">-- Hệ thống tự chọn bác sĩ ít tải nhất --</option>
                  {filteredBacSi.map((bs) => (
                    <option key={bs.id} value={bs.id}>
                      BS. {bs.hoTen} ({bs.chuyenKhoa || 'Đa khoa'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Triệu chứng / Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.lyDoKham}
                  onChange={(e) => setFormData({ ...formData, lyDoKham: e.target.value })}
                  placeholder="Triệu chứng ban đầu..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  Đưa vào hàng đợi & Cấp STT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal Đánh giá ca khám */}
      {reviewModalData.isOpen && (
        <DanhGiaCaKhamModal
          isOpen={reviewModalData.isOpen}
          onClose={() => setReviewModalData({ isOpen: false, appointment: null })}
          appointment={reviewModalData.appointment}
        />
      )}
    </div>
  );
}
