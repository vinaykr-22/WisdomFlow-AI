import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { Send, FileText, Bot, User, X, ChevronDown } from 'lucide-react';

interface Doc {
  id: string;
  title: string;
}

interface Msg {
  role: string;
  content: string;
}

export default function Chat() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/documents').then(({ data }) => setDocs(data.documents || []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleDoc = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const msg = input;
    setInput('');

    const userMsg: Msg = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const body = JSON.stringify({
      message: msg,
      conversation_id: convId,
      document_ids: selectedDocIds,
    });

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body,
      });

      if (!res.ok) throw new Error('Request failed');

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantMsg: Msg = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              assistantMsg.content += data.token;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMsg }]);
            }
            if (data.done) {
              setConvId(data.conversation_id);
            }
            if (data.error) {
              assistantMsg.content = `Error: ${data.error}`;
              setMessages((prev) => [...prev.slice(0, -1), { ...assistantMsg }]);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    }
    setStreaming(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
      
      {/* Chat Header / Context Selection */}
      <div className="relative border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Context:</span>
          
          <div className="flex-1 flex flex-wrap items-center gap-2">
            {selectedDocIds.length === 0 ? (
              <span className="text-sm text-slate-400 dark:text-slate-500 italic">General AI Chat</span>
            ) : (
              selectedDocIds.map(id => {
                const doc = docs.find(d => d.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shadow-sm transition-all hover:shadow hover:bg-blue-100 dark:hover:bg-blue-900/50">
                    <FileText size={12} />
                    <span className="max-w-[150px] truncate">{doc?.title || 'Document'}</span>
                    <button onClick={() => toggleDoc(id)} className="hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 rounded-full transition-colors cursor-pointer ml-1">
                      <X size={12} />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocMenu(!showDocMenu)}
              className="flex items-center gap-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Select Documents <ChevronDown size={16} className={`transition-transform ${showDocMenu ? 'rotate-180' : ''}`} />
            </button>
            {convId && (
              <button onClick={() => { setConvId(null); setMessages([]); }} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-4 py-1.5 rounded-xl transition-colors cursor-pointer">
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Menu */}
        {showDocMenu && (
          <div className="absolute z-20 top-full right-4 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl p-3 max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3 px-1 uppercase tracking-wider">Available Documents</p>
            {docs.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 px-1">No uploaded documents available.</p>
            ) : (
              <div className="space-y-1">
                {docs.map((d) => {
                  const isSelected = selectedDocIds.includes(d.id);
                  return (
                    <label key={d.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDoc(d.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className={`text-sm truncate ${isSelected ? 'font-semibold text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>
                        {d.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-sm">
              <Bot size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">How can I help you today?</h3>
              <p className="text-sm max-w-sm mt-2 text-slate-500 dark:text-slate-400">Ask questions about your selected documents, or request a summary, explanation, or study plan.</p>
            </div>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-4 animate-in slide-in-from-bottom-2 duration-300 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400'}`}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 whitespace-pre-wrap leading-relaxed shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
            }`}>
              {m.content || (m.role === 'assistant' ? <span className="animate-pulse">Thinking...</span> : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={selectedDocIds.length > 0 ? `Ask across ${selectedDocIds.length} document(s)...` : "Ask a question..."}
            disabled={streaming}
            rows={1}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[40px] custom-scrollbar"
            style={{ height: 'auto' }}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors cursor-pointer shadow-sm mb-0.5"
          >
            <Send size={18} className="ml-1" />
          </button>
        </div>
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI can make mistakes. Verify important info.</p>
        </div>
      </div>
    </div>
  );
}
