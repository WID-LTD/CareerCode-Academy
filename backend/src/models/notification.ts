import { query } from '../config/db';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: Date;
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const { rows } = await query<Notification>(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.user_id, input.title, input.message, input.type || 'info']
  );
  return rows[0];
}

export async function getNotificationsByUser(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
  const { rows } = await query<Notification>(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  return rows;
}

export async function getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
  const { rows } = await query<Notification>(
    'SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

export async function markAsRead(id: string, userId: string): Promise<Notification | null> {
  const { rows } = await query<Notification>(
    'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return rows[0] || null;
}

export async function markAllAsRead(userId: string): Promise<void> {
  await query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [userId]);
}

export async function deleteNotification(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
  return (rowCount ?? 0) > 0;
}

export async function countUnread(userId: string): Promise<number> {
  const { rows } = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false', [userId]);
  return parseInt(rows[0].count, 10);
}

export async function countNotifications(userId: string): Promise<number> {
  const { rows } = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]);
  return parseInt(rows[0].count, 10);
}
