import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

const blogs = new Hono<{ Bindings: Env }>();
const STAFF = ['instructor', 'admin', 'super_admin'];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// GET /api/v1/blogs
blogs.get('/', async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
    const offset = (page - 1) * limit;
    const published = c.req.query('all') === 'true' ? undefined : true;
    const db = getDb(c.env);

    const conds = published === undefined ? '' : 'AND b.published = $1';
    const params: any[] = published === undefined ? [] : [published];
    const { rows } = await db.query<any>(
      `SELECT b.*, u.name as author_name, u.avatar as author_avatar
       FROM blogs b JOIN users u ON b.author_id = u.id WHERE 1=1 ${conds}
       ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const totalRes = await db.query<any>(
      published === undefined
        ? 'SELECT COUNT(*)::int as count FROM blogs'
        : 'SELECT COUNT(*)::int as count FROM blogs WHERE published = $1',
      published === undefined ? [] : [published]
    );
    const total = Number(totalRes.rows[0]?.count) || 0;
    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load blogs');
  }
});

// GET /api/v1/blogs/:slug
blogs.get('/:slug', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT b.*, u.name as author_name, u.avatar as author_avatar
       FROM blogs b JOIN users u ON b.author_id = u.id WHERE b.slug = $1`,
      [c.req.param('slug')]
    );
    if (!rows.length) return fail(c, 404, 'Blog not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load blog');
  }
});

// POST /api/v1/blogs
blogs.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.title || String(b.title).length < 5) return fail(c, 400, 'Title must be at least 5 characters');
    if (!b.content || String(b.content).length < 50) return fail(c, 400, 'Content must be at least 50 characters');
    if (!b.category) return fail(c, 400, 'Category is required');

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO blogs (title, content, excerpt, author_id, category, tags, image_url, slug)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        b.title, b.content, b.excerpt || null, s.userId, b.category,
        JSON.stringify(b.tags || []), b.imageUrl || null, slugify(b.title),
      ]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create blog');
  }
});

// PUT /api/v1/blogs/:id
blogs.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const existing = (await db.query<any>('SELECT * FROM blogs WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!existing) return fail(c, 404, 'Blog not found');
    if (!['admin', 'super_admin'].includes(s.role) && existing.author_id !== s.userId) {
      return fail(c, 403, 'You can only edit your own blogs');
    }

    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    const map: Record<string, string> = {
      title: 'title', content: 'content', excerpt: 'excerpt', category: 'category',
      published: 'published', imageUrl: 'image_url', tags: 'tags',
    };
    for (const [key, col] of Object.entries(map)) {
      if (b[key] !== undefined) {
        fields.push(`${col} = $${values.length + 1}`);
        values.push(key === 'tags' ? JSON.stringify(b[key]) : b[key]);
      }
    }
    if (b.title) {
      fields.push(`slug = $${values.length + 1}`);
      values.push(slugify(b.title));
    }
    if (!fields.length) return c.json({ success: true, data: existing });
    fields.push('updated_at = NOW()');
    values.push(existing.id);
    const { rows } = await db.query<any>(
      `UPDATE blogs SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update blog');
  }
});

// DELETE /api/v1/blogs/:id
blogs.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const existing = (await db.query<any>('SELECT * FROM blogs WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!existing) return fail(c, 404, 'Blog not found');
    if (!['admin', 'super_admin'].includes(s.role) && existing.author_id !== s.userId) {
      return fail(c, 403, 'You can only delete your own blogs');
    }
    await db.query('DELETE FROM blogs WHERE id = $1', [existing.id]);
    return c.json({ success: true, message: 'Blog deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete blog');
  }
});

export default blogs;
