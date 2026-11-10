import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';

// Discussions, ported from backend/src/routes/discussion.routes.ts +
// backend/src/models/discussion.ts. Mount at /api/v1/discussions.

const discussions = new Hono<{ Bindings: Env }>();

// ── model ──────────────────────────────────────────────────────────────────

async function createDiscussion(env: Env, input: {
  user_id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO discussions (user_id, title, content, category, tags)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.user_id, input.title, input.content, input.category || 'General', JSON.stringify(input.tags || [])]
  );
  return rows[0];
}

async function getDiscussions(env: Env, options: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.category && options.category !== 'All') {
    conditions.push(`d.category = $${params.length + 1}`);
    params.push(options.category);
  }
  if (options.search) {
    conditions.push(`(d.title ILIKE $${params.length + 1} OR d.content ILIKE $${params.length + 1})`);
    params.push(`%${options.search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const { rows } = await getDb(env).query<any>(
    `SELECT d.*, u.name as user_name, u.avatar as user_avatar,
            (SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = d.id) as reply_count
     FROM discussions d
     JOIN users u ON d.user_id = u.id
     ${where}
     ORDER BY d.pinned DESC, d.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return rows;
}

async function getDiscussionById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT d.*, u.name as user_name, u.avatar as user_avatar,
            (SELECT COUNT(*) FROM discussion_replies WHERE discussion_id = d.id) as reply_count
     FROM discussions d
     JOIN users u ON d.user_id = u.id
     WHERE d.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function incrementDiscussionViews(env: Env, id: string): Promise<void> {
  await getDb(env).query('UPDATE discussions SET views = views + 1 WHERE id = $1', [id]);
}

const DISCUSSION_UPDATE_COLUMNS = new Set(['title', 'content', 'category', 'tags', 'pinned']);

async function updateDiscussion(env: Env, id: string, input: Record<string, any>): Promise<any | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && DISCUSSION_UPDATE_COLUMNS.has(key)) {
      fields.push(`${key} = $${values.length + 1}`);
      values.push(key === 'tags' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return getDiscussionById(env, id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await getDb(env).query<any>(
    `UPDATE discussions SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteDiscussion(env: Env, id: string): Promise<boolean> {
  const db = getDb(env);
  await db.query('DELETE FROM discussion_replies WHERE discussion_id = $1', [id]);
  const { rows } = await db.query<any>('DELETE FROM discussions WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

async function createReply(env: Env, input: {
  discussion_id: string;
  user_id: string;
  content: string;
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO discussion_replies (discussion_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.discussion_id, input.user_id, input.content]
  );
  return rows[0];
}

async function getRepliesByDiscussion(env: Env, discussionId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT r.*, u.name as user_name, u.avatar as user_avatar
     FROM discussion_replies r
     JOIN users u ON r.user_id = u.id
     WHERE r.discussion_id = $1
     ORDER BY r.created_at ASC`,
    [discussionId]
  );
  return rows;
}

async function getReplyById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT r.*, u.name as user_name, u.avatar as user_avatar
     FROM discussion_replies r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function deleteReply(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'DELETE FROM discussion_replies WHERE id = $1 RETURNING id',
    [id]
  );
  return rows.length > 0;
}

async function getDiscussionCategories(env: Env): Promise<string[]> {
  const { rows } = await getDb(env).query<any>(
    'SELECT DISTINCT category FROM discussions ORDER BY category ASC'
  );
  return rows.map((r) => r.category);
}

// ── helpers ────────────────────────────────────────────────────────────────

function validationError(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

async function body(c: any): Promise<any> {
  return await c.req.json().catch(() => ({}));
}

// ── routes ─────────────────────────────────────────────────────────────────

// GET /api/v1/discussions
discussions.get('/', async (c) => {
  try {
    const { category, search, limit, offset } = c.req.query();
    const rows = await getDiscussions(c.env, {
      category: category || undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load discussions');
  }
});

// GET /api/v1/discussions/categories (before /:id)
discussions.get('/categories', async (c) => {
  try {
    const categories = await getDiscussionCategories(c.env);
    return c.json({ success: true, data: categories });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load categories');
  }
});

// GET /api/v1/discussions/:id
discussions.get('/:id', async (c) => {
  try {
    const discussion = await getDiscussionById(c.env, c.req.param('id'));
    if (!discussion) return fail(c, 404, 'Discussion not found');

    await incrementDiscussionViews(c.env, c.req.param('id'));
    const replies = await getRepliesByDiscussion(c.env, c.req.param('id'));

    return c.json({ success: true, data: { ...discussion, replies } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load discussion');
  }
});

// POST /api/v1/discussions
discussions.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (typeof input.title !== 'string' || input.title.length < 3 || input.title.length > 200) {
      errors.title = ['Title must be at least 3 characters'];
    }
    if (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 10000) {
      errors.content = ['Content is required'];
    }
    if (input.category !== undefined && (typeof input.category !== 'string' || input.category.length < 1 || input.category.length > 100)) {
      errors.category = ['String must contain at least 1 character(s)'];
    }
    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags) || input.tags.length > 10 || input.tags.some((t: any) => typeof t !== 'string' || t.length > 50)) {
        errors.tags = ['Invalid tags'];
      }
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const discussion = await createDiscussion(c.env, {
      user_id: s.userId,
      title: input.title,
      content: input.content,
      category: input.category,
      tags: input.tags,
    });
    return c.json({ success: true, data: discussion }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create discussion');
  }
});

// PUT /api/v1/discussions/:id
discussions.put('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const discussion = await getDiscussionById(c.env, c.req.param('id'));
    if (!discussion) return fail(c, 404, 'Discussion not found');

    if (s.role !== 'admin' && discussion.user_id !== s.userId) {
      return fail(c, 403, 'You can only edit your own discussions');
    }

    const input = await body(c);
    const errors: Record<string, string[]> = {};
    if (input.title !== undefined && (typeof input.title !== 'string' || input.title.length < 3 || input.title.length > 200)) {
      errors.title = ['Title must be at least 3 characters'];
    }
    if (input.content !== undefined && (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 10000)) {
      errors.content = ['Content is required'];
    }
    if (input.category !== undefined && (typeof input.category !== 'string' || input.category.length < 1 || input.category.length > 100)) {
      errors.category = ['String must contain at least 1 character(s)'];
    }
    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags) || input.tags.length > 10 || input.tags.some((t: any) => typeof t !== 'string' || t.length > 50)) {
        errors.tags = ['Invalid tags'];
      }
    }
    if (input.pinned !== undefined && typeof input.pinned !== 'boolean') {
      errors.pinned = ['Expected boolean'];
    }
    if (Object.keys(errors).length) return validationError(c, errors);

    const updated = await updateDiscussion(c.env, c.req.param('id'), input);
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update discussion');
  }
});

// DELETE /api/v1/discussions/:id
discussions.delete('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const discussion = await getDiscussionById(c.env, c.req.param('id'));
    if (!discussion) return fail(c, 404, 'Discussion not found');

    if (s.role !== 'admin' && discussion.user_id !== s.userId) {
      return fail(c, 403, 'You can only delete your own discussions');
    }

    await deleteDiscussion(c.env, c.req.param('id'));
    return c.json({ success: true, message: 'Discussion deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete discussion');
  }
});

// GET /api/v1/discussions/:id/replies
discussions.get('/:id/replies', async (c) => {
  try {
    const discussion = await getDiscussionById(c.env, c.req.param('id'));
    if (!discussion) return fail(c, 404, 'Discussion not found');

    const replies = await getRepliesByDiscussion(c.env, c.req.param('id'));
    return c.json({ success: true, data: replies });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load replies');
  }
});

// POST /api/v1/discussions/:id/replies
discussions.post('/:id/replies', async (c) => {
  try {
    const s = await requireAuth(c);
    const discussion = await getDiscussionById(c.env, c.req.param('id'));
    if (!discussion) return fail(c, 404, 'Discussion not found');

    const input = await body(c);
    if (typeof input.content !== 'string' || input.content.length < 1 || input.content.length > 5000) {
      return validationError(c, { content: ['Reply is required'] });
    }

    const reply = await createReply(c.env, {
      discussion_id: c.req.param('id'),
      user_id: s.userId,
      content: input.content,
    });
    return c.json({ success: true, data: reply }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create reply');
  }
});

// DELETE /api/v1/discussions/replies/:id
discussions.delete('/replies/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const reply = await getReplyById(c.env, c.req.param('id'));
    if (!reply) return fail(c, 404, 'Reply not found');

    if (s.role !== 'admin' && reply.user_id !== s.userId) {
      return fail(c, 403, 'You can only delete your own replies');
    }

    await deleteReply(c.env, c.req.param('id'));
    return c.json({ success: true, message: 'Reply deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete reply');
  }
});

export default discussions;
