import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { getDb } from './db';

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

// ── Phase 1+: versioned API mounts (ported from backend/src/routes) ──
// import authRoutes from './routes/auth';
// app.route('/api/v1/auth', authRoutes);

// ── Strangler proxy: any /api/v1/* path not (yet) implemented above is
// transparently forwarded to the legacy Express API so the new domain is
// fully functional during the port. Mounted LAST among /api/v1 routes —
// every app.route('/api/v1/...') added above takes precedence over it.
// TODO(port): remove once all routes are native.
const LEGACY_API = 'https://careercode-academy.onrender.com';

app.all('/api/v1/*', async (c) => {
  const url = new URL(c.req.url);
  const target = `${LEGACY_API}${url.pathname}${url.search}`;
  const headers = new Headers();
  c.req.raw.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k !== 'host' && k !== 'content-length' && k !== 'connection') headers.set(key, value);
  });
  const method = c.req.method.toUpperCase();
  const resp = await fetch(target, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : c.req.raw.body,
    redirect: 'manual',
  });
  return resp;
});

// ── 404 + errors (same envelope as Express API) ──────────
app.notFound((c) => c.json({ success: false, message: 'Route not found' }, 404));
app.onError((err, c) => {
  const status = (err as any)?.statusCode ?? (err as any)?.status ?? 500;
  return c.json({ success: false, message: err?.message || 'Internal server error' }, status as any);
});

export default app;
