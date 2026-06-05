import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /instructor/dashboard/stats
router.get(
  '/dashboard/stats',
  authenticate,
  authorize('instructor', 'admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.user!.userId;

      // 1. Active Courses
      const { rows: coursesRow } = await query(
        'SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1',
        [instructorId]
      );
      const activeCourses = parseInt(coursesRow[0].count, 10);

      // 2. Total Students
      const { rows: studentsRow } = await query(
        `SELECT COUNT(DISTINCT e.user_id) as count
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE c.instructor_id = $1`,
        [instructorId]
      );
      const totalStudents = parseInt(studentsRow[0].count, 10);

      // 3. Total Revenue
      const { rows: revenueRow } = await query(
        `SELECT COALESCE(SUM(p.amount), 0) as total
         FROM payments p
         JOIN courses c ON p.course_id = c.id
         WHERE c.instructor_id = $1 AND p.status = 'completed'`,
        [instructorId]
      );
      const totalRevenue = parseFloat(revenueRow[0].total);

      // 4. Average Rating
      const { rows: ratingRow } = await query(
        `SELECT COALESCE(AVG(r.rating), 0) as average
         FROM reviews r
         JOIN courses c ON r.course_id = c.id
         WHERE c.instructor_id = $1`,
        [instructorId]
      );
      const averageRating = parseFloat(ratingRow[0].average).toFixed(1);

      // 5. Top Courses
      const { rows: topCourses } = await query(
        `SELECT c.title, c.slug,
                COUNT(DISTINCT e.user_id) as students,
                COALESCE(AVG(r.rating), 0) as rating,
                COALESCE(SUM(p.amount), 0) as revenue
         FROM courses c
         LEFT JOIN enrollments e ON c.id = e.course_id
         LEFT JOIN reviews r ON c.id = r.course_id
         LEFT JOIN payments p ON c.id = p.course_id AND p.status = 'completed'
         WHERE c.instructor_id = $1
         GROUP BY c.id
         ORDER BY students DESC
         LIMIT 4`,
        [instructorId]
      );

      // 6. Recent Activity (Latest enrollments)
      const { rows: recentActivityRows } = await query(
        `SELECT u.name as user_name, c.title as course_title, e.enrolled_at as time
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         JOIN users u ON e.user_id = u.id
         WHERE c.instructor_id = $1
         ORDER BY e.enrolled_at DESC
         LIMIT 5`,
        [instructorId]
      );

      const recentActivity = recentActivityRows.map(row => ({
        action: 'New enrollment',
        details: `${row.user_name} enrolled in ${row.course_title}`,
        time: new Date(row.time).toLocaleString(),
        type: 'enrollment'
      }));

      res.json({
        success: true,
        data: {
          stats: {
            activeCourses,
            totalStudents,
            totalRevenue,
            averageRating,
          },
          topCourses: topCourses.map(c => ({
            title: c.title,
            students: parseInt(c.students, 10),
            rating: parseFloat(c.rating).toFixed(1),
            revenue: parseFloat(c.revenue)
          })),
          recentActivity,
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;
