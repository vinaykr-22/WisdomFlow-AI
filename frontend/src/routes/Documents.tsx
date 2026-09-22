import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import {
  FileText,
  Trash2,
  UploadCloud,
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
      toast.error('Failed to load document archive');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const selectedDoc = docs.find((d) => d.id === selectedDocId) || null;

  // Load summary & podcast cache when selectedDoc changes
  useEffect(() => {
    if (!selectedDoc) return;

    let isMounted = true;
    setSummaryContent('');
    setSummaryImages([]);
    setPodcastUrl('');
    setPodcastScript([]);

    api
      .get(`/summarize/${selectedDoc.id}`)
      .then(({ data }) => {
        if (!isMounted) return;
        if (data.summary_text) {
          setSummaryContent(data.summary_text);
          setSummaryImages(data.images || []);
        }
      })
      .catch(() => {});

    api
      .get(`/summarize/podcast/${selectedDoc.id}`)
      .then(({ data }) => {
        if (!isMounted) return;
        if (data.audio_url) {
          setPodcastUrl(data.audio_url);
          setPodcastScript(data.script || []);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedDoc]);

  // Polling for processing status if a doc is currently indexing
  useEffect(() => {
    const hasProcessingDocs = docs.some(
      (d) => d.processing_status === 'uploaded' || d.processing_status === 'processing'
    );
    if (!hasProcessingDocs) return;

    const interval = setInterval(() => {
      loadDocs();
    }, 3000);

    return () => clearInterval(interval);
  }, [docs, loadDocs]);

  // Handle file uploads
  const handleUploadFile = async (file: File) => {
    const allowed = ['.pdf', '.docx', '.txt', '.pptx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Unsupported file format. Please upload PDF, DOCX, PPTX, or TXT.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds the 20MB limit.');
      return;
    }

    setUploading(true);
    setProcessingStage('Reading document stream...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProcessingStage('Indexing text and structuring chunks...');
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Document archived successfully');
      setIsUploadModalOpen(false);
      await loadDocs();

      if (data.id) {
        setSearchParams({ id: data.id });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProcessingStage('');
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
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${docToDelete.id}`);
      toast.success('Document removed from archive');
      if (selectedDocId === docToDelete.id) {
        setSearchParams({});
      }
      setDocToDelete(null);
      await loadDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to remove document');
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDoc) return;
    setGeneratingSummary(true);
    try {
      const { data } = await api.post('/summarize/generate', {
        document_id: selectedDoc.id,
        target_length: summaryDepth,
      });
      setSummaryContent(data.summary_text || '');
      setSummaryImages(data.images || []);
      toast.success('Study notes generated');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate study notes');
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
      toast.success('Audio discussion generated');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate audio notes');
    } finally {
      setGeneratingPodcast(false);
    }
  };

  const getFileBadge = (type: string) => {
    const t = type.toLowerCase();
    let label = 'DOC';
    if (t.includes('pdf')) label = 'PDF';
    else if (t.includes('doc')) label = 'DOCX';
    else if (t.includes('ppt')) label = 'PPTX';
    else if (t.includes('txt')) label = 'TXT';
    return (
      <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-[2px]">
        {label}
      </span>
    );
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
        {/* Document Context Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-stone-900 dark:border-stone-800">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSearchParams({})}
              className="p-1.5 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-100 transition-colors cursor-pointer select-none"
              title="Back to archive"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              {getFileBadge(selectedDoc.file_type)}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-stone-950 dark:text-stone-50 tracking-tight flex items-center gap-2">
                  <span className="truncate max-w-[200px] sm:max-w-md md:max-w-lg">{selectedDoc.title}</span>
                  <Badge
                    variant={
                      selectedDoc.processing_status === 'ready'
                        ? 'success'
                        : selectedDoc.processing_status === 'error'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {selectedDoc.processing_status === 'ready'
                      ? 'INDEXED'
                      : selectedDoc.processing_status.toUpperCase()}
                  </Badge>
                </h1>
                <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                  {(selectedDoc.file_size / 1024 / 1024).toFixed(2)} MB · ADDED{' '}
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
              variant="primary"
              size="sm"
              onClick={() => navigate(`/chat?docId=${selectedDoc.id}`)}
              leftIcon={<MessageSquare size={13} />}
            >
              Query Material
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDocToDelete(selectedDoc)}
              className="text-stone-500 hover:text-rose-700 dark:hover:text-rose-400"
              title="Delete document"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Architectural Segmented Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 rounded-[2px] w-full sm:w-fit overflow-x-auto no-scrollbar border border-stone-900 dark:border-stone-700">
          <button
            onClick={() => setActiveWorkspaceTab('summary')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-[2px] transition-all cursor-pointer select-none flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${
              activeWorkspaceTab === 'summary'
                ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-50 border border-stone-900 dark:border-stone-600 shadow-[1px_1px_0px_#18181b]'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100'
            }`}
          >
            <BookOpen size={13} />
            <span>[ 01 // STUDY NOTES ]</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('podcast')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-[2px] transition-all cursor-pointer select-none flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${
              activeWorkspaceTab === 'podcast'
                ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-50 border border-stone-900 dark:border-stone-600 shadow-[1px_1px_0px_#18181b]'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100'
            }`}
          >
            <Headphones size={13} />
            <span>[ 02 // AUDIO NOTES ]</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('practice')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-[2px] transition-all cursor-pointer select-none flex items-center gap-2 flex-1 sm:flex-none justify-center whitespace-nowrap ${
              activeWorkspaceTab === 'practice'
                ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-50 border border-stone-900 dark:border-stone-600 shadow-[1px_1px_0px_#18181b]'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100'
            }`}
          >
            <HelpCircle size={13} />
            <span>[ 03 // PRACTICE TOOLS ]</span>
          </button>
        </div>

        {/* Tab 1: Study Notes Canvas */}
        {activeWorkspaceTab === 'summary' && (
          <div className="space-y-6">
            {/* Depth Selector Panel */}
            <Card variant="default">
              <CardHeader className="pb-3 bg-stone-50/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800">
                <CardTitle className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                  // STUDY NOTES SYNTHESIS
                </CardTitle>
                <CardDescription>
                  Configure note depth and coverage for this document.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {summaryDepthOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => setSummaryDepth(opt.value)}
                      className={`p-3 rounded-[2px] border-[1.5px] cursor-pointer transition-all select-none ${
                        summaryDepth === opt.value
                          ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-[2px_2px_0px_#18181b]'
                          : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{opt.label}</span>
                        <span className={`text-[10px] font-mono ${summaryDepth === opt.value ? 'text-stone-300 dark:text-stone-700' : 'text-stone-500'}`}>
                          {opt.wordCount}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-snug ${summaryDepth === opt.value ? 'text-stone-200 dark:text-stone-700' : 'text-stone-500 dark:text-stone-400'}`}>
                        {opt.desc}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                  <span className="text-[11px] font-mono text-stone-500">
                    Target Depth: {summaryDepth} Pages Equivalent
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateSummary}
                    isLoading={generatingSummary}
                    leftIcon={<BookOpen size={13} />}
                  >
                    {summaryContent ? 'Regenerate Study Notes' : 'Generate Study Notes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Rendered Notes Viewer */}
            {summaryContent ? (
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#3f3f46]">
                  <div className="pb-4 mb-6 border-b-[1.5px] border-stone-900 dark:border-stone-700 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-stone-900 dark:text-stone-100">
                        // COMPREHENSIVE STUDY NOTES
                      </h3>
                      <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                        SOURCE: {selectedDoc.original_filename.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="prose prose-stone dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {summaryContent}
                  </div>
                </div>

                {/* Extracted Visual Figures */}
                {summaryImages.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <ImageIcon size={14} /> EXTRACTED FIGURES ({summaryImages.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summaryImages.map((img, i) => (
                        <div key={i} className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-900 p-2 shadow-[2px_2px_0px_#18181b]">
                          <img src={img} alt={`Diagram ${i + 1}`} className="w-full h-auto object-contain max-h-72" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-[2px] border-2 border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-500 space-y-2 font-mono">
                <BookOpen size={24} className="mx-auto text-stone-400" />
                <p className="font-bold text-stone-800 dark:text-stone-200">NO STUDY NOTES GENERATED YET</p>
                <p>Select your desired synthesis depth above and click "Generate Study Notes".</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Audio Notes / Discussion */}
        {activeWorkspaceTab === 'podcast' && (
          <div className="space-y-6">
            <Card variant="default">
              <CardHeader className="flex flex-row items-center justify-between pb-3 bg-stone-50/60 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <CardTitle className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                    // DUAL-HOST AUDIO DISCUSSION
                  </CardTitle>
                  <CardDescription>
                    Conversational dialogue synthesizing the key concepts into an audio episode.
                  </CardDescription>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGeneratePodcast}
                  isLoading={generatingPodcast}
                  leftIcon={<Headphones size={13} />}
                >
                  {podcastUrl ? 'Regenerate Audio' : 'Generate Audio Notes'}
                </Button>
              </CardHeader>

              {podcastUrl && (
                <CardContent className="space-y-4 pt-4">
                  <audio controls src={podcastUrl} className="w-full h-10 border border-stone-900 dark:border-stone-700 rounded-[2px]" />

                  {podcastScript.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-stone-800">
                      <p className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                        // TRANSCRIPT LOG
                      </p>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 font-mono text-xs">
                        {podcastScript.map((line, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 leading-relaxed ${
                              line.speaker === 'A'
                                ? 'bg-stone-100 dark:bg-stone-800/70 text-stone-900 dark:text-stone-100'
                                : 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 ml-4'
                            }`}
                          >
                            <span className="font-bold text-[10px] uppercase tracking-wider block mb-0.5 text-stone-500">
                              [SPEAKER {line.speaker}]
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
                <CardContent className="pt-4">
                  <p className="text-xs font-mono text-stone-500">
                    Click "Generate Audio Notes" to create a paced study discussion based on this material.
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
                <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-1 font-mono font-bold">
                  <HelpCircle size={15} />
                </div>
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Take Knowledge Quiz</span>
                  <ExternalLink size={13} className="text-stone-400" />
                </CardTitle>
                <CardDescription>
                  Generate multiple-choice questions to evaluate retention and identify weak points.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" onClick={() => navigate(`/flashcards?docId=${selectedDoc.id}`)}>
              <CardHeader>
                <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-1 font-mono font-bold">
                  <Layers size={15} />
                </div>
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Study Flashcards</span>
                  <ExternalLink size={13} className="text-stone-400" />
                </CardTitle>
                <CardDescription>
                  Review active-recall index cards generated directly from key definitions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" onClick={() => navigate(`/roadmap?docId=${selectedDoc.id}`)}>
              <CardHeader>
                <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-1 font-mono font-bold">
                  <Map size={15} />
                </div>
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Build Curriculum Blueprint</span>
                  <ExternalLink size={13} className="text-stone-400" />
                </CardTitle>
                <CardDescription>
                  Transform this document into a structured curriculum tree with milestones.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card variant="interactive" onClick={() => navigate(`/chat?docId=${selectedDoc.id}`)}>
              <CardHeader>
                <div className="w-7 h-7 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-1 font-mono font-bold">
                  <MessageSquare size={15} />
                </div>
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Query in Tutor Workspace</span>
                  <ExternalLink size={13} className="text-stone-400" />
                </CardTitle>
                <CardDescription>
                  Ask questions strictly grounded in the content and exact citations of this text.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 1: DOCUMENT ARCHIVE CATALOG
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b-[1.5px] border-stone-900 dark:border-stone-800">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-stone-500 tracking-wider">
            // DOCUMENT ARCHIVE
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
            Course Material Index
          </h1>
          <p className="text-xs font-mono text-stone-500 mt-0.5">
            {docs.length} DOCUMENT(S) INDEXED IN LOCAL REPOSITORY
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsUploadModalOpen(true)}
          leftIcon={<Plus size={14} />}
        >
          Upload Material
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title or filename..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] focus:outline-none focus:border-stone-950 dark:focus:border-stone-100 placeholder-stone-400 text-stone-900 dark:text-stone-100"
          />
        </div>
      </div>

      {/* Archival Documents Table / List */}
      <Card variant="default">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-stone-500 flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin" />
              <span>Scanning document index...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-stone-500 space-y-3">
              <FileText size={24} className="mx-auto text-stone-400" />
              <p className="font-bold text-stone-800 dark:text-stone-200">NO MATERIALS FOUND</p>
              <p>Upload lecture notes, textbooks, or papers to begin studying.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<UploadCloud size={13} />}
                className="mt-2"
              >
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b-[1.5px] border-stone-900 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 text-stone-500 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-4">DOCUMENT / TITLE</th>
                    <th className="py-2.5 px-4">FORMAT</th>
                    <th className="py-2.5 px-4">SIZE</th>
                    <th className="py-2.5 px-4">STATUS</th>
                    <th className="py-2.5 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-sans">
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => setSearchParams({ id: doc.id })}
                      className="hover:bg-stone-100/50 dark:hover:bg-stone-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          {getFileBadge(doc.file_type)}
                          <div className="truncate">
                            <span className="font-bold text-xs text-stone-950 dark:text-stone-50 group-hover:underline">
                              {doc.title}
                            </span>
                            <span className="block text-[10px] font-mono text-stone-400 truncate">
                              {doc.original_filename}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                        {doc.file_type.toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            doc.processing_status === 'ready'
                              ? 'success'
                              : doc.processing_status === 'error'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {doc.processing_status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSearchParams({ id: doc.id })}
                          >
                            Open Workspace
                          </Button>
                          <button
                            type="button"
                            onClick={() => setDocToDelete(doc)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !uploading && setIsUploadModalOpen(false)}
        title="// ARCHIVE NEW MATERIAL"
      >
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 text-center border-2 border-dashed rounded-[2px] cursor-pointer transition-all ${
              dragActive
                ? 'border-stone-900 bg-stone-100 dark:border-stone-100 dark:bg-stone-800'
                : 'border-stone-400 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.pptx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadFile(e.target.files[0]);
                }
              }}
            />

            <UploadCloud size={28} className="mx-auto mb-2 text-stone-700 dark:text-stone-300" />
            <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
              CLICK OR DRAG FILE HERE
            </p>
            <p className="text-[10px] font-mono text-stone-500 mt-1">
              SUPPORTED: PDF, DOCX, PPTX, TXT (MAX 20MB)
            </p>
          </div>

          {uploading && (
            <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-[2px] border border-stone-900 dark:border-stone-700 text-xs font-mono flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-stone-700 dark:text-stone-300" />
              <span>{processingStage || 'Processing file stream...'}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!docToDelete}
        onClose={() => !deleting && setDocToDelete(null)}
        title="// CONFIRM DELETION"
      >
        <div className="space-y-4 text-xs font-mono">
          <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
            Are you sure you want to permanently delete{' '}
            <strong className="text-stone-950 dark:text-stone-50">"{docToDelete?.title}"</strong> from your study archive?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
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
              onClick={handleDelete}
            >
              Delete Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
