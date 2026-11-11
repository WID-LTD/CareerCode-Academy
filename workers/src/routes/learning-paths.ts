import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import { authenticate } from '../auth-helpers';
import * as LP from '../learning-paths';
import { initializeBundlePayment } from '../bundle-payments';

const learningPaths = new Hono<{ Bindings: Env }>();

async function optionalUserId(c: any): Promise<string | null> {
  try {
    const s = await authenticate(c);
    return s.userId;
  } catch {
    return null;
  }
}

// GET /api/v1/learning-paths/grouped
learningPaths.get('/grouped', async (c) => {
  try {
    return c.json({ success: true, data: await LP.getGroupedByCategory(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load pathways');
  }
});

// GET /api/v1/learning-paths/grouped-by-school
learningPaths.get('/grouped-by-school', async (c) => {
  try {
    return c.json({ success: true, data: await LP.getGroupedBySchool(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load pathways');
  }
});

// GET /api/v1/learning-paths/my/enrollments (before /:slug)
learningPaths.get('/my/enrollments', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT lpe.*, lp.title, lp.description, lp.icon, lp.color, lp.level, lp.slug,
              (SELECT COUNT(*) FROM learning_path_courses WHERE path_id = lp.id) as total_courses,
              (SELECT COALESCE(AVG(e.progress), 0) FROM learning_path_courses lpc
               JOIN enrollments e ON e.course_id = lpc.course_id AND e.user_id = $1
               WHERE lpc.path_id = lp.id) as avg_course_progress
       FROM learning_path_enrollments lpe
       JOIN learning_paths lp ON lpe.path_id = lp.id
       WHERE lpe.user_id = $1
       ORDER BY lpe.started_at DESC`,
      [s.userId]
    );

    const enriched = await Promise.all(rows.map(async (row: any) => {
      const coursesRes = await db.query<any>(
        `SELECT c.id, c.title, c.slug, c.price, e.progress, e.completed
         FROM learning_path_courses lpc
         JOIN courses c ON lpc.course_id = c.id
         LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
         WHERE lpc.path_id = $2 ORDER BY lpc.order_index ASC`,
        [s.userId, row.path_id]
      );
      const enrolledCount = coursesRes.rows.filter((x: any) => x.progress !== null).length;
      const completedCount = coursesRes.rows.filter((x: any) => x.completed).length;
      const totalCount = coursesRes.rows.length;
      const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      return {
        ...row,
        courses: coursesRes.rows,
        enrolledCourses: enrolledCount,
        completedCourses: completedCount,
        totalCourses: totalCount,
        progress: overallProgress,
        completed: overallProgress >= 100,
      };
    }));

    return c.json({ success: true, data: enriched });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load enrollments');
  }
});

// GET /api/v1/learning-paths
learningPaths.get('/', async (c) => {
  try {
    return c.json({ success: true, data: await LP.getAllLearningPaths(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load learning paths');
  }
});

// GET /api/v1/learning-paths/:slug/pricing
learningPaths.get('/:slug/pricing', async (c) => {
  try {
    const path = await LP.getLearningPathBySlug(c.env, c.req.param('slug'));
    if (!path) return fail(c, 404, 'Learning path not found');
    const userId = await optionalUserId(c);
    return c.json({ success: true, data: await LP.getPathPricing(c.env, path, userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load pricing');
  }
});

// POST /api/v1/learning-paths/:slug/checkout — pay for every unpaid course at once
learningPaths.post('/:slug/checkout', async (c) => {
  try {
    const s = await requireAuth(c);
    const path = await LP.getLearningPathBySlug(c.env, c.req.param('slug'));
    if (!path) return fail(c, 404, 'Learning path not found');
    const body: any = await c.req.json().catch(() => ({}));
    const data = await initializeBundlePayment(c.env, s.userId, path, body);
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to initialize path payment');
  }
});

// POST /api/v1/learning-paths/:slug/enroll { mode: 'free' | 'all' }
learningPaths.post('/:slug/enroll', async (c) => {
  try {
    const s = await requireAuth(c);
    const path = await LP.getLearningPathBySlug(c.env, c.req.param('slug'));
    if (!path) return fail(c, 404, 'Learning path not found');
    const body: any = await c.req.json().catch(() => ({}));
    const mode = body.mode === 'all' ? 'all' : 'free';
    const result = await LP.enrollInPath(c.env, s.userId, path, mode);
    if (result.requiresPayment) {
      const pricing = await LP.getPathPricing(c.env, path, s.userId);
      return c.json({
        success: false,
        message: 'This path has paid courses. Complete payment to enroll in all of them.',
        requiresPayment: true,
        data: {
          paidCourses: result.paidCourses,
          pricing,
          checkoutUrl: `/checkout?pathId=${path.id}`,
        },
      }, 402 as any);
    }
    return c.json({
      success: true,
      data: {
        ...result.enrollment,
        pathTitle: path.title,
        pathSlug: path.slug,
        enrolledCourseIds: result.enrolledCourseIds,
        paidCourses: result.paidCourses,
      },
    }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to enroll in path');
  }
});

// POST /api/v1/learning-paths/:slug/courses/:courseId/enroll — single-course action
learningPaths.post('/:slug/courses/:courseId/enroll', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const path = await LP.getLearningPathBySlug(c.env, c.req.param('slug'));
    if (!path) return fail(c, 404, 'Learning path not found');
    const courseId = c.req.param('courseId');
    const course = (await db.query<any>(
      `SELECT c.* FROM learning_path_courses lpc JOIN courses c ON c.id = lpc.course_id
       WHERE lpc.path_id = $1 AND c.id = $2`,
      [path.id, courseId]
    )).rows[0];
    if (!course) return fail(c, 404, 'Course is not part of this path');

    const existing = await db.query<any>('SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [s.userId, courseId]);
    if (existing.rows.length) {
      return c.json({ success: true, data: { alreadyEnrolled: true, course_slug: course.slug } });
    }
    if (Number(course.price) > 0) {
      return c.json({
        success: false,
        message: 'This course requires payment',
        requiresPayment: true,
        data: {
          course: { id: course.id, title: course.title, slug: course.slug, price: Number(course.price) },
          checkoutUrl: `/checkout?courseId=${course.id}&pathId=${path.id}`,
        },
      }, 402 as any);
    }

    await db.query(`INSERT INTO enrollments (user_id, course_id, status) VALUES ($1, $2, 'active')`, [s.userId, courseId]);
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'New Enrollment', $2, 'enrollment', '/instructor/students')`,
      [course.instructor_id, `A new student enrolled in "${course.title}"`]
    );
    await db.query(
      `INSERT INTO learning_path_enrollments (user_id, path_id, status) VALUES ($1, $2, 'active')
       ON CONFLICT (user_id, path_id) DO UPDATE SET status = 'active'`,
      [s.userId, path.id]
    );
    return c.json({ success: true, data: { enrolled: true, course_slug: course.slug } }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to enroll in course');
  }
});

// GET /api/v1/learning-paths/by-id/:id
learningPaths.get('/by-id/:id', async (c) => {
  try {
    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT * FROM learning_paths WHERE id = $1', [c.req.param('id')]);
    if (!rows.length) return fail(c, 404, 'Learning path not found');
    const path = rows[0];
    const userId = await optionalUserId(c);
    const courses = await LP.getPathCourses(c.env, path.id);
    const pricing = await LP.getPathPricing(c.env, path, userId);
    return c.json({ success: true, data: { ...path, courses, pricing } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load learning path');
  }
});

// GET /api/v1/learning-paths/:slug
learningPaths.get('/:slug', async (c) => {
  try {
    const path = await LP.getLearningPathBySlug(c.env, c.req.param('slug'));
    if (!path) return fail(c, 404, 'Learning path not found');
    const userId = await optionalUserId(c);
    const courses = await LP.getPathCourses(c.env, path.id);
    const pricing = await LP.getPathPricing(c.env, path, userId);
    return c.json({ success: true, data: { ...path, courses, pricing } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load learning path');
  }
});

export default learningPaths;
