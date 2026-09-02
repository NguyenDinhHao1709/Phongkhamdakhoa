import { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate';

const SHIFTS = [
  { day: 'Thứ Hai', date: '01/09/2026', ca: 'Ca sáng (07:30 - 11:30)', viTri: 'Bàn tiếp nhận số 1', status: 'da_hoan_thanh' },
  { day: 'Thứ Ba', date: '02/09/2026', ca: 'Ca sáng (07:30 - 11:30)', viTri: 'Bàn tiếp nhận số 2 (Đang trực)', status: 'dang_truc' },
  { day: 'Thứ Tư', date: '03/09/2026', ca: 'Ca chiều (13:30 - 17:00)', viTri: 'Bàn điều phối bệnh nhân', status: 'sap_toi' },
  { day: 'Thứ Năm', date: '04/09/2026', ca: 'Ca sáng (07:30 - 11:30)', viTri: 'Bàn tiếp nhận số 1', status: 'sap_toi' },
  { day: 'Thứ Sáu', date: '05/09/2026', ca: 'Nghỉ phép ca chiều', viTri: '---', status: 'nghi' },
  { day: 'Thứ Bảy', date: '06/09/2026', ca: 'Ca sáng (07:30 - 11:30)', viTri: 'Bàn tiếp nhận số 3', status: 'sap_toi' },
  { day: 'Chủ Nhật', date: '07/09/2026', ca: 'Nghỉ luân phiên', viTri: '---', status: 'nghi' },
];

export default function LichLamViecPage() {
  const [week, setWeek] = useState('Tuần 36 (01/09/2026 - 07/09/2026)');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lịch làm việc ca trực Nhân viên</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tra cứu phân công ca trực, bàn làm việc và lịch phân công hàng tuần
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm text-sm font-semibold text-gray-800">
          <button className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft className="h-4 w-4" /></button>
          <span>{week}</span>
          <button className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Grid lịch làm việc */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHIFTS.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-2xl p-5 border transition-all ${
              item.status === 'dang_truc'
                ? 'bg-primary-50/80 border-primary-300 ring-2 ring-primary-400 shadow-sm'
                : item.status === 'nghi'
                ? 'bg-gray-50 border-gray-200 opacity-60'
                : 'bg-white border-gray-200 shadow-sm hover:border-primary-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div>
                <span className="font-bold text-gray-900 text-base">{item.day}</span>
                <span className="text-xs text-gray-500 ml-2">({item.date})</span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  item.status === 'dang_truc'
                    ? 'bg-primary-600 text-white border-primary-600 animate-pulse'
                    : item.status === 'da_hoan_thanh'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : item.status === 'nghi'
                    ? 'bg-gray-200 text-gray-700 border-gray-300'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {item.status === 'dang_truc'
                  ? '● Đang trực'
                  : item.status === 'da_hoan_thanh'
                  ? 'Đã hoàn thành'
                  : item.status === 'nghi'
                  ? 'Nghỉ'
                  : 'Sắp tới'}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-600" />
                <span>{item.ca}</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">{item.viTri}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

