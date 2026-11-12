import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import * as XLSX from 'xlsx';
import { xuatExcel } from '../../../utils/xuatFile';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH, DOI_TUONG_UU_TIEN } from '../../../utils/constants';
import NhanUuTienTre from '../../../components/Queue/NhanUuTienTre';
import { Clock, AlertTriangle, User2, Tv, Volume2, Loader2, Download } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { BACKEND_URL } from '../../../utils/backendUrl';

let socket = null;

function useHangDoi() {
  return useQuery({
    queryKey: ['tiep-nhan', 'hang-doi'],
    queryFn: () => apiGet('/tiep-nhan/hang-doi'),
    refetchInterval: 2500, // Tự động làm mới mỗi 2.5s (dưới 3s)
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
      socket = io(BACKEND_URL || window.location.origin, {
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

  const handleDoiUuTien = async (luot, doiTuongUuTien) => {
    if (doiTuongUuTien === 'cap_cuu' && !window.confirm(`Chuyển ${luot.benhNhan?.hoTen || 'bệnh nhân'} thành CẤP CỨU? Bệnh nhân lên đầu hàng chờ và được khám trước, thu tiền sau.`)) return;
    try {
      await apiPatch(`/tiep-nhan/${luot.id}/uu-tien`, { doiTuongUuTien: doiTuongUuTien || null });
      refetch();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Không đổi được đối tượng ưu tiên');
    }
  };

  const handleQuaLuot = async (luot) => {
    if (!window.confirm(`${luot.benhNhan?.hoTen || 'Bệnh nhân'} (${luot.maSoThuTu}) không có mặt? Bệnh nhân sẽ được xếp cuối hàng chờ.`)) return;
    try {
      await apiPost(`/tiep-nhan/${luot.id}/qua-luot`);
      refetch();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Không qua lượt được');
    }
  };

  const handleExportExcel = () => {
    if (!items || items.length === 0) {
      alert('Hàng đợi hôm nay chưa có lượt tiếp đón nào để xuất file!');
      return;
    }

    const STATUS_MAP = {
      cho_kham: 'Chờ khám',
      dang_kham: 'Đang khám',
      dang_cls: 'Đang thực hiện CLS',
      da_co_kq_cls: 'Đã có kết quả CLS',
      hoan_thanh: 'Đã hoàn thành',
      da_huy: 'Đã hủy',
    };

    const rows = items.map((luot, idx) => {
      const bn = luot.benhNhan || {};
      const bs = luot.bacSi?.nhanVien || {};
      const pk = luot.phongKham || {};
      const gioDenStr = luot.thoiGianDen || luot.taoLuc ? formatDateTime(luot.thoiGianDen || luot.taoLuc) : '-';

      return {
        'STT': idx + 1,
        'Số Thứ Tự (STT Gọi)': luot.maSoThuTu || '',
        'Mã Lượt Tiếp Nhận': luot.id ? `LTN-${luot.id}` : '',
        'Mã Bệnh Nhân': bn.maBenhNhan || '',
        'Họ Tên Bệnh Nhân': bn.hoTen || '',
        'Năm Sinh / Tuổi': bn.ngaySinh ? tinhTuoi(bn.ngaySinh) : '',
        'Giới Tính': bn.gioiTinh === 'nam' ? 'Nam' : bn.gioiTinh === 'nu' ? 'Nữ' : (bn.gioiTinh || ''),
        'Số Điện Thoại': bn.soDienThoai || '',
        'Phòng Khám': pk.ten_phong || pk.tenPhong || 'Chưa chỉ định',
        'Bác Sĩ Phụ Trách': bs.hoTen || 'Chưa chỉ định',
        'Thời Gian Tiếp Nhận': gioDenStr,
        'Mức Độ Ưu Tiên': DOI_TUONG_UU_TIEN[luot.uuTien] || 'Tiêu chuẩn',
        'Trạng Thái Khám': STATUS_MAP[luot.trangThai] || luot.trangThai || '',
        'Tiền Sử Dị Ứng': bn.diUng || 'Không',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Số thứ tự
      { wch: 18 }, // Mã lượt
      { wch: 14 }, // Mã BN
      { wch: 22 }, // Họ tên BN
      { wch: 14 }, // Tuổi
      { wch: 10 }, // Giới tính
      { wch: 14 }, // SĐT
      { wch: 20 }, // Phòng khám
      { wch: 22 }, // Bác sĩ
      { wch: 20 }, // Thời gian đến
      { wch: 16 }, // Mức độ ưu tiên
      { wch: 18 }, // Trạng thái
      { wch: 20 }, // Dị ứng
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SoTiepDonHangDoi');
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    xuatExcel(wb, `So_Tiep_Don_Hang_Doi_${now}.xlsx`);
  };

  // Bác sĩ chậm quá 30 phút: chuyển bệnh nhân lịch hẹn sang bác sĩ cùng chuyên khoa đang trực (khi bệnh nhân đồng ý)
  const handleChuyenBacSi = async (luot) => {
    const goiY = luot.goiYChuyenBacSi;
    if (!window.confirm(`Chuyển ${luot.benhNhan?.hoTen || 'bệnh nhân'} sang BS. ${goiY.hoTen}? Hãy hỏi ý kiến bệnh nhân trước.`)) return;
    try {
      await apiPatch(`/tiep-nhan/${luot.id}/phong-kham`, { bacSiId: goiY.bacSiId });
      refetch();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Không chuyển được bác sĩ');
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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Xuất file Excel sổ tiếp đón và hàng đợi hôm nay"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Xuất Sổ Tiếp Đón (Excel)
          </button>

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
                  onQuaLuot={() => handleQuaLuot(item)}
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
                  onChuyenBacSi={() => handleChuyenBacSi(item)}
                  onDoiUuTien={(v) => handleDoiUuTien(item, v)}
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

function QueueCard({ luot, onGoiLoa, onQuaLuot, isCalling }) {
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
          {luot.trangThai === 'dang_kham' && (
            <button
              onClick={onQuaLuot}
              className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold"
              title="Gọi mà bệnh nhân không có mặt: xếp cuối hàng chờ"
            >
              Vắng – qua lượt
            </button>
          )}
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

function QueueRow({ luot, onGoiLoa, onChuyenBacSi, onDoiUuTien, isCalling }) {
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
          <NhanUuTienTre luot={luot} />
        </div>
        {luot.goiYChuyenBacSi && (
          <button
            onClick={onChuyenBacSi}
            className="mt-1 text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
          >
            Gợi ý chuyển sang BS. {luot.goiYChuyenBacSi.hoTen} ({luot.goiYChuyenBacSi.soNguoiCho} lượt đang có)
          </button>
        )}
        <p className="text-xs text-gray-500 truncate">
          {tinhTuoi(bn.ngaySinh) && `${tinhTuoi(bn.ngaySinh)} tuổi`}
          {bn.soDienThoai && ` · ${bn.soDienThoai}`}
        </p>
      </div>

      <select
        value={luot.doiTuongUuTien || ''}
        onChange={(e) => onDoiUuTien(e.target.value)}
        title="Đối tượng ưu tiên (trẻ dưới 6 tuổi / người từ 75 tuổi hệ thống tự nhận)"
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 flex-shrink-0"
      >
        <option value="">Ưu tiên: không</option>
        {Object.entries(DOI_TUONG_UU_TIEN).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

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
