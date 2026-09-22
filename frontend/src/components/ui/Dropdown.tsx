import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItemProps {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}

export function Dropdown({ trigger, align = 'right', className = '', children }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-48 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md py-1 animate-in fade-in duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  label,
  icon,
  onClick,
  variant = 'default',
  disabled = false,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === 'danger'
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {icon && <span className="flex-shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />;
}
