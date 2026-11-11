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
import { createHash } from 'node:crypto';
import { totpCode } from '../../workers/src/totp';

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
    try {
      const stmt = raw.prepare(this.sql);
      const rows = this.params.length ? stmt.all(...this.params) : stmt.all();
      return { success: true, results: rows, meta: {} } as any;
    } catch (e: any) {
      if (process.env.DEBUG_SQL) console.error('SQLFAIL:', e.message, '\n', this.sql.replace(/\s+/g, ' ').slice(0, 500));
      throw e;
    }
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
  AI: {
    run: async (model: string) => {
      if (String(model).includes('whisper')) return { text: 'Explain compilers' };
      if (String(model).includes('melotts') || String(model).includes('aura')) return { audio: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=' };
      return { response: JSON.stringify({ blocks: [{ type: 'quiz', question: 'What does a compiler do?', options: ['Run code', 'Translate code', 'Debug code', 'Style code'], answer: 1, explanation: 'It translates source code into machine code.' }], followups: ['Try another'] }) };
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod = require(path.join(ROOT, 'workers/src/index.ts'));
const app = mod.app || mod.default;

const pending: Promise<any>[] = [];
const ctx = { waitUntil: (p: Promise<any>) => pending.push(p), passThroughOnException: () => {} };

async function call(pathname: string, opts: { token?: string; method?: string; body?: any; cookie?: string } = {}) {
  const headers: Record<string, string> = { Origin: 'https://careercode.com.ng' };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (opts.body && !isForm) headers['Content-Type'] = 'application/json';
  const res = await app.request(pathname, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
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
    ['POST /api/v1/auth/verify-email', async () => {
      const row: any = raw.prepare('SELECT verification_token FROM users WHERE email = ?').get((globalThis as any).__email);
      return call('/api/v1/auth/verify-email', {
        method: 'POST', body: { email: (globalThis as any).__email, code: row.verification_token },
      });
    }, (r) => (r.json?.data?.token ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/auth/login', async () => call('/api/v1/auth/login', { method: 'POST', body: { email: (globalThis as any).__email, password: 'Test1234!' } }), (r) => {
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
    ['GET /api/v1/payments/history', () => call('/api/v1/payments/history', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/payments/validate-discount (bad code)', () => call('/api/v1/payments/validate-discount', { method: 'POST', token, body: { code: 'NOPE-123' } }), (r) => (r.status === 400 ? null : `expected 400, got ${r.status}`)],
    ['POST /api/v1/payments/initialize (paid course)', async () => {
      const paid: any = raw.prepare(
        `SELECT id FROM courses WHERE price > 0 AND published = 1
         AND id NOT IN (SELECT course_id FROM enrollments WHERE user_id = ?) LIMIT 1`
      ).get(user.id);
      if (!paid) return { status: 200, json: { success: true, skipped: true } };
      const r = await call('/api/v1/payments/initialize', {
        method: 'POST', token, body: { courseId: paid.id, provider: 'paystack', currency: 'NGN' },
      });
      (globalThis as any).__paidCourse = paid.id;
      (globalThis as any).__reference = r.json?.data?.reference;
      return r;
    }, (r) => (r.json?.skipped || r.json?.data?.reference ? null : JSON.stringify(r.json).slice(0, 220))],
    ['GET /api/v1/payments/verify/:reference', async () => {
      const ref = (globalThis as any).__reference;
      if (!ref) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/payments/verify/${ref}`, { token });
    }, (r) => {
      if (r.json?.skipped) return null;
      if (r.json?.data?.status !== 'completed') return JSON.stringify(r.json).slice(0, 220);
      const courseId = (globalThis as any).__paidCourse;
      const enr: any = raw.prepare('SELECT COUNT(*) AS c FROM enrollments WHERE user_id = ? AND course_id = ?').get(user.id, courseId);
      return enr.c === 1 ? null : 'payment completed but enrollment missing';
    }],
    ['PUT /api/v1/auth/profile', () => call('/api/v1/auth/profile', { method: 'PUT', token: (globalThis as any).__token, body: { name: 'D1 Smoke Renamed', headline: 'QA' } }), (r) => (r.json?.data?.name === 'D1 Smoke Renamed' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/forgot-password', () => call('/api/v1/auth/forgot-password', { method: 'POST', body: { email: (globalThis as any).__email } }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/reset-password', async () => {
      const known = 'known-reset-token-123';
      const hashed = createHash('sha256').update(known).digest('hex');
      raw.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?')
        .run(hashed, new Date(Date.now() + 600000).toISOString(), (globalThis as any).__email);
      return call('/api/v1/auth/reset-password', { method: 'POST', body: { token: known, password: 'NewPass1234!' } });
    }, (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/login (new password)', () => call('/api/v1/auth/login', { method: 'POST', body: { email: (globalThis as any).__email, password: 'NewPass1234!' } }), (r) => (r.json?.data?.token ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/change-password', async () => {
      const login = await call('/api/v1/auth/login', { method: 'POST', body: { email: (globalThis as any).__email, password: 'NewPass1234!' } });
      const tok = login.json?.data?.token;
      return call('/api/v1/auth/change-password', { method: 'POST', token: tok, body: { currentPassword: 'NewPass1234!', newPassword: 'FinalPass1234!' } });
    }, (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/users/me/preferences', () => call('/api/v1/users/me/preferences', { token }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['PUT /api/v1/users/me/preferences', () => call('/api/v1/users/me/preferences', { method: 'PUT', token, body: { data: { 'Course Updates': true, theme: 'dark' } } }), (r) => (r.json?.data?.['Course Updates'] ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/login (for 2FA setup)', async () => {
      const r = await call('/api/v1/auth/login', { method: 'POST', body: { email: (globalThis as any).__email, password: 'FinalPass1234!' } });
      (globalThis as any).__smokeToken = r.json?.data?.token;
      return r;
    }, (r) => (r.json?.data?.token ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/auth/2fa/status', () => call('/api/v1/auth/2fa/status', { token: (globalThis as any).__smokeToken }), (r) => (typeof r.json?.data?.enabled === 'boolean' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/2fa/setup', async () => {
      const r = await call('/api/v1/auth/2fa/setup', { method: 'POST', token: (globalThis as any).__smokeToken });
      (globalThis as any).__totpSecret = r.json?.data?.secret;
      return r;
    }, (r) => (r.json?.data?.secret ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/2fa/enable', async () => {
      const secret = (globalThis as any).__totpSecret;
      if (!secret) return { status: 200, json: { success: true, skipped: true } };
      return call('/api/v1/auth/2fa/enable', { method: 'POST', token: (globalThis as any).__smokeToken, body: { code: await totpCode(secret) } });
    }, (r) => (r.json?.skipped || r.json?.data?.enabled ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/login (2FA required)', () => call('/api/v1/auth/login', { method: 'POST', body: { email: (globalThis as any).__email, password: 'FinalPass1234!' } }), (r) => (r.json?.twoFactorRequired ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/login (with 2FA code)', async () => {
      const secret = (globalThis as any).__totpSecret;
      return call('/api/v1/auth/login', { method: 'POST', body: { email: (globalThis as any).__email, password: 'FinalPass1234!', twoFactorCode: secret ? await totpCode(secret) : '' } });
    }, (r) => (r.json?.data?.token ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/auth/2fa/disable', async () => {
      const secret = (globalThis as any).__totpSecret;
      return call('/api/v1/auth/2fa/disable', { method: 'POST', token: (globalThis as any).__smokeToken, body: { password: 'FinalPass1234!', code: secret ? await totpCode(secret) : undefined } });
    }, (r) => (r.json?.data?.enabled === false ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/auth/google (unconfigured)', () => call('/api/v1/auth/google'), (r) => (r.status === 503 || r.status === 302 ? null : `unexpected ${r.status}`)],
    ['POST /api/v1/auth/oauth/exchange (bad code)', () => call('/api/v1/auth/oauth/exchange', { method: 'POST', body: { code: 'nope' } }), (r) => (r.status === 401 ? null : `expected 401, got ${r.status}`)],
    ['GET /api/v1/notifications exposes deep links', async () => {
      raw.prepare('INSERT INTO notifications (user_id, title, message, type, link) VALUES (?,?,?,?,?)')
        .run(user.id, 'Deep link test', 'body', 'certificate', '/student/certificates');
      const r = await call('/api/v1/notifications?limit=5', { token });
      const row = (r.json?.data || []).find((n: any) => n.title === 'Deep link test');
      return { ...r, __link: row?.link };
    }, (r) => (r.__link === '/student/certificates' ? null : `link missing (${r.__link})`)],
    ['GET /api/v1/programs (admin)', () => call('/api/v1/programs?limit=3', { token: adminToken }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/programs/:id', async () => {
      const id = raw.prepare('SELECT id FROM programs LIMIT 1').get()!.id;
      return call(`/api/v1/programs/${id}`, { token: adminToken });
    }, (r) => (r.json?.data?.id ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/programs/:id/cohorts', async () => {
      const id = raw.prepare('SELECT id FROM programs LIMIT 1').get()!.id;
      return call(`/api/v1/programs/${id}/cohorts`, { token: adminToken });
    }, (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/programs/me/cohorts', () => call('/api/v1/programs/me/cohorts', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/programs/purchase/verify (bad ref)', () => call('/api/v1/programs/purchase/verify/nope', { token }), (r) => (r.status === 404 ? null : `expected 404, got ${r.status}`)],
    ['GET /api/v1/calendar/upcoming', () => call('/api/v1/calendar/upcoming?limit=3', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/calendar', () => call('/api/v1/calendar?limit=3', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/guided/readiness', () => call('/api/v1/guided/readiness', { token }), (r) => (r.json?.data?.readiness_score !== undefined ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/career/jobs', () => call('/api/v1/career/jobs'), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/career/alumni', () => call('/api/v1/career/alumni'), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/exams (admin)', () => call('/api/v1/exams?limit=3', { token: adminToken }), (r) => (Array.isArray(r.json?.data) || r.json?.data?.exams ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/quizzes/course/:id', () => call(`/api/v1/quizzes/course/${enrolled.course_id}`, { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/quizzes/attempts/my', () => call('/api/v1/quizzes/attempts/my', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/assignments/course/:id', () => call(`/api/v1/assignments/course/${enrolled.course_id}`, { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/assignments/submissions/my', () => call('/api/v1/assignments/submissions/my', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/challenges/languages', () => call('/api/v1/challenges/languages'), (r) => (r.json?.data ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/challenges/course/:id', () => call(`/api/v1/challenges/course/${enrolled.course_id}`, { token }), (r) => (Array.isArray(r.json?.data) || r.status === 403 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/community/categories', () => call('/api/v1/community/categories'), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/community/channels', () => call('/api/v1/community/channels', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/discussions', () => call('/api/v1/discussions'), (r) => (Array.isArray(r.json?.data) || r.json?.data?.discussions ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/forum/course/:id', () => call(`/api/v1/forum/course/${enrolled.course_id}`, { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/pages/:slug', () => call('/api/v1/pages/about'), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/promotions/active', () => call('/api/v1/promotions/active'), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/board/members', () => call('/api/v1/board/members'), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/board/policies', () => call('/api/v1/board/policies'), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/pathway-finder', () => call('/api/v1/pathway-finder', { token }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/messages/conversations', () => call('/api/v1/messages/conversations', { token }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/showcase-videos/all (admin)', () => call('/api/v1/showcase-videos/all', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/videos/stream/:lessonId', () => call(`/api/v1/videos/stream/${anyLesson.id}`, { token }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/payouts/instructor', () => call('/api/v1/payouts/instructor', { token }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/admin/users (admin)', () => call('/api/v1/admin/users?limit=3', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/admin/analytics (admin)', () => call('/api/v1/admin/analytics', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/admin/courses (admin)', () => call('/api/v1/admin/courses?limit=3', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/admin/payments (admin)', () => call('/api/v1/admin/payments?limit=3', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/admin/settings (admin)', () => call('/api/v1/admin/settings', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/instructor/dashboard/stats', () => call('/api/v1/instructor/dashboard/stats', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/instructor/students', () => call('/api/v1/instructor/students', { token: adminToken }), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/blogs', () => call('/api/v1/blogs?limit=3'), (r) => (r.status < 500 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/student/assignments', () => call('/api/v1/student/assignments?page=1&limit=5', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/student/mentoring-slots', () => call('/api/v1/student/mentoring-slots', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/student/my-mentoring-slots', () => call('/api/v1/student/my-mentoring-slots', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/student/tickets', () => call('/api/v1/student/tickets', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/enrollments/course/:id', () => call(`/api/v1/enrollments/course/${enrolled.course_id}`, { token }), (r) => (r.json?.data?.course_id === enrolled.course_id ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/courses/:id/announcements', () => call(`/api/v1/courses/${enrolled.course_id}/announcements`, { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/courses/:id/lessons', () => call(`/api/v1/courses/${enrolled.course_id}/lessons`), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/payments/initialize (already enrolled)', () => call('/api/v1/payments/initialize', { method: 'POST', token, body: { courseId: enrolled.course_id, provider: 'paystack', currency: 'NGN' } }), (r) => (r.json?.data?.alreadyEnrolled ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/courses (admin)', async () => {
      const r = await call('/api/v1/courses', { method: 'POST', token: adminToken, body: { title: `D1 Test Course ${Date.now()}`, description: 'Temporary course created by the route suite', category: 'General', price: 0, level: 'beginner', rules: 'Be kind and submit work on time.' } });
      (globalThis as any).__newCourse = r.json?.data?.id;
      return r;
    }, (r) => (r.status === 201 && r.json?.data?.id ? null : JSON.stringify(r.json).slice(0, 200))],
    ['DELETE /api/v1/courses/:id', async () => {
      const id = (globalThis as any).__newCourse;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/courses/${id}`, { method: 'DELETE', token: adminToken });
    }, (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/admin/users', async () => {
      const email = `created-${Date.now()}@example.com`;
      const r = await call('/api/v1/admin/users', { method: 'POST', token: adminToken, body: { name: 'Created User', email, role: 'student', sendInvite: false } });
      (globalThis as any).__createdId = r.json?.data?.id;
      return r;
    }, (r) => (r.status === 201 && r.json?.data?.id ? null : JSON.stringify(r.json).slice(0, 200))],
    ['DELETE /api/v1/admin/users/:id (cleanup)', async () => {
      const id = (globalThis as any).__createdId;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/admin/users/${id}`, { method: 'DELETE', token: adminToken });
    }, (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/applications/instructor (multipart)', async () => {
      const form = new FormData();
      form.append('fullName', 'Multipart Applicant');
      form.append('email', `applicant-${Date.now()}@example.com`);
      form.append('phone', '+2348000000000');
      form.append('country', 'Nigeria');
      form.append('professionalTitle', 'Engineer');
      form.append('yearsExperience', '5');
      form.append('specialization', 'Web');
      return call('/api/v1/applications/instructor', { method: 'POST', body: form });
    }, (r) => (r.status === 201 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/portfolio/templates', () => call('/api/v1/portfolio/templates'), (r) => (Array.isArray(r.json?.data) && r.json.data.length >= 6 ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/portfolio/site', () => call('/api/v1/portfolio/site', { token }), (r) => (r.json?.data?.site ? null : JSON.stringify(r.json).slice(0, 160))],
    ['PUT /api/v1/portfolio/site', () => call('/api/v1/portfolio/site', { method: 'PUT', token, body: { template: 'terminal', headline: 'QA Engineer', theme: { accent: '#22c55e' } } }), (r) => (r.json?.data?.template === 'terminal' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/portfolio/site/projects', async () => {
      const r = await call('/api/v1/portfolio/site/projects', { method: 'POST', token, body: { title: `Portfolio QA ${Date.now()}`, summary: 'test', tech: ['React'], demo_url: 'https://example.com' } });
      (globalThis as any).__pfProject = r.json?.data?.id;
      return r;
    }, (r) => (r.status === 201 && r.json?.data?.id ? null : JSON.stringify(r.json).slice(0, 200))],
    ['PUT /api/v1/portfolio/site/projects/:id', async () => {
      const id = (globalThis as any).__pfProject;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/portfolio/site/projects/${id}`, { method: 'PUT', token, body: { featured: true, cover_url: 'https://pub-a2269f45348a44958044822fb0428bb7.r2.dev/courses/79d896eb-aeb8-4086-9861-8abef8b0863f-2acfb5505d.jpg' } });
    }, (r) => (r.json?.skipped || r.json?.data?.featured ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/portfolio/site/publish', () => call('/api/v1/portfolio/site/publish', { method: 'POST', token }), (r) => (r.json?.data?.is_published ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/portfolio/site/:username (public)', async () => {
      const username = raw.prepare('SELECT username FROM users WHERE id = ?').get(user.id)?.username;
      return call(`/api/v1/portfolio/site/${username}`);
    }, (r) => (r.json?.data?.site ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/portfolio/site/analytics', () => call('/api/v1/portfolio/site/analytics', { token }), (r) => (typeof r.json?.data?.views === 'number' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['DELETE /api/v1/portfolio/site/projects/:id', async () => {
      const id = (globalThis as any).__pfProject;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/portfolio/site/projects/${id}`, { method: 'DELETE', token });
    }, (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/community/communities (approval)', async () => {
      const slug = `qa-community-${Date.now()}`;
      const r = await call('/api/v1/community/communities', { method: 'POST', token: adminToken, body: { name: 'QA Community', slug, description: 'test', category: 'General', visibility: 'private', join_policy: 'approval' } });
      (globalThis as any).__commId = r.json?.data?.id;
      return r;
    }, (r) => (r.status === 201 || r.status === 200 ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/community/:id/join (approval -> request)', async () => {
      const id = (globalThis as any).__commId;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/community/communities/${id}/join`, { method: 'POST', token });
    }, (r) => (r.json?.skipped || r.json?.requested ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/community/:id/requests', async () => {
      const id = (globalThis as any).__commId;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/community/communities/${id}/requests`, { token: adminToken });
    }, (r) => (r.json?.skipped || Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 200))],
    ['PUT /api/v1/community/:id/requests/:rid (approve)', async () => {
      const id = (globalThis as any).__commId;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      const list = await call(`/api/v1/community/communities/${id}/requests`, { token: adminToken });
      const rid = list.json?.data?.[0]?.id;
      if (!rid) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/community/communities/${id}/requests/${rid}`, { method: 'PUT', token: adminToken, body: { status: 'approved' } });
    }, (r) => (r.json?.skipped || r.json?.success ? null : JSON.stringify(r.json).slice(0, 200))],
    ['GET /api/v1/community/my-requests', () => call('/api/v1/community/my-requests', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/portfolio/directory', () => call('/api/v1/portfolio/directory'), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/payments/:ref/receipt (PDF)', async () => {
      const pay: any = raw.prepare('SELECT reference FROM payments LIMIT 1').get();
      if (!pay) return { status: 200, json: { success: true, skipped: true } };
      const res = await app.request(`/api/v1/payments/${pay.reference}/receipt`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }, env, ctx);
      const text = await res.text();
      return { status: res.status, json: { success: text.startsWith('%PDF'), skipped: false } };
    }, (r) => (r.json?.skipped || r.json?.success ? null : `status ${r.status}`)],
    ['POST /api/v1/push/subscribe', () => call('/api/v1/push/subscribe', { method: 'POST', token, body: { endpoint: 'https://example.com/push/qa', keys: { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) } } }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['DELETE /api/v1/push/unsubscribe', () => call('/api/v1/push/unsubscribe', { method: 'DELETE', token, body: { endpoint: 'https://example.com/push/qa' } }), (r) => (r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/portfolio/site/:username/like', async () => {
      const u: any = raw.prepare('SELECT username FROM users WHERE id = ?').get(user.id);
      if (!u?.username) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/portfolio/site/${u.username}/like`, { method: 'POST', token });
    }, (r) => (r.json?.skipped || typeof r.json?.data?.liked === 'boolean' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/portfolio/site/:username/reviews', async () => {
      const u: any = raw.prepare('SELECT username FROM users WHERE id = ?').get(user.id);
      if (!u?.username) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/portfolio/site/${u.username}/reviews`);
    }, (r) => (r.json?.skipped || Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['PUT /api/v1/portfolio/site/custom-domain', () => call('/api/v1/portfolio/site/custom-domain', { method: 'PUT', token, body: { domain: 'portfolio.example.com' } }), (r) => (r.json?.data?.status === 'pending' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/todos', () => call('/api/v1/todos', { token }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/todos', async () => {
      const r = await call('/api/v1/todos', { method: 'POST', token, body: { title: 'QA task', category: 'study', priority: 'high' } });
      (globalThis as any).__todoId = r.json?.data?.id;
      return r;
    }, (r) => (r.json?.data?.id ? null : JSON.stringify(r.json).slice(0, 160))],
    ['PATCH /api/v1/todos/:id/toggle', async () => {
      const id = (globalThis as any).__todoId;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/todos/${id}/toggle`, { method: 'PATCH', token });
    }, (r) => (r.json?.skipped || r.json?.data?.status === 'done' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['DELETE /api/v1/todos/:id', async () => {
      const id = (globalThis as any).__todoId;
      if (!id) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/todos/${id}`, { method: 'DELETE', token });
    }, (r) => (r.json?.skipped || r.json?.success ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/ai/config', () => call('/api/v1/ai/config', { token }), (r) => (r.json?.data?.limits ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/ai/chat (no auth)', () => call('/api/v1/ai/chat', { method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } }), (r) => (r.status === 401 ? null : `expected 401, got ${r.status}`)],
    ['POST /api/v1/ai/chat (quiz blocks)', async () => {
      const r = await call('/api/v1/ai/chat', { method: 'POST', token, body: { messages: [{ role: 'user', content: 'Quiz me on compilers' }], mode: 'quiz' } });
      (globalThis as any).__aiQuiz = r.json?.data?.quiz;
      return r;
    }, (r) => (r.json?.data?.blocks?.[0]?.type === 'quiz' && r.json?.data?.quiz?.answer === 1 && !String(r.json?.data?.reply || '').includes('"quiz"') ? null : JSON.stringify(r.json).slice(0, 240))],
    ['POST /api/v1/ai/tts', () => call('/api/v1/ai/tts', { method: 'POST', token, body: { text: 'Hello from GiGo' } }), (r) => (String(r.json?.data?.audio || '').startsWith('data:audio/') ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/ai/voice', async () => {
      const fd = new FormData();
      fd.append('audio', new File([new Uint8Array([1, 2, 3, 4])], 'voice.wav', { type: 'audio/wav' }));
      fd.append('messages', JSON.stringify([{ role: 'user', content: 'hello' }]));
      return call('/api/v1/ai/voice', { method: 'POST', token, body: fd });
    }, (r) => (r.json?.data?.transcript === 'Explain compilers' && r.json?.data?.blocks ? null : JSON.stringify(r.json).slice(0, 200))],
    ['POST /api/v1/ai/voice (no auth)', () => call('/api/v1/ai/voice', { method: 'POST', body: new FormData() }), (r) => (r.status === 401 ? null : `expected 401, got ${r.status}`)],
    ['GET /api/v1/learning-paths/:slug/pricing', async () => {
      const p: any = raw.prepare('SELECT slug FROM learning_paths LIMIT 1').get();
      if (!p) return { status: 200, json: { success: true, skipped: true } };
      return call(`/api/v1/learning-paths/${p.slug}/pricing`, { token });
    }, (r) => (r.json?.skipped || typeof r.json?.data?.bundle_price === 'number' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['POST /api/v1/learning-paths/:slug/checkout (bundle)', async () => {
      const smoke: any = raw.prepare('SELECT id, role FROM users WHERE email = ?').get((globalThis as any).__email);
      const smokeToken = await sign({ userId: smoke.id, role: smoke.role || 'student', exp: Math.floor(Date.now() / 1000) + 900 }, JWT_SECRET);
      const p: any = raw.prepare(`SELECT lp.slug FROM learning_paths lp
        JOIN learning_path_courses lpc ON lpc.path_id = lp.id
        JOIN courses c ON c.id = lpc.course_id
        LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
        WHERE lp.bundle_enabled = 1 AND c.price > 0 AND e.id IS NULL LIMIT 1`).get(smoke?.id);
      if (!p) return { status: 200, json: { success: true, skipped: true } };
      const r = await call(`/api/v1/learning-paths/${p.slug}/checkout`, { method: 'POST', token: smokeToken, body: { provider: 'paystack' } });
      (globalThis as any).__bundleRef = r.json?.data?.reference;
      return r;
    }, (r) => (r.json?.skipped || r.json?.data?.alreadyEnrolled || (typeof r.json?.data?.amount === 'number' && (r.json?.data?.authorizationUrl || r.json?.data?.reference)) ? null : JSON.stringify(r.json).slice(0, 240))],
    ['POST /api/v1/payments/verify (bundle)', async () => {
      const ref = (globalThis as any).__bundleRef;
      if (!ref) return { status: 200, json: { success: true, skipped: true } };
      const smoke: any = raw.prepare('SELECT id, role FROM users WHERE email = ?').get((globalThis as any).__email);
      const smokeToken = await sign({ userId: smoke.id, role: smoke.role || 'student', exp: Math.floor(Date.now() / 1000) + 900 }, JWT_SECRET);
      return call('/api/v1/payments/verify', { method: 'POST', token: smokeToken, body: { reference: ref } });
    }, (r) => (r.json?.skipped || r.json?.data?.status === 'completed' ? null : JSON.stringify(r.json).slice(0, 240))],
    ['GET /api/v1/admin/feature-flags', () => call('/api/v1/admin/feature-flags', { token: adminToken }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['PUT /api/v1/admin/feature-flags/ai_enabled', () => call('/api/v1/admin/feature-flags/ai_enabled', { method: 'PUT', token: adminToken, body: { enabled: true } }), (r) => (r.json?.data?.key === 'ai_enabled' ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/admin/learning-paths', () => call('/api/v1/admin/learning-paths', { token: adminToken }), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/admin/health', () => call('/api/v1/admin/health', { token: adminToken }), (r) => (r.json?.data?.database ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/admin/action-center', () => call('/api/v1/admin/action-center', { token: adminToken }), (r) => (r.json?.data ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/public/config', () => call('/api/v1/public/config'), (r) => (r.json?.data?.name ? null : JSON.stringify(r.json).slice(0, 160))],
    ['GET /api/v1/public/testimonials', () => call('/api/v1/public/testimonials'), (r) => (Array.isArray(r.json?.data) ? null : JSON.stringify(r.json).slice(0, 160))],
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
