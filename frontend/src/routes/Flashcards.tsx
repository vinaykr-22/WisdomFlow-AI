import { useEffect, useState } from 'react';
import api from '../api/client';
import { Layers, RotateCcw, Bookmark, Sparkles, AlertCircle } from 'lucide-react';

interface Doc { id: string; title: string }
interface Card { id: string; front: string; back: string; hint: string | null; is_bookmarked: boolean }

export default function Flashcards() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');

  useEffect(() => { api.get('/documents').then(({ data }) => setDocs(data.documents)); }, []);

  const handleGenerate = async () => {
    if (!docId) return;
    setLoading(true);
    setCards([]);
    setFlipped(new Set());
    try {
      const { data } = await api.post('/flashcards/generate', { document_id: docId, count });
      const { data: setData } = await api.get(`/flashcards/sets/${data.id}`);
      setCards(setData.cards);
      setTitle(setData.title);
    } catch { alert('Failed to generate flashcards'); }
    setLoading(false);
  };

  const toggleFlip = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleBookmark = async (card: Card) => {
    try {
      await api.patch(`/flashcards/${card.id}`, { is_bookmarked: !card.is_bookmarked });
      setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, is_bookmarked: !c.is_bookmarked } : c));
    } catch { /* ignore */ }
  };

  if (cards.length > 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Layers className="text-purple-500 dark:text-purple-400" /> {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cards.length} cards in this set &middot; Click any card to flip</p>
          </div>
          <button 
            onClick={() => { setCards([]); setFlipped(new Set()); }} 
            className="flex items-center gap-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl transition-colors font-medium cursor-pointer"
          >
            <RotateCcw size={16} /> New Set
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ perspective: '1000px' }}>
          {cards.map((card) => {
            const isFlipped = flipped.has(card.id);
            return (
              <div 
                key={card.id} 
                className="relative h-64 w-full cursor-pointer group"
                style={{ transformStyle: 'preserve-3d' }}
                onClick={() => toggleFlip(card.id)}
              >
                <div 
                  className="absolute inset-0 w-full h-full transition-all duration-500"
                  style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                  }}
                >
                  
                  {/* Front */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center group-hover:shadow-lg transition-shadow"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="absolute top-4 left-4 text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Front</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(card); }}
                      className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${card.is_bookmarked ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/40' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <Bookmark size={20} fill={card.is_bookmarked ? "currentColor" : "none"} />
                    </button>
                    <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100">{card.front}</h3>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/40 rounded-3xl shadow-md border border-purple-100 dark:border-indigo-900/50 flex flex-col items-center justify-center p-8 text-center"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="absolute top-4 left-4 text-xs font-bold text-purple-300 dark:text-purple-400 uppercase tracking-widest">Back</span>
                    <p className="text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">{card.back}</p>
                    
                    {card.hint && (
                      <div className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-1.5 text-xs text-purple-600 dark:text-purple-300 bg-white/50 dark:bg-slate-800/60 backdrop-blur-sm py-2 px-4 rounded-xl mx-auto max-w-[80%] border border-purple-100/50 dark:border-purple-800/50">
                        <AlertCircle size={14} /> <span className="truncate">Hint: {card.hint}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pt-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Layers size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Flashcard Generator</h2>
        <p className="text-slate-500 dark:text-slate-400">Transform your documents into interactive study sets.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Document</label>
          <select 
            value={docId} 
            onChange={(e) => setDocId(e.target.value)} 
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
          >
            <option value="">Choose a document to study...</option>
            {docs.map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Number of Cards</label>
          <select 
            value={count} 
            onChange={(e) => setCount(Number(e.target.value))} 
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none"
          >
            {[5, 10, 15, 20].map((n) => (<option key={n} value={n}>{n} cards</option>))}
          </select>
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={!docId || loading} 
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2 animate-pulse"><Sparkles size={18} /> Generating Flashcards...</span>
          ) : (
            <span className="flex items-center gap-2"><Sparkles size={18} /> Generate Flashcards</span>
          )}
        </button>
      </div>
    </div>
  );
}
