import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Compass, Loader2, MessageSquare, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';

export interface GuideStep {
  id?: string;
  route: string;
  selector?: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  arrow?: boolean;
  spotlight_padding?: number;
  optional?: boolean;
  requires_access?: boolean;
  prompt?: string;
  chapter?: string;
}

export interface GuideTour {
  key: string;
  name: string;
  role?: string;
  steps: GuideStep[];
}

interface Props {
  open: boolean;
  tour: GuideTour | null;
  onClose: () => void;
  preview?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function GuidedExperience({ open, tour, onClose, preview = false }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardSize, setCardSize] = useState({ width: 320, height: 190 });
  const cardRef = useRef<HTMLDivElement>(null);
  const steps = tour?.steps || [];
  const step = steps[index];

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open, tour?.key]);

  useEffect(() => {
    if (!open || !step) return;
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [open, step, location.pathname, navigate]);

  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    let tries = 0;
    setLoading(true);
    setRect(null);

    const find = () => {
      if (cancelled) return;
      const selector = step.selector || '[data-tour="page-content"]';
      const target = (document.querySelector(selector) as HTMLElement | null)
        || (document.querySelector('main') as HTMLElement | null)
        || (document.querySelector('h1') as HTMLElement | null);
      if (!target) {
        tries++;
        if (tries < 30) setTimeout(find, 120);
        else { setLoading(false); setRect(null); }
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const update = () => {
        if (cancelled) return;
        setRect(target.getBoundingClientRect());
        setLoading(false);
      };
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    };
    const cleanup = find();
    return () => { cancelled = true; if (typeof cleanup === 'function') cleanup(); };
  }, [open, step, location.pathname]);

  useEffect(() => {
    if (!open || !step) return;
    if (!preview) {
      api.put('/guide/progress', { tour_key: tour?.key, step_index: index, status: 'in_progress' }).catch(() => {});
      api.post('/guide/events', { tour_key: tour?.key, step_index: index, event: 'step_view' }).catch(() => {});
    }
  }, [open, step, index, preview, tour?.key]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(steps.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, steps.length]);

  useEffect(() => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setCardSize({ width: r.width || 320, height: r.height || 190 });
  }, [index, step?.title, step?.body]);

  const position = useMemo(() => {
    const vw = typeof window === 'undefined' ? 1200 : window.innerWidth;
    const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
    const width = Math.min(320, vw - 32);
    const height = cardSize.height || 190;
    if (!rect) {
      return { top: Math.max(24, vh / 2 - height / 2), left: Math.max(16, vw / 2 - width / 2), width, placement: 'center' as const };
    }
    const pad = Number(step?.spotlight_padding) || 8;
    const spaces = {
      top: rect.top - pad,
      bottom: vh - rect.bottom - pad,
      left: rect.left - pad,
      right: vw - rect.right - pad,
    };
    let placement = step?.placement && step.placement !== 'auto' ? step.placement : (Object.entries(spaces).sort((a, b) => b[1] - a[1])[0][0] as 'top' | 'bottom' | 'left' | 'right');
    if (spaces[placement] < (placement === 'top' || placement === 'bottom' ? height + 16 : width + 16)) {
      placement = spaces.bottom >= spaces.top ? 'bottom' : 'top';
    }
    let top = 0;
    let left = 0;
    if (placement === 'top') {
      top = rect.top - height - 16;
      left = clamp(rect.left + rect.width / 2 - width / 2, 16, vw - width - 16);
    } else if (placement === 'bottom') {
      top = rect.bottom + 16;
      left = clamp(rect.left + rect.width / 2 - width / 2, 16, vw - width - 16);
    } else if (placement === 'left') {
      left = rect.left - width - 16;
      top = clamp(rect.top + rect.height / 2 - height / 2, 16, vh - height - 16);
    } else {
      left = rect.right + 16;
      top = clamp(rect.top + rect.height / 2 - height / 2, 16, vh - height - 16);
    }
    return { top: clamp(top, 16, vh - height - 16), left: clamp(left, 16, vw - width - 16), width, placement };
  }, [rect, cardSize, step?.placement, step?.spotlight_padding]);

  const arrow = useMemo(() => {
    if (!rect || !step?.arrow) return null;
    const cardCenter = { x: position.left + position.width / 2, y: position.top + (cardSize.height || 190) / 2 };
    const targetCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return { cardCenter, targetCenter };
  }, [rect, position, cardSize, step?.arrow]);

  const finish = useCallback(() => {
    if (!preview) {
      api.put('/guide/progress', { tour_key: tour?.key, step_index: steps.length, status: 'completed' }).catch(() => {});
      api.post('/guide/events', { tour_key: tour?.key, step_index: index, event: 'completed' }).catch(() => {});
      try { localStorage.setItem('careercode-guided-tour-v2-done', '1'); } catch { /* ignore */ }
    }
    onClose();
  }, [preview, tour?.key, steps.length, index, onClose]);

  if (!open || !tour || !step) return null;

  const total = steps.length;
  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="fixed inset-0 z-[79]" onClick={finish} />
      <svg className="fixed inset-0 z-[80] w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={Math.max(0, rect.left - (Number(step.spotlight_padding) || 8))}
                y={Math.max(0, rect.top - (Number(step.spotlight_padding) || 8))}
                width={Math.min(window.innerWidth, rect.width + (Number(step.spotlight_padding) || 8) * 2)}
                height={Math.min(window.innerHeight, rect.height + (Number(step.spotlight_padding) || 8) * 2)}
                rx="14"
                fill="black"
              />
            )}
          </mask>
          <marker id="tour-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#6366f1" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tour-spotlight)" />
        {arrow && (
          <line
            x1={arrow.cardCenter.x}
            y1={arrow.cardCenter.y}
            x2={arrow.targetCenter.x}
            y2={arrow.targetCenter.y}
            stroke="#6366f1"
            strokeWidth="2"
            strokeDasharray="5 4"
            markerEnd="url(#tour-arrow)"
          />
        )}
      </svg>

      {rect && (
        <div
          className="fixed rounded-2xl ring-2 ring-primary-400/80 pointer-events-none z-[81]"
          style={{
            left: rect.left - (Number(step.spotlight_padding) || 8),
            top: rect.top - (Number(step.spotlight_padding) || 8),
            width: rect.width + (Number(step.spotlight_padding) || 8) * 2,
            height: rect.height + (Number(step.spotlight_padding) || 8) * 2,
          }}
        />
      )}

      <div ref={cardRef} className="fixed z-[90] rounded-2xl bg-white dark:bg-gray-950 border border-primary-200 dark:border-primary-900 shadow-2xl p-4" style={{ top: position.top, left: position.left, width: position.width }}>
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-500">
            <Compass className="w-3.5 h-3.5" /> {step.chapter || tour.name} · {index + 1}/{total}
          </span>
          <button onClick={finish} aria-label="Close tour" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3"><div className="h-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} /></div>
        {loading ? <div className="py-6 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div> : (
          <>
            <h3 className="font-semibold text-sm">{step.title}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.body}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {step.prompt && <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt: step.prompt } }))}><MessageSquare className="w-3.5 h-3.5 mr-1" /> Ask GiGo</Button>}
              <div className="ml-auto flex gap-1.5">
                {index > 0 && <Button size="sm" variant="ghost" onClick={() => setIndex((i) => i - 1)}><ArrowLeft className="w-3.5 h-3.5" /></Button>}
                {index < total - 1 ? (
                  <Button size="sm" onClick={() => setIndex((i) => i + 1)}>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
                ) : (
                  <Button size="sm" onClick={finish}><Sparkles className="w-3.5 h-3.5 mr-1" /> Finish</Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
