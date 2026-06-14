import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { io } from '../index';

const router = Router();

router.use(authenticate);

// GET /student/messages/conversations
router.get('/messages/conversations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(
      `SELECT DISTINCT u.id, u.name, u.avatar, u.role
       FROM users u
       JOIN direct_messages dm ON (dm.sender_id = u.id OR dm.receiver_id = u.id)
       WHERE (dm.sender_id = $1 OR dm.receiver_id = $1) AND u.id != $1`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// GET /student/messages/:userId
router.get('/messages/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { userId: otherUserId } = req.params;
    const { rows } = await query(
      `SELECT * FROM direct_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, otherUserId]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

// POST /student/messages
router.post('/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!.userId;
    const { receiver_id, content } = req.body;
    if (!receiver_id || !content) {
      return res.status(400).json({ success: false, message: 'receiver_id and content are required' });
    }
    const { rows } = await query(
      `INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [senderId, receiver_id, content]
    );
    const newMessage = rows[0];
    io.to(receiver_id).emit('receive_message', newMessage);
    res.json({ success: true, data: newMessage });
  } catch (error) { next(error); }
});

export default router;
