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
  const getHuyetApStatus = (systolic) => {
    if (!systolic) return 'normal';
    if (systolic > 140 || systolic < 90) return 'danger';
    if (systolic > 130) return 'warning';
    return 'normal';
  };

  const getNhietDoStatus = (temp) => {
    if (!temp) return 'normal';
    if (temp >= 38.5 || temp < 35) return 'danger';
    if (temp >= 37.5) return 'warning';
    return 'normal';
  };

  const getNhipTimStatus = (hr) => {
    if (!hr) return 'normal';
    if (hr > 120 || hr < 50) return 'danger';
    if (hr > 100 || hr < 60) return 'warning';
    return 'normal';
  };

  const getSpo2Status = (spo2) => {
    if (!spo2) return 'normal';
    if (spo2 < 90) return 'danger';
    if (spo2 < 95) return 'warning';
    return 'normal';
  };

  return (
    <div className={clsx('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {data.chieu_cao_cm && (
        <VitalDisplay label="Chiều cao" value={data.chieu_cao_cm} unit="cm" status="normal" referenceRange="—" />
      )}
      {data.can_nang_kg && (
        <VitalDisplay label="Cân nặng" value={data.can_nang_kg} unit="kg" status="normal" referenceRange="—" />
      )}
      {(data.huyet_ap_tam_thu || data.huyet_ap_tam_truong) && (
        <VitalDisplay
          label="Huyết áp"
          value={`${data.huyet_ap_tam_thu ?? '?'}/${data.huyet_ap_tam_truong ?? '?'}`}
          unit="mmHg"
          status={getHuyetApStatus(data.huyet_ap_tam_thu)}
          referenceRange="90–120 / 60–80"
        />
      )}
      {data.nhiet_do_c && (
        <VitalDisplay label="Nhiệt độ" value={data.nhiet_do_c} unit="°C" status={getNhietDoStatus(data.nhiet_do_c)} referenceRange="36.1–37.2" />
      )}
      {data.nhip_tim && (
        <VitalDisplay label="Nhịp tim" value={data.nhip_tim} unit="lần/phút" status={getNhipTimStatus(data.nhip_tim)} referenceRange="60–100" />
      )}
      {data.spo2 && (
        <VitalDisplay label="SpO₂" value={data.spo2} unit="%" status={getSpo2Status(data.spo2)} referenceRange="≥ 95%" />
      )}
    </div>
  );
}

