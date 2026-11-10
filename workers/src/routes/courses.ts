import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { requireAuth } from '../route-utils';

const courses = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

async function activePromotion(env: Env, courseId: string, category: string | null): Promise<any | null> {
  try {
    const { rows } = await getDb(env).query<any>(
      `SELECT p.* FROM promotions p
       LEFT JOIN categories cat ON cat.id = p.category_id
       WHERE p.is_active = true AND p.starts_at <= NOW() AND p.ends_at > NOW()
         AND ((p.scope = 'course' AND p.course_id = $1)
           OR (p.scope = 'category' AND cat.name = $2)
           OR (p.scope = 'all'))
       ORDER BY CASE WHEN p.scope = 'course' THEN 0 WHEN p.scope = 'category' THEN 1 ELSE 2 END,
         p.discount_percent DESC, p.ends_at ASC LIMIT 1`,
      [courseId, category]
    );
    return rows[0] || null;
  } catch {
    return null; // promotions are optional marketing data — never fail reads
  }
}

async function decorate(env: Env, course: any): Promise<any> {
  const promo = await activePromotion(env, course.id, course.category ?? null);
  const percent = promo ? Number(promo.discount_percent) : 0;
  const price = Number(course.price) || 0;
  return { ...course, promotion: promo, effective_price: price * (1 - percent / 100) };
}

// GET /api/v1/courses (published only, paginated, promotion-decorated)
courses.get('/', async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50') || 50));
    const offset = (page - 1) * limit;
    const category = c.req.query('category');
    const level = c.req.query('level');
    const conds = [`c.published = true`];
    const vals: any[] = [];
    if (category) {
      conds.push(`c.category = $${vals.length + 1}`);
      vals.push(category);
    }
    if (level) {
      conds.push(`c.level = $${vals.length + 1}`);
      vals.push(level);
    }
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar,
              COALESCE(COUNT(DISTINCT e.id)::int, 0) as student_count,
              COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float as avg_rating
       FROM courses c JOIN users u ON c.instructor_id = u.id
       LEFT JOIN enrollments e ON e.course_id = c.id
       LEFT JOIN reviews r ON r.course_id = c.id
       WHERE ${conds.join(' AND ')}
       GROUP BY c.id, u.name, u.avatar ORDER BY c.created_at DESC
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, limit, offset]
    );
    const decorated = await Promise.all(rows.map((r) => decorate(c.env, r)));
    const total = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM courses c WHERE ${conds.join(' AND ')}`,
      vals
    );
    const totalN = parseInt(total.rows[0]?.count || '0', 10);
    return c.json({
      success: true,
      data: decorated,
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load courses');
  }
});

async function courseDetail(env: Env, course: any): Promise<any> {
  const db = getDb(env);
  const [lessons, reviews, rating, enrolled] = await Promise.all([
    db.query<any>('SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC', [course.id]),
    db.query<any>(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar FROM reviews r
       JOIN users u ON r.user_id = u.id WHERE r.course_id = $1 ORDER BY r.created_at DESC`,
      [course.id]
    ),
    db.query<any>('SELECT AVG(rating)::float as average, COUNT(*)::int as count FROM reviews WHERE course_id = $1', [course.id]),
    db.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM enrollments WHERE course_id = $1', [course.id]),
  ]);
  const decorated = await decorate(env, course);
  return {
    ...decorated,
    lessons: lessons.rows,
    reviews: reviews.rows,
    averageRating: rating.rows[0]?.average || 0,
    enrollmentCount: enrolled.rows[0]?.n || 0,
  };
}

const COURSE_DETAIL_SELECT = `SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar,
  pr.name as program_name, pr.slug as program_slug, pr.icon as program_icon,
  s.name as school_name, s.slug as school_slug
 FROM courses c JOIN users u ON c.instructor_id = u.id
 LEFT JOIN programs pr ON pr.id = c.program_id
 LEFT JOIN schools s ON s.id = pr.school_id`;

// GET /api/v1/courses/slug/:slug
courses.get('/slug/:slug', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(`${COURSE_DETAIL_SELECT} WHERE c.slug = $1`, [c.req.param('slug')]);
    if (!rows.length) return err(c, 404, 'Course not found');
    return c.json({ success: true, data: await courseDetail(c.env, rows[0]) });
  } catch (e: any) {
    if (e?.statusCode) return err(c, e.statusCode, e.message);
    return err(c, 500, e?.message || 'Failed to load course');
  }
});

// GET /api/v1/courses/:id
courses.get('/:id', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(`${COURSE_DETAIL_SELECT} WHERE c.id = $1`, [c.req.param('id')]);
    if (!rows.length) return err(c, 404, 'Course not found');
    return c.json({ success: true, data: await courseDetail(c.env, rows[0]) });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load course');
  }
});

// POST /api/v1/courses/:id/enroll
courses.post('/:id/enroll', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const courseId = c.req.param('id');
    const { rows } = await db.query<any>('SELECT * FROM courses WHERE id = $1', [courseId]);
    const course = rows[0];
    if (!course) return err(c, 404, 'Course not found');

    const existing = await db.query<any>(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    if (existing.rows.length) return err(c, 409, 'Already enrolled in this course');

    if (Number(course.price) > 0) {
      const paid = await db.query<any>(
        `SELECT id FROM payments WHERE user_id = $1 AND course_id = $2 AND status = 'completed'`,
        [s.userId, courseId]
      );
      if (!paid.rows.length) {
        return c.json({ success: false, message: 'Payment required. Please complete payment first.' }, 402);
      }
    }

    const enrollment = await db.query<any>(
      `INSERT INTO enrollments (user_id, course_id, status) VALUES ($1, $2, 'active') RETURNING *`,
      [s.userId, courseId]
    );

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'New Enrollment', $2, 'enrollment', $3)`,
      [course.instructor_id, `A new student enrolled in "${course.title}"`, '/instructor/students']
    );

    return c.json({ success: true, data: enrollment.rows[0] }, 201);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to enroll');
  }
});

// DELETE /api/v1/courses/:id/enroll
courses.delete('/:id/enroll', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const courseId = c.req.param('id');
    const course = await db.query<any>('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (!course.rows.length) return err(c, 404, 'Course not found');

    const existing = await db.query<any>(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    if (!existing.rows.length) return err(c, 404, 'Enrollment not found');

    await db.query('DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2', [s.userId, courseId]);
    return c.json({ success: true, message: 'Un-enrolled from course successfully' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to un-enroll');
  }
});

export default courses;
