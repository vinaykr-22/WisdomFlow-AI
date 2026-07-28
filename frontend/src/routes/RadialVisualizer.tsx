type State = 'idle' | 'listening' | 'thinking' | 'speaking';

interface RadialVisualizerProps {
  state: State;
  onClick: () => void;
}

export default function RadialVisualizer({ state, onClick }: RadialVisualizerProps) {
  return (
    <div className="relative flex items-center justify-center w-72 h-72 select-none my-4">
      {/* Outer Pulse Rings */}
      {state === 'speaking' && (
        <>
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping duration-1000 scale-125" />
          <div className="absolute inset-4 rounded-full border-2 border-emerald-400/30 animate-pulse scale-110" />
          <div className="absolute inset-8 rounded-full border border-teal-400/20 animate-ping duration-700" />
        </>
      )}

      {state === 'listening' && (
        <>
          <div className="absolute inset-0 rounded-full bg-red-500/15 animate-ping duration-700 scale-125" />
          <div className="absolute inset-4 rounded-full border-2 border-red-500/40 animate-pulse" />
        </>
      )}

      {state === 'thinking' && (
        <>
          <div className="absolute inset-2 rounded-full border-4 border-amber-400/20 border-t-amber-500 animate-spin duration-1000 scale-110" />
          <div className="absolute inset-6 rounded-full border-2 border-purple-400/20 border-b-purple-500 animate-spin duration-700 scale-105" />
        </>
      )}

      {/* Radial Frequency Bars */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: 28 }).map((_, i) => {
          const angle = (i * 360) / 28;
          let height = 'h-3';
          let bg = 'bg-slate-200';

          if (state === 'speaking') {
            const heightVariants = ['h-4', 'h-8', 'h-10', 'h-6', 'h-9'];
            height = heightVariants[i % heightVariants.length];
            bg = 'bg-gradient-to-t from-emerald-400 to-teal-300 shadow-emerald-400/50 shadow-sm';
          } else if (state === 'listening') {
            const heightVariants = ['h-3', 'h-6', 'h-4', 'h-7'];
            height = heightVariants[i % heightVariants.length];
            bg = 'bg-gradient-to-t from-red-500 to-rose-400 animate-pulse';
          } else if (state === 'thinking') {
            height = 'h-4';
            bg = 'bg-amber-400/80';
          } else {
            height = 'h-2';
            bg = 'bg-slate-200 dark:bg-slate-700';
          }

          return (
            <div
              key={i}
              className="absolute w-1 rounded-full transition-all duration-300 origin-center"
              style={{
                transform: `rotate(${angle}deg) translateY(-95px)`,
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
        className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 cursor-pointer ${
          state === 'listening'
            ? 'bg-gradient-to-br from-red-500 to-rose-600 scale-110 shadow-red-500/50 ring-8 ring-red-500/20'
            : state === 'thinking'
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 scale-95 shadow-amber-500/50 ring-8 ring-amber-400/20'
            : state === 'speaking'
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 scale-110 shadow-emerald-500/50 ring-8 ring-emerald-500/20'
            : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 hover:scale-105 shadow-purple-500/30 ring-4 ring-purple-500/10'
        }`}
      >
        <svg className="w-12 h-12 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
