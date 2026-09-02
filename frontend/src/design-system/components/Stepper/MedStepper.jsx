import { clsx } from 'clsx';
import { Check } from 'lucide-react';

/**
 * MedStepper — Thanh tiến trình ngang cho quy trình tuyến tính
 * Tiếp tân: Tìm BN → Sinh hiệu → Điều phối → Hoàn tất
 * Thu ngân: Xem hóa đơn → Thanh toán → Xác nhận
 */
export function MedStepper({ steps, currentStep, onStepClick }) {
  return (
    <nav aria-label="Tiến trình" className="mb-8">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isDone    = index < currentStep;
          const isActive  = index === currentStep;
          const isTodo    = index > currentStep;
          const isLast    = index === steps.length - 1;

          return (
            <li key={step} className={clsx('flex items-center', !isLast && 'flex-1')}>
              {/* Step indicator */}
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={isTodo || !onStepClick}
                className={clsx(
                  'flex flex-col items-center gap-2 group',
                  onStepClick && !isTodo ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <div className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                  isDone  && 'border-primary-600 bg-primary-600 text-white',
                  isActive && 'border-primary-600 bg-white text-primary-700 shadow-md',
                  isTodo  && 'border-gray-200 bg-white text-gray-400',
                )}>
                  {isDone ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                <span className={clsx(
                  'text-xs font-medium whitespace-nowrap',
                  isDone  && 'text-primary-600',
                  isActive && 'text-primary-700',
                  isTodo  && 'text-gray-400',
                )}>
                  {step}
                </span>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div className={clsx(
                  'mx-3 mb-5 h-0.5 flex-1 rounded transition-colors',
                  isDone ? 'bg-primary-400' : 'bg-gray-200',
                )} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

