import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, X, Minimize2, GripVertical, CheckCircle2 } from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface Msg { role: 'user' | 'assistant'; content: string }
interface Quiz { question: string; options: string[]; answer: number; explanation?: string }

const STORAGE_POS = 'careercode-gigo-pos';
const QUICK = ['Explain a concept', 'Quiz me', 'Career advice'];

export function GigoWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi, I'm GiGo — your CareerCode study assistant. Ask me about a lesson, a career path, or say \"quiz me\"." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_POS) || 'null') || { right: 20, bottom: 90 }; }
    catch { return { right: 20, bottom: 90 }; }
  });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, quiz]);

  const send = async (text?: string, mode?: 'quiz') => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setQuiz(null); setPicked(null);
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { messages: next, mode });
      const d = data.data;
      setMessages((m) => [...m, { role: 'assistant', content: d.reply }]);
      if (d.quiz) setQuiz(d.quiz);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry — I could not reach the assistant. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (window.innerWidth < 640) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setPos((p: any) => ({ right: Math.max(8, p.right - dx), bottom: Math.max(8, p.bottom - dy) }));
    drag.current.x = e.clientX; drag.current.y = e.clientY;
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    // Magnetic snap to the nearest horizontal edge.
    setPos((p: any) => {
      const snapped = p.right < window.innerWidth / 2 ? { ...p, right: 12 } : { ...p, right: 12 };
      try { localStorage.setItem(STORAGE_POS, JSON.stringify(snapped)); } catch { /* ignore */ }
      return snapped;
    });
    drag.current = null;
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          style={{ right: pos.right, bottom: pos.bottom }}
          className="fixed z-[65] h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-2xl shadow-indigo-500/30 grid place-items-center hover:scale-105 transition-transform"
          aria-label="Open GiGo AI assistant"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </button>
      )}

      {open && (
        <div
          style={{ right: pos.right, bottom: pos.bottom }}
          className={cn(
            'fixed z-[65] flex flex-col overflow-hidden border border-gray-200/70 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl',
            minimized ? 'h-14 w-72 rounded-2xl' : 'h-[min(560px,calc(100vh-120px))] w-[min(380px,calc(100vw-24px))] rounded-3xl',
            'max-sm:inset-x-3 max-sm:bottom-3 max-sm:w-auto max-sm:h-[70vh]'
          )}
        >
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 dark:border-gray-800 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">GiGo</p>
              <p className="text-[11px] text-emerald-500">Cloudflare Workers AI</p>
            </div>
            <GripVertical className="w-4 h-4 text-gray-300 hidden sm:block" />
            <button onClick={() => setMinimized((v) => !v)} aria-label="Minimize" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Minimize2 className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {!minimized && (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                      m.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {quiz && (
                  <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 p-3">
                    <p className="text-sm font-semibold mb-2">{quiz.question}</p>
                    <div className="space-y-1.5">
                      {quiz.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPicked(idx)}
                          className={cn(
                            'w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors',
                            picked === null
                              ? 'border-gray-200 dark:border-gray-800 hover:border-indigo-400'
                              : idx === quiz.answer
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                : picked === idx
                                  ? 'border-red-400 bg-red-500/10 text-red-500'
                                  : 'border-gray-200 dark:border-gray-800 opacity-60'
                          )}
                        >
                          <span className="inline-flex items-center gap-2">
                            {picked !== null && idx === quiz.answer && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {opt}
                          </span>
                        </button>
                      ))}
                    </div>
                    {picked !== null && quiz.explanation && (
                      <p className="text-xs text-gray-500 mt-2">{quiz.explanation}</p>
                    )}
                  </div>
                )}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:240ms]" />
                    GiGo is thinking…
                  </div>
                )}
              </div>

              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q, q === 'Quiz me' ? 'quiz' : undefined)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-800 text-gray-500 hover:border-indigo-400 hover:text-indigo-500">
                    {q === 'Quiz me' ? <Sparkles className="w-3 h-3 inline mr-1" /> : null}{q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); void send(); }}
                className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  rows={1}
                  placeholder="Ask GiGo anything…"
                  className="flex-1 resize-none max-h-24 rounded-xl bg-gray-100 dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button type="submit" disabled={loading || !input.trim()} aria-label="Send"
                  className="h-9 w-9 rounded-xl bg-indigo-500 text-white grid place-items-center disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
