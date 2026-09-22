import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Send,
  FileText,
  Copy,
  Check,
  Plus,
  X,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  HelpCircle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Clock,
  Search,
  CheckSquare,
  Square,
  Loader2,
  Mic,
  Code2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/useToast';

interface Doc {
  id: string;
  title: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
}

interface Msg {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

interface ConversationItem {
  id: string;
  title: string | null;
  document_id: string | null;
  document_ids: string[];
  created_at: string;
}

// Format relative date for conversation history
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

// Formatted Code Block component with copy button
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/80 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Code2 size={13} />
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="p-3 overflow-x-auto leading-relaxed">
        <pre><code>{code}</code></pre>
      </div>
    </div>
  );
}

// Scannable Textbook Markdown Renderer
function FormattedTutorMessage({ content }: { content: string }) {
  const renderParagraph = (text: string, pIndex: number) => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Headings
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={pIndex} className="text-lg font-bold text-[var(--color-text)] mt-4 mb-2 first:mt-0 tracking-tight">
          {trimmed.replace('# ', '')}
        </h1>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={pIndex} className="text-base font-bold text-[var(--color-text)] mt-3.5 mb-1.5 tracking-tight">
          {trimmed.replace('## ', '')}
        </h2>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={pIndex} className="text-sm font-semibold text-[var(--color-text)] mt-3 mb-1">
          {trimmed.replace('### ', '')}
        </h3>
      );
    }

    // Blockquote / Definition
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={pIndex}
          className="border-l-2 border-[var(--color-primary)] pl-3.5 py-1 my-2 text-xs italic text-[var(--color-text-secondary)] bg-[var(--color-primary)]/5 rounded-r"
        >
          {trimmed.replace('> ', '')}
        </blockquote>
      );
    }

    // List item (Bullet)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={pIndex} className="flex items-start gap-2 my-1 pl-1 text-sm text-[var(--color-text-secondary)]">
          <span className="text-[var(--color-primary)] font-bold select-none mt-0.5">•</span>
          <span className="flex-1 leading-relaxed">{renderInlineFormatting(trimmed.substring(2))}</span>
        </div>
      );
    }

    // List item (Numbered)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      return (
        <div key={pIndex} className="flex items-start gap-2 my-1 pl-1 text-sm text-[var(--color-text-secondary)]">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] select-none mt-0.5 min-w-[1.2rem]">
            {numberedMatch[1]}.
          </span>
          <span className="flex-1 leading-relaxed">{renderInlineFormatting(numberedMatch[2])}</span>
        </div>
      );
    }

    // Regular Paragraph
    return (
      <p key={pIndex} className="my-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  };

  // Inline formatting helper for bold, italic, inline code, and math notations
  const renderInlineFormatting = (line: string): React.ReactNode => {
    // Split on inline code (`code`)
    const parts = line.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs border border-slate-200 dark:border-slate-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Handle bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((sub, j) => {
        if (sub.startsWith('**') && sub.endsWith('**') && sub.length > 4) {
          return (
            <strong key={`${i}-${j}`} className="font-semibold text-[var(--color-text)]">
              {sub.slice(2, -2)}
            </strong>
          );
        }
        return sub;
      });
    });
  };

  // Check for fenced code blocks
  const segments: React.ReactNode[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push(
        <div key={`text-${segments.length}`}>
          {textBuffer.map((p, idx) => renderParagraph(p, idx))}
        </div>
      );
      textBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushText();
        inCodeBlock = true;
        codeLang = line.trim().replace('```', '').trim();
        codeBuffer = [];
      } else {
        segments.push(
          <CodeBlock
            key={`code-${segments.length}`}
            code={codeBuffer.join('\n')}
            language={codeLang}
          />
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      }
    } else if (inCodeBlock) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  // Flush remaining buffers
  if (inCodeBlock && codeBuffer.length > 0) {
    segments.push(
      <CodeBlock
        key={`code-${segments.length}`}
        code={codeBuffer.join('\n')}
        language={codeLang}
      />
    );
  } else {
    flushText();
  }

  return <div className="space-y-1">{segments}</div>;
}

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Document Library & Context
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Conversations & Chat State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Layout Panels
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'sources' | 'history'>('sources');

  // References
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // Load available documents & past conversations
  const loadInitialData = useCallback(async () => {
    try {
      const [docsRes, convsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/chat/conversations').catch(() => ({ data: { conversations: [] } })),
      ]);

      const fetchedDocs: Doc[] = docsRes.data.documents || [];
      setDocs(fetchedDocs);
      setConversations(convsRes.data.conversations || []);

      // Check URL search params for incoming document ID (e.g. ?docId=xyz or ?doc=xyz)
      const queryDocId = searchParams.get('docId') || searchParams.get('doc');
      if (queryDocId) {
        const docExists = fetchedDocs.some((d) => d.id === queryDocId);
        if (docExists) {
          setSelectedDocIds([queryDocId]);
          toast.info('Study Context Loaded', 'Tutor grounded in selected document');
        }
      }
    } catch {
      toast.error('Failed to load study data');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Toggle document selection for multi-doc RAG
  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const selectAllDocs = () => {
    if (selectedDocIds.length === docs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(docs.map((d) => d.id));
    }
  };

  // Load a past conversation
  const loadConversation = async (conversationId: string) => {
    if (streaming) return;
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}`);
      setConvId(data.id);
      setMessages(data.messages || []);
      if (data.document_ids && data.document_ids.length > 0) {
        setSelectedDocIds(data.document_ids);
      }
      toast.info('Session Restored', data.title || 'Loaded past study conversation');
    } catch {
      toast.error('Failed to load conversation history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reset to new clean session
  const startNewSession = () => {
    if (streaming) return;
    setConvId(null);
    setMessages([]);
    setInput('');
    if (textareaRef.current) textareaRef.current.focus();
    toast.info('New Study Session', 'Workspace ready for new questions');
  };

  // Core Send Message function (SSE streaming)
  const sendMessage = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt ?? input).trim();
    if (!textToSend || streaming) return;

    if (!overridePrompt) {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    const userMsg: Msg = { role: 'user', content: textToSend, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const body = JSON.stringify({
      message: textToSend,
      conversation_id: convId,
      document_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
    });

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body,
      });

      if (!res.ok) throw new Error(`Tutor request failed (${res.status})`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Failed to open response stream');

      const decoder = new TextDecoder();
      const assistantMsg: Msg = { role: 'assistant', content: '', created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.token) {
              assistantMsg.content += payload.token;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMsg }]);
            }
            if (payload.done) {
              if (payload.conversation_id) {
                setConvId(payload.conversation_id);
                // Refresh conversations list silently
                api.get('/chat/conversations').then((res) => {
                  setConversations(res.data.conversations || []);
                }).catch(() => {});
              }
            }
            if (payload.error) {
              assistantMsg.content = `Error: ${payload.error}`;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMsg }]);
            }
          } catch {
            // ignore non-JSON stream fragments
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || 'Connection error with AI Tutor';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Unable to complete response: ${errorMsg}. Please try again.` },
      ]);
      toast.error('Response Error', errorMsg);
    } finally {
      setStreaming(false);
    }
  };

  // Follow-up actions handler
  const handleFollowUpAction = (type: 'explain' | 'simplify' | 'example' | 'quiz' | 'summarize') => {
    if (streaming) return;
    const prompts = {
      explain: 'Can you explain your previous point differently, using an intuitive mental model or practical analogy?',
      simplify: 'Please break that down into simpler, plain-English terms with minimal jargon.',
      example: 'Could you give a concrete, real-world case study or worked numerical example illustrating this?',
      quiz: 'Quiz me on what you just explained with a challenging conceptual question to test my understanding.',
      summarize: 'Summarize the core takeaways from your last answer into 3 concise bullet points.',
    };
    sendMessage(prompts[type]);
  };

  // Filtered documents list for side panel
  const filteredDocs = docs.filter((d) =>
    d.title.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const activeDocTitles = docs
    .filter((d) => selectedDocIds.includes(d.id))
    .map((d) => d.title);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
      
      {/* 1. Header Toolbar */}
      <div className="h-13 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
            <BookOpen size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[var(--color-text)] truncate">
                AI Study Tutor
              </h1>
              {selectedDocIds.length > 0 ? (
                <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                  {selectedDocIds.length} source{selectedDocIds.length > 1 ? 's' : ''} active
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
                  General Tutor
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Voice Tutor Switch */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/voice-tutor')}
            className="text-xs text-[var(--color-text-muted)] hidden md:inline-flex"
            leftIcon={<Mic size={14} />}
          >
            Voice Tutor
          </Button>

          {/* New Session Button */}
          {(messages.length > 0 || convId) && (
            <Button
              size="sm"
              variant="outline"
              onClick={startNewSession}
              disabled={streaming}
              leftIcon={<RotateCcw size={13} />}
            >
              <span className="hidden sm:inline">New Session</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}

          {/* Toggle Secondary Context Panel */}
          <Button
            size="sm"
            variant={isSidePanelOpen ? 'secondary' : 'outline'}
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            title={isSidePanelOpen ? 'Collapse study panel' : 'Open study panel'}
            leftIcon={isSidePanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          >
            <span className="hidden sm:inline">Context & History</span>
            <span className="sm:hidden">Context</span>
            {selectedDocIds.length > 0 && !isSidePanelOpen && (
              <span className="w-4 h-4 ml-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] flex items-center justify-center font-bold">
                {selectedDocIds.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Main Workspace Split View */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left / Center: Conversation Stream & Composer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-surface)]">
          
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            
            {/* Empty State: Grounded Study Workspace */}
            {messages.length === 0 && !loadingHistory && (
              <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-8 animate-in fade-in duration-300">
                <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-3">
                  <Lightbulb size={22} />
                </div>
                
                <h2 className="text-base font-bold text-[var(--color-text)] mb-1">
                  What would you like to master today?
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] max-w-md mb-6 leading-relaxed">
                  {selectedDocIds.length > 0
                    ? `Currently grounded in ${selectedDocIds.length} document${selectedDocIds.length > 1 ? 's' : ''}. Inquire about formulas, break down arguments, or test your retention.`
                    : 'Select documents from the right panel to ground answers in your course readings, or start asking general study questions.'}
                </p>

                {/* Grounded Study Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                  <button
                    type="button"
                    onClick={() => sendMessage('Can you explain the main theoretical concept in this material step-by-step with clear intuition?')}
                    className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                        Explain Core Concept
                      </span>
                      <ArrowRight size={12} className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                      Step-by-step breakdown of difficult theories or arguments.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage('Give me a concrete, real-world case study or scenario that illustrates how this works in practice.')}
                    className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                        Real-World Application
                      </span>
                      <ArrowRight size={12} className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                      Explore concrete scenarios showing practical mechanics.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage('Test my understanding by asking me a challenging conceptual question on this topic. Wait for my answer.')}
                    className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                        Test My Retention
                      </span>
                      <ArrowRight size={12} className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                      Active recall challenge evaluating your conceptual mastery.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage('List the top 5 essential definitions, equations, or laws I must memorize from this material.')}
                    className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                        Key Definitions
                      </span>
                      <ArrowRight size={12} className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                      Curated summary of high-priority terminology and formulas.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Dialogue Thread */}
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              const isLast = idx === messages.length - 1;

              return (
                <div
                  key={idx}
                  className={`max-w-3xl mx-auto flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
                >
                  {/* Message Author & Context Metadata */}
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                      {isUser ? 'You' : 'AI Tutor'}
                    </span>
                    {m.created_at && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {formatRelativeTime(m.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Message Body Container */}
                  {isUser ? (
                    <div className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm max-w-[88%] border border-slate-200 dark:border-slate-700 leading-relaxed shadow-xs">
                      {m.content}
                    </div>
                  ) : (
                    <div className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-xs space-y-3">
                      {/* Tutor Message Content */}
                      {m.content ? (
                        <FormattedTutorMessage content={m.content} />
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] py-2">
                          <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />
                          <span>Formulating explanation from study material...</span>
                        </div>
                      )}

                      {/* Study Action Bar (Shown when response is complete) */}
                      {m.content && (!streaming || !isLast) && (
                        <div className="pt-3 mt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                          {/* Follow-up Prompts */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-medium text-[var(--color-text-muted)] mr-1 hidden sm:inline">
                              Explore further:
                            </span>
                            <button
                              onClick={() => handleFollowUpAction('explain')}
                              disabled={streaming}
                              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Explain differently
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('simplify')}
                              disabled={streaming}
                              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Simplify
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('example')}
                              disabled={streaming}
                              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Give example
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('quiz')}
                              disabled={streaming}
                              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <HelpCircle size={11} /> Quiz me
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('summarize')}
                              disabled={streaming}
                              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Summarize
                            </button>
                          </div>

                          {/* Copy Response Action */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(m.content);
                              toast.info('Copied', 'Explanation copied to clipboard');
                            }}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer ml-auto"
                            title="Copy explanation"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={bottomRef} className="h-2" />
          </div>

          {/* 3. Professional Composer Dock */}
          <div className="p-3 sm:p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="max-w-3xl mx-auto space-y-2">
              
              {/* Active Grounding Context Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-medium text-[var(--color-text-muted)] mr-1">
                  Context:
                </span>
                {selectedDocIds.length === 0 ? (
                  <span className="text-xs text-[var(--color-text-muted)] italic">
                    General study mode (no document attached)
                  </span>
                ) : (
                  selectedDocIds.map((id) => {
                    const doc = docs.find((d) => d.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
                      >
                        <FileText size={11} />
                        <span className="max-w-[140px] truncate">{doc?.title || 'Document'}</span>
                        <button
                          type="button"
                          onClick={() => toggleDoc(id)}
                          className="hover:opacity-75 transition-opacity cursor-pointer ml-0.5"
                          title="Remove from context"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })
                )}

                {/* Quick Add Context Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSidePanelOpen(true);
                    setSidePanelTab('sources');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer px-1 py-0.5"
                >
                  <Plus size={11} />
                  <span>{selectedDocIds.length === 0 ? 'Attach document' : 'Add more'}</span>
                </button>
              </div>

              {/* Textarea Input Container */}
              <div className="relative flex items-end gap-2 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] focus-within:border-[var(--color-primary)] transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // auto-resize up to max-h-36
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 144)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    selectedDocIds.length > 0
                      ? `Ask a question grounded in ${activeDocTitles.slice(0, 2).join(', ')}${selectedDocIds.length > 2 ? '...' : ''}`
                      : 'Ask a study question or request an explanation...'
                  }
                  disabled={streaming}
                  rows={1}
                  className="flex-1 bg-transparent px-2 py-1 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none resize-none max-h-36 min-h-[36px] leading-relaxed"
                />

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => sendMessage()}
                  disabled={streaming || !input.trim()}
                  isLoading={streaming}
                  className="h-8 px-3 rounded-md mb-0.5 flex-shrink-0"
                >
                  <Send size={13} className={input.trim() ? 'translate-x-0.5' : ''} />
                </Button>
              </div>

              {/* Composer Footnote */}
              <div className="hidden sm:flex items-center justify-between px-1 text-[10px] text-[var(--color-text-muted)]">
                <span>Press <kbd className="px-1 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[9px]">Enter</kbd> to ask, <kbd className="px-1 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[9px]">Shift+Enter</kbd> for newline</span>
                <span>WisdomFlow AI Tutor · Grounded RAG</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Secondary Learning Context & History Panel */}
        {isSidePanelOpen && (
          <>
            {/* Mobile / Tablet Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 z-30 lg:hidden backdrop-blur-xs transition-opacity"
              onClick={() => setIsSidePanelOpen(false)}
              aria-hidden="true"
            />

            <aside className="fixed lg:static inset-y-0 right-0 z-40 w-full sm:w-85 lg:w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col flex-shrink-0 shadow-2xl lg:shadow-none animate-in slide-in-from-right-4 duration-200">
            
            {/* Panel Tab Switcher */}
            <div className="h-11 px-3 border-b border-[var(--color-border)] flex items-center justify-between gap-1 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidePanelTab('sources')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    sidePanelTab === 'sources'
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Sources ({selectedDocIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelTab('history')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    sidePanelTab === 'history'
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Sessions ({conversations.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSidePanelOpen(false)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                title="Close panel"
              >
                <X size={14} />
              </button>
            </div>

            {/* TAB 1: Source Documents */}
            {sidePanelTab === 'sources' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search & Bulk Toggle */}
                <div className="p-3 border-b border-[var(--color-border)] space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Filter documents..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {docs.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-0.5">
                      <span>{selectedDocIds.length} of {docs.length} selected</span>
                      <button
                        type="button"
                        onClick={selectAllDocs}
                        className="text-[11px] text-[var(--color-primary)] hover:underline cursor-pointer font-medium"
                      >
                        {selectedDocIds.length === docs.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {docs.length === 0 ? (
                    <div className="text-center py-8 px-4 text-xs text-[var(--color-text-muted)] space-y-2">
                      <FileText size={20} className="mx-auto opacity-50" />
                      <p>No documents uploaded yet.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/documents')}
                        className="text-xs"
                      >
                        Upload to Library
                      </Button>
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <p className="text-center py-6 text-xs text-[var(--color-text-muted)]">
                      No documents match &ldquo;{docSearchQuery}&rdquo;
                    </p>
                  ) : (
                    filteredDocs.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleDoc(doc.id)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer select-none ${
                            isSelected
                              ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                              : 'border-transparent hover:bg-[var(--color-surface-hover)]'
                          }`}
                        >
                          <div className="mt-0.5 text-[var(--color-primary)]">
                            {isSelected ? <CheckSquare size={14} /> : <Square size={14} className="text-[var(--color-text-muted)]" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`text-xs truncate ${isSelected ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                              {doc.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                              <span className="uppercase font-medium">
                                {doc.file_type || 'DOC'}
                              </span>
                              {doc.created_at && (
                                <>
                                  <span>•</span>
                                  <span>{formatRelativeTime(doc.created_at)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Session History */}
            {sidePanelTab === 'history' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    Recent Dialogues
                  </span>
                  <button
                    type="button"
                    onClick={startNewSession}
                    className="text-xs text-[var(--color-primary)] hover:underline font-medium cursor-pointer"
                  >
                    + New
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 px-4 text-xs text-[var(--color-text-muted)] space-y-1">
                      <Clock size={18} className="mx-auto opacity-50" />
                      <p>No past study sessions found.</p>
                      <p className="text-[11px]">Your conversations are saved automatically.</p>
                    </div>
                  ) : (
                    conversations.map((c) => {
                      const isActive = c.id === convId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => loadConversation(c.id)}
                          className={`p-2.5 rounded-lg border transition-colors cursor-pointer select-none text-left ${
                            isActive
                              ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10'
                              : 'border-transparent hover:bg-[var(--color-surface-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                              <Clock size={10} />
                              {formatRelativeTime(c.created_at)}
                            </span>
                            {c.document_ids && c.document_ids.length > 0 && (
                              <Badge size="sm" variant="neutral">
                                {c.document_ids.length} doc{c.document_ids.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className={`text-xs truncate ${isActive ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                            {c.title || 'Untitled Study Dialogue'}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
      </div>
    </div>
  );
}
