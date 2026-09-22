import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import {
  FileText,
  Map,
  HelpCircle,
  Mic,
  Layers,
  ArrowRight,
  Clock,
  Flame,
  CheckCircle2,
  UploadCloud,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Skeleton } from '../components/ui/Skeleton';

interface Doc {
  id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  created_at: string;
}

interface RoadmapListItem {
  id: string;
  title: string;
  topic_name: string | null;
  total_nodes: number;
  completed_nodes: number;
  estimated_total_hours: number;
  created_at: string;
}

interface Activity {
  date: string;
  documents_studied: number;
  quizzes_taken: number;
}

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

interface Streak {
  current_streak: number;
  longest_streak: number;
  today: {
    documents_studied: number;
    quizzes_taken: number;
  };
}

export default function Dashboard() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapListItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      api.get('/documents').catch(() => ({ data: { documents: [] } })),
      api.get('/roadmap/lists').catch(() => ({ data: { roadmaps: [] } })),
      api.get('/progress/dashboard').catch(() => ({ data: null })),
      api.get('/progress/streak').catch(() => ({ data: null })),
      !user ? api.get('/auth/me').catch(() => ({ data: null })) : Promise.resolve(null),
    ]).then(([docsRes, roadmapsRes, statsRes, streakRes, userRes]) => {
      if (!isMounted) return;

      if (docsRes?.data?.documents) setDocs(docsRes.data.documents);
      if (roadmapsRes?.data?.roadmaps) setRoadmaps(roadmapsRes.data.roadmaps);
      if (statsRes?.data) setStats(statsRes.data);
      if (streakRes?.data) setStreak(streakRes.data);
      if (userRes?.data) setUser(userRes.data);

      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user, setUser]);

  const activeRoadmap =
    roadmaps.find((r) => r.completed_nodes < r.total_nodes) || roadmaps[0] || null;

  const activeRoadmapPct = activeRoadmap && activeRoadmap.total_nodes > 0
    ? Math.round((activeRoadmap.completed_nodes / activeRoadmap.total_nodes) * 100)
    : 0;

  const hasContent = docs.length > 0 || roadmaps.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-stone-800">
          <Skeleton height={28} width={240} />
          <Skeleton height={20} width={140} />
        </div>
        <Skeleton height={140} className="w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height={240} className="w-full" />
          <Skeleton height={240} className="w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-in fade-in duration-150">
      {/* 1. Technical Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b-[1.5px] border-stone-900 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">
              // SESSION STATUS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
            Study Workspace
          </h1>
          <p className="text-xs font-mono text-stone-500 dark:text-stone-400 mt-0.5">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            {user?.full_name ? ` · STUDENT: ${user.full_name.toUpperCase()}` : ''}
          </p>
        </div>

        {streak && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-[1.5px] border-stone-900 dark:border-stone-700 px-2.5 py-1 rounded-[2px] shadow-[1.5px_1.5px_0px_#18181b] dark:shadow-[1.5px_1.5px_0px_#3f3f46] text-xs font-mono font-bold select-none">
              <Flame size={14} className="text-amber-600 dark:text-amber-400" />
              <span>{streak.current_streak} DAY STREAK</span>
              <span className="text-stone-400">|</span>
              <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400">
                {streak.today.documents_studied} DOCS · {streak.today.quizzes_taken} QUIZZES TODAY
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Primary Learning Track / Active Curriculum */}
      {activeRoadmap ? (
        <Card variant="elevated" className="bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700">
          <CardHeader className="pb-3 bg-stone-50/70 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="primary">ACTIVE CURRICULUM</Badge>
                {activeRoadmap.topic_name && (
                  <span className="text-xs font-mono text-stone-600 dark:text-stone-400">
                    [TOPIC: {activeRoadmap.topic_name}]
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-bold tabular-nums text-stone-900 dark:text-stone-100">
                {activeRoadmap.completed_nodes} OF {activeRoadmap.total_nodes} MODULES COMPLETED [{activeRoadmapPct}%]
              </span>
            </div>
            <CardTitle className="text-base sm:text-lg mt-2 font-bold text-stone-950 dark:text-stone-50 tracking-tight">
              {activeRoadmap.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <Progress value={activeRoadmapPct} size="sm" variant="primary" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 text-xs font-mono text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} /> ~{activeRoadmap.estimated_total_hours}H PACED CURRICULUM
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-700 dark:text-emerald-400" />
                  {activeRoadmap.completed_nodes} COMPLETED
                </span>
              </div>

              <div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/roadmap')}
                  rightIcon={<ArrowRight size={14} />}
                >
                  Continue Curriculum
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : docs.length > 0 ? (
        <Card variant="default">
          <CardHeader className="pb-3 bg-stone-50/70 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Badge variant="info">CURRICULUM READY</Badge>
              <span className="text-xs font-mono text-stone-500">
                {docs.length} ARCHIVED DOCUMENT(S)
              </span>
            </div>
            <CardTitle className="text-base mt-1.5 font-bold">
              Generate Structured Curriculum
            </CardTitle>
            <CardDescription>
              Structure your indexed study material into an ordered, step-by-step topic blueprint.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/roadmap')}
                rightIcon={<ArrowRight size={14} />}
              >
                Build Roadmap
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/quizzes')}
              >
                Practice Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 3. Empty Onboarding State (If 0 docs and 0 roadmaps) */}
      {!hasContent && (
        <Card variant="subtle" className="p-8 sm:p-12 text-center border-dashed border-2 border-stone-400 dark:border-stone-700">
          <div className="w-12 h-12 rounded-[2px] bg-white dark:bg-stone-800 border-[1.5px] border-stone-900 dark:border-stone-600 text-stone-900 dark:text-stone-100 flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#18181b]">
            <UploadCloud size={22} />
          </div>

          <h2 className="text-lg font-bold text-stone-950 dark:text-stone-50 tracking-tight mb-1.5">
            Initialize Study Archive
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed mb-6 font-mono">
            Upload course materials (PDF, DOCX, or TXT) to generate structured summaries, flashcard decks, comprehension tests, and roadmap blueprints.
          </p>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/documents')}
            leftIcon={<UploadCloud size={15} />}
          >
            Upload Study Material
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mt-10 pt-8 border-t-[1.5px] border-stone-200 dark:border-stone-800 text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                [ 01 // ARCHIVE ]
              </span>
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Upload Content
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                PDF, DOCX, or text notes indexed into your workspace.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                [ 02 // SYNTHESIZE ]
              </span>
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Deep Study Notes
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                Read multi-page study summaries and listen to audio notes.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                [ 03 // MASTER ]
              </span>
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Knowledge Testing
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                Test recall and comprehension with quizzes and flashcards.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Action Station Toolbar */}
      {hasContent && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 select-none">
              // WORKSPACE ACTIONS
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/documents')}
              leftIcon={<UploadCloud size={14} />}
            >
              Upload Material
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/roadmap')}
              leftIcon={<Map size={14} />}
            >
              Curriculum Blueprint
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/quizzes')}
              leftIcon={<HelpCircle size={14} />}
            >
              Knowledge Test
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/voice-tutor')}
              leftIcon={<Mic size={14} />}
            >
              Voice Tutor
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/flashcards')}
              leftIcon={<Layers size={14} />}
            >
              Flashcard Decks
            </Button>
          </div>
        </div>
      )}

      {/* 5. Core Content: Recent Materials & Study Metrics */}
      {hasContent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Material Archive Card */}
          <Card variant="default">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-stone-50/60 dark:bg-stone-800/40">
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono">
                  // RECENT MATERIALS
                </CardTitle>
                <CardDescription>Indexed course documents</CardDescription>
              </div>
              <Link
                to="/documents"
                className="text-xs font-mono font-semibold text-stone-900 dark:text-stone-100 hover:underline"
              >
                [VIEW ALL ({docs.length})]
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {docs.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-stone-500">
                  No indexed documents. Upload materials to start.
                </div>
              ) : (
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                  {docs.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-stone-100/50 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex-shrink-0">
                          <FileText size={15} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB · {doc.file_type.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          to={`/summarize`}
                          className="px-2 py-0.5 rounded-[2px] border border-stone-900 dark:border-stone-700 text-[10px] font-mono font-semibold text-stone-900 dark:text-stone-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 transition-colors"
                        >
                          Summarize
                        </Link>
                        <Link
                          to={`/chat?docId=${doc.id}`}
                          className="p-1 rounded-[2px] border border-stone-900 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 transition-colors"
                          title="Ask questions in tutor workspace"
                        >
                          <MessageSquare size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics & Study Activity Log */}
          <div className="space-y-6">
            {/* Quick Metrics */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[1.5px_1.5px_0px_#18181b] dark:shadow-[1.5px_1.5px_0px_#3f3f46]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                    MASTERY
                  </span>
                  <span className="text-lg font-bold text-stone-950 dark:text-stone-50 mt-0.5 block tabular-nums">
                    {stats.average_score != null ? `${Math.round(stats.average_score)}%` : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    {stats.total_quizzes} tests taken
                  </span>
                </div>

                <div className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[1.5px_1.5px_0px_#18181b] dark:shadow-[1.5px_1.5px_0px_#3f3f46]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                    CURRICULUM
                  </span>
                  <span className="text-lg font-bold text-stone-950 dark:text-stone-50 mt-0.5 block tabular-nums">
                    {stats.roadmap_progress_percent}%
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    {stats.active_roadmaps} active track(s)
                  </span>
                </div>

                <div className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[1.5px_1.5px_0px_#18181b] dark:shadow-[1.5px_1.5px_0px_#3f3f46]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                    ARCHIVE
                  </span>
                  <span className="text-lg font-bold text-stone-950 dark:text-stone-50 mt-0.5 block tabular-nums">
                    {stats.total_documents}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    materials indexed
                  </span>
                </div>
              </div>
            )}

            {/* Study Activity Log */}
            <Card variant="default">
              <CardHeader className="flex flex-row items-center justify-between pb-3 bg-stone-50/60 dark:bg-stone-800/40">
                <div>
                  <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono">
                    // STUDY LOG
                  </CardTitle>
                  <CardDescription>Recent study records</CardDescription>
                </div>
                <Link
                  to="/progress"
                  className="text-xs font-mono font-semibold text-stone-900 dark:text-stone-100 hover:underline"
                >
                  [PROGRESS →]
                </Link>
              </CardHeader>

              <CardContent className="p-0">
                {!stats?.recent_activity || stats.recent_activity.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-stone-500">
                    No study activity recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 dark:divide-stone-800 font-mono text-xs">
                    {stats.recent_activity.slice(0, 4).map((activity) => (
                      <div
                        key={activity.date}
                        className="p-3 sm:px-4 flex items-center justify-between hover:bg-stone-100/50 dark:hover:bg-stone-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-900 dark:bg-stone-100" />
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {new Date(activity.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-stone-600 dark:text-stone-400">
                          <span>{activity.documents_studied} DOCS</span>
                          <span>·</span>
                          <span>{activity.quizzes_taken} QUIZZES</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
