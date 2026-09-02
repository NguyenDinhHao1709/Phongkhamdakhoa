import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';

/**
 * MedCard — Card y khoa chuẩn Healthcare UI
 * Nền trắng, viền xám nhạt, bóng rất nhẹ, bo góc vừa
 */
export function MedCard({
  children,
  title,
  subtitle,
  badge,
  action,
  allergyNote,
  className = '',
  padding = 'p-6',
  ...props
}) {
  const formattedAllergy = allergyNote
    ? (allergyNote.toLowerCase().startsWith('dị ứng') ? allergyNote : `dị ứng ${allergyNote}`)
    : '';

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-card',
        padding,
        className,
      )}
      {...props}
    >
      {/* Cảnh báo dị ứng — Dải Banner (Alert) nằm ngang súc tích */}
      {allergyNote && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-red-700 shadow-xs">
          <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 text-red-600" />
          <span>⚠ Lưu ý: Bệnh nhân có tiền sử {formattedAllergy}</span>
        </div>
      )}

      {/* Header */}
      {(title || badge || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-base font-semibold text-gray-900 leading-tight">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {badge}
            {action}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

/**
 * MedCardSection — Phân vùng bên trong MedCard với đường ngăn cách
 */
export function MedCardSection({ title, children, className = '' }) {
  return (
    <div className={clsx('border-t border-gray-100 pt-4 mt-4', className)}>
      {title && <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>}
      {children}
    </div>
  );
}
