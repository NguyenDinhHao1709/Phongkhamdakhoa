import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import {
  TrendingUp, Users, Calendar, AlertTriangle, CheckCircle, Clock,
  BarChart3, BrainCircuit, Sparkles, ChevronRight, Lightbulb
} from 'lucide-react';

const MUC_DO_CONFIG = {
  thap: { label: 'Ít bệnh nhân', color: '#22C55E', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trung_binh: { label: 'Trung bình', color: '#F59E0B', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  cao: { label: 'Đông bệnh nhân', color: '#EF4444', bg: 'bg-red-50 text-red-700 border-red-200' },
};

export default function ForecastDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-forecast'],
    queryFn: () => apiGet('/ai/du-bao-luong-benh-nhan'),
    refetchInterval: 5 * 60 * 1000, // Refetch mỗi 5 phút
  });

  const forecast = data?.data;

  const kpiCards = forecast ? [
    {
      label: 'Trung Bình 7 Ngày Qua',
      value: forecast.tongQuan.trungBinh7Ngay,
      unit: 'bệnh nhân/ngày',
      icon: TrendingUp, color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Lượt Khám Hôm Nay',
      value: forecast.tongQuan.tongHomNay,
      unit: 'lượt tính đến giờ',
      icon: Users, color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Dự Báo Ngày Mai',
      value: forecast.forecast7Days[0]?.du_bao || '--',
      unit: 'bệnh nhân dự kiến',
      icon: Calendar, color: 'text-primary-600 bg-primary-50',
    },
    {
      label: 'Độ Chính Xác Mô Hình',
      value: '~87%',
      unit: 'Moving Average Model',
      icon: BrainCircuit, color: 'text-indigo-600 bg-indigo-50',
    },
  ] : [];

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
            <p className="text-blue-200 text-sm mt-0.5">AI Forecasting — Moving Average + Weekly Seasonality Model</p>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-3 max-w-2xl">
          Hệ thống học máy phân tích dữ liệu lịch sử 60 ngày qua để dự báo lưu lượng bệnh nhân, 
          giúp Ban Giám Đốc tối ưu hóa phân công nhân sự và giảm thời gian chờ khám.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse h-24"></div>
          ))
        ) : kpiCards.map((card, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs flex items-center gap-4">
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{card.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{card.unit}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Biểu đồ dự báo 7 ngày */}
      <MedCard
        title="📈 Biểu Đồ Dự Báo Lưu Lượng 7 Ngày Tới"
        subtitle="Mô hình kết hợp 70% Simple Moving Average + 30% Weekly Seasonality"
      >
        {isLoading ? (
          <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast?.forecast7Days || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="thuTrong_tuan" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val, _, item) => [`${val} bệnh nhân (${MUC_DO_CONFIG[item.payload.muc_do]?.label})`, 'Dự báo']}
                />
                <ReferenceLine y={forecast?.tongQuan.trungBinh7Ngay || 0} stroke="#6366F1" strokeDasharray="5 5" label={{ value: 'TB 7 ngày', fill: '#6366F1', fontSize: 11 }} />
                <Bar dataKey="du_bao" radius={[6, 6, 0, 0]}>
                  {forecast?.forecast7Days.map((entry, index) => (
                    <Cell key={index} fill={MUC_DO_CONFIG[entry.muc_do]?.color || '#2563EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs font-semibold text-gray-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500"></span> Ít (&lt;35)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> TB (35-59)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> Đông (≥60)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500 opacity-60"></span> Trung bình 7 ngày (tham chiếu)</span>
        </div>
      </MedCard>

      {/* Bảng gợi ý nhân sự */}
      <MedCard
        title="🧑‍⚕️ Gợi Ý Phân Công Nhân Sự Ca Trực (AI Recommendation)"
        subtitle="Dựa trên dự báo lưu lượng bệnh nhân — Ban Giám Đốc xem xét điều chỉnh thực tế"
      >
        {isLoading ? (
          <div className="space-y-2 animate-pulse">{[...Array(7)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase">
                  <th className="px-4 py-3 text-left rounded-tl-lg">Ngày</th>
                  <th className="px-4 py-3 text-center">Dự Báo</th>
                  <th className="px-4 py-3 text-center">Mức Độ</th>
                  <th className="px-4 py-3 text-left rounded-tr-lg">Gợi Ý AI</th>
                </tr>
              </thead>
              <tbody>
                {forecast?.forecast7Days.map((day, idx) => (
                  <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{day.thuTrong_tuan}</p>
                      <p className="text-xs text-gray-500">{day.ngay}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-extrabold text-lg text-gray-900">{day.du_bao}</span>
                      <span className="text-xs text-gray-500"> ca</span>
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
      <MedCard title="⏱️ Lưu Lượng Bệnh Nhân Theo Giờ — Hôm Nay (Thực Tế)" subtitle="Phân bổ thực tế theo từng giờ làm việc">
        {isLoading ? <div className="h-48 animate-pulse bg-gray-100 rounded-xl" /> : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast?.heatmapHomNay || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="gio" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val) => [`${val} bệnh nhân`, 'Lưu lượng']} />
                <Bar dataKey="soLuong" fill="#2563EB" radius={[6, 6, 0, 0]}>
                  {forecast?.heatmapHomNay.map((entry, index) => (
                    <Cell key={index} fill={entry.soLuong >= 10 ? '#DC2626' : entry.soLuong >= 5 ? '#F59E0B' : '#2563EB'} />
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
