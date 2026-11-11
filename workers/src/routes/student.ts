import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { authenticate } from '../auth-helpers';
import { mail } from '../email';
import { sendPushToUser } from '../push';
import { sendMentoringReminders } from '../mentoring-reminders';

const student = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

// ── Gamification helpers (ported 1:1 from backend gamification + routes) ──
async function getHearts(env: Env, userId: string) {
  const { rows } = await getDb(env).query<any>(
    'SELECT hearts, max_hearts, last_heart_regeneration FROM users WHERE id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user) return { hearts: 0, maxHearts: 5, nextHeartIn: null };
  const hearts = Number(user.hearts);
  const maxHearts = Number(user.max_hearts);
  if (hearts >= maxHearts) return { hearts, maxHearts, nextHeartIn: null };
  const elapsed = Date.now() - new Date(user.last_heart_regeneration).getTime();
  const remaining = 30 * 60 * 1000 - elapsed;
  if (remaining <= 0) return { hearts, maxHearts, nextHeartIn: 0 };
  return { hearts, maxHearts, nextHeartIn: Math.ceil(remaining / 60000) };
}

async function getDailyProgress(env: Env, userId: string) {
  const { rows } = await getDb(env).query<any>(
    `SELECT d.xp_earned, d.goal_reached, u.daily_xp_goal FROM daily_xp_log d
     RIGHT JOIN users u ON u.id = d.user_id AND d.date = CURRENT_DATE WHERE u.id = $1`,
    [userId]
  );
  const row = rows[0];
  return {
    xpEarned: Number(row?.xp_earned) || 0,
    goal: Number(row?.daily_xp_goal) || 50,
    goalReached: row?.goal_reached || false,
  };
}

async function updateStreak(env: Env, userId: string): Promise<{ current: number; best: number }> {
  const db = getDb(env);
  const { rows: userRows } = await db.query<any>('SELECT best_streak FROM users WHERE id = $1', [userId]);
  const prevBest = Number(userRows[0]?.best_streak) || 0;
  const { rows: days } = await db.query<any>(
    `SELECT DISTINCT DATE(completed_at) as day FROM lesson_progress
     WHERE user_id = $1 AND completed = true ORDER BY day DESC`,
    [userId]
  );
  if (!days.length) {
    await db.query('UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1', [userId]);
    return { current: 0, best: prevBest };
  }
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(days[0].day);
  firstDay.setHours(0, 0, 0, 0);
  if (Math.floor((today.getTime() - firstDay.getTime()) / 86400000) > 1) {
    await db.query('UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1', [userId]);
    return { current: 0, best: prevBest };
  }
  for (let i = 1; i < days.length; i++) {
    const d = (new Date(days[i - 1].day).getTime() - new Date(days[i].day).getTime()) / 86400000;
    if (d === 1) streak++;
    else break;
  }
  const newBest = Math.max(prevBest, streak);
  await db.query('UPDATE users SET last_active_date = CURRENT_DATE, best_streak = $1, updated_at = NOW() WHERE id = $2', [newBest, userId]);
  return { current: streak, best: newBest };
}

async function computeStreak(env: Env, userId: string): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    `SELECT DISTINCT DATE(completed_at) as day FROM lesson_progress
     WHERE user_id = $1 AND completed = true ORDER BY day DESC`,
    [userId]
  );
  if (!rows.length) return 0;
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(rows[0].day);
  firstDay.setHours(0, 0, 0, 0);
  if (Math.floor((today.getTime() - firstDay.getTime()) / 86400000) > 1) return 0;
  for (let i = 1; i < rows.length; i++) {
    const diff = (new Date(rows[i - 1].day).getTime() - new Date(rows[i].day).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

async function computeRank(env: Env, userId: string): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    `SELECT id, (COALESCE((SELECT SUM(jsonb_array_length(completed_lessons)) FROM enrollments WHERE user_id = u.id), 0) * 10 +
      COALESCE((SELECT COUNT(*) FROM certificates WHERE user_id = u.id), 0) * 100) as xp
     FROM users u WHERE u.role = 'student' ORDER BY xp DESC`
  );
  const rank = rows.findIndex((r: any) => r.id === userId) + 1;
  return rank > 0 ? rank : rows.length;
}

const analyticsCache = new Map<string, { data: any; expiresAt: number }>();
const ANALYTICS_TTL = 5 * 60 * 1000;

async function computeAnalytics(env: Env, userId: string, useCache = true): Promise<any> {
  const key = `analytics:${userId}`;
  if (useCache) {
    const cached = analyticsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }
  const db = getDb(env);
  const weeklyRes = await db.query<any>(
    `SELECT TO_CHAR(completed_at, 'Dy') as day, COUNT(*)::int as hours FROM lesson_progress
     WHERE user_id = $1 AND completed = true AND completed_at >= date_trunc('week', NOW())
     GROUP BY TO_CHAR(completed_at, 'Dy') ORDER BY MIN(completed_at)`,
    [userId]
  );
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyMap = new Map(weeklyRes.rows.map((r: any) => [String(r.day).trim(), r.hours]));
  const weeklyActivity = dayOrder.map((day) => ({ day, hours: weeklyMap.get(day) || 0 }));
  const monthlyRes = await db.query<any>(
    `SELECT TO_CHAR(completed_at, 'Mon') as month, COUNT(*)::int as hours FROM lesson_progress
     WHERE user_id = $1 AND completed = true AND completed_at >= date_trunc('year', NOW())
     GROUP BY TO_CHAR(completed_at, 'Mon'), EXTRACT(MONTH FROM completed_at)
     ORDER BY EXTRACT(MONTH FROM completed_at)`,
    [userId]
  );
  const skillRes = await db.query<any>(
    `SELECT c.category as skill, ROUND(AVG(e.progress))::int as current FROM enrollments e
     JOIN courses c ON c.id = e.course_id WHERE e.user_id = $1
     GROUP BY c.category ORDER BY current DESC LIMIT 6`,
    [userId]
  );
  const heatRes = await db.query<any>(
    `SELECT DATE(completed_at) as day, COUNT(*)::int as count FROM lesson_progress
     WHERE user_id = $1 AND completed = true
       AND completed_at >= date_trunc('week', NOW()) - INTERVAL '7 weeks'
       AND completed_at < date_trunc('week', NOW()) + INTERVAL '1 week'
     GROUP BY DATE(completed_at)`,
    [userId]
  );
  const dayMap = new Map<string, number>(
    heatRes.rows.map((r: any) => [new Date(r.day).toISOString().slice(0, 10), r.count])
  );
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const weekStart0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
  const heatmap = [];
  for (let w = 0; w < 8; w++) {
    const ws = new Date(weekStart0.getTime() - (7 - w) * 7 * 86400000);
    const row: any = { week: `W${w + 1}` };
    for (let d = 0; d < 7; d++) {
      const day = new Date(ws.getTime() + d * 86400000);
      row[names[d]] = dayMap.get(day.toISOString().slice(0, 10)) || 0;
    }
    heatmap.push(row);
  }
  const result = {
    weeklyActivity,
    monthlyLearning: monthlyRes.rows.map((r: any) => ({ month: r.month, hours: r.hours })),
    skillGrowth: skillRes.rows.map((r: any) => ({ skill: r.skill, current: r.current })),
    heatmap,
  };
  analyticsCache.set(key, { data: result, expiresAt: Date.now() + ANALYTICS_TTL });
  return result;
}

function computeBadges(_userId: string, _stats: any, enrollCount: number, lessonCount: number, completedCourses: number, certCount: number, streak: number, submissionCount = 0, quizPassed = 0, reviewCount = 0): any[] {
  const badges: any[] = [];
  const now = new Date().toISOString();
  const E = (id: string, name: string, description: string, icon: string) =>
    badges.push({ id, name, description, icon, earned: true, earned_at: now });
  const L = (id: string, name: string, description: string, icon: string, progress?: number) =>
    badges.push({ id, name, description, icon, earned: false, ...(progress !== undefined ? { progress } : {}) });
  if (enrollCount >= 1) E('first-course', 'First Course', 'Enrolled in your first course', 'Zap');
  if (lessonCount >= 5) E('quick-learner', 'Quick Learner', 'Completed 5 lessons', 'Zap');
  if (lessonCount >= 25) E('dedicated', 'Dedicated', 'Completed 25 lessons', 'Brain');
  if (lessonCount >= 100) E('scholar', 'Scholar', 'Completed 100 lessons', 'Award');
  if (completedCourses >= 1) E('graduate', 'Course Graduate', 'Completed your first course', 'GraduationCap');
  if (completedCourses >= 3) E('knowledge-seeker', 'Knowledge Seeker', 'Completed 3 courses', 'Brain');
  if (certCount >= 1) E('certified', 'Certified', 'Earned your first certificate', 'Award');
  if (streak >= 7) E('week-warrior', 'Week Warrior', 'Maintained a 7-day streak', 'Flame');
  if (streak >= 30) E('iron-will', 'Iron Will', 'Maintained a 30-day streak', 'Flame');
  if (enrollCount >= 5) E('explorer', 'Explorer', 'Enrolled in 5 courses', 'HeartHandshake');
  if (submissionCount >= 1) E('first-submission', 'First Submission', 'Submitted your first assignment', 'Award');
  if (submissionCount >= 5) E('assignment-hero', 'Assignment Hero', 'Submitted 5 assignments', 'Award');
  if (quizPassed >= 1) E('quiz-taker', 'Quiz Taker', 'Passed your first quiz', 'Brain');
  if (quizPassed >= 5) E('quiz-master', 'Quiz Master', 'Passed 5 quizzes', 'Brain');
  if (reviewCount >= 1) E('reviewer', 'Reviewer', 'Left your first course review', 'HeartHandshake');
  if (lessonCount < 5) L('quick-learner', 'Quick Learner', 'Complete 5 lessons', 'Zap', Math.round((lessonCount / 5) * 100));
  if (lessonCount < 25) L('dedicated', 'Dedicated', 'Complete 25 lessons', 'Brain', Math.round((lessonCount / 25) * 100));
  if (lessonCount < 100) L('scholar', 'Scholar', 'Complete 100 lessons', 'Award', Math.round((lessonCount / 100) * 100));
  if (completedCourses < 1) L('graduate', 'Course Graduate', 'Complete your first course', 'GraduationCap');
  if (completedCourses < 3) L('knowledge-seeker', 'Knowledge Seeker', 'Complete 3 courses', 'Brain', Math.round((completedCourses / 3) * 100));
  if (certCount < 1) L('certified', 'Certified', 'Earn your first certificate', 'Award');
  if (streak < 7) L('week-warrior', 'Week Warrior', 'Maintain a 7-day streak', 'Flame', Math.round((streak / 7) * 100));
  if (streak < 30) L('iron-will', 'Iron Will', 'Maintain a 30-day streak', 'Flame', Math.round((streak / 30) * 100));
  if (enrollCount < 5) L('explorer', 'Explorer', 'Enroll in 5 courses', 'HeartHandshake', Math.round((enrollCount / 5) * 100));
  if (submissionCount < 1) L('first-submission', 'First Submission', 'Submit your first assignment', 'Award');
  if (submissionCount < 5) L('assignment-hero', 'Assignment Hero', 'Submit 5 assignments', 'Award', Math.round((submissionCount / 5) * 100));
  if (quizPassed < 1) L('quiz-taker', 'Quiz Taker', 'Pass your first quiz', 'Brain');
  if (quizPassed < 5) L('quiz-master', 'Quiz Master', 'Pass 5 quizzes', 'Brain', Math.round((quizPassed / 5) * 100));
  if (reviewCount < 1) L('reviewer', 'Reviewer', 'Leave your first course review', 'HeartHandshake');
  return badges;
}

// GET /api/v1/student/dashboard
student.get('/dashboard', async (c) => {
  let session;
  try {
    session = await authenticate(c);
  } catch (e: any) {
    return err(c, e?.statusCode || 401, e?.message || 'Not authenticated');
  }
  try {
    const userId = session.userId;
    const db = getDb(c.env);
    const [statsRes, extra, coursesRes, activityRes, assignmentsRes, recommendedRes, xpRes] = await Promise.all([
      db.query<any>(
        `SELECT (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1) AS enrolled_courses,
          (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1 AND completed = true) AS completed_courses,
          COALESCE((SELECT SUM(jsonb_array_length(completed_lessons))::int FROM enrollments WHERE user_id = $1), 0) AS completed_lessons,
          COALESCE((SELECT COUNT(*)::int FROM certificates WHERE user_id = $1), 0) AS certificates,
          COALESCE((SELECT ROUND(AVG(progress))::int FROM enrollments WHERE user_id = $1), 0) AS average_progress,
          COALESCE((SELECT streak_freezes FROM users WHERE id = $1), 0) AS streak_freezes`,
        [userId]
      ),
      db.query<any>(
        `SELECT (SELECT COUNT(*)::int FROM submissions WHERE student_id = $1) AS submissions,
          (SELECT COUNT(*)::int FROM quiz_attempts WHERE user_id = $1 AND passed = true) AS quizzes_passed,
          (SELECT COUNT(*)::int FROM reviews WHERE user_id = $1) AS reviews`,
        [userId]
      ),
      db.query<any>(
        `SELECT e.id, c.id as course_id, c.title, c.slug, c.thumbnail, c.duration, e.progress, u.name as instructor_name, e.enrolled_at
         FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN users u ON u.id = c.instructor_id
         WHERE e.user_id = $1 ORDER BY e.enrolled_at DESC LIMIT 10`,
        [userId]
      ),
      db.query<any>(
        `SELECT * FROM (
          SELECT 'enrollment' as type, c.title as course_title, e.enrolled_at as created_at
          FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = $1
          UNION ALL
          SELECT 'lesson' as type, c.title as course_title, lp.completed_at as created_at
          FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
          JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
          WHERE lp.user_id = $1 AND lp.completed = true
          UNION ALL
          SELECT 'certificate' as type, c.title as course_title, cert.issued_at as created_at
          FROM certificates cert JOIN courses c ON c.id = cert.course_id WHERE cert.user_id = $1
        ) activity ORDER BY created_at DESC LIMIT 10`,
        [userId]
      ),
      db.query<any>(
        `SELECT a.id, a.title, a.due_date, a.max_score, c.title as course_title,
          CASE WHEN a.due_date - NOW() <= INTERVAL '2 days' THEN 'high'
               WHEN a.due_date - NOW() <= INTERVAL '7 days' THEN 'medium' ELSE 'low' END as priority,
          CASE WHEN s.score IS NOT NULL THEN 'graded' WHEN s.id IS NOT NULL THEN 'submitted' ELSE 'not-started' END as status
         FROM assignments a JOIN courses c ON c.id = a.course_id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
         WHERE a.due_date >= NOW() AND a.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)
         ORDER BY a.due_date ASC LIMIT 10`,
        [userId]
      ),
      db.query<any>(
        `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level as difficulty,
          COALESCE(AVG(r.rating), 0) as rating, COUNT(DISTINCT e.id)::int as student_count,
          c.category, u.name as instructor_name
         FROM courses c JOIN users u ON u.id = c.instructor_id
         LEFT JOIN reviews r ON r.course_id = c.id
         LEFT JOIN enrollments e ON e.course_id = c.id
         WHERE c.status = 'published' AND c.id NOT IN (SELECT course_id FROM enrollments WHERE user_id = $1)
         GROUP BY c.id, u.name ORDER BY rating DESC, student_count DESC LIMIT 6`,
        [userId]
      ),
      db.query<any>(
        `SELECT COALESCE((SELECT SUM(jsonb_array_length(completed_lessons)) FROM enrollments WHERE user_id = $1), 0) * 10 +
          COALESCE((SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND completed = true), 0) * 50 +
          COALESCE((SELECT COUNT(*) FROM certificates WHERE user_id = $1), 0) * 100 AS xp_points`,
        [userId]
      ),
    ]);

    const [streak, analytics, rank, hearts, dailyProgress] = await Promise.all([
      computeStreak(c.env, userId),
      computeAnalytics(c.env, userId),
      computeRank(c.env, userId),
      getHearts(c.env, userId),
      getDailyProgress(c.env, userId),
    ]);
    const streakData = await updateStreak(c.env, userId);

    const stats = statsRes.rows[0] || {};
    const xpPoints = Number(xpRes.rows[0]?.xp_points) || 0;
    const level = Math.floor(xpPoints / 500) + 1;
    const enrolledCourses = Number(stats.enrolled_courses) || 0;
    const completedLessons = Number(stats.completed_lessons) || 0;
    const completedCourses = Number(stats.completed_courses) || 0;
    const certificatesCount = Number(stats.certificates) || 0;
    const extraStats = extra.rows[0] || {};
    const badges = computeBadges(
      userId, stats, enrolledCourses, completedLessons, completedCourses, certificatesCount, streak,
      Number(extraStats.submissions) || 0, Number(extraStats.quizzes_passed) || 0, Number(extraStats.reviews) || 0
    );

    return c.json({
      success: true,
      data: {
        stats: {
          enrolledCourses,
          completedCourses,
          completedLessons,
          certificates: certificatesCount,
          averageProgress: Number(stats.average_progress) || 0,
          totalLearningHours: Math.round(completedLessons * 0.5),
          currentStreak: streakData.current,
          bestStreak: streakData.best,
          xpPoints,
          level,
          rank,
          hearts: hearts.hearts,
          maxHearts: hearts.maxHearts,
          nextHeartIn: hearts.nextHeartIn,
          streakFreezes: Number(stats.streak_freezes) || 0,
          dailyXpGoal: dailyProgress.goal,
          dailyXpEarned: dailyProgress.xpEarned,
          dailyGoalReached: dailyProgress.goalReached,
        },
        recentCourses: coursesRes.rows.map((x: any) => ({
          id: x.course_id, title: x.title, slug: x.slug, thumbnail: x.thumbnail,
          duration: x.duration, progress: x.progress, instructor_name: x.instructor_name, enrolled_at: x.enrolled_at,
        })),
        recentActivity: activityRes.rows.map((x: any) => ({ type: x.type, course_title: x.course_title, created_at: x.created_at })),
        upcomingAssignments: assignmentsRes.rows.map((x: any) => ({
          id: x.id, title: x.title, due_date: x.due_date, max_score: x.max_score,
          course_title: x.course_title, priority: x.priority || 'medium', status: x.status,
        })),
        recommendedCourses: recommendedRes.rows.map((x: any) => ({
          id: x.id, title: x.title, slug: x.slug, thumbnail: x.thumbnail, duration: x.duration,
          difficulty: x.difficulty, rating: Number(x.rating) || 0, studentCount: Number(x.student_count) || 0,
          category: x.category, instructor_name: x.instructor_name,
        })),
        badges,
        analytics,
      },
    });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load dashboard');
  }
});


// ── Analytics / badges / leaderboard / calendar / recommended ─────────────
student.get('/analytics', async (c) => {
  try {
    const s = await authenticate(c);
    return c.json({ success: true, data: await computeAnalytics(c.env, s.userId) });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load analytics'); }
});

student.get('/badges', async (c) => {
  try {
    const s = await authenticate(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1) AS enrolled,
        COALESCE((SELECT SUM(jsonb_array_length(completed_lessons))::int FROM enrollments WHERE user_id = $1), 0) AS lessons,
        (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1 AND completed = true) AS completed_courses,
        (SELECT COUNT(*)::int FROM certificates WHERE user_id = $1) AS certs`,
      [s.userId]
    );
    const r = rows[0] || {};
    const streak = await computeStreak(c.env, s.userId);
    return c.json({
      success: true,
      data: computeBadges(s.userId, r, Number(r.enrolled) || 0, Number(r.lessons) || 0, Number(r.completed_courses) || 0, Number(r.certs) || 0, streak),
    });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load badges'); }
});

student.get('/leaderboard', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT u.id, u.name, u.avatar,
        (COALESCE((SELECT SUM(jsonb_array_length(completed_lessons)) FROM enrollments WHERE user_id = u.id), 0) * 10 +
         COALESCE((SELECT COUNT(*) FROM certificates WHERE user_id = u.id), 0) * 100) as xp_points,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_count,
        COALESCE((SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = u.id AND lp.completed = true
          AND lp.completed_at >= NOW() - INTERVAL '7 days'), 0) as weekly_lessons
       FROM users u WHERE u.role = 'student' ORDER BY xp_points DESC LIMIT 50`
    );
    const weeklySorted = [...rows].sort((a: any, b: any) => Number(b.weekly_lessons) - Number(a.weekly_lessons));
    const weeklyRanks = new Map(weeklySorted.map((r: any, i: number) => [r.id, i + 1]));
    const data = rows.map((r: any, i: number) => {
      const currentRank = i + 1;
      const weeklyRank = weeklyRanks.get(r.id) || currentRank;
      return {
        userId: r.id, name: r.name, avatar: r.avatar,
        xpPoints: Number(r.xp_points) || 0, badges: Number(r.badges_count) || 0,
        rank: currentRank,
        rankChange: Math.max(-10, Math.min(10, weeklyRank - currentRank)),
        isCurrentUser: r.id === s.userId,
      };
    });
    return c.json({ success: true, data });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load leaderboard'); }
});

student.get('/calendar', async (c) => {
  try {
    const s = await authenticate(c);
    const db = getDb(c.env);
    const [assignments, live, quizzes, exams, certs, calendarEvents] = await Promise.all([
      db.query<any>(`SELECT a.id, a.title, a.due_date as date, c.title as course_title, 'assignment' as type
        FROM assignments a JOIN courses c ON c.id = a.course_id
        WHERE a.due_date >= NOW() AND a.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)
        ORDER BY a.due_date ASC LIMIT 20`, [s.userId]),
      db.query<any>(`SELECT lc.id, lc.title, lc.scheduled_at as date, c.title as course_title, 'live-class' as type
        FROM live_classes lc JOIN courses c ON c.id = lc.course_id
        WHERE lc.scheduled_at >= NOW() AND lc.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)
        ORDER BY lc.scheduled_at ASC LIMIT 20`, [s.userId]),
      db.query<any>(`SELECT q.id, q.title, q.due_date as date, c.title as course_title, 'quiz' as type
        FROM quizzes q JOIN courses c ON c.id = q.course_id
        WHERE q.due_date IS NOT NULL AND q.due_date >= NOW() AND q.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)
        ORDER BY q.due_date ASC LIMIT 20`, [s.userId]),
      db.query<any>(`SELECT e.id, e.title, e.starts_at as date, c.title as course_title, 'exam' as type
        FROM exams e JOIN courses c ON c.id = e.course_id
        WHERE e.starts_at >= NOW() AND e.is_published = true AND e.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)
        ORDER BY e.starts_at ASC LIMIT 20`, [s.userId]),
      db.query<any>(`SELECT c.id, co.title || ' Certificate' as title, c.issued_at as date, co.title as course_title, 'certificate' as type
        FROM certificates c JOIN courses co ON co.id = c.course_id
        WHERE c.user_id = $1 AND c.issued_at >= NOW() - INTERVAL '30 days'
        ORDER BY c.issued_at DESC LIMIT 20`, [s.userId]),
      db.query<any>(`SELECT ce.id, ce.title, ce.start_datetime as date, c.title as course_title, 'live-class' as type,
        ce.meeting_url, ce.location
        FROM calendar_events ce LEFT JOIN courses c ON c.id = ce.course_id
        WHERE ce.start_datetime >= NOW() AND ce.status = 'scheduled'
          AND (ce.visibility = 'public' OR (ce.visibility = 'course' AND ce.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)))
        ORDER BY ce.start_datetime ASC LIMIT 30`, [s.userId]),
    ]);
    const events = [
      ...assignments.rows, ...live.rows, ...quizzes.rows, ...exams.rows, ...certs.rows, ...calendarEvents.rows,
    ].map((r: any) => ({ ...r, time: new Date(r.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return c.json({ success: true, data: events });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load calendar'); }
});

student.get('/recommended', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level as difficulty,
        COALESCE(AVG(r.rating), 0) as rating, COUNT(DISTINCT e.id)::int as student_count,
        c.category, u.name as instructor_name
       FROM courses c JOIN users u ON u.id = c.instructor_id
       LEFT JOIN reviews r ON r.course_id = c.id
       LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE c.status = 'published' AND c.id NOT IN (SELECT course_id FROM enrollments WHERE user_id = $1)
       GROUP BY c.id, u.name ORDER BY rating DESC, student_count DESC LIMIT 6`,
      [s.userId]
    );
    return c.json({
      success: true,
      data: rows.map((x: any) => ({
        id: x.id, title: x.title, slug: x.slug, thumbnail: x.thumbnail, duration: x.duration,
        difficulty: x.difficulty, rating: Number(x.rating) || 0, studentCount: Number(x.student_count) || 0,
        category: x.category, instructor_name: x.instructor_name,
      })),
    });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load recommendations'); }
});

student.get('/assignments', async (c) => {
  try {
    const s = await authenticate(c);
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT a.id, a.title, a.description, a.due_date, a.max_score, a.course_id,
        c.title as course, c.slug as course_slug,
        CASE WHEN s.score IS NOT NULL THEN 'graded' WHEN s.id IS NOT NULL THEN 'submitted' ELSE 'not-started' END as status,
        s.score as grade, s.feedback
       FROM assignments a JOIN courses c ON c.id = a.course_id
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
       WHERE a.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)
       ORDER BY a.due_date ASC LIMIT $2 OFFSET $3`,
      [s.userId, limit, offset]
    );
    const total = await db.query<any>(
      `SELECT COUNT(*)::int as total FROM assignments a
       WHERE a.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)`,
      [s.userId]
    );
    const totalN = Number(total.rows[0]?.total) || 0;
    return c.json({
      success: true,
      data: rows.map((a: any) => ({
        id: a.id, title: a.title, description: a.description, course: a.course, course_slug: a.course_slug,
        due: a.due_date, status: a.status, grade: a.grade, feedback: a.feedback, max_score: a.max_score,
      })),
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load assignments'); }
});

student.get('/challenges', async (c) => {
  try {
    const s = await authenticate(c);
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT cc.*, l.title as lesson_title, c.title as course_title, c.slug as course_slug,
        (SELECT cs.id FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_id,
        (SELECT cs.code FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_code,
        (SELECT cs.passed FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_passed,
        (SELECT cs.score FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_score,
        (SELECT cs.feedback FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_feedback,
        (SELECT cs.submitted_at FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_at,
        (SELECT cs.file_url FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_file_url,
        (SELECT cs.text_answer FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = $1 ORDER BY cs.submitted_at DESC LIMIT 1) as submission_text_answer
       FROM coding_challenges cc
       JOIN lessons l ON cc.lesson_id = l.id
       JOIN courses c ON l.course_id = c.id
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
       ORDER BY cc.created_at DESC LIMIT $2 OFFSET $3`,
      [s.userId, limit, offset]
    );
    const total = await db.query<any>(
      `SELECT COUNT(*)::int as total FROM coding_challenges cc
       JOIN lessons l ON cc.lesson_id = l.id JOIN courses c ON l.course_id = c.id
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1`,
      [s.userId]
    );
    const totalN = Number(total.rows[0]?.total) || 0;
    return c.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id, lesson_id: r.lesson_id, title: r.title, description: r.description,
        instructions: r.instructions, type: r.type || 'code', starter_code: r.starter_code,
        test_code: r.test_code, language: r.language, difficulty: r.difficulty,
        submission_type: r.submission_type, allowed_file_types: r.allowed_file_types,
        lesson_title: r.lesson_title, course_title: r.course_title, course_slug: r.course_slug,
        submission: r.submission_id ? {
          id: r.submission_id, code: r.submission_code, passed: r.submission_passed,
          score: r.submission_score, feedback: r.submission_feedback, submitted_at: r.submission_at,
          file_url: r.submission_file_url, text_answer: r.submission_text_answer,
        } : null,
      })),
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load challenges'); }
});

student.get('/courses/:slug/analytics', async (c) => {
  try {
    const s = await authenticate(c);
    const db = getDb(c.env);
    const course = (await db.query<any>('SELECT id, title, slug FROM courses WHERE slug = $1', [c.req.param('slug')])).rows[0];
    if (!course) return err(c, 404, 'Course not found');
    const enr = (await db.query<any>(
      'SELECT id, progress, completed, enrolled_at, completed_at FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, course.id]
    )).rows[0];
    if (!enr) return err(c, 403, 'Not enrolled in this course');

    const [total, done, weekly, quiz, assignment, challenge, watch] = await Promise.all([
      db.query<any>('SELECT COUNT(*)::int as total FROM lessons WHERE course_id = $1', [course.id]),
      db.query<any>('SELECT COUNT(*)::int as count FROM lesson_progress WHERE course_id = $1 AND user_id = $2 AND completed = true', [course.id, s.userId]),
      db.query<any>(`SELECT DATE(lp.completed_at) as date, COUNT(*)::int as count FROM lesson_progress lp
        WHERE lp.course_id = $1 AND lp.user_id = $2 AND lp.completed = true
          AND lp.completed_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(lp.completed_at) ORDER BY date ASC`, [course.id, s.userId]),
      db.query<any>(`SELECT COUNT(*)::int as total_attempts, COALESCE(AVG(qa.score), 0) as avg_score
        FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id WHERE q.course_id = $1 AND qa.user_id = $2`, [course.id, s.userId]),
      db.query<any>(`SELECT COUNT(*)::int as submitted, COALESCE(AVG(s.score), 0) as avg_score
        FROM submissions s JOIN assignments a ON s.assignment_id = a.id WHERE a.course_id = $1 AND s.student_id = $2`, [course.id, s.userId]),
      db.query<any>(`SELECT COUNT(*)::int as submitted, COALESCE(AVG(cs.score), 0) as avg_score,
        SUM(CASE WHEN cs.passed = true THEN 1 ELSE 0 END)::int as passed
        FROM challenge_submissions cs JOIN coding_challenges cc ON cs.challenge_id = cc.id
        JOIN lessons l ON cc.lesson_id = l.id WHERE l.course_id = $1 AND cs.user_id = $2`, [course.id, s.userId]),
      db.query<any>('SELECT COALESCE(SUM(lp.watch_position), 0)::int as total_seconds FROM lesson_progress lp WHERE lp.course_id = $1 AND lp.user_id = $2', [course.id, s.userId]),
    ]);

    const totalLessons = Number(total.rows[0]?.total) || 0;
    const completedLessons = Number(done.rows[0]?.count) || 0;
    const weeklyMap = new Map(weekly.rows.map((r: any) => [String(r.date).slice(0, 10), Number(r.count)]));
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklyActivity.push({ date: key, label: d.toLocaleDateString(undefined, { weekday: 'short' }), lessons: weeklyMap.get(key) || 0 });
    }
    const seconds = Number(watch.rows[0]?.total_seconds) || 0;

    return c.json({
      success: true,
      data: {
        course: { id: course.id, title: course.title, slug: course.slug },
        enrollment: { progress: enr.progress, completed: enr.completed, enrolledAt: enr.enrolled_at, completedAt: enr.completed_at },
        lessons: { total: totalLessons, completed: completedLessons, completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0 },
        weeklyActivity,
        quizzes: { totalAttempts: Number(quiz.rows[0]?.total_attempts) || 0, averageScore: Math.round(Number(quiz.rows[0]?.avg_score) || 0) },
        assignments: { submitted: Number(assignment.rows[0]?.submitted) || 0, averageScore: Math.round(Number(assignment.rows[0]?.avg_score) || 0) },
        challenges: { submitted: Number(challenge.rows[0]?.submitted) || 0, passed: Number(challenge.rows[0]?.passed) || 0, averageScore: Math.round(Number(challenge.rows[0]?.avg_score) || 0) },
        timeSpent: { totalSeconds: seconds, totalHours: Math.round((seconds / 3600) * 10) / 10 },
      },
    });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load course analytics'); }
});

// ── Direct messages ───────────────────────────────────────────────────────
student.get('/messages/conversations', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT u.id, u.name, u.avatar, u.role,
        COALESCE(SUM(CASE WHEN dm.is_read = false AND dm.receiver_id = $1 THEN 1 ELSE 0 END), 0)::int AS unread_count,
        (SELECT content FROM direct_messages WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM direct_messages WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id) ORDER BY created_at DESC LIMIT 1) AS last_message_at
       FROM users u JOIN direct_messages dm ON (dm.sender_id = u.id OR dm.receiver_id = u.id)
       WHERE (dm.sender_id = $1 OR dm.receiver_id = $1) AND u.id != $1
       GROUP BY u.id, u.name, u.avatar, u.role
       ORDER BY last_message_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load conversations'); }
});

student.get('/messages/:userId', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT * FROM direct_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [s.userId, c.req.param('userId')]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load messages'); }
});

student.post('/messages', async (c) => {
  try {
    const s = await authenticate(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.receiver_id || !body.content) return err(c, 400, 'receiver_id and content are required');
    const { rows } = await getDb(c.env).query<any>(
      'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
      [s.userId, body.receiver_id, body.content]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to send message'); }
});

student.put('/messages/read', async (c) => {
  try {
    const s = await authenticate(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>(
      'UPDATE direct_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false RETURNING id',
      [body.senderId, s.userId]
    );
    return c.json({ success: true, updated: rows.length });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to update messages'); }
});

student.put('/messages/read-all', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      'UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND is_read = false RETURNING id',
      [s.userId]
    );
    return c.json({ success: true, updated: rows.length });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to update messages'); }
});

student.delete('/messages/:id', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM direct_messages WHERE id = $1 AND sender_id = $2 RETURNING id',
      [c.req.param('id'), s.userId]
    );
    if (!rows.length) return err(c, 404, 'Message not found or not yours');
    return c.json({ success: true, message: 'Message deleted' });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to delete message'); }
});

student.get('/users', async (c) => {
  try {
    const s = await authenticate(c);
    const search = c.req.query('search');
    const params: any[] = [s.userId];
    let sql = `SELECT DISTINCT u.id, u.name, u.email, u.role, u.avatar FROM users u
      WHERE u.id != $1 AND (
        (u.role = 'instructor' AND u.id IN (SELECT c.instructor_id FROM courses c JOIN enrollments e ON e.course_id = c.id WHERE e.user_id = $1))
        OR (u.role = 'student' AND u.id IN (SELECT e2.user_id FROM enrollments e2 WHERE e2.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)))
      )`;
    if (search) { params.push(`%${search}%`); sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }
    sql += ' ORDER BY u.name ASC LIMIT 20';
    const { rows } = await getDb(c.env).query<any>(sql, params);
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load users'); }
});

// ── Mentoring ─────────────────────────────────────────────────────────────
student.get('/mentoring-slots', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ms.*, u.name as instructor_name, u.avatar as instructor_avatar, c.title as course_title
       FROM mentoring_slots ms JOIN courses c ON ms.course_id = c.id
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
       JOIN users u ON ms.instructor_id = u.id
       WHERE ms.status = 'available' AND ms.start_time > NOW() ORDER BY ms.start_time ASC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load slots'); }
});

student.post('/mentoring-slots/:id/book', async (c) => {
  try {
    const s = await authenticate(c);
    const db = getDb(c.env);
    const slot = (await db.query<any>("SELECT * FROM mentoring_slots WHERE id = $1 AND status = 'available'", [c.req.param('id')])).rows[0];
    if (!slot) return err(c, 404, 'Slot not available');
    const { rows } = await db.query<any>(
      `UPDATE mentoring_slots SET student_id = $1, status = 'booked', updated_at = NOW()
       WHERE id = $2 AND status = 'available' RETURNING *`,
      [s.userId, slot.id]
    );
    if (!rows.length) return err(c, 409, 'Slot was just taken');
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, 'New Mentoring Booking', $2, 'info', $3)`,
      [slot.instructor_id, 'A student has booked your mentoring slot.', '/instructor/mentoring']
    );
    c.executionCtx.waitUntil(sendPushToUser(c.env, slot.instructor_id, {
      title: 'New mentoring booking',
      body: 'A student booked one of your mentoring slots.',
      url: '/instructor/mentoring',
    }));
    const instructor = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [slot.instructor_id])).rows[0];
    const student = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [s.userId])).rows[0];
    const when = new Date(slot.start_time).toUTCString();
    if (instructor?.email) c.executionCtx.waitUntil(mail.mentoringBooked(c.env, instructor.email, instructor.name, when, student?.name || 'A student').catch(() => {}));
    if (student?.email) c.executionCtx.waitUntil(mail.mentoringBooked(c.env, student.email, student.name, when, instructor?.name || 'your instructor').catch(() => {}));
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to book slot'); }
});

// POST /student/mentoring-slots/:id/cancel — release a booked slot
student.post('/mentoring-slots/:id/cancel', async (c) => {
  try {
    const s = await authenticate(c);
    const db = getDb(c.env);
    const slot = (await db.query<any>('SELECT * FROM mentoring_slots WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!slot) return err(c, 404, 'Slot not found');
    if (slot.student_id !== s.userId) return err(c, 403, 'This booking is not yours');
    if (new Date(slot.start_time).getTime() < Date.now()) return err(c, 400, 'This session has already started');

    const { rows } = await db.query<any>(
      `UPDATE mentoring_slots
       SET student_id = NULL, status = 'available', updated_at = NOW()
       WHERE id = $1 AND student_id = $2 RETURNING *`,
      [slot.id, s.userId]
    );
    if (!rows.length) return err(c, 409, 'Booking could not be cancelled');

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'Mentoring booking cancelled', $2, 'info', $3)`,
      [slot.instructor_id, 'A student cancelled their mentoring booking. The slot is available again.', '/instructor/mentoring']
    );
    c.executionCtx.waitUntil(sendPushToUser(c.env, slot.instructor_id, {
      title: 'New mentoring booking',
      body: 'A student booked one of your mentoring slots.',
      url: '/instructor/mentoring',
    }));
    const instructor = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [slot.instructor_id])).rows[0];
    if (instructor?.email) {
      c.executionCtx.waitUntil(mail.mentoringBooked(c.env, instructor.email, instructor.name, `${new Date(slot.start_time).toUTCString()} (cancelled)`, 'a student').catch(() => {}));
    }
    return c.json({ success: true, message: 'Booking cancelled' });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to cancel booking'); }
});

// POST /student/mentoring-slots/:id/reschedule — request a new time
student.post('/mentoring-slots/:id/reschedule', async (c) => {
  try {
    const s = await authenticate(c);
    const db = getDb(c.env);
    const body: any = await c.req.json().catch(() => ({}));
    const slot = (await db.query<any>('SELECT * FROM mentoring_slots WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!slot) return err(c, 404, 'Slot not found');
    if (slot.student_id !== s.userId) return err(c, 403, 'This booking is not yours');
    if (slot.status !== 'booked') return err(c, 400, 'Only booked sessions can be rescheduled');
    const start = body.proposed_start_time ? new Date(body.proposed_start_time) : null;
    const end = body.proposed_end_time ? new Date(body.proposed_end_time) : null;
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return err(c, 400, 'Valid proposed start and end times are required');
    if (start.getTime() < Date.now()) return err(c, 400, 'The proposed time must be in the future');
    if (end.getTime() <= start.getTime()) return err(c, 400, 'The end time must be after the start time');

    await db.query(
      `UPDATE mentoring_slots SET
         reschedule_status = 'requested', reschedule_requested_by = $1, reschedule_reason = $2,
         proposed_start_time = $3, proposed_end_time = $4, updated_at = NOW()
       WHERE id = $5`,
      [s.userId, body.reason ? String(body.reason).slice(0, 500) : null, start.toISOString(), end.toISOString(), slot.id]
    );
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'Mentoring reschedule requested', $2, 'info', '/instructor/mentoring')`,
      [slot.instructor_id, `A student requested a new time for "${slot.title}".`]
    );
    c.executionCtx.waitUntil(sendPushToUser(c.env, slot.instructor_id, {
      title: 'Mentoring reschedule requested',
      body: `A student proposed a new time for "${slot.title}".`,
      url: '/instructor/mentoring',
    }));
    const instructor = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [slot.instructor_id])).rows[0];
    if (instructor?.email) {
      c.executionCtx.waitUntil(mail.mentoringBooked(c.env, instructor.email, instructor.name, `${start.toUTCString()} (reschedule requested)`, 'a student').catch(() => {}));
    }
    return c.json({ success: true, message: 'Reschedule requested' });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to request reschedule'); }
});

student.get('/my-mentoring-slots', async (c) => {
  try {
    const s = await authenticate(c);
    c.executionCtx.waitUntil(sendMentoringReminders(c.env, s.userId));
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ms.*, u.name as instructor_name, u.avatar as instructor_avatar, c.title as course_title
       FROM mentoring_slots ms LEFT JOIN courses c ON ms.course_id = c.id
       LEFT JOIN users u ON ms.instructor_id = u.id
       WHERE ms.student_id = $1 ORDER BY ms.start_time DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load bookings'); }
});

// ── Completed events / study plans / tickets alias ────────────────────────
student.post('/completed-events/toggle', async (c) => {
  try {
    const s = await authenticate(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.event_id) return err(c, 400, 'event_id is required');
    const db = getDb(c.env);
    const existing = await db.query<any>('SELECT id FROM completed_events WHERE user_id = $1 AND event_id = $2', [s.userId, body.event_id]);
    if (existing.rows.length) {
      await db.query('DELETE FROM completed_events WHERE user_id = $1 AND event_id = $2', [s.userId, body.event_id]);
      return c.json({ success: true, completed: false });
    }
    await db.query('INSERT INTO completed_events (user_id, event_id, event_type) VALUES ($1, $2, $3)', [s.userId, body.event_id, body.event_type || 'event']);
    return c.json({ success: true, completed: true });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to update event'); }
});

student.get('/completed-events', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT event_id, event_type, completed_at FROM completed_events WHERE user_id = $1',
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load events'); }
});

student.get('/study-plans', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM study_plans WHERE student_id = $1 ORDER BY week_start DESC LIMIT 12',
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load study plans'); }
});

student.post('/study-plans', async (c) => {
  try {
    const s = await authenticate(c);
    const body: any = await c.req.json().catch(() => ({}));
    const start = body.week_start || (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })();
    const end = body.week_end || (() => { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay())); return d.toISOString().split('T')[0]; })();
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO study_plans (student_id, week_start, week_end, goal_hours, goal_topics, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (student_id, week_start)
       DO UPDATE SET goal_hours = $4, goal_topics = $5, notes = $6, updated_at = NOW()
       RETURNING *`,
      [s.userId, start, end, body.goal_hours || 5, JSON.stringify(body.goal_topics || []), body.notes || null]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to save study plan'); }
});

student.delete('/study-plans/:id', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM study_plans WHERE id = $1 AND student_id = $2 RETURNING id',
      [c.req.param('id'), s.userId]
    );
    if (!rows.length) return err(c, 404, 'Study plan not found');
    return c.json({ success: true, message: 'Study plan deleted' });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to delete study plan'); }
});

// Frontend compatibility: Tickets page calls /student/tickets.
student.get('/tickets', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load tickets'); }
});

student.post('/tickets', async (c) => {
  try {
    const s = await authenticate(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.subject || !body.message) return err(c, 400, 'subject and message are required');
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO support_tickets (user_id, subject, message, category, priority, status)
       VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
      [s.userId, body.subject, body.message, body.category || 'general', body.priority || 'medium']
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to create ticket'); }
});

export default student;

