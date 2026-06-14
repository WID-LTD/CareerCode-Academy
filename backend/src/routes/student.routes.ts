import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { io } from '../index';

const router = Router();

router.use(authenticate);

router.get('/messages/conversations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(`
      SELECT
        u.id, u.name, u.avatar, u.role,
        COALESCE(SUM(CASE WHEN dm.is_read = false AND dm.receiver_id = $1 THEN 1 ELSE 0 END), 0)::int AS unread_count,
        (SELECT content FROM direct_messages
         WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id)
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM direct_messages
         WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id)
         ORDER BY created_at DESC LIMIT 1) AS last_message_at
      FROM users u
      JOIN direct_messages dm ON (dm.sender_id = u.id OR dm.receiver_id = u.id)
      WHERE (dm.sender_id = $1 OR dm.receiver_id = $1) AND u.id != $1
      GROUP BY u.id, u.name, u.avatar, u.role
      ORDER BY last_message_at DESC NULLS LAST
    `, [userId]);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
});

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

router.put('/messages/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { senderId } = req.body;
    const { rowCount } = await query(
      `UPDATE direct_messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [senderId, userId]
    );
    res.json({ success: true, updated: rowCount });
  } catch (error) { next(error); }
});

router.delete('/messages/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { rowCount } = await query(
      `DELETE FROM direct_messages WHERE id = $1 AND sender_id = $2`,
      [id, userId]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Message not found or not yours' });
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) { next(error); }
});

// PUT /api/v1/messages/read-all - mark all conversations as read
router.put('/messages/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rowCount } = await query(
      `UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND is_read = false`,
      [userId]
    );
    res.json({ success: true, updated: rowCount });
  } catch (error) { next(error); }
});

export default router;
