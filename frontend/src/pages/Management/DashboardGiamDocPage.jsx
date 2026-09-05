import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  TrendingUp, Users, Calendar, AlertCircle, Clock, CheckCircle2,
  DollarSign, Stethoscope, FileText, ArrowRight, RefreshCw, BarChart3,
  PieChart as PieChartIcon, ShieldCheck, Sparkles, Activity
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export default function DashboardGiamDocPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('hom_nay');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['giam-doc-dashboard', timeRange],
    queryFn: () => apiGet(`/quan-ly/dashboard-stats?range=${timeRange}`),
    refetchInterval: 30000, // Cập nhật tự động mỗi 30s
  });

  const stats = data?.data;
  const kpis = stats?.kpis || {};

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-primary-900 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" /> Ban Giám Đốc • Điều Hành Trung Tâm
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard Tổng Quan Hoạt Động</h1>
          <p className="text-blue-200 text-sm mt-1">
            Theo dõi thời gian thực lưu lượng bệnh nhân, doanh thu và vận hành phòng khám
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
          <button
            onClick={() => navigate('/quan-ly/du-bao-luong')}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-extrabold shadow-sm transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" /> Xem Dự Báo AI
          </button>
        </div>
      </div>

      {/* ─── 4 TOP KPI CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu hôm nay */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doanh Thu Hôm Nay</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {isLoading ? '...' : formatCurrency(kpis.doanhThuHomNay || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tổng lũy kế: <strong className="text-gray-700">{formatCurrency(kpis.tongDoanhThu || 0)}</strong>
          </p>
        </div>

        {/* Lượt khám hôm nay */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiếp Nhận Hôm Nay</span>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {isLoading ? '...' : `${kpis.tiepNhanHomNay || 0} lượt`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tổng lượt tiếp nhận: <strong className="text-gray-700">{kpis.totalTiepNhan || 0}</strong>
          </p>
        </div>

        {/* Bác sĩ & Nhân sự */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đội Ngũ Bác Sĩ</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">
            {isLoading ? '...' : `${kpis.soBacSi || 0} bác sĩ`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tổng nhân viên: <strong className="text-gray-700">{kpis.soNhanVien || 0} người</strong>
          </p>
        </div>

        {/* Đơn chờ duyệt */}
        <div
          onClick={() => navigate('/quan-ly/phe-duyet-don')}
          className="bg-white rounded-2xl p-5 border border-amber-200 shadow-2xs hover:border-amber-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Đơn Cần Phê Duyệt</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-amber-600">
              {isLoading ? '...' : kpis.donChoDuyet || 0}
            </p>
            <span className="text-xs text-amber-700 font-semibold">yêu cầu chờ</span>
          </div>
          <p className="text-xs text-primary-600 font-bold mt-1 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Xem và duyệt ngay <ArrowRight className="h-3 w-3" />
          </p>
        </div>
      </div>

      {/* ─── CHARTS ROW ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 7 ngày qua: Lượt khám & Doanh thu */}
        <div className="lg:col-span-2">
          <MedCard
            title="📊 Xu Hướng Khám Chữa Bệnh (7 Ngày Gần Nhất)"
            subtitle="Số lượt tiếp nhận bệnh nhân theo ngày"
            action={
              <button
                onClick={() => navigate('/quan-ly/tai-chinh')}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1"
              >
                Chi tiết tài chính <ArrowRight className="h-3 w-3" />
              </button>
            }
          >
            <div className="h-72 w-full pt-4">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">Đang tải biểu đồ...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chart7Days || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="ngay" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(val, name) => [
                        name === 'soLuotKham' ? `${val} ca khám` : formatCurrency(val),
                        name === 'soLuotKham' ? 'Số lượt khám' : 'Doanh thu',
                      ]}
                    />
                    <Bar dataKey="soLuotKham" fill="#2563EB" radius={[6, 6, 0, 0]} name="Số lượt khám" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>

        {/* Cơ cấu doanh thu theo nguồn */}
        <div>
          <MedCard
            title="🍩 Cơ Cấu Nguồn Thu"
            subtitle="Phân bổ theo loại phí viện phí"
          >
            <div className="h-72 w-full flex flex-col items-center justify-center pt-2">
              {isLoading ? (
                <div className="text-sm text-gray-400">Đang tải...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.coCauDoanhThu || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(stats?.coCauDoanhThu || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconSize={10}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>
      </div>

      {/* ─── BOTTOM ROW: TOP BÁC SĨ & QUICK ACTIONS ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Bác sĩ khám nhiều nhất */}
        <div className="lg:col-span-2">
          <MedCard
            title="🏆 Top Bác Sĩ Hoạt Động Hiệu Suất Cao"
            subtitle="Dựa trên số ca bệnh án đã hoàn thành khám"
          >
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-400">Đang tải...</div>
              ) : (stats?.topBacSi || []).length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">Chưa có dữ liệu khám của bác sĩ</div>
              ) : (
                (stats?.topBacSi || []).map((bs, index) => (
                  <div key={index} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{bs.hoTen}</p>
                        <p className="text-xs text-gray-500">{bs.chuyenKhoa}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        {bs.soCa} ca khám
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </MedCard>
        </div>

        {/* Quick Links for Directors */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-gray-800 text-sm">Chức năng Điều hành nhanh</h3>

            <button
              onClick={() => navigate('/quan-ly/tai-chinh')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-700 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-primary-600" />
                <span className="text-xs font-bold">Báo cáo Tài chính & Doanh thu</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/quan-ly/xep-lich')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-700 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold">Quản lý & Xếp lịch làm việc</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/quan-ly/tra-cuu')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-700 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold">Tra cứu Hồ sơ Nhân sự & Bệnh án</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/quan-ly/phe-duyet-don')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-amber-50 text-gray-800 hover:text-amber-800 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold">Phê duyệt yêu cầu / Đơn nghỉ phép</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
