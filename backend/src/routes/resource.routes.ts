import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { query } from '../config/db';
import { uploadSingle } from '../middleware/upload';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createResourceSchema = z.object({
  courseId: z.string().uuid('Invalid Course ID'),
  lessonId: z.string().uuid('Invalid Lesson ID').optional(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  fileUrl: z.string().url().optional(),
  fileType: z.string().max(50).optional(),
});

// GET /api/v1/resources/course/:courseId - Get all resources for a course
router.get('/course/:courseId', async (req, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { rows } = await query(
      'SELECT * FROM resources WHERE course_id = $1 ORDER BY created_at DESC',
      [courseId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/resources/lesson/:lessonId - Get resources for a specific lesson
router.get('/lesson/:lessonId', async (req, res: Response, next: NextFunction) => {
  try {
    const { lessonId } = req.params;
    const { rows } = await query(
      'SELECT * FROM resources WHERE lesson_id = $1 ORDER BY created_at DESC',
      [lessonId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/resources - Upload/Create a resource
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  uploadSingle('file'),
  validate(createResourceSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId, lessonId, title, fileUrl, fileType } = req.body;
      const userId = req.user!.userId;

      // Check course ownership
      const courseRes = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
      if (courseRes.rows.length === 0) {
        throw new NotFoundError('Course');
      }

      const course = courseRes.rows[0];
      if (req.user!.role !== 'admin' && course.instructor_id !== userId) {
        throw new ForbiddenError('You can only add resources to your own courses');
      }

      // Determine file URL
      let finalFileUrl = fileUrl || '';
      let finalFileType = fileType || '';
      if ((req as any).file) {
        finalFileUrl = `/uploads/${(req as any).file.filename}`;
        finalFileType = (req as any).file.mimetype || '';
      }

      const { rows } = await query(
        `INSERT INTO resources (course_id, lesson_id, title, file_url, file_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [courseId, lessonId || null, title, finalFileUrl, finalFileType]
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/resources/:id - Delete a resource
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Check resource and course ownership
      const resourceRes = await query(
        `SELECT r.*, c.instructor_id 
         FROM resources r 
         JOIN courses c ON r.course_id = c.id 
         WHERE r.id = $1`,
        [id]
      );
      if (resourceRes.rows.length === 0) {
        throw new NotFoundError('Resource');
      }

      const resource = resourceRes.rows[0];
      if (req.user!.role !== 'admin' && resource.instructor_id !== userId) {
        throw new ForbiddenError('You can only delete resources from your own courses');
      }

      await query('DELETE FROM resources WHERE id = $1', [id]);
      res.json({ success: true, message: 'Resource deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
