import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as EnrollmentModel from '../models/enrollment';
import { query } from '../config/db';
import { NotFoundError } from '../utils/errors';

const router = Router();

// GET /enrollments - get current user's enrollments with course details
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const enrollments = await EnrollmentModel.getEnrollmentsByUser(req.user!.userId);
      res.json({ success: true, data: enrollments });
    } catch (error) {
      next(error);
    }
  }
);

// GET /enrollments/:id
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const enrollment = await EnrollmentModel.getEnrollmentById(req.params.id);
      if (!enrollment) throw new NotFoundError('Enrollment');
      if (enrollment.user_id !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      res.json({ success: true, data: enrollment });
    } catch (error) {
      next(error);
    }
  }
);

// POST /enrollments/:courseId/progress - mark a lesson as completed
router.post(
  '/:courseId/progress',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { courseId } = req.params;
      const { lessonId } = req.body;

      if (!lessonId) {
        return res.status(400).json({ success: false, message: 'lessonId is required' });
      }

      // Verify enrollment exists
      const enrollment = await EnrollmentModel.getEnrollment(userId, courseId);
      if (!enrollment) {
        return res.status(404).json({ success: false, message: 'Enrollment not found' });
      }

      // Get completed_lessons array
      const completedLessons: string[] = (enrollment.completed_lessons as any) || [];

      // Check if already completed
      if (completedLessons.includes(lessonId)) {
        return res.json({ success: true, data: enrollment });
      }

      // Add lesson to completed
      completedLessons.push(lessonId);

      // Count total lessons in course
      const lessonsRes = await query(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
        [courseId]
      );
      const totalLessons = parseInt(lessonsRes.rows[0].count, 10);
      const progress = totalLessons > 0
        ? Math.round((completedLessons.length / totalLessons) * 100)
        : 0;
      const completed = progress >= 100;

      const updated = await EnrollmentModel.updateProgress(
        enrollment.id,
        progress,
        completedLessons,
        completed
      );

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
