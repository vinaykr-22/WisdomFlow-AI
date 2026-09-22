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
      title: 'Main',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
        { to: '/documents', label: 'Documents', icon: <FileText size={17} /> },
        { to: '/roadmap', label: 'Roadmaps', icon: <Map size={17} /> },
        { to: '/summarize', label: 'Summarizer', icon: <AlignLeft size={17} /> },
        { to: '/voice-tutor', label: 'AI Voice Tutor', icon: <Mic size={17} /> },
        { to: '/chat', label: 'AI Tutor', icon: <MessageSquare size={17} /> },
      ],
    },
    {
      title: 'Study',
      items: [
        { to: '/quizzes', label: 'Quizzes', icon: <HelpCircle size={17} /> },
        { to: '/flashcards', label: 'Flashcards', icon: <Layers size={17} /> },
        { to: '/revision', label: 'Revision Plan', icon: <Calendar size={17} /> },
        { to: '/progress', label: 'Progress', icon: <TrendingUp size={17} /> },
      ],
    },
    {
      title: 'Utility',
      items: [
        { to: '/search', label: 'Search', icon: <Search size={17} /> },
        { label: 'Settings', icon: <Settings size={17} />, onClick: onOpenSettings },
      ],
    },
  ];

  const renderItem = (item: NavItem, isMobile: boolean) => {
    const isActive = item.to ? location.pathname === item.to : false;

    const content = (
      <div
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer select-none ${
          isActive
            ? 'bg-slate-100 dark:bg-slate-800/90 text-indigo-700 dark:text-indigo-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
        } ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}`}
      >
        {/* Crisp active indicator */}
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
        )}

        <span
          className={`flex-shrink-0 transition-colors ${
            isActive
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
          }`}
        >
          {item.icon}
        </span>

        {(!isCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
      </div>
    );

    if (item.to) {
      const link = (
        <Link
          key={item.to}
          to={item.to}
          onClick={isMobile ? onCloseMobile : undefined}
          className="block"
        >
          {content}
        </Link>
      );

      if (isCollapsed && !isMobile) {
        return (
          <Tooltip key={item.to} content={item.label} side="right">
            {link}
          </Tooltip>
        );
      }
      return link;
    }

    const button = (
      <button
        key={item.label}
        type="button"
        onClick={() => {
          if (isMobile) onCloseMobile();
          item.onClick?.();
        }}
        className="w-full text-left"
      >
        {content}
      </button>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip key={item.label} content={item.label} side="right">
          {button}
        </Tooltip>
      );
    }
    return button;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-slate-50/70 dark:bg-slate-900/90 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-xl' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-16' : 'lg:w-60'}`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-200/60 dark:border-slate-800/80">
          <Link
            to="/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-2.5 overflow-hidden group ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <WisdomFlowLogo size={30} />

            {!isCollapsed && (
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  WisdomFlow
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 px-1 py-0.2 rounded">
                  AI
                </span>
              </div>
            )}
          </Link>

          {/* Close trigger on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {(!isCollapsed || isMobileOpen) && (
                <p className="px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 select-none">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => renderItem(item, isMobileOpen))}
            </div>
          ))}
        </nav>

        {/* User Account Controls in Footer */}
        <div className="p-2.5 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer"
              >
                {user?.profile_photo_url ? (
                  <img
                    src={getMediaUrl(user.profile_photo_url)}
                    alt={user?.full_name || 'Profile'}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center flex-shrink-0">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon size={14} />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user?.full_name || 'My Account'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    Level {user?.level || 1} Student
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip content={user?.full_name || 'Account Settings'} side="right">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center cursor-pointer"
                >
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon size={15} />}
                </button>
              </Tooltip>
            </div>
          )}

          {/* Desktop Collapse Rail Toggle */}
          <div className="hidden lg:flex items-center justify-center pt-2 mt-2 border-t border-slate-200/40 dark:border-slate-800/40">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-full py-1 flex items-center justify-center gap-1.5 rounded text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              {!isCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
