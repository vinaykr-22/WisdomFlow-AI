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
      title="Document Summarizer"
      description="Distill complex materials into structured, scannable summaries and dual-host audio discussions."
    >
      <div className="space-y-6">
        {/* Source Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Source & Detail Level</CardTitle>
            <CardDescription>
              Choose any document from your library and configure the required depth of analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Select */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Source Document
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select a document from your library...</option>
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
                    leftIcon={!loading ? <BookOpen className="w-4 h-4" /> : undefined}
                  >
                    Generate Summary
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePodcast}
                    disabled={!selectedId || loading || loadingPodcast}
                    isLoading={loadingPodcast}
                    leftIcon={!loadingPodcast ? <Headphones className="w-4 h-4" /> : undefined}
                  >
                    Audio Podcast
                  </Button>
                </div>
              </div>
            </div>

            {/* Depth Selector */}
            <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Summary Depth
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pageOptions.map((opt) => {
                  const isSelected = pageCount === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPageCount(opt.value)}
                      className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                          {opt.label}
                        </span>
                        <Badge size="sm" variant={isSelected ? 'primary' : 'neutral'}>
                          {opt.wordCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-sm text-[var(--color-error)] flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Loading Skeleton / Progress */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)] mx-auto" />
              <div className="text-sm font-semibold text-[var(--color-text)]">
                Analyzing and summarizing document...
              </div>
              <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                Extracting core arguments, definitions, and concepts based on chosen depth.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary Content Result */}
        {summary && !loading && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="primary">Structured Summary</Badge>
                    {selectedDocTitle && (
                      <span className="text-xs text-[var(--color-text-muted)]">Source: {selectedDocTitle}</span>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold">Key Insights & Takeaways</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySummaryToClipboard}
                  leftIcon={copied ? <Check className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied' : 'Copy Text'}
                </Button>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Structured Multi-Section Document Display */}
                <div className="prose prose-slate dark:prose-invert max-w-none text-[var(--color-text)] space-y-4">
                  {summary.split('\n').map((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return null;

                    if (trimmed.startsWith('# ')) {
                      return (
                        <h1 key={index} className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-6 mb-3 pt-3 border-t border-[var(--color-border)] first:border-0 first:pt-0">
                          {trimmed.replace('# ', '')}
                        </h1>
                      );
                    }
                    if (trimmed.startsWith('## ')) {
                      return (
                        <h2 key={index} className="text-lg font-semibold tracking-tight text-[var(--color-text)] mt-5 mb-2">
                          {trimmed.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (trimmed.startsWith('### ')) {
                      return (
                        <h3 key={index} className="text-base font-semibold text-[var(--color-text)] mt-4 mb-1">
                          {trimmed.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      return (
                        <div key={index} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] pl-2">
                          <span className="text-[var(--color-primary)] font-bold mt-0.5">•</span>
                          <span>{trimmed.substring(2)}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={index} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Extracted Figures / Diagrams */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
                    <CardTitle className="text-base font-semibold">Extracted Figures & Diagrams</CardTitle>
                  </div>
                  <CardDescription>Visual references identified in the source text.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((url, i) => (
                      <div
                        key={i}
                        className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-hover)] flex items-center justify-center p-2"
                      >
                        <img
                          src={url}
                          alt={`Document visual reference ${i + 1}`}
                          className="max-h-64 object-contain rounded"
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
                <CardTitle className="text-base font-semibold">Ready to test what you learned?</CardTitle>
                <CardDescription>
                  Advance from reading to active recall and retention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => navigate(`/quizzes?doc=${selectedId}`)}
                    className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-left transition-colors group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-text)] mb-0.5">Take Quiz</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Check comprehension</div>
                  </button>

                  <button
                    onClick={() => navigate(`/flashcards?doc=${selectedId}`)}
                    className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-left transition-colors group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-text)] mb-0.5">Flashcards</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Spaced repetition review</div>
                  </button>

                  <button
                    onClick={() => navigate(`/chat?doc=${selectedId}`)}
                    className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-left transition-colors group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-text)] mb-0.5">Ask Questions</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Grounded AI document chat</div>
                  </button>

                  <button
                    onClick={() => navigate(`/roadmap`)}
                    className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-left transition-colors group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Map className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-text)] mb-0.5">Learning Path</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Track in curriculum</div>
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
                <Headphones className="w-5 h-5 text-[var(--color-primary)]" />
                <CardTitle className="text-base font-semibold">Audio Discussion (Podcast)</CardTitle>
              </div>
              <CardDescription>
                Conversational overview of core themes between two AI study partners.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <audio controls src={podcastUrl} className="w-full rounded-lg" />

              {podcastScript.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-[var(--color-border)] max-h-80 overflow-y-auto pr-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Dialogue Transcript
                  </div>
                  {podcastScript.map((line, i) => {
                    const isHostA = line.speaker === 'A';
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-lg text-sm ${
                          isHostA
                            ? 'bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text)]'
                            : 'bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 text-[var(--color-text)]'
                        }`}
                      >
                        <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                          Host {line.speaker}
                        </div>
                        <p className="leading-relaxed text-[var(--color-text-secondary)]">{line.text}</p>
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
