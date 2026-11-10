import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';

// Ported from backend/src/routes/message.routes.ts + backend/src/models/message.ts.
// Mounted at /api/v1/messages. Socket.io emits are dropped.
// Attachments: send `attachment_url`, or a base64 `attachment` object when R2
// is bound (multipart is not supported on Workers).

const messages = new Hono<{ Bindings: Env }>();

function base64Bytes(data: string): Uint8Array {
  const clean = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'attachment';
}

function publicUrl(env: Env, key: string): string {
  const base = (env as any).R2_PUBLIC_URL || (env as any).R2_PUBLIC_DOMAIN || (env as any).PUBLIC_R2_URL;
  return base ? `${String(base).replace(/\/$/, '')}/${key}` : `/uploads/${key}`;
}

// GET /api/v1/messages/conversations
messages.get('/conversations', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `WITH LastMessages AS (
         SELECT
           CASE
             WHEN sender_id = $1 THEN receiver_id
             ELSE sender_id
           END as other_user_id,
           content as last_message,
           created_at as last_message_at,
           ROW_NUMBER() OVER(
             PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
             ORDER BY created_at DESC
           ) as rn
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
       ),
       UnreadCounts AS (
         SELECT
           sender_id as other_user_id,
           COUNT(*) as unread_count
         FROM messages
         WHERE receiver_id = $1 AND is_read = false
         GROUP BY sender_id
       )
       SELECT
         u.id,
         u.name,
         u.avatar,
         u.role,
         lm.last_message,
         lm.last_message_at,
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

// POST /api/v1/messages
messages.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { receiver_id, content } = body;

    let attachmentUrl: string | undefined =
      typeof body.attachment_url === 'string' ? body.attachment_url
        : typeof body.attachmentUrl === 'string' ? body.attachmentUrl
          : undefined;

    const attachment = body.attachment;
    if (!attachmentUrl && typeof attachment === 'string' && /^https?:\/\//i.test(attachment)) {
      attachmentUrl = attachment;
    }
    const attachmentData = attachment && typeof attachment === 'object'
      ? (attachment.data || attachment.base64 || attachment.fileData)
      : undefined;
    if (!attachmentUrl && attachmentData) {
      const r2 = (c.env as any).R2 as R2Bucket | undefined;
      if (!r2) {
        return fail(
          c,
          501,
          'Attachment uploads are not configured on this deployment (R2 binding missing). Send an attachment_url instead.'
        );
      }
      const filename = safeName(attachment.name || attachment.filename || attachment.fileName || 'attachment');
      const contentType = attachment.type || attachment.contentType || attachment.mimeType || 'application/octet-stream';
      const key = `messages/${Date.now()}-${crypto.randomUUID()}-${filename}`;
      await r2.put(key, base64Bytes(String(attachmentData)), { httpMetadata: { contentType } });
      attachmentUrl = publicUrl(c.env, key);
    }

    if (!receiver_id || (!content && !attachmentUrl)) {
      return fail(c, 400, 'receiver_id and either content or attachment are required');
    }

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO messages (sender_id, receiver_id, content, attachment_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [s.userId, receiver_id, content || '', attachmentUrl || null]
    );

    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send message');
  }
});

// PUT /api/v1/messages/read-all
messages.put('/read-all', async (c) => {
  try {
    const s = await requireAuth(c);
    await getDb(c.env).query(
      'UPDATE messages SET is_read = true WHERE receiver_id = $1 AND is_read = false',
      [s.userId]
    );
    return c.json({ success: true, message: 'All messages marked as read' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark messages as read');
  }
});

// PUT /api/v1/messages/read
messages.put('/read', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { senderId } = body;
    if (!senderId) return fail(c, 400, 'senderId is required');

    await getDb(c.env).query(
      'UPDATE messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false',
      [s.userId, senderId]
    );
    return c.json({ success: true, message: 'Messages marked as read' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark messages as read');
  }
});

// DELETE /api/v1/messages/:messageId
messages.delete('/:messageId', async (c) => {
  try {
    await requireAuth(c);
    await getDb(c.env).query('DELETE FROM messages WHERE id = $1', [c.req.param('messageId')]);
    return c.json({ success: true, message: 'Message deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete message');
  }
});

// GET /api/v1/messages/:userId — conversation with one user
messages.get('/:userId', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT id, sender_id, receiver_id, content, is_read, created_at
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [s.userId, c.req.param('userId')]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load messages');
  }
});

export default messages;
