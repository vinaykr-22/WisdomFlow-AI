import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PlanItem {
  topic: string;
  source_name: string;
  priority: string;
  estimated_minutes: number;
  activities: string[];
  reason: string;
}

interface PlanStructure {
  title: string;
  items: PlanItem[];
  total_estimated_minutes: number;
}

interface Plan {
  id: string;
  title: string;
  plan_type: string;
  structure: PlanStructure;
  created_at: string;
}

export default function Revision() {
  const [view, setView] = useState<'create' | 'plan'>('create');
  const [planType, setPlanType] = useState<'daily' | 'weekly'>('daily');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api
      .get('/revision/plan')
      .then(({ data }) => {
        if (data.plan) {
          setPlan(data.plan);
          setView('plan');
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api.post('/revision/generate', { plan_type: planType });
      const { data: detail } = await api.get('/revision/plan');
      setPlan(detail.plan);
      setView('plan');
    } catch {
      alert('Failed to generate revision plan. Ensure you have processed documents.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === 'high') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
          High Priority
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          Medium Priority
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
        Standard Review
      </span>
    );
  };

  if (initialLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 animate-pulse">
        Loading revision schedule...
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200 pt-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/40">
            <Calendar size={20} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Generate Spaced Revision Plan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            WisdomFlow analyzes your quiz error patterns and study history to schedule prioritized topic reviews.
          </p>
        </div>

        {/* Plan Configuration Card */}
        <div className="p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Schedule Horizon
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlanType('daily')}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  planType === 'daily'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock size={16} className={planType === 'daily' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                  {planType === 'daily' && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                </div>
                <div>
                  <span className="block text-xs font-semibold">Daily Sprint</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Targeted 30-60 min review session
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlanType('weekly')}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  planType === 'weekly'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Calendar size={16} className={planType === 'weekly' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                  {planType === 'weekly' && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                </div>
                <div>
                  <span className="block text-xs font-semibold">Weekly Schedule</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Multi-day spaced repetition cycle
                  </span>
                </div>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-10 px-4 rounded-lg bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Synthesizing Adaptive Plan...</span>
              </>
            ) : (
              <>
                <span>Generate Schedule</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        {plan && (
          <div className="text-center">
            <button
              onClick={() => setView('plan')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Return to previous plan ({plan.title})
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!plan) return null;

  const items = plan.structure?.items || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Bar */}
      <div className="p-4 sm:p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              {plan.plan_type === 'daily' ? 'Daily Sprint' : 'Weekly Plan'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Generated {new Date(plan.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            {plan.structure?.title || plan.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {plan.structure?.total_estimated_minutes > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
              <Clock size={14} className="text-slate-400" />
              <span>
                ~{Math.round(plan.structure.total_estimated_minutes / 60)}h{' '}
                {plan.structure.total_estimated_minutes % 60}m Total
              </span>
            </div>
          )}

          <button
            onClick={() => setView('create')}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      {/* Structured Chronological Agenda */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Topic Review Sequence ({items.length} Modules)
          </span>
          <span className="text-[11px] text-slate-400">
            Ordered by priority & spaced repetition urgency
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No revision items recorded for this plan.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors space-y-3"
            >
              {/* Top Row: Topic and Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {item.topic}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {getPriorityBadge(item.priority)}
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    <Clock size={12} /> {item.estimated_minutes} min
                  </span>
                </div>
              </div>

              {/* Source Document */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <BookOpen size={13} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">Source: {item.source_name}</span>
              </div>

              {/* Reason Snippet */}
              {item.reason && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                  <p className="leading-relaxed italic">"{item.reason}"</p>
                </div>
              )}

              {/* Action Tags */}
              {item.activities && item.activities.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                    Suggested:
                  </span>
                  {item.activities.map((a) => (
                    <span
                      key={a}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
