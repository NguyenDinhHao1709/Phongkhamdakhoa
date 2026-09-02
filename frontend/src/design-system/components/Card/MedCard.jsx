import { clsx } from 'clsx';

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
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-card',
        padding,
        className,
      )}
      {...props}
    >
      {/* Cảnh báo dị ứng — luôn hiển thị đầu tiên nếu có */}
      {allergyNote && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-danger-light border border-danger-main/30 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-main" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-danger-dark">⚠ Dị ứng</p>
            <p className="text-sm text-danger-dark">{allergyNote}</p>
          </div>
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

