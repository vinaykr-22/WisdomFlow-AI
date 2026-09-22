import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, className = '', disabled, children, options, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full text-sm rounded-md border appearance-none transition-colors duration-150 py-2 pl-3 pr-9 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none cursor-pointer
              ${
                error
                  ? 'border-rose-300 dark:border-rose-900/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40' : ''}
              ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center">
            <ChevronDown size={16} />
          </div>
        </div>

        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
