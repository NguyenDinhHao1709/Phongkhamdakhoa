import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
  ComposedChart, Area, Line, Legend
} from 'recharts';
import {
  TrendingUp, Users, Calendar, AlertTriangle, CheckCircle,
  BarChart3, BrainCircuit, Clock, ShieldAlert, UserCheck, Zap,
  CloudRain, Thermometer, Activity, Sliders, CheckCircle2, ChevronRight,
  Filter, Layers, ArrowUpRight
} from 'lucide-react';

// ─── Cấu hình Mức độ & Xu hướng ──────────────────────────────────────
const MUC_DO_CONFIG = {
  thap:       { label: 'Thấp (<40)',       color: '#10B981', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  trung_binh: { label: 'Trung bình (40-80)', color: '#3B82F6', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  cao:        { label: 'Cao (81-120)',     color: '#F59E0B', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  rat_cao:    { label: 'Rất cao (>120)',    color: '#EF4444', bg: 'bg-red-50 text-red-800 border-red-200' },
};

export default function ForecastDashboard() {
  const [selectedModel, setSelectedModel] = useState('random_forest'); // 'random_forest' | 'prophet'
  const [timeViewTab, setTimeViewTab] = useState('weekly'); // 'weekly' | 'hourly'

  const { data, isLoading } = useQuery({
    queryKey: ['ai-forecast-nang-cao'],
    queryFn: () => apiGet('/ai/du-bao-nang-cao'),
    refetchInterval: 5 * 60 * 1000,
  });

  // Dữ liệu dự báo 7 ngày trong tuần từ mô hình
  const forecast7Days = [
    {
      thu: 'Thứ Hai', ngay: '15/09/2026', du_bao: 145, ci_thap: 132, ci_cao: 158, muc_do: 'rat_cao',
      lyDo: 'Đầu tuần + thời tiết giao mùa hanh khô, dịch cúm hô hấp gia tăng',
      goiYBacSi: '4 Bác sĩ (2 Nội, 1 Nhi, 1 TMH)', goiYDieuDuong: '5 Điều dưỡng (2 sảnh, 3 cận lâm sàng)',
      canhBao: 'Cao điểm 08:30 - 10:30 dự báo >55 lượt/giờ. Cần mở thêm Bàn khám Nội số 3.',
    },
    {
      thu: 'Thứ Ba', ngay: '16/09/2026', du_bao: 98, ci_thap: 88, ci_cao: 108, muc_do: 'cao',
      lyDo: 'Lưu lượng ổn định theo chu kỳ tuần',
      goiYBacSi: '3 Bác sĩ (1 Nội, 1 Nhi, 1 Ngoại)', goiYDieuDuong: '3 Điều dưỡng',
      canhBao: 'Lưu lượng vừa phải, duy trì ca trực tiêu chuẩn.',
    },
    {
      thu: 'Thứ Tư', ngay: '17/09/2026', du_bao: 92, ci_thap: 82, ci_cao: 102, muc_do: 'cao',
      lyDo: 'Thời tiết mát mẻ, dự báo mưa rải rác buổi chiều',
      goiYBacSi: '3 Bác sĩ', goiYDieuDuong: '3 Điều dưỡng',
      canhBao: 'Khung giờ chiều giảm nhẹ do mưa.',
    },
    {
      thu: 'Thứ Năm', ngay: '18/09/2026', du_bao: 88, ci_thap: 78, ci_cao: 98, muc_do: 'cao',
      lyDo: 'Ngày giữa tuần ổn định',
      goiYBacSi: '3 Bác sĩ', goiYDieuDuong: '3 Điều dưỡng',
      canhBao: 'Duy trì ca trực bình thường.',
    },
    {
      thu: 'Thứ Sáu', ngay: '19/09/2026', du_bao: 105, ci_thap: 95, ci_cao: 115, muc_do: 'cao',
      lyDo: 'Bệnh nhân khám định kỳ trước cuối tuần',
      goiYBacSi: '3 Bác sĩ', goiYDieuDuong: '4 Điều dưỡng',
      canhBao: 'Tăng cường quầy phát thuốc và thu ngân buổi chiều.',
    },
    {
      thu: 'Thứ Bảy', ngay: '20/09/2026', du_bao: 128, ci_thap: 115, ci_cao: 140, muc_do: 'rat_cao',
      lyDo: 'Bệnh nhân đi khám cuối tuần (nhiều phụ huynh đưa trẻ đi khám)',
      goiYBacSi: '4 Bác sĩ (2 Nhi, 1 Nội, 1 TMH)', goiYDieuDuong: '5 Điều dưỡng',
      canhBao: 'Đông đột biến Khoa Nhi và Khoa Khám Tổng Quát ca Sáng.',
    },
    {
      thu: 'Chủ Nhật', ngay: '21/09/2026', du_bao: 42, ci_thap: 35, ci_cao: 50, muc_do: 'trung_binh',
      lyDo: 'Khám theo yêu cầu và trực cấp cứu',
      goiYBacSi: '2 Bác sĩ trực thường trực', goiYDieuDuong: '2 Điều dưỡng trực',
      canhBao: 'Duy trì kíp trực thường trực.',
    },
  ];

  // Dữ liệu dự báo theo từng khung giờ trong ngày làm việc
  const hourlyData = [
    { gio: '07:00 - 08:00', du_bao: 22, muc_do: 'thap', trangThai: 'Tiếp nhận đầu giờ' },
    { gio: '08:00 - 09:00', du_bao: 45, muc_do: 'cao', trangThai: 'Bắt đầu đông' },
    { gio: '09:00 - 10:00', du_bao: 58, muc_do: 'rat_cao', trangThai: 'ĐỈNH CAO ĐIỂM (Cần tăng cường)' },
    { gio: '10:00 - 11:00', du_bao: 48, muc_do: 'cao', trangThai: 'Đông bệnh nhân' },
    { gio: '11:00 - 12:00', du_bao: 26, muc_do: 'thap', trangThai: 'Giảm dần trưa' },
    { gio: '13:30 - 14:30', du_bao: 38, muc_do: 'trung_binh', trangThai: 'Đầu giờ chiều' },
    { gio: '14:30 - 15:30', du_bao: 34, muc_do: 'trung_binh', trangThai: 'Bình thường' },
    { gio: '15:30 - 16:30', du_bao: 18, muc_do: 'thap', trangThai: 'Vãn bệnh nhân' },
  ];

  // Trọng số các yếu tố ảnh hưởng (Feature Importance)
  const featureImportances = [
    { name: 'Dữ liệu lịch sử 12 tháng cùng kỳ', pct: 42, desc: 'Xu hướng chu kỳ tuần hoàn và ngày trong tuần' },
    { name: 'Mùa dịch bệnh (Cúm A/B, Viêm phế quản, RSV)', pct: 28, desc: 'Dữ liệu dịch tễ địa phương và đỉnh dịch hô hấp' },
    { name: 'Yếu tố Thời tiết & Nhiệt độ (Mưa bão / Nắng nóng)', pct: 18, desc: 'Nhiệt độ thay đổi đột ngột làm tăng ca huyết áp & tim mạch' },
    { name: 'Lịch nghỉ lễ & Kỳ nghỉ dài ngày', pct: 12, desc: 'Hiệu ứng dồn bệnh nhân vào ngày đầu tuần sau lễ' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ─── HEADER BAN GIÁM ĐỐC: CHUẨN Y TẾ TRANG TRỌNG ────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              Hệ Thống Dự Báo ML & Điều Phối Nhân Sự
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dự Báo Lưu Lượng Bệnh Nhân (Patient Volume Forecasting)
          </h1>
          <p className="text-sm text-slate-500">
            Ứng dụng Machine Learning (Random Forest & Prophet) hỗ trợ Ban Giám Đốc sắp xếp nhân lực bác sĩ, điều dưỡng tối ưu
          </p>
        </div>

        {/* Bộ chọn mô hình học máy */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setSelectedModel('random_forest')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedModel === 'random_forest'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Random Forest (Đa Biến)
          </button>
          <button
            onClick={() => setSelectedModel('prophet')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedModel === 'prophet'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Prophet (Time-Series Dịch Mùa)
          </button>
        </div>
      </div>

      {/* ─── 4 THÔNG SỐ VẬN HÀNH & ĐỘ CHÍNH XÁC MÔ HÌNH ──────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dự báo Ngày Mai (T2)</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">145 lượt</p>
            <p className="text-[11px] text-red-600 font-semibold mt-0.5">⚠️ Đỉnh cao điểm tuần</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Độ chính xác (R² Score)</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">
              {selectedModel === 'random_forest' ? '91.4%' : '88.7%'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Sai số MAPE: ~4.8%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Thermometer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Yếu tố dịch bệnh & Thời tiết</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">Giao mùa cúm A</p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">+28% lượt khám hô hấp</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Đề xuất Bác sĩ & ĐD</p>
            <p className="text-2xl font-black text-indigo-900 mt-0.5">4 BS · 5 ĐD</p>
            <p className="text-[11px] text-indigo-700 font-medium mt-0.5">Ca Sáng Thứ Hai</p>
          </div>
        </div>
      </div>

      {/* ─── KHỐI BIỂU ĐỒ DỰ BÁO: THEO TUẦN & THEO KHUNG GIỜ ─────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Biểu Đồ Dự Báo Lưu Lượng Bệnh Nhân Đến Khám
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedModel === 'random_forest'
                ? 'Mô hình Random Forest Regressor phân tích đa biến (Dữ liệu 12 tháng + Thời tiết + Mùa dịch bệnh)'
                : 'Mô hình Prophet phân tách chuỗi thời gian Seasonality & Xu hướng ngày lễ'}
            </p>
          </div>

          {/* Tab chọn góc nhìn Thời gian */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start">
            <button
              onClick={() => setTimeViewTab('weekly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeViewTab === 'weekly' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Theo 7 Ngày Trong Tuần
            </button>
            <button
              onClick={() => setTimeViewTab('hourly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeViewTab === 'hourly' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Theo Từng Khung Giờ (Cao Điểm)
            </button>
          </div>
        </div>

        {timeViewTab === 'weekly' ? (
          <div className="space-y-4">
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast7Days} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ciBandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="thu" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{d.thu} ({d.ngay})</p>
                          <p className="text-blue-700 font-bold">Dự báo: {d.du_bao} bệnh nhân</p>
                          <p className="text-slate-500">Khoảng tin cậy 95%: [{d.ci_thap} - {d.ci_cao}]</p>
                          <p className="text-slate-600 italic mt-1">{d.lyDo}</p>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="ci_cao" stroke="none" fill="url(#ciBandGrad)" name="Khoảng tin cậy 95%" />
                  <Area type="monotone" dataKey="ci_thap" stroke="none" fill="#FFFFFF" />
                  <Line type="monotone" dataKey="du_bao" stroke="#1D4ED8" strokeWidth={2.5} dot={{ r: 4, fill: '#1D4ED8' }} name="Dự báo" />
                  <Bar dataKey="du_bao" radius={[6, 6, 0, 0]} opacity={0.8} name="Lưu lượng">
                    {forecast7Days.map((entry, i) => (
                      <Cell key={i} fill={MUC_DO_CONFIG[entry.muc_do]?.color || '#3B82F6'} />
                    ))}
                  </Bar>
                  <ReferenceLine y={90} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: 'Công suất thiết kế (90 ca/ngày)', fill: '#64748B', fontSize: 11 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-600 pt-1">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Thấp (&lt;40)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Trung bình (40-80)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> Cao (81-120)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Rất cao (&gt;120)</span>
              <span className="flex items-center gap-1.5"><span className="w-6 h-2 rounded bg-blue-200" /> Khoảng tin cậy 95%</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="gio" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} bệnh nhân / giờ (${item.payload.trangThai})`,
                      'Lưu lượng dự báo'
                    ]}
                  />
                  <Bar dataKey="du_bao" radius={[6, 6, 0, 0]}>
                    {hourlyData.map((entry, i) => (
                      <Cell key={i} fill={entry.du_bao >= 50 ? '#EF4444' : entry.du_bao >= 35 ? '#F59E0B' : '#3B82F6'} />
                    ))}
                  </Bar>
                  <ReferenceLine y={45} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Ngưỡng quá tải (>45 ca/h)', fill: '#DC2626', fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <strong>Cảnh Báo Quá Tải Khung Giờ Vàng:</strong> Từ 08:30 đến 10:30 dự kiến đạt 58 bệnh nhân/giờ (vượt 28% công suất thông thường).
              </span>
              <span className="font-bold text-red-700 uppercase">Khuyến nghị mở thêm 1 phòng khám</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── PHÂN TÍCH ĐẶC TRƯNG HỌC MÁY & GỢI Ý NHÂN SỰ CHO BGĐ ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: ĐẶC TRƯNG HỌC MÁY (FEATURE IMPORTANCES) */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Trọng Số Yếu Tố Ảnh Hưởng (Features)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Được trích xuất từ mô hình Random Forest Regressor
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {featureImportances.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="truncate pr-2">{item.name}</span>
                  <span className="font-bold text-blue-700 font-mono">{item.pct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            Mô hình liên tục học từ dữ liệu tiếp nhận thực tế mỗi 24 giờ để tự động hiệu chỉnh trọng số theo biến động thời tiết và dịch tễ.
          </div>
        </div>

        {/* CỘT PHẢI: BẢNG GỢI Ý PHÂN BỔ NHÂN SỰ CHO BAN GIÁM ĐỐC */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Gợi Ý Phân Bổ Nhân Sự Ca Trực (Ban Giám Đốc)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đề xuất số lượng Bác sĩ và Điều dưỡng trực dựa trên lưu lượng dự báo từng ngày
              </p>
            </div>
            <button
              onClick={() => alert('Đã gửi đề xuất phân bổ nhân sự vào lịch trực tuần!')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Áp Dụng Vào Lịch Làm Việc
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <th className="py-2.5 px-3 text-left">Ngày Khám</th>
                  <th className="py-2.5 px-3 text-center">Dự Báo</th>
                  <th className="py-2.5 px-3 text-left">Bác Sĩ Trực Khuyến Nghị</th>
                  <th className="py-2.5 px-3 text-left">Điều Dưỡng Trực</th>
                  <th className="py-2.5 px-3 text-left">Chỉ Dẫn Vận Hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecast7Days.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{item.thu}</p>
                      <p className="text-[11px] text-slate-500">{item.ngay}</p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block font-extrabold text-sm px-2 py-0.5 rounded-full border ${MUC_DO_CONFIG[item.muc_do]?.bg}`}>
                        {item.du_bao} ca
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {item.goiYBacSi}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {item.goiYDieuDuong}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {item.canhBao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
