import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, statusOf } from '../route-utils';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../auth-helpers';

const telemetry = new Hono<{ Bindings: Env }>();

async function optionalUserId(c: any): Promise<string | null> {
  try {
    const header = c.req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : getCookie(c, 'token');
    if (!token) return null;
    const decoded = await verifyToken(c.env, token);
    return decoded.userId || null;
  } catch { return null; }
}

// POST /api/v1/telemetry/error — frontend error boundary report.
telemetry.post('/error', async (c) => {
  try {
    const body: any = await c.req.json().catch(() => ({}));
    const message = String(body.message || '').slice(0, 2000);
    if (!message) return fail(c, 400, 'message is required');
    const userId = await optionalUserId(c);
    await getDb(c.env).query(
      `INSERT INTO client_errors (user_id, route, message, stack, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, String(body.route || '').slice(0, 500), message, String(body.stack || '').slice(0, 12000), String(c.req.header('user-agent') || '').slice(0, 500)]
    );
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to record error');
  }
});

// POST /api/v1/telemetry/bug — learner bug report.
telemetry.post('/bug', async (c) => {
  try {
    const body: any = await c.req.json().catch(() => ({}));
    const message = String(body.message || '').trim().slice(0, 5000);
    if (message.length < 3) return fail(c, 400, 'Please describe the problem');
    const userId = await optionalUserId(c);
    const details = JSON.stringify({
      page: String(body.page || '').slice(0, 500),
      userAgent: String(c.req.header('user-agent') || '').slice(0, 500),
      recentErrors: Array.isArray(body.recentErrors) ? body.recentErrors.slice(-20) : [],
      screenshot: typeof body.screenshot === 'string' ? body.screenshot.slice(0, 2_000_000) : null,
    });
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO bug_reports (user_id, route, message, details)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [userId, String(body.route || '').slice(0, 500), message, details]
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit bug report');
  }
});

export default telemetry;
