import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

router.use(authenticate);

// GET /tickets - get current user's tickets
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(
      `SELECT t.*, a.name as assigned_name
       FROM support_tickets t
       LEFT JOIN users a ON t.assigned_to = a.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// POST /tickets - create a new ticket
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { subject, description, priority } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }
    const { rows } = await query(
      `INSERT INTO support_tickets (user_id, subject, description, priority) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, subject, description, priority || 'medium']
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
