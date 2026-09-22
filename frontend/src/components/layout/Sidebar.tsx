import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Map,
  AlignLeft,
  Mic,
  MessageSquare,
  HelpCircle,
  Layers,
  Calendar,
  TrendingUp,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { getMediaUrl } from '../../api/client';
import { Tooltip } from '../ui/Tooltip';
import { WisdomFlowLogo } from '../ui/WisdomFlowLogo';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSettings: () => void;
}

interface NavItem {
  to?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenSettings,
}: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const sections: NavSection[] = [
    {
      title: '// WORKSPACE',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { to: '/documents', label: 'Documents', icon: <FileText size={16} /> },
        { to: '/roadmap', label: 'Roadmaps', icon: <Map size={16} /> },
        { to: '/summarize', label: 'Summarizer', icon: <AlignLeft size={16} /> },
        { to: '/chat', label: 'Tutor Workspace', icon: <MessageSquare size={16} /> },
        { to: '/voice-tutor', label: 'Voice Tutor', icon: <Mic size={16} /> },
      ],
    },
    {
      title: '// STUDY & REVISION',
      items: [
        { to: '/quizzes', label: 'Quizzes', icon: <HelpCircle size={16} /> },
        { to: '/flashcards', label: 'Flashcards', icon: <Layers size={16} /> },
        { to: '/revision', label: 'Revision Plan', icon: <Calendar size={16} /> },
        { to: '/progress', label: 'Progress', icon: <TrendingUp size={16} /> },
      ],
    },
    {
      title: '// SYSTEM',
      items: [
        { to: '/search', label: 'Search Index', icon: <Search size={16} /> },
        { label: 'Settings', icon: <Settings size={16} />, onClick: onOpenSettings },
      ],
    },
  ];

  const renderItem = (item: NavItem, isMobile: boolean) => {
    const isActive = item.to ? location.pathname === item.to : false;

    const content = (
      <div
        className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-[2px] text-xs font-medium transition-all select-none cursor-pointer ${
          isActive
            ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-50 border-[1.5px] border-stone-900 dark:border-stone-500 shadow-[1.5px_1.5px_0px_#18181b] dark:shadow-[1.5px_1.5px_0px_#52525b] font-semibold'
            : 'text-stone-700 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:text-stone-950 dark:hover:text-stone-200 border border-transparent'
        } ${isCollapsed && !isMobile ? 'justify-center px-1.5' : ''}`}
      >
        <span className={`flex-shrink-0 ${isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'}`}>
          {item.icon}
        </span>

        {(!isCollapsed || isMobile) && (
          <span className="truncate tracking-tight">{item.label}</span>
        )}

        {/* Minimal dot active indicator when collapsed */}
        {isActive && isCollapsed && !isMobile && (
          <span className="absolute right-1 top-1 w-1.5 h-1.5 bg-stone-900 dark:bg-stone-100 rounded-full" />
        )}
      </div>
    );

    if (item.to) {
      const linkElem = (
        <Link
          key={item.to}
          to={item.to}
          onClick={onCloseMobile}
          className="block outline-none"
        >
          {content}
        </Link>
      );

      if (isCollapsed && !isMobile) {
        return (
          <Tooltip key={item.to} content={item.label} side="right">
            {linkElem}
          </Tooltip>
        );
      }
      return linkElem;
    }

    const buttonElem = (
      <button
        key={item.label}
        type="button"
        onClick={() => {
          item.onClick?.();
          onCloseMobile();
        }}
        className="w-full text-left outline-none cursor-pointer"
      >
        {content}
      </button>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip key={item.label} content={item.label} side="right">
          {buttonElem}
        </Tooltip>
      );
    }
    return buttonElem;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-stone-950/40 z-30 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-[#fcfbf9] dark:bg-[#111215] border-r-[1.5px] border-stone-900 dark:border-stone-800 transition-all duration-150 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-[4px_0px_0px_#18181b]' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-16' : 'lg:w-60'}`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b-[1.5px] border-stone-900 dark:border-stone-800">
          <Link
            to="/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-2.5 overflow-hidden group ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <WisdomFlowLogo size={28} />

            {!isCollapsed && (
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  WisdomFlow
                </span>
                <span className="text-[9px] font-mono font-bold uppercase text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-900 dark:border-stone-700 px-1 py-0.2 rounded-[2px]">
                  OS
                </span>
              </div>
            )}
          </Link>

          {/* Close trigger on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1 rounded text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              {(!isCollapsed || isMobileOpen) && (
                <p className="px-2.5 text-[9px] font-mono font-bold text-stone-500 dark:text-stone-500 uppercase tracking-wider mb-1 select-none">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => renderItem(item, isMobileOpen))}
            </div>
          ))}
        </nav>

        {/* User Account Controls in Footer */}
        <div className="p-2 border-t-[1.5px] border-stone-900 dark:border-stone-800 bg-[#f7f6f2] dark:bg-[#15161a]">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-1.5 p-1 rounded-[2px] hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-colors">
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
              >
                {user?.profile_photo_url ? (
                  <img
                    src={getMediaUrl(user.profile_photo_url)}
                    alt={user?.full_name || 'Profile'}
                    className="w-7 h-7 rounded-[2px] object-cover border border-stone-900 dark:border-stone-600 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon size={13} />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {user?.full_name || 'Study Workspace'}
                  </p>
                  <p className="text-[10px] font-mono text-stone-500 dark:text-stone-400 truncate">
                    {user?.email || 'Active'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-[2px] transition-colors cursor-pointer"
                title="Log out"
                aria-label="Log out of account"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip content="Settings" side="right">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center cursor-pointer hover:bg-stone-200"
                  aria-label="Account Settings"
                >
                  <UserIcon size={14} />
                </button>
              </Tooltip>
              <Tooltip content="Log out" side="right">
                <button
                  type="button"
                  onClick={logout}
                  className="p-1 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  aria-label="Log out"
                >
                  <LogOut size={15} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <div className="hidden lg:flex items-center justify-end px-3 py-1.5 border-t border-stone-200 dark:border-stone-800/80">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-1.5 text-[10px] font-mono text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer select-none"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <span>[ COLLAPSE ]</span>
                <ChevronLeft size={14} />
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
