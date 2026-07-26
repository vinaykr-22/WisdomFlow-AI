import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import { FileText, Mic, MessageSquare, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    if (!user) {
      api.get('/auth/me').then(({ data }) => setUser(data)).catch(() => {});
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 sm:p-12 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-purple-400 opacity-20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
            Welcome back{user ? `, ${user.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-xl leading-relaxed">
            Ready to accelerate your learning? Upload a new document, review your flashcards, or practice with the AI Voice Tutor.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Link to="/documents" className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Upload Document</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">Add new PDFs, DOCX, or text files to your knowledge base.</p>
            <div className="flex items-center text-blue-600 text-sm font-medium gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 mt-auto">
              Get Started <ArrowRight size={16} />
            </div>
          </Link>

          <Link to="/voice-tutor" className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 dark:group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Mic size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Voice Tutor</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">Practice your knowledge out loud with an interactive AI tutor.</p>
            <div className="flex items-center text-purple-600 text-sm font-medium gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 mt-auto">
              Start Speaking <ArrowRight size={16} />
            </div>
          </Link>

          <Link to="/chat" className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Ask Questions</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">Chat directly with your documents to find answers quickly.</p>
            <div className="flex items-center text-emerald-600 text-sm font-medium gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 mt-auto">
              Open Chat <ArrowRight size={16} />
            </div>
          </Link>

        </div>
      </section>
    </div>
  );
}
