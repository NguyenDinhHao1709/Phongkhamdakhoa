import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../../store/authStore';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import InBaoCaoModal from '../../../components/Print/InBaoCaoModal';
import { apiGet } from '../../../services/api';
import {
  Users, Pill, FlaskConical, BarChart3, TrendingUp, CheckCircle2,
  Clock, Sparkles, HeartHandshake, Star, Calendar,
  Printer, FileSpreadsheet, RotateCcw, Filter, AlertCircle, Eye, ArrowUpRight,
  Search, Stethoscope, Baby, UserCheck, ShieldAlert, MessageSquare, ShieldCheck
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function ThongKeBacSiPage() {
  const { user } = useAuthStore();

  // State bộ lọc (Filter states)
  const [timeRange, setTimeRange] = useState('thang_nay'); // 'hom_nay' | 'tuan_nay' | 'thang_nay' | 'quy_nay' | 'custom'
  const [hinhThuc, setHinhThuc] = useState('all'); // 'all' | 'truc_tiep' | 'truc_tuyen'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // State modal in và tìm kiếm ca khám
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [searchCaKham, setSearchCaKham] = useState('');
  const [filterReviewStar, setFilterReviewStar] = useState('all'); // 'all' | 5 | 4 | 3 | 2 | 1
  const [searchReview, setSearchReview] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['thong-ke-bac-si', user?.id, timeRange, hinhThuc, fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timeRange) params.append('range', timeRange);
      if (hinhThuc !== 'all') params.append('hinhThuc', hinhThuc);
      if (fromDate) params.append('tuNgay', fromDate);
      if (toDate) params.append('denNgay', toDate);
      return apiGet(`/ho-so-benh-an/thong-ke-bac-si?${params.toString()}`);
    },
    staleTime: 0,
    enabled: !!user?.id,
  });

  // Fetch dữ liệu đánh giá & CSAT thực tế từ bệnh nhân
  const { data: danhGiaData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['thong-ke-danh-gia-bac-si', user?.id, timeRange, hinhThuc, fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timeRange) params.append('range', timeRange);
      if (hinhThuc !== 'all') params.append('hinhThuc', hinhThuc);
      if (fromDate) params.append('tuNgay', fromDate);
      if (toDate) params.append('denNgay', toDate);
      return apiGet(`/danh-gia/bac-si?${params.toString()}`);
    },
    staleTime: 0,
    enabled: !!user?.id,
  });

  const rawReviews = danhGiaData?.data?.data || danhGiaData?.data || danhGiaData || {};
  const reviews = {
    tongDanhGia: rawReviews.tongDanhGia || 0,
    diemBacSiTB: rawReviews.diemBacSiTB || 5.0,
    diemTrungBinhChung: rawReviews.diemTrungBinhChung || 5.0,
    tyLeHaiLong: rawReviews.tyLeHaiLong || '100%',
    phanBoSao: rawReviews.phanBoSao || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    danhSachNhanXet: Array.isArray(rawReviews.danhSachNhanXet) ? rawReviews.danhSachNhanXet : [],
  };

  const stats = data?.data || {
    thongTinBacSi: {
      hoTen: user?.hoTen || 'Bác sĩ chuyên khoa',
      chuyenKhoa: 'Đa khoa',
      maBacSi: 'BS001',
    },
    tongBenhNhanDaKham: 0,
    dangChoKham: 0,
    thoiGianKhamTrungBinh: '12.5 phút/ca',
    tongChiDinhCLS: 0,
    tongDonThuocKe: 0,
    tyLeHoanThanh: '100%',
    coCauBenhLy: [],
    coCauDoTuoi: {
      treEm: { count: 12, pct: '24.0%' },
      truongThanh: { count: 28, pct: '56.0%' },
      nguoiCaoTuoi: { count: 10, pct: '20.0%' },
    },
    benhNhanMoiVsTaiKham: {
      khamMoi: { count: 35, pct: '70.0%' },
      taiKham: { count: 15, pct: '30.0%' },
    },
    danhSachCaKham: [],
    aiTriageMetrics: {
      tyLeDongThuanAI: '92.4%',
      tyLeDieuChinh: '7.6%',
      soCaCanhBaoSom: 4,
      moTa: '92.4% chẩn đoán của Bác sĩ trùng khớp với phân luồng chuyên khoa tự động của AI Triage.',
    },
    khungGioCaoDiem: [
      { gio: '08:00 - 09:00', trucTiep: 14, trucTuyen: 4, benhNhan: 18, congSuat: 'Cao' },
      { gio: '09:00 - 10:00', trucTiep: 20, trucTuyen: 6, benhNhan: 26, congSuat: 'Đỉnh điểm' },
      { gio: '10:00 - 11:00', trucTiep: 17, trucTuyen: 5, benhNhan: 22, congSuat: 'Cao' },
      { gio: '11:00 - 12:00', trucTiep: 8, trucTuyen: 2, benhNhan: 10, congSuat: 'Bình thường' },
      { gio: '13:30 - 14:30', trucTiep: 15, trucTuyen: 5, benhNhan: 20, congSuat: 'Cao' },
      { gio: '14:30 - 15:30', trucTiep: 18, trucTuyen: 6, benhNhan: 24, congSuat: 'Đỉnh điểm' },
      { gio: '15:30 - 16:30', trucTiep: 12, trucTuyen: 4, benhNhan: 16, congSuat: 'Bình thường' },
      { gio: '16:30 - 17:30', trucTiep: 6, trucTuyen: 2, benhNhan: 8, congSuat: 'Thấp' },
    ],
    tyLeNoShow: '2.5%',
    tyLeTaiKham: '68.5%',
    diemHaiLongCSAT: '4.9 / 5.0 ⭐',
  };

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case 'hom_nay': return 'Hôm nay';
      case 'tuan_nay': return 'Tuần này (7 ngày gần nhất)';
      case 'thang_nay': return 'Tháng này';
      case 'quy_nay': return 'Quý này';
      case 'custom': return fromDate && toDate ? `Từ ${fromDate} đến ${toDate}` : 'Tùy chỉnh ngày';
      default: return 'Tháng này';
    }
  }, [timeRange, fromDate, toDate]);

  const hinhThucLabel = useMemo(() => {
    switch (hinhThuc) {
      case 'truc_tiep': return 'Khám trực tiếp tại phòng khám';
      case 'truc_tuyen': return 'Khám trực tuyến (Telehealth)';
      default: return 'Tất cả hình thức';
    }
  }, [hinhThuc]);

  // Lọc danh sách ca khám theo từ khóa tìm kiếm
  const filteredCaKham = useMemo(() => {
    const list = stats.danhSachCaKham || [];
    if (!searchCaKham.trim()) return list;
    const term = searchCaKham.toLowerCase().trim();
    return list.filter(c =>
      c.tenBenhNhan?.toLowerCase().includes(term) ||
      c.maCa?.toLowerCase().includes(term) ||
      c.maBenhNhan?.toLowerCase().includes(term) ||
      c.chanDoan?.toLowerCase().includes(term)
    );
  }, [stats.danhSachCaKham, searchCaKham]);

  // Lọc danh sách nhận xét đánh giá theo số sao và từ khóa tìm kiếm
  const filteredNhanXet = useMemo(() => {
    let list = reviews.danhSachNhanXet || [];
    if (filterReviewStar !== 'all') {
      if (filterReviewStar === 'low') {
        list = list.filter(item => Number(item.diemBacSi) <= 2);
      } else {
        const starNum = Number(filterReviewStar);
        list = list.filter(item => Number(item.diemBacSi) === starNum);
      }
    }
    if (searchReview.trim()) {
      const term = searchReview.toLowerCase().trim();
      list = list.filter(item =>
        item.tenBenhNhan?.toLowerCase().includes(term) ||
        item.nhanXet?.toLowerCase().includes(term) ||
        item.phanHoiGiamDoc?.toLowerCase().includes(term) ||
        (item.tieuChiHaiLong || []).some((tc) => tc.toLowerCase().includes(term))
      );
    }
    return list;
  }, [reviews.danhSachNhanXet, filterReviewStar, searchReview]);

  // Đặt lại bộ lọc
  const handleResetFilter = () => {
    setTimeRange('thang_nay');
    setHinhThuc('all');
    setFromDate('');
    setToDate('');
    setSearchCaKham('');
    setFilterReviewStar('all');
    setSearchReview('');
  };

  // Xuất file CSV báo cáo hiệu suất bác sĩ
  const handleExportCSV = () => {
    const rows = [
      ['BÁO CÁO HOẠT ĐỘNG KHÁM BỆNH & HIỆU SUẤT LÂM SÀNG BÁC SĨ'],
      ['Bác sĩ phụ trách', stats.thongTinBacSi?.hoTen || ''],
      ['Chuyên khoa', stats.thongTinBacSi?.chuyenKhoa || ''],
      ['Kỳ báo cáo', timeRangeLabel],
      ['Hình thức khám', hinhThucLabel],
      [''],
      ['1. CHỈ SỐ TỔNG QUAN', 'GIÁ TRỊ'],
      ['Tổng bệnh nhân đã khám', stats.tongBenhNhanDaKham],
      ['Số ca đang chờ khám', stats.dangChoKham],
      ['Thời gian khám trung bình', stats.thoiGianKhamTrungBinh],
      ['Tổng đơn thuốc đã kê', stats.tongDonThuocKe],
      ['Tổng chỉ định cận lâm sàng', stats.tongChiDinhCLS],
      ['Tỷ lệ hoàn thành ca khám', stats.tyLeHoanThanh],
      ['Tỷ lệ bệnh nhân tái khám', stats.tyLeTaiKham || '0.0%'],
      ['Tỷ lệ bệnh nhân hủy lịch (No-show)', stats.tyLeNoShow || '0.0%'],
      ['Điểm đánh giá hài lòng (CSAT)', stats.diemHaiLongCSAT || '5.0/5.0'],
      [''],
      ['2. DANH SÁCH CHI TIẾT CÁC CA KHÁM'],
      ['STT', 'Mã Ca', 'Mã BN', 'Họ Tên Bệnh Nhân', 'Tuổi', 'Giới Tính', 'Thời Gian', 'Hình Thức', 'Chẩn Đoán', 'Trạng Thái', 'Loại Khám'],
    ];

    (stats.danhSachCaKham || []).forEach((c, idx) => {
      rows.push([
        idx + 1,
        c.maCa,
        c.maBenhNhan,
        c.tenBenhNhan,
        c.tuoi,
        c.gioiTinh,
        `${c.ngayKham} ${c.gioKham}`,
        c.hinhThuc,
        `"${(c.chanDoan || '').replace(/"/g, '""')}"`,
        c.trangThai,
        c.taiKham,
      ]);
    });

    const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Bac_Si_${stats.thongTinBacSi?.hoTen || 'BS'}_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary-600" /> Báo Cáo Hiệu Suất Khám & Phân Tích Y Khoa
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>Bác sĩ: <strong className="text-gray-800">{stats.thongTinBacSi?.hoTen}</strong></span>
            <span>•</span>
            <span>Chuyên khoa: <strong className="text-primary-700">{stats.thongTinBacSi?.chuyenKhoa}</strong></span>
            {stats.thongTinBacSi?.maBacSi && (
              <>
                <span>•</span>
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-[11px] font-bold">
                  {stats.thongTinBacSi?.maBacSi}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Cụm nút thao tác */}
        <div className="flex flex-wrap items-center gap-2.5">
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => setShowPrintModal(true)}
            className="border-primary-200 text-primary-700 hover:bg-primary-50"
          >
            In Báo Cáo
          </MedButton>
          <MedButton
            variant="primary"
            size="sm"
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Xuất Excel/CSV
          </MedButton>
        </div>
      </div>

      {/* THANH BỘ LỌC ĐA TIÊU CHÍ (COMPREHENSIVE FILTER BAR) */}
      <div className="rounded-2xl bg-white p-5 shadow-2xs border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary-600" /> Bộ Lọc Báo Cáo Hoạt Động Bác Sĩ
          </div>
          <button
            onClick={handleResetFilter}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary-600 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại bộ lọc
          </button>
        </div>

        {/* Hàng 1: Bộ lọc thời gian */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-gray-600 mr-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary-500" /> Thời gian:
          </span>
          {[
            { key: 'hom_nay', label: 'Hôm nay' },
            { key: 'tuan_nay', label: 'Tuần này' },
            { key: 'thang_nay', label: 'Tháng này' },
            { key: 'quy_nay', label: 'Quý này' },
            { key: 'custom', label: 'Tùy chỉnh ngày' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTimeRange(item.key)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                timeRange === item.key
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}

          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-gray-300 p-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              <span className="text-gray-400">&rarr;</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-gray-300 p-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Hàng 2: Hình thức khám */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="text-xs font-bold text-gray-700">Hình thức khám:</span>
          {[
            { key: 'all', label: 'Tất cả hình thức' },
            { key: 'truc_tiep', label: '🏥 Khám trực tiếp tại phòng khám' },
            { key: 'truc_tuyen', label: '💻 Khám trực tuyến (Telehealth)' },
          ].map((item) => (
            <label key={item.key} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="hinhThuc"
                value={item.key}
                checked={hinhThuc === item.key}
                onChange={(e) => setHinhThuc(e.target.value)}
                className="text-primary-600 focus:ring-primary-500"
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      {/* 1. CHỈ SỐ HIỆU SUẤT TỔNG QUAN (KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MedCard className="bg-gradient-to-br from-blue-50/80 to-white border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Bệnh Nhân Đã Khám</p>
              <h3 className="text-3xl font-extrabold text-blue-900 mt-1">{stats.tongBenhNhanDaKham} <span className="text-xs font-normal text-blue-600">ca</span></h3>
              <p className="text-[11px] text-blue-600 mt-1 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" /> Đang chờ: <span className="font-bold text-amber-600">{stats.dangChoKham} bệnh nhân</span>
              </p>
            </div>
            <div className="p-3.5 bg-blue-100 rounded-2xl text-blue-600 shadow-2xs">
              <Users className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-indigo-50/80 to-white border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Thời Gian Khám TB</p>
              <h3 className="text-2xl font-extrabold text-indigo-900 mt-1">{stats.thoiGianKhamTrungBinh}</h3>
              <p className="text-[11px] text-indigo-600 mt-1 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Tốc độ chuẩn y khoa
              </p>
            </div>
            <div className="p-3.5 bg-indigo-100 rounded-2xl text-indigo-600 shadow-2xs">
              <Clock className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-purple-50/80 to-white border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Chỉ Định Cận Lâm Sàng</p>
              <h3 className="text-3xl font-extrabold text-purple-900 mt-1">{stats.tongChiDinhCLS} <span className="text-xs font-normal text-purple-600">phiếu</span></h3>
              <p className="text-[11px] text-purple-600 mt-1 font-medium flex items-center gap-1">
                <FlaskConical className="h-3 w-3" /> Xét nghiệm, X-Quang, Siêu âm
              </p>
            </div>
            <div className="p-3.5 bg-purple-100 rounded-2xl text-purple-600 shadow-2xs">
              <FlaskConical className="h-7 w-7" />
            </div>
          </div>
        </MedCard>

        <MedCard className="bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Đơn Thuốc & Tỷ Lệ Đạt</p>
              <h3 className="text-3xl font-extrabold text-emerald-900 mt-1">{stats.tongDonThuocKe} <span className="text-xs font-normal text-emerald-600">đơn</span></h3>
              <p className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Hoàn thành: {stats.tyLeHoanThanh}
              </p>
            </div>
            <div className="p-3.5 bg-emerald-100 rounded-2xl text-emerald-600 shadow-2xs">
              <Pill className="h-7 w-7" />
            </div>
          </div>
        </MedCard>
      </div>

      {/* 2. PHÂN TÍCH CHUYÊN MÔN Y KHOA (CƠ CẤU BỆNH LÝ) */}
      <div className="w-full">
        <MedCard
          title="Cơ Cấu Bệnh Lý Chẩn Đoán (Top 5 Mặt Bệnh)"
          subtitle="Tỷ lệ phân bố các bệnh lý thường gặp được Bác sĩ chẩn đoán và điều trị"
        >
          {stats.coCauBenhLy && stats.coCauBenhLy.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 pt-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.coCauBenhLy}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {stats.coCauBenhLy.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} ca bệnh`, 'Số lượng']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend chi tiết kèm số lượng và tỷ lệ % */}
              <div className="space-y-2.5 max-w-lg">
                {stats.coCauBenhLy.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs hover:bg-gray-100/70 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }}></span>
                      <span className="font-semibold text-gray-800">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-gray-500 font-medium">{item.count} ca</span>
                      <span className="font-bold text-primary-700 bg-white px-2.5 py-0.5 rounded-lg shadow-2xs border border-gray-200">
                        {item.percentage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
              <Stethoscope className="h-8 w-8 text-gray-300 mb-2" />
              <p className="font-medium text-gray-500">Chưa có dữ liệu chẩn đoán bệnh trong kỳ lọc này</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Dữ liệu sẽ tự động cập nhật khi có kết quả khám</p>
            </div>
          )}
        </MedCard>
      </div>

      {/* 3. TẢI CÔNG VIỆC & BIỂU ĐỒ THỜI GIAN (WORKLOAD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ Khung giờ cao điểm - Chiếm 8 cols */}
        <div className="lg:col-span-8">
          <MedCard
            title="Lưu Lượng Bệnh Nhân Theo Khung Giờ (Khám Trực Tiếp & Trực Tuyến)"
            subtitle="Thống kê phân bổ bệnh nhân theo từng khung giờ trong ngày bao gồm cả Khám tại viện và Tư vấn từ xa"
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.khungGioCaoDiem} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="gio" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 text-xs space-y-1.5 min-w-[210px]">
                            <p className="font-bold text-gray-800 border-b pb-1 flex items-center justify-between">
                              <span>⏰ Khung giờ:</span>
                              <span className="text-primary-700 font-mono">{label}</span>
                            </p>
                            {(hinhThuc === 'all' || hinhThuc === 'truc_tiep') && (
                              <div className="flex items-center justify-between text-blue-700 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> Khám trực tiếp:
                                </span>
                                <strong className="font-bold">{d?.trucTiep ?? 0} ca</strong>
                              </div>
                            )}
                            {(hinhThuc === 'all' || hinhThuc === 'truc_tuyen') && (
                              <div className="flex items-center justify-between text-purple-700 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span> Khám trực tuyến:
                                </span>
                                <strong className="font-bold">{d?.trucTuyen ?? 0} ca</strong>
                              </div>
                            )}
                            <div className="border-t pt-1 flex items-center justify-between text-gray-900 font-bold">
                              <span>👥 Tổng lưu lượng:</span>
                              <span>
                                {d?.benhNhan ?? (Number(d?.trucTiep || 0) + Number(d?.trucTuyen || 0))} ca{' '}
                                <span className="text-[10px] font-normal text-gray-500">({d?.congSuat || 'Thấp'})</span>
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {(hinhThuc === 'all' || hinhThuc === 'truc_tiep') && (
                    <Bar dataKey="trucTiep" name="Khám trực tiếp" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  )}
                  {(hinhThuc === 'all' || hinhThuc === 'truc_tuyen') && (
                    <Bar dataKey="trucTuyen" name="Khám trực tuyến (Telehealth)" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-4 font-medium text-gray-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-blue-600 shadow-2xs"></span> Khám trực tiếp tại phòng khám
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-600 shadow-2xs"></span> Khám trực tuyến (Telehealth)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Đỉnh điểm (&ge; 5 ca)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Cao (3 - 4 ca)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Bình thường (1 - 2 ca)
                </span>
              </div>
            </div>
          </MedCard>
        </div>

        {/* 4. CHẤT LƯỢNG DỊCH VỤ & TÁI KHÁM - Chiếm 4 cols */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tỷ lệ bệnh nhân tái khám */}
          <MedCard className="bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tỷ Lệ Tái Khám (Retention)</p>
                <h3 className="text-3xl font-extrabold text-emerald-900 mt-1">{stats.tyLeTaiKham}</h3>
                <p className="text-xs text-emerald-700 mt-1 font-medium">Thước đo sự tin tưởng của bệnh nhân</p>
              </div>
              <div className="p-3.5 bg-emerald-100 rounded-2xl text-emerald-600 shadow-2xs">
                <HeartHandshake className="h-7 w-7" />
              </div>
            </div>
          </MedCard>

          {/* Điểm hài lòng CSAT thực tế từ bệnh nhân */}
          <MedCard className="bg-gradient-to-br from-amber-50/70 to-white border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Điểm Hài Lòng (CSAT)</p>
                <h3 className="text-3xl font-extrabold text-amber-900 mt-1">
                  {reviews.tongDanhGia > 0 ? `${reviews.diemBacSiTB} / 5.0 ⭐` : `${stats.diemHaiLongCSAT || '5.0 / 5.0 ⭐'}`}
                </h3>
                <p className="text-xs text-amber-700 mt-1 font-medium">
                  {reviews.tongDanhGia > 0
                    ? `${reviews.tongDanhGia} lượt đánh giá thực tế (Tỷ lệ hài lòng: ${reviews.tyLeHaiLong})`
                    : 'Đánh giá trung bình từ bệnh nhân'}
                </p>
              </div>
              <div className="p-3.5 bg-amber-100 rounded-2xl text-amber-600 shadow-2xs">
                <Star className="h-7 w-7 fill-amber-400 text-amber-500" />
              </div>
            </div>
          </MedCard>

          {/* Tỷ lệ No-show */}
          <MedCard className="bg-gradient-to-br from-rose-50/70 to-white border-rose-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Tỷ Lệ Hủy / Vắng Mặt (No-Show)</p>
                <h3 className="text-2xl font-extrabold text-rose-900 mt-1">{stats.tyLeNoShow}</h3>
                <p className="text-xs text-rose-700 mt-1 font-medium">Bệnh nhân đặt lịch nhưng không đến</p>
              </div>
              <div className="p-3.5 bg-rose-100 rounded-2xl text-rose-600 shadow-2xs">
                <AlertCircle className="h-7 w-7" />
              </div>
            </div>
          </MedCard>
        </div>
      </div>

      {/* 5. CƠ CẤU ĐỐI TƯỢNG BỆNH NHÂN (DEMOGRAPHICS & RETENTION) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MedCard
          title="Phân Bố Độ Tuổi Bệnh Nhân"
          subtitle="Tỷ lệ đối tượng bệnh nhân đến khám phục vụ nghiên cứu dịch tễ chuyên khoa"
        >
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-center">
              <Baby className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-gray-600 uppercase">Trẻ Em (&lt; 16t)</p>
              <p className="text-xl font-extrabold text-blue-900 mt-1">{stats.coCauDoTuoi?.treEm?.count || 0} <span className="text-xs font-normal text-gray-500">ca</span></p>
              <span className="inline-block mt-1 text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                {stats.coCauDoTuoi?.treEm?.pct || '0%'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
              <Users className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-gray-600 uppercase">Trưởng Thành (16 - 59t)</p>
              <p className="text-xl font-extrabold text-emerald-900 mt-1">{stats.coCauDoTuoi?.truongThanh?.count || 0} <span className="text-xs font-normal text-gray-500">ca</span></p>
              <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                {stats.coCauDoTuoi?.truongThanh?.pct || '0%'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-center">
              <UserCheck className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-gray-600 uppercase">Cao Tuổi (≥ 60t)</p>
              <p className="text-xl font-extrabold text-purple-900 mt-1">{stats.coCauDoTuoi?.nguoiCaoTuoi?.count || 0} <span className="text-xs font-normal text-gray-500">ca</span></p>
              <span className="inline-block mt-1 text-[11px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                {stats.coCauDoTuoi?.nguoiCaoTuoi?.pct || '0%'}
              </span>
            </div>
          </div>
        </MedCard>

        <MedCard
          title="Tỷ Lệ Bệnh Nhân Mới vs Tái Khám"
          subtitle="Tỷ lệ thu hút người bệnh mới và khả năng duy trì bệnh nhân quản lý bệnh mãn tính"
        >
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-700 uppercase">Bệnh Nhân Mới (Lần đầu)</p>
                <p className="text-2xl font-extrabold text-indigo-900 mt-1">
                  {stats.benhNhanMoiVsTaiKham?.khamMoi?.count || 0} <span className="text-xs font-normal text-gray-500">ca</span>
                </p>
                <p className="text-[11px] text-indigo-600 mt-0.5 font-medium">Chiếm {stats.benhNhanMoiVsTaiKham?.khamMoi?.pct || '0%'} tổng lượt</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-teal-700 uppercase">Bệnh Nhân Tái Khám</p>
                <p className="text-2xl font-extrabold text-teal-900 mt-1">
                  {stats.benhNhanMoiVsTaiKham?.taiKham?.count || 0} <span className="text-xs font-normal text-gray-500">ca</span>
                </p>
                <p className="text-[11px] text-teal-600 mt-0.5 font-medium">Chiếm {stats.benhNhanMoiVsTaiKham?.taiKham?.pct || '0%'} tổng lượt</p>
              </div>
              <div className="p-3 bg-teal-100 rounded-xl text-teal-700">
                <HeartHandshake className="h-6 w-6" />
              </div>
            </div>
          </div>
        </MedCard>
      </div>

      {/* 6. ĐÁNH GIÁ & Ý KIẾN ĐÓNG GÓP TỪ BỆNH NHÂN (CSAT & PATIENT REVIEWS) */}
      <MedCard
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
              <span>Đánh Giá & Phản Hồi Từ Người Bệnh ({reviews.tongDanhGia} lượt)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Điểm Bác Sĩ: {reviews.diemBacSiTB || 5.0} / 5.0 ⭐
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Hài lòng: {reviews.tyLeHaiLong || '100%'}
              </span>
            </div>
          </div>
        }
        subtitle="Ý kiến ghi nhận thực tế từ bệnh nhân sau ca khám theo đúng bộ lọc thời gian & hình thức"
      >
        <div className="space-y-4 pt-1">
          {/* Hàng tổng quan điểm số & phân bố sao (gọn gàng) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
            {/* Cột 1: Điểm số trung bình */}
            <div className="md:col-span-3 flex flex-col items-center justify-center text-center p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
              <span className="text-3xl font-black text-amber-600">
                {reviews.tongDanhGia > 0 ? reviews.diemBacSiTB : '5.0'}
              </span>
              <div className="flex items-center gap-0.5 my-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${
                      s <= Math.round(reviews.diemBacSiTB || 5)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] font-bold text-gray-700">
                {reviews.tongDanhGia} lượt đánh giá thực tế
              </p>
            </div>

            {/* Cột 2: Phân bố số sao 5 -> 1 */}
            <div className="md:col-span-5 space-y-1 justify-center flex flex-col px-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.phanBoSao?.[star] || 0;
                const pct = reviews.tongDanhGia > 0 ? Math.round((count / reviews.tongDanhGia) * 100) : (star === 5 ? 100 : 0);
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-9 font-semibold text-gray-700 flex items-center gap-0.5 text-[11px]">
                      {star} <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                    </span>
                    <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="w-12 text-right text-[10px] font-medium text-gray-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Cột 3: Chỉ số chi tiết */}
            <div className="md:col-span-4 flex flex-col justify-center space-y-1.5 p-2.5 bg-white rounded-lg border border-slate-200/60 text-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">CSAT toàn buổi khám:</span>
                <strong className="text-primary-700">{reviews.diemTrungBinhChung || 5.0} / 5.0 ⭐</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Tỷ lệ bệnh nhân hài lòng:</span>
                <strong className="text-emerald-600">{reviews.tyLeHaiLong || '100%'}</strong>
              </div>
              <p className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-100">
                Tự động đồng bộ theo bộ lọc kỳ khám của Bác sĩ.
              </p>
            </div>
          </div>

          {/* Thanh công cụ phụ: Lọc sao & tìm kiếm nhận xét */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            {/* Tabs lọc sao */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterReviewStar('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterReviewStar === 'all'
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất cả ({reviews.tongDanhGia})
              </button>
              <button
                type="button"
                onClick={() => setFilterReviewStar(5)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  filterReviewStar === 5
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                5 <Star className="h-3 w-3 fill-current" /> ({reviews.phanBoSao?.[5] || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterReviewStar(4)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  filterReviewStar === 4
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                4 <Star className="h-3 w-3 fill-current" /> ({reviews.phanBoSao?.[4] || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterReviewStar(3)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  filterReviewStar === 3
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-gray-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                3 <Star className="h-3 w-3 fill-current" /> ({reviews.phanBoSao?.[3] || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterReviewStar('low')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  filterReviewStar === 'low'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
                }`}
              >
                ≤ 2 <Star className="h-3 w-3 fill-current" /> ({(reviews.phanBoSao?.[2] || 0) + (reviews.phanBoSao?.[1] || 0)})
              </button>
            </div>

            {/* Ô tìm kiếm nhận xét */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchReview}
                onChange={(e) => setSearchReview(e.target.value)}
                placeholder="Tìm lời nhắn, tên BN..."
                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              />
            </div>
          </div>

          {/* Danh sách nhận xét dạng Compact Feed (có thanh cuộn gọn gàng) */}
          <div className="space-y-2">
            {filteredNhanXet.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                <Star className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs font-semibold">Không có nhận xét nào phù hợp với bộ lọc.</p>
                <p className="text-[10px] text-gray-400">Thử đổi bộ lọc hoặc chọn kỳ khám khác.</p>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1.5 divide-y divide-slate-100">
                {filteredNhanXet.map((nx) => (
                  <div
                    key={nx.id}
                    className="pt-2.5 first:pt-0 bg-white hover:bg-slate-50/50 p-3 rounded-xl border border-slate-200/70 transition-all space-y-2"
                  >
                    {/* Header: Avatar, Tên BN, Ngày, Điểm sao */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center border border-primary-200 shrink-0">
                          {nx.anDanh ? '?' : (nx.tenBenhNhan?.[0] || 'B')}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-900">
                              {nx.tenBenhNhan || 'Bệnh nhân'}
                            </span>
                            {nx.anDanh && (
                              <span className="text-[9px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                Ẩn danh
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {nx.ngayHen ? `${nx.gioHen ? nx.gioHen + ' • ' : ''}${nx.ngayHen}` : new Date(nx.taoLuc).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>

                      {/* Sao & Điểm thành phần */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          <span className="text-xs font-black text-amber-700">{nx.diemBacSi}</span>
                          <Star className="h-3 w-3 text-amber-500 fill-amber-400" />
                        </div>
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-500">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                            Tiếp đón: <strong className="text-gray-700">{nx.diemTiepDon || 5}/5</strong>
                          </span>
                          {nx.diemCls && (
                            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                              CLS: <strong>{nx.diemCls}/5</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nội dung: Tiêu chí hài lòng & Lời nhận xét */}
                    <div className="pl-9 space-y-1.5 text-xs text-gray-700">
                      {nx.tieuChiHaiLong?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {nx.tieuChiHaiLong.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {nx.nhanXet ? (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-800 italic leading-relaxed">
                          &ldquo;{nx.nhanXet}&rdquo;
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">Không có nhận xét viết thêm.</p>
                      )}

                      {/* Phản hồi từ Ban Giám Đốc */}
                      {nx.phanHoiGiamDoc && (
                        <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5 mt-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-800">Ban Giám Đốc: </strong>
                            <span className="italic">&ldquo;{nx.phanHoiGiamDoc}&rdquo;</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </MedCard>

      {/* 7. SỔ THEO DÕI CHI TIẾT CÁC CA KHÁM LÂM SÀNG (ENCOUNTER LOG) */}
      <MedCard
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary-600" />
              <span>Sổ Theo Dõi Chi Tiết Ca Khám Trong Kỳ ({filteredCaKham.length} ca)</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchCaKham}
                  onChange={(e) => setSearchCaKham(e.target.value)}
                  placeholder="Tìm theo tên BN, mã ca, bệnh..."
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>

              <MedButton
                variant="secondary"
                size="sm"
                leftIcon={<Printer className="h-3.5 w-3.5" />}
                onClick={() => setShowPrintModal(true)}
              >
                In Sổ Ca Khám
              </MedButton>
            </div>
          </div>
        }
        subtitle="Danh sách các lượt thăm khám được phân công và điều trị bởi Bác sĩ trong khoảng thời gian đã chọn"
      >
        <div className="overflow-x-auto mt-2">
          {filteredCaKham.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Stethoscope className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium">Chưa có ca khám nào phù hợp với điều kiện tìm kiếm.</p>
              <p className="text-xs text-gray-400 mt-1">Vui lòng thay đổi khoảng thời gian hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3 w-28">Mã Ca / BN</th>
                  <th className="py-3 px-3">Họ Tên Bệnh Nhân</th>
                  <th className="py-3 px-3 w-20 text-center">Độ Tuổi</th>
                  <th className="py-3 px-3 w-32">Thời Gian</th>
                  <th className="py-3 px-3 w-36">Hình Thức</th>
                  <th className="py-3 px-3">Chẩn Đoán / Triệu Chứng</th>
                  <th className="py-3 px-3 w-24 text-center">Phân Loại</th>
                  <th className="py-3 px-3 w-28 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCaKham.map((ca, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-gray-500">{ca.stt || idx + 1}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-primary-700 block">{ca.maCa}</span>
                      <span className="font-mono text-[10px] text-gray-400 block">{ca.maBenhNhan}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-gray-900 block">{ca.tenBenhNhan}</span>
                      <span className="text-[11px] text-gray-500">{ca.gioiTinh}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                        {ca.tuoi} tuổi
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="block font-medium text-gray-800">{ca.ngayKham}</span>
                      <span className="block text-[11px] text-gray-500">{ca.gioKham}</span>
                    </td>
                    <td className="py-3 px-3">
                      {ca.hinhThuc?.includes('Telehealth') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          💻 Telehealth
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          🏥 Trực tiếp
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <p className="font-medium text-gray-900 truncate" title={ca.chanDoan}>
                        {ca.chanDoan}
                      </p>
                      {ca.maIcd10 && ca.maIcd10 !== 'Z00.0' && (
                        <span className="inline-block mt-0.5 font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                          ICD: {ca.maIcd10}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        ca.taiKham === 'Tái khám'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {ca.taiKham || 'Khám mới'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                        ca.trangThai === 'Hoàn thành'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ca.trangThai === 'Đã hủy'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {ca.trangThai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </MedCard>

      {/* MODAL IN BÁO CÁO Y KHOA CHUYÊN NGHIỆP A4 */}
      <InBaoCaoModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        stats={stats}
        timeRangeLabel={timeRangeLabel}
        hinhThucLabel={hinhThucLabel}
      />
    </div>
  );
}
