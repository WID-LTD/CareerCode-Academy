import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, statusOf } from '../route-utils';

const search = new Hono<{ Bindings: Env }>();

// GET /api/v1/search?q=&type=courses|blogs|users|all
search.get('/', async (c) => {
  try {
    const q = (c.req.query('q') || '').trim();
    const type = c.req.query('type') || 'all';
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
    const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);

    if (!q) return c.json({ success: true, data: { courses: [], blogs: [], users: [] } });

    const term = `%${q}%`;
    const results: any = {};
    const db = getDb(c.env);

    if (type === 'all' || type === 'courses') {
      const { rows } = await db.query<any>(
        `SELECT c.id, c.title, c.description, c.thumbnail, c.price, c.level, c.slug, c.category,
                u.name as instructor_name, c.created_at
         FROM courses c
         JOIN users u ON c.instructor_id = u.id
         WHERE c.published = true
           AND (c.title ILIKE $1 OR c.description ILIKE $1 OR c.category ILIKE $1)
         ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
        [term, limit, offset]
      );
      results.courses = rows;
    }
    if (type === 'all' || type === 'blogs') {
      const { rows } = await db.query<any>(
        `SELECT id, title, excerpt, content, slug, category, image_url, created_at
         FROM blogs
         WHERE published = true
           AND (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1 OR category ILIKE $1)
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [term, limit, offset]
      );
      results.blogs = rows;
    }
    if (type === 'all' || type === 'users') {
      const { rows } = await db.query<any>(
        `SELECT id, name, email, role, avatar, bio
         FROM users
         WHERE name ILIKE $1 OR email ILIKE $1 OR bio ILIKE $1
         ORDER BY name ASC LIMIT $2 OFFSET $3`,
        [term, limit, offset]
      );
      results.users = rows;
    }

    return c.json({ success: true, data: results });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Search failed');
  }
});

export default search;
