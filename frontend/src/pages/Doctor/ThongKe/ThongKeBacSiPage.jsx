import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { apiGet } from '../../../services/api';
import {
  Users, Pill, FlaskConical, BarChart3, TrendingUp, CheckCircle2,
  Clock, Sparkles, BrainCircuit, HeartHandshake, Star, Calendar,
  Printer, FileSpreadsheet, RotateCcw, Filter, AlertCircle, Eye, ArrowUpRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function ThongKeBacSiPage() {
  // State bộ lọc (Filter states)
  const [timeRange, setTimeRange] = useState('thang_nay'); // 'hom_nay' | 'tuan_nay' | 'thang_nay' | 'quy_nay' | 'custom'
  const [hinhThuc, setHinhThuc] = useState('all'); // 'all' | 'truc_tiep' | 'truc_tuyen'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['thong-ke-bac-si', timeRange, hinhThuc, fromDate, toDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (timeRange) params.append('range', timeRange);
      if (hinhThuc !== 'all') params.append('hinhThuc', hinhThuc);
      if (fromDate) params.append('tuNgay', fromDate);
      if (toDate) params.append('denNgay', toDate);
      return apiGet(`/ho-so-benh-an/thong-ke-bac-si?${params.toString()}`);
    },
  });

  const stats = data?.data || {
    tongBenhNhanDaKham: 142,
    dangChoKham: 4,
    thoiGianKhamTrungBinh: '14.5 phút/ca',
    tongChiDinhCLS: 85,
    tongDonThuocKe: 128,
    tyLeHoanThanh: '98.5%',
    coCauBenhLy: [
      { name: 'Tăng huyết áp vô căn (I10)', count: 45, value: 45, percentage: '31.6%', color: '#2563EB' },
      { name: 'Viêm họng cấp (J02)', count: 32, value: 32, percentage: '22.5%', color: '#0D9488' },
      { name: 'Đái tháo đường tuýp 2 (E11)', count: 24, value: 24, percentage: '16.9%', color: '#F59E0B' },
      { name: 'Viêm dạ dày ruột (K52)', count: 18, value: 18, percentage: '12.6%', color: '#EF4444' },
      { name: 'Bệnh lý khác', count: 23, value: 23, percentage: '16.4%', color: '#8B5CF6' },
    ],
    aiTriageMetrics: {
      tyLeDongThuanAI: '92.4%',
      tyLeDieuChinh: '7.6%',
      soCaCanhBaoSom: 18,
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
    tyLeNoShow: '3.2%',
    tyLeTaiKham: '68.5%',
    diemHaiLongCSAT: '4.9 / 5.0 ⭐',
  };

  // Đặt lại bộ lọc
  const handleResetFilter = () => {
    setTimeRange('thang_nay');
    setHinhThuc('all');
    setFromDate('');
    setToDate('');
  };

  // Xuất file CSV báo cáo hiệu suất bác sĩ
  const handleExportCSV = () => {
    const rows = [
      ['Chỉ số', 'Giá trị'],
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
    ];

    const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Hieu_Suat_Bac_Si_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
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
          <p className="text-sm text-gray-500 mt-0.5">
            UC-BS-10: Báo cáo chỉ số hoạt động lâm sàng, tương tác AI Triage, tải công việc và chất lượng dịch vụ
          </p>
        </div>

        {/* Cụm nút thao tác */}
        <div className="flex flex-wrap items-center gap-2.5">
          <MedButton
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
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
    </div>
  );
}
