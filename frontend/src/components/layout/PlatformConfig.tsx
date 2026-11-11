import { useEffect } from 'react';
import api from '@/lib/axios';

/**
 * Applies admin-controlled platform settings that affect the document:
 * language, timezone and the platform description meta tag.
 */
export function PlatformConfig() {
  useEffect(() => {
    let alive = true;
    api.get('/public/config').then(({ data }) => {
      if (!alive || !data?.data) return;
      const cfg = data.data;
      const language = String(cfg.language || 'English (Nigeria)');
      document.documentElement.lang = language.includes('US') ? 'en-US' : language.includes('UK') ? 'en-GB' : 'en-NG';
      document.documentElement.dataset.timezone = String(cfg.timezone || 'West Africa Time (WAT)');
      if (cfg.description) {
        const meta = document.querySelector('meta[name="description"]');
        if (meta && (!meta.getAttribute('content') || meta.getAttribute('content')?.includes('Helping beginners'))) {
          meta.setAttribute('content', String(cfg.description));
        }
      }
      (window as any).__CAREERCODE_CONFIG__ = cfg;
    }).catch(() => { /* defaults are fine */ });
    return () => { alive = false; };
  }, []);
  return null;
}
