import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { getDb } from './db';
import { AuthDO } from './crypto-do';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import publicRoutes from './routes/public';
import liveRoutes from './routes/live';
import courseRoutes from './routes/courses';
import schoolRoutes from './routes/schools';
import studentRoutes from './routes/student';
import notificationRoutes from './routes/notifications';
import certificateRoutes from './routes/certificates';
import careerGoalRoutes from './routes/career-goals';

export { AuthDO };

const app = new Hono<{ Bindings: Env }>();

function allowedOrigins(env: Env): string[] {
  return [
    env.FRONTEND_URL,
    'https://careercode.com.ng',
    'https://www.careercode.com.ng',
    ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : []),
  ]
    .filter(Boolean)
    .map((s) => s.trim());
}

app.use('*', async (c, next) => {
  const allowed = allowedOrigins(c.env);
  return cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (allowed.includes(origin)) return origin;
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })(c, next);
});

// ── Health ────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({
    success: true,
    message: 'CareerCode Academy API (Workers) is running',
    timestamp: new Date().toISOString(),
  })
);

app.get('/db-health', async (c) => {
  if (!c.env.DATABASE_URL) {
    return c.json(
      {
        success: false,
        message: 'DATABASE_URL is not configured',
        hint: 'wrangler secret put DATABASE_URL',
      },
      503
    );
  }
  try {
    const db = getDb(c.env);
    const { rows } = await db.query<{ now: string }>('SELECT NOW() AS now');
    return c.json({ success: true, message: 'Database is connected', timestamp: rows[0]?.now });
  } catch (error: any) {
    return c.json(
      { success: false, message: 'Database connection failed', detail: error?.message },
      503
    );
  }
});

// ── Phase 1: native versioned API mounts (ported from backend/src/routes) ──
// Registered BEFORE the strangler proxy so native routes take precedence.
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/analytics', analyticsRoutes);
app.route('/api/v1/public', publicRoutes);
app.route('/api/v1/live', liveRoutes);
app.route('/api/v1/courses', courseRoutes);
app.route('/api/v1/schools', schoolRoutes);
app.route('/api/v1/student', studentRoutes);
app.route('/api/v1/notifications', notificationRoutes);
app.route('/api/v1/certificates', certificateRoutes);
app.route('/api/v1/career-goals', careerGoalRoutes);

// ── Strangler proxy: any /api/v1/* path not (yet) implemented above is
// transparently forwarded to the legacy Express API so the new domain is
// fully functional during the port. Mounted LAST among /api/v1 routes —
// every app.route('/api/v1/...') added above takes precedence over it.
// TODO(port): remove once all routes are native.
const LEGACY_API = 'https://careercode-academy.onrender.com';

// Paths safe for short edge caching: public, unauthenticated GETs only.
// Authenticated requests (Authorization header) are NEVER cached.
const CACHEABLE_PREFIXES = [
  '/api/v1/courses',
  '/api/v1/public/',
  '/api/v1/blogs',
  '/api/v1/schools',
  '/api/v1/career/jobs',
  '/api/v1/career/internships',
  '/api/v1/career/alumni',
  '/api/v1/search',
];
const CACHE_TTL_SECONDS = 60;

function isCacheable(c: any): boolean {
  if (c.req.method.toUpperCase() !== 'GET') return false;
  if (c.req.header('authorization')) return false;
  const path = new URL(c.req.url).pathname;
  return CACHEABLE_PREFIXES.some((p) => path === p || path.startsWith(p));
}

async function fetchLegacy(c: any, target: string, init: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const resp = await fetch(target, { ...init, signal: controller.signal, redirect: 'manual' });
    console.log(JSON.stringify({ src: 'edge-proxy', method: init.method, target: target.replace('https://careercode-academy.onrender.com', 'legacy'), status: resp.status, ms: Date.now() - started }));
    return resp;
  } catch (err: any) {
    console.error(JSON.stringify({ src: 'edge-proxy', method: init.method, target: target.replace('https://careercode-academy.onrender.com', 'legacy'), error: err?.name || 'fetch-failed', ms: Date.now() - started }));
    throw err;
  } finally {
    clearTimeout(t);
  }
}

app.all('/api/v1/*', async (c) => {
  const url = new URL(c.req.url);
  // Deterministic native-precedence guard (independent of router ordering):
  // anything under a natively-ported namespace must never reach the proxy.
  const NATIVE_PREFIXES = ['/api/v1/auth/', '/api/v1/auth', '/api/v1/analytics/', '/api/v1/public/', '/api/v1/live/', '/api/v1/courses/', '/api/v1/courses', '/api/v1/schools/', '/api/v1/schools', '/api/v1/student/', '/api/v1/notifications/', '/api/v1/notifications', '/api/v1/certificates/', '/api/v1/certificates', '/api/v1/career-goals/'];
  if (NATIVE_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p.endsWith('/') ? p : p + '/'))) {
    return c.json({ success: false, message: 'Route not found' }, 404);
  }
  const target = `${LEGACY_API}${url.pathname}${url.search}`;
  const headers = new Headers();
  c.req.raw.headers.forEach((value: string, key: string) => {
    const k = key.toLowerCase();
    if (k !== 'host' && k !== 'content-length' && k !== 'connection') headers.set(key, value);
  });
  const method = c.req.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : c.req.raw.body,
  };

  // 1) Edge cache for safe public GETs (absorbs origin/DB blips for reads).
  // Cache key is the URL alone: cookies/Authorization never vary it, and
  // isCacheable() already excluded authenticated requests entirely.
  if (isCacheable(c)) {
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey).catch(() => undefined);
    // Retry loop: a flaky origin often succeeds on the second attempt.
    // Never pass a raw origin 5xx to the client for safe reads — serve
    // stale cache, else an honest 502.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fresh = await fetchLegacy(c, target, { ...init, method: 'GET', body: undefined });
        if (fresh.ok) {
          // `new Response` detaches the body from `fresh`; cache a clone of the
          // new response and return the new response itself (fresh is consumed).
          const res = new Response(fresh.body, fresh);
          res.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
          c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()).catch(() => {}));
          return res;
        }
        if (fresh.status >= 500 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 800));
          continue; // retry once on origin 5xx
        }
        if (cached) return cached; // origin error -> serve stale
        return fresh;
      } catch {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 800));
          continue; // retry once on network failure
        }
        if (cached) return cached; // origin unreachable -> serve stale
        return c.json({ success: false, source: 'edge', message: 'Upstream service temporarily unavailable. Please retry.' }, 502);
      }
    }
    if (cached) return cached;
    return c.json({ success: false, source: 'edge', message: 'Upstream service temporarily unavailable. Please retry.' }, 502);
  }

  // 2) Mutations + authenticated reads: no cache, one retry, honest 502.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchLegacy(c, target, init);
    } catch (err: any) {
      if (attempt === 1) {
        return c.json(
          { success: false, message: 'Upstream service temporarily unavailable. Please retry.' },
          502
        );
      }
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return c.json({ success: false, source: 'edge', message: 'Upstream service temporarily unavailable. Please retry.' }, 502);
});

// ── 404 + errors (same envelope as Express API) ──────────
app.notFound((c) => c.json({ success: false, message: 'Route not found' }, 404));
app.onError((err, c) => {
  const status = (err as any)?.statusCode ?? (err as any)?.status ?? 500;
  console.error(JSON.stringify({ src: 'edge-onerror', message: err?.message, status }));
  return c.json({ success: false, source: 'edge', message: err?.message || 'Internal server error' }, status as any);
});

export default app;
