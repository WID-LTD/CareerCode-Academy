import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as LessonModel from '../models/lesson';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import { uploadSingle } from '../middleware/upload';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createLessonSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  videoUrl: z.string().url().optional(),
  duration: z.number().min(1),
  orderIndex: z.number().min(0),
  resources: z.array(z.string()).optional(),
  isFree: z.boolean().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  videoUrl: z.string().url().optional(),
  duration: z.number().min(1).optional(),
  orderIndex: z.number().min(0).optional(),
  resources: z.array(z.string()).optional(),
  isFree: z.boolean().optional(),
});

// GET /lessons/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await LessonModel.getLessonById(req.params.id);
    if (!lesson) {
      throw new NotFoundError('Lesson');
    }

    // Check if the course is free or user is enrolled
    const course = await CourseModel.getCourseById(lesson.course_id);
    if (!course || !course.published) {
      throw new NotFoundError('Lesson');
    }

    res.json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
});

// POST /lessons
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  uploadSingle('video'),
  validate(createLessonSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const course = await CourseModel.getCourseById(data.courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      if (req.user!.role !== 'admin' && course.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only add lessons to your own courses');
      }

      const lesson = await LessonModel.createLesson({
        course_id: data.courseId,
        title: data.title,
        description: data.description,
        video_url: (req as any).file ? `/uploads/${(req as any).file.filename}` : data.videoUrl,
        duration: data.duration,
        order_index: data.orderIndex,
        resources: data.resources,
        is_free: data.isFree,
      });

      res.status(201).json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /lessons/:id
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  uploadSingle('video'),
  validate(updateLessonSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lesson = await LessonModel.getLessonById(req.params.id);
      if (!lesson) {
        throw new NotFoundError('Lesson');
      }

      const course = await CourseModel.getCourseById(lesson.course_id);
      if (req.user!.role !== 'admin' && course!.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only edit lessons in your own courses');
      }

      const data: any = {};
      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.duration !== undefined) data.duration = req.body.duration;
      if (req.body.orderIndex !== undefined) data.order_index = req.body.orderIndex;
      if (req.body.resources !== undefined) data.resources = req.body.resources;
      if (req.body.isFree !== undefined) data.is_free = req.body.isFree;
      if ((req as any).file?.filename) data.video_url = `/uploads/${(req as any).file.filename}`;
      if (req.body.videoUrl) data.video_url = req.body.videoUrl;

      const updated = await LessonModel.updateLesson(req.params.id, data);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /lessons/:id
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lesson = await LessonModel.getLessonById(req.params.id);
      if (!lesson) {
        throw new NotFoundError('Lesson');
      }

      const course = await CourseModel.getCourseById(lesson.course_id);
      if (req.user!.role !== 'admin' && course!.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only delete lessons in your own courses');
      }

      await LessonModel.deleteLesson(req.params.id);
      res.json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
