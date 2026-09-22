import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
  Search as SearchIcon,
  FileText,
  Map,
  Hash,
  Lightbulb,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface SearchResultData {
  query: string;
  results: {
    documents: Array<{
      id: string;
      title: string;
      filename: string;
      file_type: string;
      created_at: string;
    }>;
    roadmaps: Array<{
      id: string;
      title: string;
      description: string;
      created_at: string;
    }>;
    nodes: Array<{
      id: string;
      roadmap_id: string;
      roadmap_title: string;
      title: string;
      description: string;
      status: string;
    }>;
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
    } finally {
      setLoading(false);
    }
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
    setSearchParams({ q: query.trim() });
  };

  const totalResults = data
    ? data.results.documents.length +
      data.results.roadmaps.length +
      data.results.nodes.length +
      data.results.vector_snippets.length
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-in fade-in duration-200">
      
      {/* Header & Search Bar Bar */}
      <div className="p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Global Knowledge Search
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Query across your documents, learning roadmaps, concept nodes, and vector embeddings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts, documents, or key terms..."
              className="w-full h-10 pl-10 pr-4 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {data && !loading && (
          <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
            Found <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalResults}</strong> matching results for "{data.query}"
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
          <Loader2 size={24} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>Searching your knowledge base...</span>
        </div>
      )}

      {/* Results Workspace */}
      {!loading && data && (
        <div className="space-y-6">
          
          {/* Top Row: Documents and Roadmaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Documents Section */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-slate-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Documents ({data.results.documents.length})
                  </h2>
                </div>
                <Link
                  to="/documents"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  All Documents
                </Link>
              </div>

              {data.results.documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No documents match this search.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {data.results.documents.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {d.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {d.filename} · <span className="uppercase">{d.file_type}</span>
                        </p>
                      </div>
                      <Link
                        to="/documents"
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Open in documents"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Roadmaps Section */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map size={15} className="text-slate-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Roadmaps ({data.results.roadmaps.length})
                  </h2>
                </div>
                <Link
                  to="/roadmap"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  All Roadmaps
                </Link>
              </div>

              {data.results.roadmaps.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No learning roadmaps match this search.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {data.results.roadmaps.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {r.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {r.description || 'Curated study roadmap'}
                        </p>
                      </div>
                      <Link
                        to="/roadmap"
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Open roadmap"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Roadmap Topics / Concepts */}
          {data.results.nodes.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
                <Hash size={15} className="text-slate-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Topic Nodes & Concepts ({data.results.nodes.length})
                </h2>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.results.nodes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                  >
                    <span className="inline-block text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                      {n.roadmap_title}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Vector Knowledge Snippets */}
          {data.results.vector_snippets.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
                <Lightbulb size={15} className="text-slate-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Extracted Document Intelligence Snippets ({data.results.vector_snippets.length})
                </h2>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.results.vector_snippets.map((v, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic"
                  >
                    "{v.content_snippet}..."
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {!loading && !data && queryParam && (
        <div className="p-12 text-center text-xs text-slate-400">
          No results found for your query. Try searching for a different keyword or document title.
        </div>
      )}
    </div>
  );
}
