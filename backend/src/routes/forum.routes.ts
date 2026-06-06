import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as ForumModel from '../models/forum';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createThreadSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
});

const updateThreadSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  pinned: z.boolean().optional(),
});

const createMessageSchema = z.object({
  content: z.string().min(1, 'Message is required').max(5000),
});

// ===== Thread Routes =====

// GET /forum/course/:courseId
router.get('/course/:courseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await CourseModel.getCourseById(req.params.courseId);
    if (!course) {
      throw new NotFoundError('Course');
    }

    const threads = await ForumModel.getThreadsByCourse(req.params.courseId);
    res.json({ success: true, data: threads });
  } catch (error) {
    next(error);
  }
});

// GET /forum/threads/:id
router.get('/threads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thread = await ForumModel.getThreadById(req.params.id);
    if (!thread) {
      throw new NotFoundError('Thread');
    }

    const messages = await ForumModel.getMessagesByThread(req.params.id);
    res.json({ success: true, data: { ...thread, messages } });
  } catch (error) {
    next(error);
  }
});

// POST /forum/threads
router.post(
  '/threads',
  authenticate,
  validate(createThreadSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId, title, content } = req.body;

      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      // Only enrolled students or instructors/admins can post
      if (req.user!.role === 'student') {
        const enrollment = await EnrollmentModel.getEnrollment(req.user!.userId, courseId);
        if (!enrollment) {
          throw new ForbiddenError('You must be enrolled to post in this forum');
        }
      }

      const thread = await ForumModel.createThread({
        course_id: courseId,
        user_id: req.user!.userId,
        title,
        content,
      });

      res.status(201).json({ success: true, data: thread });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /forum/threads/:id
router.put(
  '/threads/:id',
  authenticate,
  validate(updateThreadSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const thread = await ForumModel.getThreadById(req.params.id);
      if (!thread) {
        throw new NotFoundError('Thread');
      }

      if (req.user!.role !== 'admin' && thread.user_id !== req.user!.userId) {
        throw new ForbiddenError('You can only edit your own threads');
      }

      const updated = await ForumModel.updateThread(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /forum/threads/:id
router.delete(
  '/threads/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const thread = await ForumModel.getThreadById(req.params.id);
      if (!thread) {
        throw new NotFoundError('Thread');
      }

      await ForumModel.deleteThread(req.params.id);
      res.json({ success: true, message: 'Thread deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ===== Message Routes =====

// GET /forum/threads/:id/messages
router.get('/threads/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thread = await ForumModel.getThreadById(req.params.id);
    if (!thread) {
      throw new NotFoundError('Thread');
    }

    const messages = await ForumModel.getMessagesByThread(req.params.id);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// POST /forum/threads/:id/messages
router.post(
  '/threads/:id/messages',
  authenticate,
  validate(createMessageSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const thread = await ForumModel.getThreadById(req.params.id);
      if (!thread) {
        throw new NotFoundError('Thread');
      }

      const course = await CourseModel.getCourseById(thread.course_id);
      if (req.user!.role === 'student') {
        const enrollment = await EnrollmentModel.getEnrollment(req.user!.userId, thread.course_id);
        if (!enrollment) {
          throw new ForbiddenError('You must be enrolled to reply in this forum');
        }
      }

      const message = await ForumModel.createMessage({
        thread_id: req.params.id,
        user_id: req.user!.userId,
        content: req.body.content,
      });

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /forum/messages/:id
router.delete(
  '/messages/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const message = await ForumModel.getMessageById(req.params.id);
      if (!message) {
        throw new NotFoundError('Message');
      }

      if (req.user!.role !== 'admin' && message.user_id !== req.user!.userId) {
        throw new ForbiddenError('You can only delete your own messages');
      }

      await ForumModel.deleteMessage(req.params.id);
      res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
