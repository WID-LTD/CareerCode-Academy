import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import { jsonBody } from './helpers';

// Port of backend/src/routes/message.routes.ts, mounted at /admin/messages by
// the admin router (which applies the admin role guard). Attachments/uploads
// are not supported in the Worker — JSON bodies only, as with the rest of the
// ported API surface.

const messages = new Hono<{ Bindings: Env }>();

// GET /api/v1/admin/messages/conversations
messages.get('/conversations', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `WITH LastMessages AS (
         SELECT
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
           content as last_message,
           created_at as last_message_at,
           ROW_NUMBER() OVER (
             PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
             ORDER BY created_at DESC
           ) as rn
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
       ),
       UnreadCounts AS (
         SELECT sender_id as other_user_id, COUNT(*) as unread_count
         FROM messages
         WHERE receiver_id = $1 AND is_read = false
         GROUP BY sender_id
       )
       SELECT u.id, u.name, u.avatar, u.role,
              lm.last_message, lm.last_message_at,
              COALESCE(uc.unread_count, 0)::int as unread_count
       FROM LastMessages lm
       JOIN users u ON u.id = lm.other_user_id
       LEFT JOIN UnreadCounts uc ON uc.other_user_id = u.id
       WHERE lm.rn = 1
       ORDER BY lm.last_message_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load conversations');
  }
});

// PUT /api/v1/admin/messages/read  (registered before /:userId-style routes)
messages.put('/read', async (c) => {
  try {
    const s = await requireAuth(c);
    const body = await jsonBody(c);
    if (!body.senderId) return fail(c, 400, 'senderId is required');
    await getDb(c.env).query(
      'UPDATE messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false',
      [s.userId, body.senderId]
    );
    return c.json({ success: true, message: 'Messages marked as read' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark messages as read');
  }
});

// PUT /api/v1/admin/messages/read-all
messages.put('/read-all', async (c) => {
  try {
    const s = await requireAuth(c);
    await getDb(c.env).query(
      'UPDATE messages SET is_read = true WHERE receiver_id = $1 AND is_read = false',
      [s.userId]
    );
    return c.json({ success: true, message: 'All messages marked as read' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark all messages as read');
  }
});

// GET /api/v1/admin/messages/:userId
messages.get('/:userId', async (c) => {
  try {
    const s = await requireAuth(c);
    const otherUserId = c.req.param('userId');
    const { rows } = await getDb(c.env).query<any>(
      `SELECT id, sender_id, receiver_id, content, is_read, created_at
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [s.userId, otherUserId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load messages');
  }
});

// POST /api/v1/admin/messages
messages.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const body = await jsonBody(c);
    const { receiver_id, content } = body;
    const attachmentUrl: string | undefined = body.attachment_url || undefined;
    if (!receiver_id || (!content && !attachmentUrl)) {
      return fail(c, 400, 'receiver_id and either content or attachment are required');
    }
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO messages (sender_id, receiver_id, content, attachment_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [s.userId, receiver_id, content || '', attachmentUrl || null]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send message');
  }
});

// DELETE /api/v1/admin/messages/:messageId
messages.delete('/:messageId', async (c) => {
  try {
    await requireAuth(c);
    await getDb(c.env).query('DELETE FROM messages WHERE id = $1', [c.req.param('messageId')]);
    return c.json({ success: true, message: 'Message deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete message');
  }
});

export default messages;
