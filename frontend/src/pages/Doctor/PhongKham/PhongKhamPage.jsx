import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';
import {
  Stethoscope, AlertTriangle, FileText, ClipboardList, FlaskConical,
  CheckCircle2, ChevronRight, Activity, Plus, X, HeartPulse, Pill, Calendar, Clock, Search
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

  const currentLuot = selectedLuot
    ? items.find((i) => i.id === selectedLuot.id) || selectedLuot
    : (dangKham[0] || choKham[0] || null);

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)] animate-fade-in">
      {/* Left: Patient Queue */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" /> Hàng đợi phòng khám
        </h2>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading && <p className="text-center text-sm text-gray-400 py-8">Đang tải danh sách...</p>}

          {dangKham.map((luot) => (
            <PatientCard
              key={luot.id}
              luot={luot}
              isSelected={currentLuot?.id === luot.id}
              onSelect={() => setSelectedLuot(luot)}
            />
          ))}

          {choKham.map((luot) => (
            <PatientCard
              key={luot.id}
              luot={luot}
              isSelected={currentLuot?.id === luot.id}
              onSelect={() => setSelectedLuot(luot)}
            />
          ))}

          {items.length === 0 && !isLoading && (
            <p className="text-center text-sm text-gray-400 py-8">Hôm nay không có bệnh nhân nào trong hàng đợi</p>
          )}
        </div>
      </div>

      {/* Right: Clinical Examination Main Panel */}
      <div className="flex-1 min-w-0 overflow-y-auto pr-1">
        {currentLuot ? (
          <KhamBenhPanel
            luot={currentLuot}
            onComplete={() => setSelectedLuot(null)}
            onUpdateLuot={(updated) => setSelectedLuot(updated)}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
            <div>
              <Stethoscope className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-700">Chưa chọn bệnh nhân</h3>
              <p className="mt-1 text-sm text-gray-400">Chọn 1 bệnh nhân ở danh sách hàng đợi bên trái để bắt đầu khám bệnh</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ luot, isSelected, onSelect }) {
  const bn = luot.benhNhan || {};
  const isDangKham = luot.trangThai === 'dang_kham';
  const ageStr = tinhTuoi(bn.ngaySinh);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
        isSelected
          ? 'border-primary-500 bg-blue-50/80 ring-2 ring-primary-500/20 shadow-xs'
          : isDangKham
          ? 'border-primary-200 bg-primary-50/40 hover:bg-primary-50/70'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-primary-700">{luot.maSoThuTu}</span>
        <StatusBadge status={luot.trangThai} size="sm" />
      </div>

      <p className="font-semibold text-gray-900 text-sm truncate">{bn.hoTen || 'Chưa cập nhật tên'}</p>

      <p className="text-xs text-gray-500 mt-0.5">
        {bn.maBenhNhan}
        {ageStr && ` · ${ageStr}`}
        {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
      </p>

      {bn.diUng && (
        <p className="mt-1.5 text-xs text-red-600 font-medium truncate flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" /> Dị ứng: {bn.diUng}
        </p>
      )}
    </div>
  );
}

function KhamBenhPanel({ luot, onComplete, onUpdateLuot }) {
  const qc = useQueryClient();
  const bn = luot.benhNhan || {};
  const [tab, setTab] = useState('kham');
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showChiDinhModal, setShowChiDinhModal] = useState(false);
  const [showDonThuocModal, setShowDonThuocModal] = useState(false);
  const [showTaiKhamModal, setShowTaiKhamModal] = useState(false);

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
    { key: 'kham', label: 'Khám lâm sàng', icon: Stethoscope },
    { key: 'xn', label: 'Xét nghiệm & CLS', icon: FlaskConical },
    { key: 'don_thuoc', label: 'Đơn thuốc', icon: Pill },
    { key: 'lich_su', label: 'Lịch sử khám', icon: FileText },
  ];

  const ageStr = tinhTuoi(bn.ngaySinh);

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <MedCard allergyNote={bn.diUng}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{bn.hoTen}</h2>
              <StatusBadge status={luot.trangThai} />
            </div>
            <p className="text-sm text-gray-500">
              Mã BN: <span className="font-semibold text-gray-700">{bn.maBenhNhan}</span>
              {ageStr && ` · ${ageStr}`}
              {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
              {bn.soDienThoai && ` · SĐT: ${bn.soDienThoai}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!benhAnId ? (
              <MedButton
                variant="primary"
                onClick={handleBatDauKham}
                loading={createMut.isLoading}
              >
                {luot.trangThai === 'dang_kham' ? 'Tiếp tục khám' : 'Bắt đầu khám'}
              </MedButton>
            ) : null}
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<FlaskConical className="h-4 w-4 text-purple-600" />}
              onClick={async () => {
                if (!benhAnId) await handleBatDauKham();
                setShowChiDinhModal(true);
              }}
            >
              + Chỉ định cận lâm sàng
            </MedButton>
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<Pill className="h-4 w-4 text-emerald-600" />}
              onClick={async () => {
                if (!benhAnId) await handleBatDauKham();
                setShowDonThuocModal(true);
              }}
            >
              + Kê đơn thuốc
            </MedButton>
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<Calendar className="h-4 w-4 text-blue-600" />}
              onClick={() => setShowTaiKhamModal(true)}
            >
              + Hẹn tái khám
            </MedButton>
          </div>
        </div>
      </MedCard>

      {/* Sinh hiệu */}
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
      {true && (
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

          {tab === 'xn' && <XetNghiemTab benhAnKhamId={benhAnId} onOpenModal={() => setShowChiDinhModal(true)} />}
          {tab === 'don_thuoc' && <DonThuocTab benhAnKhamId={benhAnId} onOpenModal={() => setShowDonThuocModal(true)} />}
          {tab === 'lich_su' && <LichSuTab benhNhanId={bn.id} />}
        </>
      )}

      {/* Modals */}
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

      {showChiDinhModal && benhAnId && (
        <TaoChiDinhModal
          benhAnKhamId={benhAnId}
          onClose={() => setShowChiDinhModal(false)}
          onSuccess={() => {
            qc.invalidateQueries(['xn-benh-an', benhAnId]);
            setShowChiDinhModal(false);
            setTab('xn');
          }}
        />
      )}

      {showDonThuocModal && benhAnId && (
        <KeDonThuocModal
          benhAnKhamId={benhAnId}
          onClose={() => setShowDonThuocModal(false)}
          onSuccess={() => {
            qc.invalidateQueries(['don-thuoc-benh-an', benhAnKhamId]);
            setShowDonThuocModal(false);
            setTab('don_thuoc');
          }}
        />
      )}

      {showTaiKhamModal && (
        <DatLichTaiKhamModal
          benhNhanId={bn.id}
          onClose={() => setShowTaiKhamModal(false)}
          onSuccess={() => {
            setShowTaiKhamModal(false);
            alert('Đã đặt lịch tái khám hộ bệnh nhân thành công!');
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

/* ──── MODAL CHỈ ĐỊNH CẬN LÂM SÀNG (LẤY DỮ LIỆU TỪ CSDL) ──── */
function TaoChiDinhModal({ benhAnKhamId, onClose, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [ghiChu, setGhiChu] = useState('');
  const [loading, setLoading] = useState(false);

  // Lấy danh mục dịch vụ cận lâm sàng từ CSDL
  const { data, isLoading } = useQuery({
    queryKey: ['dich-vu-cls'],
    queryFn: () => apiGet('/xet-nghiem/dich-vu'),
  });

  const listDichVu = data?.data || [
    { id: 1, maDichVu: 'XN001', tenDichVu: 'Công thức máu toàn phần (CBC)', giaDichVu: 120000, loai: 'xet_nghiem' },
    { id: 2, maDichVu: 'XN002', tenDichVu: 'Sinh hóa máu (Đường huyết, Men gan, Ure, Creatinine)', giaDichVu: 250000, loai: 'xet_nghiem' },
    { id: 3, maDichVu: 'CD001', tenDichVu: 'X-Quang ngực thẳng', giaDichVu: 150000, loai: 'chan_doan_hinh_anh' },
    { id: 4, maDichVu: 'CD002', tenDichVu: 'Siêu âm ổ bụng tổng quát', giaDichVu: 200000, loai: 'chan_doan_hinh_anh' },
    { id: 5, maDichVu: 'XN003', tenDichVu: 'Điện tâm đồ (ECG)', giaDichVu: 100000, loai: 'xet_nghiem' },
  ];

  const handleToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 dịch vụ cận lâm sàng');
      return;
    }
    setLoading(true);
    try {
      const dsChiDinh = selectedIds.map((id) => ({
        dichVuXetNghiemId: id,
        ghiChuChiDinh: ghiChu,
      }));

      await apiPost('/xet-nghiem/chi-dinh', {
        benhAnKhamId,
        dsChiDinh,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Lỗi tạo chỉ định cận lâm sàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" /> Chỉ định Cận lâm sàng & Xét nghiệm
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Chọn dịch vụ cận lâm sàng (CSDL):</label>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 p-1">
              {isLoading && <p className="text-center text-xs text-gray-400 py-4">Đang nạp danh mục CSDL...</p>}
              {listDichVu.map((dv) => (
                <label key={dv.id} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(dv.id)}
                      onChange={() => handleToggle(dv.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{dv.tenDichVu}</p>
                      <p className="text-xs text-gray-500">Mã: {dv.maDichVu || dv.id}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-700">{(dv.giaDichVu || dv.donGia || 0).toLocaleString()} đ</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú chẩn đoán lâm sàng:</label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="VD: Nghi ngờ viêm phế quản, cần kiểm tra chỉ số WBC..."
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</MedButton>
            <MedButton type="submit" variant="primary" size="sm" loading={loading}>
              Xác nhận chỉ định ({selectedIds.length})
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──── MODAL KÊ ĐƠN THUỐC ĐIỆN TỬ (LẤY THUỐC TỪ CSDL KHO DƯỢC) ──── */
function KeDonThuocModal({ benhAnKhamId, onClose, onSuccess }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [loading, setLoading] = useState(false);

  // Lấy danh mục thuốc từ CSDL Nhà Thuốc
  const { data: thuocData, isLoading } = useQuery({
    queryKey: ['thuoc-list-doctor', searchTerm],
    queryFn: () => apiGet(`/nha-thuoc/thuoc?search=${encodeURIComponent(searchTerm)}`),
  });

  const listThuoc = thuocData?.data || [
    { id: 1, maThuoc: 'TH001', tenThuoc: 'Paracetamol 500mg', donViTinh: 'Viên', giaBan: 2000 },
    { id: 2, maThuoc: 'TH002', tenThuoc: 'Amoxicillin 500mg', donViTinh: 'Viên', giaBan: 5000 },
    { id: 3, maThuoc: 'TH003', tenThuoc: 'Omeprazole 20mg', donViTinh: 'Viên', giaBan: 4500 },
  ];

  const handleAddThuoc = (thuoc) => {
    if (selectedItems.some((i) => i.thuocId === thuoc.id)) return;
    setSelectedItems((prev) => [
      ...prev,
      { thuocId: thuoc.id, tenThuoc: thuoc.tenThuoc, donViTinh: thuoc.donViTinh, soLuong: 10, lieuDung: 'Uống 1v x 2 lần/ngày sau ăn', soNgayDung: 5 },
    ]);
  };

  const handleRemoveThuoc = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.thuocId !== id));
  };

  const handleItemChange = (id, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.thuocId === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thuốc vào đơn');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/nha-thuoc/don-thuoc', {
        benhAnKhamId,
        ghiChu,
        chiTiet: selectedItems.map((i) => ({
          thuocId: i.thuocId,
          soLuong: Number(i.soLuong),
          lieuDung: i.lieuDung,
          soNgayDung: Number(i.soNgayDung),
        })),
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Lỗi tạo đơn thuốc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-3 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600" /> Kê Đơn Thuốc Điện Tử (CSDL Kho Dược)
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Ô tìm kiếm thuốc */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tìm & chọn thuốc từ kho dược:</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên thuốc hoặc hoạt chất..."
                className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50">
              {isLoading && <p className="text-center text-xs text-gray-400 py-3">Đang tra cứu kho thuốc CSDL...</p>}
              {listThuoc.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 hover:bg-white transition-colors">
                  <div>
                    <span className="text-xs font-bold text-primary-700 mr-2">{t.maThuoc}</span>
                    <span className="text-sm font-semibold text-gray-900">{t.tenThuoc}</span>
                    <span className="text-xs text-gray-500 ml-2">({t.donViTinh})</span>
                  </div>
                  <MedButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddThuoc(t)}
                    disabled={selectedItems.some((i) => i.thuocId === t.id)}
                  >
                    + Chọn
                  </MedButton>
                </div>
              ))}
            </div>
          </div>

          {/* Bảng đơn thuốc đã chọn */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Thuốc trong đơn ({selectedItems.length}):</label>
            {selectedItems.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center border border-dashed rounded-xl">Chưa chọn thuốc nào</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.thuocId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 border rounded-xl bg-white shadow-2xs">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{item.tenThuoc}</p>
                      <input
                        type="text"
                        value={item.lieuDung}
                        onChange={(e) => handleItemChange(item.thuocId, 'lieuDung', e.target.value)}
                        placeholder="VD: Sáng 1v, Chiều 1v..."
                        className="w-full mt-1 rounded border border-gray-300 py-1 px-2 text-xs focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <span className="text-[10px] text-gray-500 block">Số lượng</span>
                        <input
                          type="number"
                          value={item.soLuong}
                          onChange={(e) => handleItemChange(item.thuocId, 'soLuong', e.target.value)}
                          className="w-full rounded border border-gray-300 py-1 px-2 text-xs text-center font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveThuoc(item.thuocId)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Lời dặn của Bác sĩ:</label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="VD: Uống sau bữa ăn 30 phút, kiêng rượu bia..."
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t flex-shrink-0">
          <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</MedButton>
          <MedButton type="submit" variant="primary" size="sm" loading={loading} onClick={handleSubmit}>
            Lưu & Gửi đơn thuốc ({selectedItems.length})
          </MedButton>
        </div>
      </div>
    </div>
  );
}

/* ──── MODAL ĐẶT LỊCH TÁI KHÁM HỘ BỆNH NHÂN ──── */
function DatLichTaiKhamModal({ benhNhanId, onClose, onSuccess }) {
  const [ngayKham, setNgayKham] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [gioKham, setGioKham] = useState('09:00');
  const [lyDo, setLyDo] = useState('Tái khám theo hẹn bác sĩ');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/lich-hen', {
        benhNhanId,
        ngayKham,
        gioKham,
        lyDoKham: lyDo,
        hinhThucKham: 'truc_tiep',
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Lỗi đặt lịch tái khám. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" /> Đặt Lịch Tái Khám Hộ Bệnh Nhân
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày tái khám</label>
            <input
              type="date"
              value={ngayKham}
              onChange={(e) => setNgayKham(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ khám dự kiến</label>
            <input
              type="time"
              value={gioKham}
              onChange={(e) => setGioKham(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Lý do tái khám</label>
            <input
              type="text"
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</MedButton>
            <MedButton type="submit" variant="primary" size="sm" loading={loading}>
              Xác nhận đặt lịch
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──── TAB XÉT NGHIỆM (XEM KẾT QUẢ TỪ CSDL & TẠO CHỈ ĐỊNH) ──── */
function XetNghiemTab({ benhAnKhamId, onOpenModal }) {
  const { data, isLoading } = useQuery({
    queryKey: ['xn-benh-an', benhAnKhamId],
    queryFn: () => apiGet(`/xet-nghiem/benh-an-kham/${benhAnKhamId}`),
  });
  const items = data?.data || [];

  return (
    <MedCard
      title="Danh sách chỉ định & Kết quả Cận lâm sàng"
      action={
        <MedButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onOpenModal}>
          Chỉ định mới
        </MedButton>
      }
    >
      {isLoading && <p className="text-sm text-gray-400 py-4">Đang nạp dữ liệu kết quả xét nghiệm từ CSDL...</p>}

      {items.length === 0 && !isLoading ? (
        <div className="text-center py-6">
          <FlaskConical className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Phiếu khám này chưa có chỉ định xét nghiệm nào</p>
          <button
            type="button"
            onClick={onOpenModal}
            className="mt-2 text-xs font-bold text-primary-600 hover:underline"
          >
            + Bấm vào đây để tạo chỉ định xét nghiệm
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ chiDinh, ketQua }) => (
            <div key={chiDinh.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded mr-2">
                    {chiDinh.dichVu?.maDichVu || 'XN'}
                  </span>
                  <span className="font-bold text-sm text-gray-900">{chiDinh.dichVu?.tenDichVu}</span>
                </div>
                <StatusBadge status={chiDinh.trangThai} size="sm" />
              </div>

              {chiDinh.ghiChuChiDinh && (
                <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                  Ghi chú chỉ định: {chiDinh.ghiChuChiDinh}
                </p>
              )}

              {ketQua ? (
                <div className="mt-2 rounded-xl bg-emerald-50/60 border border-emerald-200 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">KẾT QUẢ TỪ PHÒNG XÉT NGHIỆM</span>
                    <span className="text-[10px] text-emerald-600">{formatDateTime(ketQua.taoLuc || new Date())}</span>
                  </div>
                  <p className="text-base font-bold text-emerald-900">
                    {ketQua.giaTri} <span className="text-xs font-normal text-emerald-700">{ketQua.donVi}</span>
                  </p>
                  {ketQua.nhanXet && (
                    <p className="text-xs text-emerald-800 font-medium">Nhận xét: {ketQua.nhanXet}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  ⏳ Đang chờ Kỹ thuật viên xử lý và nhập kết quả...
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </MedCard>
  );
}

/* ──── TAB ĐƠN THUỐC ĐÃ KÊ ──── */
function DonThuocTab({ benhAnKhamId, onOpenModal }) {
  const { data, isLoading } = useQuery({
    queryKey: ['don-thuoc-benh-an', benhAnKhamId],
    queryFn: () => apiGet(`/nha-thuoc/don-thuoc?search=${benhAnKhamId}`),
  });

  const donList = data?.data || [];

  return (
    <MedCard
      title="Đơn thuốc điện tử"
      action={
        <MedButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onOpenModal}>
          Kê đơn thuốc
        </MedButton>
      }
    >
      {isLoading && <p className="text-sm text-gray-400 py-4">Đang nạp dữ liệu đơn thuốc từ CSDL...</p>}

      {donList.length === 0 && !isLoading ? (
        <div className="text-center py-6">
          <Pill className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Phiếu khám này chưa có đơn thuốc nào được kê</p>
          <button
            type="button"
            onClick={onOpenModal}
            className="mt-2 text-xs font-bold text-primary-600 hover:underline"
          >
            + Bấm vào đây để lập đơn thuốc
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {donList.map((dt) => (
            <div key={dt.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-primary-700">Mã đơn: {dt.maDonThuoc}</span>
                <StatusBadge status={dt.trangThai} size="sm" />
              </div>
              <div className="space-y-2">
                {(dt.chiTiet || []).map((ct, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{ct.thuoc?.tenThuoc}</p>
                      <p className="text-gray-500">{ct.lieuDung}</p>
                    </div>
                    <span className="font-bold text-primary-700">{ct.soLuong} {ct.thuoc?.donViTinh}</span>
                  </div>
                ))}
              </div>
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
