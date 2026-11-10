import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, any>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '0x4AAAAAAF78035NWSV7Ko-N';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;

    const render = () => {
      if (cancelled || !container.current || !window.turnstile) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: SITE_KEY,
        theme: 'auto',
        callback: (token: string) => callback.current(token),
        'expired-callback': () => callback.current(null),
        'error-callback': () => callback.current(null),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
      if (!script) {
        script = document.createElement('script');
        script.src = SCRIPT;
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = '1';
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        try { window.turnstile.remove(widgetId); } catch { /* ignore */ }
      }
    };
  }, []);

  return <div ref={container} className="mt-3 min-h-[65px]" aria-label="Bot verification" />;
}
