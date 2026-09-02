import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { apiGet } from '../../../services/api';
import { formatDateTime } from '../../../utils/formatDate';
import { Calendar, Clock, User, Phone, Video, Stethoscope, Filter } from 'lucide-react';

export default function LichHenBacSiPage() {
  const [filterLoai, setFilterLoai] = useState('tat_ca');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ['lich-hen-bac-si', selectedDate, filterLoai],
    queryFn: () => apiGet(`/lich-hen?ngay=${selectedDate}`),
  });

  const items = data?.data || [
    {
      id: 1,
      maLichHen: 'LH20260010',
      benhNhan: { hoTen: 'Nguyễn Thị Hoa', soDienThoai: '0988112233', gioiTinh: 'nu' },
      hinhThucKham: 'truc_tiep',
      gioKham: '08:30 - 09:00',
      lyDoKham: 'Khám tổng quát định kỳ',
      trangThai: 'da_xac_nhan',
    },
    {
      id: 2,
      maLichHen: 'LH20260012',
      benhNhan: { hoTen: 'Nguyễn Văn Nam', soDienThoai: '0912345678', gioiTinh: 'nam' },
      hinhThucKham: 'online',
      gioKham: '09:30 - 10:00',
      lyDoKham: 'Tư vấn đau đầu kéo dài',
      trangThai: 'da_xac_nhan',
    },
  ];

  const filteredItems = items.filter((item) => {
    if (filterLoai === 'truc_tiep') return item.hinhThucKham === 'truc_tiep';
    if (filterLoai === 'online') return item.hinhThucKham === 'online';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary-600" /> Lịch Tư Vấn & Lịch Khám Bác Sĩ
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            UC-BS-06: Xem lịch khám và tư vấn trực tiếp / online được phân công
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        {[
          { key: 'tat_ca', label: 'Tất cả ca khám' },
          { key: 'truc_tiep', label: 'Khám trực tiếp', icon: Stethoscope },
          { key: 'online', label: 'Tư vấn online', icon: Video },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilterLoai(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterLoai === key
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />} {label}
          </button>
        ))}
      </div>

      {/* Grid lịch hẹn */}
      <MedCard>
        {isLoading ? (
          <p className="text-center text-sm text-gray-400 py-8">Đang tải lịch hẹn...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Không có lịch tư vấn hoặc khám bệnh nào trong ngày chọn</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 hover:border-primary-300 transition-all shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-700">{item.maLichHen}</span>
                  <StatusBadge status={item.trangThai === 'da_xac_nhan' ? 'dang_kham' : 'cho_kham'} size="sm" />
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-base">{item.benhNhan?.hoTen}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3 w-3" /> {item.benhNhan?.soDienThoai}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="flex items-center gap-1 font-semibold text-gray-700">
                    <Clock className="h-3.5 w-3.5 text-primary-600" /> {item.gioKham}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold ${item.hinhThucKham === 'online' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.hinhThucKham === 'online' ? '🎥 Online' : '🏥 Trực tiếp'}
                  </span>
                </div>

                <p className="text-xs text-gray-600 bg-gray-50/70 p-2 rounded line-clamp-2">
                  Lý do khám: {item.lyDoKham}
                </p>
              </div>
            ))}
          </div>
        )}
      </MedCard>
    </div>
  );
}

