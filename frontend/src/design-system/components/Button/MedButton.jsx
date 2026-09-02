import { clsx } from 'clsx';

const VARIANT_CLS = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
  secondary: 'bg-white text-primary-700 border border-primary-300 hover:bg-primary-50 active:bg-primary-100',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger:    'bg-danger-main text-white hover:bg-danger-dark active:bg-red-700 shadow-sm',
};

const SIZE_CLS = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
};

/**
 * MedButton — Nút bấm Healthcare UI
 * Padding lớn, bo góc nhẹ, không có neon/gradient
 */
export function MedButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
        VARIANT_CLS[variant],
        SIZE_CLS[size],
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}

