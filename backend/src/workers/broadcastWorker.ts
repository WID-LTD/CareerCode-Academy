import { query } from '../config/db';
import * as NotificationModel from '../models/notification';
import { Server } from 'socket.io';

let interval: ReturnType<typeof setInterval> | null = null;

export function startBroadcastWorker(io: Server) {
  if (interval) return;
  interval = setInterval(async () => {
    try {
      const { rows } = await query(
        `SELECT * FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= NOW()`
      );

      for (const broadcast of rows) {
        let userQuery = 'SELECT id FROM users WHERE 1=1';
        const userParams: any[] = [];
        const audience = broadcast.audience;

        if (audience === 'students') { userQuery += ' AND role = $1'; userParams.push('student'); }
        else if (audience === 'instructors') { userQuery += ' AND role = $1'; userParams.push('instructor'); }
        else if (audience === 'admins') { userQuery += ' AND role = $1'; userParams.push('admin'); }
        else if (audience !== 'all') { userQuery += ' AND role = $1'; userParams.push(audience); }

        const { rows: users } = await query(userQuery, userParams);

        for (const user of users) {
          await NotificationModel.createNotification({
            user_id: user.id,
            title: broadcast.title,
            message: broadcast.message,
            type: broadcast.type === 'warning' ? 'warning' : 'info',
          });
          io.to(user.id).emit('new_notification', {
            title: broadcast.title,
            message: broadcast.message,
            type: broadcast.type,
          });
        }

        await query(
          `UPDATE broadcasts SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [broadcast.id]
        );
      }
    } catch (err) {
      console.error('Broadcast worker error:', err);
    }
  }, 60000);

  console.log('Broadcast scheduled delivery worker started (interval: 60s)');
}

export function stopBroadcastWorker() {
  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log('Broadcast worker stopped');
  }
}
