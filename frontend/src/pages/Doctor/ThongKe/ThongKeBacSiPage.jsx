import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { apiGet } from '../../../services/api';
import { Users, FileText, Pill, FlaskConical, BarChart3, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function ThongKeBacSiPage() {
  const [timeRange, setTimeRange] = useState('thang_nay');

  const { data } = useQuery({
    queryKey: ['thong-ke-bac-si', timeRange],
    queryFn: () => apiGet(`/ho-so-benh-an/thong-ke-bac-si?range=${timeRange}`),
  });

  const stats = data?.data || {
    tongBenhNhanDaKham: 142,
    tongDonThuocKe: 128,
    tongChiDinhXetNghiem: 85,
    tyLeHoanThanh: '98.5%',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary-600" /> Thống Kê & Báo Cáo Khám Chữa Bệnh
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            UC-BS-10: Báo cáo chỉ số hoạt động khám chữa bệnh, đơn thuốc và bệnh nhân của Bác sĩ
          </p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="hom_nay">Hôm nay</option>
          <option value="tuan_nay">Tuần này</option>
          <option value="thang_nay">Tháng này</option>
          <option value="nam_nay">Năm nay</option>
        </select>
      </div>

      {/* Cards Chỉ số */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Bệnh nhân đã khám</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.tongBenhNhanDaKham}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Đơn thuốc đã kê</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.tongDonThuocKe}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Chỉ định xét nghiệm</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.tongChiDinhXetNghiem}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tỷ lệ hoàn thành</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.tyLeHoanThanh}</p>
          </div>
        </div>
      </div>

      {/* Phân tích bệnh thường gặp */}
      <MedCard title="Bệnh lý chẩn đoán phổ biến">
        <div className="space-y-3">
          {[
            { benh: 'Tăng huyết áp vô căn (I10)', soLuong: 45, tyLe: '31.6%' },
            { benh: 'Viêm họng cấp (J02)', soLuong: 32, tyLe: '22.5%' },
            { benh: 'Đái tháo đường tuýp 2 (E11)', soLuong: 24, tyLe: '16.9%' },
            { benh: 'Viêm dạ dày ruột (K52)', soLuong: 18, tyLe: '12.6%' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div>
                <p className="font-semibold text-sm text-gray-900">{item.benh}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.soLuong} lượt bệnh nhân</p>
              </div>
              <span className="text-sm font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
                {item.tyLe}
              </span>
            </div>
          ))}
        </div>
      </MedCard>
    </div>
  );
}

