import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet, apiPost } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';
import { Clock, AlertTriangle, User2, Tv, Volume2, Loader2 } from 'lucide-react';
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
  const [callingId, setCallingId] = useState(null);
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
    socket.on('queue:call', () => refetch());

    return () => {
      socket.off('queue:update');
      socket.off('queue:call');
    };
  }, []);

  const handleGoiLoa = async (luotId) => {
    setCallingId(luotId);
    try {
      await apiPost(`/tiep-nhan/${luotId}/goi-loa`);
      refetch();
    } catch (err) {
      console.error('Lỗi gọi loa:', err);
    } finally {
      setCallingId(null);
    }
  };

  const dangKham = items.filter((i) => ['dang_kham', 'dang_cls', 'da_co_kq_cls'].includes(i.trangThai));
  const choKham  = items.filter((i) => i.trangThai === 'cho_kham');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hàng đợi khám hôm nay</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {dangKham.length} đang khám · {choKham.length} chờ khám
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/man-hinh-goi-so"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow"
          >
            <Tv className="w-4 h-4" /> Mở Màn Hình TV Sảnh Chờ (Full)
          </a>

          <div className="flex items-center gap-1.5 rounded-full bg-success-light border border-success-main/30 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-success-main animate-pulse" />
            <span className="text-xs font-medium text-success-dark">Real-time Sync</span>
          </div>
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
                <QueueCard
                  key={item.id}
                  luot={item}
                  onGoiLoa={() => handleGoiLoa(item.id)}
                  isCalling={callingId === item.id}
                />
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
                <QueueRow
                  key={item.id}
                  luot={item}
                  onGoiLoa={() => handleGoiLoa(item.id)}
                  isCalling={callingId === item.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueCard({ luot, onGoiLoa, isCalling }) {
  const bn = luot.benhNhan || {};
  const bs = luot.bacSi?.nhanVien || {};

  return (
    <MedCard
      allergyNote={bn.diUng}
      className="border-primary-200 bg-primary-50/40"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl font-bold text-primary-700">{luot.maSoThuTu}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onGoiLoa}
            disabled={isCalling}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-colors"
            title="Phát loa gọi lại số này lên TV"
          >
            {isCalling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
            Gọi lại loa
          </button>
          <StatusBadge status={luot.trangThai || 'dang_kham'} />
        </div>
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

function QueueRow({ luot, onGoiLoa, isCalling }) {
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

      <button
        onClick={onGoiLoa}
        disabled={isCalling}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex-shrink-0"
        title="Mời bệnh nhân vào khám và phát loa TV"
      >
        {isCalling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
        Gọi vào khám
      </button>

      <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
        <Clock className="h-3.5 w-3.5" />
        {formatDateTime(luot.thoiGianDen)}
      </div>
    </div>
  );
}

