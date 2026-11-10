import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, statusOf } from '../route-utils';
import { authenticate } from '../auth-helpers';
import { getGroupedBySchool, getGroupedByCategory } from '../learning-paths';

// Ported from backend/src/routes/pathwayFinder.routes.ts +
// backend/src/models/pathwayFinder.ts. Mounted at /api/v1/pathway-finder.

const pathwayFinder = new Hono<{ Bindings: Env }>();

// ── Career-goal helpers (backend/src/models/careerGoal.ts) ────────────────

async function getAllCareerGoals(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT g.*,
       COUNT(gc.course_id)::int as courses_count,
       COALESCE(SUM(c.duration), 0)::int as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)::int
        FROM learning_path_courses lpc
        JOIN enrollments e ON e.course_id = lpc.course_id
        WHERE lpc.path_id = lp.id) as students_count,
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
  return rows;
}

async function getMyCareerGoals(env: Env, userId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT g.id, g.title, g.slug, g.role_title, g.icon, g.color, g.desired_skills,
            g.salary_band, g.duration_estimate,
            s.name as school_name, s.slug as school_slug,
            lp.slug as path_slug,
            lpe.progress, lpe.completed, lpe.started_at,
            (SELECT COUNT(*)::int FROM learning_path_courses WHERE path_id = lp.id) as total_courses,
            (SELECT COUNT(*)::int
             FROM learning_path_courses lpc
             JOIN enrollments e ON e.course_id = lpc.course_id AND e.user_id = $1 AND e.completed = true
             WHERE lpc.path_id = lp.id) as completed_courses
     FROM career_goals g
     JOIN learning_paths lp ON lp.career_goal_id = g.id
     JOIN learning_path_enrollments lpe ON lpe.path_id = lp.id AND lpe.user_id = $1
     LEFT JOIN schools s ON s.id = g.school_id
     WHERE g.is_active = true
     ORDER BY lpe.started_at DESC`,
    [userId]
  );
  return rows;
}

async function getCareerGoalCourses(env: Env, goalId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price, c.category,
            gc.order_index, gc.phase,
            u.name as instructor_name
     FROM career_goal_courses gc
     JOIN courses c ON gc.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE gc.goal_id = $1
     ORDER BY gc.order_index ASC`,
    [goalId]
  );
  return rows;
}

// ── Aggregated payload ────────────────────────────────────────────────────

async function getPathwayFinderData(env: Env, userId?: string): Promise<any> {
  const [goals, pursued, schoolPaths, categoryPaths] = await Promise.all([
    getAllCareerGoals(env),
    userId ? getMyCareerGoals(env, userId) : Promise.resolve([]),
    getGroupedBySchool(env),
    getGroupedByCategory(env),
  ]);

  const db = getDb(env);
  const enrolledSet = new Set<string>();
  const completedSet = new Set<string>();
  const pathEnrollments = new Map<string, any>();

  if (userId) {
    const [enrolledRes, completedRes] = await Promise.all([
      db.query<any>('SELECT course_id FROM enrollments WHERE user_id = $1', [userId]),
      db.query<any>('SELECT DISTINCT course_id FROM enrollments WHERE user_id = $1 AND completed = true', [userId]),
    ]);
    enrolledRes.rows.forEach((r) => enrolledSet.add(r.course_id));
    completedRes.rows.forEach((r) => completedSet.add(r.course_id));

    const { rows: pathRows } = await db.query<any>(
      `SELECT lpe.path_id, lpe.progress, lpe.completed, lpe.started_at
       FROM learning_path_enrollments lpe
       WHERE lpe.user_id = $1`,
      [userId]
    );
    pathRows.forEach((r) => pathEnrollments.set(r.path_id, r));
  }

  const annotatePaths = (container: any[]) => {
    for (const group of container) {
      for (const level of ['beginner', 'intermediate', 'advanced']) {
        const zone = group.zones?.[level];
        if (!zone || !zone.path) continue;
        const enrollment = pathEnrollments.get(zone.path.id);
        zone.path = {
          ...zone.path,
          enrolled: !!enrollment,
          progress: enrollment ? Number(enrollment.progress) || 0 : 0,
          pathCompleted: enrollment ? !!enrollment.completed : false,
          started_at: enrollment?.started_at || null,
        };
      }
    }
  };
  annotatePaths(schoolPaths);
  annotatePaths(categoryPaths);

  const pursuedWithNext: any[] = [];
  for (const goal of pursued) {
    const courses = await getCareerGoalCourses(env, goal.id);
    let nextStep: {
      courseId: string;
      title: string;
      slug: string;
      thumbnail: string | null;
      duration: number;
      phase: string;
    } | null = null;

    const nextInQueue = courses.find((course) => !completedSet.has(course.id));
    const nextEnrolled = courses.find(
      (course) => enrolledSet.has(course.id) && !completedSet.has(course.id)
    );
    const next = nextEnrolled || nextInQueue || null;
    if (next) {
      nextStep = {
        courseId: next.id,
        title: next.title,
        slug: next.slug,
        thumbnail: next.thumbnail,
        duration: next.duration,
        phase: next.phase,
      };
    }
    pursuedWithNext.push({ ...goal, nextStep });
  }

  const discoverableGoals = goals.map((goal) => {
    const mine = pursued.find((p: any) => p.id === goal.id);
    return {
      ...goal,
      isPursued: !!mine,
      progress: mine ? Number(mine.progress) || 0 : 0,
      completed: mine ? !!mine.completed : false,
      started_at: mine?.started_at || null,
    };
  });

  const completedGoals = pursuedWithNext.filter((g) => g.completed).length;
  const inProgressGoals = pursuedWithNext.length - completedGoals;
  const enrolledPaths = [...pathEnrollments.values()].filter((p) => !p.completed);
  const completedPaths = [...pathEnrollments.values()].filter((p) => p.completed);

  return {
    userId: userId || null,
    summary: {
      totalGoals: goals.length,
      pursuedGoals: pursuedWithNext.length,
      completedGoals,
      inProgressGoals,
      enrolledPathsTotal: pathEnrollments.size,
      inProgressPathways: enrolledPaths.length,
      completedPathways: completedPaths.length,
    },
    pursuedGoals: pursuedWithNext,
    discoverableGoals,
    schoolPaths,
    categoryPaths,
  };
}

// GET /api/v1/pathway-finder — optional auth (guests get empty progress)
pathwayFinder.get('/', async (c) => {
  try {
    let userId: string | undefined;
    try {
      userId = (await authenticate(c)).userId;
    } catch {
      /* guest */
    }
    const data = await getPathwayFinderData(c.env, userId);
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load pathway finder');
  }
});

export default pathwayFinder;
