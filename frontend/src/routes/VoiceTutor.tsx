import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import RadialVisualizer from './RadialVisualizer';
import { X, Mic, AlertCircle, Terminal, Volume2 } from 'lucide-react';

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
      setMicError('Microphone permission denied. Verify hardware access in browser permissions.');
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

  const stateDescription = () => {
    switch (state) {
      case 'idle':
        return '[ STANDBY // TAP ACOUSTIC DIAL TO TRANSMIT ]';
      case 'listening':
        return '[ RECORDING ACTIVE // SPEECH RMS DETECTED ]';
      case 'thinking':
        return '[ INFERENCE PROCESSING // RETRIEVING CONTEXT ]';
      case 'speaking':
        return '[ AUDIO BROADCAST // SYNTHESIZING PHONEMES ]';
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
    <div className="w-full h-[calc(100vh-8rem)] min-h-[520px] bg-white dark:bg-stone-900 rounded-[2px] shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#0c0a09] flex flex-col overflow-hidden border-[1.5px] border-stone-900 dark:border-stone-700">
      
      {/* Top Utility Header */}
      <div className="h-14 px-4 sm:px-6 border-b-[1.5px] border-stone-900 dark:border-stone-700 flex items-center justify-between bg-stone-100/60 dark:bg-stone-800/60 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[2px] bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center border border-stone-900 dark:border-stone-700 shadow-[1.5px_1.5px_0px_#18181b]">
            <Mic size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                [ ACOUSTIC CONSOLE // VOICE TUTOR ]
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-[2px] border border-stone-900 dark:border-stone-600 bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold hidden sm:inline-block">
                LIVE DUPLEX
              </span>
            </div>
            <p className="font-mono text-[10px] text-stone-500 uppercase tracking-tight">
              Real-time speech dialogue & contextual audio synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Document Context Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 shadow-[1.5px_1.5px_0px_#18181b] text-xs">
            <span className="font-mono text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              TOPIC:
            </span>
            <select
              className="bg-transparent font-mono text-xs font-bold text-stone-900 dark:text-stone-100 outline-none max-w-[130px] sm:max-w-[200px] truncate cursor-pointer"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
            >
              <option value="">[ GENERAL KNOWLEDGE ]</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#18181b]"
            title="Close voice tutor"
            aria-label="Close acoustic console"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {micError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border-b-[1.5px] border-stone-900 dark:border-stone-700 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2 font-mono">
          <AlertCircle size={15} className="flex-shrink-0 text-rose-700 dark:text-rose-400" />
          <span>[ HARDWARE NOTICE ]: {micError}</span>
        </div>
      )}

      {/* Main Workspace: Oscilloscope Stage + Transcript Ledger */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Interaction Stage */}
        <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 bg-[#fcfbf9] dark:bg-stone-950 blueprint-grid relative min-h-0 overflow-y-auto">
          
          {/* Top Stage Telemetry Banner */}
          <div className="w-full flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-stone-500 border-b border-stone-200 dark:border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-[1px] bg-stone-900 dark:bg-stone-100" />
              <span>TELEMETRY // CODEC: OPUS · FFT: 2048 · SAMPLE: 16KHZ</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <span>LATENCY: &lt;180MS</span>
              <span>BUFFER: STREAMING</span>
            </div>
          </div>

          {/* Central Acoustic Radar Visualizer */}
          <div className="flex-1 w-full flex items-center justify-center my-2">
            <RadialVisualizer state={state} onClick={handleMicClick} />
          </div>

          {/* Stage Readout & VU Level Ticker */}
          <div className="flex flex-col items-center gap-2.5 w-full max-w-md">
            
            {/* High-Contrast Monospace State Capsule */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] bg-white dark:bg-stone-900 border-[1.5px] border-stone-900 dark:border-stone-700 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#000]">
              <span
                className={`w-2 h-2 rounded-[1px] ${
                  state === 'idle'
                    ? 'bg-stone-400'
                    : state === 'listening'
                    ? 'bg-rose-600 animate-pulse'
                    : state === 'thinking'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-600 animate-pulse'
                }`}
              />
              <span className="font-mono text-[11px] font-bold tracking-wider text-stone-900 dark:text-stone-100">
                {stateDescription()}
              </span>
            </div>

            {/* Graphic Oscilloscope VU Meter */}
            <div className="flex items-center gap-4 font-mono text-[9px] text-stone-500 uppercase tracking-widest pt-1">
              <span>
                SIG-L:{' '}
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {state === 'listening' || state === 'speaking' ? '■■■■■■■□□□' : '■■□□□□□□□□'}
                </span>{' '}
                {state === 'idle' ? '-48dB' : '-12dB'}
              </span>
              <span>
                SIG-R:{' '}
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {state === 'listening' || state === 'speaking' ? '■■■■■■□□□□' : '■■□□□□□□□□'}
                </span>{' '}
                {state === 'idle' ? '-52dB' : '-16dB'}
              </span>
            </div>

          </div>
        </div>

        {/* Live Transcript Panel (Academic Ledger) */}
        <div className="w-full lg:w-96 h-56 sm:h-72 lg:h-full border-t-[1.5px] lg:border-t-0 lg:border-l-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 flex flex-col min-h-0 flex-shrink-0">
          
          <div className="p-3 border-b-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100/50 dark:bg-stone-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-stone-900 dark:text-stone-100" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                SESSION LEDGER
              </h3>
            </div>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 border border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300">
              [{messages.length.toString().padStart(2, '0')} DISPATCHES]
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 text-xs font-sans">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-10 h-10 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 shadow-[2px_2px_0px_#18181b]">
                  <Volume2 size={18} />
                </div>
                <div className="font-mono text-xs font-bold uppercase text-stone-800 dark:text-stone-200">
                  [ READY FOR SPOKEN INQUIRY ]
                </div>
                <p className="font-mono text-[11px] text-stone-500 max-w-[220px] leading-relaxed">
                  Tap the central dial or speak into microphone. Dialogue will be catalogued in this ledger.
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#000] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 ml-3'
                      : 'bg-stone-50 dark:bg-stone-800/90 text-stone-900 dark:text-stone-100 mr-3'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5 pb-1 border-b border-stone-200 dark:border-stone-800">
                    <span
                      className={
                        m.role === 'user'
                          ? 'text-stone-900 dark:text-stone-100'
                          : 'text-stone-600 dark:text-stone-300'
                      }
                    >
                      {m.role === 'user' ? '[ STUDENT // INQUIRY ]' : '[ TUTOR // SYNTHESIZED DISPATCH ]'}
                    </span>
                    <span className="text-stone-400">#{i + 1}</span>
                  </div>
                  <p className="text-xs leading-normal font-sans">{m.content}</p>
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
