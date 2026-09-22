type State = 'idle' | 'listening' | 'thinking' | 'speaking';

interface RadialVisualizerProps {
  state: State;
  onClick: () => void;
}

export default function RadialVisualizer({ state, onClick }: RadialVisualizerProps) {
  return (
    <div className="relative flex items-center justify-center w-52 h-52 sm:w-64 sm:h-64 select-none my-2 sm:my-4">
      {/* Outer Pulse Rings */}
      {state === 'speaking' && (
        <>
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping duration-1000 scale-110" />
          <div className="absolute inset-4 rounded-full border border-emerald-500/30 animate-pulse scale-105" />
        </>
      )}

      {state === 'listening' && (
        <>
          <div className="absolute inset-0 rounded-full bg-rose-500/10 animate-ping duration-700 scale-110" />
          <div className="absolute inset-4 rounded-full border border-rose-500/30 animate-pulse" />
        </>
      )}

      {state === 'thinking' && (
        <>
          <div className="absolute inset-2 rounded-full border-2 border-amber-400/20 border-t-amber-500 animate-spin duration-1000 scale-105" />
        </>
      )}

      {/* Radial Frequency Bars */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: 28 }).map((_, i) => {
          const angle = (i * 360) / 28;
          let height = 'h-2';
          let bg = 'bg-slate-200 dark:bg-slate-700';

          if (state === 'speaking') {
            const heightVariants = ['h-3', 'h-6', 'h-8', 'h-5', 'h-7'];
            height = heightVariants[i % heightVariants.length];
            bg = 'bg-emerald-500 dark:bg-emerald-400';
          } else if (state === 'listening') {
            const heightVariants = ['h-3', 'h-5', 'h-3', 'h-6'];
            height = heightVariants[i % heightVariants.length];
            bg = 'bg-rose-500 dark:bg-rose-400';
          } else if (state === 'thinking') {
            height = 'h-3';
            bg = 'bg-amber-400 dark:bg-amber-400';
          }

          return (
            <div
              key={i}
              className="absolute w-1 rounded-full transition-all duration-300 origin-center"
              style={{
                transform: `rotate(${angle}deg) translateY(-80px)`,
              }}
            >
              <div className={`w-full ${height} ${bg} rounded-full transition-all duration-300`} />
            </div>
          );
        })}
      </div>

      {/* Central Interactive Sphere / Microphone Button */}
      <button
        onClick={onClick}
        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer text-white shadow-xs ${
          state === 'listening'
            ? 'bg-rose-600 scale-105 ring-2 ring-rose-500/30'
            : state === 'thinking'
            ? 'bg-amber-500 scale-95 ring-2 ring-amber-400/30'
            : state === 'speaking'
            ? 'bg-emerald-600 scale-105 ring-2 ring-emerald-500/30'
            : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600'
        }`}
        aria-label="Toggle voice input"
      >
        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>
    </div>
  );
}
