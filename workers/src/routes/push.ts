import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import { sendPushToUser } from '../push';

const push = new Hono<{ Bindings: Env }>();

// GET /api/v1/push/public-key
push.get('/public-key', (c) =>
  c.json({ success: true, data: { key: c.env.VAPID_PUBLIC_KEY || null } })
);

// POST /api/v1/push/subscribe
push.post('/subscribe', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || '');
    const p256dh = String(body?.keys?.p256dh || '');
    const auth = String(body?.keys?.auth || '');
    if (!endpoint || !p256dh || !auth) return fail(c, 400, 'endpoint and keys are required');
    if (!/^https:\/\//.test(endpoint)) return fail(c, 400, 'Invalid endpoint');

    await getDb(c.env).query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4, user_agent = $5`,
      [s.userId, endpoint, p256dh, auth, c.req.header('user-agent') || null]
    );
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to subscribe');
  }
});

// DELETE /api/v1/push/unsubscribe
push.delete('/unsubscribe', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body?.endpoint) return fail(c, 400, 'endpoint is required');
    await getDb(c.env).query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [s.userId, String(body.endpoint)]
    );
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to unsubscribe');
  }
});

// POST /api/v1/push/test
push.post('/test', async (c) => {
  try {
    const s = await requireAuth(c);
    await sendPushToUser(c.env, s.userId, {
      title: 'CareerCode notifications are on',
      body: 'This is a test push from CareerCode Academy.',
      url: '/student/notifications',
    });
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send test push');
  }
});

export default push;
