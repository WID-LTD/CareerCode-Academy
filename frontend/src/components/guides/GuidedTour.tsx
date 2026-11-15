import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Compass, MessageSquare, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'careercode-guided-tour-v1';

const steps = [
  {
    selector: 'nav',
    title: 'This is your top bar',
    body: 'Search, courses, career paths, notifications and your profile live here. Use it from any page.',
    prompt: 'Explain how the top navigation works and what I should use first.',
    side: 'bottom' as const,
  },
  {
    selector: '[data-tour="dashboard-hero"]',
    title: 'Your dashboard',
    body: 'This is your home base. It shows your streak, experience points, current course and next actions.',
    prompt: 'Look at my dashboard and tell me the three most important things to do today.',
    side: 'bottom' as const,
  },
  {
    selector: '[data-tour="gigo-coach"]',
    title: 'GiGo is your coach',
    body: 'GiGo can explain lessons, build study plans, add tasks, review your work and recommend a pathway.',
    prompt: 'Give me a short tour of what you can do for me as my learning coach.',
    side: 'bottom' as const,
  },
  {
    selector: 'a[href="/courses"]',
    title: 'Find a course',
    body: 'Open the course catalogue to browse by category, level and price. Every paid course has a free trial option.',
    prompt: 'Help me choose a course based on my goals. Ask me one question at a time.',
    side: 'bottom' as const,
  },
  {
    selector: '[data-tour="gigo-button"]',
    title: 'GiGo is always here',
    body: 'Tap this button anywhere in the platform to ask a question, upload a screenshot or start a study plan.',
    prompt: 'I am new here. What should I do first?',
    side: 'top' as const,
  },
];

export function GuidedTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[index];
  const position = useMemo(() => {
    if (!rect) return { top: 120, left: 24 };
    const cardWidth = Math.min(360, window.innerWidth - 32);
    const left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left + rect.width / 2 - cardWidth / 2));
    const top = step.side === 'bottom' ? rect.bottom + 14 : Math.max(16, rect.top - 210);
    return { top, left };
  }, [rect, step.side]);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = document.querySelector(step.selector) as HTMLElement | null;
    if (!target) { setRect(null); return; }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const update = () => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, step.selector]);

  if (!open) return null;

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, 'done'); } catch { /* ignore */ }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="absolute inset-0 bg-black/55 pointer-events-auto" onClick={finish} />
      {rect && (
        <div
          className="absolute rounded-2xl border-2 border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.05)] pointer-events-none"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div className="absolute pointer-events-auto" style={{ top: position.top, left: position.left, width: 'min(360px, calc(100vw - 32px))' }}>
        <div className="rounded-2xl bg-white dark:bg-gray-950 border border-indigo-200 dark:border-indigo-900 shadow-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
              <Compass className="w-3.5 h-3.5" /> Guided tour · {index + 1}/{steps.length}
            </span>
            <button onClick={finish} aria-label="Close tour" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex items-start gap-2">
            {step.side === 'bottom' ? <ArrowUp className="w-5 h-5 text-indigo-500 mt-0.5" /> : <ArrowDown className="w-5 h-5 text-indigo-500 mt-0.5" />}
            <div>
              <h3 className="font-semibold text-sm">{step.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.body}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt: step.prompt } }))}>
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Ask GiGo
            </Button>
            <div className="ml-auto flex gap-1.5">
              {index > 0 && <Button size="sm" variant="ghost" onClick={() => setIndex((i) => i - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>}
              {index < steps.length - 1 ? (
                <Button size="sm" onClick={() => setIndex((i) => i + 1)}>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
              ) : (
                <Button size="sm" onClick={finish}><Sparkles className="w-3.5 h-3.5 mr-1" /> Finish</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
