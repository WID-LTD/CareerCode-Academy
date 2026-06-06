import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as CourseModel from '../models/course';
import * as LessonModel from '../models/lesson';
import * as EnrollmentModel from '../models/enrollment';
import * as PaymentModel from '../models/payment';
import * as ReviewModel from '../models/review';
import { uploadSingle } from '../middleware/upload';
import { slugify } from '../utils/helpers';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

const router = Router();

const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  price: z.number().min(0, 'Price must be 0 or more'),
  category: z.string().min(2, 'Category is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  thumbnail: z.string().url().optional(),
});

const updateCourseSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().min(0).optional(),
  category: z.string().min(2).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration: z.number().min(1).optional(),
  thumbnail: z.string().url().optional(),
  published: z.boolean().optional(),
});

// GET /courses
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const filters: any = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.level) filters.level = req.query.level as string;

    // Only show published courses to non-authenticated users
    filters.published = true;

    const courses = await CourseModel.getAllCourses(limit, offset, filters);
    const total = await CourseModel.countCourses(true);

    res.json({
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /courses/instructor - instructor's own courses
router.get(
  '/instructor',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const courses = await CourseModel.getAllCourses(limit, offset, {
        instructor_id: req.user!.userId,
      });
      const total = await CourseModel.countCourses();

      res.json({
        success: true,
        data: courses,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /courses/slug/:slug
router.get('/slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await CourseModel.getCourseBySlug(req.params.slug);
    if (!course) {
      throw new NotFoundError('Course');
    }

    const lessons = await LessonModel.getLessonsByCourse(course.id);
    const reviews = await ReviewModel.getReviewsByCourse(course.id);
    const averageRating = await ReviewModel.getAverageRating(course.id);
    const enrollmentCount = await EnrollmentModel.countEnrollments(course.id);

    res.json({
      success: true,
      data: {
        ...course,
        lessons,
        reviews,
        averageRating,
        enrollmentCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /courses/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await CourseModel.getCourseById(req.params.id);
    if (!course) {
      throw new NotFoundError('Course');
    }

    const lessons = await LessonModel.getLessonsByCourse(req.params.id);
    const reviews = await ReviewModel.getReviewsByCourse(req.params.id);
    const averageRating = await ReviewModel.getAverageRating(req.params.id);
    const enrollmentCount = await EnrollmentModel.countEnrollments(req.params.id);

    res.json({
      success: true,
      data: {
        ...course,
        lessons,
        reviews,
        averageRating,
        enrollmentCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /courses
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  uploadSingle('thumbnail'),
  validate(createCourseSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const slug = slugify(data.title);

      const course = await CourseModel.createCourse({
        ...data,
        instructor_id: req.user!.userId,
        thumbnail: (req as any).file ? `/uploads/${(req as any).file.filename}` : data.thumbnail,
        slug,
      });

      res.status(201).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /courses/:id
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  uploadSingle('thumbnail'),
  validate(updateCourseSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const course = await CourseModel.getCourseById(req.params.id);
      if (!course) {
        throw new NotFoundError('Course');
      }

      if (req.user!.role !== 'admin' && course.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only edit your own courses');
      }

      const data: any = { ...req.body };
      if (data.title) {
        data.slug = slugify(data.title);
      }
      if ((req as any).file?.filename) {
        data.thumbnail = `/uploads/${(req as any).file.filename}`;
      }

      const updated = await CourseModel.updateCourse(req.params.id, data);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /courses/:id
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const course = await CourseModel.getCourseById(req.params.id);
      if (!course) {
        throw new NotFoundError('Course');
      }

      if (req.user!.role !== 'admin' && course.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only delete your own courses');
      }

      await CourseModel.deleteCourse(req.params.id);
      res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /courses/:id/lessons
router.get('/:id/lessons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await CourseModel.getCourseById(req.params.id);
    if (!course) {
      throw new NotFoundError('Course');
    }

    const lessons = await LessonModel.getLessonsByCourse(req.params.id);
    res.json({ success: true, data: lessons });
  } catch (error) {
    next(error);
  }
});

// POST /courses/:id/enroll
router.post(
  '/:id/enroll',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const userId = req.user!.userId;

      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      const existing = await EnrollmentModel.getEnrollment(userId, courseId);
      if (existing) {
        throw new ConflictError('Already enrolled in this course');
      }

      if (course.price > 0) {
        // Check if payment completed
        const { rows } = await (await import('../config/db')).query(
          `SELECT * FROM payments WHERE user_id = $1 AND course_id = $2 AND status = 'completed'`,
          [userId, courseId]
        );
        if (rows.length === 0) {
          return res.status(402).json({
            success: false,
            message: 'Payment required. Please complete payment first.',
          });
        }
      }

      const enrollment = await EnrollmentModel.createEnrollment({ user_id: userId, course_id: courseId });
      res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
