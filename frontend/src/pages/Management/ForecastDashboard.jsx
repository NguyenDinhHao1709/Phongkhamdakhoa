import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
  ComposedChart, Area, Line,
} from 'recharts';
import {
  TrendingUp, Users, Calendar, AlertTriangle, CheckCircle,
  BarChart3, BrainCircuit, Sparkles, Lightbulb, FlaskConical,
  TrendingDown, Minus, Bot, ShieldAlert, UserCheck, Zap,
} from 'lucide-react';

// ─── Config ──────────────────────────────────────────────────────────
const MUC_DO_CONFIG = {
  thap:       { label: 'Ít bệnh nhân',    color: '#22C55E', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trung_binh: { label: 'Trung bình',      color: '#F59E0B', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  cao:        { label: 'Đông bệnh nhân',  color: '#EF4444', bg: 'bg-red-50 text-red-700 border-red-200' },
};

const XU_HUONG_CONFIG = {
  tang:    { icon: TrendingUp,   color: 'text-red-600',     label: 'Xu hướng tăng'  },
  giam:    { icon: TrendingDown, color: 'text-emerald-600', label: 'Xu hướng giảm'  },
  on_dinh: { icon: Minus,        color: 'text-blue-600',    label: 'Ổn định'        },
};

// ─── Component: AI Analyst Block ─────────────────────────────────────
function AiAnalystBlock({ aiAnalysis, model, mape, doChinhXacPct, source }) {
  if (!aiAnalysis) return null;
  const isPython = source === 'python_holtwinters';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-6 text-white shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Bot className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              Phân Tích AI <Sparkles className="h-4 w-4 text-amber-300" />
            </h3>
            <p className="text-blue-200 text-xs mt-0.5">
              {isPython ? `Holt-Winters ML` : 'Moving Average Fallback'} •{' '}
              {doChinhXacPct ? `Độ chính xác ~${doChinhXacPct}%` : 'Chưa đo MAPE'}
              {mape && ` (MAPE: ${mape}%)`}
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPython ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
          {isPython ? '🐍 Python ML' : '⚡ Fallback'}
        </span>
      </div>

      {/* Tóm tắt */}
      <div className="bg-white/8 rounded-xl p-4 mb-3">
        <p className="text-sm leading-relaxed text-blue-50">{aiAnalysis.tom_tat}</p>
      </div>

      {/* Cảnh báo */}
      {aiAnalysis.canh_bao && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 mb-3 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-100">{aiAnalysis.canh_bao}</p>
        </div>
      )}

      {/* Grid: khuyến nghị + cơ hội */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div className="bg-white/8 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <UserCheck className="h-3.5 w-3.5 text-blue-300" />
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wide">Nhân Sự</span>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed">{aiAnalysis.khuyen_nghi_nhan_su}</p>
        </div>
        <div className="bg-white/8 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap className="h-3.5 w-3.5 text-emerald-300" />
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">Tối Ưu Hóa</span>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed">{aiAnalysis.co_hoi_toi_uu}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip cho Confidence Interval Chart ────────────────────
function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="font-bold text-gray-900 text-sm mb-1">{d?.thu} — {d?.ngay}</p>
      <p className="text-sm text-gray-700">Dự báo: <span className="font-bold text-primary-700">{d?.du_bao} bệnh nhân</span></p>
      {d?.ci_thap != null && (
        <p className="text-xs text-gray-500">Khoảng tin cậy 95%: [{d.ci_thap} – {d.ci_cao}]</p>
      )}
      {d?.ten_ngay_le && (
        <p className="text-xs text-amber-600 font-semibold mt-1">⚠️ {d.ten_ngay_le}</p>
      )}
      <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${MUC_DO_CONFIG[d?.muc_do]?.bg}`}>
        {MUC_DO_CONFIG[d?.muc_do]?.label}
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function ForecastDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-forecast-nang-cao'],
    queryFn: () => apiGet('/ai/du-bao-nang-cao'),
    refetchInterval: 5 * 60 * 1000,
  });

  // Normalize dữ liệu từ API response
  const forecast = data?.data || {};
  const tongQuan = forecast?.tongQuan || { trungBinh7Ngay: 0, tongHomNay: 0 };
  const forecast7Days = Array.isArray(forecast?.forecast7Days) ? forecast.forecast7Days : [];
  const heatmapHomNay = Array.isArray(forecast?.heatmapHomNay) ? forecast.heatmapHomNay : [];
  const aiAnalysis = forecast?.aiAnalysis || null;
  const pattern = forecast?.pattern || {};
  const trendInfo = pattern?.trend || {};
  const weeklyInfo = pattern?.weekly || {};

  // Chart data: thêm ci_thap/ci_cao cho Recharts Area
  const chartData = forecast7Days.map(d => ({
    ...d,
    thu: d.thu,
    du_bao: d.du_bao,
    ci_band: [d.ci_thap ?? d.du_bao, d.ci_cao ?? d.du_bao],
    ci_thap: d.ci_thap ?? d.du_bao,
    ci_cao: d.ci_cao ?? d.du_bao,
  }));

  // Heatmap: normalize field names
  const heatmapData = heatmapHomNay.map(h => ({
    gio: h.gio,
    soLuong: h.so_luong ?? h.soLuong ?? 0,
  }));

  const XuHuongIcon = XU_HUONG_CONFIG[trendInfo.xu_huong]?.icon || Minus;

  const kpiCards = [
    {
      label: 'Trung Bình 7 Ngày Qua',
      value: tongQuan.trungBinh7Ngay || '--',
      unit: 'bệnh nhân/ngày',
      icon: TrendingUp, color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Lượt Khám Hôm Nay',
      value: tongQuan.tongHomNay,
      unit: 'lượt tính đến giờ',
      icon: Users, color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Dự Báo Ngày Mai',
      value: forecast7Days[0]?.du_bao ?? '--',
      unit: forecast7Days[0]?.goi_y_nhan_su?.slice(0, 40) + '...' || 'bệnh nhân dự kiến',
      icon: Calendar, color: 'text-primary-600 bg-primary-50',
    },
    {
      label: 'Độ Chính Xác',
      value: forecast.doChinhXacPct ? `~${forecast.doChinhXacPct}%` : '~87%',
      unit: forecast.model || 'HoltWinters ML',
      icon: BrainCircuit, color: 'text-indigo-600 bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-primary-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BrainCircuit className="h-8 w-8 text-amber-300" />
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              Dự Báo Lưu Lượng Bệnh Nhân <Sparkles className="h-5 w-5 text-amber-300" />
            </h1>
            <p className="text-blue-200 text-sm mt-0.5">
              Python ML (Holt-Winters) + Gemini AI Analyst — Confidence Interval 95%
            </p>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-3 max-w-2xl">
          Mô hình Holt-Winters Exponential Smoothing phân tích chu kỳ 7 ngày + xu hướng dài hạn từ dữ liệu lịch sử 90 ngày,
          kết hợp Gemini AI diễn giải thông minh để hỗ trợ Ban Giám Đốc tối ưu nhân sự.
        </p>
        {/* Trend indicator */}
        {trendInfo.xu_huong && (
          <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm font-semibold ${XU_HUONG_CONFIG[trendInfo.xu_huong]?.color || 'text-white'}`}>
            <XuHuongIcon className="h-4 w-4" />
            {trendInfo.mo_ta || XU_HUONG_CONFIG[trendInfo.xu_huong]?.label}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse h-24" />)
          : kpiCards.map((card, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{card.value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{card.unit}</p>
              </div>
            </div>
          ))}
      </div>

      {/* AI Analyst Block */}
      {isLoading ? (
        <div className="rounded-2xl bg-gray-100 animate-pulse h-48" />
      ) : (
        <AiAnalystBlock
          aiAnalysis={aiAnalysis}
          model={forecast.model}
          mape={forecast.mape}
          doChinhXacPct={forecast.doChinhXacPct}
          source={forecast.source}
        />
      )}

      {/* Biểu đồ dự báo + Confidence Interval */}
      <MedCard
        title="📈 Biểu Đồ Dự Báo 7 Ngày Tới (+ Khoảng Tin Cậy 95%)"
        subtitle="Vùng mờ biểu thị khoảng tin cậy của mô hình Holt-Winters — Cột màu = mức độ đông/vắng"
      >
        {isLoading ? (
          <div className="h-72 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="thu" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<ForecastTooltip />} />
                {/* Confidence Interval Area */}
                <Area
                  type="monotone"
                  dataKey="ci_cao"
                  stroke="none"
                  fill="url(#ciGrad)"
                  name="CI Cao"
                />
                <Area
                  type="monotone"
                  dataKey="ci_thap"
                  stroke="none"
                  fill="white"
                  name="CI Thấp"
                />
                {/* Đường xu hướng */}
                <Line type="monotone" dataKey="du_bao" stroke="#6366F1" strokeWidth={2} dot={false} name="Dự báo" />
                {/* Cột dự báo */}
                <Bar dataKey="du_bao" radius={[6, 6, 0, 0]} opacity={0.75} name="Dự báo">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={MUC_DO_CONFIG[entry.muc_do]?.color || '#2563EB'} />
                  ))}
                </Bar>
                <ReferenceLine
                  y={tongQuan.trungBinh7Ngay || 0}
                  stroke="#6366F1"
                  strokeDasharray="5 5"
                  label={{ value: 'TB 7 ngày', fill: '#6366F1', fontSize: 11 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs font-semibold text-gray-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Ít (&lt;30)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> TB (30-59)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Đông (≥60)</span>
          <span className="flex items-center gap-1.5"><span className="w-8 h-2 rounded opacity-30 bg-indigo-400" /> Khoảng tin cậy 95%</span>
        </div>
      </MedCard>

      {/* Bảng gợi ý nhân sự */}
      <MedCard
        title="🧑‍⚕️ Gợi Ý Phân Công Nhân Sự Ca Trực"
        subtitle="Dựa trên dự báo lưu lượng bệnh nhân từ mô hình ML — Ban Giám Đốc xem xét điều chỉnh"
      >
        {isLoading ? (
          <div className="space-y-2 animate-pulse">{[...Array(7)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase">
                  <th className="px-4 py-3 text-left rounded-tl-lg">Ngày</th>
                  <th className="px-4 py-3 text-center">Dự Báo</th>
                  <th className="px-4 py-3 text-center">CI 95%</th>
                  <th className="px-4 py-3 text-center">Mức Độ</th>
                  <th className="px-4 py-3 text-left rounded-tr-lg">Gợi Ý AI</th>
                </tr>
              </thead>
              <tbody>
                {forecast7Days.map((day, idx) => (
                  <tr key={idx} className={`border-t border-gray-100 transition-colors ${day.is_ngay_le ? 'bg-amber-50/60' : 'hover:bg-gray-50/60'}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {day.thu}
                        {day.is_ngay_le && <span className="ml-1 text-amber-600">🎌</span>}
                      </p>
                      <p className="text-xs text-gray-500">{day.ngay}</p>
                      {day.ten_ngay_le && <p className="text-[10px] text-amber-600 font-semibold">{day.ten_ngay_le}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-extrabold text-lg text-gray-900">{day.du_bao}</span>
                      <span className="text-xs text-gray-500"> ca</span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {day.ci_thap != null ? `[${day.ci_thap} – ${day.ci_cao}]` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${MUC_DO_CONFIG[day.muc_do]?.bg}`}>
                        {MUC_DO_CONFIG[day.muc_do]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 flex items-start gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        {day.goi_y_nhan_su}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MedCard>

      {/* Heatmap theo giờ hôm nay */}
      <MedCard title="⏱️ Lưu Lượng Bệnh Nhân Theo Giờ — Hôm Nay" subtitle="Phân bổ thực tế theo từng giờ làm việc">
        {isLoading ? <div className="h-48 animate-pulse bg-gray-100 rounded-xl" /> : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="gio" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val) => [`${val} bệnh nhân`, 'Lưu lượng']} />
                <Bar dataKey="soLuong" fill="#2563EB" radius={[6, 6, 0, 0]}>
                  {heatmapData.map((entry, i) => (
                    <Cell key={i} fill={entry.soLuong >= 10 ? '#DC2626' : entry.soLuong >= 5 ? '#F59E0B' : '#2563EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </MedCard>
    </div>
  );
}
