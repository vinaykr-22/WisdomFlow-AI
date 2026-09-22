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
      <div className="space-y-6 animate-pulse font-mono">
        <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 rounded-[2px] border border-stone-300 dark:border-stone-700" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-stone-200 dark:bg-stone-800 rounded-[2px] border-[1.5px] border-stone-300 dark:border-stone-700" />
          ))}
        </div>
        <div className="h-64 bg-stone-200 dark:bg-stone-800 rounded-[2px] border-[1.5px] border-stone-300 dark:border-stone-700" />
      </div>
    );
  }

  const metrics = [
    {
      code: 'STREAK',
      label: 'Learning Streak',
      value: `${streak?.current_streak || 0} ${streak?.current_streak === 1 ? 'DAY' : 'DAYS'}`,
      subtext: `Best record: ${streak?.longest_streak || 0} days`,
      icon: <Flame size={16} className="text-stone-900 dark:text-stone-100" />,
    },
    {
      code: 'ACCURACY',
      label: 'Average Score',
      value: stats?.average_score ? `${stats.average_score}%` : '—',
      subtext: 'Across all quizzes taken',
      icon: <GraduationCap size={16} className="text-stone-900 dark:text-stone-100" />,
    },
    {
      code: 'ARCHIVE',
      label: 'Documents Studied',
      value: stats?.total_documents ?? 0,
      subtext: 'Catalogued in library',
      icon: <BookOpen size={16} className="text-stone-900 dark:text-stone-100" />,
    },
    {
      code: 'TESTING',
      label: 'Quizzes Completed',
      value: stats?.total_quizzes ?? 0,
      subtext: `${stats?.total_flashcards ?? 0} cards retained`,
      icon: <HelpCircle size={16} className="text-stone-900 dark:text-stone-100" />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-stone-900 dark:border-stone-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              [ WORKSPACE // METRICS & HISTORICAL LEDGER ]
            </span>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-200">
              TELEMETRY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mt-1">
            Learning Performance & Telemetry
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Evaluate retention consistency, examination outcomes, and chronological study dispatches.
          </p>
        </div>

        {streak?.today && (
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#000]">
            <span className="w-2 h-2 rounded-[1px] bg-stone-900 dark:bg-stone-100 animate-pulse" />
            <span className="font-mono text-[11px]">
              TODAY // <strong className="font-bold">{streak.today.documents_studied}</strong> DOCS · <strong className="font-bold">{streak.today.quizzes_taken}</strong> TESTS
            </span>
          </div>
        )}
      </div>

      {/* High-Level Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.code}
            className="p-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#000] space-y-2"
          >
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                [{m.code}]
              </span>
              <div className="p-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
                {m.icon}
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {m.value}
              </div>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                {m.label}
              </p>
              <p className="font-mono text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                {m.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Roadmap Progress Blueprint */}
      {stats && stats.roadmap_progress_percent > 0 && (
        <div className="p-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#000] space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <Map size={14} className="text-stone-900 dark:text-stone-100" />
              <span className="font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                [ BLUEPRINT // ACTIVE ROADMAP COMPLETION ]
              </span>
            </div>
            <span className="font-bold text-stone-900 dark:text-stone-100">
              {stats.roadmap_progress_percent}%
            </span>
          </div>
          <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-[2px] border border-stone-900 dark:border-stone-700 overflow-hidden p-[1px]">
            <div
              className="h-full bg-stone-900 dark:bg-stone-100 rounded-[1px] transition-all duration-500"
              style={{ width: `${stats.roadmap_progress_percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Structured Sections: History + Document Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Chronological Learning History */}
        <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] overflow-hidden">
          <div className="p-3.5 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-stone-900 dark:text-stone-100" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                [ DISPATCH // CHRONOLOGICAL ACTIVITY LOG ]
              </h2>
            </div>
            <span className="font-mono text-[10px] text-stone-500">
              RECENT 7 DAYS
            </span>
          </div>

          <div className="divide-y border-stone-200 dark:divide-stone-800">
            {(!stats?.recent_activity || stats.recent_activity.length === 0) ? (
              <div className="p-8 text-center font-mono text-xs text-stone-500">
                [ NO LOGGED DISPATCHES ]<br />
                Process documents or take evaluations to record activity.
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
                    className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-mono text-xs font-bold text-stone-900 dark:text-stone-100 shadow-[1px_1px_0px_#18181b]">
                        {dateObj.getDate()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {formattedDate}
                        </p>
                        <p className="font-mono text-[10px] text-stone-500 uppercase">
                          Study session logged
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {item.documents_studied > 0 && (
                        <span className="px-2 py-0.5 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold">
                          {item.documents_studied} DOCS
                        </span>
                      )}
                      {item.quizzes_taken > 0 && (
                        <span className="px-2 py-0.5 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 font-bold">
                          {item.quizzes_taken} TESTS
                        </span>
                      )}
                      {item.documents_studied === 0 && item.quizzes_taken === 0 && (
                        <span className="text-stone-400 uppercase">[RECORDED]</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Per-Document Mastery Table */}
        <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] overflow-hidden">
          <div className="p-3.5 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-stone-900 dark:text-stone-100" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                [ EVALUATION // DOCUMENT MASTERY MATRIX ]
              </h2>
            </div>
            <Link
              to="/quizzes"
              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-stone-900 dark:text-stone-100 hover:underline"
            >
              <span>Take Quiz</span>
              <ArrowUpRight size={11} />
            </Link>
          </div>

          {topics.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-stone-500">
              [ NO EVALUATION DATA ]<br />
              Complete quizzes linked to documents to build the mastery matrix.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/30 font-mono text-[10px] text-stone-500 uppercase tracking-wider">
                    <th className="py-2 px-3.5 font-bold">Document</th>
                    <th className="py-2 px-3.5 font-bold text-center">Tests</th>
                    <th className="py-2 px-3.5 font-bold text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {topics.map((t) => (
                    <tr
                      key={t.document_id}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-bold text-stone-900 dark:text-stone-100 max-w-[170px] truncate">
                        {t.document_title}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-xs text-stone-700 dark:text-stone-300">
                        {t.quizzes_taken}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono">
                        {t.average_score != null ? (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="w-14 h-2 bg-stone-100 dark:bg-stone-800 border border-stone-900 dark:border-stone-700 rounded-[1px] overflow-hidden p-[0.5px]">
                              <div
                                className="h-full bg-stone-900 dark:bg-stone-100 rounded-[0.5px]"
                                style={{ width: `${t.average_score}%` }}
                              />
                            </div>
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {t.average_score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">—</span>
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
