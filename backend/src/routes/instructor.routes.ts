import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { io } from '../index'; // import the socket instance

const router = Router();

// All instructor routes require instructor role
router.use(authenticate, authorize('instructor', 'admin'));

// ----------------------------------------------------------------------
// COURSE PROPOSALS
// ----------------------------------------------------------------------
router.get('/course-proposals', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const { rows } = await query(
      'SELECT * FROM course_proposals WHERE instructor_id = $1 ORDER BY created_at DESC',
      [instructorId]
    );
    res.json({ success: true, data: rows });
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
      recommended_price, thumbnail_url 
    } = req.body;

    const { rows } = await query(`
      INSERT INTO course_proposals (
        instructor_id, title, category, level, description, learning_outcomes, 
        prerequisites, duration, lesson_count, teaching_format, technologies, 
        projects, recommended_price, thumbnail_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      instructorId, title, category, level, description, learning_outcomes, 
      prerequisites, duration || 0, lesson_count || 0, teaching_format, technologies, 
      projects, recommended_price || 0, thumbnail_url
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

    res.status(201).json({ success: true, data: rows[0] });
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
// MESSAGES (Real-Time)
// ----------------------------------------------------------------------
router.get('/messages/conversations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    // Find all users the instructor has exchanged messages with
    const { rows } = await query(`
      SELECT DISTINCT u.id, u.name, u.avatar, u.role
      FROM users u
      JOIN direct_messages dm ON (dm.sender_id = u.id OR dm.receiver_id = u.id)
      WHERE (dm.sender_id = $1 OR dm.receiver_id = $1) AND u.id != $1
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

export default router;
