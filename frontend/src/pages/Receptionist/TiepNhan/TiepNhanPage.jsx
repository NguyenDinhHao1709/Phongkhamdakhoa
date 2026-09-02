import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { MedCard, MedCardSection } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { MedStepper } from '../../../design-system/components/Stepper/MedStepper';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { formatDate, formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH, TRANG_THAI_TIEP_NHAN } from '../../../utils/constants';
import { Search, UserPlus, ClipboardList, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';

const STEPS = ['1. Tìm bệnh nhân', '2. Ghi sinh hiệu', '3. Điều phối', '4. Hoàn tất'];

function TimBenhNhan({ onSelect }) {
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['search-bn', q],
    queryFn: () => apiGet('/benh-nhan', { q, limit: 5 }),
    enabled: false,
  });

  const handleSearch = async () => { setSearched(true); refetch(); };
  const items = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nhập tên, mã BN, CMND, SĐT..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <MedButton variant="primary" loading={isLoading} onClick={handleSearch}>Tìm</MedButton>
        <MedButton variant="secondary" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => onSelect(null, true)}>
          Bệnh nhân mới
        </MedButton>
      </div>

      {searched && items.length === 0 && !isLoading && (
        <p className="text-center text-sm text-gray-500 py-4">Không tìm thấy bệnh nhân. Tạo hồ sơ mới?</p>
      )}

      {items.map((bn) => (
        <button
          key={bn.id}
          onClick={() => onSelect(bn)}
          className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-primary-400 hover:bg-primary-50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary-600">{bn.maBenhNhan}</span>
                {bn.diUng && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-light border border-danger-main/20 px-2 py-0.5 text-xs font-medium text-danger-dark">
                    <AlertTriangle className="h-3 w-3" /> Dị ứng: {bn.diUng}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-base font-semibold text-gray-900 group-hover:text-primary-700">{bn.hoTen}</p>
              <p className="text-sm text-gray-500">
                {tinhTuoi(bn.ngaySinh) && `${tinhTuoi(bn.ngaySinh)} tuổi`}
                {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
                {bn.soDienThoai && ` · ${bn.soDienThoai}`}
              </p>
            </div>
            <span className="text-sm font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">Chọn →</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function GhiSinhHieu({ luotId, benhNhan, onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    chieuCaoCm: '', canNangKg: '', nhietDoC: '',
    huyetApTamThu: '', huyetApTamTruong: '',
    nhipTim: '', spo2: '', ghiChu: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => apiPost(`/tiep-nhan/${luotId}/sinh-hieu`, data),
    onSuccess: () => { qc.invalidateQueries(['tiep-nhan', 'hang-doi']); onDone(); },
  });

  const fields = [
    { key: 'chieuCaoCm', label: 'Chiều cao', unit: 'cm', placeholder: '170' },
    { key: 'canNangKg', label: 'Cân nặng', unit: 'kg', placeholder: '65' },
    { key: 'nhietDoC', label: 'Nhiệt độ', unit: '°C', placeholder: '36.5' },
    { key: 'huyetApTamThu', label: 'HA tâm thu', unit: 'mmHg', placeholder: '120' },
    { key: 'huyetApTamTruong', label: 'HA tâm trương', unit: 'mmHg', placeholder: '80' },
    { key: 'nhipTim', label: 'Nhịp tim', unit: 'lần/phút', placeholder: '75' },
    { key: 'spo2', label: 'SpO₂', unit: '%', placeholder: '98' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).filter(([_, v]) => v !== '').map(([k, v]) => [k, isNaN(v) ? v : +v])
    );
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {benhNhan?.diUng && (
        <div className="flex items-start gap-2 rounded-lg bg-danger-light border border-danger-main/30 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-main" />
          <div>
            <p className="text-sm font-semibold text-danger-dark">⚠ Cảnh báo dị ứng</p>
            <p className="text-sm text-danger-dark">{benhNhan.diUng}</p>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map(({ key, label, unit, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label} <span className="text-gray-400 font-normal">({unit})</span></label>
            <input
              type="number"
              step="any"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        ))}
        <div className="col-span-full">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú</label>
          <textarea
            rows={2}
            value={form.ghiChu}
            onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="col-span-full flex justify-end gap-3">
          <MedButton variant="secondary" type="button" onClick={onDone}>Bỏ qua</MedButton>
          <MedButton variant="primary" type="submit" loading={mutation.isLoading}>Lưu sinh hiệu</MedButton>
        </div>
      </form>
    </div>
  );
}

export default function TiepNhanPage() {
  const [step, setStep] = useState(0);
  const [benhNhan, setBenhNhan] = useState(null);
  const [luot, setLuot] = useState(null);
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => apiPost('/tiep-nhan', data),
    onSuccess: (res) => {
      setLuot(res.data);
      setStep(1); // Chuyển sang ghi sinh hiệu
      qc.invalidateQueries(['tiep-nhan']);
    },
  });

  const handleSelectBN = async (bn) => {
    setBenhNhan(bn);
    if (bn) {
      await createMutation.mutateAsync({ benhNhanId: bn.id });
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tiếp nhận bệnh nhân</h1>
        <p className="text-sm text-gray-500 mt-0.5">Thực hiện theo từng bước</p>
      </div>

      <MedStepper steps={STEPS} currentStep={step} onStepClick={(i) => i < step && setStep(i)} />

      <MedCard>
        {step === 0 && (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Tìm bệnh nhân</h3>
            <TimBenhNhan onSelect={handleSelectBN} />
          </>
        )}

        {step === 1 && luot && (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Ghi sinh hiệu</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-mono font-semibold text-primary-700">{luot.maSoThuTu}</span>
              {' — '}{benhNhan?.hoTen}
            </p>
            <GhiSinhHieu luotId={luot.id} benhNhan={benhNhan} onDone={() => setStep(2)} />
          </>
        )}

        {step === 2 && luot && (
          <DieuPhoiStep luot={luot} benhNhan={benhNhan} onDone={() => setStep(3)} />
        )}

        {step === 3 && luot && (
          <HoanTatStep luot={luot} benhNhan={benhNhan} onReset={() => { setStep(0); setBenhNhan(null); setLuot(null); }} />
        )}
      </MedCard>
    </div>
  );
}

function DieuPhoiStep({ luot, benhNhan, onDone }) {
  const [phongKhamId, setPhongKhamId] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => apiPatch(`/tiep-nhan/${luot.id}/phong-kham`, data),
    onSuccess: () => { qc.invalidateQueries(['tiep-nhan']); onDone(); },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Điều phối phòng khám</h3>
      <p className="text-sm text-gray-500">Bệnh nhân: <strong>{benhNhan?.hoTen}</strong> · STT: <span className="font-mono text-primary-600">{luot.maSoThuTu}</span></p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng khám</label>
        <input
          type="number"
          value={phongKhamId}
          onChange={(e) => setPhongKhamId(e.target.value)}
          placeholder="Nhập ID phòng khám (VD: 1, 2, 3...)"
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      <div className="flex justify-end gap-3">
        <MedButton variant="secondary" onClick={onDone}>Bỏ qua</MedButton>
        <MedButton
          variant="primary"
          loading={mutation.isLoading}
          disabled={!phongKhamId}
          leftIcon={<MapPin className="h-4 w-4" />}
          onClick={() => mutation.mutate({ phongKhamId: +phongKhamId })}
        >
          Điều phối
        </MedButton>
      </div>
    </div>
  );
}

function HoanTatStep({ luot, benhNhan, onReset }) {
  return (
    <div className="text-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-light mx-auto mb-4">
        <CheckCircle2 className="h-8 w-8 text-success-dark" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Tiếp nhận thành công!</h3>
      <p className="mt-1 text-sm text-gray-500">{benhNhan?.hoTen}</p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-50 border border-primary-200 px-6 py-3">
        <span className="text-sm text-primary-700">Số thứ tự:</span>
        <span className="text-2xl font-bold text-primary-700">{luot.maSoThuTu}</span>
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <MedButton variant="secondary" onClick={onReset}>
          Tiếp nhận người khác
        </MedButton>
      </div>
    </div>
  );
}

