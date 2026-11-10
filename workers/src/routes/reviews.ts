import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';

const reviews = new Hono<{ Bindings: Env }>();

// GET /api/v1/reviews/course/:courseId
reviews.get('/course/:courseId', async (c) => {
  try {
    const courseId = c.req.param('courseId');
    const db = getDb(c.env);
    const course = await db.query<any>('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (!course.rows.length) return fail(c, 404, 'Course not found');

    const { rows } = await db.query<any>(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.course_id = $1 ORDER BY r.created_at DESC`,
      [courseId]
    );
    const avg = await db.query<any>(
      'SELECT AVG(rating)::float as average, COUNT(*)::int as count FROM reviews WHERE course_id = $1',
      [courseId]
    );
    return c.json({
      success: true,
      data: rows,
      averageRating: avg.rows[0]?.average || 0,
      total: rows.length,
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load reviews');
  }
});

// POST /api/v1/reviews
reviews.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { courseId, rating, comment } = body;
    if (!courseId) return fail(c, 400, 'courseId is required');
    const n = Number(rating);
    if (!Number.isFinite(n) || n < 1 || n > 5) return fail(c, 400, 'Rating must be between 1 and 5');

    const db = getDb(c.env);
    const course = await db.query<any>('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (!course.rows.length) return fail(c, 404, 'Course not found');

    const enrollment = await db.query<any>(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    if (!enrollment.rows.length) return fail(c, 403, 'You must be enrolled to review this course');

    const existing = await db.query<any>(
      'SELECT id FROM reviews WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    if (existing.rows.length) return fail(c, 409, 'You have already reviewed this course');

    const { rows } = await db.query<any>(
      `INSERT INTO reviews (course_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [courseId, s.userId, n, comment || null]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create review');
  }
});

// PUT /api/v1/reviews/:id
reviews.put('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows: found } = await db.query<any>('SELECT * FROM reviews WHERE id = $1', [c.req.param('id')]);
    const review = found[0];
    if (!review) return fail(c, 404, 'Review not found');
    if (review.user_id !== s.userId) return fail(c, 403, 'You can only edit your own reviews');

    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    if (body.rating !== undefined) { fields.push(`rating = $${values.length + 1}`); values.push(Number(body.rating)); }
    if (body.comment !== undefined) { fields.push(`comment = $${values.length + 1}`); values.push(body.comment); }
    if (!fields.length) return c.json({ success: true, data: review });

    values.push(review.id);
    const { rows } = await db.query<any>(
      `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update review');
  }
});

// DELETE /api/v1/reviews/:id
reviews.delete('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT * FROM reviews WHERE id = $1', [c.req.param('id')]);
    const review = rows[0];
    if (!review) return fail(c, 404, 'Review not found');
    if (review.user_id !== s.userId && s.role !== 'admin' && s.role !== 'super_admin') {
      return fail(c, 403, 'You can only delete your own reviews');
    }
    await db.query('DELETE FROM reviews WHERE id = $1', [review.id]);
    return c.json({ success: true, message: 'Review deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete review');
  }
});

export default reviews;
