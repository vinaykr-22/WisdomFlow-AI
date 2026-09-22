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
        <span className="px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] font-bold uppercase tracking-wider bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border border-stone-900">
          HIGH PRIORITY
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-900 dark:border-stone-700">
          MEDIUM PRIORITY
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700">
        STANDARD REVIEW
      </span>
    );
  };

  if (initialLoading) {
    return (
      <div className="h-64 flex items-center justify-center font-mono text-xs text-stone-400">
        LOADING REVISION MATRIX...
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#18181b]">
            <Calendar size={18} />
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
            [ SCHEDULE ARCHITECT // SPACED REPETITION ]
          </span>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight font-serif">
            Synthesize Spaced Revision Plan
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto font-sans">
            Analyzes your evaluation errors and review cadence to structure prioritized repetition sprints.
          </p>
        </div>

        {/* Plan Configuration Card */}
        <div className="p-6 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] space-y-5">
          <div className="space-y-2">
            <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              [ HORIZON PARAMETER ]
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlanType('daily')}
                className={`p-3.5 rounded-[2px] border-[1.5px] text-left transition-all cursor-pointer flex flex-col justify-between ${
                  planType === 'daily'
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 shadow-[2px_2px_0px_#18181b]'
                    : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-900 dark:hover:border-stone-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock size={16} className={planType === 'daily' ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400'} />
                  {planType === 'daily' && <span className="w-2 h-2 rounded-[1px] bg-stone-900 dark:bg-stone-100" />}
                </div>
                <div>
                  <span className="block font-mono text-xs font-bold uppercase text-stone-900 dark:text-stone-100">Daily Sprint</span>
                  <span className="block text-[11px] text-stone-500 mt-0.5 font-sans">
                    Targeted 30-60 min focused session
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlanType('weekly')}
                className={`p-3.5 rounded-[2px] border-[1.5px] text-left transition-all cursor-pointer flex flex-col justify-between ${
                  planType === 'weekly'
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 shadow-[2px_2px_0px_#18181b]'
                    : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-900 dark:hover:border-stone-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Calendar size={16} className={planType === 'weekly' ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400'} />
                  {planType === 'weekly' && <span className="w-2 h-2 rounded-[1px] bg-stone-900 dark:bg-stone-100" />}
                </div>
                <div>
                  <span className="block font-mono text-xs font-bold uppercase text-stone-900 dark:text-stone-100">Weekly Cycle</span>
                  <span className="block text-[11px] text-stone-500 mt-0.5 font-sans">
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
            className="w-full h-10 px-4 rounded-[2px] bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-mono text-xs font-bold uppercase shadow-[2px_2px_0px_#18181b] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>SYNTHESIZING ADAPTIVE SCHEDULE...</span>
              </>
            ) : (
              <>
                <span>COMPILE REVISION SCHEDULE</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>

        {plan && (
          <div className="text-center">
            <button
              onClick={() => setView('plan')}
              className="font-mono text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 underline cursor-pointer uppercase"
            >
              [ RETURN TO ACTIVE SCHEDULE: {plan.title} ]
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!plan) return null;

  const items = plan.structure?.items || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Banner Bar */}
      <div className="p-5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-[var(--color-surface)] shadow-[2px_2px_0px_#18181b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-900 dark:border-stone-700">
              {plan.plan_type === 'daily' ? 'DAILY SPRINT' : 'WEEKLY CYCLE'}
            </span>
            <span className="font-mono text-[10px] text-stone-500 uppercase">
              // GENERATED {new Date(plan.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-serif">
            {plan.structure?.title || plan.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {plan.structure?.total_estimated_minutes > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-stone-900 dark:text-stone-100 px-2.5 py-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
              <Clock size={13} className="text-stone-500" />
              <span>
                ~{Math.round(plan.structure.total_estimated_minutes / 60)}H{' '}
                {plan.structure.total_estimated_minutes % 60}M TOTAL
              </span>
            </div>
          )}

          <button
            onClick={() => setView('create')}
            className="h-8 px-3 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 font-mono text-xs font-bold text-stone-900 dark:text-stone-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#18181b]"
          >
            <RotateCcw size={12} />
            <span>NEW SCHEDULE</span>
          </button>
        </div>
      </div>

      {/* Structured Chronological Agenda */}
      <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] divide-y divide-stone-200 dark:divide-stone-800 overflow-hidden">
        <div className="p-4 bg-stone-100 dark:bg-stone-800 border-b-[1.5px] border-stone-900 dark:border-stone-700 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
            SEQUENCE ARCHIVE // {items.length} MODULES
          </span>
          <span className="font-mono text-[10px] text-stone-500 uppercase">
            SORTED BY RETENTION PRIORITY
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-stone-500">
            NO REVISION ITEMS SCHEDULED.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="p-4 sm:p-5 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors space-y-3"
            >
              {/* Top Row: Topic and Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xs font-bold text-stone-400 flex-shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif">
                    {item.topic}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {getPriorityBadge(item.priority)}
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-stone-500 uppercase px-2 py-0.5 rounded-[2px] border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
                    <Clock size={11} /> {item.estimated_minutes} MIN
                  </span>
                </div>
              </div>

              {/* Source Document */}
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-500 uppercase">
                <BookOpen size={12} className="text-stone-400 flex-shrink-0" />
                <span className="truncate">SOURCE // {item.source_name}</span>
              </div>

              {/* Reason Snippet */}
              {item.reason && (
                <div className="p-2.5 rounded-[2px] bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2">
                  <AlertCircle size={13} className="mt-0.5 text-stone-400 flex-shrink-0" />
                  <p className="leading-relaxed font-sans">{item.reason}</p>
                </div>
              )}

              {/* Action Tags */}
              {item.activities && item.activities.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-[10px]">
                  <span className="font-bold text-stone-400 uppercase mr-1">
                    ACTIVITIES:
                  </span>
                  {item.activities.map((a) => (
                    <span
                      key={a}
                      className="px-2 py-0.5 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
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
