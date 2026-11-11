// Port of backend/src/routes/instructor.routes.ts (38 endpoints).
//
// Mount as `/api/v1/instructor` (see workers/src/index.ts TODO — this file
// intentionally does not edit the router). Every handler mirrors the Express
// `authenticate + authorize('instructor', 'admin', 'super_admin')` guard with
// requireRole(STAFF_ROLES) and keeps the original response shapes/statuses.
//
// Intentional differences:
//   • socket.io emits dropped (Cloudflare Workers have no long-lived socket).
//   • multer uploads skipped — attachment/file URLs come in as JSON fields.
//   • Postgres-only constructs rewritten for sql-compat:
//       - `= ANY($n::uuid[])` -> JS-built IN (...)
//       - `generate_series` engagement CTE -> JS month aggregation
//       - `DATE_TRUNC(...) = DATE_TRUNC('month', NOW())` -> half-open range
//   • `rowCount` -> `RETURNING id` + rows.length (DbClient exposes only rows).

import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, pageParams, requireRole, statusOf } from '../route-utils';
import { sendMentoringReminders } from '../mentoring-reminders';
import { sendPushToUser } from '../push';
import { mail } from '../email';
import {
  STAFF_ROLES,
  createNotification,
  expandRecurringEvents,
  getEnrollmentsByCourse,
  getInstructorUser,
  monthEndIso,
  monthIso,
  monthKey,
  monthsBack,
  sendMail,
  updateInstructorUser,
} from '../instructor';

const instructor = new Hono<{ Bindings: Env }>();

const countOf = (value: any) => parseInt(String(value ?? 0), 10);
const numOf = (value: any) => parseFloat(String(value ?? 0));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ----------------------------------------------------------------------
// PROGRAMS
// ----------------------------------------------------------------------
// GET /instructor/programs — programs that contain courses owned by the instructor
instructor.get('/programs', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT
         p.id,
         p.name as title,
         p.slug,
         s.name as school,
         COUNT(DISTINCT c.id)::int as "courseCount",
         COUNT(DISTINCT e.user_id)::int as "studentCount"
       FROM programs p
       JOIN schools s ON s.id = p.school_id
       JOIN courses c ON c.instructor_id = $1
         AND (c.program_id = p.id OR EXISTS(
               SELECT 1 FROM program_courses pc WHERE pc.program_id = p.id AND pc.course_id = c.id))
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY p.id, p.name, p.slug, s.name
       ORDER BY p.name ASC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load programs');
  }
});

// ----------------------------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------------------------
instructor.get('/dashboard/stats', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const instructorId = s.userId;

    // Course counts
    const coursesRes = await db.query<any>('SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1', [instructorId]);
    const totalCourses = countOf(coursesRes.rows[0]?.count);
    const publishedCoursesRes = await db.query<any>(
      'SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1 AND published = true',
      [instructorId]
    );
    const publishedCourses = countOf(publishedCoursesRes.rows[0]?.count);
    const draftCourses = Math.max(totalCourses - publishedCourses, 0);

    // Total students enrolled in instructor's courses
    const studentsRes = await db.query<any>(
      `SELECT COUNT(DISTINCT e.user_id) as count
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = $1`,
      [instructorId]
    );
    const totalStudents = countOf(studentsRes.rows[0]?.count);

    // Active students (lesson progress activity in the last 30 days)
    const activeStudentsRes = await db.query<any>(
      `SELECT COUNT(DISTINCT lp.user_id) as count
       FROM lesson_progress lp
       JOIN courses c ON lp.course_id = c.id
       WHERE c.instructor_id = $1 AND lp.updated_at > NOW() - INTERVAL '30 days'`,
      [instructorId]
    );
    const activeStudents = countOf(activeStudentsRes.rows[0]?.count);

    // Average completion rate across enrollments (0-100)
    const completionRes = await db.query<any>(
      `SELECT COALESCE(AVG(e.progress), 0) as avg
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = $1`,
      [instructorId]
    );
    const completionRate = Math.round(numOf(completionRes.rows[0]?.avg));

    // Certificates issued on instructor's courses
    const certificatesRes = await db.query<any>(
      `SELECT COUNT(*) as count
       FROM certificates cert
       JOIN courses c ON cert.course_id = c.id
       WHERE c.instructor_id = $1`,
      [instructorId]
    );
    const certificatesIssued = countOf(certificatesRes.rows[0]?.count);

    // Total watch time (seconds) across instructor's courses
    const watchTimeRes = await db.query<any>(
      `SELECT COALESCE(SUM(lp.watch_position), 0) as total
       FROM lesson_progress lp
       JOIN courses c ON lp.course_id = c.id
       WHERE c.instructor_id = $1`,
      [instructorId]
    );
    const totalWatchTime = numOf(watchTimeRes.rows[0]?.total);

    // Total revenue
    const revenueRes = await db.query<any>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM instructor_revenue
       WHERE instructor_id = $1 AND status = 'completed'`,
      [instructorId]
    );
    const totalRevenue = numOf(revenueRes.rows[0]?.total);

    // Revenue this calendar month (stat card value)
    const monthlyRevenueRes = await db.query<any>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM instructor_revenue
       WHERE instructor_id = $1 AND status = 'completed'
         AND created_at >= DATE_TRUNC('month', NOW())
         AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`,
      [instructorId]
    );
    const monthlyRevenue = numOf(monthlyRevenueRes.rows[0]?.total);

    // Average rating
    const ratingRes = await db.query<any>(
      `SELECT COALESCE(AVG(r.rating), 0) as avg
       FROM reviews r
       JOIN courses c ON r.course_id = c.id
       WHERE c.instructor_id = $1`,
      [instructorId]
    );
    const averageRating = numOf(ratingRes.rows[0]?.avg).toFixed(1);

    // Pending reviews (reviews awaiting an instructor reply)
    const pendingReviewsRes = await db.query<any>(
      `SELECT COUNT(*) as count
       FROM reviews r
       JOIN courses c ON r.course_id = c.id
       WHERE c.instructor_id = $1 AND COALESCE(r.replied, false) = false`,
      [instructorId]
    );
    const pendingReviews = countOf(pendingReviewsRes.rows[0]?.count);

    // Unread messages
    const unreadMessagesRes = await db.query<any>(
      `SELECT COUNT(*) as count
       FROM direct_messages
       WHERE receiver_id = $1 AND is_read = false`,
      [instructorId]
    );
    const unreadMessages = countOf(unreadMessagesRes.rows[0]?.count);

    // Upcoming live sessions
    const upcomingLiveSessionsRes = await db.query<any>(
      `SELECT COUNT(*) as count
       FROM live_classes
       WHERE instructor_id = $1 AND start_time > NOW()`,
      [instructorId]
    );
    const upcomingLiveSessions = countOf(upcomingLiveSessionsRes.rows[0]?.count);

    // Assignments to grade (ungraded submissions)
    const assignmentsToGradeRes = await db.query<any>(
      `SELECT COUNT(*) as count
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = $1 AND s.score IS NULL`,
      [instructorId]
    );
    const assignmentsToGrade = countOf(assignmentsToGradeRes.rows[0]?.count);

    // Course-level enrollment trend (last 6 months)
    const enrollmentTrendRes = await db.query<any>(
      `SELECT
         DATE_TRUNC('month', e.enrolled_at)::date as month,
         COUNT(*) as enrollments
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = $1 AND e.enrolled_at > NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', e.enrolled_at)
       ORDER BY month ASC`,
      [instructorId]
    );

    // Monthly revenue (last 6 months)
    const monthlyRevenueTrendRes = await db.query<any>(
      `SELECT
         DATE_TRUNC('month', created_at)::date as month,
         COALESCE(SUM(amount), 0) as revenue
       FROM instructor_revenue
       WHERE instructor_id = $1 AND status = 'completed' AND created_at > NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      [instructorId]
    );

    // Student engagement (last 6 months): active = distinct students with lesson
    // activity that month; inactive = enrolled-by-month-end students without it.
    // The Express query used generate_series + CTEs; those are materialised here.
    const [activeRes, activeUsersRes, enrolledRes] = await Promise.all([
      db.query<any>(
        `SELECT DISTINCT lp.user_id, DATE_TRUNC('month', lp.updated_at)::date as m
         FROM lesson_progress lp
         JOIN courses c ON lp.course_id = c.id
         WHERE c.instructor_id = $1 AND lp.updated_at > NOW() - INTERVAL '6 months'`,
        [instructorId]
      ),
      db.query<any>(
        `SELECT DISTINCT lp.user_id, DATE_TRUNC('month', lp.updated_at)::date as m
         FROM lesson_progress lp
         JOIN courses c ON lp.course_id = c.id
         WHERE c.instructor_id = $1`,
        [instructorId]
      ),
      db.query<any>(
        `SELECT DISTINCT e.user_id, e.enrolled_at
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE c.instructor_id = $1`,
        [instructorId]
      ),
    ]);

    const activeByMonth = new Map<string, Set<string>>();
    for (const row of activeRes.rows) {
      const key = monthKey(row.m);
      if (!activeByMonth.has(key)) activeByMonth.set(key, new Set());
      activeByMonth.get(key)!.add(String(row.user_id));
    }
    const activeUserMonths = new Set<string>();
    for (const row of activeUsersRes.rows) {
      activeUserMonths.add(`${row.user_id}|${monthKey(row.m)}`);
    }
    const engagementData = monthsBack(6).map((key) => {
      const end = new Date(monthEndIso(key)).getTime();
      const inactiveUsers = new Set<string>();
      for (const row of enrolledRes.rows) {
        if (new Date(row.enrolled_at).getTime() < end && !activeUserMonths.has(`${row.user_id}|${key}`)) {
          inactiveUsers.add(String(row.user_id));
        }
      }
      return {
        month: monthIso(key),
        active: activeByMonth.get(key)?.size || 0,
        inactive: inactiveUsers.size,
      };
    });

    // Top courses
    const topCoursesRes = await db.query<any>(
      `SELECT c.id,
              c.title,
              c.slug,
              c.published,
              COUNT(DISTINCT e.user_id) as students,
              COALESCE(AVG(r.rating), 0) as rating,
              COALESCE((SELECT SUM(ir.amount) FROM instructor_revenue ir WHERE ir.course_id = c.id AND ir.status = 'completed'), 0) as revenue
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       LEFT JOIN reviews r ON c.id = r.course_id
       WHERE c.instructor_id = $1
       GROUP BY c.id, c.title
       ORDER BY students DESC
       LIMIT 5`,
      [instructorId]
    );

    // Recent activity (enrollments, submissions, reviews)
    const recentActivityRes = await db.query<any>(
      `SELECT * FROM (
         SELECT 'enrollment' as type, c.title as details, e.enrolled_at as time
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE c.instructor_id = $1
         UNION ALL
         SELECT 'submission' as type, a.title as details, s.submitted_at as time
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE c.instructor_id = $1
         UNION ALL
         SELECT 'review' as type, c.title as details, r.created_at as time
         FROM reviews r
         JOIN courses c ON r.course_id = c.id
         WHERE c.instructor_id = $1
       ) activity ORDER BY time DESC LIMIT 10`,
      [instructorId]
    );

    return c.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          activeStudents,
          totalCourses,
          publishedCourses,
          draftCourses,
          completionRate,
          averageRating,
          certificatesIssued,
          totalWatchTime,
          monthlyRevenue,
          totalRevenue,
          pendingReviews,
          unreadMessages,
          upcomingLiveSessions,
          assignmentsToGrade,
        },
        topCourses: topCoursesRes.rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          published: row.published,
          students: countOf(row.students),
          rating: numOf(row.rating).toFixed(1),
          revenue: numOf(row.revenue),
        })),
        recentActivity: recentActivityRes.rows.map((row: any) => ({
          action: row.type === 'enrollment' ? 'New enrollment'
            : row.type === 'submission' ? 'Assignment submitted'
            : row.type === 'review' ? 'New review'
            : row.type,
          details: row.details,
          time: row.time,
          type: row.type,
        })),
        enrollmentTrend: enrollmentTrendRes.rows.map((row: any) => ({
          month: row.month,
          enrollments: countOf(row.enrollments),
        })),
        monthlyRevenue: monthlyRevenueTrendRes.rows.map((row: any) => ({
          month: row.month,
          revenue: numOf(row.revenue),
        })),
        engagementData,
        coursePerformance: topCoursesRes.rows.map((row: any) => ({
          course: row.title,
          students: countOf(row.students),
          rating: numOf(row.rating).toFixed(1),
          revenue: numOf(row.revenue),
        })),
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load dashboard stats');
  }
});

// ----------------------------------------------------------------------
// COURSE PROPOSALS
// ----------------------------------------------------------------------
instructor.get('/course-proposals', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { page, limit, offset } = pageParams(c, 20);
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      'SELECT * FROM course_proposals WHERE instructor_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [s.userId, limit, offset]
    );
    // Postgres names an unaliased COUNT(*) "count"; SQLite does not — alias it.
    const countRes = await db.query<any>('SELECT COUNT(*) as count FROM course_proposals WHERE instructor_id = $1', [s.userId]);
    const total = countOf(countRes.rows[0]?.count);

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load course proposals');
  }
});

instructor.post('/course-proposals', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const {
      title, category, level, description, learning_outcomes, prerequisites,
      duration, lesson_count, teaching_format, technologies, projects,
      recommended_price, thumbnail_url, notes,
    } = body;

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO course_proposals (
        instructor_id, title, category, level, description, learning_outcomes,
        prerequisites, duration, lesson_count, teaching_format, technologies,
        projects, recommended_price, thumbnail_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        s.userId, title, category, level, description, learning_outcomes,
        prerequisites, duration || 0, lesson_count || 0, teaching_format, technologies,
        projects, recommended_price || 0, thumbnail_url, notes,
      ]
    );

    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create course proposal');
  }
});

// ----------------------------------------------------------------------
// ANALYTICS
// ----------------------------------------------------------------------
instructor.get('/analytics', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const instructorId = s.userId;

    // Total Courses
    const coursesRes = await db.query<any>('SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1', [instructorId]);
    const totalCourses = countOf(coursesRes.rows[0]?.count);

    // Total Students across all their courses
    const studentsRes = await db.query<any>(
      `SELECT COUNT(DISTINCT e.user_id) as count
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = $1`,
      [instructorId]
    );
    const totalStudents = countOf(studentsRes.rows[0]?.count);

    // Total Revenue (assuming 100% goes to instructor for simplicity, or 70% share)
    const revenueRes = await db.query<any>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM instructor_revenue
       WHERE instructor_id = $1 AND status = 'completed'`,
      [instructorId]
    );
    const totalRevenue = numOf(revenueRes.rows[0]?.total);

    // Monthly revenue for the last 6 months
    const monthlyRevenue = await db.query<any>(
      `SELECT
         DATE_TRUNC('month', created_at)::date as month,
         COALESCE(SUM(amount), 0) as revenue
       FROM instructor_revenue
       WHERE instructor_id = $1 AND status = 'completed' AND created_at > NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      [instructorId]
    );

    return c.json({
      success: true,
      data: {
        totalCourses,
        totalStudents,
        totalRevenue,
        monthlyRevenue: monthlyRevenue.rows,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load analytics');
  }
});

// ----------------------------------------------------------------------
// SUBMISSIONS
// ----------------------------------------------------------------------
instructor.get('/submissions', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    // Get submissions for assignments belonging to courses owned by this instructor
    const { rows } = await getDb(c.env).query<any>(
      `SELECT s.id, s.file_url, s.score, s.feedback, s.submitted_at,
              a.title as assignment_title, a.max_score,
              u.name as student_name, u.email as student_email
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       JOIN users u ON s.student_id = u.id
       WHERE c.instructor_id = $1
       ORDER BY s.submitted_at DESC`,
      [s.userId]
    );

    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load submissions');
  }
});

instructor.put('/submissions/:id/grade', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const submissionId = c.req.param('id');
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { score, feedback } = body;

    // Verify ownership
    const checkRes = await db.query<any>(
      `SELECT c.instructor_id
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (checkRes.rows.length === 0 || checkRes.rows[0].instructor_id !== s.userId) {
      return fail(c, 403, 'Unauthorized');
    }

    const { rows } = await db.query<any>(
      `UPDATE submissions
       SET score = $1, feedback = $2
       WHERE id = $3
       RETURNING *`,
      [score, feedback, submissionId]
    );

    // Notify student
    if (rows[0]) {
      try {
        await createNotification(c.env, {
          user_id: rows[0].student_id,
          title: 'Assignment Graded',
          message: `Your assignment has been graded with a score of ${score}.`,
          type: 'success',
        });
      } catch { /* notification non-critical */ }
    }

    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to grade submission');
  }
});

// ----------------------------------------------------------------------
// CHALLENGE SUBMISSIONS
// ----------------------------------------------------------------------
instructor.get('/challenge-submissions', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT cs.id, cs.challenge_id, cs.code, cs.file_url, cs.text_answer, cs.passed, cs.score, cs.feedback, cs.submitted_at,
        cc.title as challenge_title, cc.language, cc.difficulty, cc.type, cc.submission_type, cc.allowed_file_types, cc.rubric,
        l.title as lesson_title, c.title as course_title,
        u.name as student_name, u.email as student_email
       FROM challenge_submissions cs
       JOIN coding_challenges cc ON cs.challenge_id = cc.id
       JOIN lessons l ON cc.lesson_id = l.id
       JOIN courses c ON l.course_id = c.id
       JOIN users u ON cs.user_id = u.id
       WHERE c.instructor_id = $1
       ORDER BY cs.submitted_at DESC`,
      [s.userId]
    );

    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load challenge submissions');
  }
});

instructor.put('/challenge-submissions/:id/grade', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const id = c.req.param('id');
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { score, feedback } = body;

    const checkRes = await db.query<any>(
      `SELECT cs.user_id
       FROM challenge_submissions cs
       JOIN coding_challenges cc ON cs.challenge_id = cc.id
       JOIN lessons l ON cc.lesson_id = l.id
       JOIN courses c ON l.course_id = c.id
       WHERE cs.id = $1 AND c.instructor_id = $2`,
      [id, s.userId]
    );

    if (checkRes.rows.length === 0) {
      return fail(c, 403, 'Unauthorized');
    }

    const { rows } = await db.query<any>(
      `UPDATE challenge_submissions SET score = $1, feedback = $2 WHERE id = $3 RETURNING *`,
      [score, feedback, id]
    );

    if (rows[0]) {
      try {
        await createNotification(c.env, {
          user_id: rows[0].user_id,
          title: 'Challenge Graded',
          message: `Your coding challenge has been graded with a score of ${score}.`,
          type: 'success',
        });
      } catch { /* notification non-critical */ }
    }

    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to grade challenge submission');
  }
});

// ----------------------------------------------------------------------
// REVIEWS
// ----------------------------------------------------------------------
// GET /instructor/reviews — reviews left on the instructor's courses
instructor.get('/reviews', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT r.id,
              r.rating,
              r.comment,
              r.created_at as "createdAt",
              r.replied,
              r.reply,
              r.replied_at as "repliedAt",
              r.course_id as "courseId",
              c.title as "courseTitle",
              r.user_id as "userId",
              u.name as "userName",
              u.avatar as "userAvatar"
       FROM reviews r
       JOIN courses c ON r.course_id = c.id
       JOIN users u ON r.user_id = u.id
       WHERE c.instructor_id = $1
       ORDER BY r.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load reviews');
  }
});

// PUT /instructor/reviews/:id/reply — reply to a review on the instructor's course
instructor.put('/reviews/:id/reply', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const id = c.req.param('id');
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const reply = (body?.reply || '').trim();
    if (!reply) {
      return fail(c, 400, 'Reply cannot be empty');
    }

    const result = await getDb(c.env).query<any>(
      `UPDATE reviews
       SET reply = $1, replied = true, replied_at = NOW()
       WHERE id = $2
         AND EXISTS (SELECT 1 FROM courses c WHERE c.id = reviews.course_id AND c.instructor_id = $3)
       RETURNING id`,
      [reply, id, s.userId]
    );

    if (result.rows.length === 0) {
      return fail(c, 404, 'Review not found');
    }

    return c.json({ success: true, data: { id: result.rows[0].id } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reply to review');
  }
});

// PUT /instructor/reviews/:id/report — flag a review on the instructor's course
instructor.put('/reviews/:id/report', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const id = c.req.param('id');

    const result = await getDb(c.env).query<any>(
      `UPDATE reviews
       SET reported = true, reported_at = NOW()
       WHERE id = $1
         AND EXISTS (SELECT 1 FROM courses c WHERE c.id = reviews.course_id AND c.instructor_id = $2)
       RETURNING id`,
      [id, s.userId]
    );

    if (result.rows.length === 0) {
      return fail(c, 404, 'Review not found');
    }

    return c.json({ success: true, data: { id: result.rows[0].id } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to report review');
  }
});

// ----------------------------------------------------------------------
// ANNOUNCEMENTS
// ----------------------------------------------------------------------
instructor.get('/announcements', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT a.*, c.title as course_title
       FROM announcements a
       JOIN courses c ON a.course_id = c.id
       WHERE a.instructor_id = $1
       ORDER BY a.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load announcements');
  }
});

instructor.post('/announcements', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { course_id, title, content } = body;

    const { rows } = await db.query<any>(
      `INSERT INTO announcements (course_id, instructor_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [course_id, s.userId, title, content]
    );

    const announcement = rows[0];

    // Get course title for messaging
    const courseRes = await db.query<any>('SELECT title FROM courses WHERE id = $1', [course_id]);
    const courseTitle = courseRes.rows[0]?.title || 'Your Course';

    // Notify all enrolled students
    const enrolledStudents = await getEnrollmentsByCourse(c.env, course_id);
    const userRes = await db.query<any>('SELECT name FROM users WHERE id = $1', [s.userId]);
    const instructorName = userRes.rows[0]?.name || 'Your Instructor';

    for (const enrollment of enrolledStudents) {
      // In-app notification
      try {
        await createNotification(c.env, {
          user_id: enrollment.user_id,
          title: `New Announcement: ${title}`,
          message: `${instructorName} posted an announcement in "${courseTitle}": ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`,
          type: 'info',
        });
      } catch { /* notification non-critical */ }

      // Email notification
      if (enrollment.student_email) {
        try {
          await sendMail(c.env, {
            to: enrollment.student_email,
            subject: `📢 ${title} — ${courseTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">New Announcement</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${courseTitle}</p>
                </div>
                <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
                    ${instructorName} posted a new announcement:
                  </p>
                  <h2 style="color: #111827; font-size: 18px; margin: 0 0 12px 0;">${title}</h2>
                  <p style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${content.replace(/\n/g, '<br>')}</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #9ca3af; font-size: 12px;">
                    You are receiving this because you are enrolled in ${courseTitle}.
                    <br>CareerCode Academy
                  </p>
                </div>
              </div>
            `,
          });
        } catch { /* email non-critical */ }
      }
    }

    return c.json({ success: true, data: announcement, notified: enrolledStudents.length }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create announcement');
  }
});

// ----------------------------------------------------------------------
// LIVE CLASSES
// ----------------------------------------------------------------------
instructor.get('/live-classes', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT lc.*, c.title as course_title
       FROM live_classes lc
       JOIN courses c ON lc.course_id = c.id
       WHERE lc.instructor_id = $1
       ORDER BY lc.start_time ASC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load live classes');
  }
});

instructor.post('/live-classes', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { course_id, title, description, meeting_url, start_time, duration } = body;

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO live_classes (course_id, instructor_id, title, description, meeting_url, start_time, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [course_id, s.userId, title, description, meeting_url, start_time, duration]
    );

    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create live class');
  }
});

// ----------------------------------------------------------------------
// RECURRING EVENTS
// ----------------------------------------------------------------------
// GET /instructor/recurring-events - List recurring events
instructor.get('/recurring-events', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT re.*, c.title as course_title
       FROM recurring_events re
       LEFT JOIN courses c ON c.id = re.course_id
       WHERE re.instructor_id = $1
       ORDER BY re.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load recurring events');
  }
});

// POST /instructor/recurring-events - Create recurring event
instructor.post('/recurring-events', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const {
      title, description, event_type, course_id, recurrence_pattern, day_of_week,
      day_of_month, start_time, duration, start_date, end_date, meeting_url,
    } = body;

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO recurring_events (title, description, event_type, course_id, instructor_id, recurrence_pattern, day_of_week, day_of_month, start_time, duration, start_date, end_date, meeting_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        title, description, event_type, course_id || null, s.userId, recurrence_pattern,
        day_of_week || null, day_of_month || null, start_time, duration || 60,
        start_date, end_date || null, meeting_url || null,
      ]
    );

    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create recurring event');
  }
});

// PUT /instructor/recurring-events/:id - Update recurring event
instructor.put('/recurring-events/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const id = c.req.param('id');
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const {
      title, description, event_type, course_id, recurrence_pattern, day_of_week,
      day_of_month, start_time, duration, start_date, end_date, meeting_url,
    } = body;

    const { rows } = await getDb(c.env).query<any>(
      `UPDATE recurring_events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_type = COALESCE($3, event_type),
        course_id = COALESCE($4, course_id),
        recurrence_pattern = COALESCE($5, recurrence_pattern),
        day_of_week = COALESCE($6, day_of_week),
        day_of_month = COALESCE($7, day_of_month),
        start_time = COALESCE($8, start_time),
        duration = COALESCE($9, duration),
        start_date = COALESCE($10, start_date),
        end_date = COALESCE($11, end_date),
        meeting_url = COALESCE($12, meeting_url),
        updated_at = NOW()
       WHERE id = $13 AND instructor_id = $14
       RETURNING *`,
      [
        title, description, event_type, course_id, recurrence_pattern, day_of_week,
        day_of_month, start_time, duration, start_date, end_date, meeting_url, id, s.userId,
      ]
    );

    if (rows.length === 0) return fail(c, 404, 'Recurring event not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update recurring event');
  }
});

// DELETE /instructor/recurring-events/:id - Delete recurring event
instructor.delete('/recurring-events/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM recurring_events WHERE id = $1 AND instructor_id = $2 RETURNING id',
      [id, s.userId]
    );
    if (rows.length === 0) return fail(c, 404, 'Recurring event not found');
    return c.json({ success: true, message: 'Recurring event deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete recurring event');
  }
});

// ----------------------------------------------------------------------
// ATTENDANCE
// ----------------------------------------------------------------------
// POST /instructor/live-classes/:id/attendance - Mark attendance (instructor marks students)
instructor.post('/live-classes/:id/attendance', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const liveClassId = c.req.param('id');
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { studentIds } = body;

    // Verify ownership of live class
    const classRes = await db.query<any>(
      'SELECT * FROM live_classes WHERE id = $1 AND instructor_id = $2',
      [liveClassId, s.userId]
    );
    if (classRes.rows.length === 0) {
      return fail(c, 404, 'Live class not found or unauthorized');
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return fail(c, 400, 'studentIds array is required');
    }

    const marked: any[] = [];
    for (const studentId of studentIds) {
      try {
        const { rows } = await db.query<any>(
          `INSERT INTO attendance (live_class_id, student_id)
           VALUES ($1, $2)
           ON CONFLICT (live_class_id, student_id) DO NOTHING
           RETURNING *`,
          [liveClassId, studentId]
        );
        if (rows[0]) marked.push(rows[0]);
      } catch {
        // Skip invalid student IDs
      }
    }

    return c.json({ success: true, data: marked, count: marked.length });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark attendance');
  }
});

// GET /instructor/live-classes/:id/attendance - Get attendance for a live class
instructor.get('/live-classes/:id/attendance', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const liveClassId = c.req.param('id');

    // Get enrolled students + attendance status
    const { rows } = await getDb(c.env).query<any>(
      `SELECT u.id, u.name, u.email, u.avatar,
              CASE WHEN a.id IS NOT NULL THEN true ELSE false END as attended,
              a.attended_at
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN courses c ON e.course_id = c.id
       JOIN live_classes lc ON lc.course_id = c.id
       LEFT JOIN attendance a ON a.live_class_id = lc.id AND a.student_id = u.id
       WHERE lc.id = $1 AND c.instructor_id = $2
       ORDER BY u.name ASC`,
      [liveClassId, s.userId]
    );

    // SQLite returns 1/0 for the CASE expression; Postgres returned a boolean.
    return c.json({ success: true, data: rows.map((row: any) => ({ ...row, attended: !!row.attended })) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load attendance');
  }
});

// ----------------------------------------------------------------------
// MESSAGES (Real-Time)
// ----------------------------------------------------------------------
instructor.get('/messages/conversations', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const userId = s.userId;
    const { rows } = await getDb(c.env).query<any>(
      `SELECT
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
       ORDER BY last_message_at DESC NULLS LAST`,
      [userId]
    );

    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load conversations');
  }
});

instructor.get('/messages/:userId', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const currentUserId = s.userId;
    const otherUserId = c.req.param('userId');

    const { rows } = await getDb(c.env).query<any>(
      `SELECT * FROM direct_messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId]
    );

    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load messages');
  }
});

instructor.post('/messages', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { receiver_id, content } = body;

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO direct_messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [s.userId, receiver_id, content]
    );

    // socket.io emit dropped — clients poll /instructor/messages/:userId.
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send message');
  }
});

// PUT /instructor/messages/read - mark messages as read from a sender
instructor.put('/messages/read', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { senderId } = body;
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE direct_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false RETURNING id`,
      [senderId, s.userId]
    );
    return c.json({ success: true, updated: rows.length });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark messages as read');
  }
});

// PUT /instructor/messages/read-all - mark all conversations as read
instructor.put('/messages/read-all', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND is_read = false RETURNING id`,
      [s.userId]
    );
    return c.json({ success: true, updated: rows.length });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark messages as read');
  }
});

// DELETE /instructor/messages/:id - delete a message (own messages only)
instructor.delete('/messages/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(
      `DELETE FROM direct_messages WHERE id = $1 AND sender_id = $2 RETURNING id`,
      [id, s.userId]
    );
    if (!rows.length) return fail(c, 404, 'Message not found or not yours');
    return c.json({ success: true, message: 'Message deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete message');
  }
});

// ----------------------------------------------------------------------
// SCHEDULE (Aggregated Timeline)
// ----------------------------------------------------------------------
instructor.get('/schedule', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const instructorId = s.userId;

    // Get Upcoming Classes
    const classesRes = await db.query<any>(
      `SELECT id, title, start_time as date, 'live_class' as type, meeting_url
       FROM live_classes
       WHERE instructor_id = $1 AND start_time > NOW()
       ORDER BY start_time ASC
       LIMIT 10`,
      [instructorId]
    );

    // Get Upcoming Assignments
    const assignmentsRes = await db.query<any>(
      `SELECT a.id, a.title, a.due_date as date, 'assignment' as type, null as meeting_url
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = $1 AND a.due_date > NOW()
       ORDER BY a.due_date ASC
       LIMIT 10`,
      [instructorId]
    );

    // Resolve recurring events into actual dates (next 60 days)
    const recurringRes = await db.query<any>(
      `SELECT * FROM recurring_events
       WHERE instructor_id = $1 AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [instructorId]
    );

    const recurringEvents = expandRecurringEvents(recurringRes.rows);

    // Merge and sort
    const schedule = [...classesRes.rows, ...assignmentsRes.rows, ...recurringEvents].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return c.json({ success: true, data: schedule });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load schedule');
  }
});

// GET /instructor/students - Get all students enrolled in instructor's courses
instructor.get('/students', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);

    const { rows } = await getDb(c.env).query<any>(
      `SELECT
         u.id, u.name, u.email, u.avatar,
         COUNT(DISTINCT e.course_id) as courses_count,
         ROUND(AVG(e.progress))::int as avg_progress,
         COALESCE(AVG(r.rating), 0) as avg_rating,
         MIN(e.enrolled_at) as first_enrolled,
         CASE
           WHEN AVG(e.progress) >= 80 THEN 'active'
           WHEN AVG(e.progress) >= 40 THEN 'at-risk'
           ELSE 'inactive'
         END as status
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN reviews r ON r.course_id = c.id AND r.user_id = u.id
       WHERE c.instructor_id = $1
       GROUP BY u.id, u.name, u.email, u.avatar
       ORDER BY first_enrolled DESC`,
      [s.userId]
    );

    return c.json({ success: true, data: rows, count: rows.length });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load students');
  }
});

// POST /instructor/broadcast — send bulk message to students in selected courses
instructor.post('/broadcast', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { courseIds, title, message } = body;

    if (!courseIds?.length || !title || !message) {
      return fail(c, 400, 'courseIds, title, and message are required');
    }

    // Verify instructor owns these courses
    const validUuids = (Array.isArray(courseIds) ? courseIds : []).filter((id: string) => UUID_RE.test(id));
    if (validUuids.length === 0) {
      return fail(c, 400, 'courseIds must contain valid course IDs');
    }

    // `id = ANY($1::uuid[])` is not portable to SQLite — build the IN list.
    const uuidPlaceholders = validUuids.map((_: string, i: number) => `$${i + 1}`).join(', ');
    const courseCheck = await db.query<any>(
      `SELECT id FROM courses WHERE id IN (${uuidPlaceholders}) AND instructor_id = $${validUuids.length + 1}`,
      [...validUuids, s.userId]
    );
    if (courseCheck.rows.length === 0) {
      return fail(c, 403, 'You do not own any of the specified courses');
    }
    const validIds = courseCheck.rows.map((r: any) => r.id);

    // Get all enrolled students
    const idPlaceholders = validIds.map((_: string, i: number) => `$${i + 1}`).join(', ');
    const enrolled = await db.query<any>(
      `SELECT DISTINCT e.user_id, u.name, u.email
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       WHERE e.course_id IN (${idPlaceholders}) AND e.status = 'active'`,
      validIds
    );

    const students = enrolled.rows;
    let sentCount = 0;
    let emailCount = 0;

    for (const student of students) {
      try {
        await createNotification(c.env, {
          user_id: student.user_id,
          type: 'info',
          title,
          message,
        });
        sentCount++;

        try {
          await sendMail(c.env, {
            to: student.email,
            subject: `📢 ${title}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#1a73e8">${title}</h2>
              <p style="color:#333;line-height:1.6">${message}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
              <p style="color:#999;font-size:12px">You received this message because you are enrolled in a course.</p>
            </div>`,
          });
          emailCount++;
        } catch {
          // email failure is non-blocking
        }
      } catch {
        // notification failure is non-blocking
      }
    }

    return c.json({
      success: true,
      message: `Sent to ${sentCount} students (${emailCount} emailed)`,
      data: { sentCount, emailCount, totalStudents: students.length },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send broadcast');
  }
});

// GET /instructor/users - Search users the instructor can message
instructor.get('/users', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const search = c.req.query('search');

    let sql = `
      SELECT DISTINCT u.id, u.name, u.email, u.role, u.avatar
      FROM users u
      WHERE u.id != $1
      AND (
        (u.role = 'student' AND u.id IN (
          SELECT e.user_id FROM enrollments e
          JOIN courses c ON c.id = e.course_id
          WHERE c.instructor_id = $1
        ))
        OR
        (u.role = 'instructor' AND u.id IN (
          SELECT c2.instructor_id FROM courses c2
          WHERE c2.id IN (
            SELECT c3.id FROM courses c3 WHERE c3.instructor_id = $1
          )
        ))
      )
    `;
    const params: any[] = [s.userId];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    sql += ' ORDER BY u.name ASC LIMIT 20';

    const { rows } = await getDb(c.env).query<any>(sql, params);
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to search users');
  }
});

// ----------------------------------------------------------------------
// MENTORING SLOTS
// ----------------------------------------------------------------------
// GET /instructor/mentoring-slots - List instructor's mentoring slots
instructor.get('/mentoring-slots', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    c.executionCtx.waitUntil(sendMentoringReminders(c.env, s.userId));
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ms.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar, c.title as course_title
       FROM mentoring_slots ms
       LEFT JOIN users u ON ms.student_id = u.id
       LEFT JOIN courses c ON ms.course_id = c.id
       WHERE ms.instructor_id = $1
       ORDER BY ms.start_time ASC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load mentoring slots');
  }
});

// POST /instructor/mentoring-slots - Create availability slots (accepts array or single)
instructor.post('/mentoring-slots', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const slots = Array.isArray(body) ? body : [body];
    const created: any[] = [];

    for (const slot of slots) {
      const { course_id, title, description, start_time, end_time, meeting_url } = slot;
      const { rows } = await db.query<any>(
        `INSERT INTO mentoring_slots (instructor_id, course_id, title, description, start_time, end_time, meeting_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [s.userId, course_id || null, title || 'Mentoring Session', description || null, start_time, end_time, meeting_url || null]
      );
      created.push(rows[0]);
    }

    return c.json({ success: true, data: created }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create mentoring slots');
  }
});

// PUT /instructor/mentoring-slots/:id - Update a slot
instructor.put('/mentoring-slots/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const id = c.req.param('id');
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const { title, description, start_time, end_time, status, meeting_url } = body;

    const { rows } = await getDb(c.env).query<any>(
      `UPDATE mentoring_slots SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        status = COALESCE($5, status),
        meeting_url = COALESCE($6, meeting_url),
        updated_at = NOW()
       WHERE id = $7 AND instructor_id = $8
       RETURNING *`,
      [title, description, start_time, end_time, status, meeting_url, id, s.userId]
    );

    if (rows.length === 0) return fail(c, 404, 'Slot not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update mentoring slot');
  }
});

// POST /instructor/mentoring-slots/:id/reschedule/approve
instructor.post('/mentoring-slots/:id/reschedule/approve', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const slot = (await db.query<any>('SELECT * FROM mentoring_slots WHERE id = $1 AND instructor_id = $2', [c.req.param('id'), s.userId])).rows[0];
    if (!slot) return fail(c, 404, 'Slot not found');
    if (slot.reschedule_status !== 'requested' || !slot.proposed_start_time || !slot.proposed_end_time) return fail(c, 400, 'No pending reschedule request');
    const { rows } = await db.query<any>(
      `UPDATE mentoring_slots SET start_time = $1, end_time = $2, reschedule_status = 'approved',
         reminder_24_sent = 0, reminder_1_sent = 0, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [slot.proposed_start_time, slot.proposed_end_time, slot.id]
    );
    if (slot.student_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Mentoring reschedule approved', $2, 'info', '/student/mentoring')`,
        [slot.student_id, `Your session "${slot.title}" moved to ${new Date(slot.proposed_start_time).toUTCString()}.`]
      );
      c.executionCtx.waitUntil(sendPushToUser(c.env, slot.student_id, {
        title: 'Mentoring reschedule approved',
        body: `"${slot.title}" moved to ${new Date(slot.proposed_start_time).toLocaleString()}.`,
        url: '/student/mentoring',
      }));
      const student = (await db.query<any>('SELECT name, email FROM users WHERE id = $1', [slot.student_id])).rows[0];
      if (student?.email) c.executionCtx.waitUntil(mail.mentoringBooked(c.env, student.email, student.name, new Date(slot.proposed_start_time).toUTCString(), 'your instructor').catch(() => {}));
    }
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to approve reschedule');
  }
});

// POST /instructor/mentoring-slots/:id/reschedule/reject
instructor.post('/mentoring-slots/:id/reschedule/reject', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const db = getDb(c.env);
    const body: any = await c.req.json().catch(() => ({}));
    const slot = (await db.query<any>('SELECT * FROM mentoring_slots WHERE id = $1 AND instructor_id = $2', [c.req.param('id'), s.userId])).rows[0];
    if (!slot) return fail(c, 404, 'Slot not found');
    await db.query(
      `UPDATE mentoring_slots SET reschedule_status = 'rejected', reschedule_reason = $1, proposed_start_time = NULL,
         proposed_end_time = NULL, updated_at = NOW() WHERE id = $2`,
      [body.reason ? String(body.reason).slice(0, 500) : null, slot.id]
    );
    if (slot.student_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Mentoring reschedule declined', $2, 'info', '/student/mentoring')`,
        [slot.student_id, `Your reschedule request for "${slot.title}" was declined.${body.reason ? ` Reason: ${String(body.reason).slice(0, 200)}` : ''}`]
      );
      c.executionCtx.waitUntil(sendPushToUser(c.env, slot.student_id, {
        title: 'Mentoring reschedule declined',
        body: `Your request for "${slot.title}" was declined.`,
        url: '/student/mentoring',
      }));
    }
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reject reschedule');
  }
});

// DELETE /instructor/mentoring-slots/:id - Delete a slot
instructor.delete('/mentoring-slots/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const id = c.req.param('id');
    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM mentoring_slots WHERE id = $1 AND instructor_id = $2 RETURNING id',
      [id, s.userId]
    );
    if (rows.length === 0) return fail(c, 404, 'Slot not found');
    return c.json({ success: true, message: 'Slot deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete mentoring slot');
  }
});

// ----------------------------------------------------------------------
// INSTRUCTOR PROFILE
// ----------------------------------------------------------------------
// GET /instructor/profile - Get instructor profile with stats
instructor.get('/profile', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const userId = s.userId;
    const user = await getInstructorUser(c.env, userId);
    if (!user) return fail(c, 404, 'User not found');

    // Get instructor stats
    const statsResult = await getDb(c.env).query<any>(
      `SELECT
        (SELECT COUNT(*) FROM courses WHERE instructor_id = $1)::int as total_courses,
        (SELECT COUNT(*) FROM courses WHERE instructor_id = $1 AND published = true)::int as published_courses,
        (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE c.instructor_id = $1)::int as total_students,
        (SELECT COALESCE(SUM(amount), 0) FROM instructor_revenue WHERE instructor_id = $1 AND status = 'completed')::float as total_revenue,
        (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r JOIN courses c ON r.course_id = c.id WHERE c.instructor_id = $1)::float as average_rating`,
      [userId]
    );

    return c.json({ success: true, data: { ...user, stats: statsResult.rows[0] } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load profile');
  }
});

// PUT /instructor/profile - Update instructor profile
instructor.put('/profile', async (c) => {
  try {
    const s = await requireRole(c, STAFF_ROLES);
    const userId = s.userId;
    const body: any = (await c.req.json().catch(() => ({}))) || {};
    const allowedFields = [
      'name', 'bio', 'headline', 'location', 'website', 'github', 'twitter', 'linkedin', 'expertise', 'avatar',
    ];
    const input: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        input[field] = body[field];
      }
    }
    const user = await updateInstructorUser(c.env, userId, input);
    if (!user) return fail(c, 404, 'User not found');
    return c.json({ success: true, data: user });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update profile');
  }
});

export default instructor;
