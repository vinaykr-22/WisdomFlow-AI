import React, { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full text-sm rounded-md border transition-colors duration-150 py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none
              ${leftIcon ? 'pl-9.5' : ''}
              ${rightIcon ? 'pr-9.5' : ''}
              ${
                error
                  ? 'border-rose-300 dark:border-rose-900/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40' : ''}
              ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
