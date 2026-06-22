import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import * as LearningPathModel from '../models/learningPath';
import { NotFoundError, ConflictError } from '../utils/errors';

const router = Router();

// GET /learning-paths — List all paths
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const paths = await LearningPathModel.getAllLearningPaths();
    res.json({ success: true, data: paths });
  } catch (error) {
    next(error);
  }
});

// GET /learning-paths/:slug — Get a single path
router.get('/:slug', async (req, res: Response, next: NextFunction) => {
  try {
    const path = await LearningPathModel.getLearningPathBySlug(req.params.slug);
    if (!path) {
      return res.status(404).json({ success: false, message: 'Learning path not found' });
    }

    // Also get courses in this path
    const coursesRes = await query(`
      SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price,
             lpc.order_index,
             u.name as instructor_name
      FROM learning_path_courses lpc
      JOIN courses c ON lpc.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE lpc.path_id = $1
      ORDER BY lpc.order_index ASC
    `, [path.id]);

    res.json({
      success: true,
      data: {
        ...path,
        courses: coursesRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /learning-paths/:slug/enroll — Enroll in a learning path
router.post(
  '/:slug/enroll',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const path = await LearningPathModel.getLearningPathBySlug(req.params.slug);
      if (!path) throw new NotFoundError('Learning path');

      // Check if already enrolled
      const existingRes = await query(
        'SELECT id FROM learning_path_enrollments WHERE user_id = $1 AND path_id = $2',
        [userId, path.id]
      );
      if (existingRes.rows.length > 0) {
        throw new ConflictError('Already enrolled in this learning path');
      }

      const { rows } = await query(`
        INSERT INTO learning_path_enrollments (user_id, path_id)
        VALUES ($1, $2)
        RETURNING *
      `, [userId, path.id]);

      res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// GET /learning-paths/my/enrollments — Get user's enrolled paths with progress
router.get(
  '/my/enrollments',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const { rows } = await query(`
        SELECT
          lpe.*,
          lp.title, lp.description, lp.icon, lp.color, lp.level, lp.slug,
          (SELECT COUNT(*) FROM learning_path_courses WHERE path_id = lp.id) as total_courses,
          (SELECT COALESCE(AVG(e.progress), 0) FROM learning_path_courses lpc
           JOIN enrollments e ON e.course_id = lpc.course_id AND e.user_id = $1
           WHERE lpc.path_id = lp.id) as avg_course_progress
        FROM learning_path_enrollments lpe
        JOIN learning_paths lp ON lpe.path_id = lp.id
        WHERE lpe.user_id = $1
        ORDER BY lpe.started_at DESC
      `, [userId]);

      // Compute overall path progress from enrolled courses
      const enriched = await Promise.all(rows.map(async (row: any) => {
        const coursesRes = await query(`
          SELECT c.id, c.title, c.slug, e.progress, e.completed
          FROM learning_path_courses lpc
          JOIN courses c ON lpc.course_id = c.id
          LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
          WHERE lpc.path_id = $2
          ORDER BY lpc.order_index ASC
        `, [userId, row.path_id]);

        const enrolledCount = coursesRes.rows.filter((c: any) => c.progress !== null).length;
        const completedCount = coursesRes.rows.filter((c: any) => c.completed).length;
        const totalCount = coursesRes.rows.length;
        const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return {
          ...row,
          courses: coursesRes.rows,
          enrolledCourses: enrolledCount,
          completedCourses: completedCount,
          totalCourses: totalCount,
          progress: overallProgress,
          completed: overallProgress >= 100,
        };
      }));

      res.json({ success: true, data: enriched });
    } catch (error) {
      next(error);
    }
  }
);

export default router;