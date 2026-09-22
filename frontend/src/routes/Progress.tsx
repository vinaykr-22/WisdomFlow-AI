import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  Flame,
  BookOpen,
  HelpCircle,
  GraduationCap,
  Layers,
  Map,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  total_documents: number;
  total_quizzes: number;
  average_score: number;
  total_messages: number;
  total_flashcards: number;
  active_roadmaps: number;
  roadmap_progress_percent: number;
  recent_activity: Activity[];
}

interface Activity {
  date: string;
  documents_studied: number;
  quizzes_taken: number;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  today: {
    documents_studied: number;
    quizzes_taken: number;
  };
}

interface Topic {
  document_id: string;
  document_title: string;
  quizzes_taken: number;
  average_score: number | null;
}

export default function Progress() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/progress/dashboard').then(({ data }) => data).catch(() => null),
      api.get('/progress/streak').then(({ data }) => data).catch(() => null),
      api.get('/progress/topics').then(({ data }) => data.topics || []).catch(() => []),
    ]).then(([statsData, streakData, topicsData]) => {
      setStats(statsData);
      setStreak(streakData);
      setTopics(topicsData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  const metrics = [
    {
      label: 'Learning Streak',
      value: `${streak?.current_streak || 0} ${streak?.current_streak === 1 ? 'day' : 'days'}`,
      subtext: `Best: ${streak?.longest_streak || 0} days`,
      icon: <Flame size={18} className="text-amber-500" />,
    },
    {
      label: 'Average Score',
      value: stats?.average_score ? `${stats.average_score}%` : '—',
      subtext: 'Across all quizzes taken',
      icon: <GraduationCap size={18} className="text-indigo-600 dark:text-indigo-400" />,
    },
    {
      label: 'Documents Studied',
      value: stats?.total_documents ?? 0,
      subtext: 'Processed in library',
      icon: <BookOpen size={18} className="text-slate-500" />,
    },
    {
      label: 'Quizzes Completed',
      value: stats?.total_quizzes ?? 0,
      subtext: `${stats?.total_flashcards ?? 0} flashcards mastered`,
      icon: <HelpCircle size={18} className="text-slate-500" />,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Progress & History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor study consistency, assessment accuracy, and chronological learning logs.
          </p>
        </div>

        {streak?.today && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Today: <strong className="font-semibold text-slate-900 dark:text-slate-100">{streak.today.documents_studied}</strong> docs · <strong className="font-semibold text-slate-900 dark:text-slate-100">{streak.today.quizzes_taken}</strong> quizzes
            </span>
          </div>
        )}
      </div>

      {/* High-Level Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {m.label}
              </span>
              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                {m.icon}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {m.value}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {m.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Roadmap Completion Bar if active */}
      {stats && stats.roadmap_progress_percent > 0 && (
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Map size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Active Roadmap Completion
              </span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {stats.roadmap_progress_percent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.roadmap_progress_percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Structured Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Chronological Learning History */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-slate-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chronological Activity Log
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Recent study milestones
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {(!stats?.recent_activity || stats.recent_activity.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No recorded study activity yet. Review documents or take quizzes to log history.
              </div>
            ) : (
              stats.recent_activity.slice(0, 7).map((item) => {
                const dateObj = new Date(item.date);
                const formattedDate = dateObj.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={item.date}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {dateObj.getDate()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {formattedDate}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Study session completed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {item.documents_studied > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          {item.documents_studied} {item.documents_studied === 1 ? 'doc' : 'docs'}
                        </span>
                      )}
                      {item.quizzes_taken > 0 && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-medium text-[11px] border border-indigo-100 dark:border-indigo-900/40">
                          {item.quizzes_taken} {item.quizzes_taken === 1 ? 'quiz' : 'quizzes'}
                        </span>
                      )}
                      {item.documents_studied === 0 && item.quizzes_taken === 0 && (
                        <span className="text-[11px] text-slate-400">Activity logged</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Per-Document Mastery Table */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-slate-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Document Mastery Breakdown
              </h2>
            </div>
            <Link
              to="/quizzes"
              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Take Quiz <ArrowUpRight size={12} />
            </Link>
          </div>

          {topics.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Complete quizzes linked to your documents to view mastery breakdown.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-medium">Document</th>
                    <th className="py-2.5 px-4 font-medium text-center">Quizzes</th>
                    <th className="py-2.5 px-4 font-medium text-right">Mastery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {topics.map((t) => (
                    <tr
                      key={t.document_id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                        {t.document_title}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400">
                        {t.quizzes_taken}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {t.average_score != null ? (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  t.average_score >= 80
                                    ? 'bg-emerald-500'
                                    : t.average_score >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${t.average_score}%` }}
                              />
                            </div>
                            <span
                              className={`font-semibold ${
                                t.average_score >= 80
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : t.average_score >= 50
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {t.average_score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
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

    </div>
  );
}
