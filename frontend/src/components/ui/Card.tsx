import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  const variantStyles = {
    default:
      'bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700',
    elevated:
      'bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#3f3f46]',
    subtle:
      'bg-stone-50/80 dark:bg-stone-900/40 border border-stone-300 dark:border-stone-800',
    interactive:
      'bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#3f3f46] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_#18181b] dark:hover:shadow-[3px_3px_0px_#52525b] active:translate-x-0 active:translate-y-0 active:shadow-none cursor-pointer transition-all duration-100',
  };

  return (
    <div
      className={`rounded-[3px] overflow-hidden ${variantStyles[variant]} ${className}`}
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
    <div className={`p-4 sm:p-5 pb-3 flex flex-col gap-1 border-b border-stone-100 dark:border-stone-800/80 ${className}`} {...props}>
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
      className={`text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-snug ${className}`}
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
    <p className={`text-xs text-stone-600 dark:text-stone-400 leading-relaxed ${className}`} {...props}>
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
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
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
      className={`p-4 sm:p-5 pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
