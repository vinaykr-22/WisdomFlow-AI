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
    xs: 'h-1.5',
    sm: 'h-2.5',
    md: 'h-3.5',
    lg: 'h-5',
  };

  const barStyles = {
    primary: 'bg-stone-900 dark:bg-stone-100',
    success: 'bg-emerald-700 dark:bg-emerald-400',
    warning: 'bg-amber-700 dark:bg-amber-400',
    danger: 'bg-rose-700 dark:bg-rose-400',
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums font-bold text-stone-900 dark:text-stone-100">[{Math.round(clampedValue)}%]</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full bg-stone-100 dark:bg-stone-900 border border-stone-900 dark:border-stone-700 rounded-[2px] overflow-hidden p-[1px] ${sizeStyles[size]}`}
      >
        <div
          className={`h-full rounded-[1px] transition-all duration-200 ${barStyles[variant]}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
