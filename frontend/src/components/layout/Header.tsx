import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../stores/theme';
import { useAuthStore } from '../../stores/auth';
import { Tooltip } from '../ui/Tooltip';

export interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenProfile: () => void;
  headerQuery: string;
  setHeaderQuery: (query: string) => void;
  onSubmitSearch: (e: React.FormEvent) => void;
}

const routeTitles: Record<string, { section: string; title: string }> = {
  '/dashboard': { section: 'WORKSPACE', title: 'DASHBOARD' },
  '/documents': { section: 'WORKSPACE', title: 'DOCUMENTS' },
  '/roadmap': { section: 'WORKSPACE', title: 'ROADMAPS' },
  '/summarize': { section: 'WORKSPACE', title: 'SUMMARIZER' },
  '/voice-tutor': { section: 'WORKSPACE', title: 'VOICE TUTOR' },
  '/chat': { section: 'WORKSPACE', title: 'TUTOR WORKSPACE' },
  '/quizzes': { section: 'STUDY', title: 'QUIZZES' },
  '/flashcards': { section: 'STUDY', title: 'FLASHCARDS' },
  '/revision': { section: 'STUDY', title: 'REVISION' },
  '/progress': { section: 'STUDY', title: 'PROGRESS' },
  '/search': { section: 'INDEX', title: 'SEARCH' },
};

export function Header({
  onOpenMobileSidebar,
  headerQuery,
  setHeaderQuery,
  onSubmitSearch,
}: HeaderProps) {
  const location = useLocation();
  const { isDark, toggleTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  const currentRouteInfo = routeTitles[location.pathname] || {
    section: 'WORKSPACE',
    title: 'STUDY SESSION',
  };

  return (
    <header className="h-14 bg-[#fcfbf9] dark:bg-[#111215] border-b-[1.5px] border-stone-900 dark:border-stone-800 flex items-center justify-between px-3.5 sm:px-6 z-20 flex-shrink-0 gap-3 select-none">
      {/* Left: Mobile Drawer Trigger & Technical Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-100 lg:hidden cursor-pointer flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-1.5 text-xs font-mono select-none truncate">
          <span className="text-stone-500 dark:text-stone-400 font-bold hidden sm:inline">
            [{currentRouteInfo.section}
          </span>
          <span className="text-stone-400 dark:text-stone-600 hidden sm:inline">//</span>
          <span className="text-stone-950 dark:text-stone-50 font-bold tracking-tight truncate">
            {currentRouteInfo.title}]
          </span>
        </div>
      </div>

      {/* Center: High-contrast technical query field */}
      <div className="flex-1 max-w-[220px] sm:max-w-xs md:max-w-sm mx-1 sm:mx-4">
        <form onSubmit={onSubmitSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-500">
            <Search size={13} />
          </div>
          <input
            type="text"
            value={headerQuery}
            onChange={(e) => setHeaderQuery(e.target.value)}
            placeholder="Search index..."
            className="w-full pl-8 pr-8 py-1.5 text-xs font-mono bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] shadow-[1px_1px_0px_#18181b] dark:shadow-[1px_1px_0px_#3f3f46] focus:outline-none focus:border-stone-950 dark:focus:border-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-stone-900 dark:text-stone-100"
          />
          <kbd className="hidden sm:inline-flex items-center absolute right-2 top-1/2 -translate-y-1/2 px-1 text-[9px] text-stone-500 bg-stone-100 dark:bg-stone-800 border border-stone-400 dark:border-stone-600 rounded-[2px] font-mono select-none">
            ↵
          </kbd>
        </form>
      </div>

      {/* Right: Technical Level indicator & Theme toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {user?.level && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-600 px-2 py-0.5 rounded-[2px] shadow-[1px_1px_0px_#18181b] dark:shadow-[1px_1px_0px_#3f3f46]">
            LVL.{user.level}
          </span>
        )}

        <Tooltip content={isDark ? 'Light drafting canvas' : 'Dark drafting canvas'}>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-7.5 h-7.5 flex items-center justify-center rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-100 shadow-[1px_1px_0px_#18181b] dark:shadow-[1px_1px_0px_#3f3f46] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform cursor-pointer select-none"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
