import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /student/dashboard - student dashboard stats from live NeonDB
router.get(
  '/dashboard',
  authenticate,
  authorize('student', 'admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      // 1. Enrolled courses count
      const { rows: enrollmentCountRow } = await query(
        'SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1',
        [userId]
      );
      const enrolledCourses = parseInt(enrollmentCountRow[0].count, 10);

      // 2. Certificates earned
      const { rows: certCountRow } = await query(
        'SELECT COUNT(*) as count FROM certificates WHERE user_id = $1',
        [userId]
      );
      const certificates = parseInt(certCountRow[0].count, 10);

      // 3. Average progress across all enrollments
      const { rows: progressRow } = await query(
        `SELECT COALESCE(AVG(progress), 0) as average
         FROM enrollments WHERE user_id = $1`,
        [userId]
      );
      const averageProgress = Math.round(parseFloat(progressRow[0].average));

      // 4. Total completed lessons across all enrollments
      const { rows: completedLessonsRow } = await query(
        `SELECT COALESCE(SUM(jsonb_array_length(completed_lessons)), 0) as total
         FROM enrollments WHERE user_id = $1`,
        [userId]
      );
      const completedLessons = parseInt(completedLessonsRow[0].total, 10);

      // 5. Recent courses (enrolled courses with progress)
      const { rows: recentCourses } = await query(
        `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration,
                e.progress, e.completed_lessons, e.enrolled_at,
                u.name as instructor_name
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         JOIN users u ON c.instructor_id = u.id
         WHERE e.user_id = $1
         ORDER BY e.enrolled_at DESC
         LIMIT 10`,
        [userId]
      );

      // 6. Recent activity (enrollments + certifications)
      const { rows: activityRows } = await query(
        `(SELECT 'enrollment' as type, c.title as course_title,
                 e.enrolled_at as created_at
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.user_id = $1)
         UNION ALL
         (SELECT 'certificate' as type, c.title as course_title,
                 cert.issued_at as created_at
          FROM certificates cert
          JOIN courses c ON cert.course_id = c.id
          WHERE cert.user_id = $1)
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      );

      // 7. Upcoming assignments (assignments where student is enrolled)
      const { rows: upcomingAssignments } = await query(
        `SELECT a.id, a.title, a.due_date, a.max_score,
                c.title as course_title
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         JOIN enrollments e ON e.course_id = c.id
         WHERE e.user_id = $1 AND a.due_date > NOW()
         ORDER BY a.due_date ASC
         LIMIT 5`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          stats: {
            enrolledCourses,
            certificates,
            averageProgress,
            completedLessons,
          },
          recentCourses: recentCourses.map(c => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            thumbnail: c.thumbnail,
            duration: c.duration,
            progress: c.progress,
            instructor_name: c.instructor_name,
            enrolled_at: c.enrolled_at,
          })),
          recentActivity: activityRows.map(a => ({
            type: a.type,
            course_title: a.course_title,
            created_at: a.created_at,
          })),
          upcomingAssignments: upcomingAssignments.map(a => ({
            id: a.id,
            title: a.title,
            due_date: a.due_date,
            max_score: a.max_score,
            course_title: a.course_title,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
// GET /student/assignments - get all assignments for enrolled courses with submission status
router.get(
  '/assignments',
  authenticate,
  authorize('student', 'admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const { rows } = await query(
        `SELECT a.id, a.title, a.description, a.due_date, a.max_score,
                c.title as course_title,
                s.id as submission_id, s.score, s.feedback, s.submitted_at
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         JOIN enrollments e ON e.course_id = c.id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
         WHERE e.user_id = $1
         ORDER BY a.due_date ASC`,
        [userId]
      );

      res.json({
        success: true,
        data: rows.map(r => {
          let status = 'not-started';
          if (r.submission_id) {
            status = r.score !== null ? 'graded' : 'submitted';
          } else if (r.due_date && new Date(r.due_date) < new Date()) {
            status = 'pending'; // Overdue/pending
          }

          return {
            id: r.id,
            title: r.title,
            description: r.description,
            course: r.course_title,
            due: r.due_date ? new Date(r.due_date).toLocaleDateString() : 'No due date',
            status,
            grade: r.score !== null ? `${r.score}/${r.max_score}` : null,
            feedback: r.feedback
          };
        })
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
