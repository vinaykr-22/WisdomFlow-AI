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
  if (!showBadge) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flex-shrink-0 ${className}`}
      >
        <defs>
          <linearGradient id="logoLeftGrad" x1="4" y1="6" x2="20" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="logoRightGrad" x1="18" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="logoCenterGrad" x1="16" y1="8" x2="24" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Left outer arm */}
        <path
          d="M6 10 C 6 23, 11 31, 16 31 C 19 31, 20 25, 20 17"
          stroke="url(#logoLeftGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left inner loop */}
        <path
          d="M10 16 C 10 26, 14 31, 18 31 C 21 31, 22 25, 22 14 C 22 10, 20 9, 18 10 C 16 12, 16 17, 16 22"
          stroke="url(#logoLeftGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Right inner loop */}
        <path
          d="M19 10 C 21 8, 24 10, 24 15 C 24 25, 26 31, 30 31 C 34 31, 35 25, 35 17"
          stroke="url(#logoRightGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />

        {/* Right outer arm */}
        <path
          d="M20 17 C 20 25, 23 31, 26 31 C 31 31, 35 24, 35 10"
          stroke="url(#logoRightGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center crest loop */}
        <path
          d="M17 14 C 18 10, 23 10, 24 14 C 24 19, 21 24, 20 27"
          stroke="url(#logoCenterGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Sparks */}
        <circle cx="6" cy="10" r="2.2" fill="#c084fc" />
        <circle cx="6" cy="10" r="1.1" fill="#ffffff" />
        <circle cx="10" cy="16" r="2" fill="#a855f7" />
        <circle cx="35" cy="16" r="2" fill="#22d3ee" />
        <circle cx="35" cy="10" r="2.2" fill="#38bdf8" />
        <circle cx="35" cy="10" r="1.1" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-lg overflow-hidden flex-shrink-0 shadow-xs border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-1 group-hover:border-indigo-400/40 transition-colors ${className}`}
    >
      <img
        src="/favicon.svg"
        alt="WisdomFlow AI Logo"
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
};
