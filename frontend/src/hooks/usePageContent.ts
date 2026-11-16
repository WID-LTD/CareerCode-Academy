import { useEffect, useState } from 'react';
import api from '@/lib/axios';

function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function mergeContent<T>(fallback: T, incoming: any): T {
  if (incoming === null || incoming === undefined) return fallback;
  if (Array.isArray(fallback)) return (Array.isArray(incoming) ? incoming : fallback) as T;
  if (isObject(fallback) && isObject(incoming)) {
    const out: any = { ...fallback };
    for (const key of Object.keys(incoming)) {
      out[key] = key in (fallback as any)
        ? mergeContent((fallback as any)[key], incoming[key])
        : incoming[key];
    }
    return out as T;
  }
  return incoming as T;
}

/**
 * Load published page content from the admin website editor. The hardcoded
 * fallback is used immediately and whenever the API is unavailable, so the
 * public site never depends on a successful content request.
 */
export function usePageContent<T>(slug: string, fallback: T): T {
  const [content, setContent] = useState<T>(fallback);

  useEffect(() => {
    let alive = true;
    api.get(`/pages/${slug}`)
      .then(({ data }) => {
        if (!alive) return;
        const raw = data?.data?.content;
        const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
        if (parsed) setContent(mergeContent(fallback, parsed));
      })
      .catch(() => { /* keep the built-in copy */ });
    return () => { alive = false; };
  }, [slug]);

  return content;
}
