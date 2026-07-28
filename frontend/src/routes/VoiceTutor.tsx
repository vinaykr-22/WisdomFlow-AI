import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getWsUrl } from '../api/client';
import { useAuthStore } from '../stores/auth';
import RadialVisualizer from './RadialVisualizer';
import { X, MessageSquare } from 'lucide-react';

type State = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Doc { id: string; title: string; }
interface ChatMsg { role: 'user' | 'assistant'; content: string; }

/* ── Silence detection threshold in ms ── */
const SILENCE_THRESHOLD_MS = 1500;
/* ── Max listening duration before forced send ── */
const LISTENING_TIMEOUT_MS = 10_000;
/* ── Max waiting for backend after audio sent ── */
const THINKING_TIMEOUT_MS = 15_000;

interface VoiceTutorProps {
  onClose?: () => void;
}

export default function VoiceTutor({ onClose }: VoiceTutorProps = {}) {
  const [state, setState] = useState<State>('idle');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const navigate = useNavigate();
  const stateRef = useRef<State>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBufRef = useRef<BlobPart[]>([]);
  const hadSpeechRef = useRef(false);
  const sentenceBufRef = useRef<BlobPart[]>([]);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);
  const responseCompleteRef = useRef(false);
  const listeningTimeoutRef = useRef<number | null>(null);
  const thinkingTimeoutRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  useEffect(() => {
    api.get('/documents').then(({ data }) => setDocs(data.documents || []));
  }, []);

  const setStateSafe = useCallback((s: State) => {
    stateRef.current = s;
    setState(s);
  }, []);

  /* ───────────────────────── WebSocket helpers ───────────────────────── */

  const ensureWs = useCallback(async (): Promise<WebSocket | null> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }
    let token = useAuthStore.getState().accessToken || localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        const { data } = await api.post('/auth/refresh', { refresh_token: refresh });
        token = data.access_token;
        if (token) useAuthStore.getState().setTokens(token, refresh);
      } catch {
        /* fallback */
      }
    }
    if (!token) return null;
    const docParam = docId ? `&document_id=${encodeURIComponent(docId)}` : '';
    const ws = new WebSocket(
      getWsUrl(`/api/v1/voice/ws?token=${token}${docParam}`),
    );
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    return ws;
  }, [docId]);

  /* Reset WebSocket whenever selected document changes */
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [docId]);

  /* ───────────────────────── Microphone pre-warming ───────────────────────── */

  const ensureMicStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  /* Pre-warm mic on mount so the first click is instant */
  useEffect(() => {
    ensureMicStream().catch(() => {
      /* User hasn't granted permission yet — that's fine, we'll ask on click */
    });

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───────────────────────── Stop / cleanup ───────────────────────── */

  const stopSession = useCallback(() => {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
    if (thinkingTimeoutRef.current) {
      clearTimeout(thinkingTimeoutRef.current);
      thinkingTimeoutRef.current = null;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (silenceTimerRef.current) cancelAnimationFrame(silenceTimerRef.current);
    audioRef.current?.pause();
    audioBufRef.current = [];
    sentenceBufRef.current = [];
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    responseCompleteRef.current = false;
    hadSpeechRef.current = false;
    setStateSafe('idle');
    /* Keep WS + mic stream alive for reuse — only tear them down on unmount */
  }, [setStateSafe]);

  /* ───────────────────────── Recording with streaming chunks ───────────────────────── */

  const startListening = useCallback(async () => {
    if (recorderRef.current) return; // already recording
    try {
      const stream = await ensureMicStream();

      const audioCtx = new AudioContext();
      await audioCtx.resume();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size) chunks.push(e.data);
      };

      /* ── Shared stop helper (silence detector + timeout both call this) ── */
      const stopRecording = () => {
        stopRecordingRef.current = null;
        if (!recorderRef.current) return;
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
          listeningTimeoutRef.current = null;
        }
        if (thinkingTimeoutRef.current) {
          clearTimeout(thinkingTimeoutRef.current);
          thinkingTimeoutRef.current = null;
        }
        cancelAnimationFrame(silenceTimerRef.current!);
        silenceTimerRef.current = null;
        recorder.stop();
        audioCtx.close();
        recorderRef.current = null;
        audioCtxRef.current = null;
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mime });
          blob.arrayBuffer().then(buf => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(buf);
            } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
              const ws = wsRef.current;
              const onOpen = () => { ws.removeEventListener('open', onOpen); ws.send(buf); };
              ws.addEventListener('open', onOpen);
            }
          });
        }
        setStateSafe('thinking');
        thinkingTimeoutRef.current = window.setTimeout(stopSession, THINKING_TIMEOUT_MS);
      };

      stopRecordingRef.current = stopRecording;

      let silenceStart = 0;
      hadSpeechRef.current = false;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let frameCount = 0;

      const checkSilence = () => {
        if (stateRef.current !== 'listening') return;
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128 - 1;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        /* Debug: log RMS once per second */
        frameCount++;
        if (frameCount % 60 === 0) console.log('rms:', rms.toFixed(4), 'hadSpeech:', hadSpeechRef.current);

        if (rms >= 0.002) {
          silenceStart = 0;
          hadSpeechRef.current = true;
        } else {
          if (silenceStart === 0) silenceStart = Date.now();
          else if (
            Date.now() - silenceStart > SILENCE_THRESHOLD_MS
          ) {
            stopRecording();
            return;
          }
        }
        silenceTimerRef.current = requestAnimationFrame(checkSilence);
      };

      recorder.start(100);
      setStateSafe('listening');
      silenceTimerRef.current = requestAnimationFrame(checkSilence);
    } catch {
      alert('Microphone access denied. Please allow microphone permissions.');
      wsRef.current = null;
      setStateSafe('idle');
    }
  }, [setStateSafe, ensureMicStream]);

  /* ───────────────────────── Streaming audio playback (per-sentence) ───────────────────────── */

  const playNextInQueue = useCallback(() => {
    if (isPlayingRef.current) return;
    /* Nothing queued — if response is complete, go back to listening */
    if (audioQueueRef.current.length === 0) {
      if (responseCompleteRef.current) startListening();
      return;
    }
    const blob = audioQueueRef.current.shift()!;
    const url = URL.createObjectURL(blob);
    isPlayingRef.current = true;
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.onended = () => {
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        playNextInQueue();
      };
      audioRef.current.play().catch(() => {
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        playNextInQueue();
      });
    }
  }, [startListening]);

  /* ───────────────────────── Mic button handler ───────────────────────── */

  const handleMicClick = useCallback(async () => {
    if (stateRef.current === 'listening') {
      if (stopRecordingRef.current) {
        stopRecordingRef.current();
        return;
      }
    }
    if (stateRef.current !== 'idle') {
      stopSession();
      return;
    }

    audioBufRef.current = [];
    setMessages([]);

    /* Ensure WS is open (may reconnect if previous was closed) */
    const ws = await ensureWs();
    if (!ws) {
      alert('Not authenticated');
      return;
    }

    const wireUpHandlers = (socket: WebSocket) => {
      socket.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'thinking':
              setStateSafe('thinking');
              break;
            case 'transcript':
              setMessages(prev => [...prev, { role: 'user', content: msg.text }]);
              break;
            case 'response_text':
              setMessages(prev => [...prev, { role: 'assistant', content: msg.text }]);
              break;
            case 'sentence_done':
              if (sentenceBufRef.current.length > 0) {
                const blob = new Blob(sentenceBufRef.current, { type: 'audio/mpeg' });
                sentenceBufRef.current = [];
                audioQueueRef.current.push(blob);
                setStateSafe('speaking');
                playNextInQueue();
              }
              break;
            case 'done':
              if (thinkingTimeoutRef.current) {
                clearTimeout(thinkingTimeoutRef.current);
                thinkingTimeoutRef.current = null;
              }
              if (sentenceBufRef.current.length > 0) {
                const blob = new Blob(sentenceBufRef.current, { type: 'audio/mpeg' });
                sentenceBufRef.current = [];
                audioQueueRef.current.push(blob);
                setStateSafe('speaking');
                playNextInQueue();
              }
              responseCompleteRef.current = true;
              if (!isPlayingRef.current && audioQueueRef.current.length === 0)
                startListening();
              break;
            case 'error':
              console.error('WS error:', msg.message);
              if (thinkingTimeoutRef.current) {
                clearTimeout(thinkingTimeoutRef.current);
                thinkingTimeoutRef.current = null;
              }
              if (msg.message === 'Invalid token') {
                useAuthStore.getState().logout();
                stopSession();
              } else {
                setMessages(prev => [...prev, { role: 'assistant', content: msg.message || 'No speech detected. Please try speaking again.' }]);
                startListening();
              }
              break;
          }
        } else {
          sentenceBufRef.current.push(event.data);
        }
      };

      socket.onclose = () => {
        wsRef.current = null;
        if (stateRef.current !== 'idle') stopSession();
      };

      socket.onerror = () => {
        stopSession();
      };
    };

    /* Wire handlers immediately so onerror/onclose work even if WS fails */
    wireUpHandlers(ws);
    /* Immediate visual feedback before any async work */
    setStateSafe('listening');
    /* Start mic immediately — don't wait for WS to connect */
    startListening();
    /* Fallback: force-stop after max duration */
    listeningTimeoutRef.current = window.setTimeout(stopSession, LISTENING_TIMEOUT_MS);
  }, [startListening, stopSession, setStateSafe, ensureWs]);

  /* ───────────────────────── UI ───────────────────────── */

  const stateLabel = () => {
    switch (state) {
      case 'idle': return 'Tap the microphone to start a conversation';
      case 'listening': return 'Listening...';
      case 'thinking': return 'Thinking...';
      case 'speaking': return 'Speaking...';
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full max-w-5xl h-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative mx-auto">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse" />
          <h2 className="font-bold text-slate-800 dark:text-slate-100 tracking-wide text-sm sm:text-base">AI Voice Tutor</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Context
            </label>
            <select
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none w-24 sm:w-40 truncate cursor-pointer"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
            >
              <option value="">General Knowledge</option>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <button 
            onClick={handleClose} 
            className="w-9 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Interactive Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto">
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px]">
            <div className="transform scale-100 sm:scale-110">
              <RadialVisualizer state={state} onClick={handleMicClick} />
            </div>

            <div className="mt-8 flex items-center gap-3 bg-white dark:bg-slate-850 px-5 py-2.5 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-sm relative z-10">
              <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${state === 'idle' ? 'bg-slate-300 dark:bg-slate-650' : state === 'listening' ? 'bg-red-500 animate-pulse' : state === 'thinking' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <p className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase">{stateLabel()}</p>
            </div>
          </div>
        </div>

        {/* Right Pane: Live Transcript */}
        <div className="w-full lg:w-[380px] h-[35%] lg:h-full border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-shrink-0">
            <MessageSquare size={16} className="text-purple-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Live Transcript</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-semibold text-center px-4 leading-relaxed">
                Tap the microphone to start learning.<br />Your conversation will appear here.
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-6 rounded-tr-sm' : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 mr-6 rounded-tl-sm'}`}>
                  <span className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${m.role === 'user' ? 'text-blue-100' : 'text-purple-500 dark:text-purple-400'}`}>
                    {m.role === 'user' ? 'You' : 'AI Voice Tutor'}
                  </span>
                  {m.content}
                </div>
              ))
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
