import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { authenticate } from '../auth-helpers';

const careerGoals = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

// GET /api/v1/career-goals (public active list)
careerGoals.get('/', async (c) => {
  try {
    const { rows } = await getDb(c.env).query(
      `SELECT g.*,
        COUNT(gc.course_id)::int as courses_count,
        COALESCE(SUM(c.duration), 0)::int as total_duration,
        (SELECT COUNT(DISTINCT e.user_id)::int FROM learning_path_courses lpc
         JOIN enrollments e ON e.course_id = lpc.course_id WHERE lpc.path_id = lp.id) as students_count,
        s.name as school_name, s.slug as school_slug, s.icon as school_icon, s.color as school_color,
        lp.id as path_id, lp.slug as path_slug, lp.color as path_color
       FROM career_goals g
       LEFT JOIN career_goal_courses gc ON gc.goal_id = g.id
       LEFT JOIN courses c ON c.id = gc.course_id
       LEFT JOIN schools s ON s.id = g.school_id
       LEFT JOIN learning_paths lp ON lp.career_goal_id = g.id
       WHERE g.is_active = true
       GROUP BY g.id, s.name, s.slug, s.icon, s.color, lp.id, lp.slug, lp.color
       ORDER BY g.sort_order ASC, g.title ASC`
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load career goals');
  }
});

// GET /api/v1/career-goals/my/goals (before :slug)
careerGoals.get('/my/goals', async (c) => {
  try {
    const s = await authenticate(c).catch((e: any) => {
      throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
    });
    const { rows } = await getDb(c.env).query(
      `SELECT g.id, g.title, g.slug, g.role_title, g.icon, g.color, g.desired_skills,
              g.salary_band, g.duration_estimate,
              s.name as school_name, s.slug as school_slug, lp.slug as path_slug,
              lpe.progress, lpe.completed, lpe.started_at,
              (SELECT COUNT(*)::int FROM learning_path_courses WHERE path_id = lp.id) as total_courses,
              (SELECT COUNT(*)::int FROM learning_path_courses lpc
               JOIN enrollments e ON e.course_id = lpc.course_id AND e.user_id = $1 AND e.completed = true
               WHERE lpc.path_id = lp.id) as completed_courses
       FROM career_goals g
       JOIN learning_paths lp ON lp.career_goal_id = g.id
       JOIN learning_path_enrollments lpe ON lpe.path_id = lp.id AND lpe.user_id = $1
       LEFT JOIN schools s ON s.id = g.school_id
       WHERE g.is_active = true ORDER BY lpe.started_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load goals');
  }
});

// GET /api/v1/career-goals/:slug
careerGoals.get('/:slug', async (c) => {
  try {
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT g.*,
        (SELECT COUNT(*)::int FROM career_goal_courses gc2 WHERE gc2.goal_id = g.id) as courses_count,
        (SELECT COALESCE(SUM(c2.duration), 0)::int FROM career_goal_courses gc2 JOIN courses c2 ON c2.id = gc2.course_id WHERE gc2.goal_id = g.id) as total_duration,
        (SELECT COUNT(DISTINCT e.user_id)::int FROM learning_path_courses lpc
         JOIN enrollments e ON e.course_id = lpc.course_id WHERE lpc.path_id = lp.id) as students_count,
        s.name as school_name, s.slug as school_slug, s.icon as school_icon, s.color as school_color,
        lp.id as path_id, lp.slug as path_slug, lp.title as path_title, lp.color as path_color, lp.level as path_level
       FROM career_goals g
       LEFT JOIN schools s ON s.id = g.school_id
       LEFT JOIN learning_paths lp ON lp.career_goal_id = g.id
       WHERE g.slug = $1`,
      [c.req.param('slug')]
    );
    if (!rows.length) return err(c, 404, 'Career goal not found');
    const goal = rows[0];
    const { rows: courses } = await db.query(
      `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price, c.category,
              gc.order_index, gc.phase, u.name as instructor_name
       FROM career_goal_courses gc JOIN courses c ON gc.course_id = c.id
       JOIN users u ON c.instructor_id = u.id
       WHERE gc.goal_id = $1 ORDER BY gc.order_index ASC`,
      [goal.id]
    );
    return c.json({ success: true, data: { ...goal, courses } });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load career goal');
  }
});

export default careerGoals;
