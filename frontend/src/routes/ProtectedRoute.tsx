import { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { 
  LayoutDashboard, FileText, AlignLeft, MessageSquare, 
  HelpCircle, Layers, Map, TrendingUp, BookOpen, Search, LogOut, BrainCircuit, Mic, UserCircle, Moon, Sun
} from 'lucide-react';
import VoiceTutor from './VoiceTutor';
import ProfileModal from './ProfileModal';

interface NavItem { to: string; label: string; icon: React.ReactNode; }

const nav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/documents', label: 'Documents', icon: <FileText size={20} /> },
  { to: '/summarize', label: 'Summarizer', icon: <AlignLeft size={20} /> },
  { to: '/chat', label: 'Chat', icon: <MessageSquare size={20} /> },
  { to: '/quizzes', label: 'Quizzes', icon: <HelpCircle size={20} /> },
  { to: '/flashcards', label: 'Flashcards', icon: <Layers size={20} /> },
  { to: '/roadmap', label: 'Roadmap', icon: <Map size={20} /> },
  { to: '/progress', label: 'Progress', icon: <TrendingUp size={20} /> },
  { to: '/revision', label: 'Revision', icon: <BookOpen size={20} /> },
];

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { isDark, toggleTheme } = useThemeStore();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [headerQuery, setHeaderQuery] = useState('');
  const [isVoiceTutorOpen, setIsVoiceTutorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (token && !user) {
      api.get('/auth/me').then(res => setUser(res.data)).catch(console.error);
    }
  }, [token, user, setUser]);

  if (!token) return <Navigate to="/login" replace />;

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(headerQuery.trim())}`);
    setHeaderQuery('');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 overflow-hidden transition-colors duration-300">
      
      {/* Sidebar */}
      <aside className={`flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 z-40 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden group">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-1.5 rounded-xl shadow-sm group-hover:shadow-md transition-all flex-shrink-0">
              <BrainCircuit size={24} />
            </div>
            <span className={`text-xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent tracking-tight whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              WisdomFlow
            </span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={!isSidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group
                  ${active 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <div className={`${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'} transition-colors`}>
                  {item.icon}
                </div>
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full py-2 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {isSidebarOpen ? 'Collapse' : '»'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm flex items-center justify-between px-6 z-30 transition-colors duration-300">
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleHeaderSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={headerQuery}
                onChange={(e) => setHeaderQuery(e.target.value)}
                placeholder="Search resources, topics, or documents..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-transparent rounded-full focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300 dark:focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:outline-none transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100 shadow-inner"
              />
            </form>
          </div>
          
          <div className="ml-4 flex items-center gap-3">
            
            {/* Gamified Stats */}
            {user && (
              <div className="hidden lg:flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full py-1 px-3 shadow-sm mr-2 transition-colors">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user.level || 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lvl</span>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex flex-col w-24">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                    <span>XP</span>
                    <span>{user.xp || 0} / {(user.level || 1) * 100}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full" 
                      style={{ width: `${Math.min(100, ((user.xp || 0) / ((user.level || 1) * 100)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-sm border border-slate-100 dark:border-slate-700"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-100 dark:border-slate-700 cursor-pointer shadow-sm"
              title="My Profile"
            >
              {user?.profile_photo_url ? (
                <img src={user.profile_photo_url} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserCircle size={20} />}
                </div>
              )}
              <span className="hidden sm:block text-sm font-semibold pr-2">{user?.full_name || 'My Profile'}</span>
            </button>
            <button 
              onClick={() => useAuthStore.getState().logout()} 
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer shadow-sm border border-transparent dark:border-slate-700"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 animate-in fade-in duration-500">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
        
        {/* Voice Tutor FAB */}
        <button
          onClick={() => setIsVoiceTutorOpen(true)}
          className={`absolute bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group ${isVoiceTutorOpen ? 'hidden' : ''}`}
          title="Open Voice Tutor"
        >
          <div className="absolute inset-0 rounded-full bg-purple-400 opacity-30 animate-ping group-hover:opacity-50"></div>
          <Mic size={28} className="relative z-10" />
        </button>

        {/* Voice Tutor Modal */}
        <div className={`fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md z-50 transition-all duration-300 flex items-center justify-center p-4 sm:p-6 ${isVoiceTutorOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className={`w-full max-w-5xl h-[85vh] transition-all duration-300 transform ${isVoiceTutorOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            {isVoiceTutorOpen && <VoiceTutor onClose={() => setIsVoiceTutorOpen(false)} />}
          </div>
        </div>

        {/* Profile Slide-Over Modal */}
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      </div>
    </div>
  );
}
