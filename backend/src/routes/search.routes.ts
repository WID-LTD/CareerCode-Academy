import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/db';

const router = Router();

// GET /search?q=...&type=courses|blogs|users&limit=&offset=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    const type = req.query.type as string || 'all';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!q) {
      return res.json({ success: true, data: { courses: [], blogs: [], users: [] } });
    }

    const searchTerm = `%${q}%`;
    const results: any = {};

    if (type === 'all' || type === 'courses') {
      const { rows } = await query(`
        SELECT c.id, c.title, c.description, c.thumbnail, c.price, c.level, c.slug, c.category,
               u.name as instructor_name, c.created_at
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.published = true
          AND (c.title ILIKE $1 OR c.description ILIKE $1 OR c.category ILIKE $1)
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
      `, [searchTerm, limit, offset]);
      results.courses = rows;
    }

    if (type === 'all' || type === 'blogs') {
      const { rows } = await query(`
        SELECT id, title, excerpt, content, slug, category, image_url, created_at
        FROM blogs
        WHERE published = true
          AND (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1 OR category ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [searchTerm, limit, offset]);
      results.blogs = rows;
    }

    if (type === 'all' || type === 'users') {
      const { rows } = await query(`
        SELECT id, name, email, role, avatar, bio
        FROM users
        WHERE name ILIKE $1 OR email ILIKE $1 OR bio ILIKE $1
        ORDER BY name ASC
        LIMIT $2 OFFSET $3
      `, [searchTerm, limit, offset]);
      results.users = rows;
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;