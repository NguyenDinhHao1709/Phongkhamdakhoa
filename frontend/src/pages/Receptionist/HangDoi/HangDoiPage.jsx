import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';
import { Clock, AlertTriangle, User2 } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

let socket = null;

function useHangDoi() {
  return useQuery({
    queryKey: ['tiep-nhan', 'hang-doi'],
    queryFn: () => apiGet('/tiep-nhan/hang-doi'),
    refetchInterval: 30000, // refresh mỗi 30s
  });
}

export default function HangDoiPage() {
  const { data, isLoading, refetch } = useHangDoi();
  const { accessToken } = useAuthStore();
  const items = data?.data || [];

  // Kết nối WebSocket để nhận cập nhật real-time
  useEffect(() => {
    if (!socket) {
      socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
        auth: { token: accessToken },
        transports: ['websocket'],
      });
    }

    socket.on('queue:update', () => refetch());

    return () => {
      socket.off('queue:update');
    };
  }, []);

  const dangKham = items.filter((i) => i.trangThai === 'dang_kham');
  const choKham  = items.filter((i) => i.trangThai === 'cho_kham');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hàng đợi hôm nay</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {dangKham.length} đang khám · {choKham.length} chờ khám
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-success-light border border-success-main/30 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-success-main animate-pulse" />
          <span className="text-xs font-medium text-success-dark">Real-time</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Đang khám */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary-700 mb-3">
            Đang khám ({dangKham.length})
          </h2>
          {dangKham.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
              Không có bệnh nhân đang khám
            </div>
          ) : (
            <div className="space-y-3">
              {dangKham.map((item) => (
                <QueueCard key={item.id} luot={item} />
              ))}
            </div>
          )}
        </div>

        {/* Chờ khám */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3">
            Chờ khám ({choKham.length})
          </h2>
          {choKham.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
              Không có bệnh nhân chờ khám
            </div>
          ) : (
            <div className="space-y-2">
              {choKham.map((item) => (
                <QueueRow key={item.id} luot={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueCard({ luot }) {
  const bn = luot.benhNhan || {};
  const bs = luot.bacSi?.nhanVien || {};

  return (
    <MedCard
      allergyNote={bn.diUng}
      className="border-primary-200 bg-primary-50/40"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl font-bold text-primary-700">{luot.maSoThuTu}</span>
        <StatusBadge status="dang_kham" />
      </div>
      <p className="font-semibold text-gray-900">{bn.hoTen}</p>
      <p className="text-sm text-gray-500">
        {tinhTuoi(bn.ngaySinh) && `${tinhTuoi(bn.ngaySinh)} tuổi`}
        {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
      </p>
      {bs.hoTen && <p className="mt-2 text-xs text-gray-400">BS. {bs.hoTen}</p>}
    </MedCard>
  );
}

function QueueRow({ luot, idx }) {
  const bn = luot.benhNhan || {};

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 font-bold text-sm">
        {luot.maSoThuTu}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 truncate">{bn.hoTen}</p>
          {bn.diUng && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-light border border-danger-main/20 px-1.5 py-0.5 text-xs font-medium text-danger-dark">
              <AlertTriangle className="h-2.5 w-2.5" /> DỊ ỨNG
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {tinhTuoi(bn.ngaySinh) && `${tinhTuoi(bn.ngaySinh)} tuổi`}
          {bn.soDienThoai && ` · ${bn.soDienThoai}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
        <Clock className="h-3.5 w-3.5" />
        {formatDateTime(luot.thoiGianDen)}
      </div>
    </div>
  );
}

