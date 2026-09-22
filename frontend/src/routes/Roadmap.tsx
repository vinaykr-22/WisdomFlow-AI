import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import {
  Map as MapIcon,
  Plus,
  BookOpen,
  Clock,
  CheckCircle2,
  PlayCircle,
  FileText,
  ArrowRight,
  Lock,
  RotateCcw,
  Check,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react';
import { PageContainer } from '../components/layout';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useToast } from '../components/ui/useToast';

interface Doc {
  id: string;
  title: string;
}

interface RoadmapNode {
  id: string;
  node_id: string;
  parent_node_id: string | null;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  estimated_minutes: number;
  status: 'not_started' | 'in_progress' | 'completed';
  prerequisites: string[];
  resources: { title: string; url: string | null; type: string }[];
}

interface RoadmapData {
  id: string;
  title: string;
  description: string;
  topic_name: string | null;
  total_nodes: number;
  completed_nodes: number;
  estimated_total_hours: number;
  nodes: RoadmapNode[];
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

const typeLabels: Record<string, string> = {
  prerequisite: 'Prerequisite',
  basic: 'Core Concept',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  application: 'Application',
  assessment: 'Assessment',
};

export default function RoadmapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [list, setList] = useState<RoadmapListItem[]>([]);
  const [view, setView] = useState<'create' | 'list' | 'detail'>('list');
  const [updatingNodeId, setUpdatingNodeId] = useState<string | null>(null);
  const [filterStageState, setFilterStageState] = useState<'all' | 'focus' | 'completed'>('all');

  // Load available documents & roadmaps
  const loadInitialData = useCallback(async () => {
    try {
      const [docsRes, listsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/roadmap/lists'),
      ]);

      setDocs(docsRes.data.documents || []);
      const roadmaps: RoadmapListItem[] = listsRes.data.roadmaps || [];
      setList(roadmaps);

      // Check if URL specified a roadmap id to open
      const queryId = searchParams.get('id');
      if (queryId) {
        const { data } = await api.get(`/roadmap/${queryId}`);
        setRoadmap(data);
        setView('detail');
      } else if (roadmaps.length > 0) {
        // Automatically open the most recent roadmap in detail view
        const latestId = roadmaps[0].id;
        const { data } = await api.get(`/roadmap/${latestId}`);
        setRoadmap(data);
        setView('detail');
      } else {
        setView('create');
      }

      // Check if URL prefilled a docId
      const queryDocId = searchParams.get('docId') || searchParams.get('doc');
      if (queryDocId) {
        setDocId(queryDocId);
        setView('create');
      }
    } catch {
      toast.error('Failed to load roadmap data');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadList = async () => {
    try {
      const { data } = await api.get('/roadmap/lists');
      setList(data.roadmaps || []);
    } catch {
      // silent refresh error
    }
  };

  const openRoadmap = async (id: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/roadmap/${id}`);
      setRoadmap(data);
      setView('detail');
    } catch {
      toast.error('Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!docId && !topicName.trim()) {
      toast.warning('Input required', 'Select a document or enter a topic name.');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await api.post('/roadmap/generate', {
        document_id: docId || undefined,
        topic_name: topicName.trim() || undefined,
      });

      const { data: detail } = await api.get(`/roadmap/${data.id}`);
      setRoadmap(detail);
      setView('detail');
      loadList();
      toast.success('Curriculum Ready', `Generated "${detail.title}"`);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to generate roadmap';
      toast.error('Generation Failed', errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  // Node status updater
  const updateNodeStatus = async (nodeId: string, targetStatus: 'not_started' | 'in_progress' | 'completed') => {
    if (!roadmap) return;
    setUpdatingNodeId(nodeId);

    try {
      const { data } = await api.patch(`/roadmap/${roadmap.id}/nodes/${nodeId}`, { status: targetStatus });

      setRoadmap((prev) => {
        if (!prev) return prev;
        const updatedNodes = prev.nodes.map((n) =>
          n.node_id === nodeId ? { ...n, status: targetStatus } : n
        );
        return { ...prev, nodes: updatedNodes, completed_nodes: data.completed_nodes };
      });

      // Update XP / Level in global store
      if (data.xp_awarded) {
        const user = useAuthStore.getState().user;
        if (user) {
          useAuthStore.getState().setUser({
            ...user,
            xp: data.user_xp,
            level: data.user_level,
          });
        }
        toast.success(`Stage Complete! +${data.xp_awarded} XP`, 'Progress saved to your learning record');
      } else {
        toast.info('Status Updated', `Stage set to ${targetStatus.replace('_', ' ')}`);
      }

      if (data.leveled_up) {
        toast.success('Level Up!', `Congratulations! You advanced to Level ${data.user_level}.`);
      }
    } catch {
      toast.error('Update Failed', 'Could not update stage status');
    } finally {
      setUpdatingNodeId(null);
    }
  };

  // Set of completed node ids for prerequisite validation
  const completedNodeIds = useMemo(() => {
    if (!roadmap) return new Set<string>();
    return new Set(roadmap.nodes.filter((n) => n.status === 'completed').map((n) => n.node_id));
  }, [roadmap]);

  // Identify Current Stage
  const currentNode = useMemo(() => {
    if (!roadmap) return null;
    // First node that is explicitly in_progress
    const inProgress = roadmap.nodes.find((n) => n.status === 'in_progress');
    if (inProgress) return inProgress;
    // Otherwise, first uncompleted node whose prerequisites are met
    const firstAvailable = roadmap.nodes.find((n) => {
      if (n.status === 'completed') return false;
      const isLocked = n.prerequisites?.some((p) => !completedNodeIds.has(p));
      return !isLocked;
    });
    return firstAvailable || null;
  }, [roadmap, completedNodeIds]);

  // Filtered nodes based on tab filter
  const displayedNodes = useMemo(() => {
    if (!roadmap) return [];
    if (filterStageState === 'focus') {
      return roadmap.nodes.filter((n) => n.node_id === currentNode?.node_id || n.status === 'in_progress');
    }
    if (filterStageState === 'completed') {
      return roadmap.nodes.filter((n) => n.status === 'completed');
    }
    return roadmap.nodes;
  }, [roadmap, filterStageState, currentNode]);

  if (loading) {
    return (
      <PageContainer title="Learning Roadmap" description="Loading curriculum details...">
        <Card>
          <CardContent className="py-16 text-center text-xs text-[var(--color-text-muted)]">
            Loading roadmap curriculum...
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // 1. DETAIL VIEW: The Active Curriculum Learning Blueprint
  if (view === 'detail' && roadmap) {
    const total = roadmap.total_nodes || 1;
    const completed = roadmap.completed_nodes || 0;
    const pct = Math.round((completed / total) * 100);

    // Calculate remaining estimated hours
    const remainingMinutes = roadmap.nodes
      .filter((n) => n.status !== 'completed')
      .reduce((sum, n) => sum + (n.estimated_minutes || 30), 0);
    const remainingHours = Math.max(0.5, Math.round((remainingMinutes / 60) * 10) / 10);

    return (
      <PageContainer
        title="Curriculum Blueprint"
        description="Sequential competency blueprint for structured mastery."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setView('list');
                loadList();
              }}
              leftIcon={<ChevronLeft size={13} />}
            >
              ARCHIVED BLUEPRINTS ({list.length})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setView('create')}
              leftIcon={<Plus size={13} />}
            >
              NEW BLUEPRINT
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          
          {/* Blueprint Header & Progress Matrix */}
          <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-[var(--color-surface)] shadow-[2px_2px_0px_#18181b] p-5 sm:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                    {roadmap.topic_name ? `SUBJECT // ${roadmap.topic_name}` : 'READING CURRICULUM'}
                  </span>
                  <span className="font-mono text-[10px] text-stone-500 uppercase">
                    [{total} SEQUENTIAL STAGES]
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-serif">
                  {roadmap.title}
                </h1>
                {roadmap.description && (
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-sans">
                    {roadmap.description}
                  </p>
                )}
              </div>

              {/* Quantitative Metrics Matrix */}
              <div className="p-4 rounded-[2px] bg-stone-100 dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700 min-w-[220px] flex-shrink-0 space-y-2 shadow-[2px_2px_0px_#18181b]">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {pct}%
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    BLUEPRINT METRIC
                  </span>
                </div>
                <Progress value={pct} size="sm" />
                <div className="flex items-center justify-between font-mono text-[10px] text-stone-600 dark:text-stone-400 pt-0.5">
                  <span>{completed} / {total} COMPLETED</span>
                  <span>~{remainingHours}H REMAINING</span>
                </div>
              </div>
            </div>

            {/* Stage Filter Tab Bar */}
            <div className="pt-4 border-t-[1.5px] border-stone-900 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                <span className="font-mono text-[10px] font-bold text-stone-500 uppercase mr-1 hidden sm:inline flex-shrink-0">
                  FILTER:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterStageState('all')}
                  className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex-shrink-0 border ${
                    filterStageState === 'all'
                      ? 'border-stone-900 dark:border-stone-700 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-[1px_1px_0px_#18181b]'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800'
                  }`}
                >
                  ALL STAGES ({total})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStageState('focus')}
                  className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex-shrink-0 border ${
                    filterStageState === 'focus'
                      ? 'border-stone-900 dark:border-stone-700 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-[1px_1px_0px_#18181b]'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800'
                  }`}
                >
                  ACTIVE FOCUS
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStageState('completed')}
                  className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex-shrink-0 border ${
                    filterStageState === 'completed'
                      ? 'border-stone-900 dark:border-stone-700 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-[1px_1px_0px_#18181b]'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800'
                  }`}
                >
                  COMPLETED ({completed})
                </button>
              </div>

              {currentNode && (
                <div className="flex items-center gap-2 font-mono text-[10px] text-stone-500">
                  <span>CURRENT OBJECTIVE:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-[200px]">
                    {currentNode.title}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Technical Blueprint Progression Spine */}
          <div className="relative pl-8 sm:pl-10 space-y-6 before:absolute before:left-3.5 sm:before:left-4 before:top-4 before:bottom-4 before:w-[2px] before:border-l-[2px] before:border-dashed before:border-stone-900 dark:before:border-stone-700">
            {displayedNodes.map((node, index) => {
              const isCompleted = node.status === 'completed';
              const isCurrent = node.node_id === currentNode?.node_id;
              const isLocked =
                !isCompleted &&
                node.prerequisites &&
                node.prerequisites.length > 0 &&
                node.prerequisites.some((pre) => !completedNodeIds.has(pre));

              const isUpdating = updatingNodeId === node.node_id;

              return (
                <div key={node.node_id} className="relative group">
                  {/* Square Progression Node Indicator */}
                  <div
                    className={`absolute -left-8 sm:-left-10 top-5 w-7 h-7 sm:w-8 sm:h-8 rounded-[2px] flex items-center justify-center border-[1.5px] border-stone-900 dark:border-stone-700 transition-all select-none z-10 font-mono text-xs font-bold ${
                      isCompleted
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-[1px_1px_0px_#18181b]'
                        : isCurrent
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 ring-2 ring-stone-900 dark:ring-stone-100 shadow-[2px_2px_0px_#18181b]'
                        : isLocked
                        ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 border-dashed'
                        : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={14} strokeWidth={3} />
                    ) : isLocked ? (
                      <Lock size={12} />
                    ) : (
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    )}
                  </div>

                  {/* Stage Blueprint Card */}
                  <div
                    className={`rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 transition-all ${
                      isCurrent
                        ? 'bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] p-5 sm:p-6'
                        : isCompleted
                        ? 'bg-stone-50 dark:bg-stone-900/70 p-4 sm:p-5 opacity-90'
                        : isLocked
                        ? 'bg-stone-100/60 dark:bg-stone-900/40 p-4 sm:p-5 opacity-70 border-dashed'
                        : 'bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b] p-4 sm:p-5'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-200 dark:border-stone-800">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                        <span className="font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                          STAGE {String(index + 1).padStart(2, '0')}
                        </span>

                        {isCurrent && (
                          <Badge variant="primary" size="sm">
                            ACTIVE OBJECTIVE
                          </Badge>
                        )}

                        {isCompleted && (
                          <Badge variant="success" size="sm">
                            COMPLETED
                          </Badge>
                        )}

                        {isLocked && (
                          <Badge variant="neutral" size="sm">
                            LOCKED
                          </Badge>
                        )}

                        <span className="text-stone-500 uppercase">
                          // {typeLabels[node.type] || node.type}
                        </span>
                      </div>

                      {/* Estimated Duration & Difficulty */}
                      <div className="flex items-center gap-3 font-mono text-[10px] text-stone-500 uppercase">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {node.estimated_minutes} MIN
                        </span>
                        <span>//</span>
                        <span className="font-bold text-stone-700 dark:text-stone-300">
                          {node.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Stage Title & Description */}
                    <h3
                      className={`font-bold mb-1.5 tracking-tight font-serif ${
                        isCurrent
                          ? 'text-lg text-stone-900 dark:text-stone-100'
                          : isCompleted
                          ? 'text-base text-stone-700 dark:text-stone-300'
                          : 'text-base text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      {node.title}
                    </h3>

                    {node.description && (
                      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
                        {node.description}
                      </p>
                    )}

                    {/* Locked Reason Notice */}
                    {isLocked && (
                      <div className="p-2.5 rounded-[2px] bg-stone-100 dark:bg-stone-800 border border-stone-900 dark:border-stone-700 font-mono text-[11px] text-stone-700 dark:text-stone-300 flex items-center gap-2 mb-3">
                        <Lock size={12} className="flex-shrink-0" />
                        <span>PREREQUISITE UNMET: Satisfy preceding stages to unlock module.</span>
                      </div>
                    )}

                    {/* Learning Resources */}
                    {node.resources && node.resources.length > 0 && (
                      <div className="pt-2 pb-1">
                        <div className="font-mono text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                          // CURATED SOURCE REFERENCES:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {node.resources.map((r, rIdx) => (
                            <a
                              key={rIdx}
                              href={r.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[2px] font-mono text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 border border-stone-900 dark:border-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                            >
                              <BookOpen size={10} />
                              <span className="truncate max-w-[200px]">{r.title}</span>
                              <ExternalLink size={9} className="opacity-60" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-3 mt-3 border-t border-dashed border-stone-300 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Study Shortcuts */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/chat?q=${encodeURIComponent(`Explain this roadmap stage: ${node.title}. ${node.description}`)}`)}
                          leftIcon={<MessageSquare size={12} />}
                          className="font-mono text-xs"
                        >
                          EXPLAIN IN TUTOR
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/quizzes')}
                          leftIcon={<HelpCircle size={12} />}
                          className="font-mono text-xs"
                        >
                          EVALUATE RETENTION
                        </Button>
                      </div>

                      {/* State Transition Triggers */}
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={isUpdating}
                            onClick={() => updateNodeStatus(node.node_id, 'in_progress')}
                            leftIcon={<RotateCcw size={12} />}
                          >
                            MARK INCOMPLETE
                          </Button>
                        ) : isCurrent ? (
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={isUpdating}
                            onClick={() => updateNodeStatus(node.node_id, 'completed')}
                            leftIcon={<CheckCircle2 size={13} />}
                          >
                            MARK COMPLETED
                          </Button>
                        ) : !isLocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={isUpdating}
                            onClick={() => updateNodeStatus(node.node_id, 'in_progress')}
                            leftIcon={<PlayCircle size={13} />}
                          >
                            COMMENCE STAGE
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. LIST VIEW: My Learning Roadmaps
  if (view === 'list') {
    return (
      <PageContainer
        title="Curriculum Catalog"
        description="Structured educational roadmaps and sequential study plans."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setView('create')}
            leftIcon={<Plus size={13} />}
          >
            NEW BLUEPRINT
          </Button>
        }
      >
        <div className="space-y-6">
          {list.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#18181b]">
                  <MapIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">No curricula compiled yet</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
                    Compile your first ordered learning roadmap from primary readings or a designated topic.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setView('create')}>
                  COMPILE CURRICULUM
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((r) => {
                const total = r.total_nodes || 1;
                const completed = r.completed_nodes || 0;
                const pct = Math.round((completed / total) * 100);

                return (
                  <Card
                    key={r.id}
                    variant="interactive"
                    onClick={() => openRoadmap(r.id)}
                    className="flex flex-col justify-between"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="primary" size="sm">
                          {r.topic_name ? r.topic_name : 'READING'}
                        </Badge>
                        <span className="font-mono text-[10px] text-stone-500 flex items-center gap-1 uppercase">
                          <Clock size={10} /> ~{r.estimated_total_hours}H TOTAL
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold font-serif line-clamp-1">{r.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px] text-stone-500 uppercase">
                          <span>{completed} / {total} STAGES COMPLETED</span>
                          <span className="font-bold text-stone-900 dark:text-stone-100">{pct}%</span>
                        </div>
                        <Progress value={pct} size="sm" />
                      </div>

                      <div className="pt-2 flex items-center justify-between font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                        <span>OPEN BLUEPRINT</span>
                        <ArrowRight size={13} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  // 3. CREATE VIEW: Generate Curriculum
  return (
    <PageContainer
      title="Curriculum Architect"
      description="Design a sequential, competency-based learning path from readings or target topics."
      actions={
        list.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setView('list')}
            leftIcon={<ChevronLeft size={13} />}
          >
            CATALOG ({list.length})
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Define Blueprint Scope</CardTitle>
            <CardDescription>
              Select an archived reading or specify a target discipline or subject area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Option 1: Document */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <FileText size={12} /> [ SOURCE READING ]
              </label>
              <select
                value={docId}
                onChange={(e) => {
                  setDocId(e.target.value);
                  setTopicName('');
                }}
                className="w-full px-3 py-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none shadow-[2px_2px_0px_#18181b]"
              >
                <option value="">SELECT ARCHIVED DOCUMENT...</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-dashed border-stone-400 dark:border-stone-600" />
              <span className="flex-shrink-0 mx-3 font-mono text-[10px] font-bold text-stone-500 uppercase">
                OR
              </span>
              <div className="flex-grow border-t border-dashed border-stone-400 dark:border-stone-600" />
            </div>

            {/* Option 2: Custom Subject Topic */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <BookOpen size={12} /> [ TARGET DISCIPLINE // SUBJECT ]
              </label>
              <input
                type="text"
                value={topicName}
                onChange={(e) => {
                  setTopicName(e.target.value);
                  setDocId('');
                }}
                placeholder="e.g., Distributed Systems, Macroeconomics, Quantum Mechanics..."
                className="w-full px-3 py-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono placeholder-stone-400 focus:outline-none shadow-[2px_2px_0px_#18181b]"
              />
            </div>

            {/* Generate Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={generating || (!docId && !topicName.trim())}
                isLoading={generating}
                className="w-full h-10 text-xs font-mono font-bold"
                leftIcon={!generating ? <MapIcon size={14} /> : undefined}
              >
                {generating ? 'COMPILING CURRICULUM BLUEPRINT...' : 'BUILD LEARNING BLUEPRINT'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
