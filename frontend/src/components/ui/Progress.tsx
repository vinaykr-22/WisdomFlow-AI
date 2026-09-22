import React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
}

export function Progress({
  value,
  variant = 'primary',
  size = 'sm',
  label,
  showValue = false,
  className = '',
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeStyles = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const barStyles = {
    primary: 'bg-indigo-600 dark:bg-indigo-500',
    success: 'bg-emerald-500 dark:bg-emerald-400',
    warning: 'bg-amber-500 dark:bg-amber-400',
    danger: 'bg-rose-500 dark:bg-rose-400',
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">{Math.round(clampedValue)}%</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${sizeStyles[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${barStyles[variant]}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
