import { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import ProfileModal from './ProfileModal';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  HelpCircle,
  Menu,
} from 'lucide-react';

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const navigate = useNavigate();
  const location = useLocation();
  const [headerQuery, setHeaderQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (token && !user) {
      api.get('/auth/me').then((res) => setUser(res.data)).catch(console.error);
    }
  }, [token, user, setUser]);

  if (!token) return <Navigate to="/login" replace />;

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(headerQuery.trim())}`);
    setHeaderQuery('');
  };

  const mobileNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/documents', label: 'Documents', icon: <FileText size={18} /> },
    { to: '/chat', label: 'AI Tutor', icon: <MessageSquare size={18} /> },
    { to: '/quizzes', label: 'Study', icon: <HelpCircle size={18} /> },
  ];

  return (
    <div className="flex h-screen bg-[#fcfbf9] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans selection:bg-stone-900 selection:text-stone-100 overflow-hidden">
      {/* Modern, Structured Workflow Sidebar (Desktop Rail & Mobile Slide-Over) */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenSettings={() => setIsProfileOpen(true)}
      />

      {/* Primary Content Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Minimal Utility Header */}
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          headerQuery={headerQuery}
          setHeaderQuery={setHeaderQuery}
          onSubmitSearch={handleHeaderSearch}
        />

        {/* Predictable Content Container with Bottom Padding for Mobile Nav */}
        <main className="flex-1 overflow-y-auto min-h-0 pb-20 lg:pb-6">
          <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <Outlet />
          </div>
        </main>

        {/* Intentional Mobile Bottom Navigation Bar */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#fcfbf9] dark:bg-stone-900 border-t-[1.5px] border-stone-900 dark:border-stone-700 flex items-center justify-around px-1 lg:hidden select-none safe-area-bottom"
          aria-label="Mobile Navigation"
        >
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-stone-900 dark:text-stone-100 font-bold'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <div className={`p-1 rounded-[2px] transition-colors ${isActive ? 'bg-stone-200 dark:bg-stone-800 border border-stone-900 dark:border-stone-600' : ''}`}>
                  {item.icon}
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded-[2px]">
              <Menu size={18} />
            </div>
            <span>More</span>
          </button>
        </nav>

        {/* Profile / Account Settings Slide-Over Drawer */}
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </div>
    </div>
  );
}
