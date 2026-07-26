import { useEffect, useState } from 'react';
import api from '../api/client';
import { Target, Activity as ActivityIcon, Flame, Book, HelpCircle, GraduationCap, Layout, MessageSquare } from 'lucide-react';

interface Stats {
  total_documents: number; total_quizzes: number; average_score: number;
  total_messages: number; total_flashcards: number;
  active_roadmaps: number; roadmap_progress_percent: number;
  recent_activity: Activity[];
}
interface Activity { date: string; documents_studied: number; quizzes_taken: number; }
interface Streak { current_streak: number; longest_streak: number; today: { documents_studied: number; quizzes_taken: number; }; }
interface Topic { document_id: string; document_title: string; quizzes_taken: number; average_score: number | null; }

export default function Progress() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    api.get('/progress/dashboard').then(({ data }) => setStats(data));
    api.get('/progress/streak').then(({ data }) => setStreak(data));
    api.get('/progress/topics').then(({ data }) => setTopics(data.topics));
  }, []);

  if (!stats || !streak) return (
    <div className="flex items-center justify-center h-[50vh] text-slate-400 animate-pulse">
      <div className="text-center space-y-4">
        <ActivityIcon size={48} className="mx-auto text-blue-500" />
        <p className="font-medium text-lg">Loading your progress...</p>
      </div>
    </div>
  );

  const cards = [
    { label: 'Documents', value: stats.total_documents, color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: <Book size={20} /> },
    { label: 'Quizzes', value: stats.total_quizzes, color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: <HelpCircle size={20} /> },
    { label: 'Avg Score', value: `${stats.average_score}%`, color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: <GraduationCap size={20} /> },
    { label: 'Flashcards', value: stats.total_flashcards, color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', icon: <Layout size={20} /> },
    { label: 'Messages', value: stats.total_messages, color: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: <MessageSquare size={20} /> },
    { label: 'Roadmaps', value: stats.active_roadmaps, color: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', icon: <Target size={20} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pt-4">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg transform rotate-3">
          <ActivityIcon size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Your Progress</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your learning journey and stay motivated.</p>
        </div>
      </div>

      {/* Roadmap Progress Banner */}
      {stats.roadmap_progress_percent > 0 && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="font-semibold text-slate-300">Overall Roadmap Progress</span>
              <span className="text-2xl font-bold">{stats.roadmap_progress_percent}%</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden border border-slate-600/50">
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${stats.roadmap_progress_percent}%` }}>
                <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-start gap-4 transition-transform hover:scale-[1.02] cursor-default bg-white dark:bg-slate-900`}>
            <div className={`p-3 rounded-2xl ${c.color}`}>
              {c.icon}
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{c.value}</div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Streak Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 text-orange-50/50 dark:text-orange-950/20 group-hover:text-orange-50 transition-colors">
            <Flame size={160} />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Flame className="text-orange-500" /> Learning Streak
            </h3>
            <div className="flex items-center gap-8 md:gap-12 mb-6">
              <div>
                <div className="text-5xl font-black text-orange-500 drop-shadow-sm mb-1">{streak.current_streak} <span className="text-2xl text-slate-400 dark:text-slate-500">days</span></div>
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Streak</div>
              </div>
              <div className="w-px h-16 bg-slate-200 dark:bg-slate-800"></div>
              <div>
                <div className="text-3xl font-bold text-blue-500 mb-1">{streak.longest_streak} <span className="text-lg text-slate-400 dark:text-slate-500">days</span></div>
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Longest Streak</div>
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 rounded-2xl p-4 inline-block">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Today's Activity: <span className="font-bold">{streak.today.documents_studied}</span> docs studied &middot; <span className="font-bold">{streak.today.quizzes_taken}</span> quizzes taken
              </p>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <ActivityIcon className="text-blue-500" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {stats.recent_activity.length === 0 && (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 dark:text-slate-500 font-medium">No activity yet. Start learning!</p>
              </div>
            )}
            {stats.recent_activity.slice(0, 5).map((a) => (
              <div key={a.date} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 font-bold text-sm">
                    {new Date(a.date).getDate()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{new Date(a.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short' })}</p>
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-slate-600 dark:text-slate-300 space-x-3">
                  <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md">{a.documents_studied} docs</span>
                  <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md">{a.quizzes_taken} quizzes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-Document Mastery Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <Target className="text-purple-500" /> Per-Document Mastery
        </h3>
        {topics.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Take some quizzes to see your per-document mastery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                  <th className="pb-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-sm px-4">Document</th>
                  <th className="pb-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-sm px-4">Quizzes Taken</th>
                  <th className="pb-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-sm px-4">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {topics.map((t) => (
                  <tr key={t.document_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.document_title}</td>
                    <td className="py-4 px-4">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-bold">{t.quizzes_taken}</span>
                    </td>
                    <td className="py-4 px-4">
                      {t.average_score != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div className={`h-2 rounded-full ${t.average_score >= 80 ? 'bg-emerald-500' : t.average_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${t.average_score}%` }}></div>
                          </div>
                          <span className={`font-bold text-sm ${t.average_score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : t.average_score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{t.average_score}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm font-medium italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
