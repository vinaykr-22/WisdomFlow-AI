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
            className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 select-none font-mono text-[11px]"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-stone-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full text-xs sm:text-sm rounded-[2px] border-[1.5px] transition-colors py-2 px-3 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none
              ${leftIcon ? 'pl-9' : ''}
              ${rightIcon ? 'pr-9' : ''}
              ${
                error
                  ? 'border-rose-600 focus:border-rose-700'
                  : 'border-stone-900 dark:border-stone-700 focus:border-stone-950 dark:focus:border-stone-300 focus:bg-stone-50/50 dark:focus:bg-stone-800/40'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-stone-800/40' : ''}
              ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center text-stone-500">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-[11px] font-mono text-rose-700 dark:text-rose-400 font-medium">{error}</p>
        ) : hint ? (
          <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
