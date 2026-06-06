import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as BlogModel from '../models/blog';
import { uploadSingle } from '../middleware/upload';
import { slugify } from '../utils/helpers';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const createBlogSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  excerpt: z.string().max(300).optional(),
  category: z.string().min(2, 'Category is required'),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
});

const updateBlogSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  content: z.string().min(50).optional(),
  excerpt: z.string().max(300).optional(),
  category: z.string().min(2).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  published: z.boolean().optional(),
});

// GET /blogs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const published = req.query.all === 'true' ? undefined : true;
    const blogs = await BlogModel.getAllBlogs(limit, offset, published);
    const total = await BlogModel.countBlogs(published);

    res.json({
      success: true,
      data: blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /blogs/:slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blog = await BlogModel.getBlogBySlug(req.params.slug);
    if (!blog) {
      throw new NotFoundError('Blog');
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
});

// POST /blogs
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  uploadSingle('image'),
  validate(createBlogSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const slug = slugify(data.title);

      const blog = await BlogModel.createBlog({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        author_id: req.user!.userId,
        category: data.category,
        tags: data.tags || [],
        image_url: (req as any).file ? `/uploads/${(req as any).file.filename}` : data.imageUrl,
        slug,
      });

      res.status(201).json({ success: true, data: blog });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /blogs/:id
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  uploadSingle('image'),
  validate(updateBlogSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const blog = await BlogModel.getBlogById(req.params.id);
      if (!blog) {
        throw new NotFoundError('Blog');
      }

      if (req.user!.role !== 'admin' && blog.author_id !== req.user!.userId) {
        throw new ForbiddenError('You can only edit your own blogs');
      }

      const data: any = { ...req.body };
      if (data.title) {
        data.slug = slugify(data.title);
      }
      if ((req as any).file?.filename) {
        data.image_url = `/uploads/${(req as any).file.filename}`;
      }

      const updated = await BlogModel.updateBlog(req.params.id, data);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /blogs/:id
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const blog = await BlogModel.getBlogById(req.params.id);
      if (!blog) {
        throw new NotFoundError('Blog');
      }

      if (req.user!.role !== 'admin' && blog.author_id !== req.user!.userId) {
        throw new ForbiddenError('You can only delete your own blogs');
      }

      await BlogModel.deleteBlog(req.params.id);
      res.json({ success: true, message: 'Blog deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
