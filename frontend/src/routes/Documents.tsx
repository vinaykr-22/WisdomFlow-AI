import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import {
  FileText,
  Trash2,
  UploadCloud,
  File,
  Loader2,
  Search,
  ArrowLeft,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Layers,
  Map,
  Headphones,
  Image as ImageIcon,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/useToast';

interface Doc {
  id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  created_at: string;
}

const summaryDepthOptions = [
  { value: 1, label: 'Brief Overview', wordCount: '~500 words', desc: 'Core points and key concepts' },
  { value: 5, label: 'Detailed Summary', wordCount: '~2500 words', desc: 'Comprehensive section-by-section breakdown' },
  { value: 10, label: 'In-Depth', wordCount: '~5000 words + visuals', desc: 'Detailed analysis with extracted diagrams' },
  { value: 20, label: 'Full Reference', wordCount: '~10000 words + visuals', desc: 'Complete textbook-depth documentation' },
] as const;

export default function Documents() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected document workspace state
  const selectedDocId = searchParams.get('id');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'summary' | 'podcast' | 'practice'>('summary');

  // Upload & processing state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion modal state
  const [docToDelete, setDocToDelete] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Workspace study generation states
  const [summaryDepth, setSummaryDepth] = useState<number>(5);
  const [summaryContent, setSummaryContent] = useState<string>('');
  const [summaryImages, setSummaryImages] = useState<string[]>([]);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const [podcastUrl, setPodcastUrl] = useState<string>('');
  const [podcastScript, setPodcastScript] = useState<{ speaker: string; text: string }[]>([]);
  const [generatingPodcast, setGeneratingPodcast] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const { data } = await api.get('/documents');
      setDocs(data.documents || []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const selectedDoc = docs.find((d) => d.id === selectedDocId) || null;

  // Reset workspace state when changing selected doc
  useEffect(() => {
    setSummaryContent('');
    setSummaryImages([]);
    setPodcastUrl('');
    setPodcastScript([]);
  }, [selectedDocId]);

  const handleUpload = async (file?: File) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File exceeds 20MB limit', 'Please select a file under 20MB.');
      return;
    }

    setUploading(true);
    setProcessingStage('Uploading document to secure storage...');

    const form = new FormData();
    form.append('file', file);

    try {
      // Simulate real transparent stages
      const stageTimer1 = setTimeout(() => setProcessingStage('Reading document & extracting text content...'), 800);
      const stageTimer2 = setTimeout(() => setProcessingStage('Generating vector embeddings & indexing knowledge...'), 1800);

      await api.post('/documents/upload', form);

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setProcessingStage('Document indexed and ready for study.');

      toast.success('Document uploaded successfully');
      await loadDocs();
      setIsUploadModalOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || e.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProcessingStage('');
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${docToDelete.id}`);
      setDocs((prev) => prev.filter((d) => d.id !== docToDelete.id));
      if (selectedDocId === docToDelete.id) {
        setSearchParams({});
      }
      toast.success('Document deleted');
      setDocToDelete(null);
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDoc) return;
    setGeneratingSummary(true);
    setSummaryContent('');
    setSummaryImages([]);
    try {
      const { data } = await api.post('/summarize', {
        document_id: selectedDoc.id,
        page_count: summaryDepth,
      });
      setSummaryContent(data.content || '');
      setSummaryImages(data.images || []);
      toast.success('Summary generated');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!selectedDoc) return;
    setGeneratingPodcast(true);
    setPodcastUrl('');
    setPodcastScript([]);
    try {
      const { data } = await api.post('/summarize/podcast', {
        document_id: selectedDoc.id,
      });
      setPodcastUrl(data.audio_url || '');
      setPodcastScript(data.script || []);
      toast.success('Podcast episode generated');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate podcast');
    } finally {
      setGeneratingPodcast(false);
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return <FileText className="text-rose-500" size={17} />;
    if (t.includes('doc')) return <FileText className="text-indigo-500" size={17} />;
    if (t.includes('ppt')) return <FileText className="text-amber-500" size={17} />;
    return <File className="text-slate-400" size={17} />;
  };

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==========================================
  // VIEW 2: DOCUMENT LEARNING WORKSPACE
  // ==========================================
  if (selectedDoc) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Level 1: Document Context Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchParams({})}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
              title="Back to all documents"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                {getFileIcon(selectedDoc.file_type)}
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <span className="truncate max-w-[170px] sm:max-w-md md:max-w-lg">{selectedDoc.title}</span>
                  <Badge
                    variant={
                      selectedDoc.processing_status === 'ready'
                        ? 'success'
                        : selectedDoc.processing_status === 'error'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                    dot
                  >
                    {selectedDoc.processing_status === 'ready'
                      ? 'Ready'
                      : selectedDoc.processing_status}
                  </Badge>
                </h1>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {(selectedDoc.file_size / 1024 / 1024).toFixed(2)} MB · {selectedDoc.file_type.toUpperCase()} · Added{' '}
                  {new Date(selectedDoc.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-9 sm:pl-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/chat?docId=${selectedDoc.id}`)}
              leftIcon={<MessageSquare size={14} />}
            >
              Ask Tutor
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDocToDelete(selectedDoc)}
              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
              title="Delete document"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        {/* Level 2: Learning Workflow Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg w-full sm:w-fit overflow-x-auto no-scrollbar border border-slate-200/60 dark:border-slate-800">
          <button
            onClick={() => setActiveWorkspaceTab('summary')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer select-none flex items-center gap-1.5 flex-1 sm:flex-none justify-center whitespace-nowrap ${
              activeWorkspaceTab === 'summary'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BookOpen size={14} className="flex-shrink-0" />
            <span><span className="hidden sm:inline">Understand & </span>Summary</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('podcast')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer select-none flex items-center gap-1.5 flex-1 sm:flex-none justify-center whitespace-nowrap ${
              activeWorkspaceTab === 'podcast'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Headphones size={14} className="flex-shrink-0" />
            <span><span className="hidden sm:inline">Listen & </span>Podcast</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('practice')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer select-none flex items-center gap-1.5 flex-1 sm:flex-none justify-center whitespace-nowrap ${
              activeWorkspaceTab === 'practice'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <HelpCircle size={14} className="flex-shrink-0" />
            <span><span className="hidden sm:inline">Practice & </span>Retain</span>
          </button>
        </div>

        {/* Tab 1: Summary Canvas */}
        {activeWorkspaceTab === 'summary' && (
          <div className="space-y-6">
            {/* Depth controls */}
            <Card variant="default">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Summary Depth
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {summaryDepthOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSummaryDepth(opt.value)}
                      className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                        summaryDepth === opt.value
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {opt.label}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                        {opt.wordCount}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateSummary}
                    isLoading={generatingSummary}
                  >
                    {summaryContent ? 'Regenerate Summary' : 'Generate Summary'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Structured Summary Output */}
            {summaryContent ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-6">
                  {summaryContent.split('\n\n').map((block, idx) => {
                    const trimmed = block.trim();
                    if (!trimmed) return null;

                    if (trimmed.startsWith('# ')) {
                      return (
                        <h2 key={idx} className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 pb-2 border-b border-slate-100 dark:border-slate-800">
                          {trimmed.replace(/^#\s+/, '')}
                        </h2>
                      );
                    }
                    if (trimmed.startsWith('## ')) {
                      return (
                        <h3 key={idx} className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100 mt-4 mb-2">
                          {trimmed.replace(/^##\s+/, '')}
                        </h3>
                      );
                    }
                    if (trimmed.startsWith('### ')) {
                      return (
                        <h4 key={idx} className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-3 mb-1">
                          {trimmed.replace(/^###\s+/, '')}
                        </h4>
                      );
                    }

                    // Key point / list detection
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      const items = trimmed.split('\n');
                      return (
                        <ul key={idx} className="space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                          {items.map((it, i) => (
                            <li key={i}>{it.replace(/^[-*]\s+/, '')}</li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>

                {/* Extracted visuals */}
                {summaryImages.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ImageIcon size={14} /> Extracted Visual Figures ({summaryImages.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summaryImages.map((img, i) => (
                        <div key={i} className="rounded-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                          <img src={img} alt={`Diagram ${i + 1}`} className="w-full h-auto object-contain max-h-72" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <BookOpen size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-medium text-slate-700 dark:text-slate-300">No summary generated yet</p>
                <p>Select your desired depth above and click "Generate Summary" to distill this document.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Audio Podcast */}
        {activeWorkspaceTab === 'podcast' && (
          <div className="space-y-6">
            <Card variant="default">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Audio Discussion</CardTitle>
                  <CardDescription>
                    AI dual-host dialogue synthesizing the document concepts into conversational audio.
                  </CardDescription>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGeneratePodcast}
                  isLoading={generatingPodcast}
                  leftIcon={<Headphones size={14} />}
                >
                  {podcastUrl ? 'Regenerate Podcast' : 'Generate Podcast'}
                </Button>
              </CardHeader>

              {podcastUrl && (
                <CardContent className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <audio controls src={podcastUrl} className="w-full h-10" />

                  {podcastScript.length > 0 && (
                    <div className="space-y-2.5 pt-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Conversation Script
                      </p>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {podcastScript.map((line, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-md text-xs leading-relaxed ${
                              line.speaker === 'A'
                                ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800'
                                : 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 border border-indigo-100/60 dark:border-indigo-900/40 ml-4'
                            }`}
                          >
                            <span className="font-bold text-[10px] uppercase tracking-wider block mb-0.5 opacity-70">
                              Host {line.speaker}
                            </span>
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}

              {!podcastUrl && !generatingPodcast && (
                <CardContent className="pt-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click "Generate Podcast" to create an audio study episode with dual-host narration based on this document.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Tab 3: Practice & Retain Tools */}
        {activeWorkspaceTab === 'practice' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="interactive" onClick={() => navigate(`/quizzes?docId=${selectedDoc.id}`)}>
              <CardHeader>
                <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
                  <HelpCircle size={18} />
                </div>
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Take Knowledge Quiz</span>
                  <ExternalLink size={14} className="text-slate-400" />
                </CardTitle>
                <CardDescription>
                  Generate multiple-choice questions to test your comprehension and identify retention gaps.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" onClick={() => navigate(`/flashcards?docId=${selectedDoc.id}`)}>
              <CardHeader>
                <div className="w-8 h-8 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1">
                  <Layers size={18} />
                </div>
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Study Flashcards</span>
                  <ExternalLink size={14} className="text-slate-400" />
                </CardTitle>
                <CardDescription>
                  Review active-recall study cards generated directly from the key terms in this document.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" onClick={() => navigate(`/roadmap?docId=${selectedDoc.id}`)}>
              <CardHeader>
                <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                  <Map size={18} />
                </div>
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Build Learning Roadmap</span>
                  <ExternalLink size={14} className="text-slate-400" />
                </CardTitle>
                <CardDescription>
                  Transform this document into a structured curriculum tree with prerequisites and minute estimates.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" onClick={() => navigate(`/chat?docId=${selectedDoc.id}`)}>
              <CardHeader>
                <div className="w-8 h-8 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-1">
                  <MessageSquare size={18} />
                </div>
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Ask RAG Study Chat</span>
                  <ExternalLink size={14} className="text-slate-400" />
                </CardTitle>
                <CardDescription>
                  Chat with an AI tutor strictly grounded in the content and citations of this document.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 1: DOCUMENT LIBRARY (TABLE/LIST)
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Document Library
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your uploaded study materials and indexed knowledge base ({docs.length} files)
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsUploadModalOpen(true)}
          leftIcon={<Plus size={15} />}
        >
          Upload Document
        </Button>
      </div>

      {/* Filter / Search Bar */}
      {docs.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter documents by title..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        </div>
      )}

      {/* Document Library List / Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <Card variant="subtle" className="p-8 sm:p-12 text-center border-dashed">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3.5">
            <UploadCloud size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No documents in your library
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-4">
            Upload your lecture slides, PDFs, or notes to start generating summaries, quizzes, and learning roadmaps.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<UploadCloud size={14} />}
          >
            Upload your first document
          </Button>
        </Card>
      ) : filteredDocs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No documents match "{searchQuery}".
        </div>
      ) : (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
            >
              {/* Identity & Format */}
              <div
                onClick={() => setSearchParams({ id: doc.id })}
                className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
              >
                <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  {getFileIcon(doc.file_type)}
                </div>

                <div className="truncate flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[180px] sm:max-w-md">
                    {doc.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>·</span>
                    <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>·</span>
                    <span>
                      {new Date(doc.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge & Study Action Toolbar */}
              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                <Badge
                  variant={
                    doc.processing_status === 'ready'
                      ? 'success'
                      : doc.processing_status === 'error'
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                  dot
                >
                  {doc.processing_status === 'ready' ? 'Ready' : doc.processing_status}
                </Badge>

                {/* Direct Study Shortcuts */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchParams({ id: doc.id })}
                >
                  <span className="hidden sm:inline">Open Study Workspace</span>
                  <span className="sm:hidden">Study</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocToDelete(doc)}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5"
                  title="Delete document"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal with Multi-Stage Progress */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (!uploading) setIsUploadModalOpen(false);
        }}
        title="Upload Study Material"
        description="Add lecture slides, textbook chapters, or notes to your knowledge base."
        size="md"
      >
        <div className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={28} />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {processingStage || 'Processing document...'}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Extracting text and preparing vector index
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 mb-1">
                  <UploadCloud size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Click to browse or drop your document here
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Supported formats: PDF, DOCX, PPTX, TXT (Maximum 20MB)
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              onChange={onFileInput}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2">
            <span>Security: Files are private to your account</span>
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Deletion Confirmation Modal */}
      <Modal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        title="Delete Document"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setDocToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleting}
              onClick={confirmDelete}
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">"{docToDelete?.title}"</span>? This will remove its vectors and any generated summaries.
        </p>
      </Modal>
    </div>
  );
}
