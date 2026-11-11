import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import { awardXp, updateStreak } from '../gamification';
import { celebrateCompletedLearningPaths } from '../learning-path-helpers';
import { sendPushToUser } from '../push';

const progress = new Hono<{ Bindings: Env }>();

// GET /api/v1/progress?courseId=…
progress.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const courseId = c.req.query('courseId');
    if (!courseId) return fail(c, 400, 'courseId is required');
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `SELECT lp.*, l.title as lesson_title
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       WHERE lp.user_id = $1 AND lp.course_id = $2
       ORDER BY l.order_index`,
      [s.userId, courseId]
    );
    const totalRes = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
      [courseId]
    );
    const totalLessons = parseInt(String(totalRes.rows[0]?.count ?? 0), 10);
    const completedCount = rows.filter((r: any) => r.completed).length;

    return c.json({
      success: true,
      data: {
        progress: rows,
        completedLessons: completedCount,
        totalLessons,
        percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load progress');
  }
});

// POST /api/v1/progress — set lesson completion (certificate + XP side effects)
progress.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { lessonId, completed } = body;
    if (!lessonId) return fail(c, 400, 'lessonId is required');
    const db = getDb(c.env);

    const lessonRes = await db.query<any>('SELECT id, course_id FROM lessons WHERE id = $1', [lessonId]);
    if (!lessonRes.rows.length) return fail(c, 404, 'Lesson not found');
    const courseId = lessonRes.rows[0].course_id;

    if (completed) {
      const quizRes = await db.query<any>(
        'SELECT id, passing_score FROM quizzes WHERE lesson_id = $1 AND published = true',
        [lessonId]
      );
      if (quizRes.rows.length > 0) {
        const quiz = quizRes.rows[0];
        const attempt = await db.query<any>(
          'SELECT passed FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
          [quiz.id, s.userId]
        );
        const passed = attempt.rows.length > 0 && attempt.rows[0].passed;
        if (!passed) {
          return fail(c, 403, 'You must pass the lesson quiz before marking this lesson complete', {
            error: 'You must pass the lesson quiz before marking this lesson complete',
            quizRequired: true,
            quizId: quiz.id,
          });
        }
      }
    }

    const existing = await db.query<any>(
      'SELECT id FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
      [s.userId, lessonId]
    );
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE lesson_progress SET completed = $1, completed_at = $2, updated_at = NOW()
         WHERE user_id = $3 AND lesson_id = $4`,
        [!!completed, completed ? new Date() : null, s.userId, lessonId]
      );
    } else {
      await db.query(
        `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, completed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [s.userId, lessonId, courseId, !!completed, completed ? new Date() : null]
      );
    }

    const totalRes = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
      [courseId]
    );
    const completedRes = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND completed = true`,
      [s.userId, courseId]
    );
    const totalLessons = parseInt(String(totalRes.rows[0]?.count ?? 0), 10);
    const completedCount = parseInt(String(completedRes.rows[0]?.count ?? 0), 10);
    const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const isCompleted = pct >= 100;

    await db.query(
      `UPDATE enrollments SET progress = $1, completed = $2, updated_at = NOW()
       WHERE user_id = $3 AND course_id = $4`,
      [pct, isCompleted, s.userId, courseId]
    );

    if (isCompleted) {
      await db.query(
        `UPDATE enrollments SET status = 'completed', completed_at = NOW()
         WHERE user_id = $1 AND course_id = $2`,
        [s.userId, courseId]
      );

      const certExists = await db.query<any>(
        'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
        [s.userId, courseId]
      );
      if (certExists.rows.length === 0) {
        const code = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await db.query(
          'INSERT INTO certificates (user_id, course_id, verification_code) VALUES ($1, $2, $3)',
          [s.userId, courseId, code]
        );
        const courseInfo = await db.query<any>('SELECT title FROM courses WHERE id = $1', [courseId]);
        const courseTitle = courseInfo.rows[0]?.title || 'Course';
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES ($1, 'Certificate Earned!', $2, 'certificate', $3)`,
          [s.userId, `Congratulations! You earned a certificate for "${courseTitle}"`, '/student/certificates']
        );
        await awardXp(c.env, s.userId, 50, 'course_complete', `Completed course: ${courseTitle}`);
        c.executionCtx.waitUntil(sendPushToUser(c.env, s.userId, {
          title: 'Certificate earned',
          body: `You earned a certificate for "${courseTitle}".`,
          url: '/student/certificates',
        }));
      }
      await celebrateCompletedLearningPaths(c.env, s.userId);
    }

    // Award XP/streak after responding — same ordering as the Express app.
    c.executionCtx.waitUntil((async () => {
      if (completed) {
        await awardXp(c.env, s.userId, 10, 'lesson_complete', 'Completed a lesson');
        await updateStreak(c.env, s.userId);
      }
    })().catch(() => {}));

    return c.json({
      success: true,
      data: { completed, progress: pct, completedCount, totalLessons, isCompleted },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update progress');
  }
});

// GET /api/v1/progress/detailed?courseId=…
progress.get('/detailed', async (c) => {
  try {
    const s = await requireAuth(c);
    const courseId = c.req.query('courseId');
    if (!courseId) return fail(c, 400, 'courseId is required');
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `SELECT
        (SELECT COUNT(*)::int FROM lessons WHERE course_id = $1) as total_lessons,
        (SELECT COUNT(*)::int FROM lesson_progress WHERE user_id = $2 AND course_id = $1 AND completed = true) as completed_lessons,
        (SELECT COUNT(*)::int FROM quizzes WHERE course_id = $1) as total_quizzes,
        (SELECT COUNT(*)::int FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id WHERE q.course_id = $1 AND qa.user_id = $2 AND qa.passed = true) as passed_quizzes,
        (SELECT COUNT(*)::int FROM coding_challenges cc JOIN lessons l ON cc.lesson_id = l.id WHERE l.course_id = $1) as total_challenges,
        (SELECT COUNT(*)::int FROM challenge_submissions cs JOIN coding_challenges cc ON cs.challenge_id = cc.id JOIN lessons l ON cc.lesson_id = l.id WHERE l.course_id = $1 AND cs.user_id = $2 AND cs.passed = true) as passed_challenges,
        (SELECT COUNT(*)::int FROM assignments WHERE course_id = $1) as total_assignments,
        (SELECT COUNT(*)::int FROM submissions s JOIN assignments a ON s.assignment_id = a.id WHERE a.course_id = $1 AND s.student_id = $2) as submitted_assignments`,
      [courseId, s.userId]
    );
    const a = rows[0] || {};
    const totalLessons = Number(a.total_lessons) || 0;
    const completedLessons = Number(a.completed_lessons) || 0;
    const totalQuizzes = Number(a.total_quizzes) || 0;
    const passedQuizzes = Number(a.passed_quizzes) || 0;
    const totalChallenges = Number(a.total_challenges) || 0;
    const passedChallenges = Number(a.passed_challenges) || 0;
    const totalAssignments = Number(a.total_assignments) || 0;
    const submittedAssignments = Number(a.submitted_assignments) || 0;

    const totalProjects = totalAssignments + totalChallenges;
    const completedProjects = submittedAssignments + passedChallenges;
    const denom = totalLessons + totalQuizzes + totalChallenges + totalAssignments;
    const overall = denom > 0
      ? Math.round(((completedLessons + passedQuizzes + passedChallenges + submittedAssignments) / denom) * 100)
      : Math.round((completedLessons / Math.max(totalLessons, 1)) * 100);

    let streak = 0;
    const streakRes = await db.query<{ day: string }>(
      `SELECT DISTINCT DATE(completed_at) as day FROM lesson_progress
       WHERE user_id = $1 AND completed = true ORDER BY day DESC`,
      [s.userId]
    );
    if (streakRes.rows.length > 0) {
      streak = 1;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const firstDay = new Date(streakRes.rows[0].day); firstDay.setHours(0, 0, 0, 0);
      if (Math.floor((today.getTime() - firstDay.getTime()) / 86400000) <= 1) {
        for (let i = 1; i < streakRes.rows.length; i++) {
          const prev = new Date(streakRes.rows[i - 1].day);
          const curr = new Date(streakRes.rows[i].day);
          if ((prev.getTime() - curr.getTime()) / 86400000 === 1) streak++;
          else break;
        }
      } else streak = 0;
    }

    return c.json({
      success: true,
      data: {
        lessons: { completed: completedLessons, total: totalLessons },
        exercises: { completed: passedChallenges, total: totalChallenges },
        quizzes: { completed: passedQuizzes, total: totalQuizzes },
        projects: {
          completed: completedProjects,
          total: totalProjects,
          assignments: { completed: submittedAssignments, total: totalAssignments },
          challenges: { completed: passedChallenges, total: totalChallenges },
        },
        overall,
        streak,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load detailed progress');
  }
});

// GET /api/v1/progress/modules?courseId=…
progress.get('/modules', async (c) => {
  try {
    const s = await requireAuth(c);
    const courseId = c.req.query('courseId');
    if (!courseId) return fail(c, 400, 'courseId is required');
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `SELECT m.id, m.title, m.order_index,
              COUNT(l.id)::int as total_lessons,
              COALESCE(SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END),0)::int as completed_lessons,
              COALESCE(ROUND((COALESCE(SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END),0)::float / NULLIF(COUNT(l.id),0) * 100))::int,0) as percentage
       FROM modules m
       LEFT JOIN lessons l ON l.module_id = m.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
       WHERE m.course_id = $1
       GROUP BY m.id, m.title, m.order_index
       ORDER BY m.order_index ASC`,
      [courseId, s.userId]
    );

    const ungroupedRes = await db.query<any>(
      `SELECT COUNT(l.id)::int as total_lessons,
              COALESCE(SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END),0)::int as completed_lessons
       FROM lessons l
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
       WHERE l.course_id = $1 AND l.module_id IS NULL`,
      [courseId, s.userId]
    );
    const modules = [...rows];
    const ug = ungroupedRes.rows[0];
    if (ug && Number(ug.total_lessons) > 0) {
      modules.push({
        id: 'ungrouped',
        title: 'Course Content',
        order_index: 9999,
        total_lessons: Number(ug.total_lessons),
        completed_lessons: Number(ug.completed_lessons),
        percentage: ug.total_lessons ? Math.round((Number(ug.completed_lessons) / Number(ug.total_lessons)) * 100) : 0,
      });
    }
    return c.json({ success: true, data: modules });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load module progress');
  }
});

// GET /api/v1/progress/continue-watching
// Postgres used DISTINCT ON; SQLite gets the same result with a window function.
progress.get('/continue-watching', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT course_id, lesson_title, watch_position, watch_percentage, course_title, course_slug, thumbnail
       FROM (
         SELECT lp.course_id, l.title as lesson_title, lp.watch_position, lp.watch_percentage,
                c.title as course_title, c.slug as course_slug, c.thumbnail,
                ROW_NUMBER() OVER (PARTITION BY lp.course_id ORDER BY lp.updated_at DESC) AS rn
         FROM lesson_progress lp
         JOIN lessons l ON lp.lesson_id = l.id
         JOIN courses c ON lp.course_id = c.id
         WHERE lp.user_id = $1 AND lp.completed = false
       ) t
       WHERE rn = 1
       LIMIT 10`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load continue-watching');
  }
});

// PUT /api/v1/progress/watch-position
progress.put('/watch-position', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { lessonId, courseId, watchPosition, watchPercentage } = body;
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, watch_position, watch_percentage)
       VALUES ($1, $2, $3, false, $4, $5)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET
         watch_position = COALESCE($4, lesson_progress.watch_position),
         watch_percentage = COALESCE($5, lesson_progress.watch_percentage),
         updated_at = NOW()
       RETURNING *`,
      [s.userId, lessonId, courseId, watchPosition ?? 0, watchPercentage ?? 0]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save watch position');
  }
});

export default progress;
