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
  '/dashboard': { section: 'Main', title: 'Dashboard' },
  '/documents': { section: 'Main', title: 'Documents' },
  '/roadmap': { section: 'Main', title: 'Roadmaps' },
  '/summarize': { section: 'Main', title: 'Summarizer' },
  '/voice-tutor': { section: 'Main', title: 'Voice Tutor' },
  '/chat': { section: 'Main', title: 'AI Tutor' },
  '/quizzes': { section: 'Study', title: 'Quizzes' },
  '/flashcards': { section: 'Study', title: 'Flashcards' },
  '/revision': { section: 'Study', title: 'Revision' },
  '/progress': { section: 'Study', title: 'Progress' },
  '/search': { section: 'Utility', title: 'Search' },
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
    section: 'WisdomFlow',
    title: 'Workspace',
  };

  return (
    <header className="h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 z-20 flex-shrink-0 gap-2">
      {/* Left: Mobile Drawer Trigger & Clean Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-xs select-none truncate">
          <span className="text-slate-400 dark:text-slate-500 font-medium hidden md:inline">
            {currentRouteInfo.section}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden md:inline">/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold tracking-tight truncate">
            {currentRouteInfo.title}
          </span>
        </div>
      </div>

      {/* Center: Responsive global search */}
      <div className="flex-1 max-w-[200px] sm:max-w-xs md:max-w-sm mx-1 sm:mx-4">
        <form onSubmit={onSubmitSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search size={13} />
          </div>
          <input
            type="text"
            value={headerQuery}
            onChange={(e) => setHeaderQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 sm:pl-8 pr-2 sm:pr-8 py-1.5 text-xs bg-slate-100/70 dark:bg-slate-800/70 border border-transparent rounded-md focus:bg-white dark:focus:bg-slate-900 focus:border-slate-300 dark:focus:border-slate-700 focus:outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-200"
          />
          <kbd className="hidden sm:inline-flex items-center absolute right-2 top-1/2 -translate-y-1/2 px-1 text-[10px] text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono select-none">
            ↵
          </kbd>
        </form>
      </div>

      {/* Right: Controls (Theme toggle + Level pill) */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {user?.level && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded">
            Level {user.level}
          </span>
        )}

        <Tooltip content={isDark ? 'Light mode' : 'Dark mode'}>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
