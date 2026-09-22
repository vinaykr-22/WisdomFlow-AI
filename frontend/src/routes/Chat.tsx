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
    <div className="flex flex-col h-[calc(100vh-6.5rem)] rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-[var(--color-surface)] overflow-hidden shadow-[2px_2px_0px_#18181b]">
      
      {/* 1. Header Technical Bar */}
      <div className="h-12 px-4 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-6 h-6 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold shadow-[1px_1px_0px_#18181b]">
            T
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs font-mono font-bold tracking-wider text-stone-900 dark:text-stone-100 uppercase truncate">
              [ TUTOR WORKSPACE // STUDY DIALOGUE ]
            </h1>
            {selectedDocIds.length > 0 ? (
              <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                {selectedDocIds.length} ACTIVE SOURCE{selectedDocIds.length > 1 ? 'S' : ''}
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
                OPEN WORKSPACE
              </Badge>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/voice-tutor')}
            className="text-xs font-mono hidden md:inline-flex"
            leftIcon={<Mic size={13} />}
          >
            AUDIO SESSION
          </Button>

          {(messages.length > 0 || convId) && (
            <Button
              size="sm"
              variant="outline"
              onClick={startNewSession}
              disabled={streaming}
              leftIcon={<RotateCcw size={12} />}
            >
              <span className="hidden sm:inline">RESET SESSION</span>
              <span className="sm:hidden">RESET</span>
            </Button>
          )}

          <Button
            size="sm"
            variant={isSidePanelOpen ? 'secondary' : 'outline'}
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            title={isSidePanelOpen ? 'Collapse study panel' : 'Open study panel'}
            leftIcon={isSidePanelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          >
            <span className="hidden sm:inline">SOURCES & ARCHIVE</span>
            <span className="sm:hidden">PANEL</span>
            {selectedDocIds.length > 0 && !isSidePanelOpen && (
              <span className="ml-1 px-1 py-0.2 rounded-[2px] bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-mono text-[10px] font-bold">
                {selectedDocIds.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Main Workspace Split View */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Center: Conversation Stream & Outlined Composer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-bg)]">
          
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            
            {/* Empty State: Technical Study Workspace */}
            {messages.length === 0 && !loadingHistory && (
              <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-6">
                <div className="w-12 h-12 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mb-4 shadow-[2px_2px_0px_#18181b]">
                  <BookOpen size={20} />
                </div>
                
                <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500 mb-1">
                  [ INQUIRY WORKSPACE // READY ]
                </span>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2 font-serif">
                  Ground questions in course readings or examine specific formulas
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mb-6 leading-relaxed">
                  {selectedDocIds.length > 0
                    ? `Currently grounded in ${selectedDocIds.length} active reading${selectedDocIds.length > 1 ? 's' : ''}. Select an inquiry topic below or draft a specific question in the composer.`
                    : 'Attach reference documents from the right panel to ground answers in primary materials, or begin an open inquiry.'}
                </p>

                {/* Grounded Technical Study Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                  <button
                    type="button"
                    onClick={() => sendMessage('Can you explain the main theoretical concept in this material step-by-step with clear intuition?')}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] shadow-[2px_2px_0px_#18181b] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100">
                        01 // CORE EXPLANATION
                      </span>
                      <ArrowRight size={13} className="text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      Structured breakdown of foundational laws, theories, and arguments.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage('Give me a concrete, real-world case study or scenario that illustrates how this works in practice.')}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] shadow-[2px_2px_0px_#18181b] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100">
                        02 // WORKED APPLICATION
                      </span>
                      <ArrowRight size={13} className="text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      Concrete mechanics and real-world applied scenarios.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage('Test my understanding by asking me a challenging conceptual question on this topic. Wait for my answer.')}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] shadow-[2px_2px_0px_#18181b] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100">
                        03 // RETENTION CHECK
                      </span>
                      <ArrowRight size={13} className="text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      Active recall challenge evaluating conceptual mastery.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage('List the top 5 essential definitions, equations, or laws I must memorize from this material.')}
                    className="p-3.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 hover:translate-x-[1px] hover:translate-y-[1px] shadow-[2px_2px_0px_#18181b] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold uppercase text-stone-900 dark:text-stone-100">
                        04 // KEY AXIOMS & FORMULAS
                      </span>
                      <ArrowRight size={13} className="text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      High-priority terminology, definitions, and equations.
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
                  className="max-w-3xl mx-auto flex flex-col space-y-2"
                >
                  {/* Message Author & Technical Label */}
                  <div className={`flex items-center gap-2 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-mono text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      {isUser ? '[ STUDENT // INQUIRY ]' : '[ TUTOR // REFERENCE MEMORANDUM ]'}
                    </span>
                    {m.created_at && (
                      <span className="font-mono text-[10px] text-stone-400">
                        {formatRelativeTime(m.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Message Body Container */}
                  {isUser ? (
                    <div className="self-end max-w-[85%] p-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm leading-relaxed shadow-[2px_2px_0px_#18181b]">
                      {m.content}
                    </div>
                  ) : (
                    <div className="w-full rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-[2px_2px_0px_#18181b] space-y-4">
                      {/* Tutor Message Content */}
                      {m.content ? (
                        <FormattedTutorMessage content={m.content} />
                      ) : (
                        <div className="flex items-center gap-2.5 font-mono text-xs text-stone-600 dark:text-stone-400 py-3">
                          <Loader2 size={14} className="animate-spin text-stone-900 dark:text-stone-100" />
                          <span>SYNTHESIZING EXPLANATION FROM SOURCE TEXTS...</span>
                        </div>
                      )}

                      {/* Study Action Bar (Shown when response is complete) */}
                      {m.content && (!streaming || !isLast) && (
                        <div className="pt-3 border-t border-dashed border-stone-300 dark:border-stone-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                          {/* Follow-up Prompts */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold uppercase text-stone-500 mr-1 hidden sm:inline">
                              ACTIONS:
                            </span>
                            <button
                              onClick={() => handleFollowUpAction('explain')}
                              disabled={streaming}
                              className="px-2 py-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer disabled:opacity-50"
                            >
                              [ RE-EXPLAIN ]
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('simplify')}
                              disabled={streaming}
                              className="px-2 py-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer disabled:opacity-50"
                            >
                              [ SIMPLIFY ]
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('example')}
                              disabled={streaming}
                              className="px-2 py-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer disabled:opacity-50"
                            >
                              [ CONCRETE EXAMPLE ]
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('quiz')}
                              disabled={streaming}
                              className="px-2 py-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <HelpCircle size={10} /> [ TEST RETENTION ]
                            </button>
                            <button
                              onClick={() => handleFollowUpAction('summarize')}
                              disabled={streaming}
                              className="px-2 py-1 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer disabled:opacity-50"
                            >
                              [ SUMMARIZE ]
                            </button>
                          </div>

                          {/* Copy Response Action */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(m.content);
                              toast.info('Copied', 'Explanation copied to clipboard');
                            }}
                            className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer ml-auto"
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

          {/* 3. Outlined Technical Composer Dock */}
          <div className="p-3 sm:p-4 border-t-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
            <div className="max-w-3xl mx-auto space-y-2">
              
              {/* Active Grounding Context Bar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-mono text-[10px] font-bold uppercase text-stone-500 mr-1">
                  CONTEXT:
                </span>
                {selectedDocIds.length === 0 ? (
                  <span className="font-mono text-[11px] text-stone-500 italic">
                    [ GENERAL TUTOR // NO DOCUMENT ATTACHED ]
                  </span>
                ) : (
                  selectedDocIds.map((id) => {
                    const doc = docs.find((d) => d.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-semibold bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-900 dark:border-stone-700"
                      >
                        <FileText size={10} />
                        <span className="max-w-[140px] truncate">{doc?.title || 'DOCUMENT'}</span>
                        <button
                          type="button"
                          onClick={() => toggleDoc(id)}
                          className="hover:text-red-600 transition-colors cursor-pointer ml-0.5"
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
                  className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer px-1 py-0.5"
                >
                  <Plus size={10} />
                  <span>{selectedDocIds.length === 0 ? '[ + ATTACH READING ]' : '[ + ADD MORE ]'}</span>
                </button>
              </div>

              {/* Textarea Input Container */}
              <div className="relative flex items-end gap-2 p-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-950 focus-within:shadow-[2px_2px_0px_#18181b] transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
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
                      ? `Inquire about ${activeDocTitles.slice(0, 2).join(', ')}${selectedDocIds.length > 2 ? '...' : ''}`
                      : 'Draft a study question or inquiry...'
                  }
                  disabled={streaming}
                  rows={1}
                  className="flex-1 bg-transparent px-2 py-1 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none resize-none max-h-36 min-h-[36px] leading-relaxed"
                />

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => sendMessage()}
                  disabled={streaming || !input.trim()}
                  isLoading={streaming}
                  className="h-8 px-3 rounded-[2px] mb-0.5 flex-shrink-0"
                >
                  <Send size={13} className={input.trim() ? 'translate-x-0.5' : ''} />
                </Button>
              </div>

              {/* Composer Technical Footnote */}
              <div className="hidden sm:flex items-center justify-between px-1 font-mono text-[10px] text-stone-500">
                <span>PRESS <kbd className="px-1 py-0.2 bg-stone-200 dark:bg-stone-800 border border-stone-400 dark:border-stone-600 rounded-[2px]">ENTER</kbd> TO TRANSMIT, <kbd className="px-1 py-0.2 bg-stone-200 dark:bg-stone-800 border border-stone-400 dark:border-stone-600 rounded-[2px]">SHIFT+ENTER</kbd> FOR NEWLINE</span>
                <span>WISDOMFLOW STUDY ENGINE // ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Secondary Learning Context & History Panel */}
        {isSidePanelOpen && (
          <>
            <div
              className="fixed inset-0 bg-stone-900/50 z-30 lg:hidden backdrop-blur-xs transition-opacity"
              onClick={() => setIsSidePanelOpen(false)}
              aria-hidden="true"
            />

            <aside className="fixed lg:static inset-y-0 right-0 z-40 w-full sm:w-85 lg:w-80 border-l-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 flex flex-col flex-shrink-0 shadow-2xl lg:shadow-none animate-in slide-in-from-right-4 duration-150">
            
            {/* Panel Tab Switcher */}
            <div className="h-11 px-3 border-b-[1.5px] border-stone-900 dark:border-stone-700 flex items-center justify-between gap-1 flex-shrink-0 bg-stone-100 dark:bg-stone-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidePanelTab('sources')}
                  className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                    sidePanelTab === 'sources'
                      ? 'border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-[1px_1px_0px_#18181b]'
                      : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  SOURCES ({selectedDocIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelTab('history')}
                  className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                    sidePanelTab === 'history'
                      ? 'border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-[1px_1px_0px_#18181b]'
                      : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  SESSIONS ({conversations.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSidePanelOpen(false)}
                className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                title="Close panel"
              >
                <X size={14} />
              </button>
            </div>

            {/* TAB 1: Source Documents */}
            {sidePanelTab === 'sources' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search & Bulk Toggle */}
                <div className="p-3 border-b border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Filter readings..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1 text-xs rounded-[2px] border border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                    />
                  </div>

                  {docs.length > 0 && (
                    <div className="flex items-center justify-between font-mono text-[10px] text-stone-500 px-0.5">
                      <span>{selectedDocIds.length} OF {docs.length} SELECTED</span>
                      <button
                        type="button"
                        onClick={selectAllDocs}
                        className="text-stone-900 dark:text-stone-100 underline cursor-pointer font-bold"
                      >
                        {selectedDocIds.length === docs.length ? 'DESELECT ALL' : 'SELECT ALL'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {docs.length === 0 ? (
                    <div className="text-center py-8 px-4 text-xs text-stone-500 space-y-2">
                      <FileText size={20} className="mx-auto opacity-40" />
                      <p className="font-mono text-[11px]">NO READINGS CATALOGED</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/documents')}
                        className="text-xs"
                      >
                        ARCHIVE CATALOG
                      </Button>
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <p className="text-center py-6 font-mono text-xs text-stone-400">
                      NO MATCHES FOUND
                    </p>
                  ) : (
                    filteredDocs.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleDoc(doc.id)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-[2px] border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-[1px_1px_0px_#18181b]'
                              : 'border-transparent hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                          }`}
                        >
                          <div className="mt-0.5 text-stone-900 dark:text-stone-100">
                            {isSelected ? <CheckSquare size={13} /> : <Square size={13} className="text-stone-400" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`text-xs truncate ${isSelected ? 'font-bold text-stone-900 dark:text-stone-100' : 'text-stone-700 dark:text-stone-300'}`}>
                              {doc.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[9px] text-stone-500 uppercase">
                              <span>{doc.file_type || 'DOC'}</span>
                              {doc.created_at && (
                                <>
                                  <span>//</span>
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
                <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-100 dark:bg-stone-800">
                  <span className="font-mono text-[10px] font-bold uppercase text-stone-900 dark:text-stone-100">
                    PAST SESSIONS
                  </span>
                  <button
                    type="button"
                    onClick={startNewSession}
                    className="font-mono text-[10px] text-stone-900 dark:text-stone-100 underline font-bold cursor-pointer uppercase"
                  >
                    + NEW
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 px-4 text-xs text-stone-500 space-y-1">
                      <Clock size={16} className="mx-auto opacity-40" />
                      <p className="font-mono text-[11px]">NO ARCHIVED SESSIONS</p>
                      <p className="text-[10px]">Dialogues are archived automatically.</p>
                    </div>
                  ) : (
                    conversations.map((c) => {
                      const isActive = c.id === convId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => loadConversation(c.id)}
                          className={`p-2.5 rounded-[2px] border transition-all cursor-pointer select-none text-left ${
                            isActive
                              ? 'border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-[1px_1px_0px_#18181b]'
                              : 'border-transparent hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] text-stone-500 flex items-center gap-1 uppercase">
                              <Clock size={9} />
                              {formatRelativeTime(c.created_at)}
                            </span>
                            {c.document_ids && c.document_ids.length > 0 && (
                              <Badge size="sm" variant="neutral">
                                {c.document_ids.length} DOC
                              </Badge>
                            )}
                          </div>
                          <p className={`text-xs truncate ${isActive ? 'font-bold text-stone-900 dark:text-stone-100' : 'text-stone-700 dark:text-stone-300'}`}>
                            {c.title || 'Untitled Dialogue'}
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
