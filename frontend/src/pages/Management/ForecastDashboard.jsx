import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  ComposedChart, Area, Line
} from 'recharts';
import {
  Users, CheckCircle2, BarChart3, BrainCircuit, Clock, UserCheck,
  Sparkles, AlertTriangle, RefreshCw, Calendar, Lightbulb,
  Stethoscope, ArrowUpRight, TrendingUp
} from 'lucide-react';

// ─── Cấu hình Mức độ Lưu lượng ───────────────────────────────────────
const MUC_DO_CONFIG = {
  thap:       { label: 'Thấp (<35)',        color: '#10B981', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  trung_binh: { label: 'Trung bình (35-49)', color: '#3B82F6', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  cao:        { label: 'Cao (≥50)',         color: '#F59E0B', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  rat_cao:    { label: 'Rất cao (≥70)',     color: '#EF4444', bg: 'bg-red-50 text-red-800 border-red-200' },
};

// Mô hình học nhịp theo thứ trên ~90 ngày lịch sử → tối đa 30 ngày (backend cũng chặn ở 30)
const KHOANG_DU_BAO = [
  { soNgay: 7, nhan: 'Tuần' },
  { soNgay: 14, nhan: '2 tuần' },
  { soNgay: 30, nhan: 'Tháng' },
];
const SO_NGAY_GOP_TUAN = 14; // dài hơn mức này thì bảng gộp theo tuần

const ddmm = (ngay) => `${ngay.slice(8)}/${ngay.slice(5, 7)}`;

/** Gộp chuỗi dự báo theo từng 7 ngày: tổng lượt và ngày đông nhất của mỗi tuần */
function gopTheoTuan(days) {
  const tuan = [];
  for (let i = 0; i < days.length; i += 7) {
    const nhom = days.slice(i, i + 7);
    tuan.push({
      tu: nhom[0].ngay,
      den: nhom[nhom.length - 1].ngay,
      soNgay: nhom.length,
      tong: nhom.reduce((s, d) => s + d.du_bao, 0),
      dongNhat: nhom.reduce((a, b) => (b.du_bao > a.du_bao ? b : a)),
    });
  }
  return tuan;
}

export default function ForecastDashboard() {
  const [timeViewTab, setTimeViewTab] = useState('weekly'); // 'weekly' | 'hourly'
  const [soNgay, setSoNgay] = useState(7);
  const nhanKhoang = `${soNgay} Ngày`;
  const gopTuan = soNgay > SO_NGAY_GOP_TUAN;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ai-forecast-nang-cao', soNgay],
    queryFn: () => apiGet(`/ai/du-bao-nang-cao?horizon=${soNgay}`),
    // Mô hình ML đang thức dậy (Render free ~1 phút) → tải lại sớm để thay kết quả dự phòng
    refetchInterval: (query) => (query.state.data?.data?.mlDangKhoiDong ? 30 * 1000 : 5 * 60 * 1000),
  });

  const forecastResult = data?.data || {};
  const forecast = forecastResult.forecast7Days || [];
  const forecastTuan = gopTuan ? gopTheoTuan(forecast) : [];
  const hourlyData = forecastResult.heatmapHomNay || [];
  // Giờ cao điểm = đạt từ 80% mức cao nhất trong ngày
  const nguongCaoDiem = Math.max(...hourlyData.map((h) => h.soLuong), 1) * 0.8;
  const dataQuality = forecastResult.dataQuality || {};
  const aiAnalysis = forecastResult.aiAnalysis || {};
  const pattern = forecastResult.pattern || {};
  const tongQuan = forecastResult.tongQuan || {};
  const mape = forecastResult.mape;
  const theoChuyenKhoa = forecastResult.theoChuyenKhoa || [];
  const saiSoThucTe = forecastResult.saiSoThucTe;
  // Ngày đã được nhân hệ số ngày lễ / mùa vụ học từ lịch sử (cần hơn 1 năm dữ liệu mới có)
  const ngayDieuChinh = forecast.filter((d) => d.he_so_ngay_le != null || (d.he_so_mua_vu != null && d.he_so_mua_vu !== 1));

  const { data: phanLoaiRes } = useQuery({
    queryKey: ['ai-phan-loai-stats'],
    queryFn: () => apiGet('/ai/phan-loai-stats'),
    staleTime: 10 * 60 * 1000,
  });
  const phanLoai = phanLoaiRes?.data?.theoKhoa ? phanLoaiRes.data : phanLoaiRes || {};
  // Chưa có dự báo: đang tải, hoặc server báo chưa đủ dữ liệu
  const emptyText = isLoading ? 'Đang tải dữ liệu dự báo...' : (data?.message || 'Chưa có dữ liệu dự báo');

  return (
    <div className="space-y-5 animate-fadeIn pb-10">
      {/* ─── 1. HEADER BAN GIÁM ĐỐC: ĐIỀU HÀNH & RA QUYẾT ĐỊNH ────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/70">
              <BrainCircuit className="w-3.5 h-3.5" />
              {forecastResult.source === 'trung_binh_theo_thu'
                ? forecastResult.mlDangKhoiDong
                  ? 'Dự phòng: Trung bình theo thứ (mô hình ML đang khởi động, tự cập nhật sau ít giây)'
                  : 'Dự phòng: Trung bình theo thứ (dịch vụ ML chưa phản hồi)'
                : 'Mô Hình Dự Báo Holt-Winters ML & Gemini AI'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dữ liệu trực tiếp
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Dự Báo Lưu Lượng Bệnh Nhân & Điều Phối Nguồn Lực
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Dự báo chuỗi thời gian {soNgay} ngày tới kết hợp tham vấn nhân sự phục vụ Ban Giám Đốc
            {soNgay === 30 && <span className="text-amber-700 font-semibold"> · Dự báo 1 tháng chỉ mang tính tham khảo</span>}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {KHOANG_DU_BAO.map((k) => (
              <button
                key={k.soNgay}
                onClick={() => setSoNgay(k.soNgay)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  soNgay === k.soNgay ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {k.nhan}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới dự báo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefetching ? 'Đang tính toán...' : 'Cập nhật'}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. THẺ THAM VẤN ĐIỀU HÀNH GEMINI AI (EXECUTIVE SUMMARY) ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-blue-800/40">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm md:text-base font-bold text-white tracking-wide">
              Báo Cáo Tóm Lược Điều Hành (Cố Vấn Y Khoa AI)
            </h2>
          </div>
          <span className="text-[11px] text-blue-200/80 font-medium">
            Tự động tổng hợp từ dữ liệu tiếp nhận
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* Tóm tắt */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Xu Hướng {nhanKhoang}</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              {aiAnalysis?.tom_tat || emptyText}
            </p>
          </div>

          {/* Cảnh báo */}
          <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cảnh Báo Cao Điểm</span>
            </div>
            <p className="text-amber-100/90 leading-relaxed text-[11px]">
              {aiAnalysis?.canh_bao || '—'}
            </p>
          </div>

          {/* Khuyến nghị */}
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-3 backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-1.5 text-blue-300 font-bold">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Bố Trí Nhân Lực</span>
            </div>
            <p className="text-blue-100/90 leading-relaxed text-[11px]">
              {aiAnalysis?.khuyen_nghi_nhan_su || '—'}
            </p>
          </div>

          {/* Tối ưu */}
          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-3 backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Tối Ưu Vận Hành</span>
            </div>
            <p className="text-emerald-100/90 leading-relaxed text-[11px]">
              {aiAnalysis?.co_hoi_toi_uu || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. 4 CHỈ SỐ KPI CHÍNH CHO BAN GIÁM ĐỐC ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Dự Báo Ngày Gần Nhất</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {forecast[0]?.du_bao ?? '—'}
              </span>
              <span className="text-xs font-semibold text-slate-500">lượt khám</span>
            </div>
            <p className="text-[11px] text-blue-700 font-medium truncate mt-0.5">
              {forecast[0]?.thu ? `${forecast[0]?.thu} (${forecast[0]?.ngay})` : 'Ngày mai'}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lưu Lượng TB {nhanKhoang}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-indigo-900">
                {tongQuan.trungBinh7Ngay ?? '—'}
              </span>
              <span className="text-xs font-semibold text-slate-500">ca / ngày</span>
            </div>
            <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
              Trung bình các ngày dự báo
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Độ Tin Cậy Mô Hình</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-emerald-700">
                {mape != null ? `${forecastResult.doChinhXacPct}%` : 'Chưa đo'}
              </span>
              {mape != null && (
                <span className="text-[10px] font-bold bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 rounded">
                  MAPE {mape}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {mape == null
                ? 'Chưa đủ dữ liệu để kiểm định sai số'
                : `Kiểm định 7 ngày gần nhất · mốc so sánh tuần trước: ${forecastResult.mapeNaive}%`}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cơ Sở Dữ Liệu Lịch Sử</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {tongQuan.tongLichSu ?? '—'}
              </span>
              <span className="text-xs font-semibold text-slate-500">lượt khám</span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">
              Huấn luyện trên {dataQuality?.observedDays ?? 0} ngày vận hành
            </p>
          </div>
        </div>
      </div>

      {/* ─── 4. KHỐI BIỂU ĐỒ TRỰC QUAN (7 NGÀY & KHUNG GIỜ CAO ĐIỂM) ─── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              {timeViewTab === 'weekly' ? `Biểu Đồ Dự Báo Lưu Lượng ${nhanKhoang} Tới` : 'Phân Bố Lưu Lượng Theo Khung Giờ Khám'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {timeViewTab === 'weekly'
                ? 'Đường xu hướng kết hợp dải khoảng tin cậy 95% (95% Confidence Interval)'
                : forecastResult.heatmapNguon === 'hom_nay'
                  ? 'Lượt tiếp nhận hôm nay theo giờ, từ 07:00 đến 17:00'
                  : 'Trung bình lịch sử theo giờ, từ 07:00 đến 17:00 (hôm nay chưa đủ dữ liệu)'}
            </p>
          </div>

          {/* Tab chọn góc nhìn */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start">
            <button
              onClick={() => setTimeViewTab('weekly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeViewTab === 'weekly' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Ngày
            </button>
            <button
              onClick={() => setTimeViewTab('hourly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeViewTab === 'hourly' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khung Giờ Cao Điểm (07h - 17h)
            </button>
          </div>
        </div>

        {/* ── VIEW 1: DỰ BÁO THEO NGÀY ────────────────────────────── */}
        {timeViewTab === 'weekly' ? (
          <div className="space-y-3">
            <div className="h-72 w-full pt-1">
              {forecast.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  {emptyText}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ciBandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="ngay"
                      tick={{ fontSize: soNgay > 7 ? 11 : 12, fill: '#475569', fontWeight: 600 }}
                      tickFormatter={(ngay, i) => (soNgay > 7 ? ddmm(ngay) : `${forecast[i]?.thu} (${ddmm(ngay)})`)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, 'dataMax + 15']} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs space-y-1.5 border border-slate-700">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-700 pb-1">
                              <span className="font-bold text-sm text-cyan-300">{d.thu} — {d.ngay}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${MUC_DO_CONFIG[d.muc_do]?.bg || 'bg-blue-900 text-blue-200'}`}>
                                {MUC_DO_CONFIG[d.muc_do]?.label || 'Dự báo'}
                              </span>
                            </div>
                            <p className="text-white font-black text-sm">
                              Dự báo: <span className="text-cyan-400">{d.du_bao} ca khám</span>
                            </p>
                            <p className="text-slate-300 text-[11px]">
                              Khoảng tin cậy 95%: [{d.ci_thap} - {d.ci_cao}] ca
                            </p>
                            <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-300">
                              <p className="font-semibold text-amber-300">Đề xuất:</p>
                              <p className="italic text-slate-200">{d.goi_y_nhan_su}</p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="ci_cao" stroke="none" fill="url(#ciBandGrad)" name="Khoảng tin cậy 95%" />
                    <Area type="monotone" dataKey="ci_thap" stroke="none" fill="#FFFFFF" />
                    <Bar dataKey="du_bao" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {forecast.map((entry, i) => (
                        <Cell key={i} fill={MUC_DO_CONFIG[entry.muc_do]?.color || '#3B82F6'} />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="du_bao"
                      stroke="#1E40AF"
                      strokeWidth={soNgay > 14 ? 2 : 3}
                      dot={soNgay > 14 ? false : { r: 4, fill: '#1E40AF', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chú thích màu sắc */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Thấp (&lt;35 ca)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Trung bình (35-49 ca)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> Cao (≥50 ca)</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-2 rounded bg-blue-200" /> Khoảng tin cậy 95%</span>
            </div>
          </div>
        ) : (
          /* ── VIEW 2: KHUNG GIỜ CAO ĐIỂM TRONG NGÀY ───────────────── */
          <div className="space-y-3">
            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="gio" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const isPeak = d.soLuong >= nguongCaoDiem;
                      return (
                        <div className="bg-slate-900 text-white rounded-xl shadow-xl p-2.5 text-xs space-y-1 border border-slate-700">
                          <p className="font-bold text-cyan-300">Khung giờ: {d.gio}</p>
                          <p className="text-white font-black text-sm">
                            Lưu lượng: <span className="text-amber-400">{d.soLuong} lượt</span>
                          </p>
                          <p className="text-[11px] text-slate-300">
                            {isPeak ? '🔥 Khung giờ cao điểm tập trung đông' : 'Lưu lượng bình thường'}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="soLuong" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {hourlyData.map((entry, i) => {
                      const isHigh = entry.soLuong >= nguongCaoDiem;
                      return (
                        <Cell
                          key={i}
                          fill={isHigh ? '#F59E0B' : '#3B82F6'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-slate-600 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> Khung giờ cao điểm (08:30 - 10:30 & 14:00 - 15:30)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Khung giờ khám tiêu chuẩn</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── 5. BẢNG PHÂN BỔ NHÂN SỰ & CHỈ DẪN VẬN HÀNH BGĐ ────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Phương Án Phân Bổ Nhân Lực & Bàn Khám Khuyến Nghị ({nhanKhoang} Tới)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {gopTuan
                ? 'Gộp theo tuần: nhân lực khuyến nghị tính theo ngày đông nhất của mỗi tuần'
                : 'Được tự động tính toán dựa trên khối lượng ca khám dự báo và chuẩn định mức y tế'}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Tổng cộng: {forecast.length} ngày dự báo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-y border-slate-200 text-[11px]">
                <th className="py-2.5 px-3">{gopTuan ? 'Tuần' : 'Ngày Khám'}</th>
                <th className="py-2.5 px-3 text-center">Dự Báo</th>
                <th className="py-2.5 px-3">Mức Độ</th>
                <th className="py-2.5 px-3">Bác Sĩ Trực Khuyến Nghị</th>
                <th className="py-2.5 px-3">Điều Dưỡng Phụ Trách</th>
                <th className="py-2.5 px-3">Phương Án Vận Hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecast.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    {emptyText}
                  </td>
                </tr>
              ) : gopTuan ? (
                forecastTuan.map((t) => (
                  <tr key={t.tu} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm">{ddmm(t.tu)} – {ddmm(t.den)}</div>
                      <div className="text-[11px] text-slate-500">{t.soNgay} ngày</div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-black text-slate-900 text-sm">{t.tong}</span>
                      <span className="text-[10px] text-slate-400 block">~{Math.round(t.tong / t.soNgay)} ca/ngày</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${MUC_DO_CONFIG[t.dongNhat.muc_do]?.bg || 'bg-slate-100 text-slate-700'}`}>
                        {MUC_DO_CONFIG[t.dongNhat.muc_do]?.label || t.dongNhat.muc_do}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{t.dongNhat.bac_si_khuyen_nghi}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{t.dongNhat.dieu_duong_khuyen_nghi}</td>
                    <td className="py-3 px-3 text-slate-600 leading-relaxed text-[11px]">
                      Cao điểm {t.dongNhat.thu} {ddmm(t.dongNhat.ngay)} (~{t.dongNhat.du_bao} ca). {t.dongNhat.goi_y_nhan_su}
                    </td>
                  </tr>
                ))
              ) : (
                forecast.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm">{item.thu}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {item.ngay}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-black text-slate-900 text-sm">
                        {item.du_bao}
                      </span>
                      <span className="text-[10px] text-slate-400 block">ca khám</span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${MUC_DO_CONFIG[item.muc_do]?.bg || 'bg-slate-100 text-slate-700'}`}>
                        {MUC_DO_CONFIG[item.muc_do]?.label || item.muc_do}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{item.bac_si_khuyen_nghi || (item.du_bao >= 50 ? '3 Bác sĩ chuyên khoa' : '2 Bác sĩ chuyên khoa')}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{item.dieu_duong_khuyen_nghi || (item.du_bao >= 50 ? '4 Điều dưỡng' : '3 Điều dưỡng')}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600 leading-relaxed text-[11px]">
                      {item.goi_y_nhan_su}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 5b. DỰ BÁO THEO CHUYÊN KHOA (XẾP LỊCH BÁC SĨ) ─────────── */}
      {theoChuyenKhoa.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dự Báo Theo Chuyên Khoa</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Số lượt dự kiến {gopTuan ? 'mỗi tuần' : 'mỗi ngày'} của từng chuyên khoa (mô hình riêng cho mỗi khoa) — dùng để xếp lịch bác sĩ.
              Tổng các khoa có thể lệch nhẹ so với dự báo chung.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-bold">Chuyên khoa</th>
                  {gopTuan
                    ? gopTheoTuan(theoChuyenKhoa[0].forecast).map((t) => (
                      <th key={t.tu} className="py-2 px-2 font-bold text-center whitespace-nowrap">{ddmm(t.tu)} – {ddmm(t.den)}</th>
                    ))
                    : theoChuyenKhoa[0].forecast.map((d) => (
                      <th key={d.ngay} className="py-2 px-2 font-bold text-center whitespace-nowrap">{d.thu} {ddmm(d.ngay)}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {theoChuyenKhoa.map((k) => (
                  <tr key={k.chuyen_khoa}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{k.chuyen_khoa}</td>
                    {gopTuan
                      ? gopTheoTuan(k.forecast).map((t) => (
                        <td key={t.tu} className="py-2 px-2 text-center" title="Tổng lượt dự kiến trong tuần">
                          <span className="font-bold text-slate-900">{t.tong}</span>
                        </td>
                      ))
                      : k.forecast.map((d) => (
                        <td key={d.ngay} className="py-2 px-2 text-center" title={`Khoảng tin cậy 95%: ${d.ci_thap} - ${d.ci_cao}`}>
                          <span className="font-bold text-slate-900">{d.du_bao}</span>
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 5c. CHẤT LƯỢNG MÔ HÌNH: SAI SỐ THỰC TẾ & ĐỘ CHÍNH XÁC PHÂN LUỒNG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <h3 className="text-base font-bold text-slate-900">Sai Số Thực Tế Của Dự Báo</h3>
          {saiSoThucTe ? (
            <>
              <p className="text-sm text-slate-700">
                <span className="text-2xl font-black text-slate-900">{saiSoThucTe.mape}%</span>{' '}
                sai số trung bình của dự báo trước 1 ngày, đối chiếu với lượt tiếp nhận thật trong {saiSoThucTe.soNgay} ngày gần đây.
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {saiSoThucTe.chiTiet.slice(-10).map((r) => (
                  <span key={r.ngay} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {r.ngay.slice(8)}/{r.ngay.slice(5, 7)}: dự báo {r.duBao}, thực tế {r.thucTe}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Chưa có số liệu. Hệ thống lưu lại dự báo mỗi ngày trang này được mở, rồi đối chiếu với số lượt thật của ngày hôm sau.
            </p>
          )}
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            {ngayDieuChinh.length > 0
              ? `Đã điều chỉnh theo lịch sử: ${ngayDieuChinh.map((d) => `${d.thu} ${d.ngay.slice(8)}/${d.ngay.slice(5, 7)} ×${((d.he_so_ngay_le ?? 1) * (d.he_so_mua_vu ?? 1)).toFixed(2)}${d.ten_ngay_le ? ` (${d.ten_ngay_le})` : ' (mùa vụ)'}`).join(', ')}`
              : 'Hiệu ứng ngày lễ và mùa vụ (cùng kỳ năm trước) tự áp dụng khi có hơn 1 năm dữ liệu; tuần này chưa có điều chỉnh nào.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <h3 className="text-base font-bold text-slate-900">Độ Chính Xác AI Phân Luồng Chuyên Khoa</h3>
          {phanLoai.tongMau > 0 ? (
            <>
              <p className="text-sm text-slate-700">
                <span className="text-2xl font-black text-slate-900">{phanLoai.tyLeDung}%</span>{' '}
                gợi ý đúng trên {phanLoai.tongMau} lần lễ tân xác nhận ({phanLoai.soNgay} ngày gần đây).
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {phanLoai.theoKhoa.map((k) => (
                  <span key={k.maKhoa} className={`px-2 py-0.5 rounded ${k.tyLeDung >= 80 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                    {k.tenKhoa}: {k.tyLeDung}% ({k.soDung}/{k.soMau})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Chưa có xác nhận nào từ lễ tân. Ở trang Phân luồng nhanh, lễ tân bấm “Đúng” hoặc chọn chuyên khoa đúng sau mỗi gợi ý.
            </p>
          )}
          {phanLoai.moHinh && (
            <div className="pt-1 border-t border-slate-100 space-y-1.5">
              <p className="text-xs text-slate-500">
                Mô hình tự huấn luyện: {phanLoai.moHinh.so_mau} mẫu ({phanLoai.moHinh.so_mau_le_tan ?? 0} từ lễ tân),
                kiểm định chéo {Math.round(phanLoai.moHinh.cv_accuracy_seed * 100)}% — theo khoa:
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {phanLoai.moHinh.cv_theo_khoa.map((k) => (
                  <span key={k.ma_khoa} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{k.tenKhoa}: {k.ty_le_dung}%</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 6. NHỊP ĐIỆU HOẠT ĐỘNG PHÒNG KHÁM (PATTERN SUMMARY) ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Ngày Cao Điểm Nhất Tuần</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong>Thứ Bảy & Thứ Hai:</strong> Lưu lượng tiếp nhận đạt <strong>52 - 54 ca/ngày</strong> (cao gấp ~2.2 lần so với ngày thấp điểm). Cần chuẩn bị sẵn sàng quầy tiếp tân từ 07:15 sáng.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Ngày Thấp Điểm Trong Tuần</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong>Chủ Nhật:</strong> Lưu lượng duy trì ~<strong>25 ca</strong>. Thích hợp để bố trí nhân sự nghỉ bù luân phiên, bảo trì phần mềm và hệ thống máy xét nghiệm cận lâm sàng.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Khung Giờ Vàng Tiếp Đón</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong>08:30 - 10:30 & 14:00 - 15:30:</strong> Chiếm trên 60% tổng lượt khám trong ngày. Điều dưỡng sảnh cần tăng cường hỗ trợ đo huyết áp và sinh hiệu nhanh.
          </p>
        </div>
      </div>
    </div>
  );
}
