import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  TrendingUp, Users, Calendar, AlertCircle, Clock, CheckCircle2,
  DollarSign, Stethoscope, FileText, ArrowRight, RefreshCw, BarChart3,
  PieChart as PieChartIcon, ShieldCheck, Sparkles, Activity,
  FlaskConical, Pill, Bed, Sparkle, Layers, ChevronRight, Check
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
  const clsList = stats?.hoatDongCls || [];
  const kenhData = stats?.kenhTiepNhan || [];
  const phongMo = stats?.phongMoGiuong?.phongMo204;
  const giuongHoiTinh = stats?.phongMoGiuong?.giuong205;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── HEADER ĐIỀU HÀNH BAN GIÁM ĐỐC ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" /> Ban Giám Đốc • Điều Hành Trung Tâm Toàn Diện
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Executive Hospital Dashboard</h1>
          <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl">
            Theo dõi thời gian thực lưu lượng khám chữa bệnh, chỉ định cận lâm sàng, hoạt động dược, công suất phòng mổ/giường bệnh & dòng tiền viện phí
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition-colors border border-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>
          <button
            onClick={() => navigate('/ban-giam-doc/tai-chinh')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <FileText className="h-3.5 w-3.5" /> Báo Cáo Toàn Diện BV
          </button>
          <button
            onClick={() => navigate('/ban-giam-doc/du-bao-luong')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-extrabold shadow-sm transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" /> Dự Báo Lưu Lượng
          </button>
        </div>
      </div>

      {/* ─── 5 TOP EXECUTIVE KPI CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Doanh thu hôm nay */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doanh Thu Viện Phí</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 mt-2">
            {isLoading ? '...' : formatCurrency(kpis.doanhThuHomNay || 0)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
            <span>Hôm nay</span>
            <span className="font-semibold text-gray-700">Lũy kế: {formatCurrency(kpis.tongDoanhThu || 0)}</span>
          </div>
        </div>

        {/* Lượt tiếp nhận */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lượt Tiếp Nhận</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-xl font-black text-blue-700 mt-2">
            {isLoading ? '...' : `${kpis.tiepNhanHomNay || 0} ca`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
            <span>Chờ TB: {kpis.thoiGianChoTrungBinh ?? '—'}</span>
            <span className="font-semibold text-gray-700">Tổng: {kpis.totalTiepNhan || 0}</span>
          </div>
        </div>

        {/* Chỉ định Cận lâm sàng */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chỉ Định CLS</span>
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FlaskConical className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-xl font-black text-purple-700 mt-2">
            {isLoading ? '...' : `${kpis.soCaCanLamSang ?? 0} ca`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
            <span className="text-purple-600 font-bold">Theo dữ liệu chỉ định</span>
            <span className="font-semibold text-emerald-600">{kpis.tyLeHoanThanhCls ?? '—'}</span>
          </div>
        </div>

        {/* Công suất Giường & Phòng Mổ */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">P.Mổ & Giường P.205</span>
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Bed className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-xl font-black text-teal-700 mt-2">
            {isLoading ? '...' : `${stats?.phongMoGiuong?.giuong205?.dangDung ?? '—'} / ${stats?.phongMoGiuong?.giuong205?.tongGiuong ?? '—'} giường`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
            <span>P.Mổ 204: {stats?.phongMoGiuong?.phongMo204?.trangThai ?? '—'}</span>
            <span className="font-semibold text-teal-700">{stats?.phongMoGiuong?.giuong205?.tyLeLapDay ?? '—'}</span>
          </div>
        </div>

        {/* Đơn yêu cầu chờ duyệt */}
        <div
          onClick={() => navigate('/ban-giam-doc/phe-duyet-don')}
          className="bg-white rounded-2xl p-4.5 border border-amber-200 shadow-xs hover:border-amber-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Yêu Cầu Chờ Duyệt</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-600 mt-2">
            {isLoading ? '...' : `${kpis.donChoDuyet || 0} đơn`}
          </p>
          <div className="flex items-center justify-between text-[11px] text-primary-600 font-bold mt-1.5 pt-1.5 border-t border-amber-100">
            <span>Đơn từ nhân viên</span>
            <span className="flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">Xử lý ngay <ArrowRight className="h-3 w-3" /></span>
          </div>
        </div>
      </div>

      {/* ─── CHARTS ROW: XU HƯỚNG & CƠ CẤU DOANH THU & KÊNH TIẾP NHẬN ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 7 ngày qua: Lượt khám & Doanh thu */}
        <div className="lg:col-span-2">
          <MedCard
            title="📊 Xu Hướng Khám Chữa Bệnh & Doanh Thu (7 Ngày Gần Nhất)"
            subtitle="Số lượt bệnh nhân tiếp nhận và tổng doanh thu thu được theo ngày"
            action={
              <button
                onClick={() => navigate('/ban-giam-doc/tai-chinh')}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1"
              >
                Báo cáo chi tiết <ArrowRight className="h-3 w-3" />
              </button>
            }
          >
            <div className="h-72 w-full pt-2">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">Đang tải biểu đồ...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chart7Days || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="ngay" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(val, name) => [
                        name === 'soLuotKham' ? `${val} ca khám` : formatCurrency(val),
                        name === 'soLuotKham' ? 'Số lượt khám' : 'Doanh thu',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="soLuotKham" fill="#2563EB" radius={[6, 6, 0, 0]} name="Số ca khám" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </MedCard>
        </div>

        {/* Cơ cấu nguồn thu viện phí */}
        <div>
          <MedCard
            title="🍩 Cơ Cấu Nguồn Thu Viện Phí"
            subtitle="Phân bổ tỷ trọng theo loại phí dịch vụ y tế"
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
                      cy="48%"
                      innerRadius={55}
                      outerRadius={82}
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

      {/* ─── CẬN LÂM SÀNG & KÊNH TIẾP NHẬN BỆNH NHÂN ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tiến độ & Hoàn thành Cận Lâm Sàng */}
        <div className="lg:col-span-2">
          <MedCard
            title="🧪 Hoạt Động & Năng Suất Cận Lâm Sàng (CLS)"
            subtitle="Theo dõi số lượng chỉ định và tỷ lệ trả kết quả đúng hạn cho bệnh nhân"
          >
            <div className="space-y-3.5 pt-2">
              {clsList.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.ten}</p>
                      <p className="text-xs text-gray-500">Đã trả kết quả: <strong className="text-emerald-700">{item.hoanThanh}</strong> / {item.tong} ca chỉ định</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="w-28 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full"
                        style={{ width: item.tyLe }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 min-w-[50px] text-right">{item.tyLe}</span>
                  </div>
                </div>
              ))}
            </div>
          </MedCard>
        </div>

        {/* Phân bổ kênh tiếp nhận */}
        <div>
          <MedCard
            title="📱 Phân Bổ Kênh Tiếp Nhận"
            subtitle="Hình thức đăng ký khám bệnh"
          >
            <div className="space-y-4 pt-3">
              {kenhData.map((k, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: k.color || COLORS[idx] }}></span>
                      {k.name}
                    </span>
                    <span className="font-extrabold text-gray-900">{k.value}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${k.value}%`, backgroundColor: k.color || COLORS[idx] }}
                    ></div>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800">
                <p className="font-bold">Phân tích lưu lượng</p>
                <p className="text-[11px] text-blue-700 mt-0.5">Chỉ hiển thị khi có dữ liệu vận hành tương ứng.</p>
              </div>
            </div>
          </MedCard>
        </div>
      </div>

      {/* ─── BOTTOM ROW: TOP BÁC SĨ & ĐIỀU HÀNH NHANH ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Bác sĩ khám nhiều nhất */}
        <div className="lg:col-span-2">
          <MedCard
            title="🏆 Đội Ngũ Bác Sĩ Hoạt Động Hiệu Suất Cao"
            subtitle="Xếp hạng theo số ca bệnh án đã hoàn thành khám và chỉ định"
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
                      <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
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
            <h3 className="font-bold text-gray-800 text-sm">Chức Năng Điều Hành Trọng Điểm</h3>

            <button
              onClick={() => navigate('/ban-giam-doc/tai-chinh')}
              className="w-full text-left p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors flex items-center justify-between group border border-blue-200"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="h-4.5 w-4.5 text-blue-700" />
                <div>
                  <p className="text-xs font-bold text-blue-900">Báo Cáo Toàn Diện BV</p>
                  <p className="text-[10px] text-blue-700">Lâm sàng, Cận lâm sàng, Dược & Tài chính</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/du-bao-luong')}
              className="w-full text-left p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors flex items-center justify-between group border border-amber-200"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-amber-700" />
                <div>
                  <p className="text-xs font-bold text-amber-900">Dự Báo Lưu Lượng</p>
                  <p className="text-[10px] text-amber-700">Phân tích theo dữ liệu vận hành</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/tra-cuu')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 transition-colors flex items-center justify-between group border border-gray-200"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4.5 w-4.5 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Tra Cứu Hồ Sơ Tổng Hợp</p>
                  <p className="text-[10px] text-gray-500">Tìm kiếm bệnh nhân & nhân sự</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/ban-giam-doc/xep-lich')}
              className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 transition-colors flex items-center justify-between group border border-gray-200"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4.5 w-4.5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Xếp Lịch & Phân Ca Làm Việc</p>
                  <p className="text-[10px] text-gray-500">Điều phối bác sĩ & điều dưỡng</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
