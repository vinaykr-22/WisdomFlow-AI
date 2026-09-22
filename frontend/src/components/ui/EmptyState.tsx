import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 ${className}`}
    >
      {icon && (
        <div className="w-11 h-11 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3.5 shadow-xs">
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-4">
          {description}
        </p>
      )}

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
