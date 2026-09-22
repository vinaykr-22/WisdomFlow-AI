import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
  Search as SearchIcon,
  FileText,
  Map,
  Hash,
  Loader2,
  ArrowRight,
  Database,
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
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      
      {/* Header & Drafting Search Bar */}
      <div className="p-5 sm:p-6 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              [ INDEX // GLOBAL KNOWLEDGE SEARCH ]
            </span>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-200">
              VECTOR EMBEDDINGS
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Comprehensive Workspace Index
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Query across catalogued documents, curriculum blueprints, concept nodes, and vector excerpts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts, document archives, or technical terminology..."
              className="w-full h-10 pl-10 pr-4 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="h-10 px-5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-black dark:hover:bg-white font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          >
            Execute Query
          </button>
        </form>

        {data && !loading && (
          <div className="pt-1 font-mono text-[11px] text-stone-500 dark:text-stone-400">
            [ QUERY REPORT ]: Found <strong className="font-bold text-stone-900 dark:text-stone-100">{totalResults}</strong> matching entities for <span className="font-bold">"{data.query}"</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center text-stone-400 text-xs gap-3 font-mono">
          <Loader2 size={22} className="animate-spin text-stone-900 dark:text-stone-100" />
          <span>[ SCANNING WORKSPACE VECTORS & INDEXES... ]</span>
        </div>
      )}

      {/* Results Workspace */}
      {!loading && data && (
        <div className="space-y-6">
          
          {/* Top Row: Documents and Roadmaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Documents Section */}
            <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] overflow-hidden">
              <div className="p-3.5 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-stone-900 dark:text-stone-100" />
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                    [ DOCUMENTS // {data.results.documents.length} FOUND ]
                  </h2>
                </div>
                <Link
                  to="/documents"
                  className="font-mono text-[10px] font-bold uppercase text-stone-900 dark:text-stone-100 hover:underline"
                >
                  All Archives
                </Link>
              </div>

              {data.results.documents.length === 0 ? (
                <div className="p-6 text-center font-mono text-xs text-stone-500">
                  [ NO MATCHING DOCUMENTS ]
                </div>
              ) : (
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                  {data.results.documents.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {d.title}
                        </h3>
                        <p className="font-mono text-[10px] text-stone-500 mt-0.5">
                          {d.filename} · <span className="uppercase font-bold">[{d.file_type}]</span>
                        </p>
                      </div>
                      <Link
                        to="/documents"
                        className="p-1.5 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                        title="Open in document archives"
                      >
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Roadmaps Section */}
            <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] overflow-hidden">
              <div className="p-3.5 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map size={14} className="text-stone-900 dark:text-stone-100" />
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                    [ ROADMAPS // {data.results.roadmaps.length} FOUND ]
                  </h2>
                </div>
                <Link
                  to="/roadmap"
                  className="font-mono text-[10px] font-bold uppercase text-stone-900 dark:text-stone-100 hover:underline"
                >
                  All Blueprints
                </Link>
              </div>

              {data.results.roadmaps.length === 0 ? (
                <div className="p-6 text-center font-mono text-xs text-stone-500">
                  [ NO MATCHING ROADMAPS ]
                </div>
              ) : (
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                  {data.results.roadmaps.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group"
                    >
                      <div className="min-w-0 pr-3">
                        <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {r.title}
                        </h3>
                        <p className="font-mono text-[10px] text-stone-500 mt-0.5 truncate">
                          {r.description || 'Curated study roadmap'}
                        </p>
                      </div>
                      <Link
                        to="/roadmap"
                        className="p-1.5 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                        title="Open curriculum blueprint"
                      >
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Roadmap Topics / Concepts */}
          {data.results.nodes.length > 0 && (
            <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] overflow-hidden">
              <div className="p-3.5 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-800/60 flex items-center gap-2">
                <Hash size={14} className="text-stone-900 dark:text-stone-100" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  [ TOPIC NODES & CONCEPTS // {data.results.nodes.length} FOUND ]
                </h2>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.results.nodes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 space-y-1.5 shadow-[1.5px_1.5px_0px_#18181b]"
                  >
                    <span className="inline-block font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100">
                      {n.roadmap_title}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Vector Knowledge Snippets */}
          {data.results.vector_snippets.length > 0 && (
            <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#000] overflow-hidden">
              <div className="p-3.5 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100/60 dark:bg-stone-800/60 flex items-center gap-2">
                <Database size={14} className="text-stone-900 dark:text-stone-100" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  [ VECTOR EMBEDDING RETRIEVALS // {data.results.vector_snippets.length} EXCERPTS ]
                </h2>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.results.vector_snippets.map((v, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/40 text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-mono shadow-[1.5px_1.5px_0px_#18181b]"
                  >
                    <span className="text-stone-400 text-[10px] block mb-1">
                      [SNIPPET #{i + 1}]
                    </span>
                    "{v.content_snippet}..."
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {!loading && !data && queryParam && (
        <div className="p-12 text-center font-mono text-xs text-stone-500 rounded-[2px] border border-dashed border-stone-900 dark:border-stone-700">
          [ ZERO ENTITIES MATCHING QUERY: "{queryParam}" ]<br />
          Verify terminology or search by document headline.
        </div>
      )}
    </div>
  );
}
