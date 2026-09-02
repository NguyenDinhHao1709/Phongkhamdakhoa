import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  normal:  { cls: 'text-success-dark',  bg: 'bg-success-light',  Icon: Minus },
  warning: { cls: 'text-warning-dark',  bg: 'bg-warning-light',  Icon: TrendingUp },
  danger:  { cls: 'text-danger-dark',   bg: 'bg-danger-light',   Icon: AlertTriangle },
};

/**
 * VitalDisplay — Hiển thị 1 chỉ số sinh hiệu
 * Font value lớn 2rem để bác sĩ không bị nhìn nhầm
 */
export function VitalDisplay({ label, value, unit, status = 'normal', referenceRange }) {
  const { cls, bg, Icon } = STATUS_CONFIG[status] || STATUS_CONFIG.normal;

  return (
    <div className={clsx('rounded-xl border p-4', bg,
      status === 'normal'  && 'border-success-main/20',
      status === 'warning' && 'border-warning-main/30',
      status === 'danger'  && 'border-danger-main/30',
    )}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
        <Icon className={clsx('h-4 w-4', cls)} />
      </div>
      <div className={clsx('flex items-baseline gap-1', cls)}>
        <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>{value ?? '—'}</span>
        {unit && <span className="text-sm font-medium opacity-80">{unit}</span>}
      </div>
      {referenceRange && (
        <p className="mt-1 text-xs text-gray-400">TK: {referenceRange}</p>
      )}
    </div>
  );
}

/**
 * VitalsCard — Bộ sinh hiệu đầy đủ trong 1 card
 */
export function VitalsCard({ data = {}, className = '' }) {
  const height = data.chieuCaoCm ?? data.chieu_cao_cm ?? data.chieuCao;
  const weight = data.canNangKg ?? data.can_nang_kg ?? data.canNang;
  const temp = data.nhietDoC ?? data.nhiet_do_c ?? data.nhietDo;
  const sys = data.huyetApTamThu ?? data.huyet_ap_tam_thu;
  const dia = data.huyetApTamTruong ?? data.huyet_ap_tam_truong;
  const hr = data.nhipTim ?? data.nhip_tim ?? data.mach;
  const resp = data.nhipTho ?? data.nhip_tho;
  const spo2Val = data.spo2;

  const getHuyetApStatus = (systolic) => {
    if (!systolic) return 'normal';
    if (systolic > 140 || systolic < 90) return 'danger';
    if (systolic > 130) return 'warning';
    return 'normal';
  };

  const getNhietDoStatus = (t) => {
    if (!t) return 'normal';
    if (t >= 38.5 || t < 35) return 'danger';
    if (t >= 37.5) return 'warning';
    return 'normal';
  };

  const getNhipTimStatus = (h) => {
    if (!h) return 'normal';
    if (h > 120 || h < 50) return 'danger';
    if (h > 100 || h < 60) return 'warning';
    return 'normal';
  };

  const getSpo2Status = (s) => {
    if (!s) return 'normal';
    if (s < 90) return 'danger';
    if (s < 95) return 'warning';
    return 'normal';
  };

  return (
    <div className={clsx('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {height && (
        <VitalDisplay label="Chiều cao" value={height} unit="cm" status="normal" referenceRange="—" />
      )}
      {weight && (
        <VitalDisplay label="Cân nặng" value={weight} unit="kg" status="normal" referenceRange="—" />
      )}
      {(sys || dia) && (
        <VitalDisplay
          label="Huyết áp"
          value={`${sys ?? '?'}/${dia ?? '?'}`}
          unit="mmHg"
          status={getHuyetApStatus(sys)}
          referenceRange="90–120 / 60–80"
        />
      )}
      {temp && (
        <VitalDisplay label="Nhiệt độ" value={temp} unit="°C" status={getNhietDoStatus(temp)} referenceRange="36.1–37.2" />
      )}
      {hr && (
        <VitalDisplay label="Mạch / Nhịp tim" value={hr} unit="lần/phút" status={getNhipTimStatus(hr)} referenceRange="60–100" />
      )}
      {resp && (
        <VitalDisplay label="Nhịp thở" value={resp} unit="lần/phút" status="normal" referenceRange="12–20" />
      )}
      {spo2Val && (
        <VitalDisplay label="SpO₂" value={spo2Val} unit="%" status={getSpo2Status(spo2Val)} referenceRange="≥ 95%" />
      )}
    </div>
  );
}

