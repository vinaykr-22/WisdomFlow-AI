import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import RadialVisualizer from './RadialVisualizer';
import { X, MessageSquare, Mic, AlertCircle } from 'lucide-react';

type State = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Doc {
  id: string;
  title: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

/* ── Silence detection threshold in ms ── */
const SILENCE_THRESHOLD_MS = 800;
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
  const [micError, setMicError] = useState<string | null>(null);
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  useEffect(() => {
    api.get('/documents').then(({ data }) => setDocs(data.documents || [])).catch(() => {});
  }, []);

  const setStateSafe = useCallback((s: State) => {
    stateRef.current = s;
    setState(s);
  }, []);

  /* ───────────────────────── WebSocket helpers ───────────────────────── */

  const ensureWs = useCallback((): WebSocket | null => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const docParam = docId ? `&document_id=${encodeURIComponent(docId)}` : '';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/api/v1/voice/ws?token=${token}${docParam}`
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

  useEffect(() => {
    ensureMicStream().catch(() => {});

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [ensureMicStream]);

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
  }, [setStateSafe]);

  /* ───────────────────────── Recording with streaming chunks ───────────────────────── */

  const startListening = useCallback(async () => {
    if (recorderRef.current) return;
    setMicError(null);
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

      const stopRecording = () => {
        if (!recorderRef.current) return;
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
          listeningTimeoutRef.current = null;
        }
        if (thinkingTimeoutRef.current) {
          clearTimeout(thinkingTimeoutRef.current);
          thinkingTimeoutRef.current = null;
        }
        if (silenceTimerRef.current) {
          cancelAnimationFrame(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        recorder.stop();
        audioCtx.close();
        recorderRef.current = null;
        audioCtxRef.current = null;
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mime });
          blob.arrayBuffer().then((buf) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(buf);
            } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
              const ws = wsRef.current;
              const onOpen = () => {
                ws.removeEventListener('open', onOpen);
                ws.send(buf);
              };
              ws.addEventListener('open', onOpen);
            }
          });
        }
        setStateSafe('thinking');
        thinkingTimeoutRef.current = window.setTimeout(stopSession, THINKING_TIMEOUT_MS);
      };

      let silenceStart = 0;
      hadSpeechRef.current = false;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkSilence = () => {
        if (stateRef.current !== 'listening') return;
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128 - 1;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms >= 0.01) {
          silenceStart = 0;
          hadSpeechRef.current = true;
        } else {
          if (silenceStart === 0) silenceStart = Date.now();
          else if (
            hadSpeechRef.current &&
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
      setMicError('Microphone permission denied. Please allow microphone access in browser settings.');
      wsRef.current = null;
      setStateSafe('idle');
    }
  }, [setStateSafe, ensureMicStream, stopSession]);

  /* ───────────────────────── Audio playback ───────────────────────── */

  const playNextInQueue = useCallback(() => {
    if (isPlayingRef.current) return;
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

  const handleMicClick = useCallback(() => {
    if (stateRef.current !== 'idle') {
      stopSession();
      return;
    }

    audioBufRef.current = [];
    setMessages([]);
    setMicError(null);

    const ws = ensureWs();
    if (!ws) {
      alert('Authentication required.');
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
              setMessages((prev) => [...prev, { role: 'user', content: msg.text }]);
              break;
            case 'response_text':
              setMessages((prev) => [...prev, { role: 'assistant', content: msg.text }]);
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
              stopSession();
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

    wireUpHandlers(ws);
    setStateSafe('listening');
    startListening();
    listeningTimeoutRef.current = window.setTimeout(stopSession, LISTENING_TIMEOUT_MS);
  }, [startListening, stopSession, setStateSafe, ensureWs, playNextInQueue]);

  const stateLabel = () => {
    switch (state) {
      case 'idle':
        return 'Tap microphone to speak';
      case 'listening':
        return 'Listening to your voice...';
      case 'thinking':
        return 'Analyzing and formulating response...';
      case 'speaking':
        return 'AI Tutor is speaking...';
    }
  };

  const handleClose = () => {
    stopSession();
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] min-h-[500px] bg-white dark:bg-slate-900 rounded-xl shadow-xs flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800">
      
      {/* Top Utility Header */}
      <div className="h-14 px-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
            <Mic size={15} />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Interactive Voice Tutor
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Conversational study session with real-time speech
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Document Context Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
              Topic:
            </span>
            <select
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none max-w-[140px] sm:max-w-[200px] truncate cursor-pointer"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
            >
              <option value="">General Knowledge</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Close voice tutor"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {micError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{micError}</span>
        </div>
      )}

      {/* Main Workspace: Visualizer + Live Transcript */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Interaction Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/40 dark:bg-slate-900/20 relative min-h-0">
          <div className="flex-1 w-full flex items-center justify-center">
            <RadialVisualizer state={state} onClick={handleMicClick} />
          </div>

          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'idle'
                  ? 'bg-slate-400'
                  : state === 'listening'
                  ? 'bg-rose-500 animate-pulse'
                  : state === 'thinking'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {stateLabel()}
            </span>
          </div>
        </div>

        {/* Live Transcript Panel */}
        <div className="w-full lg:w-80 h-48 sm:h-64 lg:h-full border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-0 flex-shrink-0">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Session Transcript
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-center px-4">
                Tap the microphone and ask a question. Spoken dialogue will be transcribed here.
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/40 ml-4'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/60 mr-4'
                  }`}
                >
                  <span
                    className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                      m.role === 'user'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {m.role === 'user' ? 'You' : 'Voice Tutor'}
                  </span>
                  <p>{m.content}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
