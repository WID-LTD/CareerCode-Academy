import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { authenticate } from '../auth-helpers';

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

export default student;
