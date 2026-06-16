import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { io } from '../config/socket';

const router = Router();

router.use(authenticate);

function computeBadges(userId: string, stats: any, enrollCount: number, lessonCount: number, completedCourses: number, certCount: number, streak: number) {
  const badges: any[] = [];

  if (enrollCount >= 1) badges.push({ id: 'first-course', name: 'First Course', description: 'Enrolled in your first course', icon: 'book', earned: true, earned_at: new Date().toISOString() });
  if (lessonCount >= 5) badges.push({ id: 'quick-learner', name: 'Quick Learner', description: 'Completed 5 lessons', icon: 'zap', earned: true, earned_at: new Date().toISOString() });
  if (lessonCount >= 25) badges.push({ id: 'dedicated', name: 'Dedicated', description: 'Completed 25 lessons', icon: 'target', earned: true, earned_at: new Date().toISOString() });
  if (lessonCount >= 100) badges.push({ id: 'scholar', name: 'Scholar', description: 'Completed 100 lessons', icon: 'award', earned: true, earned_at: new Date().toISOString() });
  if (completedCourses >= 1) badges.push({ id: 'graduate', name: 'Course Graduate', description: 'Completed your first course', icon: 'graduation-cap', earned: true, earned_at: new Date().toISOString() });
  if (completedCourses >= 3) badges.push({ id: 'knowledge-seeker', name: 'Knowledge Seeker', description: 'Completed 3 courses', icon: 'book-open', earned: true, earned_at: new Date().toISOString() });
  if (certCount >= 1) badges.push({ id: 'certified', name: 'Certified', description: 'Earned your first certificate', icon: 'certificate', earned: true, earned_at: new Date().toISOString() });
  if (streak >= 7) badges.push({ id: 'week-warrior', name: 'Week Warrior', description: 'Maintained a 7-day streak', icon: 'flame', earned: true, earned_at: new Date().toISOString() });
  if (streak >= 30) badges.push({ id: 'iron-will', name: 'Iron Will', description: 'Maintained a 30-day streak', icon: 'shield', earned: true, earned_at: new Date().toISOString() });
  if (enrollCount >= 5) badges.push({ id: 'explorer', name: 'Explorer', description: 'Enrolled in 5 courses', icon: 'compass', earned: true, earned_at: new Date().toISOString() });

  // Locked badges (not yet earned)
  if (lessonCount < 5) badges.push({ id: 'quick-learner', name: 'Quick Learner', description: 'Complete 5 lessons', icon: 'zap', earned: false, progress: Math.round((lessonCount / 5) * 100) });
  if (lessonCount < 25) badges.push({ id: 'dedicated', name: 'Dedicated', description: 'Complete 25 lessons', icon: 'target', earned: false, progress: Math.round((lessonCount / 25) * 100) });
  if (lessonCount < 100) badges.push({ id: 'scholar', name: 'Scholar', description: 'Complete 100 lessons', icon: 'award', earned: false, progress: Math.round((lessonCount / 100) * 100) });
  if (completedCourses < 1) badges.push({ id: 'graduate', name: 'Course Graduate', description: 'Complete your first course', icon: 'graduation-cap', earned: false });
  if (completedCourses < 3) badges.push({ id: 'knowledge-seeker', name: 'Knowledge Seeker', description: 'Complete 3 courses', icon: 'book-open', earned: false, progress: Math.round((completedCourses / 3) * 100) });
  if (certCount < 1) badges.push({ id: 'certified', name: 'Certified', description: 'Earn your first certificate', icon: 'certificate', earned: false });
  if (streak < 7) badges.push({ id: 'week-warrior', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', earned: false, progress: Math.round((streak / 7) * 100) });
  if (streak < 30) badges.push({ id: 'iron-will', name: 'Iron Will', description: 'Maintain a 30-day streak', icon: 'shield', earned: false, progress: Math.round((streak / 30) * 100) });
  if (enrollCount < 5) badges.push({ id: 'explorer', name: 'Explorer', description: 'Enroll in 5 courses', icon: 'compass', earned: false, progress: Math.round((enrollCount / 5) * 100) });

  return badges;
}

async function computeAnalytics(userId: string) {
  // Weekly activity - lessons completed per day of current week
  const weeklyRes = await query(`
    SELECT TO_CHAR(completed_at, 'Dy') as day, COUNT(*)::int as hours
    FROM lesson_progress
    WHERE user_id = $1 AND completed = true
      AND completed_at >= date_trunc('week', NOW())
    GROUP BY TO_CHAR(completed_at, 'Dy')
    ORDER BY MIN(completed_at)
  `, [userId]);

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyMap = new Map(weeklyRes.rows.map((r: any) => [r.day, r.hours]));
  const weeklyActivity = dayOrder.map(day => ({ day, hours: weeklyMap.get(day) || 0 }));

  // Monthly learning - lessons completed per month this year
  const monthlyRes = await query(`
    SELECT TO_CHAR(completed_at, 'Mon') as month, COUNT(*)::int as hours
    FROM lesson_progress
    WHERE user_id = $1 AND completed = true
      AND completed_at >= date_trunc('year', NOW())
    GROUP BY TO_CHAR(completed_at, 'Mon'), EXTRACT(MONTH FROM completed_at)
    ORDER BY EXTRACT(MONTH FROM completed_at)
  `, [userId]);

  const monthlyLearning = monthlyRes.rows.map((r: any) => ({ month: r.month, hours: r.hours }));

  // Skill growth - progress by course category
  const skillRes = await query(`
    SELECT c.category as skill,
      ROUND(AVG(e.progress))::int as current,
      GREATEST(0, ROUND(AVG(e.progress))::int - 15) as previous
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = $1
    GROUP BY c.category
    ORDER BY current DESC
    LIMIT 6
  `, [userId]);

  const skillGrowth = skillRes.rows.map((r: any) => ({
    skill: r.skill,
    current: r.current,
    previous: r.previous,
  }));

  return { weeklyActivity, monthlyLearning, skillGrowth };
}

async function computeStreak(userId: string): Promise<number> {
  const { rows } = await query(`
    SELECT DISTINCT DATE(completed_at) as day
    FROM lesson_progress
    WHERE user_id = $1 AND completed = true
    ORDER BY day DESC
  `, [userId]);

  if (rows.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(rows[0].day);
  firstDay.setHours(0, 0, 0, 0);

  // If most recent activity is not today or yesterday, streak is 0
  const diffMs = today.getTime() - firstDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].day);
    const curr = new Date(rows[i].day);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function computeRank(userId: string): Promise<number> {
  const { rows } = await query(`
    SELECT id, (
      COALESCE((SELECT SUM(jsonb_array_length(completed_lessons)) FROM enrollments WHERE user_id = u.id), 0) * 10 +
      COALESCE((SELECT COUNT(*) FROM certificates WHERE user_id = u.id), 0) * 100
    ) as xp
    FROM users u
    WHERE u.role = 'student'
    ORDER BY xp DESC
  `);

  const rank = rows.findIndex((r: any) => r.id === userId) + 1;
  return rank > 0 ? rank : rows.length;
}

// GET /student/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const [statsRes, coursesRes, activityRes, assignmentsRes, recommendedRes, xpRes] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1) AS enrolled_courses,
          (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1 AND completed = true) AS completed_courses,
          COALESCE((SELECT SUM(jsonb_array_length(completed_lessons))::int FROM enrollments WHERE user_id = $1), 0) AS completed_lessons,
          COALESCE((SELECT COUNT(*)::int FROM certificates WHERE user_id = $1), 0) AS certificates,
          COALESCE((SELECT ROUND(AVG(progress))::int FROM enrollments WHERE user_id = $1), 0) AS average_progress
      `, [userId]),

      query(`
        SELECT e.id, c.id as course_id, c.title, c.slug, c.thumbnail, c.duration,
          e.progress, u.name as instructor_name, e.enrolled_at
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        JOIN users u ON u.id = c.instructor_id
        WHERE e.user_id = $1
        ORDER BY e.enrolled_at DESC
        LIMIT 10
      `, [userId]),

      query(`
        SELECT * FROM (
          SELECT 'enrollment' as type, c.title as course_title, e.enrolled_at as created_at
          FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = $1
          UNION ALL
          SELECT 'lesson' as type, c.title as course_title, lp.completed_at as created_at
          FROM lesson_progress lp
          JOIN lessons l ON l.id = lp.lesson_id
          JOIN modules m ON m.id = l.module_id
          JOIN courses c ON c.id = m.course_id
          WHERE lp.user_id = $1 AND lp.completed = true
          UNION ALL
          SELECT 'certificate' as type, c.title as course_title, cert.issued_at as created_at
          FROM certificates cert JOIN courses c ON c.id = cert.course_id WHERE cert.user_id = $1
        ) activity
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]),

      query(`
        SELECT a.id, a.title, a.due_date, a.max_score, c.title as course_title, 'medium' as priority, 'pending' as status
        FROM assignments a
        JOIN courses c ON c.id = a.course_id
        WHERE a.due_date >= NOW() AND a.course_id IN (
          SELECT course_id FROM enrollments WHERE user_id = $1
        )
        ORDER BY a.due_date ASC
        LIMIT 10
      `, [userId]),

      query(`
        SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level as difficulty,
          COALESCE(AVG(r.rating), 0) as rating,
          COUNT(DISTINCT e.id)::int as student_count,
          c.category, u.name as instructor_name
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        LEFT JOIN reviews r ON r.course_id = c.id
        LEFT JOIN enrollments e ON e.course_id = c.id
        WHERE c.status = 'published'
          AND c.id NOT IN (SELECT course_id FROM enrollments WHERE user_id = $1)
        GROUP BY c.id, u.name
        ORDER BY rating DESC, student_count DESC
        LIMIT 6
      `, [userId]),

      // XP calculation
      query(`
        SELECT
          COALESCE((SELECT SUM(jsonb_array_length(completed_lessons)) FROM enrollments WHERE user_id = $1), 0) * 10 +
          COALESCE((SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND completed = true), 0) * 50 +
          COALESCE((SELECT COUNT(*) FROM certificates WHERE user_id = $1), 0) * 100
        AS xp_points
      `, [userId]),
    ]);

    const stats = statsRes.rows[0];
    const xpPoints = Number(xpRes.rows[0]?.xp_points) || 0;
    const level = Math.floor(xpPoints / 500) + 1;

    const [streak, analytics, rank] = await Promise.all([
      computeStreak(userId),
      computeAnalytics(userId),
      computeRank(userId),
    ]);

    const recentCourses = coursesRes.rows.map((c: any) => ({
      id: c.course_id,
      title: c.title,
      slug: c.slug,
      thumbnail: c.thumbnail,
      duration: c.duration,
      progress: c.progress,
      instructor_name: c.instructor_name,
      enrolled_at: c.enrolled_at,
    }));

    const recentActivity = activityRes.rows.map((a: any) => ({
      type: a.type,
      course_title: a.course_title,
      created_at: a.created_at,
    }));

    const upcomingAssignments = assignmentsRes.rows.map((a: any) => ({
      id: a.id,
      title: a.title,
      due_date: a.due_date,
      max_score: a.max_score,
      course_title: a.course_title,
      priority: a.priority || 'medium',
      status: a.status,
    }));

    const recommendedCourses = recommendedRes.rows.map((c: any) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      thumbnail: c.thumbnail,
      duration: c.duration,
      difficulty: c.difficulty,
      rating: Number(c.rating) || 0,
      studentCount: Number(c.student_count) || 0,
      category: c.category,
      instructor_name: c.instructor_name,
    }));

    const enrolledCourses = Number(stats.enrolled_courses) || 0;
    const completedLessons = Number(stats.completed_lessons) || 0;
    const completedCourses = Number(stats.completed_courses) || 0;
    const certificatesCount = Number(stats.certificates) || 0;

    const badges = computeBadges(userId, stats, enrolledCourses, completedLessons, completedCourses, certificatesCount, streak);

    const totalLearningHours = Math.round(completedLessons * 0.5);

    res.json({
      success: true,
      data: {
        stats: {
          enrolledCourses,
          completedCourses,
          completedLessons,
          certificates: certificatesCount,
          averageProgress: Number(stats.average_progress) || 0,
          totalLearningHours,
          currentStreak: streak,
          xpPoints,
          level,
          rank,
        },
        recentCourses,
        recentActivity,
        upcomingAssignments,
        recommendedCourses,
        badges,
        analytics,
      },
    });
  } catch (error) { next(error); }
});

// GET /student/analytics
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await computeAnalytics(req.user!.userId);
    res.json({ success: true, data: analytics });
  } catch (error) { next(error); }
});

// GET /student/badges
router.get('/badges', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1) AS enrolled,
        COALESCE((SELECT SUM(jsonb_array_length(completed_lessons))::int FROM enrollments WHERE user_id = $1), 0) AS lessons,
        (SELECT COUNT(*)::int FROM enrollments WHERE user_id = $1 AND completed = true) AS completed_courses,
        (SELECT COUNT(*)::int FROM certificates WHERE user_id = $1) AS certs
    `, [userId]);

    const r = rows[0];
    const streak = await computeStreak(userId);
    const badges = computeBadges(userId, r, Number(r.enrolled) || 0, Number(r.lessons) || 0, Number(r.completed_courses) || 0, Number(r.certs) || 0, streak);
    res.json({ success: true, data: badges });
  } catch (error) { next(error); }
});

// GET /student/leaderboard
router.get('/leaderboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(`
      SELECT u.id, u.name, u.avatar,
        (
          COALESCE((SELECT SUM(jsonb_array_length(completed_lessons)) FROM enrollments WHERE user_id = u.id), 0) * 10 +
          COALESCE((SELECT COUNT(*) FROM certificates WHERE user_id = u.id), 0) * 100
        ) as xp_points,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_count
      FROM users u
      WHERE u.role = 'student'
      ORDER BY xp_points DESC
      LIMIT 50
    `);

    const leaderboard = rows.map((r: any, i: number) => ({
      userId: r.id,
      name: r.name,
      avatar: r.avatar,
      xpPoints: Number(r.xp_points) || 0,
      badges: Number(r.badges_count) || 0,
      rank: i + 1,
      rankChange: 0,
      isCurrentUser: r.id === userId,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) { next(error); }
});

// GET /student/calendar
router.get('/calendar', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const [assignmentsRes, liveClassesRes, quizzesRes] = await Promise.all([
      query(`
        SELECT a.id, a.title, a.due_date as date, c.title as course_title, 'assignment' as type
        FROM assignments a
        JOIN courses c ON c.id = a.course_id
        WHERE a.due_date >= NOW() AND a.course_id IN (
          SELECT course_id FROM enrollments WHERE user_id = $1
        )
        ORDER BY a.due_date ASC
        LIMIT 20
      `, [userId]),
      query(`
        SELECT lc.id, lc.title, lc.scheduled_at as date, c.title as course_title, 'live-class' as type
        FROM live_classes lc
        JOIN courses c ON c.id = lc.course_id
        WHERE lc.scheduled_at >= NOW() AND lc.course_id IN (
          SELECT course_id FROM enrollments WHERE user_id = $1
        )
        ORDER BY lc.scheduled_at ASC
        LIMIT 20
      `, [userId]),
      query(`
        SELECT q.id, q.title, q.due_date as date, c.title as course_title, 'quiz' as type
        FROM quizzes q
        JOIN courses c ON c.id = q.course_id
        WHERE q.due_date IS NOT NULL AND q.due_date >= NOW() AND q.course_id IN (
          SELECT course_id FROM enrollments WHERE user_id = $1
        )
        ORDER BY q.due_date ASC
        LIMIT 20
      `, [userId]),
    ]);

    const events = [
      ...assignmentsRes.rows.map((r: any) => ({ ...r, time: new Date(r.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) })),
      ...liveClassesRes.rows.map((r: any) => ({ ...r, time: new Date(r.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) })),
      ...quizzesRes.rows.map((r: any) => ({ ...r, time: new Date(r.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) })),
    ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ success: true, data: events });
  } catch (error) { next(error); }
});

// GET /student/recommended
router.get('/recommended', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(`
      SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level as difficulty,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT e.id)::int as student_count,
        c.category, u.name as instructor_name
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      LEFT JOIN reviews r ON r.course_id = c.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      WHERE c.status = 'published'
        AND c.id NOT IN (SELECT course_id FROM enrollments WHERE user_id = $1)
      GROUP BY c.id, u.name
      ORDER BY rating DESC, student_count DESC
      LIMIT 6
    `, [userId]);

    const recommendedCourses = rows.map((c: any) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      thumbnail: c.thumbnail,
      duration: c.duration,
      difficulty: c.difficulty,
      rating: Number(c.rating) || 0,
      studentCount: Number(c.student_count) || 0,
      category: c.category,
      instructor_name: c.instructor_name,
    }));

    res.json({ success: true, data: recommendedCourses });
  } catch (error) { next(error); }
});

// GET /student/assignments
router.get('/assignments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(`
      SELECT a.id, a.title, a.description, a.due_date, a.max_score, a.course_id,
        c.title as course, c.slug as course_slug,
        COALESCE(s.status, 'not-started') as status,
        s.grade, s.feedback
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
      WHERE a.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)
      ORDER BY a.due_date ASC
    `, [userId]);

    const assignments = rows.map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      course: a.course,
      course_slug: a.course_slug,
      due: a.due_date,
      status: a.status,
      grade: a.grade,
      feedback: a.feedback,
      max_score: a.max_score,
    }));

    res.json({ success: true, data: assignments });
  } catch (error) { next(error); }
});

// GET /student/challenges - all coding challenges for enrolled courses
router.get('/challenges', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(`
      SELECT cc.*, l.title as lesson_title, c.title as course_title, c.slug as course_slug,
        cs.id as submission_id, cs.code as submission_code, cs.passed as submission_passed,
        cs.score as submission_score, cs.feedback as submission_feedback, cs.submitted_at as submission_at
      FROM coding_challenges cc
      JOIN lessons l ON cc.lesson_id = l.id
      JOIN courses c ON l.course_id = c.id
      JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
      LEFT JOIN LATERAL (
        SELECT * FROM challenge_submissions
        WHERE challenge_id = cc.id AND user_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1
      ) cs ON true
      ORDER BY cc.created_at DESC
    `, [userId]);

    const challenges = rows.map((r: any) => ({
      id: r.id,
      lesson_id: r.lesson_id,
      title: r.title,
      description: r.description,
      instructions: r.instructions,
      starter_code: r.starter_code,
      test_code: r.test_code,
      language: r.language,
      difficulty: r.difficulty,
      lesson_title: r.lesson_title,
      course_title: r.course_title,
      course_slug: r.course_slug,
      submission: r.submission_id ? {
        id: r.submission_id,
        code: r.submission_code,
        passed: r.submission_passed,
        score: r.submission_score,
        feedback: r.submission_feedback,
        submitted_at: r.submission_at,
      } : null,
    }));

    res.json({ success: true, data: challenges });
  } catch (error) { next(error); }
});

// Messages routes
router.get('/messages/conversations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(`
      SELECT
        u.id, u.name, u.avatar, u.role,
        COALESCE(SUM(CASE WHEN dm.is_read = false AND dm.receiver_id = $1 THEN 1 ELSE 0 END), 0)::int AS unread_count,
        (SELECT content FROM direct_messages
         WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id)
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM direct_messages
         WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id)
         ORDER BY created_at DESC LIMIT 1) AS last_message_at
      FROM users u
      JOIN direct_messages dm ON (dm.sender_id = u.id OR dm.receiver_id = u.id)
      WHERE (dm.sender_id = $1 OR dm.receiver_id = $1) AND u.id != $1
      GROUP BY u.id, u.name, u.avatar, u.role
      ORDER BY last_message_at DESC NULLS LAST
    `, [userId]);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.get('/messages/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { userId: otherUserId } = req.params;
    const { rows } = await query(
      `SELECT * FROM direct_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, otherUserId]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

router.post('/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!.userId;
    const { receiver_id, content } = req.body;
    if (!receiver_id || !content) {
      return res.status(400).json({ success: false, message: 'receiver_id and content are required' });
    }
    const { rows } = await query(
      `INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [senderId, receiver_id, content]
    );
    const newMessage = rows[0];
    io.to(receiver_id).emit('receive_message', newMessage);
    res.json({ success: true, data: newMessage });
  } catch (error) { next(error); }
});

router.put('/messages/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { senderId } = req.body;
    const { rowCount } = await query(
      `UPDATE direct_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [senderId, userId]
    );
    res.json({ success: true, updated: rowCount });
  } catch (error) { next(error); }
});

router.delete('/messages/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { rowCount } = await query(
      `DELETE FROM direct_messages WHERE id = $1 AND sender_id = $2`,
      [id, userId]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Message not found or not yours' });
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) { next(error); }
});

router.put('/messages/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rowCount } = await query(
      `UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND is_read = false`,
      [userId]
    );
    res.json({ success: true, updated: rowCount });
  } catch (error) { next(error); }
});

export default router;
