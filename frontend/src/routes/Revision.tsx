import { useEffect, useState } from 'react';
import api from '../api/client';
import { Calendar, Clock, BookOpen, AlertCircle, Sparkles, Target, ArrowRight } from 'lucide-react';

interface PlanItem {
  topic: string; source_name: string; priority: string;
  estimated_minutes: number; activities: string[]; reason: string;
}
interface PlanStructure {
  title: string; items: PlanItem[]; total_estimated_minutes: number;
}
interface Plan {
  id: string; title: string; plan_type: string;
  structure: PlanStructure; created_at: string;
}

export default function Revision() {
  const [view, setView] = useState<'create' | 'plan'>('create');
  const [planType, setPlanType] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    api.get('/revision/plan').then(({ data }) => {
      if (data.plan) { setPlan(data.plan); setView('plan'); }
    });
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api.post('/revision/generate', { plan_type: planType });
      const { data: detail } = await api.get('/revision/plan');
      setPlan(detail.plan);
      setView('plan');
    } catch { alert('Failed to generate plan'); }
    setLoading(false);
  };

  const priorityColor = (p: string) =>
    p === 'high' ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50' :
    p === 'medium' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';

  if (view === 'create') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pt-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Calendar size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Revision Planner</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Generate a smart revision plan based on your documents, quiz performance, and weak areas.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Plan Scope</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setPlanType('daily')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${planType === 'daily' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-inner' : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <Clock size={24} className={planType === 'daily' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
                <span className="font-bold">Daily Plan</span>
              </button>
              <button 
                onClick={() => setPlanType('weekly')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${planType === 'weekly' ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-inner' : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <Calendar size={24} className={planType === 'weekly' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'} />
                <span className="font-bold">Weekly Plan</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all mt-4"
          >
            {loading ? (
              <span className="flex items-center gap-2 animate-pulse"><Sparkles size={20} /> Generating AI Plan...</span>
            ) : (
              <span className="flex items-center gap-2">Generate Plan <ArrowRight size={20} /></span>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!plan) return <div className="text-slate-500 text-center py-12">Loading...</div>;

  const items = plan.structure?.items || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5">
          <Target size={200} className="-mt-10 -mr-10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${plan.plan_type === 'daily' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
              {plan.plan_type === 'daily' ? 'Daily Plan' : 'Weekly Plan'}
            </span>
            <span className="text-sm text-slate-400 font-medium">{new Date(plan.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <h2 className="text-3xl font-bold">{plan.structure?.title || plan.title}</h2>
        </div>
        
        <div className="relative z-10 flex flex-col items-end gap-3">
          <button
            onClick={() => setView('create')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-sm font-semibold transition-colors backdrop-blur-sm cursor-pointer flex items-center gap-2"
          >
            <Sparkles size={16} /> New Plan
          </button>
          
          {plan.structure?.total_estimated_minutes > 0 && (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 backdrop-blur-sm">
              <Clock size={16} /> ~{Math.round(plan.structure.total_estimated_minutes / 60)}h {plan.structure.total_estimated_minutes % 60}m Total
            </div>
          )}
        </div>
      </div>

      {/* Plan Items */}
      <div className="space-y-4 relative">
        <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-800"></div>
        {items.map((item, i) => (
          <div key={i} className="relative pl-16">
            <div className="absolute left-[21px] top-6 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-slate-50 dark:ring-slate-900"></div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all group">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{item.topic}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    <BookOpen size={14} /> {item.source_name}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border ${priorityColor(item.priority)}`}>
                    Priority: {item.priority}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg">
                    <Clock size={14} /> {item.estimated_minutes} min
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 flex items-start gap-3">
                <AlertCircle className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" size={16} />
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">"{item.reason}"</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">Activities:</span>
                {item.activities?.map((a) => (
                  <span key={a} className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-3 py-1 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
