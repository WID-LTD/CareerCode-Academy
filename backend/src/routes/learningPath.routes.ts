import { Router, Response, NextFunction } from 'express';
import * as LearningPathModel from '../models/learningPath';

const router = Router();

// GET /learning-paths
router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const paths = await LearningPathModel.getAllLearningPaths();
    res.json({ success: true, data: paths });
  } catch (error) {
    next(error);
  }
});

// GET /learning-paths/:slug
router.get('/:slug', async (req, res: Response, next: NextFunction) => {
  try {
    const path = await LearningPathModel.getLearningPathBySlug(req.params.slug);
    if (!path) {
      return res.status(404).json({ success: false, message: 'Learning path not found' });
    }
    res.json({ success: true, data: path });
  } catch (error) {
    next(error);
  }
});

export default router;
