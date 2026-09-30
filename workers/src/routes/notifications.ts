import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { authenticate } from '../auth-helpers';

const notifications = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

async function session(c: any) {
  try {
    return await authenticate(c);
  } catch (e: any) {
    throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
  }
}

// GET /api/v1/notifications?page=&limit=&unread=
notifications.get('/', async (c) => {
  try {
    const s = await session(c);
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50') || 50));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);
    let rows;
    if (c.req.query('unread') === 'true') {
      const r = await db.query('SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC', [s.userId]);
      rows = r.rows;
    } else {
      const r = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [s.userId, limit, offset]);
      rows = r.rows;
    }
    const unread = await db.query<{ count: string }>('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false', [s.userId]);
    const total = await db.query<{ count: string }>('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [s.userId]);
    const totalN = parseInt(total.rows[0]?.count || '0', 10);
    return c.json({
      success: true,
      data: rows,
      unreadCount: parseInt(unread.rows[0]?.count || '0', 10),
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load notifications');
  }
});

// PUT /api/v1/notifications/read-all (before /:id/read so "read-all" isn't an id)
notifications.put('/read-all', async (c) => {
  try {
    const s = await session(c);
    await getDb(c.env).query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [s.userId]);
    return c.json({ success: true, message: 'All notifications marked as read' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to update notifications');
  }
});

// PUT /api/v1/notifications/:id/read
notifications.put('/:id/read', async (c) => {
  try {
    const s = await session(c);
    const { rows } = await getDb(c.env).query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [c.req.param('id'), s.userId]
    );
    if (!rows.length) return err(c, 404, 'Notification not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to update notification');
  }
});

// DELETE /api/v1/notifications/:id
notifications.delete('/:id', async (c) => {
  try {
    const s = await session(c);
    const { rows } = await getDb(c.env).query('DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id', [c.req.param('id'), s.userId]);
    if (!rows.length) return err(c, 404, 'Notification not found');
    return c.json({ success: true, message: 'Notification deleted' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to delete notification');
  }
});

export default notifications;
