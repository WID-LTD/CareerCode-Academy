// Route-level integration test for the D1-backed worker.
//
// Runs the real Hono app against the seeded local SQLite file (the same file
// wrangler/miniflare uses) with a tiny D1 shim, so every route's SQL is
// exercised end-to-end without needing the Cloudflare edge or network.
//
// Usage: npx tsx scripts/d1/test-routes.ts
import { DatabaseSync } from 'node:sqlite';
import { sign } from 'hono/jwt';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const DB_FILE = process.env.SEED_DB ||
  path.join(ROOT, 'workers/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/ccde2c5463f65b41f0de86fd4fca4e3b3bad328c73d2b27914d58e6f18324222.sqlite');

if (!fs.existsSync(DB_FILE)) {
  console.error('Missing seeded DB:', DB_FILE);
  process.exit(1);
}

const raw = new DatabaseSync(DB_FILE);

class Stmt {
  constructor(private sql: string, private params: any[] = []) {}
  bind(...params: any[]) { return new Stmt(this.sql, params); }
  async all() {
    const stmt = raw.prepare(this.sql);
    const rows = this.params.length ? stmt.all(...this.params) : stmt.all();
    return { success: true, results: rows, meta: {} } as any;
  }
  async run() { return this.all(); }
  async first() { const r = await this.all(); return r.results[0] ?? null; }
}
const DB = { prepare: (sql: string) => new Stmt(sql) };

// AuthDO shim: production runs bcrypt inside a Durable Object; here we run the
// same bcryptjs call directly so the auth flow can be exercised offline.
const bcrypt = require('bcryptjs');
const AUTH_DO = {
  idFromName: (n: string) => n,
  get: () => ({
    fetch: async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      if (body.action === 'hash') return Response.json({ success: true, hash: await bcrypt.hash(body.password, 4) });
      if (body.action === 'verify') return Response.json({ success: true, ok: await bcrypt.compare(body.password, body.hash) });
      return Response.json({ success: false, message: 'unknown' }, { status: 400 });
    },
  }),
};

const JWT_SECRET = 'test-jwt-secret';
const JWT_REFRESH_SECRET = 'test-refresh-secret';
const env: any = {
  DB,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  FRONTEND_URL: 'https://careercode.com.ng',
  CORS_ORIGINS: 'https://careercode.com.ng',
  AUTH_DO,
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require(path.join(ROOT, 'workers/src/index.ts')).default;

const pending: Promise<any>[] = [];
const ctx = { waitUntil: (p: Promise<any>) => pending.push(p), passThroughOnException: () => {} };

async function call(pathname: string, opts: { token?: string; method?: string; body?: any; cookie?: string } = {}) {
  const headers: Record<string, string> = { Origin: 'https://careercode.com.ng' };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await app.request(pathname, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }, env, ctx);
  const text = await res.text();
  // waitUntil work (analytics writes) must finish before assertions run.
  await Promise.allSettled(pending.splice(0));
  if (process.env.DUMP_DIR) {
    fs.mkdirSync(process.env.DUMP_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.DUMP_DIR, pathname.replace(/[^a-z0-9]+/gi, '_') + '.json'), text);
  }
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

async function main() {
  const user: any = raw.prepare(
    `SELECT u.id, u.role FROM users u JOIN enrollments e ON e.user_id = u.id
     WHERE u.role = 'student' GROUP BY u.id ORDER BY COUNT(*) DESC LIMIT 1`
  ).get();
  const admin: any = raw.prepare(
    "SELECT id, role FROM users WHERE role IN ('admin','super_admin') LIMIT 1"
  ).get();
  const course: any = raw.prepare("SELECT slug FROM courses LIMIT 1").get();
  const school: any = raw.prepare("SELECT slug FROM schools LIMIT 1").get();
  const enrolled: any = raw.prepare(
    "SELECT e.course_id, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? LIMIT 1"
  ).get(user.id);
  const anyLesson: any = raw.prepare(
    "SELECT id, course_id FROM lessons WHERE course_id = ? ORDER BY order_index LIMIT 1"
  ).get(enrolled.course_id);
  const freeCourse: any = raw.prepare(
    "SELECT id, slug FROM courses WHERE published = 1 AND (price IS NULL OR price = 0) LIMIT 1"
  ).get();

  const token = await sign({ userId: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 900 }, JWT_SECRET);
  const adminToken = admin
    ? await sign({ userId: admin.id, role: admin.role, exp: Math.floor(Date.now() / 1000) + 900 }, JWT_SECRET)
    : token;

  const checks: Array<[string, () => Promise<any>, (r: any) => string | null]> = [
    ['GET /health', () => call('/health'), (r) => (r.status === 200 && r.json?.success ? null : 'not ok')],
    ['GET /api/v1/public/stats', () => call('/api/v1/public/stats'), (r) => (r.json?.data?.students > 0 ? null : JSON.stringify(r.json).slice(0, 120))],
    ['GET /api/v1/courses', () => call('/api/v1/courses?limit=3'), (r) => (Array.isArray(r.json?.data) && r.json.data.length ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/courses/slug/:slug', () => call(`/api/v1/courses/slug/${course.slug}`), (r) => (r.json?.data?.slug === course.slug ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/schools', () => call('/api/v1/schools'), (r) => (Array.isArray(r.json?.data) && r.json.data.length ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/schools/:slug', () => call(`/api/v1/schools/${school.slug}`), (r) => (r.json?.data ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/career-goals', () => call('/api/v1/career-goals'), (r) => (Array.isArray(r.json?.data) && r.json.data.length ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/career-goals/:slug', () => call(`/api/v1/career-goals/${raw.prepare('SELECT slug FROM career_goals LIMIT 1').get()!.slug}`), (r) => (r.json?.data ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/student/dashboard', () => call('/api/v1/student/dashboard', { token }), (r) => (r.json?.data?.stats ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/notifications', () => call('/api/v1/notifications?limit=5', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/certificates', () => call('/api/v1/certificates?limit=5', { token }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/career-goals/my/goals', () => call('/api/v1/career-goals/my/goals', { token }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/live/admin/usage', () => call('/api/v1/live/admin/usage', { token: adminToken }), (r) => (r.status === 200 || r.status === 403 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/analytics/track/page-view', () => call('/api/v1/analytics/track/page-view', {
      method: 'POST',
      body: { visitor_id: 'test-visitor', page_url: '/', route_name: 'home', time_spent_sec: 5, is_exit_page: false },
    }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/analytics/track/heartbeat', () => call('/api/v1/analytics/track/heartbeat', {
      method: 'POST',
      body: { visitor_id: 'test-visitor', page_url: '/', time_spent_sec: 10 },
    }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/analytics/track/batch', () => call('/api/v1/analytics/track/batch', {
      method: 'POST',
      body: { events: [{ type: 'page_view', visitor_id: 'test-visitor', page_url: '/', route_name: 'home' }] },
    }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/auth/register', async () => {
      const email = `d1-smoke-${Date.now()}@example.com`;
      const r = await call('/api/v1/auth/register', { method: 'POST', body: { name: 'D1 Smoke', email, password: 'Test1234!' } });
      (globalThis as any).__email = email;
      return r;
    }, (r) => (r.json?.success || r.status === 201 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/auth/login', async () => {
      // Skip the email-verification gate the same way an inbox click would.
      raw.prepare('UPDATE users SET is_verified = 1 WHERE email = ?').run((globalThis as any).__email);
      return call('/api/v1/auth/login', { method: 'POST', body: { email: (globalThis as any).__email, password: 'Test1234!' } });
    }, (r) => {
      const t = r.json?.data?.token || r.json?.token;
      if (!t) return JSON.stringify(r.json).slice(0, 200);
      (globalThis as any).__token = t;
      (globalThis as any).__refresh = r.json?.data?.refreshToken || r.json?.refreshToken;
      return null;
    }],
    ['GET /api/v1/auth/me', async () => call('/api/v1/auth/me', { token: (globalThis as any).__token }), (r) => (r.json?.data?.email ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/auth/logout', async () => call('/api/v1/auth/logout', { method: 'POST', token: (globalThis as any).__token, body: { refreshToken: (globalThis as any).__refresh } }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/analytics/track/page-view persists', async () => {
      const v = `test-visitor-${Date.now()}`;
      const r = await call('/api/v1/analytics/track/page-view', {
        method: 'POST', cookie: `vcv_id=${v}`,
        body: { page_url: '/persist-check', route_name: 'test', time_spent_sec: 3 },
      });
      const row = raw.prepare('SELECT COUNT(*) AS c FROM page_views WHERE visitor_id = ?').get(v) as any;
      return { ...r, __rows: row.c };
    }, (r) => (r.json?.success && r.__rows === 1 ? null : `status ${r.status}, rows ${r.__rows}`)],
    ['POST /api/v1/analytics/track/click persists', async () => {
      const v = `test-visitor-${Date.now()}-c`;
      const r = await call('/api/v1/analytics/track/click', {
        method: 'POST', cookie: `vcv_id=${v}`,
        body: { page_url: '/persist-check', element_text: 'Enroll', element_type: 'button' },
      });
      const row = raw.prepare('SELECT COUNT(*) AS c FROM click_events WHERE visitor_id = ?').get(v) as any;
      return { ...r, __rows: row.c };
    }, (r) => (r.json?.success && r.__rows === 1 ? null : `status ${r.status}, rows ${r.__rows}`)],
    ['GET /api/v1/enrollments', () => call('/api/v1/enrollments?limit=5', { token }), (r) => (Array.isArray(r.json?.data) && r.json.data.length ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/enrollments/:id', async () => {
      const id = raw.prepare('SELECT id FROM enrollments WHERE user_id = ? LIMIT 1').get(user.id)!.id;
      return call(`/api/v1/enrollments/${id}`, { token });
    }, (r) => (r.json?.data?.id ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/progress', () => call(`/api/v1/progress?courseId=${enrolled.course_id}`, { token }), (r) => (r.json?.data?.progress ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/progress', () => call('/api/v1/progress', { method: 'POST', token, body: { lessonId: anyLesson.id, completed: true } }), (r) => {
      // 403 is correct when the lesson has a published quiz the user hasn't passed.
      if (r.status === 403 && r.json?.quizRequired) return null;
      return r.json?.data?.totalLessons > 0 ? null : JSON.stringify(r.json).slice(0, 200);
    }],
    ['GET /api/v1/progress/detailed', () => call(`/api/v1/progress/detailed?courseId=${enrolled.course_id}`, { token }), (r) => (r.json?.data?.lessons ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/progress/modules', () => call(`/api/v1/progress/modules?courseId=${enrolled.course_id}`, { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/progress/continue-watching', () => call('/api/v1/progress/continue-watching', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 200))],
    ['PUT /api/v1/progress/watch-position', () => call('/api/v1/progress/watch-position', { method: 'PUT', token, body: { lessonId: anyLesson.id, courseId: enrolled.course_id, watchPosition: 42, watchPercentage: 20 } }), (r) => (r.json?.data?.lesson_id ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/modules/course/:id', () => call(`/api/v1/modules/course/${enrolled.course_id}`), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/lessons/:id', () => call(`/api/v1/lessons/${anyLesson.id}`), (r) => (r.json?.data?.id ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/lessons/:id/notes', () => call(`/api/v1/lessons/${anyLesson.id}/notes`, { method: 'POST', token, body: { content: 'd1 note' } }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/lessons/:id/notes', () => call(`/api/v1/lessons/${anyLesson.id}/notes`, { token }), (r) => (r.json?.data === 'd1 note' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/reviews/course/:id', () => call(`/api/v1/reviews/course/${enrolled.course_id}`), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/reviews', () => call('/api/v1/reviews', { method: 'POST', token, body: { courseId: enrolled.course_id, rating: 5, comment: 'd1 review' } }), (r) => (r.status === 201 || r.status === 409 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/wishlists', () => call('/api/v1/wishlists', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/wishlists', () => call('/api/v1/wishlists', { method: 'POST', token, body: { courseId: freeCourse.id } }), (r) => (r.status === 201 || r.status === 409 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['DELETE /api/v1/wishlists/:courseId', () => call(`/api/v1/wishlists/${freeCourse.id}`, { method: 'DELETE', token }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/courses/:id/enroll (already enrolled)', () => call(`/api/v1/courses/${enrolled.course_id}/enroll`, { method: 'POST', token }), (r) => (r.status === 409 ? null : `expected 409, got ${r.status}`)],
    ['GET /api/v1/gamification/hearts', () => call('/api/v1/gamification/hearts', { token }), (r) => (r.json?.data?.maxHearts ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/gamification/daily-progress', () => call('/api/v1/gamification/daily-progress', { token }), (r) => (r.json?.data?.goal ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/gamification/xp-history', () => call('/api/v1/gamification/xp-history', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/gamification/balance', () => call('/api/v1/gamification/balance', { token }), (r) => (typeof r.json?.data?.available === 'number' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/gamification/discount-codes', () => call('/api/v1/gamification/discount-codes', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/gamification/xp-history-full', () => call('/api/v1/gamification/xp-history-full', { token }), (r) => (r.json?.data?.balance ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/learning-paths', () => call('/api/v1/learning-paths'), (r) => (Array.isArray(r.json?.data) && r.json.data.length ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/learning-paths/grouped-by-school', () => call('/api/v1/learning-paths/grouped-by-school'), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/learning-paths/:slug', async () => {
      const slug = raw.prepare('SELECT slug FROM learning_paths LIMIT 1').get()!.slug;
      return call(`/api/v1/learning-paths/${slug}`);
    }, (r) => (r.json?.data?.slug ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/learning-paths/my/enrollments', () => call('/api/v1/learning-paths/my/enrollments', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/search', () => call('/api/v1/search?q=design&limit=3'), (r) => (r.json?.data?.courses ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/users/:id', () => call(`/api/v1/users/${user.id}`), (r) => (r.json?.data?.id === user.id ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/users (non-admin)', () => call('/api/v1/users', { token }), (r) => (r.status === 403 ? null : `expected 403, got ${r.status}`)],
    ['GET /api/v1/resources/course/:id', () => call(`/api/v1/resources/course/${enrolled.course_id}`), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/notifications (no auth)', () => call('/api/v1/notifications'), (r) => (r.status === 401 ? null : `expected 401, got ${r.status}`)],
    ['GET /api/v1/student/dashboard (no auth)', () => call('/api/v1/student/dashboard'), (r) => (r.status === 401 ? null : `expected 401, got ${r.status}`)],
  ];

  let failed = 0;
  for (const [name, fn, check] of checks) {
    try {
      const res = await fn();
      const problem = check(res);
      if (problem) { failed++; console.log(`FAIL ${name} -> ${res.status} ${problem}`); }
      else console.log(`PASS ${name} -> ${res.status}`);
    } catch (e: any) {
      failed++;
      console.log(`FAIL ${name} -> threw ${e.message}`);
    }
  }
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
