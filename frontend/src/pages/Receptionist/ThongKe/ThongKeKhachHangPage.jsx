import { useState } from 'react';
import { Users, CalendarCheck, Clock, CheckCircle2, XCircle, TrendingUp, BarChart2 } from 'lucide-react';
import { MedCard } from '../../../design-system/components/Card/MedCard';

export default function ThongKeKhachHangPage() {
  const [timeRange, setTimeRange] = useState('thang');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Thống kê Báo cáo Khách hàng & Lượt khám</h1>
          <p className="text-sm text-gray-500 mt-1">
            Báo cáo tổng hợp lưu lượng bệnh nhân tiếp nhận, tỷ lệ xác nhận lịch hẹn và phân bổ theo chuyên khoa
          </p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white font-semibold text-gray-800 shadow-sm"
        >
          <option value="hom-nay">Hôm nay (02/09/2026)</option>
          <option value="tuan">Tuần này</option>
          <option value="thang">Tháng này (Tháng 9/2026)</option>
        </select>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng Lượt Tiếp Nhận</span>
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">148 <span className="text-xs text-emerald-600 font-normal">↑ 12%</span></p>
          <p className="text-xs text-gray-500">Bệnh nhân đến quầy làm thủ tục</p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Lịch Hẹn Đặt Trực Tuyến</span>
            <CalendarCheck className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">86</p>
          <p className="text-xs text-gray-500">Đã cọc 1/5 phí khám (40k)</p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Đã Khám Hoàn Thành</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">124 <span className="text-xs text-gray-500 font-normal">(83.7%)</span></p>
          <p className="text-xs text-gray-500">Đã vào phòng gặp Bác sĩ</p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tỷ Lệ Hủy / Vắng Mặt</span>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-red-600">8.2%</p>
          <p className="text-xs text-gray-500">Thu giữ cọc theo quy định (No-show &lt;2h)</p>
        </div>
      </div>

      {/* Bảng phân bổ chuyên khoa tiếp nhận */}
      <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
          <BarChart2 className="h-5 w-5 text-primary-600" /> Thống Kê Tiếp Nhận Theo Chuyên Khoa
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Chuyên Khoa</th>
                <th className="px-4 py-3">Lượt Tiếp Nhận</th>
                <th className="px-4 py-3">Tỷ Lệ %</th>
                <th className="px-4 py-3">Thời Gian Chờ Trung Bình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { khoa: 'Nội tổng quát', luot: 52, pct: '35.1%', cho: '8 phút' },
                { khoa: 'Nhi khoa', luot: 34, pct: '23.0%', cho: '5 phút' },
                { khoa: 'Tai Mũi Họng', luot: 28, pct: '18.9%', cho: '10 phút' },
                { khoa: 'Tim mạch', luot: 18, pct: '12.1%', cho: '12 phút' },
                { khoa: 'Răng Hàm Mặt & Mắt', luot: 16, pct: '10.9%', cho: '6 phút' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.khoa}</td>
                  <td className="px-4 py-3 text-gray-700">{row.luot} lượt</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: row.pct }} />
                      </div>
                      <span className="text-xs text-gray-600 font-bold">{row.pct}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{row.cho}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

