import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { MedCard, MedCardSection } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';
import {
  Stethoscope, AlertTriangle, FileText, ClipboardList, FlaskConical,
  CheckCircle2, ChevronRight, Activity, Plus, X, HeartPulse
} from 'lucide-react';

function useHangDoi() {
  return useQuery({
    queryKey: ['tiep-nhan', 'hang-doi'],
    queryFn: () => apiGet('/tiep-nhan/hang-doi'),
    refetchInterval: 10000,
  });
}

export default function PhongKhamPage() {
  const { data, isLoading } = useHangDoi();
  const [selectedLuot, setSelectedLuot] = useState(null);
  const items = data?.data || [];
  const dangKham = items.filter((i) => i.trangThai === 'dang_kham');
  const choKham = items.filter((i) => i.trangThai === 'cho_kham');

  // Đảm bảo selectedLuot luôn cập nhật đúng trạng thái mới từ API
  const currentLuot = selectedLuot
    ? items.find((i) => i.id === selectedLuot.id) || selectedLuot
    : null;

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)] animate-fade-in">
      {/* Left: Patient Queue */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" /> Hàng đợi
        </h2>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading && <p className="text-center text-sm text-gray-400 py-8">Đang tải danh sách...</p>}
          
          {dangKham.map((luot) => (
            <PatientCard
              key={luot.id}
              luot={luot}
              isActive={currentLuot?.id === luot.id}
              onClick={() => setSelectedLuot(luot)}
              highlight
            />
          ))}
          {choKham.map((luot) => (
            <PatientCard
              key={luot.id}
              luot={luot}
              isActive={currentLuot?.id === luot.id}
              onClick={() => setSelectedLuot(luot)}
            />
          ))}
          {!isLoading && items.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">Không có bệnh nhân chờ khám</p>
          )}
        </div>
      </div>

      {/* Right: Examination Panel */}
      <div className="flex-1 overflow-y-auto">
        {currentLuot ? (
          <ExaminationPanel
            luot={currentLuot}
            onUpdateLuot={(updated) => setSelectedLuot(updated)}
            onComplete={() => setSelectedLuot(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Stethoscope className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-base font-medium">Chọn bệnh nhân từ hàng đợi để bắt đầu khám</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ luot, isActive, onClick, highlight }) {
  const bn = luot.benhNhan || {};
  const ageStr = tinhTuoi(bn.ngaySinh);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3.5 transition-all cursor-pointer ${
        isActive
          ? 'border-primary-500 bg-blue-50/90 shadow-md ring-2 ring-primary-500/20'
          : highlight
          ? 'border-primary-200 bg-primary-50/30 hover:border-primary-300'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-lg font-extrabold ${isActive ? 'text-primary-800' : 'text-primary-700'}`}>
          {luot.maSoThuTu}
        </span>
        <StatusBadge status={luot.trangThai} size="sm" />
      </div>
      <p className="font-bold text-sm text-gray-900 truncate">{bn.hoTen}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {ageStr}
        {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
      </p>
      {bn.diUng && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200/60 px-2.5 py-1 text-xs font-semibold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
          <span className="truncate">⚠ Dị ứng: {bn.diUng}</span>
        </div>
      )}
    </button>
  );
}

function ExaminationPanel({ luot, onUpdateLuot, onComplete }) {
  const bn = luot.benhNhan || {};
  const qc = useQueryClient();
  const [tab, setTab] = useState('kham'); // 'kham' | 'xn' | 'lich_su'
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [form, setForm] = useState({
    trieuChung: '', chanDoanSoBo: '', chanDoanXacDinh: '',
    ketQuaKham: '', phuongPhapDieuTri: '', taiKham: '', ghiChu: '',
  });
  const [benhAnId, setBenhAnId] = useState(null);

  // Sinh hiệu
  const { data: shData, refetch: refetchSinhHieu } = useQuery({
    queryKey: ['sinh-hieu', luot.id],
    queryFn: () => apiGet(`/tiep-nhan/${luot.id}/sinh-hieu`),
  });
  const sinhHieu = shData?.data;

  // Tạo phiếu khám
  const createMut = useMutation({
    mutationFn: () => apiPost(`/ho-so-benh-an/benh-an-kham/${bn.id}`, { luotTiepNhanId: luot.id, hinhThucKham: 'truc_tiep' }),
    onSuccess: (res) => setBenhAnId(res.data.id),
  });

  // Kết thúc khám
  const finishMut = useMutation({
    mutationFn: () => apiPatch(`/ho-so-benh-an/benh-an-kham/${benhAnId}/ket-thuc`, form),
    onSuccess: () => {
      apiPatch(`/tiep-nhan/${luot.id}/trang-thai`, { trangThai: 'hoan_thanh' });
      qc.invalidateQueries(['tiep-nhan']);
      onComplete();
    },
  });

  // Bắt đầu khám — Cập nhật backend siết chặt chỉ 1 người đang khám
  const handleBatDauKham = async () => {
    try {
      await apiPatch(`/tiep-nhan/${luot.id}/trang-thai`, { trangThai: 'dang_kham' });
      onUpdateLuot({ ...luot, trangThai: 'dang_kham' });
      await createMut.mutateAsync();
      qc.invalidateQueries(['tiep-nhan']);
    } catch (err) {
      console.error(err);
    }
  };

  const TABS = [
    { key: 'kham', label: 'Khám bệnh', icon: Stethoscope },
    { key: 'xn', label: 'Xét nghiệm', icon: FlaskConical },
    { key: 'lich_su', label: 'Lịch sử', icon: FileText },
  ];

  const ageStr = tinhTuoi(bn.ngaySinh);

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <MedCard allergyNote={bn.diUng}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{bn.hoTen}</h2>
              <StatusBadge status={luot.trangThai} />
            </div>
            <p className="text-sm text-gray-500">
              {bn.maBenhNhan}
              {ageStr && ` · ${ageStr}`}
              {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
              {bn.soDienThoai && ` · ${bn.soDienThoai}`}
            </p>
            {bn.tienSuBenh && <p className="mt-1 text-xs text-gray-400">Tiền sử: {bn.tienSuBenh}</p>}
          </div>
          {!benhAnId && (
            <MedButton
              variant="primary"
              onClick={handleBatDauKham}
              loading={createMut.isLoading}
            >
              {luot.trangThai === 'dang_kham' ? 'Tiếp tục khám' : 'Bắt đầu khám'}
            </MedButton>
          )}
        </div>
      </MedCard>

      {/* Sinh hiệu / Empty State */}
      <MedCard
        title="Sinh hiệu"
        action={
          <button
            type="button"
            onClick={() => setShowVitalsModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Cập nhật
          </button>
        }
      >
        {sinhHieu ? (
          <VitalsCard data={sinhHieu} />
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-500">Chưa ghi nhận sinh hiệu</p>
            </div>
            <button
              type="button"
              onClick={() => setShowVitalsModal(true)}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 bg-white px-3.5 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Đo & Cập nhật ngay
            </button>
          </div>
        )}
      </MedCard>

      {/* Tabs */}
      {benhAnId && (
        <>
          <div className="flex border-b border-gray-200">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  tab === key
                    ? 'border-primary-600 text-primary-700 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {tab === 'kham' && (
            <MedCard>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); finishMut.mutate(); }}>
                {[
                  { key: 'trieuChung', label: 'Triệu chứng', rows: 3, placeholder: 'Mô tả triệu chứng bệnh nhân...' },
                  { key: 'chanDoanSoBo', label: 'Chẩn đoán sơ bộ', rows: 2 },
                  { key: 'chanDoanXacDinh', label: 'Chẩn đoán xác định', rows: 2 },
                  { key: 'ketQuaKham', label: 'Kết quả khám', rows: 3, placeholder: 'Kết quả khám lâm sàng...' },
                  { key: 'phuongPhapDieuTri', label: 'Phương pháp điều trị', rows: 2 },
                ].map(({ key, label, rows, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                    <textarea
                      rows={rows}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày tái khám</label>
                    <input
                      type="date"
                      value={form.taiKham}
                      onChange={(e) => setForm((f) => ({ ...f, taiKham: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú</label>
                    <input
                      type="text"
                      value={form.ghiChu}
                      onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <MedButton
                    variant="secondary"
                    type="button"
                    onClick={() => apiPatch(`/ho-so-benh-an/benh-an-kham/${benhAnId}`, form)}
                  >
                    Lưu nháp
                  </MedButton>
                  <MedButton
                    variant="primary"
                    type="submit"
                    loading={finishMut.isLoading}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Kết thúc khám
                  </MedButton>
                </div>
              </form>
            </MedCard>
          )}

          {tab === 'xn' && <XetNghiemTab benhAnKhamId={benhAnId} />}
          {tab === 'lich_su' && <LichSuTab benhNhanId={bn.id} />}
        </>
      )}

      {/* Vitals Modal */}
      {showVitalsModal && (
        <VitalsModal
          luotId={luot.id}
          initialData={sinhHieu}
          onClose={() => setShowVitalsModal(false)}
          onSuccess={() => {
            refetchSinhHieu();
            setShowVitalsModal(false);
          }}
        />
      )}
    </div>
  );
}

function VitalsModal({ luotId, initialData, onClose, onSuccess }) {
  const [form, setForm] = useState({
    mach: initialData?.mach ?? initialData?.nhipTim ?? initialData?.nhip_tim ?? '',
    huyetApTamThu: initialData?.huyetApTamThu ?? initialData?.huyet_ap_tam_thu ?? '',
    huyetApTamTruong: initialData?.huyetApTamTruong ?? initialData?.huyet_ap_tam_truong ?? '',
    nhietDo: initialData?.nhietDoC ?? initialData?.nhiet_do_c ?? initialData?.nhietDo ?? '',
    chieuCao: initialData?.chieuCaoCm ?? initialData?.chieu_cao_cm ?? initialData?.chieuCao ?? '',
    canNang: initialData?.canNangKg ?? initialData?.can_nang_kg ?? initialData?.canNang ?? '',
    spo2: initialData?.spo2 ?? '',
    nhipTho: initialData?.nhipTho ?? initialData?.nhip_tho ?? '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        mach: form.mach !== '' && form.mach !== null ? Number(form.mach) : undefined,
        nhipTim: form.mach !== '' && form.mach !== null ? Number(form.mach) : undefined,
        huyetApTamThu: form.huyetApTamThu !== '' && form.huyetApTamThu !== null ? Number(form.huyetApTamThu) : undefined,
        huyetApTamTruong: form.huyetApTamTruong !== '' && form.huyetApTamTruong !== null ? Number(form.huyetApTamTruong) : undefined,
        nhietDoC: form.nhietDo !== '' && form.nhietDo !== null ? Number(form.nhietDo) : undefined,
        chieuCaoCm: form.chieuCao !== '' && form.chieuCao !== null ? Number(form.chieuCao) : undefined,
        canNangKg: form.canNang !== '' && form.canNang !== null ? Number(form.canNang) : undefined,
        spo2: form.spo2 !== '' && form.spo2 !== null ? Number(form.spo2) : undefined,
        nhipTho: form.nhipTho !== '' && form.nhipTho !== null ? Number(form.nhipTho) : undefined,
      };

      await apiPost(`/tiep-nhan/${luotId}/sinh-hieu`, payload);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật sinh hiệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary-600" /> Cập nhật sinh hiệu bệnh nhân
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mạch (lần/phút)</label>
              <input
                type="number"
                value={form.mach}
                onChange={(e) => setForm({ ...form, mach: e.target.value })}
                placeholder="VD: 75"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nhiệt độ (°C)</label>
              <input
                type="number"
                step="0.1"
                value={form.nhietDo}
                onChange={(e) => setForm({ ...form, nhietDo: e.target.value })}
                placeholder="VD: 36.8"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Huyết áp tâm thu (mmHg)</label>
              <input
                type="number"
                value={form.huyetApTamThu}
                onChange={(e) => setForm({ ...form, huyetApTamThu: e.target.value })}
                placeholder="VD: 120"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Huyết áp tâm trương (mmHg)</label>
              <input
                type="number"
                value={form.huyetApTamTruong}
                onChange={(e) => setForm({ ...form, huyetApTamTruong: e.target.value })}
                placeholder="VD: 80"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Chiều cao (cm)</label>
              <input
                type="number"
                value={form.chieuCao}
                onChange={(e) => setForm({ ...form, chieuCao: e.target.value })}
                placeholder="VD: 165"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cân nặng (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.canNang}
                onChange={(e) => setForm({ ...form, canNang: e.target.value })}
                placeholder="VD: 60"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={form.spo2}
                onChange={(e) => setForm({ ...form, spo2: e.target.value })}
                placeholder="VD: 98"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nhịp thở (lần/phút)</label>
              <input
                type="number"
                value={form.nhipTho}
                onChange={(e) => setForm({ ...form, nhipTho: e.target.value })}
                placeholder="VD: 18"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>
              Hủy
            </MedButton>
            <MedButton type="submit" variant="primary" size="sm" loading={loading}>
              Lưu sinh hiệu
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function XetNghiemTab({ benhAnKhamId }) {
  const { data } = useQuery({
    queryKey: ['xn-benh-an', benhAnKhamId],
    queryFn: () => apiGet(`/xet-nghiem/benh-an-kham/${benhAnKhamId}`),
  });
  const items = data?.data || [];

  return (
    <MedCard title="Chỉ định xét nghiệm">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Chưa có chỉ định xét nghiệm nào</p>
      ) : (
        <div className="space-y-3">
          {items.map(({ chiDinh, ketQua }) => (
            <div key={chiDinh.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm text-gray-900">{chiDinh.dichVu?.tenDichVu}</p>
                <StatusBadge status={chiDinh.trangThai} size="sm" />
              </div>
              {ketQua && (
                <div className="mt-2 rounded-lg bg-gray-50 p-2.5">
                  <p className="text-sm"><span className="font-medium text-gray-700">Kết quả:</span> {ketQua.giaTri} {ketQua.donVi}</p>
                  {ketQua.nhanXet && <p className="text-xs text-gray-500 mt-0.5">Nhận xét: {ketQua.nhanXet}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MedCard>
  );
}

function LichSuTab({ benhNhanId }) {
  const { data } = useQuery({
    queryKey: ['lich-su-kham', benhNhanId],
    queryFn: () => apiGet(`/ho-so-benh-an/lich-su/${benhNhanId}`),
  });
  const items = data?.data || [];

  return (
    <MedCard title="Lịch sử khám bệnh">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Chưa có lịch sử khám</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((bak) => (
            <div key={bak.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatDateTime(bak.ngayKham)}</p>
                  {bak.chanDoanXacDinh && <p className="text-sm text-gray-600 mt-0.5">{bak.chanDoanXacDinh}</p>}
                </div>
                <StatusBadge status={bak.trangThai === 'da_hoan_thanh' ? 'hoan_thanh' : 'dang_kham'} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </MedCard>
  );
}
