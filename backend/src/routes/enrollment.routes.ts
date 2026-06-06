import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as EnrollmentModel from '../models/enrollment';
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

export default router;
