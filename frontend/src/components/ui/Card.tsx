import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  const variantStyles = {
    default:
      'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs',
    elevated:
      'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm',
    subtle:
      'bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60',
    interactive:
      'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer transition-all duration-150',
  };

  return (
    <div
      className={`rounded-lg overflow-hidden transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 pb-3 flex flex-col gap-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-snug ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 pt-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
