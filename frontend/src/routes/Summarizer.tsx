import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  BookOpen,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  HelpCircle,
  Layers,
  Map,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '../components/layout';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/useToast';

interface Doc {
  id: string;
  title: string;
}

const pageOptions = [
  { value: 1, label: 'Brief Overview', wordCount: '~500 words', desc: 'Core findings, central thesis, and main takeaways.' },
  { value: 5, label: 'Detailed Summary', wordCount: '~2,500 words', desc: 'Structured exploration of key sections and definitions.' },
  { value: 10, label: 'Comprehensive', wordCount: '~5,000 words', desc: 'In-depth breakdown with visual figures and technical context.' },
  { value: 20, label: 'Full Reference', wordCount: '~10,000 words', desc: 'Exhaustive chapter-by-chapter distillation for exam prep.' },
] as const;

export default function Summarizer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pageCount, setPageCount] = useState<number>(5);
  const [summary, setSummary] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [podcastUrl, setPodcastUrl] = useState('');
  const [podcastScript, setPodcastScript] = useState<{ speaker: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPodcast, setLoadingPodcast] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get('/documents')
      .then(({ data }) => setDocs(data.documents || []))
      .catch(() => {
        toast.error('Failed to load documents list');
      });
  }, [toast]);

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
      toast.success('Summary ready', 'Generated structured summary successfully');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error generating summary. Please try again.';
      setError(errorMsg);
      toast.error('Summary failed', errorMsg);
    } finally {
      setLoading(false);
    }
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
      setPodcastScript(data.script || []);
      toast.success('Podcast generated', 'Audio discussion is ready to listen');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error generating podcast. Please try again.';
      setError(errorMsg);
      toast.error('Podcast failed', errorMsg);
    } finally {
      setLoadingPodcast(false);
    }
  };

  const copySummaryToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.info('Copied', 'Summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedDocTitle = docs.find((d) => d.id === selectedId)?.title;

  return (
    <PageContainer
      title="Research Summarizer"
      description="Distill primary literature and course texts into structured briefing memoranda and dual-host audio discussions."
    >
      <div className="space-y-6">
        {/* Source Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Reading & Analysis Depth</CardTitle>
            <CardDescription>
              Designate an archived text and configure the required depth of analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Select */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                [ SOURCE DOCUMENT ]
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none shadow-[2px_2px_0px_#18181b]"
                >
                  <option value="">SELECT ARCHIVED READING...</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSummarize}
                    disabled={!selectedId || loading || loadingPodcast}
                    isLoading={loading}
                    leftIcon={!loading ? <BookOpen className="w-3.5 h-3.5" /> : undefined}
                    className="font-mono text-xs"
                  >
                    GENERATE BRIEFING
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePodcast}
                    disabled={!selectedId || loading || loadingPodcast}
                    isLoading={loadingPodcast}
                    leftIcon={!loadingPodcast ? <Headphones className="w-3.5 h-3.5" /> : undefined}
                    className="font-mono text-xs"
                  >
                    AUDIO TRANSCRIPT
                  </Button>
                </div>
              </div>
            </div>

            {/* Depth Selector */}
            <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                ANALYSIS DEPTH PARAMETER
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pageOptions.map((opt) => {
                  const isSelected = pageCount === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPageCount(opt.value)}
                      className={`text-left p-3.5 rounded-[2px] border-[1.5px] transition-all cursor-pointer ${
                        isSelected
                          ? 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 shadow-[2px_2px_0px_#18181b]'
                          : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-900 dark:hover:border-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-mono font-bold uppercase ${isSelected ? 'text-stone-900 dark:text-stone-100' : 'text-stone-800 dark:text-stone-200'}`}>
                          {opt.label}
                        </span>
                        <Badge size="sm" variant={isSelected ? 'primary' : 'neutral'}>
                          {opt.wordCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-sans">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-[2px] bg-red-50 dark:bg-red-950/50 border border-red-900 text-xs font-mono text-red-700 dark:text-red-300 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Loading Skeleton / Progress */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center space-y-3 font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-stone-900 dark:text-stone-100 mx-auto" />
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase">
                DISTILLING PRIMARY TEXT INTO EXECUTIVE MEMO...
              </div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Extracting core axioms, proofs, and structural takeaways.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary Content Result */}
        {summary && !loading && (
          <div className="space-y-6">
            <div className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] overflow-hidden">
              <div className="flex flex-row items-center justify-between gap-4 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 p-4 sm:p-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="primary">RESEARCH BRIEFING</Badge>
                    {selectedDocTitle && (
                      <span className="font-mono text-[10px] text-stone-500 uppercase">SOURCE // {selectedDocTitle}</span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                    Executive Analysis & Conceptual Findings
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySummaryToClipboard}
                  leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  className="font-mono text-xs"
                >
                  {copied ? 'COPIED' : 'COPY BRIEFING'}
                </Button>
              </div>

              <div className="p-6 sm:p-8">
                {/* Structured Multi-Section Document Display */}
                <div className="max-w-none text-stone-900 dark:text-stone-100 space-y-4">
                  {summary.split('\n').map((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return null;

                    if (trimmed.startsWith('# ')) {
                      return (
                        <h1 key={index} className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mt-6 mb-3 pt-3 border-t border-stone-300 dark:border-stone-700 first:border-0 first:pt-0 font-serif">
                          {trimmed.replace('# ', '')}
                        </h1>
                      );
                    }
                    if (trimmed.startsWith('## ')) {
                      return (
                        <h2 key={index} className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100 mt-5 mb-2 font-serif">
                          {trimmed.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (trimmed.startsWith('### ')) {
                      return (
                        <h3 key={index} className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-4 mb-1 font-serif">
                          {trimmed.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      return (
                        <div key={index} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300 pl-2">
                          <span className="font-bold select-none text-stone-900 dark:text-stone-100">•</span>
                          <span className="leading-relaxed">{trimmed.substring(2)}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={index} className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Extracted Figures / Diagrams */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-stone-900 dark:text-stone-100" />
                    <CardTitle className="text-base font-bold font-serif">Extracted Figures & Diagrams</CardTitle>
                  </div>
                  <CardDescription>Visual references identified in primary source text.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((url, i) => (
                      <div
                        key={i}
                        className="rounded-[2px] overflow-hidden border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 flex items-center justify-center p-2 shadow-[2px_2px_0px_#18181b]"
                      >
                        <img
                          src={url}
                          alt={`Document visual reference ${i + 1}`}
                          className="max-h-64 object-contain"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Study Actions Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold font-serif">Active Recall & Verification</CardTitle>
                <CardDescription>
                  Advance from reading comprehension into active retention and examination.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => navigate(`/quizzes?doc=${selectedId}`)}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] text-left transition-all shadow-[2px_2px_0px_#18181b] group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-2 shadow-[1px_1px_0px_#18181b]">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100 mb-0.5">EXAMINATION TEST</div>
                    <div className="text-xs text-stone-500">Check objective retention</div>
                  </button>

                  <button
                    onClick={() => navigate(`/flashcards?doc=${selectedId}`)}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] text-left transition-all shadow-[2px_2px_0px_#18181b] group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-2 shadow-[1px_1px_0px_#18181b]">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100 mb-0.5">FLASHCARD DRILL</div>
                    <div className="text-xs text-stone-500">Active recall repetition</div>
                  </button>

                  <button
                    onClick={() => navigate(`/chat?doc=${selectedId}`)}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] text-left transition-all shadow-[2px_2px_0px_#18181b] group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-2 shadow-[1px_1px_0px_#18181b]">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100 mb-0.5">TUTOR INQUIRY</div>
                    <div className="text-xs text-stone-500">Grounded study workspace</div>
                  </button>

                  <button
                    onClick={() => navigate(`/roadmap`)}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] text-left transition-all shadow-[2px_2px_0px_#18181b] group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-2 shadow-[1px_1px_0px_#18181b]">
                      <Map className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100 mb-0.5">CURRICULUM PLAN</div>
                    <div className="text-xs text-stone-500">Track stage progress</div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Podcast Audio Section */}
        {podcastUrl && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-stone-900 dark:text-stone-100" />
                <CardTitle className="text-base font-bold font-serif">Dual-Host Discussion Recording</CardTitle>
              </div>
              <CardDescription>
                Conversational overview of core themes between two study discussants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <audio controls src={podcastUrl} className="w-full rounded-[2px]" />

              {podcastScript.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-stone-200 dark:border-stone-800 max-h-80 overflow-y-auto pr-2">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    // SCRIPT LOG TRANSCRIPT
                  </div>
                  {podcastScript.map((line, i) => {
                    const isHostA = line.speaker === 'A';
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-[2px] text-xs border ${
                          isHostA
                            ? 'bg-stone-50 dark:bg-stone-900 border-stone-900 dark:border-stone-700 text-stone-900 dark:text-stone-100 shadow-[1px_1px_0px_#18181b]'
                            : 'bg-white dark:bg-stone-800 border-stone-400 dark:border-stone-600 text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        <div className="font-mono text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                          SPEAKER // {line.speaker}
                        </div>
                        <p className="leading-relaxed text-stone-700 dark:text-stone-300 font-sans">{line.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
