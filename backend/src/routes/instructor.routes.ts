import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { io } from '../config/socket';
import { createNotification } from '../models/notification';
import { sendMail } from '../config/mailer';
import { getEnrollmentsByCourse } from '../models/enrollment';

const router = Router();

// All instructor routes require instructor role
router.use(authenticate, authorize('instructor', 'admin', 'super_admin'));

// ----------------------------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------------------------
router.get('/dashboard/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;

    // Active courses count
    const coursesRes = await query('SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1', [instructorId]);
    const activeCourses = parseInt(coursesRes.rows[0].count, 10);

    // Total students enrolled in instructor's courses
    const studentsRes = await query(`
      SELECT COUNT(DISTINCT e.user_id) as count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
    `, [instructorId]);
    const totalStudents = parseInt(studentsRes.rows[0].count, 10);

    // Total revenue
    const revenueRes = await query(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p
      JOIN courses c ON p.course_id = c.id
      WHERE c.instructor_id = $1 AND p.status = 'completed'
    `, [instructorId]);
    const totalRevenue = parseFloat(revenueRes.rows[0].total);

    // Average rating
    const ratingRes = await query(`
      SELECT COALESCE(AVG(r.rating), 0) as avg
      FROM reviews r
      JOIN courses c ON r.course_id = c.id
      WHERE c.instructor_id = $1
    `, [instructorId]);
    const averageRating = parseFloat(ratingRes.rows[0].avg).toFixed(1);

    // Pending reviews (submissions not yet graded)
    const pendingReviewsRes = await query(`
      SELECT COUNT(*) as count
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE c.instructor_id = $1 AND s.score IS NULL
    `, [instructorId]);
    const pendingReviews = parseInt(pendingReviewsRes.rows[0].count, 10);

    // Unread messages
    const unreadMessagesRes = await query(`
      SELECT COUNT(*) as count
      FROM direct_messages
      WHERE receiver_id = $1 AND is_read = false
    `, [instructorId]);
    const unreadMessages = parseInt(unreadMessagesRes.rows[0].count, 10);

    // Upcoming live sessions
    const upcomingLiveSessionsRes = await query(`
      SELECT COUNT(*) as count
      FROM live_classes
      WHERE instructor_id = $1 AND start_time > NOW()
    `, [instructorId]);
    const upcomingLiveSessions = parseInt(upcomingLiveSessionsRes.rows[0].count, 10);

    // Assignments to grade (same as pending reviews, alias for clarity)
    const assignmentsToGrade = pendingReviews;

    // Course-level enrollment trend (last 6 months)
    const enrollmentTrendRes = await query(`
      SELECT
        DATE_TRUNC('month', e.enrolled_at)::date as month,
        COUNT(*) as enrollments
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1 AND e.enrolled_at > NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', e.enrolled_at)
      ORDER BY month ASC
    `, [instructorId]);

    // Monthly revenue (last 6 months)
    const monthlyRevenueRes = await query(`
      SELECT
        DATE_TRUNC('month', p.created_at)::date as month,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM payments p
      JOIN courses c ON p.course_id = c.id
      WHERE c.instructor_id = $1 AND p.status = 'completed' AND p.created_at > NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', p.created_at)
      ORDER BY month ASC
    `, [instructorId]);

    // Top courses
    const topCoursesRes = await query(`
      SELECT c.title,
             COUNT(DISTINCT e.user_id) as students,
             COALESCE(AVG(r.rating), 0) as rating,
             COALESCE(SUM(p.amount), 0) as revenue
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN reviews r ON c.id = r.course_id
      LEFT JOIN payments p ON c.id = p.course_id AND p.status = 'completed'
      WHERE c.instructor_id = $1
      GROUP BY c.id, c.title
      ORDER BY students DESC
      LIMIT 5
    `, [instructorId]);

    // Recent activity
    const recentActivityRes = await query(`
      (SELECT 'enrollment' as type, c.title as details, e.enrolled_at as time
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = $1)
      UNION ALL
      (SELECT 'submission' as type, a.title as details, s.submitted_at as time
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = $1)
      ORDER BY time DESC
      LIMIT 10
    `, [instructorId]);

    res.json({
      success: true,
      data: {
        stats: {
          activeCourses,
          totalStudents,
          totalRevenue,
          averageRating,
          pendingReviews,
          unreadMessages,
          upcomingLiveSessions,
          assignmentsToGrade,
        },
        topCourses: topCoursesRes.rows.map(c => ({
          title: c.title,
          students: parseInt(c.students, 10),
          rating: parseFloat(c.rating).toFixed(1),
          revenue: parseFloat(c.revenue),
        })),
        recentActivity: recentActivityRes.rows.map(a => ({
          action: a.type === 'enrollment' ? 'New enrollment' : a.type === 'submission' ? 'Assignment submitted' : a.type,
          details: a.details,
          time: a.time,
          type: a.type,
        })),
        enrollmentTrend: enrollmentTrendRes.rows.map(r => ({
          month: r.month,
          enrollments: parseInt(r.enrollments, 10),
        })),
        monthlyRevenue: monthlyRevenueRes.rows.map(r => ({
          month: r.month,
          revenue: parseFloat(r.revenue),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// COURSE PROPOSALS
// ----------------------------------------------------------------------
router.get('/course-proposals', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await query(
      'SELECT * FROM course_proposals WHERE instructor_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [instructorId, limit, offset]
    );
    const countRes = await query('SELECT COUNT(*) FROM course_proposals WHERE instructor_id = $1', [instructorId]);
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/course-proposals', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { 
      title, category, level, description, learning_outcomes, prerequisites,
      duration, lesson_count, teaching_format, technologies, projects, 
      recommended_price, thumbnail_url, notes
    } = req.body;

    const { rows } = await query(`
      INSERT INTO course_proposals (
        instructor_id, title, category, level, description, learning_outcomes, 
        prerequisites, duration, lesson_count, teaching_format, technologies, 
        projects, recommended_price, thumbnail_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      instructorId, title, category, level, description, learning_outcomes, 
      prerequisites, duration || 0, lesson_count || 0, teaching_format, technologies, 
      projects, recommended_price || 0, thumbnail_url, notes
    ]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// ANALYTICS
// ----------------------------------------------------------------------
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;

    // Total Courses
    const coursesRes = await query('SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1', [instructorId]);
    const totalCourses = parseInt(coursesRes.rows[0].count, 10);

    // Total Students across all their courses
    const studentsRes = await query(`
      SELECT COUNT(DISTINCT e.user_id) as count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
    `, [instructorId]);
    const totalStudents = parseInt(studentsRes.rows[0].count, 10);

    // Total Revenue (assuming 100% goes to instructor for simplicity, or 70% share)
    const revenueRes = await query(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p
      JOIN courses c ON p.course_id = c.id
      WHERE c.instructor_id = $1 AND p.status = 'completed'
    `, [instructorId]);
    const totalRevenue = parseFloat(revenueRes.rows[0].total);

    // Monthly revenue for the last 6 months
    const monthlyRevenue = await query(`
      SELECT
        DATE_TRUNC('month', p.created_at)::date as month,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM payments p
      JOIN courses c ON p.course_id = c.id
      WHERE c.instructor_id = $1 AND p.status = 'completed' AND p.created_at > NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', p.created_at)
      ORDER BY month ASC
    `, [instructorId]);

    res.json({
      success: true,
      data: {
        totalCourses,
        totalStudents,
        totalRevenue,
        monthlyRevenue: monthlyRevenue.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// SUBMISSIONS
// ----------------------------------------------------------------------
router.get('/submissions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    // Get submissions for assignments belonging to courses owned by this instructor
    const { rows } = await query(`
      SELECT s.id, s.file_url, s.score, s.feedback, s.submitted_at, 
             a.title as assignment_title, a.max_score,
             u.name as student_name, u.email as student_email
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON s.student_id = u.id
      WHERE c.instructor_id = $1
      ORDER BY s.submitted_at DESC
    `, [instructorId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.put('/submissions/:id/grade', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const submissionId = req.params.id;
    const { score, feedback } = req.body;

    // Verify ownership
    const checkRes = await query(`
      SELECT c.instructor_id 
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE s.id = $1
    `, [submissionId]);

    if (checkRes.rows.length === 0 || checkRes.rows[0].instructor_id !== instructorId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { rows } = await query(`
      UPDATE submissions
      SET score = $1, feedback = $2
      WHERE id = $3
      RETURNING *
    `, [score, feedback, submissionId]);

    // Notify student
    if (rows[0]) {
      try {
        await createNotification({
          user_id: rows[0].student_id,
          title: 'Assignment Graded',
          message: `Your assignment has been graded with a score of ${score}.`,
          type: 'success',
        });
        io.to(rows[0].student_id).emit('new_notification', {
          title: 'Assignment Graded',
          message: `Your assignment has been graded with a score of ${score}.`,
        });
      } catch { }
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// CHALLENGE SUBMISSIONS
// ----------------------------------------------------------------------
router.get('/challenge-submissions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { rows } = await query(`
      SELECT cs.id, cs.challenge_id, cs.code, cs.passed, cs.score, cs.feedback, cs.submitted_at,
        cc.title as challenge_title, cc.language, cc.difficulty,
        l.title as lesson_title, c.title as course_title,
        u.name as student_name, u.email as student_email
      FROM challenge_submissions cs
      JOIN coding_challenges cc ON cs.challenge_id = cc.id
      JOIN lessons l ON cc.lesson_id = l.id
      JOIN courses c ON l.course_id = c.id
      JOIN users u ON cs.user_id = u.id
      WHERE c.instructor_id = $1
      ORDER BY cs.submitted_at DESC
    `, [instructorId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.put('/challenge-submissions/:id/grade', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { id } = req.params;
    const { score, feedback } = req.body;

    const checkRes = await query(`
      SELECT cs.user_id
      FROM challenge_submissions cs
      JOIN coding_challenges cc ON cs.challenge_id = cc.id
      JOIN lessons l ON cc.lesson_id = l.id
      JOIN courses c ON l.course_id = c.id
      WHERE cs.id = $1 AND c.instructor_id = $2
    `, [id, instructorId]);

    if (checkRes.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { rows } = await query(
      `UPDATE challenge_submissions SET score = $1, feedback = $2 WHERE id = $3 RETURNING *`,
      [score, feedback, id]
    );

    if (rows[0]) {
      try {
        await createNotification({
          user_id: rows[0].user_id,
          title: 'Challenge Graded',
          message: `Your coding challenge has been graded with a score of ${score}.`,
          type: 'success',
        });
        io.to(rows[0].user_id).emit('new_notification', {
          title: 'Challenge Graded',
          message: `Your coding challenge has been graded with a score of ${score}.`,
        });
      } catch { }
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// ANNOUNCEMENTS
// ----------------------------------------------------------------------
router.get('/announcements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { rows } = await query(`
      SELECT a.*, c.title as course_title
      FROM announcements a
      JOIN courses c ON a.course_id = c.id
      WHERE a.instructor_id = $1
      ORDER BY a.created_at DESC
    `, [instructorId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/announcements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { course_id, title, content } = req.body;

    const { rows } = await query(`
      INSERT INTO announcements (course_id, instructor_id, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [course_id, instructorId, title, content]);

    const announcement = rows[0];

    // Get course title for messaging
    const courseRes = await query('SELECT title FROM courses WHERE id = $1', [course_id]);
    const courseTitle = courseRes.rows[0]?.title || 'Your Course';

    // Notify all enrolled students
    const enrolledStudents = await getEnrollmentsByCourse(course_id);
    const userRes = await query('SELECT name FROM users WHERE id = $1', [req.user!.userId]);
    const instructorName = userRes.rows[0]?.name || 'Your Instructor';

    for (const enrollment of enrolledStudents) {
      // In-app notification
      try {
        await createNotification({
          user_id: enrollment.user_id,
          title: `New Announcement: ${title}`,
          message: `${instructorName} posted an announcement in "${courseTitle}": ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`,
          type: 'info',
        });
        io.to(enrollment.user_id).emit('new_notification', {
          title: `New Announcement: ${title}`,
          message: `${instructorName} posted an announcement in "${courseTitle}".`,
        });
      } catch { /* notification non-critical */ }

      // Email notification
      if ((enrollment as any).student_email) {
        try {
          await sendMail({
            to: (enrollment as any).student_email,
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

    res.status(201).json({ success: true, data: announcement, notified: enrolledStudents.length });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// LIVE CLASSES
// ----------------------------------------------------------------------
router.get('/live-classes', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { rows } = await query(`
      SELECT lc.*, c.title as course_title
      FROM live_classes lc
      JOIN courses c ON lc.course_id = c.id
      WHERE lc.instructor_id = $1
      ORDER BY lc.start_time ASC
    `, [instructorId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/live-classes', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { course_id, title, description, meeting_url, start_time, duration } = req.body;

    const { rows } = await query(`
      INSERT INTO live_classes (course_id, instructor_id, title, description, meeting_url, start_time, duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [course_id, instructorId, title, description, meeting_url, start_time, duration]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// ATTENDANCE
// ----------------------------------------------------------------------
// POST /instructor/live-classes/:id/attendance - Mark attendance (instructor marks students)
router.post('/live-classes/:id/attendance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const liveClassId = req.params.id;
    const { studentIds } = req.body;

    // Verify ownership of live class
    const classRes = await query(
      'SELECT * FROM live_classes WHERE id = $1 AND instructor_id = $2',
      [liveClassId, instructorId]
    );
    if (classRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Live class not found or unauthorized' });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required' });
    }

    const marked: any[] = [];
    for (const studentId of studentIds) {
      try {
        const { rows } = await query(`
          INSERT INTO attendance (live_class_id, student_id)
          VALUES ($1, $2)
          ON CONFLICT (live_class_id, student_id) DO NOTHING
          RETURNING *
        `, [liveClassId, studentId]);
        if (rows[0]) marked.push(rows[0]);
      } catch {
        // Skip invalid student IDs
      }
    }

    res.json({ success: true, data: marked, count: marked.length });
  } catch (error) {
    next(error);
  }
});

// GET /instructor/live-classes/:id/attendance - Get attendance for a live class
router.get('/live-classes/:id/attendance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const liveClassId = req.params.id;

    // Get enrolled students + attendance status
    const { rows } = await query(`
      SELECT u.id, u.name, u.email, u.avatar,
             CASE WHEN a.id IS NOT NULL THEN true ELSE false END as attended,
             a.attended_at
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      JOIN live_classes lc ON lc.course_id = c.id
      LEFT JOIN attendance a ON a.live_class_id = lc.id AND a.student_id = u.id
      WHERE lc.id = $1 AND c.instructor_id = $2
      ORDER BY u.name ASC
    `, [liveClassId, instructorId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// MESSAGES (Real-Time)
// ----------------------------------------------------------------------
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
  } catch (error) {
    next(error);
  }
});

router.get('/messages/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.userId;
    const otherUserId = req.params.userId;

    const { rows } = await query(`
      SELECT * FROM direct_messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `, [currentUserId, otherUserId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!.userId;
    const { receiver_id, content } = req.body;

    const { rows } = await query(`
      INSERT INTO direct_messages (sender_id, receiver_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [senderId, receiver_id, content]);

    const newMessage = rows[0];

    // Emit to receiver's room instantly
    io.to(receiver_id).emit('receive_message', newMessage);

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
});

// PUT /instructor/messages/read - mark messages as read from a sender
router.put('/messages/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { senderId } = req.body;
    const { rowCount } = await query(
      `UPDATE direct_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [senderId, userId]
    );
    res.json({ success: true, updated: rowCount });
  } catch (error) {
    next(error);
  }
});

// PUT /instructor/messages/read-all - mark all conversations as read
router.put('/messages/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rowCount } = await query(
      `UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND is_read = false`,
      [userId]
    );
    res.json({ success: true, updated: rowCount });
  } catch (error) {
    next(error);
  }
});

// DELETE /instructor/messages/:id - delete a message (own messages only)
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
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------
// SCHEDULE (Aggregated Timeline)
// ----------------------------------------------------------------------
router.get('/schedule', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;

    // Get Upcoming Classes
    const classesRes = await query(`
      SELECT id, title, start_time as date, 'live_class' as type, meeting_url
      FROM live_classes 
      WHERE instructor_id = $1 AND start_time > NOW()
      ORDER BY start_time ASC
      LIMIT 10
    `, [instructorId]);

    // Get Upcoming Assignments
    const assignmentsRes = await query(`
      SELECT a.id, a.title, a.due_date as date, 'assignment' as type, null as meeting_url
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE c.instructor_id = $1 AND a.due_date > NOW()
      ORDER BY a.due_date ASC
      LIMIT 10
    `, [instructorId]);

    // Merge and sort
    const schedule = [...classesRes.rows, ...assignmentsRes.rows].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
});

// GET /instructor/students - Get all students enrolled in instructor's courses
router.get('/students', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;

    const { rows } = await query(`
      SELECT 
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
      ORDER BY first_enrolled DESC
    `, [instructorId]);

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
});

// POST /instructor/broadcast — send bulk message to students in selected courses
router.post('/broadcast', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { courseIds, title, message } = req.body;

    if (!courseIds?.length || !title || !message) {
      return res.status(400).json({ success: false, message: 'courseIds, title, and message are required' });
    }

    // Verify instructor owns these courses
    const courseCheck = await query(
      `SELECT id FROM courses WHERE id = ANY($1::int[]) AND instructor_id = $2`,
      [courseIds, instructorId]
    );
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You do not own any of the specified courses' });
    }
    const validIds = courseCheck.rows.map((r: any) => r.id);

    // Get all enrolled students
    const enrolled = await query(`
      SELECT DISTINCT e.user_id, u.name, u.email
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = ANY($1::int[]) AND e.status = 'active'
    `, [validIds]);

    const students = enrolled.rows;
    let sentCount = 0;
    let emailCount = 0;

    for (const student of students) {
      try {
        await createNotification({
          user_id: student.user_id,
          type: 'info',
          title,
          message,
        });
        io.to(student.user_id.toString()).emit('new_notification', { title, message });
        sentCount++;

        try {
          await sendMail({
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

    res.json({
      success: true,
      message: `Sent to ${sentCount} students (${emailCount} emailed)`,
      data: { sentCount, emailCount, totalStudents: students.length },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
