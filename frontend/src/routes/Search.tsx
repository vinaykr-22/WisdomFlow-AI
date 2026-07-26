import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Search as SearchIcon, FileText, Map, Hash, Lightbulb, Loader2, ArrowRight } from 'lucide-react';

interface SearchResultData {
  query: string;
  results: {
    documents: Array<{ id: string; title: string; filename: string; file_type: string; created_at: string }>;
    roadmaps: Array<{ id: string; title: string; description: string; created_at: string }>;
    nodes: Array<{ id: string; roadmap_id: string; roadmap_title: string; title: string; description: string; status: string }>;
    vector_snippets: Array<{ content_snippet: string }>;
  };
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResultData | null>(null);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setData(res.data);
    } catch {
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam);
    }
  }, [queryParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Search Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Global Search</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl">Search across all your documents, learning roadmaps, topics, and extracted knowledge.</p>
          
          <form onSubmit={handleSubmit} className="w-full max-w-2xl flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <SearchIcon size={20} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for any topic, keyword, or document..."
                className="w-full border-none rounded-xl pl-11 pr-4 py-3.5 text-slate-800 bg-white shadow-lg focus:ring-4 focus:ring-blue-400/50 focus:outline-none transition-all text-lg placeholder-slate-400"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="font-medium text-lg text-slate-500">Searching your knowledge base...</p>
        </div>
      )}

      {/* Results */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Documents Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <div className="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-1.5 rounded-lg"><FileText size={20} /></div>
              Documents ({data.results.documents.length})
            </h3>
            {data.results.documents.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">No matching documents found.</p>
            ) : (
              <div className="space-y-3">
                {data.results.documents.map(d => (
                  <div key={d.id} className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{d.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{d.filename} • {d.file_type.toUpperCase()}</p>
                      </div>
                      <Link to="/documents" className="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-200 dark:hover:bg-blue-900">
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roadmaps Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <div className="bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 p-1.5 rounded-lg"><Map size={20} /></div>
              Learning Roadmaps ({data.results.roadmaps.length})
            </h3>
            {data.results.roadmaps.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">No matching roadmaps found.</p>
            ) : (
              <div className="space-y-3">
                {data.results.roadmaps.map(r => (
                  <div key={r.id} className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">{r.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[200px]">{r.description}</p>
                      </div>
                      <Link to="/roadmap" className="text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-200 dark:hover:bg-purple-900">
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roadmap Topics / Nodes Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg"><Hash size={20} /></div>
              Roadmap Topics & Concepts ({data.results.nodes.length})
            </h3>
            {data.results.nodes.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">No matching topic nodes found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.results.nodes.map(n => (
                  <div key={n.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm transition-all">
                    <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-1 rounded-md uppercase tracking-wider mb-2">
                      {n.roadmap_title}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{n.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{n.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vector Knowledge Snippets Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg"><Lightbulb size={20} /></div>
              Document Intelligence Snippets ({data.results.vector_snippets.length})
            </h3>
            {data.results.vector_snippets.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">No vector snippets found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.results.vector_snippets.map((v, i) => (
                  <div key={i} className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic relative">
                    <span className="absolute top-2 left-2 text-3xl text-emerald-200 dark:text-emerald-800 font-serif leading-none opacity-50">"</span>
                    <p className="relative z-10 pt-2 pl-4">{v.content_snippet}...</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
