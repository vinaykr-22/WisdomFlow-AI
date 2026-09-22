import React from 'react';

interface WisdomFlowLogoProps {
  size?: number;
  className?: string;
  showBadge?: boolean;
}

export const WisdomFlowLogo: React.FC<WisdomFlowLogoProps> = ({
  size = 28,
  className = '',
  showBadge = true,
}) => {
  // Precision architectural vector mark: clean geometric lines forming W / compass
  const iconMarkup = (
    <svg
      width={showBadge ? Math.round(size * 0.65) : size}
      height={showBadge ? Math.round(size * 0.65) : size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-100"
    >
      {/* Precision architectural 'W' sketch geometry */}
      <polyline points="3 6 8 18 12 10 16 18 21 6" />
      <line x1="12" y1="10" x2="12" y2="4" strokeWidth="1.5" strokeDasharray="1 1" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    </svg>
  );

  if (!showBadge) {
    return (
      <div className={`inline-flex items-center justify-center text-stone-900 dark:text-stone-100 ${className}`}>
        {iconMarkup}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-[3px] border-[1.5px] border-stone-900 dark:border-stone-100 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-[1.5px_1.5px_0px_#18181b] dark:shadow-[1.5px_1.5px_0px_#71717a] flex items-center justify-center flex-shrink-0 select-none ${className}`}
    >
      {iconMarkup}
    </div>
  );
};
