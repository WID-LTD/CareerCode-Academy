import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /wishlists - Get user's wishlist
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await query(
      `SELECT w.id, w.course_id, w.created_at,
              c.id as course_id_full, c.title, c.thumbnail, c.price, c.slug, c.level, c.category,
              u.name as instructor_name
       FROM wishlists w
       JOIN courses c ON c.id = w.course_id
       JOIN users u ON u.id = c.instructor_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wishlist' });
  }
});

// POST /wishlists - Add to wishlist
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, error: 'courseId is required' });
    }

    const existing = await query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Already in wishlist' });
    }

    const result = await query(
      'INSERT INTO wishlists (user_id, course_id) VALUES ($1, $2) RETURNING *',
      [userId, courseId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Wishlist add error:', error);
    res.status(500).json({ success: false, error: 'Failed to add to wishlist' });
  }
});

// DELETE /wishlists/:courseId - Remove from wishlist
router.delete('/:courseId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { courseId } = req.params;

    await query(
      'DELETE FROM wishlists WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Wishlist remove error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from wishlist' });
  }
});

export default router;
