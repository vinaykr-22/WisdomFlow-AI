import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium gap-1.5',
    md: 'text-xs px-2.5 py-1 font-medium gap-1.5',
  };

  const variantStyles = {
    primary:
      'bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    success:
      'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    warning:
      'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    info:
      'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    neutral:
      'bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60',
  };

  const dotColors = {
    primary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
}
