import { useEffect, useState, type ReactNode } from 'react';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import { Map as MapIcon, Plus, BookOpen, Clock, CheckCircle2, ChevronRight, PlayCircle, Loader2, FileText, ArrowRight, Lock, Trophy } from 'lucide-react';

interface Doc { id: string; title: string }
interface RoadmapNode {
  id: string; node_id: string; parent_node_id: string | null;
  title: string; description: string; type: string; difficulty: string;
  estimated_minutes: number; status: string;
  prerequisites: string[]; resources: { title: string; url: string | null; type: string }[];
}
interface RoadmapData {
  id: string; title: string; description: string; topic_name: string | null;
  total_nodes: number; completed_nodes: number; estimated_total_hours: number;
  nodes: RoadmapNode[];
}
interface RoadmapListItem {
  id: string; title: string; topic_name: string | null;
  total_nodes: number; completed_nodes: number;
  estimated_total_hours: number; created_at: string;
}

const typeColors: Record<string, string> = {
  prerequisite: 'bg-purple-100 text-purple-700 border-purple-200',
  basic: 'bg-blue-100 text-blue-700 border-blue-200',
  intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  advanced: 'bg-orange-100 text-orange-700 border-orange-200',
  application: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  assessment: 'bg-red-100 text-red-700 border-red-200',
};

const statusColors: Record<string, string> = {
  not_started: 'text-slate-300 hover:text-slate-400',
  in_progress: 'text-blue-500 hover:text-blue-600',
  completed: 'text-emerald-500 hover:text-emerald-600',
};

const nextStatus: Record<string, string> = {
  not_started: 'in_progress',
  in_progress: 'completed',
  completed: 'not_started',
};

export default function RoadmapPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [list, setList] = useState<RoadmapListItem[]>([]);
  const [view, setView] = useState<'create' | 'list' | 'detail'>('create');
  const [floatingXP, setFloatingXP] = useState<{ id: string, xp: number } | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ level: number } | null>(null);

  useEffect(() => {
    api.get('/documents').then(({ data }) => setDocs(data.documents));
    loadList();
  }, []);

  const loadList = () => {
    api.get('/roadmap/lists').then(({ data }) => setList(data.roadmaps));
  };

  const handleGenerate = async () => {
    if (!docId && !topicName.trim()) return;
    setLoading(true);
    setRoadmap(null);
    try {
      const { data } = await api.post('/roadmap/generate', {
        document_id: docId || undefined,
        topic_name: topicName.trim() || undefined,
      });
      const { data: detail } = await api.get(`/roadmap/${data.id}`);
      setRoadmap(detail);
      setView('detail');
      loadList();
    } catch {
      alert('Failed to generate roadmap');
    }
    setLoading(false);
  };

  const handleStatusToggle = async (nodeId: string, currentStatus: string) => {
    if (!roadmap) return;
    const newStatus = nextStatus[currentStatus];
    try {
      const { data } = await api.patch(`/roadmap/${roadmap.id}/nodes/${nodeId}`, { status: newStatus });
      setRoadmap((prev) => {
        if (!prev) return prev;
        const nodes = prev.nodes.map((n) => n.node_id === nodeId ? { ...n, status: newStatus } : n);
        return { ...prev, nodes, completed_nodes: data.completed_nodes };
      });
      
      if (newStatus === 'completed' && data.xp_awarded) {
        setFloatingXP({ id: nodeId, xp: data.xp_awarded });
        setTimeout(() => setFloatingXP(null), 1500);
      }

      // Update global user state with new XP and level
      if (data.xp_awarded) {
        const user = useAuthStore.getState().user;
        if (user) {
          useAuthStore.getState().setUser({
            ...user,
            xp: data.user_xp,
            level: data.user_level
          });
        }
        
        if (data.leveled_up) {
          setLevelUpData({ level: data.user_level });
          setTimeout(() => setLevelUpData(null), 3000);
        }
      }
    } catch {
      alert('Failed to update status');
    }
  };

  const openRoadmap = async (id: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/roadmap/${id}`);
      setRoadmap(data);
      setView('detail');
    } catch {
      alert('Failed to load roadmap');
    }
    setLoading(false);
  };

  const buildTree = (nodes: RoadmapNode[]) => {
    const nodeMap = new Map<string, RoadmapNode[]>();
    const completedNodeIds = new Set(nodes.filter(n => n.status === 'completed').map(n => n.node_id));
    
    for (const n of nodes) {
      const key = n.parent_node_id || '__root__';
      if (!nodeMap.has(key)) nodeMap.set(key, []);
      nodeMap.get(key)!.push(n);
    }
    
    const rootNodes = nodeMap.get('__root__') || [];
    const render = (node: RoadmapNode, depth: number): ReactNode => {
      const children = nodeMap.get(node.node_id) || [];
      const isLocked = node.prerequisites && node.prerequisites.length > 0 && node.prerequisites.some(pre => !completedNodeIds.has(pre));
      
      return (
        <div key={node.node_id} style={{ marginLeft: depth * 28 }} className={`relative mt-4 ${isLocked ? 'opacity-60' : ''}`}>
          {depth > 0 && (
            <div className="absolute -left-6 top-6 w-6 h-px bg-slate-200 dark:bg-slate-700"></div>
          )}
          {depth > 0 && (
            <div className="absolute -left-6 -top-4 w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
          )}
          <div className={`bg-white dark:bg-slate-900 border ${isLocked ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50' : 'border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900'} shadow-sm rounded-2xl p-5 transition-all flex items-start gap-4`}>
            <button
              onClick={() => { if (!isLocked) handleStatusToggle(node.node_id, node.status); }}
              disabled={isLocked}
              className={`mt-1 flex-shrink-0 transition-transform relative ${isLocked ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 active:scale-95 cursor-pointer'} ${statusColors[node.status]}`}
              title={isLocked ? 'Locked (Complete prerequisites first)' : `Click to change: ${nextStatus[node.status]}`}
            >
              {floatingXP?.id === node.node_id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full animate-float-up pointer-events-none z-50 whitespace-nowrap">
                  <span className="text-xl font-black text-amber-500 drop-shadow-md">
                    +{floatingXP.xp} XP
                  </span>
                </div>
              )}
              {isLocked ? <div className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center"><Lock size={14} className="text-slate-400 dark:text-slate-500" /></div> :
               node.status === 'completed' ? <CheckCircle2 size={28} /> : 
               node.status === 'in_progress' ? <PlayCircle size={28} /> : 
               <div className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">{node.title}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${typeColors[node.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                  {node.type}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {node.status.replace('_', ' ')}
                </span>
              </div>
              {node.description && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{node.description}</p>}
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  <Clock size={14} /> {node.estimated_minutes} mins
                </div>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  <BookOpen size={14} /> {node.difficulty}
                </div>
              </div>

              {node.resources && node.resources.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {node.resources.map((r, i) => (
                    <a key={i} href={r.url || '#'} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/50">
                      {r.type.toUpperCase()}: {r.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="relative z-10">
            {children.map((child: RoadmapNode) => render(child, depth + 1))}
          </div>
        </div>
      );
    };
    return rootNodes.map((n: RoadmapNode) => render(n, 0));
  };

  if (view === 'detail' && roadmap) {
    const pct = roadmap.total_nodes > 0 ? Math.round((roadmap.completed_nodes / roadmap.total_nodes) * 100) : 0;
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
        
        {levelUpData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Dark overlay flash */}
            <div className="absolute inset-0 bg-black/40 animate-pulse duration-300" />
            
            {/* Central Badge */}
            <div className="relative animate-level-up flex flex-col items-center">
              {/* Spinning light beams behind */}
              <div className="absolute -inset-20 bg-gradient-to-r from-amber-400/0 via-amber-400/40 to-amber-400/0 animate-spin-slow rounded-full blur-3xl -z-10" />
              
              <div className="bg-gradient-to-b from-amber-300 to-orange-500 text-white p-2 rounded-[2rem] shadow-2xl border-4 border-yellow-200 flex flex-col items-center gap-4 transform transition-all hover:scale-105">
                <div className="bg-slate-900 rounded-[1.5rem] p-8 px-12 flex flex-col items-center border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5" />
                  
                  <Trophy size={64} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] mb-4 animate-bounce" />
                  
                  <h3 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-500 drop-shadow-md mb-2">
                    Level Up!
                  </h3>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">Level</span>
                    <span className="text-5xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]">
                      {levelUpData.level}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Roadmap Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <MapIcon size={200} className="-mt-10 -mr-10" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="max-w-2xl">
              <button onClick={() => { setView('list'); loadList(); }} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white mb-4 flex items-center gap-1 transition-colors cursor-pointer">
                ← Back to all roadmaps
              </button>
              <h2 className="text-3xl font-bold mb-2">{roadmap.title}</h2>
              {roadmap.description && <p className="text-slate-300 text-sm leading-relaxed">{roadmap.description}</p>}
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 min-w-[200px]">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-sm">{pct}%</span>
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-1.5">Quest Completion</span>
              </div>
              <div className="w-full bg-slate-900/80 rounded-full h-3 mb-3 p-0.5 border border-slate-700/50 shadow-inner overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-1000 ease-out relative" 
                  style={{ width: `${pct}%` }} 
                >
                  <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 skew-x-12" />
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1">🏆 {roadmap.completed_nodes}/{roadmap.total_nodes} nodes</span>
                <span className="flex items-center gap-1">⏱️ ~{roadmap.estimated_total_hours}h total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Tree */}
        <div className="pl-4">
          {buildTree(roadmap.nodes)}
        </div>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Roadmaps</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track your personalized learning journeys.</p>
          </div>
          <button onClick={() => setView('create')} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 hover:shadow-md transition-all cursor-pointer flex items-center gap-2">
            <Plus size={18} /> New Roadmap
          </button>
        </div>
        
        {list.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapIcon size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No roadmaps yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Generate your first learning roadmap from a document or topic to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {list.map((r) => {
              const pct = r.total_nodes > 0 ? (r.completed_nodes / r.total_nodes) * 100 : 0;
              return (
                <div key={r.id} className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer flex flex-col" onClick={() => openRoadmap(r.id)}>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors mb-1">{r.title}</h3>
                    {r.topic_name && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800 inline-block px-2.5 py-1 rounded-lg">Topic: {r.topic_name}</p>}
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-between text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      <span className="text-blue-600 dark:text-blue-400">Progress: {Math.round(pct)}%</span>
                      <span>{r.estimated_total_hours}h</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-800 rounded-full h-3 p-0.5 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 h-full rounded-full transition-all duration-700 relative overflow-hidden"
                        style={{ width: `${pct}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 -translate-x-full group-hover:animate-shimmer" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pt-8">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner transform rotate-3">
            <MapIcon size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Roadmap Generator</h2>
          <p className="text-slate-500 dark:text-slate-400">Create structured learning paths from documents or topics.</p>
        </div>
        {list.length > 0 && (
          <button onClick={() => setView('list')} className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1">
            My Roadmaps <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
        
        {/* Document Option */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <FileText size={16} className="text-blue-500 dark:text-blue-400" /> Option 1: From Document
          </label>
          <select 
            value={docId} 
            onChange={(e) => { setDocId(e.target.value); setTopicName(''); }} 
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          >
            <option value="">Select an uploaded document...</option>
            {docs.map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
          </select>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">OR</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
        </div>

        {/* Topic Option */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <BookOpen size={16} className="text-purple-500 dark:text-purple-400" /> Option 2: From Topic
          </label>
          <input
            type="text"
            value={topicName}
            onChange={(e) => { setTopicName(e.target.value); setDocId(''); }}
            placeholder="e.g. Quantum Computing, React.js, Macroeconomics..."
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Action */}
        <div className="pt-4">
          <button
            onClick={handleGenerate}
            disabled={loading || (!docId && !topicName.trim())}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 size={20} className="animate-spin" /> Generating Roadmap...</span>
            ) : (
              <span className="flex items-center gap-2">Generate Roadmap <ArrowRight size={20} /></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
