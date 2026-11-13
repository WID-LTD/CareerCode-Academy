import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import { celebrateCompletedLearningPaths } from '../learning-path-helpers';

const enrollments = new Hono<{ Bindings: Env }>();

// GET /api/v1/enrollments
enrollments.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug, c.category, c.level, c.duration, c.price, c.description as course_description,
              u.name as instructor_name, u.avatar as instructor_avatar,
              (SELECT COUNT(*)::int FROM lessons WHERE course_id = c.id) as total_lessons,
              (SELECT COUNT(*)::int FROM modules WHERE course_id = c.id) as total_modules,
              COALESCE((SELECT COUNT(*)::int FROM lesson_progress WHERE user_id = e.user_id AND course_id = c.id AND completed = true), 0) as completed_lessons_count,
              (SELECT l.title FROM lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id AND lp.completed = true WHERE l.course_id = c.id AND lp.lesson_id IS NULL ORDER BY l.order_index ASC LIMIT 1) as next_lesson_title,
              (SELECT l.id FROM lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id AND lp.completed = true WHERE l.course_id = c.id AND lp.lesson_id IS NULL ORDER BY l.order_index ASC LIMIT 1) as next_lesson_id
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.instructor_id = u.id
       WHERE e.user_id = $1 AND (e.access_type <> 'trial' OR e.trial_ends_at > NOW())
       ORDER BY e.enrolled_at DESC LIMIT $2 OFFSET $3`,
      [s.userId, limit, offset]
    );
    const total = await db.query<{ total: number }>(
      'SELECT COUNT(*)::int as total FROM enrollments WHERE user_id = $1',
      [s.userId]
    );
    const totalN = Number(total.rows[0]?.total) || 0;
    const data = rows.map((r: any) => ({
      ...r,
      trial_days_remaining: r.access_type === 'trial' && r.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(r.trial_ends_at).getTime() - Date.now()) / 86400000))
        : null,
    }));
    return c.json({
      success: true,
      data,
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load enrollments');
  }
});

// GET /api/v1/enrollments/course/:courseId — access check for a single course
enrollments.get('/course/:courseId', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2
       AND (access_type <> 'trial' OR trial_ends_at > NOW())`,
      [s.userId, c.req.param('courseId')]
    );
    const row = rows[0] || null;
    return c.json({ success: true, data: row ? {
      ...row,
      trial_days_remaining: row.access_type === 'trial' && row.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(row.trial_ends_at).getTime() - Date.now()) / 86400000))
        : null,
    } : null });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load enrollment');
  }
});

// POST /api/v1/enrollments/:courseId/trial — start a free trial
enrollments.post('/:courseId/trial', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const courseId = c.req.param('courseId');
    const course = (await db.query<any>('SELECT * FROM courses WHERE id = $1', [courseId])).rows[0];
    if (!course) return fail(c, 404, 'Course not found');
    if (Number(course.price) <= 0) return fail(c, 400, 'This course is not eligible for a trial');
    const existing = (await db.query<any>('SELECT * FROM enrollments WHERE user_id=$1 AND course_id=$2', [s.userId, courseId])).rows[0];
    if (existing && (existing.access_type !== 'trial' || new Date(existing.trial_ends_at || 0) > new Date())) {
      return c.json({ success: true, data: { ...existing, alreadyActive: true } });
    }
    const settings = (await db.query<any>("SELECT * FROM trial_settings WHERE id='default'")).rows[0] || { enabled: 1, default_days: 7, campaign_start: '2026-11-13T00:00:00.000Z', campaign_end: '2026-11-20T23:59:59.000Z', max_trials: 1 };
    if (!settings.enabled) return fail(c, 403, 'Free trials are currently disabled');
    const now = new Date();
    if (settings.campaign_start && now < new Date(settings.campaign_start)) return fail(c, 403, 'The free trial has not started yet');
    if (settings.campaign_end && now > new Date(settings.campaign_end)) return fail(c, 403, 'The free trial has ended');
    const override = (await db.query<any>(
      `SELECT * FROM trial_overrides WHERE enabled=1 AND (user_id=$1 OR user_id IS NULL) AND (course_id=$2 OR course_id IS NULL)
       ORDER BY CASE WHEN user_id=$1 THEN 0 ELSE 1 END, CASE WHEN course_id=$2 THEN 0 ELSE 1 END LIMIT 1`,
      [s.userId, courseId]
    )).rows[0];
    const days = Math.max(1, Number(override?.days) || Number(settings.default_days) || 7);
    const startsAt = override?.starts_at || now.toISOString();
    const endsAt = override?.ends_at || new Date(new Date(startsAt).getTime() + days * 86400000).toISOString();
    const trialCount = (await db.query<any>(
      `SELECT COUNT(*)::int AS n FROM enrollments WHERE user_id=$1 AND access_type='trial'`,
      [s.userId]
    )).rows[0]?.n || 0;
    if (trialCount >= (Number(settings.max_trials) || 1) && !existing) return fail(c, 403, 'You have already used your free trial');
    if (existing) {
      const updated = await db.query<any>(
        `UPDATE enrollments SET access_type='trial', status='active', trial_started_at=$1, trial_ends_at=$2, enrolled_at=NOW() WHERE id=$3 RETURNING *`,
        [startsAt, endsAt, existing.id]
      );
      return c.json({ success: true, data: { ...updated.rows[0], trial_days_remaining: days } });
    }
    const created = await db.query<any>(
      `INSERT INTO enrollments (user_id, course_id, status, access_type, trial_started_at, trial_ends_at, progress, completed_lessons, completed)
       VALUES ($1,$2,'active','trial',$3,$4,0,'[]',false) RETURNING *`,
      [s.userId, courseId, startsAt, endsAt]
    );
    await db.query(
      `INSERT INTO notifications (user_id,title,message,type,link) VALUES ($1,$2,$3,'success',$4)`,
      [s.userId, 'Free trial started', `Your ${days}-day trial for ${course.title} is active until ${new Date(endsAt).toLocaleDateString()}.`, `/student/courses/${course.slug}`]
    );
    return c.json({ success: true, data: { ...created.rows[0], trial_days_remaining: days } }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to start trial');
  }
});

// GET /api/v1/enrollments/:id
enrollments.get('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>('SELECT * FROM enrollments WHERE id = $1', [c.req.param('id')]);
    const enrollment = rows[0];
    if (!enrollment) return fail(c, 404, 'Enrollment not found');
    if (enrollment.user_id !== s.userId && s.role !== 'admin') return fail(c, 403, 'Forbidden');
    return c.json({ success: true, data: enrollment });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load enrollment');
  }
});

// POST /api/v1/enrollments/:courseId/progress — mark a lesson complete
enrollments.post('/:courseId/progress', async (c) => {
  try {
    const s = await requireAuth(c);
    const courseId = c.req.param('courseId');
    const body: any = await c.req.json().catch(() => ({}));
    const lessonId = body.lessonId;
    if (!lessonId) return fail(c, 400, 'lessonId is required');

    const db = getDb(c.env);
    const { rows: enrRows } = await db.query<any>(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    );
    const enrollment = enrRows[0];
    if (!enrollment) return fail(c, 404, 'Enrollment not found');
    if (enrollment.access_type === 'trial' && enrollment.trial_ends_at && new Date(enrollment.trial_ends_at) <= new Date()) {
      return fail(c, 403, 'Your free trial has expired. Purchase the course to continue.');
    }

    const completedLessons: string[] = (enrollment.completed_lessons as any) || [];
    if (completedLessons.includes(lessonId)) {
      return c.json({ success: true, data: enrollment });
    }
    completedLessons.push(lessonId);

    // Quiz gate: a published lesson quiz must be passed first.
    const quizRes = await db.query<any>(
      'SELECT id FROM quizzes WHERE lesson_id = $1 AND published = true',
      [lessonId]
    );
    if (quizRes.rows.length > 0) {
      const attempt = await db.query<any>(
        'SELECT passed FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
        [quizRes.rows[0].id, s.userId]
      );
      const passed = attempt.rows.length > 0 && attempt.rows[0].passed;
      if (!passed) {
        return fail(c, 403, 'You must pass the lesson quiz before marking this lesson complete', {
          error: 'You must pass the lesson quiz before marking this lesson complete',
          quizRequired: true,
          quizId: quizRes.rows[0].id,
        });
      }
    }

    const lessonsRes = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
      [courseId]
    );
    const totalLessons = parseInt(String(lessonsRes.rows[0]?.count ?? 0), 10);
    const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
    const completed = progress >= 100;

    const updated = await db.query<any>(
      `UPDATE enrollments
       SET progress = $1, completed_lessons = $2, completed = $3,
           completed_at = CASE WHEN $3 = true THEN NOW() ELSE completed_at END
       WHERE id = $4
       RETURNING *`,
      [progress, JSON.stringify(completedLessons), completed, enrollment.id]
    );

    if (completed) await celebrateCompletedLearningPaths(c.env, s.userId);

    return c.json({ success: true, data: updated.rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update progress');
  }
});

export default enrollments;
