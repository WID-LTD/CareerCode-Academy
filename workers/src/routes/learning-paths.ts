import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import * as LP from '../learning-paths';

const learningPaths = new Hono<{ Bindings: Env }>();

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
        `SELECT c.id, c.title, c.slug, e.progress, e.completed
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

// POST /api/v1/learning-paths/:slug/enroll
learningPaths.post('/:slug/enroll', async (c) => {
  try {
    const s = await requireAuth(c);
    const path = await LP.getLearningPathBySlug(c.env, c.req.param('slug'));
    if (!path) return fail(c, 404, 'Learning path not found');
    const result = await LP.enrollInPath(c.env, s.userId, path);
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

// GET /api/v1/learning-paths/:slug
learningPaths.get('/:slug', async (c) => {
  try {
    const path = await LP.getLearningPathBySlug(c.env, c.req.param('slug'));
    if (!path) return fail(c, 404, 'Learning path not found');
    return c.json({ success: true, data: { ...path, courses: await LP.getPathCourses(c.env, path.id) } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load learning path');
  }
});

export default learningPaths;
