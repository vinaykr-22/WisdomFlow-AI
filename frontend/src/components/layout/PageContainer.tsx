import React from 'react';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'default' | 'narrow' | 'wide' | 'full';
}

export function PageContainer({
  title,
  description,
  actions,
  children,
  maxWidth = 'default',
  className = '',
  ...props
}: PageContainerProps) {
  const maxWidthStyles = {
    narrow: 'max-w-3xl',
    default: 'max-w-5xl',
    wide: 'max-w-6xl',
    full: 'max-w-7xl',
  };

  return (
    <div
      className={`w-full ${maxWidthStyles[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 ${className}`}
      {...props}
    >
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            {title && (
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2.5 flex-shrink-0">{actions}</div>}
        </div>
      )}

      {children}
    </div>
  );
}
