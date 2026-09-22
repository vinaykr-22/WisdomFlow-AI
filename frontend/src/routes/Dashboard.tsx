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

  // Active roadmap track
  const activeRoadmap =
    roadmaps.find((r) => r.completed_nodes < r.total_nodes) || roadmaps[0] || null;

  const activeRoadmapPct = activeRoadmap && activeRoadmap.total_nodes > 0
    ? Math.round((activeRoadmap.completed_nodes / activeRoadmap.total_nodes) * 100)
    : 0;

  const hasContent = docs.length > 0 || roadmaps.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <Skeleton height={28} width={220} />
          <Skeleton height={20} width={120} />
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
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* 1. Context / Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Learning Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
            {user?.full_name ? ` · ${user.full_name}` : ''}
          </p>
        </div>

        {streak && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 px-2 py-0.5 rounded font-semibold">
              <Flame size={14} className="text-amber-500" />
              {streak.current_streak} {streak.current_streak === 1 ? 'day' : 'days'} streak
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>
              {streak.today.documents_studied} docs, {streak.today.quizzes_taken} quizzes today
            </span>
          </div>
        )}
      </div>

      {/* 2. Primary Focus: Continue Learning / Active Task */}
      {activeRoadmap ? (
        <Card variant="elevated" className="border-indigo-100 dark:border-indigo-950/70 bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="primary" dot>
                  In Progress
                </Badge>
                {activeRoadmap.topic_name && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Topic: {activeRoadmap.topic_name}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                {activeRoadmap.completed_nodes} of {activeRoadmap.total_nodes} nodes ({activeRoadmapPct}%)
              </span>
            </div>
            <CardTitle className="text-lg sm:text-xl mt-2 font-bold text-slate-900 dark:text-slate-100">
              {activeRoadmap.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <Progress value={activeRoadmapPct} size="sm" variant="primary" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> ~{activeRoadmap.estimated_total_hours}h estimated curriculum
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {activeRoadmap.completed_nodes} completed
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/roadmap')}
                  rightIcon={<ArrowRight size={14} />}
                >
                  Continue Roadmap
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : docs.length > 0 ? (
        <Card variant="default">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="info">Ready to Structure</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {docs.length} uploaded document(s) available
              </span>
            </div>
            <CardTitle className="text-base sm:text-lg mt-1.5">
              Create a personalized learning roadmap
            </CardTitle>
            <CardDescription>
              Turn your study documents into an organized, step-by-step topic curriculum with prerequisites.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/roadmap')}
                rightIcon={<ArrowRight size={14} />}
              >
                Generate Roadmap
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/quizzes')}
              >
                Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 3. Empty Onboarding State (If 0 docs and 0 roadmaps) */}
      {!hasContent && (
        <Card variant="subtle" className="p-8 sm:p-12 text-center border-dashed">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <UploadCloud size={24} />
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight mb-1.5">
            Start with your first document
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
            Upload your lecture notes, textbook chapters, or articles (PDF, DOCX, or TXT). WisdomFlow will instantly generate summaries, flashcards, quizzes, and learning roadmaps.
          </p>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/documents')}
            leftIcon={<UploadCloud size={16} />}
          >
            Upload Study Material
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mt-10 pt-8 border-t border-slate-200/70 dark:border-slate-800/70 text-left">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Step 1
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Upload Content
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                PDF, DOCX, PPTX, or plain text notes.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Step 2
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Synthesize & Learn
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Read deep summaries or talk with Voice Tutor.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Step 3
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Master & Test
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Reinforce retention with quizzes and flashcards.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Quick Actions Toolbar */}
      {hasContent && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
            Quick Actions
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documents')}
              leftIcon={<UploadCloud size={14} />}
            >
              Upload Document
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/roadmap')}
              leftIcon={<Map size={14} />}
            >
              New Roadmap
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/quizzes')}
              leftIcon={<HelpCircle size={14} />}
            >
              Practice Quiz
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/voice-tutor')}
              leftIcon={<Mic size={14} />}
            >
              Voice Tutor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/flashcards')}
              leftIcon={<Layers size={14} />}
            >
              Flashcards
            </Button>
          </div>
        </div>
      )}

      {/* 5. Core Content: Recent Documents & Learning Activity */}
      {hasContent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Recent Documents Card */}
          <Card variant="default">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Documents</CardTitle>
                <CardDescription>Your study source files</CardDescription>
              </div>
              <Link
                to="/documents"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View all ({docs.length})
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {docs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No documents yet. Upload a document to start studying.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {docs.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex-shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB · {doc.file_type.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link
                          to="/summarize"
                          className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Summarize document"
                        >
                          Summarize
                        </Link>
                        <Link
                          to="/chat"
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Ask questions"
                        >
                          <MessageSquare size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Activity & Retention Progress */}
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Quiz Mastery
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 block tabular-nums">
                    {stats.average_score != null ? `${Math.round(stats.average_score)}%` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    across {stats.total_quizzes} quizzes
                  </span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Curriculum
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 block tabular-nums">
                    {stats.roadmap_progress_percent}%
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {stats.active_roadmaps} active track(s)
                  </span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Knowledge Base
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 block tabular-nums">
                    {stats.total_documents}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    indexed document(s)
                  </span>
                </div>
              </div>
            )}

            {/* Recent Activity Log */}
            <Card variant="default">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Recent Study Activity</CardTitle>
                  <CardDescription>Daily learning logs</CardDescription>
                </div>
                <Link
                  to="/progress"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Full progress →
                </Link>
              </CardHeader>

              <CardContent className="p-0">
                {!stats?.recent_activity || stats.recent_activity.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No recent activity recorded. Take a quiz or study a document to start logging progress.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {stats.recent_activity.slice(0, 4).map((activity) => (
                      <div
                        key={activity.date}
                        className="p-3.5 sm:px-5 flex items-center justify-between text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(activity.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                          <span>{activity.documents_studied} docs studied</span>
                          <span>·</span>
                          <span>{activity.quizzes_taken} quizzes</span>
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
