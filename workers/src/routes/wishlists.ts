import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';

const wishlists = new Hono<{ Bindings: Env }>();

// GET /api/v1/wishlists
wishlists.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT w.id, w.course_id, w.created_at,
              c.id as course_id_full, c.title, c.thumbnail, c.price, c.slug, c.level, c.category,
              u.name as instructor_name
       FROM wishlists w
       JOIN courses c ON c.id = w.course_id
       JOIN users u ON u.id = c.instructor_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to fetch wishlist');
  }
});

// POST /api/v1/wishlists
wishlists.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const courseId = body.courseId;
    if (!courseId) return fail(c, 400, 'courseId is required');
    const db = getDb(c.env);

    const existing = await db.query<any>(
      'SELECT id FROM wishlists WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    if (existing.rows.length) return fail(c, 409, 'Already in wishlist');

    const { rows } = await db.query<any>(
      'INSERT INTO wishlists (user_id, course_id) VALUES ($1, $2) RETURNING *',
      [s.userId, courseId]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to add to wishlist');
  }
});

// DELETE /api/v1/wishlists/:courseId
wishlists.delete('/:courseId', async (c) => {
  try {
    const s = await requireAuth(c);
    await getDb(c.env).query(
      'DELETE FROM wishlists WHERE user_id = $1 AND course_id = $2',
      [s.userId, c.req.param('courseId')]
    );
    return c.json({ success: true, message: 'Removed from wishlist' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to remove from wishlist');
  }
});

export default wishlists;
