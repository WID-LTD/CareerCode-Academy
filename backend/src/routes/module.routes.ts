import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { query } from '../config/db';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createModuleSchema = z.object({
  courseId: z.string().uuid('Invalid Course ID'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  orderIndex: z.number().min(0).optional().default(0),
});

const updateModuleSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  orderIndex: z.number().min(0).optional(),
});

// GET /api/v1/modules/course/:courseId - Get all modules for a course
router.get('/course/:courseId', async (req, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { rows } = await query(
      'SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index ASC, created_at ASC',
      [courseId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/modules - Create a new module
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  validate(createModuleSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId, title, orderIndex } = req.body;
      const userId = req.user!.userId;

      // Check course ownership
      const courseRes = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
      if (courseRes.rows.length === 0) {
        throw new NotFoundError('Course');
      }

      const course = courseRes.rows[0];
      if (req.user!.role !== 'admin' && course.instructor_id !== userId) {
        throw new ForbiddenError('You can only add modules to your own courses');
      }

      const { rows } = await query(
        `INSERT INTO modules (course_id, title, order_index)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [courseId, title, orderIndex || 0]
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/modules/:id - Update an existing module
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  validate(updateModuleSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { title, orderIndex } = req.body;
      const userId = req.user!.userId;

      // Verify module existence and course ownership
      const moduleRes = await query(
        `SELECT m.*, c.instructor_id 
         FROM modules m 
         JOIN courses c ON m.course_id = c.id 
         WHERE m.id = $1`,
        [id]
      );
      if (moduleRes.rows.length === 0) {
        throw new NotFoundError('Module');
      }

      const moduleItem = moduleRes.rows[0];
      if (req.user!.role !== 'admin' && moduleItem.instructor_id !== userId) {
        throw new ForbiddenError('You can only edit modules in your own courses');
      }

      const { rows } = await query(
        `UPDATE modules 
         SET title = COALESCE($1, title),
             order_index = COALESCE($2, order_index),
             updated_at = NOW()
         WHERE id = $3 
         RETURNING *`,
        [title, orderIndex, id]
      );

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/modules/:id - Delete a module
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify module existence and course ownership
      const moduleRes = await query(
        `SELECT m.*, c.instructor_id 
         FROM modules m 
         JOIN courses c ON m.course_id = c.id 
         WHERE m.id = $1`,
        [id]
      );
      if (moduleRes.rows.length === 0) {
        throw new NotFoundError('Module');
      }

      const moduleItem = moduleRes.rows[0];
      if (req.user!.role !== 'admin' && moduleItem.instructor_id !== userId) {
        throw new ForbiddenError('You can only delete modules in your own courses');
      }

      await query('DELETE FROM modules WHERE id = $1', [id]);
      res.json({ success: true, message: 'Module deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
