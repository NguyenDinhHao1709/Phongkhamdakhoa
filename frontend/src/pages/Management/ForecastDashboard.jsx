import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
  ComposedChart, Area, Line, Legend
} from 'recharts';
import {
  TrendingUp, Users, Calendar, CheckCircle,
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
  const [timeViewTab, setTimeViewTab] = useState('weekly'); // 'weekly' | 'hourly'

  const { data, isLoading } = useQuery({
    queryKey: ['ai-forecast-nang-cao'],
    queryFn: () => apiGet('/ai/du-bao-nang-cao'),
    refetchInterval: 5 * 60 * 1000,
  });

  const forecastResult = data?.data || {};
  const forecast7Days = forecastResult.forecast7Days || [];
  const hourlyData = forecastResult.heatmapHomNay || [];
  const dataQuality = forecastResult.dataQuality;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ─── HEADER BAN GIÁM ĐỐC: CHUẨN Y TẾ TRANG TRỌNG ────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              Theo Dõi Và Phân Tích Lưu Lượng
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dự Báo Lưu Lượng Bệnh Nhân
          </h1>
          <p className="text-sm text-slate-500">
            Phân tích lưu lượng phục vụ công tác điều hành và bố trí nguồn lực
          </p>
        </div>

        <div className="text-xs text-slate-500">
          Cập nhật theo dữ liệu vận hành
        </div>
      </div>

      {/* ─── 4 THÔNG SỐ VẬN HÀNH & ĐỘ CHÍNH XÁC MÔ HÌNH ──────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dự báo ngày gần nhất</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{forecast7Days[0]?.du_bao ?? '—'} lượt</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Kết quả phân tích gần nhất</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sai số kiểm định</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">
              {forecastResult.mape != null ? `${forecastResult.mape}%` : '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Tính trên dữ liệu đã ghi nhận</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Thermometer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Số ngày đã ghi nhận</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{dataQuality?.observedDays ?? '—'}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Dữ liệu vận hành</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trạng thái dữ liệu</p>
            <p className="text-xl font-black text-indigo-900 mt-0.5">{forecast7Days.length > 0 ? 'Đủ dữ liệu' : 'Chưa đủ dữ liệu'}</p>
            <p className="text-[11px] text-indigo-700 font-medium mt-0.5">Theo số liệu đã ghi nhận</p>
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
              {forecast7Days.length > 0 ? 'Kết quả phân tích lưu lượng' : 'Chưa đủ dữ liệu để phân tích'}
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
              {forecast7Days.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Chưa đủ dữ liệu thực tế để tạo dự báo.
                </div>
              ) : <ResponsiveContainer width="100%" height="100%">
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
                          <p className="text-slate-600 italic mt-1">{d.is_ngay_le ? d.ten_ngay_le : 'Dự báo theo lịch sử lượt tiếp nhận'}</p>
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
                </ComposedChart>
              </ResponsiveContainer>}
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
              {hourlyData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Hôm nay chưa có lượt tiếp nhận thực tế.
                </div>
              ) : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="gio" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} lượt tiếp nhận thực tế`,
                      'Lượt tiếp nhận'
                    ]}
                  />
                  <Bar dataKey="soLuong" radius={[6, 6, 0, 0]}>
                    {hourlyData.map((entry, i) => (
                      <Cell key={i} fill="#3B82F6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>}
            </div>
          </div>
        )}
      </div>

      {/* ─── PHÂN TÍCH DỮ LIỆU & GỢI Ý NHÂN SỰ CHO BGĐ ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: ĐẶC TRƯNG HỌC MÁY (FEATURE IMPORTANCES) */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Phân Tích Dữ Liệu Vận Hành
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng hợp từ số liệu đã ghi nhận
            </p>
          </div>

          <div className="space-y-3 pt-1 text-sm text-slate-600">
            <p>Chưa có đủ dữ liệu chi tiết để phân tích các yếu tố ảnh hưởng.</p>
            <p>Số ngày quan sát: <strong>{dataQuality?.observedDays ?? 0}</strong></p>
            <p>Số ngày tối thiểu: <strong>{dataQuality?.minimumDaysRequired ?? 21}</strong></p>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            Chỉ hiển thị các chỉ số có dữ liệu tương ứng trong hệ thống.
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
                Chỉ hiển thị dữ liệu lịch làm việc thực tế khi hệ thống đã có nguồn tương ứng
              </p>
            </div>
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
                {forecast7Days.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-6 px-3 text-center text-slate-500">
                      Chưa có dự báo thực tế để phân tích hoặc đề xuất nhân sự.
                    </td>
                  </tr>
                )}
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
                      Chưa có dữ liệu lịch làm việc
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      Chưa có dữ liệu lịch làm việc
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {item.goi_y_nhan_su || 'Chưa đủ dữ liệu để khuyến nghị'}
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
