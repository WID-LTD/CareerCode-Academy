import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as NotificationModel from '../models/notification';

const router = Router();

router.use(authenticate);

// GET /notifications
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const unreadOnly = req.query.unread === 'true';

    let notifications;
    if (unreadOnly) {
      notifications = await NotificationModel.getUnreadNotificationsByUser(req.user!.userId);
    } else {
      notifications = await NotificationModel.getNotificationsByUser(req.user!.userId, limit, offset);
    }

    const unreadCount = await NotificationModel.countUnread(req.user!.userId);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /notifications/:id/read
router.put('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await NotificationModel.markAsRead(req.params.id, req.user!.userId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

// PUT /notifications/read-all
router.put('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await NotificationModel.markAllAsRead(req.user!.userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// DELETE /notifications/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await NotificationModel.deleteNotification(req.params.id, req.user!.userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
