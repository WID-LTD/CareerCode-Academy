import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { requireAuth, requireRole } from '../route-utils';

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
    const categories = String(c.req.query('categories') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const level = c.req.query('level');
    const conds = [`c.published = true`];
    const vals: any[] = [];
    if (categories.length) {
      const placeholders = categories.map((value) => {
        vals.push(value);
        return `$${vals.length}`;
      });
      conds.push(`c.category IN (${placeholders.join(', ')})`);
    } else if (category) {
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
      `SELECT COUNT(*)::int AS count FROM courses c WHERE ${conds.join(' AND ')}`,
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

// GET /api/v1/courses/instructor — courses owned by the signed-in instructor
// Registered before /:id so the literal path is not treated as a course id.
courses.get('/instructor', async (c) => {
  try {
    const s = await requireRole(c, ['instructor', 'admin', 'super_admin']);
    const db = getDb(c.env);
    const admin = ['admin', 'super_admin'].includes(s.role);
    const { rows } = await db.query<any>(
      `SELECT c.*, u.name as instructor_name,
              (SELECT COUNT(*)::int FROM lessons l WHERE l.course_id = c.id) as lessons_count,
              (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) as students_count
       FROM courses c JOIN users u ON u.id = c.instructor_id
       ${admin ? '' : 'WHERE c.instructor_id = $1'}
       ORDER BY c.created_at DESC`,
      admin ? [] : [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load instructor courses');
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


// ── Course authoring ─────────────────────────────────────────────────────
const STAFF = ['instructor', 'admin', 'super_admin'];
const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function uniqueSlug(env: Env, base: string, excludeId?: string): Promise<string> {
  const db = getDb(env);
  const root = slugify(base) || 'course';
  let candidate = root;
  for (let i = 1; i < 60; i++) {
    const { rows } = await db.query<any>('SELECT id FROM courses WHERE slug = $1', [candidate]);
    if (!rows.length || rows[0].id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

// POST /api/v1/courses
courses.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.title || !b.description || !b.category) return err(c, 400, 'title, description and category are required');
    const level = ['beginner', 'intermediate', 'advanced'].includes(b.level || b.skill_level)
      ? (b.level || b.skill_level)
      : 'beginner';
    const slug = await uniqueSlug(c.env, b.title);
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO courses (title, description, thumbnail, banner_image, promo_video_url, price, category, instructor_id, level, duration, published, slug, learning_outcomes, program_id, reference_url, status, rules)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12,$13,$14,'draft',$15) RETURNING *`,
      [
        b.title, b.description, b.thumbnail || null, b.banner_image || null, b.promo_video_url || null,
        Number(b.price) || 0, b.category, s.userId, level, Number(b.duration) || 1, slug,
        JSON.stringify(b.learning_outcomes || b.learningOutcomes || []),
        b.program_id || null, b.reference_url || null, b.rules || null,
      ]
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to create course');
  }
});

// PUT /api/v1/courses/:id
courses.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const existing = (await db.query<any>('SELECT * FROM courses WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!existing) return err(c, 404, 'Course not found');
    if (!['admin', 'super_admin'].includes(s.role) && existing.instructor_id !== s.userId) {
      return err(c, 403, 'You can only edit your own courses');
    }

    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    const push = (col: string, val: any) => { fields.push(`${col} = $${values.length + 1}`); values.push(val); };
    for (const key of ['title', 'description', 'thumbnail', 'banner_image', 'promo_video_url', 'category', 'program_id', 'reference_url', 'status', 'rules']) {
      if (b[key] !== undefined) push(key, b[key]);
    }
    if (b.price !== undefined) push('price', Number(b.price));
    if (b.duration !== undefined) push('duration', Number(b.duration));
    if (b.level !== undefined || b.skill_level !== undefined) push('level', b.level || b.skill_level);
    if (b.learning_outcomes !== undefined || b.learningOutcomes !== undefined) {
      push('learning_outcomes', JSON.stringify(b.learning_outcomes || b.learningOutcomes || []));
    }
    if (b.published !== undefined) push('published', !!b.published);
    if (b.title) push('slug', await uniqueSlug(c.env, b.title, existing.id));

    if (!fields.length) return c.json({ success: true, data: existing });
    fields.push('updated_at = NOW()');
    values.push(existing.id);
    const { rows } = await db.query<any>(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to update course');
  }
});

// DELETE /api/v1/courses/:id
courses.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const existing = (await db.query<any>('SELECT * FROM courses WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!existing) return err(c, 404, 'Course not found');
    if (!['admin', 'super_admin'].includes(s.role) && existing.instructor_id !== s.userId) {
      return err(c, 403, 'You can only delete your own courses');
    }
    await db.query('DELETE FROM courses WHERE id = $1', [existing.id]);
    return c.json({ success: true, message: 'Course deleted successfully' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to delete course');
  }
});

// Publish / unpublish / archive
for (const [action, published, status] of [
  ['publish', true, 'published'],
  ['unpublish', false, 'draft'],
  ['archive', false, 'archived'],
] as const) {
  courses.put(`/:id/${action}`, async (c) => {
    try {
      const s = await requireRole(c, STAFF);
      const db = getDb(c.env);
      const existing = (await db.query<any>('SELECT * FROM courses WHERE id = $1', [c.req.param('id')])).rows[0];
      if (!existing) return err(c, 404, 'Course not found');
      if (!['admin', 'super_admin'].includes(s.role) && existing.instructor_id !== s.userId) {
        return err(c, 403, 'You can only manage your own courses');
      }
      const { rows } = await db.query<any>(
        'UPDATE courses SET published = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [published, status, existing.id]
      );
      return c.json({ success: true, data: rows[0] });
    } catch (e: any) {
      return err(c, e?.statusCode || 500, e?.message || 'Failed to update course');
    }
  });
}

// POST /api/v1/courses/:id/duplicate
courses.post('/:id/duplicate', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const existing = (await db.query<any>('SELECT * FROM courses WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!existing) return err(c, 404, 'Course not found');
    if (!['admin', 'super_admin'].includes(s.role) && existing.instructor_id !== s.userId) {
      return err(c, 403, 'You can only duplicate your own courses');
    }
    const title = `${existing.title} (Copy)`;
    const slug = await uniqueSlug(c.env, title);
    const { rows } = await db.query<any>(
      `INSERT INTO courses (title, description, thumbnail, banner_image, promo_video_url, price, category, instructor_id, level, duration, published, slug, learning_outcomes, program_id, reference_url, status, rules)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12,$13,$14,'draft',$15) RETURNING *`,
      [
        title, existing.description, existing.thumbnail, existing.banner_image, existing.promo_video_url,
        existing.price, existing.category, s.userId, existing.level, existing.duration, slug,
        existing.learning_outcomes, existing.program_id, existing.reference_url, existing.rules,
      ]
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to duplicate course');
  }
});

// GET /api/v1/courses/:id/lessons
courses.get('/:id/lessons', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC',
      [c.req.param('id')]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load lessons');
  }
});

// GET /api/v1/courses/:id/announcements
courses.get('/:id/announcements', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const courseId = c.req.param('id');
    const course = (await db.query<any>('SELECT id FROM courses WHERE id = $1', [courseId])).rows[0];
    if (!course) return err(c, 404, 'Course not found');
    const enrolled = await db.query<any>(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    if (!enrolled.rows.length && s.role === 'student') return err(c, 403, 'You are not enrolled in this course');
    const { rows } = await db.query<any>(
      `SELECT a.*, u.name as instructor_name FROM announcements a
       JOIN users u ON a.instructor_id = u.id
       WHERE a.course_id = $1 ORDER BY a.created_at DESC LIMIT 50`,
      [courseId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load announcements');
  }
});

// POST /api/v1/courses/:id/announcements (instructor/admin)
courses.post('/:id/announcements', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const course = (await db.query<any>('SELECT * FROM courses WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!course) return err(c, 404, 'Course not found');
    if (!['admin', 'super_admin'].includes(s.role) && course.instructor_id !== s.userId) {
      return err(c, 403, 'You can only post announcements in your own courses');
    }
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.title || !b.content) return err(c, 400, 'title and content are required');
    const { rows } = await db.query<any>(
      `INSERT INTO announcements (course_id, instructor_id, title, content) VALUES ($1,$2,$3,$4) RETURNING *`,
      [course.id, s.userId, b.title, b.content]
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to post announcement');
  }
});

export default courses;

