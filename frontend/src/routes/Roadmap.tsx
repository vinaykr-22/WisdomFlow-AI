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

  // 1. DETAIL VIEW: The Active Curriculum Learning Plan
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
        title="Learning Roadmap"
        description="Structured curriculum path guiding you through sequential mastery."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setView('list');
                loadList();
              }}
              leftIcon={<ChevronLeft size={14} />}
            >
              All Roadmaps ({list.length})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setView('create')}
              leftIcon={<Plus size={14} />}
            >
              New Curriculum
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          
          {/* Executive Overview & Progress Card */}
          <Card className="border-[var(--color-border)]">
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="primary" size="sm">
                      {roadmap.topic_name ? `Topic: ${roadmap.topic_name}` : 'Document Curriculum'}
                    </Badge>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {total} sequential stages
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
                    {roadmap.title}
                  </h1>
                  {roadmap.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {roadmap.description}
                    </p>
                  )}
                </div>

                {/* Quantitative Progress Summary */}
                <div className="p-4 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] min-w-[220px] flex-shrink-0 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
                      {pct}%
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Curriculum
                    </span>
                  </div>
                  <Progress value={pct} size="sm" />
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-0.5">
                    <span>{completed} of {total} completed</span>
                    <span>~{remainingHours}h remaining</span>
                  </div>
                </div>
              </div>

              {/* Stage Filter Strip */}
              <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                  <span className="font-semibold text-[var(--color-text-muted)] mr-1 hidden sm:inline flex-shrink-0">
                    Display:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterStageState('all')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex-shrink-0 ${
                      filterStageState === 'all'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    All Stages ({total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStageState('focus')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex-shrink-0 ${
                      filterStageState === 'focus'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    Current Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStageState('completed')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex-shrink-0 ${
                      filterStageState === 'completed'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    Completed ({completed})
                  </button>
                </div>

                {currentNode && (
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <span>Current stage:</span>
                    <span className="font-semibold text-[var(--color-text)] truncate max-w-[200px]">
                      {currentNode.title}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clean Vertical Progression Spine */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--color-border)]">
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
                  {/* Progression Node Indicator Dot */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all select-none z-10 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-[var(--color-surface)] border-[var(--color-primary)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/25 font-bold shadow-xs'
                        : isLocked
                        ? 'bg-[var(--color-surface)] border-slate-300 dark:border-slate-700 text-slate-400'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={14} strokeWidth={3} />
                    ) : isLocked ? (
                      <Lock size={12} />
                    ) : (
                      <span className="text-xs font-semibold">{index + 1}</span>
                    )}
                  </div>

                  {/* Stage Card Container */}
                  <div
                    className={`rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-xs ring-1 ring-[var(--color-primary)]/20 p-5 sm:p-6'
                        : isCompleted
                        ? 'border-[var(--color-border)] bg-[var(--color-surface)]/60 opacity-80 hover:opacity-100 p-4 sm:p-5'
                        : isLocked
                        ? 'border-[var(--color-border)] bg-[var(--color-surface-hover)]/40 p-4 sm:p-5 opacity-70'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-slate-300 dark:hover:border-slate-700 p-4 sm:p-5'
                    }`}
                  >
                    {/* Header Row: Step, Type Badge, Difficulty, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Stage {index + 1}
                        </span>

                        {isCurrent && (
                          <Badge variant="primary" size="sm">
                            Current Focus
                          </Badge>
                        )}

                        {isCompleted && (
                          <Badge variant="success" size="sm">
                            Completed
                          </Badge>
                        )}

                        {isLocked && (
                          <Badge variant="neutral" size="sm">
                            Locked
                          </Badge>
                        )}

                        <span className="text-xs font-medium text-[var(--color-text-muted)]">
                          {typeLabels[node.type] || node.type}
                        </span>
                      </div>

                      {/* Estimated Duration & Difficulty */}
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {node.estimated_minutes} min
                        </span>
                        <span className="capitalize font-medium">
                          {node.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Stage Title & Description */}
                    <h3
                      className={`font-bold mb-1.5 tracking-tight ${
                        isCurrent
                          ? 'text-lg text-[var(--color-text)]'
                          : isCompleted
                          ? 'text-base text-[var(--color-text-secondary)]'
                          : 'text-base text-[var(--color-text)]'
                      }`}
                    >
                      {node.title}
                    </h3>

                    {node.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
                        {node.description}
                      </p>
                    )}

                    {/* Locked Reason Notice */}
                    {isLocked && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2 mb-3">
                        <Lock size={13} className="flex-shrink-0" />
                        <span>Complete earlier prerequisite stages to unlock this module.</span>
                      </div>
                    )}

                    {/* Learning Resources */}
                    {node.resources && node.resources.length > 0 && (
                      <div className="pt-2 pb-1">
                        <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                          Recommended Resources
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {node.resources.map((r, rIdx) => (
                            <a
                              key={rIdx}
                              href={r.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition-colors"
                            >
                              <BookOpen size={11} />
                              <span className="truncate max-w-[200px]">{r.title}</span>
                              <ExternalLink size={10} className="opacity-60" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-4 mt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Study Shortcuts */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/chat?q=${encodeURIComponent(`Explain this roadmap stage: ${node.title}. ${node.description}`)}`)}
                          leftIcon={<MessageSquare size={13} />}
                        >
                          Ask Tutor
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/quizzes')}
                          leftIcon={<HelpCircle size={13} />}
                        >
                          Practice Quiz
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
                            leftIcon={<RotateCcw size={13} />}
                          >
                            Mark Incomplete
                          </Button>
                        ) : isCurrent ? (
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={isUpdating}
                            onClick={() => updateNodeStatus(node.node_id, 'completed')}
                            leftIcon={<CheckCircle2 size={14} />}
                          >
                            Mark Complete
                          </Button>
                        ) : !isLocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={isUpdating}
                            onClick={() => updateNodeStatus(node.node_id, 'in_progress')}
                            leftIcon={<PlayCircle size={14} />}
                          >
                            Start Stage
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
        title="My Roadmaps"
        description="Personalized curricula and skill tracks generated for your study goals."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setView('create')}
            leftIcon={<Plus size={14} />}
          >
            New Roadmap
          </Button>
        }
      >
        <div className="space-y-6">
          {list.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">
                  <MapIcon size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--color-text)]">No roadmaps generated yet</h3>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                    Generate your first structured learning plan from your course documents or any subject topic.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setView('create')}>
                  Create Learning Path
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
                          {r.topic_name ? r.topic_name : 'Document'}
                        </Badge>
                        <span className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
                          <Clock size={12} /> ~{r.estimated_total_hours}h total
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold line-clamp-1">{r.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                          <span>{completed} of {total} stages completed</span>
                          <span className="font-semibold text-[var(--color-text)]">{pct}%</span>
                        </div>
                        <Progress value={pct} size="sm" />
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
                        <span>Continue Curriculum</span>
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
      title="Roadmap Generator"
      description="Construct an ordered, competency-based curriculum from your course readings or custom subject."
      actions={
        list.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setView('list')}
            leftIcon={<ChevronLeft size={14} />}
          >
            My Roadmaps ({list.length})
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Define Curriculum Source</CardTitle>
            <CardDescription>
              Choose an uploaded lecture document or specify any target concept or subject.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Option 1: Document */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                <FileText size={13} className="text-[var(--color-primary)]" /> Source Document
              </label>
              <select
                value={docId}
                onChange={(e) => {
                  setDocId(e.target.value);
                  setTopicName('');
                }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Select an uploaded document...</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[var(--color-border)]" />
              <span className="flex-shrink-0 mx-3 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">
                or
              </span>
              <div className="flex-grow border-t border-[var(--color-border)]" />
            </div>

            {/* Option 2: Custom Subject Topic */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                <BookOpen size={13} className="text-purple-500" /> Subject Topic
              </label>
              <input
                type="text"
                value={topicName}
                onChange={(e) => {
                  setTopicName(e.target.value);
                  setDocId('');
                }}
                placeholder="e.g., Computer Systems, Macroeconomics, React Architecture..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Generate Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={generating || (!docId && !topicName.trim())}
                isLoading={generating}
                className="w-full h-11 text-sm font-semibold"
                leftIcon={!generating ? <MapIcon size={16} /> : undefined}
              >
                {generating ? 'Structuring Learning Plan...' : 'Generate Roadmap'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
