import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const computedStyle: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200/70 dark:bg-slate-800 ${variantStyles[variant]} ${className}`}
      style={computedStyle}
      {...props}
    />
  );
}
