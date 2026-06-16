import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as PageModel from '../models/page';

const router = Router();

const createPageSchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  content: z.any(),
  meta: z.any().optional(),
  published: z.boolean().optional(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  meta: z.any().optional(),
  published: z.boolean().optional(),
});

// GET /pages/:slug - Public: get a published page
router.get('/:slug', async (req, res: Response, next: NextFunction) => {
  try {
    const page = await PageModel.getPageBySlug(req.params.slug);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
});

// GET /admin/pages - Admin: list all pages
router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const pages = await PageModel.getAllPages();
      res.json({ success: true, data: pages });
    } catch (error) {
      next(error);
    }
  }
);

// POST /admin/pages - Admin: create a page
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(createPageSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = await PageModel.createPage(req.body);
      res.status(201).json({ success: true, data: page });
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Page slug already exists' });
      }
      next(error);
    }
  }
);

// PUT /admin/pages/:slug - Admin: update a page
router.put(
  '/:slug',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(updatePageSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = await PageModel.updatePage(req.params.slug, req.body);
      if (!page) {
        return res.status(404).json({ success: false, message: 'Page not found' });
      }
      res.json({ success: true, data: page });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /admin/pages/:slug - Admin: delete a page
router.delete(
  '/:slug',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await PageModel.deletePage(req.params.slug);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Page not found' });
      }
      res.json({ success: true, message: 'Page deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
