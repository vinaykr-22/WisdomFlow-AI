import { useEffect, useState } from 'react';
import api from '../api/client';
import { FileText, Type, Zap, Image as ImageIcon, Sparkles, Loader2, Headphones } from 'lucide-react';

interface Doc { id: string; title: string }

const pageOptions = [
  { value: 1, label: 'Brief Overview', wordCount: '~500 words', desc: 'A quick summary of the main points.' },
  { value: 5, label: 'Detailed Summary', wordCount: '~2500 words', desc: 'A thorough exploration of core concepts.' },
  { value: 10, label: 'Comprehensive', wordCount: '~5000 words + images', desc: 'In-depth summary with key visual context.' },
  { value: 20, label: 'Full Reference', wordCount: '~10000 words + images', desc: 'Extensive documentation of the entire subject.' }
] as const;

export default function Summarizer() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pageCount, setPageCount] = useState<number>(5);
  const [summary, setSummary] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [podcastUrl, setPodcastUrl] = useState('');
  const [podcastScript, setPodcastScript] = useState<{speaker: string, text: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPodcast, setLoadingPodcast] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/documents').then(({ data }) => setDocs(data.documents));
  }, []);

  const handleSummarize = async () => {
    if (!selectedId) return;
    setLoading(true);
    setSummary('');
    setImages([]);
    setPodcastUrl('');
    setError('');
    try {
      const { data } = await api.post('/summarize', { document_id: selectedId, page_count: pageCount });
      setSummary(data.content);
      setImages(data.images || []);
    } catch {
      setError('Error generating summary. Check your API key and try again.');
    }
    setLoading(false);
  };

  const handlePodcast = async () => {
    if (!selectedId) return;
    setLoadingPodcast(true);
    setPodcastUrl('');
    setPodcastScript([]);
    setError('');
    try {
      const { data } = await api.post('/summarize/podcast', { document_id: selectedId });
      setPodcastUrl(data.audio_url);
      setPodcastScript(data.script);
    } catch {
      setError('Error generating podcast. Please try again.');
    }
    setLoadingPodcast(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pt-4">
      
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Zap size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">AI Document Summarizer</h2>
        <p className="text-slate-500 dark:text-slate-400">Distill long documents into structured, easy-to-read summaries instantly.</p>
      </div>

      {/* Controls Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        
        {/* Document Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-blue-500 dark:text-blue-400" /> Source Document
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-medium"
            >
              <option value="">Select a document to summarize...</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleSummarize}
                disabled={!selectedId || loading || loadingPodcast}
                className="bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Summarizing...</>
                ) : (
                  <><Sparkles size={18} /> Summarize</>
                )}
              </button>
              <button
                onClick={handlePodcast}
                disabled={!selectedId || loading || loadingPodcast}
                className="bg-purple-600 text-white px-6 py-3.5 rounded-xl font-bold hover:shadow-lg hover:bg-purple-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
              >
                {loadingPodcast ? (
                  <><Loader2 size={18} className="animate-spin" /> Generating...</>
                ) : (
                  <><Headphones size={18} /> Podcast</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Depth Selection */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Type size={16} className="text-purple-500 dark:text-purple-400" /> Summary Depth
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pageOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPageCount(opt.value)}
                className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  pageCount === opt.value
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-inner'
                    : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className={`font-bold mb-1 ${pageCount === opt.value ? 'text-blue-800 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>{opt.label}</div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{opt.wordCount}</div>
                <div className={`text-xs ${pageCount === opt.value ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-slate-500 dark:text-slate-400'} leading-relaxed`}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 font-medium flex items-center gap-3 animate-in fade-in">
          <div className="bg-red-100 p-2 rounded-full"><Zap size={20} className="text-red-600" /></div>
          {error}
        </div>
      )}

      {/* Results */}
      {summary && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm">
            <div className="prose prose-slate dark:prose-invert prose-blue max-w-none text-slate-700 dark:text-slate-300 leading-loose">
              {summary.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('# ')) return <h1 key={index} className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-4">{paragraph.replace('# ', '')}</h1>;
                if (paragraph.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-6 mb-3">{paragraph.replace('## ', '')}</h2>;
                if (paragraph.startsWith('### ')) return <h3 key={index} className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">{paragraph.replace('### ', '')}</h3>;
                if (paragraph.trim() === '') return <br key={index} />;
                return <p key={index} className="mb-4 text-base">{paragraph}</p>;
              })}
            </div>
          </div>

          {images.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <ImageIcon className="text-blue-500 dark:text-blue-400" /> Extracted Visuals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {images.map((url, i) => (
                  <div key={i} className="group rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <img src={url} alt={`Document extract ${i + 1}`} className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {podcastUrl && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-3xl p-8 sm:p-12 shadow-sm animate-in slide-in-from-bottom-4 duration-700 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center shadow-inner">
              <Headphones size={24} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audio Podcast</h3>
          </div>
          <audio controls src={podcastUrl} className="w-full mb-8"></audio>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-purple-200 dark:scrollbar-thumb-purple-900/50 scrollbar-track-transparent">
            {podcastScript.map((line, i) => (
              <div key={i} className={`flex ${line.speaker === 'A' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${line.speaker === 'A' ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm' : 'bg-purple-600 text-white rounded-tr-sm shadow-md'}`}>
                  <div className={`text-xs font-bold mb-1 uppercase tracking-wider ${line.speaker === 'A' ? 'text-slate-500 dark:text-slate-400' : 'text-purple-200'}`}>
                    Host {line.speaker}
                  </div>
                  <p className="leading-relaxed">{line.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
