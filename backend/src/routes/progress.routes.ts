import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { emitStudentUpdate } from '../config/socket';

const router = Router();

// GET /progress?courseId=xxx - get lesson progress for a course
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const courseId = req.query.courseId as string;

      if (!courseId) {
        return res.status(400).json({ success: false, error: 'courseId is required' });
      }

      const { rows } = await query(
        `SELECT lp.*, l.title as lesson_title
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.user_id = $1 AND lp.course_id = $2
         ORDER BY l.order_index`,
        [userId, courseId]
      );

      const totalRes = await query(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
        [courseId]
      );
      const totalLessons = parseInt(totalRes.rows[0].count, 10);
      const completedCount = rows.filter((r: any) => r.completed).length;

      res.json({
        success: true,
        data: {
          progress: rows,
          completedLessons: completedCount,
          totalLessons,
          percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /progress - update lesson completion
router.post(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { lessonId, completed } = req.body;

      if (!lessonId) {
        return res.status(400).json({ success: false, error: 'lessonId is required' });
      }

      // Get lesson info
      const lessonRes = await query(
        'SELECT id, course_id FROM lessons WHERE id = $1',
        [lessonId]
      );
      if (lessonRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Lesson not found' });
      }
      const { course_id: courseId } = lessonRes.rows[0];

      // Upsert lesson progress
      const existing = await query(
        'SELECT id FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
        [userId, lessonId]
      );

      if (existing.rows.length > 0) {
        await query(
          `UPDATE lesson_progress SET completed = $1, completed_at = $2, updated_at = NOW()
           WHERE user_id = $3 AND lesson_id = $4`,
          [completed, completed ? new Date() : null, userId, lessonId]
        );
      } else {
        await query(
          `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, lessonId, courseId, completed, completed ? new Date() : null]
        );
      }

      // Calculate overall progress
      const totalRes = await query(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
        [courseId]
      );
      const completedRes = await query(
        `SELECT COUNT(*) as count FROM lesson_progress
         WHERE user_id = $1 AND course_id = $2 AND completed = true`,
        [userId, courseId]
      );
      const totalLessons = parseInt(totalRes.rows[0].count, 10);
      const completedCount = parseInt(completedRes.rows[0].count, 10);
      const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isCompleted = progress >= 100;

      // Update enrollment progress
      await query(
        `UPDATE enrollments SET progress = $1, completed = $2, updated_at = NOW()
         WHERE user_id = $3 AND course_id = $4`,
        [progress, isCompleted, userId, courseId]
      );

      if (isCompleted) {
        await query(
          `UPDATE enrollments SET status = 'completed', completed_at = NOW()
           WHERE user_id = $1 AND course_id = $2`,
          [userId, courseId]
        );

        // Auto-generate certificate if not exists
        const certExists = await query(
          'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
          [userId, courseId]
        );

        if (certExists.rows.length === 0) {
          const code = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          await query(
            `INSERT INTO certificates (user_id, course_id, verification_code)
             VALUES ($1, $2, $3)`,
            [userId, courseId, code]
          );

          // Notify student
          const courseInfo = await query('SELECT title FROM courses WHERE id = $1', [courseId]);
          const courseTitle = courseInfo.rows[0]?.title || 'Course';
          await query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, 'Certificate Earned!', $2, 'certificate')`,
            [userId, `Congratulations! You earned a certificate for "${courseTitle}"`]
          );
        }
      }

      res.json({
        success: true,
        data: {
          completed,
          progress,
          completedCount,
          totalLessons,
          isCompleted,
        },
      });
      emitStudentUpdate(userId);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
