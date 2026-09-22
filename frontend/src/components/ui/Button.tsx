import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // High-contrast, tactile sketch base
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-[3px] select-none cursor-pointer transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:focus-visible:ring-stone-100 disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px] active:shadow-none';

    const sizeStyles = {
      sm: 'text-xs h-7.5 px-2.5 gap-1.5 font-medium tracking-tight',
      md: 'text-xs sm:text-sm h-9 px-3.5 gap-2 font-medium tracking-tight',
      lg: 'text-sm sm:text-base h-10.5 px-4.5 gap-2.5 font-semibold tracking-tight',
    };

    const variantStyles = {
      primary:
        'bg-stone-900 text-stone-50 border-[1.5px] border-stone-900 hover:bg-stone-800 shadow-[2px_2px_0px_#18181b] dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100 dark:hover:bg-white dark:shadow-[2px_2px_0px_#52525b]',
      secondary:
        'bg-white text-stone-900 border-[1.5px] border-stone-900 hover:bg-stone-50 shadow-[2px_2px_0px_#18181b] dark:bg-stone-900 dark:text-stone-100 dark:border-stone-600 dark:hover:bg-stone-800 dark:shadow-[2px_2px_0px_#3f3f46]',
      outline:
        'bg-transparent border-[1.5px] border-stone-900 text-stone-900 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800',
      ghost:
        'bg-transparent text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-50 active:translate-x-0 active:translate-y-0',
      danger:
        'bg-rose-700 text-white border-[1.5px] border-stone-900 hover:bg-rose-800 shadow-[2px_2px_0px_#18181b] dark:bg-rose-800 dark:border-rose-900 dark:shadow-[2px_2px_0px_#3f3f46]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 13 : size === 'lg' ? 17 : 15} />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
