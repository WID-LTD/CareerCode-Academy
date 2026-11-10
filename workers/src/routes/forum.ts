import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

// Course forum, ported from backend/src/routes/forum.routes.ts +
// backend/src/models/forum.ts. Mount at /api/v1/forum.

const forum = new Hono<{ Bindings: Env }>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validationError(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

async function body(c: any): Promise<any> {
  return await c.req.json().catch(() => ({}));
}

// ── model ──────────────────────────────────────────────────────────────────

async function createThread(env: Env, input: {
  course_id: string;
  user_id: string;
  title: string;
  content: string;
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO forum_threads (course_id, user_id, title, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.course_id, input.user_id, input.title, input.content]
  );
  return rows[0];
}

async function getThreadsByCourse(env: Env, courseId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT t.*, u.name as user_name, u.avatar as user_avatar,
            (SELECT COUNT(*) FROM forum_messages WHERE thread_id = t.id) as message_count
     FROM forum_threads t
     JOIN users u ON t.user_id = u.id
     WHERE t.course_id = $1
     ORDER BY t.pinned DESC, t.created_at DESC`,
    [courseId]
  );
  return rows;
}

async function getThreadById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT t.*, u.name as user_name, u.avatar as user_avatar
     FROM forum_threads t
     JOIN users u ON t.user_id = u.id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

const THREAD_UPDATE_COLUMNS = new Set(['title', 'content', 'pinned']);

async function updateThread(env: Env, id: string, input: Record<string, any>): Promise<any | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && THREAD_UPDATE_COLUMNS.has(key)) {
      fields.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getThreadById(env, id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await getDb(env).query<any>(
    `UPDATE forum_threads SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteThread(env: Env, id: string): Promise<boolean> {
  const db = getDb(env);
  await db.query('DELETE FROM forum_messages WHERE thread_id = $1', [id]);
  const { rows } = await db.query<any>('DELETE FROM forum_threads WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

async function createMessage(env: Env, input: {
  thread_id: string;
  user_id: string;
  content: string;
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO forum_messages (thread_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.thread_id, input.user_id, input.content]
  );
  return rows[0];
}

async function getMessagesByThread(env: Env, threadId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT m.*, u.name as user_name, u.avatar as user_avatar
     FROM forum_messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.thread_id = $1
     ORDER BY m.created_at ASC`,
    [threadId]
  );
  return rows;
}

async function getMessageById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT m.*, u.name as user_name, u.avatar as user_avatar
     FROM forum_messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function deleteMessage(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'DELETE FROM forum_messages WHERE id = $1 RETURNING id',
    [id]
  );
  return rows.length > 0;
}

async function countThreadsByCourse(env: Env, courseId: string): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    'SELECT COUNT(*) as count FROM forum_threads WHERE course_id = $1',
    [courseId]
  );
  return parseInt(String(rows[0]?.count ?? 0), 10);
}

// ── helpers ────────────────────────────────────────────────────────────────

async function courseExists(env: Env, courseId: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>('SELECT id FROM courses WHERE id = $1', [courseId]);
  return rows.length > 0;
}

async function enrollmentExists(env: Env, userId: string, courseId: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows.length > 0;
}

// ── Thread routes ──────────────────────────────────────────────────────────

// GET /api/v1/forum/course/:courseId
forum.get('/course/:courseId', async (c) => {
  try {
    const courseId = c.req.param('courseId');
    if (!(await courseExists(c.env, courseId))) return fail(c, 404, 'Course not found');

    const threads = await getThreadsByCourse(c.env, courseId);
    return c.json({ success: true, data: threads });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load forum threads');
  }
});

// GET /api/v1/forum/threads/:id
forum.get('/threads/:id', async (c) => {
  try {
    const thread = await getThreadById(c.env, c.req.param('id'));
    if (!thread) return fail(c, 404, 'Thread not found');

    const messages = await getMessagesByThread(c.env, c.req.param('id'));
    return c.json({ success: true, data: { ...thread, messages } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load thread');
  }
});

// POST /api/v1/forum/threads
forum.post('/threads', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (typeof input.courseId !== 'string' || !UUID_RE.test(input.courseId)) {
      errors.courseId = ['Invalid uuid'];
    }
    if (typeof input.title !== 'string' || input.title.length < 3 || input.title.length > 200) {
      errors.title = ['Title must be at least 3 characters'];
    }
    if (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 5000) {
      errors.content = ['Content is required'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const { courseId, title, content } = input;
    if (!(await courseExists(c.env, courseId))) return fail(c, 404, 'Course not found');

    // Only enrolled students or instructors/admins can post
    if (s.role === 'student') {
      const enrolled = await enrollmentExists(c.env, s.userId, courseId);
      if (!enrolled) return fail(c, 403, 'You must be enrolled to post in this forum');
    }

    const thread = await createThread(c.env, {
      course_id: courseId,
      user_id: s.userId,
      title,
      content,
    });
    return c.json({ success: true, data: thread }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create thread');
  }
});

// PUT /api/v1/forum/threads/:id
forum.put('/threads/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const thread = await getThreadById(c.env, c.req.param('id'));
    if (!thread) return fail(c, 404, 'Thread not found');

    if (s.role !== 'admin' && thread.user_id !== s.userId) {
      return fail(c, 403, 'You can only edit your own threads');
    }

    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (input.title !== undefined && (typeof input.title !== 'string' || input.title.length < 3 || input.title.length > 200)) {
      errors.title = ['Title must be at least 3 characters'];
    }
    if (input.content !== undefined && (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 5000)) {
      errors.content = ['Content is required'];
    }
    if (input.pinned !== undefined && typeof input.pinned !== 'boolean') {
      errors.pinned = ['Expected boolean'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const updated = await updateThread(c.env, c.req.param('id'), input);
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update thread');
  }
});

// DELETE /api/v1/forum/threads/:id
forum.delete('/threads/:id', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const thread = await getThreadById(c.env, c.req.param('id'));
    if (!thread) return fail(c, 404, 'Thread not found');

    await deleteThread(c.env, c.req.param('id'));
    return c.json({ success: true, message: 'Thread deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete thread');
  }
});

// ── Message routes ─────────────────────────────────────────────────────────

// GET /api/v1/forum/threads/:id/messages
forum.get('/threads/:id/messages', async (c) => {
  try {
    const thread = await getThreadById(c.env, c.req.param('id'));
    if (!thread) return fail(c, 404, 'Thread not found');

    const messages = await getMessagesByThread(c.env, c.req.param('id'));
    return c.json({ success: true, data: messages });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load thread messages');
  }
});

// POST /api/v1/forum/threads/:id/messages
forum.post('/threads/:id/messages', async (c) => {
  try {
    const s = await requireAuth(c);
    const thread = await getThreadById(c.env, c.req.param('id'));
    if (!thread) return fail(c, 404, 'Thread not found');

    const input = await body(c);
    if (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 5000) {
      return validationError(c, { content: ['Message is required'] });
    }

    if (s.role === 'student') {
      const enrolled = await enrollmentExists(c.env, s.userId, thread.course_id);
      if (!enrolled) return fail(c, 403, 'You must be enrolled to reply in this forum');
    }

    const message = await createMessage(c.env, {
      thread_id: c.req.param('id'),
      user_id: s.userId,
      content: input.content,
    });
    return c.json({ success: true, data: message }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create forum message');
  }
});

// DELETE /api/v1/forum/messages/:id
forum.delete('/messages/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const message = await getMessageById(c.env, c.req.param('id'));
    if (!message) return fail(c, 404, 'Message not found');

    if (s.role !== 'admin' && message.user_id !== s.userId) {
      return fail(c, 403, 'You can only delete your own messages');
    }

    await deleteMessage(c.env, c.req.param('id'));
    return c.json({ success: true, message: 'Message deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete message');
  }
});

export default forum;
