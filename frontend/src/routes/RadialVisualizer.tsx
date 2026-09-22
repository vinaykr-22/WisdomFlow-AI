import { useEffect, useState } from 'react';
import { Mic, Volume2, Radio, Activity } from 'lucide-react';

type State = 'idle' | 'listening' | 'thinking' | 'speaking';

interface RadialVisualizerProps {
  state: State;
  onClick: () => void;
}

export default function RadialVisualizer({ state, onClick }: RadialVisualizerProps) {
  // Dynamic tick tick counter for authentic speech/listening oscillation
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    if (state === 'idle') return;
    const interval = setInterval(() => {
      setPulseTick((prev) => (prev + 1) % 64);
    }, 120);
    return () => clearInterval(interval);
  }, [state]);

  const totalBars = 32;

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-76 sm:h-76 select-none my-3 sm:my-6">
      
      {/* Outer Technical Drafting Scope / Instrument Bezel */}
      <div className="absolute inset-0 rounded-full border-[2px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[4px_4px_0px_#18181b] dark:shadow-[4px_4px_0px_#0c0a09] transition-all" />

      {/* Concentric Guide Circles (Blueprint / Technical Notebook Lines) */}
      <div className="absolute inset-4 rounded-full border border-dashed border-stone-200 dark:border-stone-800 pointer-events-none" />
      <div className="absolute inset-10 rounded-full border border-dotted border-stone-300 dark:border-stone-800 pointer-events-none" />
      <div className="absolute inset-20 rounded-full border border-stone-200/60 dark:border-stone-800/80 pointer-events-none" />

      {/* Precision Crosshair Reticle */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-stone-200 dark:border-stone-800 pointer-events-none" />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-stone-200 dark:border-stone-800 pointer-events-none" />

      {/* Cardinal Technical Markings */}
      <span className="absolute top-1.5 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pointer-events-none">
        000° // RX
      </span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[8px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pointer-events-none">
        090°
      </span>
      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[8px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pointer-events-none">
        180° // GND
      </span>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[8px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pointer-events-none">
        270°
      </span>

      {/* ── State Specific Architectural Animations ── */}

      {/* LISTENING: High-contrast expanding acoustic echo rings */}
      {state === 'listening' && (
        <>
          <div className="absolute inset-0 rounded-full border-[1.5px] border-stone-900 dark:border-stone-400 animate-ping opacity-25 pointer-events-none scale-105" />
          <div className="absolute -inset-2 rounded-full border border-stone-900 dark:border-stone-400 opacity-40 animate-pulse pointer-events-none" />
        </>
      )}

      {/* THINKING: Rotating technical radar sweep arm */}
      {state === 'thinking' && (
        <div className="absolute inset-0 rounded-full pointer-events-none animate-spin [animation-duration:2.5s] origin-center">
          {/* Radar needle */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[2px] h-[calc(50%-16px)] bg-stone-900 dark:bg-stone-200" />
          {/* Degree point */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-[1px] bg-stone-900 dark:bg-stone-200 border border-white dark:border-stone-900" />
          {/* Faint trailing quadrant */}
          <div className="absolute top-0 right-1/2 w-1/2 h-1/2 rounded-tl-full border-t-[1.5px] border-l-[1.5px] border-dashed border-stone-400 dark:border-stone-500 opacity-60" />
        </div>
      )}

      {/* SPEAKING: High-energy acoustic broadcast pulse */}
      {state === 'speaking' && (
        <>
          <div className="absolute inset-0 rounded-full border-[2px] border-stone-900 dark:border-stone-300 animate-pulse opacity-50 pointer-events-none" />
          <div className="absolute -inset-3 rounded-full border border-dashed border-stone-900 dark:border-stone-400 opacity-30 animate-pulse pointer-events-none" />
        </>
      )}

      {/* ── Radial Frequency & Oscilloscope Gauge Pins ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {Array.from({ length: totalBars }).map((_, i) => {
          const angle = (i * 360) / totalBars;
          let barHeight = 8; // px
          let barColor = 'bg-stone-300 dark:bg-stone-700';

          if (state === 'speaking') {
            // Harmonic speech waveform oscillation
            const harmonic = Math.sin((i / totalBars) * Math.PI * 4 + pulseTick * 0.4);
            const dynamicScale = Math.abs(harmonic);
            barHeight = 10 + Math.floor(dynamicScale * 18);
            barColor = i % 2 === 0 ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-700 dark:bg-stone-300';
          } else if (state === 'listening') {
            // Acoustic microphone input oscillation
            const wave = Math.cos((i / totalBars) * Math.PI * 6 + pulseTick * 0.6);
            const dynamicScale = Math.abs(wave);
            barHeight = 8 + Math.floor(dynamicScale * 16);
            if (i % 4 === 0) {
              barColor = 'bg-stone-900 dark:bg-stone-100';
            } else if (i % 8 === 0) {
              barColor = 'bg-rose-600 dark:bg-rose-500';
            } else {
              barColor = 'bg-stone-800 dark:bg-stone-300';
            }
          } else if (state === 'thinking') {
            // Stepped sequential scanning
            const activeIndex = (pulseTick * 2) % totalBars;
            const distance = Math.abs(i - activeIndex);
            if (distance === 0 || distance === 1) {
              barHeight = 16;
              barColor = 'bg-stone-900 dark:bg-stone-100';
            } else if (distance <= 3) {
              barHeight = 12;
              barColor = 'bg-stone-500 dark:bg-stone-400';
            } else {
              barHeight = 6;
              barColor = 'bg-stone-300 dark:bg-stone-800';
            }
          } else {
            // Idle: minimal, steady precision calibration ticks
            barHeight = i % 4 === 0 ? 10 : 6;
            barColor = i % 4 === 0 ? 'bg-stone-400 dark:bg-stone-600' : 'bg-stone-200 dark:bg-stone-800';
          }

          return (
            <div
              key={i}
              className="absolute w-[2px] transition-all duration-100 origin-center flex flex-col items-center justify-start"
              style={{
                transform: `rotate(${angle}deg) translateY(-94px)`,
                height: '28px',
              }}
            >
              <div
                className={`w-full rounded-[1px] ${barColor} transition-all duration-100`}
                style={{ height: `${barHeight}px` }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Central Tactile Push-Button (Drafting Dial) ── */}
      <button
        onClick={onClick}
        className={`relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[2px] border-stone-900 dark:border-stone-700 flex flex-col items-center justify-center transition-all duration-120 cursor-pointer select-none group shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#18181b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
          state === 'listening'
            ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900'
            : state === 'thinking'
            ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 border-dashed'
            : state === 'speaking'
            ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900'
            : 'bg-[#fcfbf9] text-stone-900 dark:bg-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700'
        }`}
        aria-label="Acoustic Console Push-to-Talk"
      >
        {/* Inner state icon & typography */}
        {state === 'listening' && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <Radio size={20} className="animate-pulse" />
            </div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest mt-0.5">
              REC // LIVE
            </span>
          </div>
        )}

        {state === 'thinking' && (
          <div className="flex flex-col items-center gap-1">
            <Activity size={22} className="animate-pulse text-stone-900 dark:text-stone-100" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest mt-0.5">
              ANALYZING
            </span>
          </div>
        )}

        {state === 'speaking' && (
          <div className="flex flex-col items-center gap-1">
            <Volume2 size={22} className="text-stone-100 dark:text-stone-900" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest mt-0.5">
              AUDIO OUT
            </span>
          </div>
        )}

        {state === 'idle' && (
          <div className="flex flex-col items-center gap-1">
            <Mic size={22} className="text-stone-900 dark:text-stone-100 group-hover:scale-105 transition-transform" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">
              TAP TO TALK
            </span>
          </div>
        )}
      </button>

    </div>
  );
}
