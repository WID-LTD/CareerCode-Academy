import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, X, Minimize2, GripVertical, CheckCircle2, XCircle, Mic, MicOff,
  Volume2, VolumeX, Plus, History, Loader2, Sparkles, ListChecks,
  BookOpen, Briefcase, MessageSquare, RotateCcw, Square,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { GigoAvatar, type GigoState } from './GigoAvatar';

type Block =
  | { type: 'text'; markdown: string }
  | { type: 'quiz'; question: string; options: string[]; answer: number; explanation?: string }
  | { type: 'flashcards'; cards: Array<{ front: string; back: string }> }
  | { type: 'plan'; title: string; items: string[] }
  | { type: 'courses'; items: Array<{ title: string; slug?: string; reason?: string }> };

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  blocks?: Block[];
  followups?: string[];
}

const STORAGE_POS = 'careercode-gigo-dock';
const STORAGE_CHAT = 'careercode-gigo-chat';
const STORAGE_TTS = 'careercode-gigo-tts';

const WELCOME: Msg = {
  role: 'assistant',
  content: "Hi, I'm GiGo — your CareerCode study buddy. Ask me about a lesson, a career path, or say \"quiz me\".",
  blocks: [{ type: 'text', markdown: "Hi, I'm **GiGo** — your CareerCode study buddy. Ask me about a lesson, a career path, or say **quiz me**." }],
  followups: ['Explain a concept', 'Quiz me', 'Build a study plan'],
};

const QUICK = [
  { label: 'Explain', icon: Sparkles, prompt: 'Explain a concept simply', mode: undefined },
  { label: 'Quiz me', icon: ListChecks, prompt: 'Generate a quiz for me', mode: 'quiz' as const },
  { label: 'Study plan', icon: BookOpen, prompt: 'Create a study plan for me', mode: undefined },
  { label: 'Flashcards', icon: MessageSquare, prompt: 'Make flashcards for my current course', mode: undefined },
  { label: 'Career advice', icon: Briefcase, prompt: 'Give me career advice for my goal', mode: undefined },
];

type Dock = { side: 'left' | 'right'; bottom: number };

function loadDock(): Dock {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_POS) || 'null');
    if (raw && (raw.side === 'left' || raw.side === 'right') && Number.isFinite(raw.bottom)) return raw;
  } catch { /* ignore */ }
  return { side: 'right', bottom: 88 };
}

function messageText(m: Msg): string {
  if (m.content) return m.content;
  const texts = (m.blocks || []).filter((b): b is { type: 'text'; markdown: string } => b.type === 'text');
  return texts.map((b) => b.markdown).join('\n\n');
}

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mt-1 first:mt-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mt-1 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mt-1 space-y-0.5">{children}</ol>,
        code: ({ className, children }) => (
          <code className={cn('rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 text-[0.85em]', className)}>{children}</code>
        ),
        pre: ({ children }) => <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-2 text-xs text-emerald-300">{children}</pre>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="underline text-indigo-500">{children}</a>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function QuizCard({ block }: { block: Extract<Block, { type: 'quiz' }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === block.answer;
  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/70 p-3 bg-indigo-50/50 dark:bg-indigo-950/20">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-indigo-500 font-semibold mb-2">
        <ListChecks className="w-3 h-3" /> Quick quiz
      </div>
      <p className="text-sm font-semibold mb-2">{block.question}</p>
      <div className="space-y-1.5">
        {block.options.map((opt, idx) => {
          const isPicked = picked === idx;
          const isAnswer = idx === block.answer;
          return (
            <button
              key={idx}
              onClick={() => setPicked(idx)}
              className={cn(
                'w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors flex items-center gap-2',
                picked === null
                  ? 'border-gray-200 dark:border-gray-800 hover:border-indigo-400'
                  : isAnswer
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : isPicked
                      ? 'border-red-400 bg-red-500/10 text-red-600 dark:text-red-300'
                      : 'border-gray-200 dark:border-gray-800 opacity-60'
              )}
            >
              <span className="w-5 h-5 rounded-full border border-current/30 grid place-items-center text-[10px] font-bold flex-shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{opt}</span>
              {picked !== null && isAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
              {picked !== null && isPicked && !isAnswer && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={cn('mt-2 text-xs rounded-lg p-2', correct ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
          {correct ? 'Correct! ' : `Not quite — the answer is ${String.fromCharCode(65 + block.answer)}. `}
          {block.explanation}
        </div>
      )}
    </div>
  );
}

function Flashcards({ cards }: { cards: Array<{ front: string; back: string }> }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  if (!card) return null;
  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-900/70 p-3 bg-violet-50/50 dark:bg-violet-950/20">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-violet-500 font-semibold mb-2">
        <span>Flashcard {index + 1}/{cards.length}</span>
        <button onClick={() => { setIndex(0); setFlipped(false); }} aria-label="Restart flashcards"><RotateCcw className="w-3 h-3" /></button>
      </div>
      <button onClick={() => setFlipped((v) => !v)} className="w-full min-h-[84px] rounded-xl bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-900 p-3 text-sm text-left">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">{flipped ? 'Answer' : 'Question'}</span>
        <p className="mt-1 font-medium">{flipped ? card.back : card.front}</p>
      </button>
      <div className="flex items-center justify-between mt-2">
        <button onClick={() => { setFlipped(false); setIndex((i) => Math.max(0, i - 1)); }} disabled={index === 0} className="text-xs px-2 py-1 rounded-lg border disabled:opacity-40">Prev</button>
        <button onClick={() => setFlipped((v) => !v)} className="text-xs px-2 py-1 rounded-lg border">Flip</button>
        <button onClick={() => { setFlipped(false); setIndex((i) => Math.min(cards.length - 1, i + 1)); }} disabled={index === cards.length - 1} className="text-xs px-2 py-1 rounded-lg border disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function PlanCard({ block, onAdd }: { block: Extract<Block, { type: 'plan' }>; onAdd: (items: string[]) => void }) {
  const [added, setAdded] = useState(false);
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/70 p-3 bg-amber-50/50 dark:bg-amber-950/20">
      <p className="text-sm font-semibold mb-2">{block.title}</p>
      <ul className="space-y-1">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 grid place-items-center text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => { onAdd(block.items); setAdded(true); }}
        disabled={added}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-500 text-white disabled:opacity-60"
      >
        <Plus className="w-3 h-3" /> {added ? 'Added to To-Do' : 'Add to To-Do'}
      </button>
    </div>
  );
}

function CoursesCard({ block }: { block: Extract<Block, { type: 'courses' }> }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-sm font-semibold mb-2">Recommended courses</p>
      <div className="space-y-1.5">
        {block.items.map((item, i) => (
          <Link key={i} to={item.slug ? `/courses/${item.slug}` : '/courses'} className="block rounded-xl border border-gray-200 dark:border-gray-800 p-2 hover:border-indigo-400">
            <p className="text-sm font-medium">{item.title}</p>
            {item.reason && <p className="text-xs text-gray-500">{item.reason}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Blocks({ msg, onFollowup, onAddPlan }: { msg: Msg; onFollowup: (text: string) => void; onAddPlan: (items: string[]) => void }) {
  return (
    <div className="space-y-2">
      {(msg.blocks && msg.blocks.length ? msg.blocks : [{ type: 'text', markdown: msg.content } as Block]).map((b, i) => {
        if (b.type === 'text') return <Markdown key={i} text={b.markdown} />;
        if (b.type === 'quiz') return <QuizCard key={i} block={b} />;
        if (b.type === 'flashcards') return <Flashcards key={i} cards={b.cards} />;
        if (b.type === 'plan') return <PlanCard key={i} block={b} onAdd={onAddPlan} />;
        if (b.type === 'courses') return <CoursesCard key={i} block={b} />;
        return null;
      })}
      {!!msg.followups?.length && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {msg.followups.map((f) => (
            <button key={f} onClick={() => onFollowup(f)} className="text-[11px] px-2 py-1 rounded-full border border-gray-200 dark:border-gray-800 hover:border-indigo-400 hover:text-indigo-500">
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GigoWidget() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_CHAT) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* ignore */ }
    return [WELCOME];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_TTS) !== 'false'; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const [dock, setDock] = useState<Dock>(loadDock);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean; kind: 'launcher' | 'panel' } | null>(null);
  const suppressClick = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimer = useRef<number | null>(null);
  const recordingRef = useRef(false);

  const context = useMemo(() => {
    const m = location.pathname.match(/\/courses\/([^/]+)/);
    return { page: location.pathname, courseSlug: m?.[1] };
  }, [location.pathname]);

  const gigoState: GigoState = recording ? 'listening' : loading ? 'thinking' : speaking ? 'speaking' : 'idle';

  useEffect(() => {
    try { localStorage.setItem(STORAGE_CHAT, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open, minimized]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_TTS, String(ttsEnabled)); } catch { /* ignore */ }
  }, [ttsEnabled]);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (recordTimer.current) window.clearTimeout(recordTimer.current);
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    stopAudio();
    try {
      const { data } = await api.post('/ai/tts', { text });
      const audio = new Audio(data.data.audio);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      setSpeaking(true);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }, [stopAudio]);

  const send = useCallback(async (text?: string, mode?: 'quiz') => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    stopAudio();
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', {
        messages: next.map((m) => ({ role: m.role, content: messageText(m) })),
        mode,
        conversationId,
        context,
      });
      const d = data.data;
      setConversationId(d.conversationId || conversationId);
      const assistant: Msg = { role: 'assistant', content: d.reply || '', blocks: d.blocks, followups: d.followups };
      setMessages((m) => [...m, assistant]);
      if (ttsEnabled && d.reply) void speak(d.reply);
    } catch (e: any) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: e?.response?.data?.message || 'Sorry — I could not reach GiGo. Please try again.',
        blocks: [{ type: 'text', markdown: e?.response?.data?.message || 'Sorry — I could not reach GiGo. Please try again.' }],
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, conversationId, context, ttsEnabled, speak, stopAudio]);

  const sendVoice = useCallback(async (blob: Blob, mime: string) => {
    setLoading(true);
    stopAudio();
    try {
      const fd = new FormData();
      fd.append('audio', blob, `gigo-${Date.now()}.${mime.includes('mp4') ? 'm4a' : 'webm'}`);
      fd.append('messages', JSON.stringify(messages.map((m) => ({ role: m.role, content: messageText(m) }))));
      fd.append('context', JSON.stringify(context));
      if (conversationId) fd.append('conversationId', conversationId);
      const { data } = await api.post('/ai/voice', fd);
      const d = data.data;
      setConversationId(d.conversationId || conversationId);
      setMessages((m) => [
        ...m,
        { role: 'user', content: d.transcript || '🎤 Voice message' },
        { role: 'assistant', content: d.reply || '', blocks: d.blocks, followups: d.followups },
      ]);
      if (ttsEnabled && d.reply) void speak(d.reply);
    } catch (e: any) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: e?.response?.data?.message || 'I could not process that recording. Please try again.',
        blocks: [{ type: 'text', markdown: e?.response?.data?.message || 'I could not process that recording. Please try again.' }],
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, context, conversationId, ttsEnabled, speak, stopAudio]);

  const stopRecording = useCallback(() => {
    if (recordTimer.current) { window.clearTimeout(recordTimer.current); recordTimer.current = null; }
    recordingRef.current = false;
    setRecording(false);
    try { mediaRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (recording) { stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Voice recording is not supported in this browser.', blocks: [{ type: 'text', markdown: 'Voice recording is not supported in this browser.' }] }]);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 500) void sendVoice(blob, recorder.mimeType || 'audio/webm');
      };
      mediaRef.current = recorder;
      recorder.start();
      recordingRef.current = true;
      setRecording(true);
      recordTimer.current = window.setTimeout(() => {
        if (recordingRef.current) stopRecording();
      }, 60000);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Microphone permission was denied. Enable it in your browser settings to talk to GiGo.', blocks: [{ type: 'text', markdown: 'Microphone permission was denied. Enable it in your browser settings to talk to GiGo.' }] }]);
    }
  }, [recording, sendVoice, stopRecording]);

  const addPlanToTodo = useCallback(async (items: string[]) => {
    try {
      for (const title of items) await api.post('/todos', { title, category: 'study', source: 'gigo', priority: 'medium' });
      setMessages((m) => [...m, { role: 'assistant', content: 'Added to your To-Do list.', blocks: [{ type: 'text', markdown: 'Added to your **To-Do** list. Open **To-Do** in the sidebar to see it.' }] }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Could not add that to your To-Do list.', blocks: [{ type: 'text', markdown: 'Could not add that to your To-Do list.' }] }]);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setShowHistory(true);
    try {
      const { data } = await api.get('/ai/conversations');
      setHistory(data.data || []);
    } catch { setHistory([]); }
  }, []);

  const openConversation = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/ai/conversations/${id}`);
      const msgs = (data.data.messages || []).map((m: any) => ({ role: m.role, content: m.content, blocks: m.blocks || undefined }));
      setMessages(msgs.length ? msgs : [WELCOME]);
      setConversationId(id);
      setShowHistory(false);
    } catch { /* ignore */ }
  }, []);

  const newChat = useCallback(() => {
    stopAudio();
    setMessages([WELCOME]);
    setConversationId(null);
    setInput('');
    setShowHistory(false);
  }, [stopAudio]);

  // ── Drag ────────────────────────────────────────────────────────────────
  const beginDrag = (e: React.PointerEvent, kind: 'launcher' | 'panel') => {
    if (window.innerWidth < 640) return;
    const el = e.currentTarget as HTMLElement;
    const rect = (kind === 'launcher' ? el : el.closest('[data-gigo-panel]') as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top, moved: false, kind };
    el.setPointerCapture?.(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    const x = Math.max(8, Math.min(window.innerWidth - 72, d.originX + dx));
    const y = Math.max(8, Math.min(window.innerHeight - 72, d.originY + dy));
    if (d.kind === 'launcher') setDragPos({ x, y });
    else setPanelPos({ x, y });
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (!d.moved) {
      if (d.kind === 'launcher') { setOpen(true); setMinimized(false); }
      return;
    }
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 250);
    if (d.kind === 'launcher' && dragPos) {
      const center = dragPos.x + 28;
      const side: 'left' | 'right' = center < window.innerWidth / 2 ? 'left' : 'right';
      const bottom = Math.max(8, Math.min(window.innerHeight - 64, window.innerHeight - (dragPos.y + 56)));
      const next = { side, bottom };
      setDock(next);
      setDragPos(null);
      try { localStorage.setItem(STORAGE_POS, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };

  const launcherStyle: React.CSSProperties = dragPos
    ? { left: dragPos.x, top: dragPos.y }
    : { [dock.side]: 12, bottom: dock.bottom } as React.CSSProperties;

  const panelStyle: React.CSSProperties = panelPos
    ? { left: panelPos.x, top: panelPos.y }
    : { [dock.side]: 12, bottom: Math.max(12, dock.bottom) } as React.CSSProperties;

  if (!isAuthenticated) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onPointerDown={(e) => beginDrag(e, 'launcher')}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() => { if (!suppressClick.current) { setOpen(true); setMinimized(false); } }}
          style={launcherStyle}
          className="fixed z-[65] h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-2xl shadow-indigo-500/30 grid place-items-center hover:scale-105 transition-transform touch-none cursor-grab active:cursor-grabbing"
          aria-label="Open GiGo, your AI study buddy"
        >
          <GigoAvatar state="idle" size={38} />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-950" />
        </button>
      )}

      {open && (
        <div
          data-gigo-panel
          style={typeof window !== 'undefined' && window.innerWidth < 640 ? undefined : panelStyle}
          className={cn(
            'fixed z-[65] flex flex-col overflow-hidden border border-gray-200/70 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl',
            minimized ? 'h-16 w-72 rounded-2xl' : 'h-[min(620px,calc(100vh-120px))] w-[min(400px,calc(100vw-24px))] rounded-3xl',
            'max-sm:inset-x-3 max-sm:bottom-3 max-sm:w-auto max-sm:h-[78vh]'
          )}
        >
          <div
            onPointerDown={(e) => beginDrag(e, 'panel')}
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 dark:border-gray-800 cursor-grab active:cursor-grabbing select-none bg-gradient-to-r from-indigo-500/5 to-violet-500/5"
          >
            <GigoAvatar state={gigoState} size={36} showRing={recording} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight flex items-center gap-1.5">GiGo <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">online</span></p>
              <p className="text-[11px] text-gray-500">Your AI study buddy</p>
            </div>
            <GripVertical className="w-4 h-4 text-gray-300 hidden sm:block" />
            <button onClick={() => setTtsEnabled((v) => !v)} aria-label={ttsEnabled ? 'Mute GiGo' : 'Unmute GiGo'} title={ttsEnabled ? 'Mute voice replies' : 'Enable voice replies'} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-indigo-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            </button>
            <button onClick={newChat} aria-label="New chat" title="New chat" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={loadHistory} aria-label="Chat history" title="Chat history" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <History className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => setMinimized((v) => !v)} aria-label="Minimize" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Minimize2 className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => { stopAudio(); setOpen(false); }} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {!minimized && (
            <>
              {showHistory ? (
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Recent chats</p>
                    <button onClick={() => setShowHistory(false)} className="text-xs text-gray-500">Back</button>
                  </div>
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No saved chats yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {history.map((h) => (
                        <button key={h.id} onClick={() => openConversation(h.id)} className="w-full text-left rounded-xl border border-gray-200 dark:border-gray-800 p-2.5 hover:border-indigo-400">
                          <p className="text-sm font-medium truncate">{h.title || 'Chat'}</p>
                          <p className="text-xs text-gray-500 truncate">{h.last_message || ''}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{h.message_count || 0} messages · {new Date(h.updated_at).toLocaleDateString()}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {m.role === 'assistant' && <GigoAvatar state={i === messages.length - 1 ? gigoState : 'idle'} size={28} className="mt-1 flex-shrink-0" />}
                        <div className={cn(
                          'max-w-[86%] rounded-2xl px-3 py-2 text-sm',
                          m.role === 'user'
                            ? 'bg-indigo-500 text-white rounded-tr-sm'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                        )}>
                          {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : <Blocks msg={m} onFollowup={(t) => send(t)} onAddPlan={addPlanToTodo} />}
                          {m.role === 'assistant' && messageText(m) && (
                            <div className="flex items-center gap-1 mt-1.5 opacity-60">
                              <button onClick={() => speak(messageText(m))} aria-label="Read aloud" title="Read aloud" className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"><Volume2 className="w-3 h-3" /></button>
                              <button onClick={() => send('Explain that in a simpler way')} aria-label="Simplify" title="Explain simpler" className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"><RotateCcw className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <GigoAvatar state="thinking" size={24} />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:240ms]" />
                        GiGo is thinking…
                      </div>
                    )}
                    {recording && (
                      <div className="flex items-center gap-2 text-xs text-rose-500">
                        <GigoAvatar state="listening" size={24} showRing />
                        Listening… tap the mic to stop
                      </div>
                    )}
                  </div>

                  <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {QUICK.map((q) => (
                      <button key={q.label} onClick={() => send(q.prompt, q.mode)} className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-800 text-gray-500 hover:border-indigo-400 hover:text-indigo-500 inline-flex items-center gap-1">
                        <q.icon className="w-3 h-3" /> {q.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2">
                    <button type="button" onClick={toggleRecording} aria-label={recording ? 'Stop recording' : 'Talk to GiGo'} title={recording ? 'Stop recording' : 'Talk to GiGo'}
                      className={cn('h-10 w-10 rounded-xl grid place-items-center flex-shrink-0 transition-colors', recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-900 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800')}>
                      {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                      rows={1}
                      placeholder="Ask GiGo anything…"
                      className="flex-1 resize-none max-h-24 rounded-xl bg-gray-100 dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    {speaking ? (
                      <button type="button" onClick={stopAudio} aria-label="Stop speaking" className="h-10 w-10 rounded-xl bg-rose-500 text-white grid place-items-center flex-shrink-0">
                        <Square className="w-4 h-4" />
                      </button>
                    ) : (
                      <button type="submit" disabled={loading || !input.trim()} aria-label="Send" className="h-10 w-10 rounded-xl bg-indigo-500 text-white grid place-items-center disabled:opacity-40 flex-shrink-0">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    )}
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
