import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../services/api';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  AlertTriangle,
  User,
  RefreshCw,
  MessageSquare,
  Check,
  X,
  Search,
  Calendar,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  PackageCheck,
  CalendarOff,
  Shuffle,
  HelpCircle,
} from 'lucide-react';

const TRANG_THAI_CONFIG = {
  cho_xu_ly: { label: 'Chờ phê duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200/80', icon: Clock },
  da_xu_ly: { label: 'Đã phê duyệt', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', icon: CheckCircle2 },
  tu_choi: { label: 'Đã từ chối', bg: 'bg-rose-50 text-rose-700 border-rose-200/80', icon: XCircle },
  da_huy: { label: 'Đã hủy', bg: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle },
};

const ROLE_PRESETS = [
  { value: 'all', label: 'Tất cả nhân sự' },
  { value: 'bac_si', label: 'Bác sĩ' },
  { value: 'tiep_tan', label: 'Tiếp tân / Lễ tân' },
  { value: 'duoc_si', label: 'Dược sĩ' },
  { value: 'xet_nghiem', label: 'Kỹ thuật viên xét nghiệm' },
  { value: 'thu_ngan', label: 'Thu ngân' },
];

const LOAI_DON_PRESETS = [
  { value: 'all', label: 'Tất cả loại đơn' },
  { value: 'Yêu cầu hủy ca khám', label: 'Yêu cầu hủy ca khám' },
  { value: 'Đề xuất vật tư y tế', label: 'Đề xuất vật tư y tế' },
  { value: 'Xin nghỉ phép', label: 'Xin nghỉ phép' },
  { value: 'Đề xuất đổi ca trực', label: 'Đổi ca trực' },
];

const ITEMS_PER_PAGE = 6;

export default function DuyetYeuCauPage() {
  const [searchParams] = useSearchParams();
  const donIdParam = searchParams.get('donId');

  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('cho_xu_ly');
  const [filterRole, setFilterRole] = useState('all');
  const [filterLoaiDon, setFilterLoaiDon] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedDon, setSelectedDon] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('Ban Giám Đốc đã phê duyệt');
  const [targetDonId, setTargetDonId] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Query tất cả danh sách đơn từ (để tính toán stats và lọc tức thì mượt mà)
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['danh-sach-don-tu'],
    queryFn: () => apiGet('/quan-ly/don-tu?trangThai=all'),
  });

  const rawList = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data)
    ? data
    : [];

  // Tự động mở đơn khi click từ Thông báo
  useEffect(() => {
    if (donIdParam) {
      setFilterStatus('all');
    }
  }, [donIdParam]);

  useEffect(() => {
    if (donIdParam && rawList.length > 0) {
      const found = rawList.find((d) => d.id === Number(donIdParam));
      if (found) {
        setSelectedDon(found);
      }
    }
  }, [donIdParam, rawList]);

  // Mutation Phê duyệt / Từ chối
  const duyetMutation = useMutation({
    mutationFn: ({ id, action, ghiChuXuLy }) =>
      apiPatch(`/quan-ly/don-tu/${id}/duyet`, { action, ghiChuXuLy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['danh-sach-don-tu'] });
      queryClient.invalidateQueries({ queryKey: ['giam-doc-dashboard'] });
      setRejectModalOpen(false);
      setRejectReason('');
      setApproveModalOpen(false);
      setApproveNote('Ban Giám Đốc đã phê duyệt');
      setSelectedDon(null);
    },
  });

  const handleOpenApprove = (don) => {
    setTargetDonId(don.id);
    if (don.loaiDon === 'Yêu cầu hủy ca khám') {
      setApproveNote(
        'Ban Giám Đốc đồng ý phê duyệt hủy ca khám. Hệ thống tự động hoàn tiền 100% tạm ứng cho bệnh nhân.'
      );
    } else {
      setApproveNote('Ban Giám Đốc đã phê duyệt.');
    }
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = () => {
    duyetMutation.mutate({
      id: targetDonId,
      action: 'duyet',
      ghiChuXuLy: approveNote.trim() || 'Ban Giám Đốc đã phê duyệt',
    });
  };

  const handleOpenReject = (id) => {
    setTargetDonId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối yêu cầu.');
      return;
    }
    duyetMutation.mutate({
      id: targetDonId,
      action: 'tu_choi',
      ghiChuXuLy: rejectReason.trim(),
    });
  };

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

  // Hàm kiểm tra vai trò khớp
  const matchesRole = (d, roleKey) => {
    if (!roleKey || roleKey === 'all') return true;
    const target = roleKey.toLowerCase();
    const cv = normalizeText(d.nguoiGui?.chucVu);
    const vt = normalizeText(d.nguoiGui?.maVaiTro || d.nguoiGui?.tenVaiTro);

    if (target === 'bac_si') {
      return cv.includes('bac si') || cv.includes('bac_si') || vt.includes('bac_si') || vt.includes('bac si');
    }
    if (target === 'tiep_tan') {
      return (
        cv.includes('tiep tan') ||
        cv.includes('le tan') ||
        cv.includes('tiep_tan') ||
        vt.includes('tiep_tan') ||
        vt.includes('le tan')
      );
    }
    if (target === 'duoc_si') {
      return cv.includes('duoc') || cv.includes('duoc_si') || vt.includes('duoc_si');
    }
    if (target === 'xet_nghiem') {
      return cv.includes('xet nghiem') || cv.includes('xet_nghiem') || vt.includes('xet_nghiem');
    }
    if (target === 'thu_ngan') {
      return cv.includes('thu ngan') || cv.includes('thu_ngan') || vt.includes('thu_ngan');
    }
    return cv.includes(target) || vt.includes(target);
  };

  // Hàm kiểm tra ngày tháng
  const matchesDate = (d, from, to) => {
    if (!from && !to) return true;
    if (!d.ngayGui) return false;
    const dStr = typeof d.ngayGui === 'string' ? d.ngayGui.substring(0, 10) : new Date(d.ngayGui).toISOString().substring(0, 10);
    if (from && dStr < from) return false;
    if (to && dStr > to) return false;
    return true;
  };

  // Lọc đa tiêu chí
  const filteredDonList = useMemo(() => {
    let result = rawList;

    // 1. Lọc trạng thái
    if (filterStatus && filterStatus !== 'all') {
      result = result.filter((d) => d.trangThai === filterStatus);
    }

    // 2. Lọc vai trò
    if (filterRole && filterRole !== 'all') {
      result = result.filter((d) => matchesRole(d, filterRole));
    }

    // 3. Lọc loại đơn
    if (filterLoaiDon && filterLoaiDon !== 'all') {
      result = result.filter((d) => d.loaiDon === filterLoaiDon);
    }

    // 4. Lọc ngày
    if (filterDateFrom || filterDateTo) {
      result = result.filter((d) => matchesDate(d, filterDateFrom, filterDateTo));
    }

    // 5. Tìm kiếm từ khóa
    if (debouncedKeyword.trim()) {
      const kw = normalizeText(debouncedKeyword);
      result = result.filter((d) => {
        const senderName = normalizeText(d.nguoiGui?.hoTen);
        const roleName = normalizeText(d.nguoiGui?.chucVu || d.nguoiGui?.tenVaiTro);
        const title = normalizeText(d.loaiDon);
        const content = normalizeText(d.noiDung);
        const reply = normalizeText(d.ghiChuXuLy);
        return (
          senderName.includes(kw) ||
          roleName.includes(kw) ||
          title.includes(kw) ||
          content.includes(kw) ||
          reply.includes(kw)
        );
      });
    }

    return result;
  }, [rawList, filterStatus, filterRole, filterLoaiDon, filterDateFrom, filterDateTo, debouncedKeyword]);

  // Thống kê nhanh theo các tiêu chí khác (vai trò, ngày, keyword) đang active
  const stats = useMemo(() => {
    let base = rawList;
    if (filterRole && filterRole !== 'all') {
      base = base.filter((d) => matchesRole(d, filterRole));
    }
    if (filterLoaiDon && filterLoaiDon !== 'all') {
      base = base.filter((d) => d.loaiDon === filterLoaiDon);
    }
    if (filterDateFrom || filterDateTo) {
      base = base.filter((d) => matchesDate(d, filterDateFrom, filterDateTo));
    }
    if (debouncedKeyword.trim()) {
      const kw = normalizeText(debouncedKeyword);
      base = base.filter((d) => {
        const senderName = normalizeText(d.nguoiGui?.hoTen);
        const roleName = normalizeText(d.nguoiGui?.chucVu || d.nguoiGui?.tenVaiTro);
        const title = normalizeText(d.loaiDon);
        const content = normalizeText(d.noiDung);
        return senderName.includes(kw) || roleName.includes(kw) || title.includes(kw) || content.includes(kw);
      });
    }

    const choXuLy = base.filter((d) => d.trangThai === 'cho_xu_ly').length;
    const daXuLy = base.filter((d) => d.trangThai === 'da_xu_ly').length;
    const tuChoi = base.filter((d) => d.trangThai === 'tu_choi').length;
    const total = base.length;
    return { choXuLy, daXuLy, tuChoi, total };
  }, [rawList, filterRole, filterLoaiDon, filterDateFrom, filterDateTo, debouncedKeyword]);

  // Phân trang
  const totalPages = Math.ceil(filteredDonList.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDonList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDonList, currentPage]);

  const getLoaiDonBadge = (loaiDon) => {
    if (loaiDon?.includes('hủy ca')) {
      return {
        icon: CalendarOff,
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    }
    if (loaiDon?.includes('vật tư') || loaiDon?.includes('thiết bị')) {
      return {
        icon: PackageCheck,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      };
    }
    if (loaiDon?.includes('nghỉ')) {
      return {
        icon: Calendar,
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (loaiDon?.includes('đổi ca')) {
      return {
        icon: Shuffle,
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      };
    }
    return {
      icon: FileText,
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      dot: 'bg-gray-400',
    };
  };

  const getRoleBadge = (roleText) => {
    const text = (roleText || '').toLowerCase();
    if (text.includes('bác sĩ') || text.includes('bac_si')) {
      return 'bg-blue-100/70 text-blue-800 border-blue-200';
    }
    if (text.includes('tiếp tân') || text.includes('lễ tân') || text.includes('tiep_tan')) {
      return 'bg-emerald-100/70 text-emerald-800 border-emerald-200';
    }
    if (text.includes('dược') || text.includes('duoc_si')) {
      return 'bg-teal-100/70 text-teal-800 border-teal-200';
    }
    if (text.includes('xét nghiệm') || text.includes('xet_nghiem')) {
      return 'bg-violet-100/70 text-violet-800 border-violet-200';
    }
    if (text.includes('thu ngân') || text.includes('thu_ngan')) {
      return 'bg-amber-100/70 text-amber-800 border-amber-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const handleQuickDate = (daysAgo) => {
    const now = new Date();
    if (daysAgo === 0) {
      const todayStr = now.toISOString().split('T')[0];
      setFilterDateFrom(todayStr);
      setFilterDateTo(todayStr);
    } else if (daysAgo === 7) {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setFilterDateFrom(past.toISOString().split('T')[0]);
      setFilterDateTo(now.toISOString().split('T')[0]);
    } else if (daysAgo === 30) {
      const past = new Date();
      past.setDate(1); // Đầu tháng
      setFilterDateFrom(past.toISOString().split('T')[0]);
      setFilterDateTo(now.toISOString().split('T')[0]);
    } else {
      setFilterDateFrom('');
      setFilterDateTo('');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* 1. Header tinh gọn */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Phê Duyệt Đơn Yêu Cầu
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Ban Giám Đốc
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Xem xét và phê duyệt đơn xin nghỉ phép, đề xuất vật tư, đổi ca hoặc hủy ca khám từ nhân sự phòng khám.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Thống kê trạng thái nhanh (Interactive Quick-Filter Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Chờ phê duyệt */}
        <div
          onClick={() => {
            setFilterStatus('cho_xu_ly');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'cho_xu_ly'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Chờ phê duyệt</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{stats.choXuLy}</div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Cần Giám Đốc xử lý</div>
        </div>

        {/* Đã duyệt */}
        <div
          onClick={() => {
            setFilterStatus('da_xu_ly');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'da_xu_ly'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800">Đã phê duyệt</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.daXuLy}</div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Đã chấp thuận</div>
        </div>

        {/* Đã từ chối */}
        <div
          onClick={() => {
            setFilterStatus('tu_choi');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'tu_choi'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800">Đã từ chối</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{stats.tuChoi}</div>
          <div className="text-[11px] text-rose-700/80 mt-0.5">Đã gửi phản hồi</div>
        </div>

        {/* Tất cả đơn */}
        <div
          onClick={() => {
            setFilterStatus('all');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'all'
              ? 'bg-primary-50/80 border-primary-300 ring-2 ring-primary-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Tất cả đơn</span>
            <FileText className="h-4 w-4 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Toàn bộ hồ sơ</div>
        </div>
      </div>

      {/* 3. Bộ lọc Đa năng: Theo Nhân Sự / Bác Sĩ / Tiếp Tân, Loại Đơn & Ngày Tháng */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Ô Tìm kiếm từ khóa */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tên nhân sự, nội dung đơn..."
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

          {/* Lọc theo Bộ phận / Vai trò (Bác sĩ, Tiếp tân, Dược sĩ...) */}
          <div className="lg:col-span-3">
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              {ROLE_PRESETS.map((r) => (
                <option key={r.value} value={r.value}>
                  👤 {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Loại đơn */}
          <div className="lg:col-span-3">
            <select
              value={filterLoaiDon}
              onChange={(e) => {
                setFilterLoaiDon(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              {LOAI_DON_PRESETS.map((ld) => (
                <option key={ld.value} value={ld.value}>
                  📋 {ld.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Trạng thái */}
          <div className="lg:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="cho_xu_ly">Chờ phê duyệt</option>
              <option value="da_xu_ly">Đã phê duyệt</option>
              <option value="tu_choi">Đã từ chối</option>
            </select>
          </div>
        </div>

        {/* Lọc theo Ngày tháng & Preset nhanh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-medium">Khoảng thời gian:</span>
            <div className="flex items-center gap-1.5 bg-gray-50/80 p-1 rounded-xl border border-gray-200">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-1"
                placeholder="Từ ngày"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-1"
                placeholder="Đến ngày"
              />
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick date chips */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleQuickDate(0)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                Hôm nay
              </button>
              <button
                onClick={() => handleQuickDate(7)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                7 ngày qua
              </button>
              <button
                onClick={() => handleQuickDate(30)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                Tháng này
              </button>
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => handleQuickDate(-1)}
                  className="px-2 py-1 text-xs text-primary-600 hover:underline font-semibold"
                >
                  Tất cả ngày
                </button>
              )}
            </div>
          </div>

          <div className="text-gray-500">
            Hiển thị <strong className="text-gray-900">{filteredDonList.length}</strong> / {rawList.length} đơn yêu cầu
          </div>
        </div>
      </div>

      {/* 4. Danh sách Thẻ Đơn Yêu Cầu Gọn Gàng & Chuyên Nghiệp */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mx-auto mb-3" />
            <p className="text-xs font-medium">Đang tải danh sách đơn từ...</p>
          </div>
        ) : filteredDonList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
              <FileText className="h-6 w-6" />
            </div>
            <p className="font-bold text-gray-700 text-sm">Không có đơn yêu cầu nào phù hợp</p>
            <p className="text-xs text-gray-400">
              Mọi đề xuất, đơn xin nghỉ phép, đổi ca từ nhân viên sẽ hiển thị tại đây khi được tạo.
            </p>
            {(filterRole !== 'all' ||
              filterLoaiDon !== 'all' ||
              filterStatus !== 'all' ||
              filterDateFrom ||
              filterDateTo ||
              searchKeyword) && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterRole('all');
                  setFilterLoaiDon('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearchKeyword('');
                }}
                className="text-xs font-semibold text-primary-600 hover:underline pt-2 inline-block cursor-pointer"
              >
                Đặt lại toàn bộ bộ lọc
              </button>
            )}
          </div>
        ) : (
          paginatedList.map((don) => {
            const st = TRANG_THAI_CONFIG[don.trangThai] || TRANG_THAI_CONFIG.cho_xu_ly;
            const badgeType = getLoaiDonBadge(don.loaiDon);
            const TypeIcon = badgeType.icon;
            const roleBadgeClass = getRoleBadge(don.nguoiGui?.chucVu || don.nguoiGui?.tenVaiTro);

            return (
              <div
                key={don.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all space-y-3.5 group"
              >
                {/* Header card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${badgeType.color}`}
                    >
                      <TypeIcon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base tracking-tight">
                          {don.loaiDon}
                        </h3>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${roleBadgeClass}`}
                        >
                          {don.nguoiGui?.chucVu || don.nguoiGui?.tenVaiTro || 'Nhân viên'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                        <span>
                          Người gửi: <strong className="text-gray-800 font-semibold">{don.nguoiGui?.hoTen}</strong>
                        </span>
                        {don.nguoiGui?.soDienThoai && (
                          <span>· SĐT: <span className="font-medium text-gray-700">{don.nguoiGui.soDienThoai}</span></span>
                        )}
                        <span>· Gửi lúc: {formatDateTime(don.ngayGui)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trạng thái Badge */}
                  <div className="self-start sm:self-center">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${st.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.bg.includes('emerald') ? 'bg-emerald-500' : st.bg.includes('rose') ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      {st.label}
                    </span>
                  </div>
                </div>

                {/* Nội dung trình */}
                <div className="bg-gray-50/80 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm text-gray-800 leading-relaxed border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                    Nội dung trình:
                  </p>
                  <p className="whitespace-pre-line text-gray-700">{don.noiDung}</p>
                </div>

                {/* Cảnh báo quy trình nếu là đơn Hủy ca khám */}
                {don.loaiDon === 'Yêu cầu hủy ca khám' && (
                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-800">Quy trình Hủy ca khám & Hoàn tiền tự động</p>
                      <p className="text-[11px] text-rose-700 mt-0.5 leading-normal">
                        Khi Giám Đốc bấm duyệt, ca khám sẽ chuyển sang <strong>Đã hủy</strong>, đồng thời hệ thống tự động <strong>hoàn trả 100% tiền tạm ứng 40.000đ</strong> và thông báo trực tiếp đến bệnh nhân.
                      </p>
                    </div>
                  </div>
                )}

                {/* Phản hồi / Ý kiến của Giám Đốc */}
                {don.ghiChuXuLy && (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-blue-900 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                        Ý kiến chỉ đạo của Giám Đốc:
                      </p>
                      {don.ngayXuLy && (
                        <span className="text-[10px] text-blue-600 font-medium">
                          Xử lý: {formatDateTime(don.ngayXuLy)}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-800 pl-5">{don.ghiChuXuLy}</p>
                  </div>
                )}

                {/* Nút thao tác khi đơn còn chờ phê duyệt */}
                {don.trangThai === 'cho_xu_ly' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenReject(don.id)}
                      disabled={duyetMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Từ chối</span>
                    </button>

                    <button
                      onClick={() => handleOpenApprove(don)}
                      disabled={duyetMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-emerald-600/20 active:scale-95 cursor-pointer"
                      data-testid={`btn-approve-${don.id}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Phê duyệt</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* 5. Phân trang */}
        {filteredDonList.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-100 text-xs text-gray-500 shadow-xs">
            <div>
              Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> (
              <strong>{filteredDonList.length}</strong> đơn)
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Modal Phê duyệt yêu cầu */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Phê Duyệt Đơn Yêu Cầu
              </h3>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Nhập ý kiến chỉ đạo hoặc ghi chú phản hồi gửi trực tiếp đến nhân viên:
            </p>

            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="VD: Ban Giám Đốc đồng ý phê duyệt..."
              rows={3}
              className="w-full text-xs sm:text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
              data-testid="textarea-approve-note"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={duyetMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                data-testid="btn-confirm-approve"
              >
                {duyetMutation.isPending ? 'Đang xử lý...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Từ chối yêu cầu */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 text-rose-700">
                <XCircle className="h-5 w-5 text-rose-600" /> Từ Chối Đơn Yêu Cầu
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Vui lòng nhập lý do từ chối để hệ thống gửi thông báo phản hồi cho nhân viên:
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Không thể duyệt do ca trực ngày này đang thiếu người..."
              rows={3}
              className="w-full text-xs sm:text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-800"
              data-testid="textarea-reject-reason"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={duyetMutation.isPending || !rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                data-testid="btn-confirm-reject"
              >
                {duyetMutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
