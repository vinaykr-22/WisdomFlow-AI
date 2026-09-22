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
    sm: 'text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 font-semibold gap-1.5',
    md: 'text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 font-semibold gap-1.5',
  };

  const variantStyles = {
    primary:
      'bg-stone-900 text-white border border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100',
    success:
      'bg-emerald-50 text-emerald-900 border border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700',
    warning:
      'bg-amber-50 text-amber-900 border border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700',
    danger:
      'bg-rose-50 text-rose-900 border border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700',
    info:
      'bg-blue-50 text-blue-900 border border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700',
    neutral:
      'bg-stone-100 text-stone-800 border border-stone-400 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-600',
  };

  const dotColors = {
    primary: 'bg-white dark:bg-stone-900',
    success: 'bg-emerald-600 dark:bg-emerald-400',
    warning: 'bg-amber-600 dark:bg-amber-400',
    danger: 'bg-rose-600 dark:bg-rose-400',
    info: 'bg-blue-600 dark:bg-blue-400',
    neutral: 'bg-stone-600 dark:bg-stone-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-[2px] select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
}
