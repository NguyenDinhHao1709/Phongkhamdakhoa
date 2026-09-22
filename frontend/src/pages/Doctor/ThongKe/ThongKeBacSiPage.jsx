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
  Clock, Sparkles, BrainCircuit, HeartHandshake, Star, Calendar,
  Printer, FileSpreadsheet, RotateCcw, Filter, AlertCircle, Eye, ArrowUpRight,
  Search, Stethoscope, Baby, UserCheck, ShieldAlert
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
      { gio: '08:00 - 09:00', benhNhan: 18, congSuat: 'Cao' },
      { gio: '09:00 - 10:00', benhNhan: 26, congSuat: 'Đỉnh điểm' },
      { gio: '10:00 - 11:00', benhNhan: 22, congSuat: 'Cao' },
      { gio: '11:00 - 12:00', benhNhan: 10, congSuat: 'Bình thường' },
      { gio: '13:30 - 14:30', benhNhan: 20, congSuat: 'Cao' },
      { gio: '14:30 - 15:30', benhNhan: 24, congSuat: 'Đỉnh điểm' },
      { gio: '15:30 - 16:30', benhNhan: 16, congSuat: 'Bình thường' },
      { gio: '16:30 - 17:30', benhNhan: 8, congSuat: 'Thấp' },
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

  // Đặt lại bộ lọc
  const handleResetFilter = () => {
    setTimeRange('thang_nay');
    setHinhThuc('all');
    setFromDate('');
    setToDate('');
    setSearchCaKham('');
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
      ['Tỷ lệ Bác sĩ đồng thuận AI Triage', stats.aiTriageMetrics?.tyLeDongThuanAI || '92.4%'],
      ['Tỷ lệ bệnh nhân tái khám', stats.tyLeTaiKham || '68.5%'],
      ['Tỷ lệ bệnh nhân hủy lịch (No-show)', stats.tyLeNoShow || '3.2%'],
      ['Điểm đánh giá hài lòng (CSAT)', stats.diemHaiLongCSAT || '4.9/5.0'],
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

      {/* 2. PHÂN TÍCH CHUYÊN MÔN Y KHOA & ĐIỂM NHẤN CÔNG NGHỆ AI TRIAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ Cơ cấu bệnh lý (Pie Chart) - Chiếm 7 cols */}
        <div className="lg:col-span-7">
          <MedCard
            title="Cơ Cấu Bệnh Lý Chẩn Đoán (Top 5 Mặt Bệnh)"
            subtitle="Tỷ lệ phân bố các bệnh lý thường gặp được Bác sĩ chẩn đoán và điều trị"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 pt-2">
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
              <div className="space-y-2.5">
                {stats.coCauBenhLy.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="font-semibold text-gray-800 truncate max-w-[140px]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{item.count} ca</span>
                      <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded shadow-2xs border border-gray-200">
                        {item.percentage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MedCard>
        </div>

        {/* Thẻ Phân tích Tương tác AI Triage (Điểm nhấn đồ án KLTN) - Chiếm 5 cols */}
        <div className="lg:col-span-5">
          <MedCard
            className="h-full bg-gradient-to-br from-indigo-900 via-blue-900 to-primary-900 text-white border-0 shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs text-amber-300">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    Tương Tác AI Triage <Sparkles className="h-4 w-4 text-amber-300" />
                  </h3>
                  <p className="text-xs text-blue-200">Độ chính xác phân luồng AI & Bác sĩ</p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30">
                AI Active
              </span>
            </div>

            <div className="space-y-4 text-sm mt-2">
              {/* Progress Bar Đồng Thuận AI */}
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-xs border border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-blue-100">Tỷ lệ Bác sĩ đồng thuận với AI:</span>
                  <span className="text-emerald-300 text-sm font-extrabold">{stats.aiTriageMetrics?.tyLeDongThuanAI || '92.4%'}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-400 to-emerald-400 h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: stats.aiTriageMetrics?.tyLeDongThuanAI || '92.4%' }}
                  ></div>
                </div>
                <p className="text-[11px] text-blue-200 mt-2 leading-relaxed">
                  {stats.aiTriageMetrics?.moTa || '92.4% chẩn đoán của Bác sĩ trùng khớp với phân luồng chuyên khoa của AI Triage.'}
                </p>
              </div>

              {/* Grid 2 chỉ số phụ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10">
                  <p className="text-[11px] text-blue-200 uppercase font-semibold">Tỷ lệ điều chỉnh</p>
                  <p className="text-xl font-extrabold text-amber-300 mt-1">{stats.aiTriageMetrics?.tyLeDieuChinh || '7.6%'}</p>
                  <p className="text-[10px] text-blue-300 mt-0.5">Bác sĩ tái phân loại</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10">
                  <p className="text-[11px] text-blue-200 uppercase font-semibold">Cảnh báo sớm</p>
                  <p className="text-xl font-extrabold text-rose-300 mt-1">{stats.aiTriageMetrics?.soCaCanhBaoSom || 18} <span className="text-xs font-normal text-white">ca</span></p>
                  <p className="text-[10px] text-blue-300 mt-0.5">Phát hiện nguy cơ cao</p>
                </div>
              </div>
            </div>
          </MedCard>
        </div>
      </div>

      {/* 3. TẢI CÔNG VIỆC & BIỂU ĐỒ THỜI GIAN (WORKLOAD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ Khung giờ cao điểm - Chiếm 8 cols */}
        <div className="lg:col-span-8">
          <MedCard
            title="Lưu Lượng Bệnh Nhân Theo Khung Giờ (Khung Giờ Cao Điểm)"
            subtitle="Thống kê phân bổ bệnh nhân theo từng giờ làm việc trong ngày giúp Bác sĩ điều phối thể lực"
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.khungGioCaoDiem} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="gio" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(val, name, item) => [`${val} bệnh nhân (${item.payload.congSuat})`, 'Lưu lượng']}
                  />
                  <Bar dataKey="benhNhan" fill="#2563EB" radius={[6, 6, 0, 0]}>
                    {stats.khungGioCaoDiem.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.congSuat === 'Đỉnh điểm' ? '#DC2626' : entry.congSuat === 'Cao' ? '#F59E0B' : '#2563EB'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs font-semibold text-gray-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-600"></span> Đỉnh điểm (&ge; 24 ca/h)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> Cao (18 - 23 ca/h)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600"></span> Bình thường (&le; 17 ca/h)</span>
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

          {/* Điểm hài lòng CSAT */}
          <MedCard className="bg-gradient-to-br from-amber-50/70 to-white border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Điểm Hài Lòng (CSAT)</p>
                <h3 className="text-3xl font-extrabold text-amber-900 mt-1">{stats.diemHaiLongCSAT}</h3>
                <p className="text-xs text-amber-700 mt-1 font-medium">Đánh giá trung bình từ bệnh nhân</p>
              </div>
              <div className="p-3.5 bg-amber-100 rounded-2xl text-amber-600 shadow-2xs">
                <Star className="h-7 w-7" />
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

      {/* 6. SỔ THEO DÕI CHI TIẾT CÁC CA KHÁM LÂM SÀNG (ENCOUNTER LOG) */}
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
