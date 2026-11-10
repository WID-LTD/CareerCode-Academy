import type { Env } from './env';
import { getDb } from './db';
import { awardXp } from './gamification';

// Guided Mode, ported from backend/src/models/guided.ts.
// SQLite notes: GREATEST -> MAX(a,b); CURRENT_DATE - INTERVAL -> date('now','-N days').

async function getStreak(env: Env, userId: string): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    `SELECT DISTINCT checkin_date FROM daily_checkins
     WHERE user_id = $1 AND checkin_date >= date('now','-60 days')
     ORDER BY checkin_date DESC`,
    [userId]
  );
  if (!rows.length) return 0;
  const days = new Set(rows.map((r) => String(r.checkin_date).slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getTodayCheckin(env: Env, userId: string) {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM daily_checkins WHERE user_id = $1 AND checkin_date = CURRENT_DATE',
    [userId]
  );
  return rows[0] || null;
}

async function getRecentBlocks(env: Env, userId: string, days = 7): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    `SELECT COALESCE(SUM(blocks_completed), 0)::int AS total FROM daily_checkins
     WHERE user_id = $1 AND checkin_date >= date('now','-' || $2 || ' days')`,
    [userId, days]
  );
  return Number(rows[0]?.total) || 0;
}

export async function getActiveGuided(env: Env, userId: string) {
  const { rows } = await getDb(env).query<any>(
    `SELECT ge.*, lp.title, lp.slug, lp.icon, lp.color
     FROM guided_enrollments ge JOIN learning_paths lp ON lp.id = ge.path_id
     WHERE ge.user_id = $1 AND ge.mode = 'active'
     ORDER BY ge.updated_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function enrollInPath(env: Env, userId: string, pathId: string) {
  const db = getDb(env);
  const { rows: courses } = await db.query<any>(
    `SELECT lpc.course_id, COALESCE(e.completed, false) AS completed
     FROM learning_path_courses lpc
     LEFT JOIN enrollments e ON e.course_id = lpc.course_id AND e.user_id = $1
     WHERE lpc.path_id = $2 ORDER BY lpc.order_index ASC`,
    [userId, pathId]
  );
  let startDay = 0;
  for (let i = 0; i < courses.length; i++) {
    if (!courses[i].completed) { startDay = i; break; }
    startDay = i + 1;
  }
  const { rows } = await db.query<any>(
    `INSERT INTO guided_enrollments (user_id, path_id, day_index, mode)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (user_id, path_id)
     DO UPDATE SET mode = 'active', day_index = guided_enrollments.day_index, updated_at = NOW()
     RETURNING *`,
    [userId, pathId, startDay]
  );
  return rows[0];
}

export async function getEnrollment(env: Env, userId: string, pathId: string) {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM guided_enrollments WHERE user_id = $1 AND path_id = $2',
    [userId, pathId]
  );
  return rows[0] || null;
}

export async function setMode(env: Env, userId: string, pathId: string, mode: string) {
  const { rows } = await getDb(env).query<any>(
    `UPDATE guided_enrollments SET mode = $3, updated_at = NOW()
     WHERE user_id = $1 AND path_id = $2 RETURNING *`,
    [userId, pathId, mode]
  );
  return rows[0] || null;
}

export async function getTodayState(env: Env, userId: string, pathId: string) {
  const db = getDb(env);
  const enrollment = await getEnrollment(env, userId, pathId);
  if (!enrollment) throw Object.assign(new Error('Guided enrollment not found'), { statusCode: 404 });

  const path = (await db.query<any>('SELECT id, title, slug FROM learning_paths WHERE id = $1', [pathId])).rows[0];
  const courses = (await db.query<any>(
    `SELECT lpc.order_index, lpc.course_id, c.title, c.slug, c.level, c.thumbnail, c.duration, c.category,
            u.name AS instructor_name
     FROM learning_path_courses lpc
     JOIN courses c ON c.id = lpc.course_id
     JOIN users u ON u.id = c.instructor_id
     WHERE lpc.path_id = $1 ORDER BY lpc.order_index ASC`,
    [pathId]
  )).rows;

  const finished = enrollment.day_index >= courses.length;
  const currentIndex = Math.min(enrollment.day_index, Math.max(courses.length - 1, 0));
  const currentCourse = finished ? null : courses[currentIndex];

  let lessons: any[] = [];
  let completedLessonIds: string[] = [];
  let gate: any = null;
  if (currentCourse) {
    lessons = (await db.query<any>(
      `SELECT id, title, description, duration, is_free, order_index, video_url
       FROM lessons WHERE course_id = $1 ORDER BY order_index ASC`,
      [currentCourse.course_id]
    )).rows;
    completedLessonIds = (await db.query<any>(
      `SELECT lesson_id FROM guided_loop_entries
       WHERE guided_enrollment_id = $1 AND completed = true AND course_id = $2`,
      [enrollment.id, currentCourse.course_id]
    )).rows.map((r) => r.lesson_id);

    const quiz = (await db.query<any>(
      `SELECT q.id, q.title, q.passing_score, q.time_limit
       FROM quizzes q WHERE q.course_id = $1 AND q.published = true
       ORDER BY (q.lesson_id IS NULL) DESC, q.created_at ASC LIMIT 1`,
      [currentCourse.course_id]
    )).rows[0];
    if (quiz) {
      const attempt = (await db.query<any>(
        'SELECT passed FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 LIMIT 1',
        [quiz.id, userId]
      )).rows[0];
      gate = { ...quiz, passed: attempt?.passed === true };
    }
  }

  const allLessonsDone = currentCourse
    ? lessons.length > 0 && lessons.every((l) => completedLessonIds.includes(l.id))
    : false;
  const gatePassed = gate ? gate.passed : true;

  return {
    path,
    enrollment: { id: enrollment.id, day_index: enrollment.day_index, mode: enrollment.mode, start_date: enrollment.start_date },
    finished,
    currentDay: finished ? courses.length : enrollment.day_index + 1,
    totalDays: courses.length,
    course: currentCourse && {
      ...currentCourse, lessons, completedLessonIds,
      all_lessons_done: allLessonsDone,
      gate, gate_passed: gatePassed,
      day_ready: finished || gatePassed,
    },
    streak: await getStreak(env, userId),
    today_checkin: await getTodayCheckin(env, userId),
    blocks_this_week: await getRecentBlocks(env, userId, 7),
  };
}

export async function markLessonComplete(env: Env, userId: string, pathId: string, lessonId: string) {
  const db = getDb(env);
  const enrollment = await getEnrollment(env, userId, pathId);
  if (!enrollment) throw Object.assign(new Error('Guided enrollment not found'), { statusCode: 404 });
  if (enrollment.mode !== 'active') return { error: 'Guided mode is paused' };

  const lesson = (await db.query<any>('SELECT id, course_id FROM lessons WHERE id = $1', [lessonId])).rows[0];
  if (!lesson) throw Object.assign(new Error('Lesson not found'), { statusCode: 404 });

  const order = (await db.query<any>(
    'SELECT order_index FROM learning_path_courses WHERE path_id = $1 AND course_id = $2',
    [enrollment.path_id, lesson.course_id]
  )).rows[0];
  if (!order) throw Object.assign(new Error('Course in path not found'), { statusCode: 404 });
  if (order.order_index > enrollment.day_index) return { error: 'This lesson is not unlocked yet' };

  await db.query(
    `INSERT INTO guided_loop_entries (guided_enrollment_id, day_index, course_id, lesson_id, completed, completed_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (guided_enrollment_id, lesson_id)
     DO UPDATE SET completed = true, completed_at = NOW()`,
    [enrollment.id, order.order_index, lesson.course_id, lessonId]
  );

  const state = await getTodayState(env, userId, pathId);
  const current = state.course;
  if (current && !state.finished && current.all_lessons_done && current.gate_passed) {
    const next = Math.min(enrollment.day_index + 1, state.totalDays);
    await db.query(
      'UPDATE guided_enrollments SET day_index = $3, updated_at = NOW() WHERE user_id = $1 AND path_id = $2',
      [userId, pathId, next]
    );
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'Day complete!', $2, 'guided_day', $3)`,
      [userId, `You finished day ${state.currentDay} of "${state.path.title}" in Guided Mode.`, `/student/learning-paths/${state.path.slug}`]
    );
    const updated = (await db.query<any>(
      'SELECT * FROM guided_enrollments WHERE user_id = $1 AND path_id = $2',
      [userId, pathId]
    )).rows[0];
    return { advanced: true, day_index: updated.day_index, state: await getTodayState(env, userId, pathId) };
  }
  return { advanced: false, day_index: enrollment.day_index, state };
}

export async function checkIn(env: Env, userId: string, input: any) {
  const db = getDb(env);
  const productive = Math.max(1, Math.min(5, Number(input.productive) || 3));
  const energy = Math.max(1, Math.min(5, Number(input.energy) || 3));
  const blocks = Math.max(0, Number(input.blocks_completed) || 0);

  const row = (await db.query<any>(
    `INSERT INTO daily_checkins (user_id, checkin_date, productive, energy, blocks_completed, claimed)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, false)
     ON CONFLICT (user_id, checkin_date)
     DO UPDATE SET productive = $2, energy = $3,
       blocks_completed = MAX(daily_checkins.blocks_completed, $4), updated_at = NOW()
     RETURNING *`,
    [userId, productive, energy, blocks]
  )).rows[0];

  if (blocks >= 4 && !row.claimed) {
    await db.query('UPDATE daily_checkins SET claimed = true WHERE id = $1', [row.id]);
    await awardXp(env, userId, 30, 'guided_checkin', 'Completed 4+ guided blocks in a day');
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'Check-in bonus!', $2, 'guided_checkin', $3)`,
      [userId, 'Nice work — you completed 4+ guided blocks today. +30 XP earned.', '/student/dashboard']
    );
  }

  return { checkin: row, streak: await getStreak(env, userId), claimed_xp: blocks >= 4 };
}

export async function getReadiness(env: Env, userId: string, pathId?: string) {
  const db = getDb(env);
  const guided = (await db.query<any>(
    `SELECT ge.path_id, lp.title, lp.slug, ge.mode
     FROM guided_enrollments ge JOIN learning_paths lp ON lp.id = ge.path_id
     WHERE ge.user_id = $1 AND ($2 IS NULL OR ge.path_id = $2)
     ORDER BY ge.updated_at DESC`,
    [userId, pathId || null]
  )).rows;

  const enrollments: any[] = [];
  for (const g of guided) {
    const total = Number((await db.query<any>('SELECT COUNT(*)::int AS n FROM learning_path_courses WHERE path_id = $1', [g.path_id])).rows[0]?.n) || 0;
    const done = Number((await db.query<any>(
      `SELECT COUNT(DISTINCT c.id)::int AS n
       FROM learning_path_courses lpc
       JOIN courses c ON c.id = lpc.course_id
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1 AND e.completed = true
       WHERE lpc.path_id = $2`,
      [userId, g.path_id]
    )).rows[0]?.n) || 0;
    enrollments.push({
      path_id: g.path_id, title: g.title, slug: g.slug, mode: g.mode,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      completed: total > 0 && done >= total,
    });
  }

  return {
    enrollments,
    readiness_score: enrollments.length
      ? Math.round(enrollments.reduce((a, b) => a + Number(b.progress || 0), 0) / enrollments.length)
      : 0,
    streak: await getStreak(env, userId),
    blocks_this_week: await getRecentBlocks(env, userId, 7),
    active_guided: await getActiveGuided(env, userId),
  };
}

export async function getAccountability(env: Env, userId: string, pathId?: string) {
  const db = getDb(env);
  const activeId = pathId || (await getActiveGuided(env, userId))?.path_id;
  if (!activeId) return { active: false, message: 'No active guided path' };

  const state = await getTodayState(env, userId, activeId);
  const checkins = (await db.query<any>(
    `SELECT checkin_date, productive, energy, blocks_completed FROM daily_checkins
     WHERE user_id = $1 AND checkin_date > date('now','-14 days')
     ORDER BY checkin_date DESC`,
    [userId]
  )).rows;
  const done = (await db.query<any>(
    `SELECT COUNT(*)::int AS n FROM guided_loop_entries
     WHERE guided_enrollment_id = (SELECT id FROM guided_enrollments WHERE user_id = $1 AND path_id = $2)
       AND completed = true`,
    [userId, activeId]
  )).rows[0];

  return {
    active: true,
    path: state.path,
    enrollment: state.enrollment,
    current_day: state.currentDay,
    total_days: state.totalDays,
    finished: state.finished,
    gate_passed: (state.course as any)?.gate_passed ?? null,
    lessons_done_today: (state.course as any)?.completedLessonIds?.length || 0,
    lessons_today: (state.course as any)?.lessons?.length || 0,
    total_lessons_done: Number(done?.n) || 0,
    streak: state.streak,
    blocks_this_week: state.blocks_this_week,
    checkins,
  };
}
