import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as ReviewModel from '../models/review';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

const router = Router();

const createReviewSchema = z.object({
  courseId: z.string().uuid(),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000).optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

// GET /reviews/course/:courseId
router.get('/course/:courseId', async (req: any, res: Response, next: NextFunction) => {
  try {
    const course = await CourseModel.getCourseById(req.params.courseId);
    if (!course) {
      throw new NotFoundError('Course');
    }

    const reviews = await ReviewModel.getReviewsByCourse(req.params.courseId);
    const average = await ReviewModel.getAverageRating(req.params.courseId);

    res.json({
      success: true,
      data: reviews,
      averageRating: average,
      total: reviews.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST /reviews
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId, rating, comment } = req.body;
      const userId = req.user!.userId;

      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      // Only enrolled students can review
      const enrollment = await EnrollmentModel.getEnrollment(userId, courseId);
      if (!enrollment) {
        throw new ForbiddenError('You must be enrolled to review this course');
      }

      // Check for existing review
      const existing = await ReviewModel.getUserReviewForCourse(userId, courseId);
      if (existing) {
        throw new ConflictError('You have already reviewed this course');
      }

      const review = await ReviewModel.createReview({
        course_id: courseId,
        user_id: userId,
        rating,
        comment,
      });

      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /reviews/:id
router.put(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const review = await ReviewModel.getReviewById(req.params.id);
      if (!review) {
        throw new NotFoundError('Review');
      }

      if (review.user_id !== req.user!.userId) {
        throw new ForbiddenError('You can only edit your own reviews');
      }

      const updated = await ReviewModel.updateReview(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /reviews/:id
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const review = await ReviewModel.getReviewById(req.params.id);
      if (!review) {
        throw new NotFoundError('Review');
      }

      if (review.user_id !== req.user!.userId && req.user!.role !== 'admin') {
        throw new ForbiddenError('You can only delete your own reviews');
      }

      await ReviewModel.deleteReview(req.params.id);
      res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
