import type { Env } from './env';
import { getDb } from './db';
import { sendPushToUser } from './push';

// Mentorship reminders are evaluated lazily whenever a participant opens their
// mentoring list. Flags prevent duplicate reminders.

export async function sendMentoringReminders(env: Env, userId: string): Promise<void> {
  try {
    const db = getDb(env);
    const { rows } = await db.query<any>(
      `SELECT ms.*, i.name AS instructor_name, st.name AS student_name, c.title AS course_title
       FROM mentoring_slots ms
       LEFT JOIN users i ON i.id = ms.instructor_id
       LEFT JOIN users st ON st.id = ms.student_id
       LEFT JOIN courses c ON c.id = ms.course_id
       WHERE ms.status = 'booked'
         AND (ms.student_id = $1 OR ms.instructor_id = $1)
         AND ms.start_time > NOW()
         AND ms.start_time <= NOW() + INTERVAL '25 hours'`,
      [userId]
    );

    for (const slot of rows) {
      const hours = (new Date(slot.start_time).getTime() - Date.now()) / 3_600_000;
      const isStudent = slot.student_id === userId;
      const when = new Date(slot.start_time).toUTCString();

      if (hours <= 24 && !slot.reminder_24_sent) {
        await db.query('UPDATE mentoring_slots SET reminder_24_sent = 1 WHERE id = $1', [slot.id]);
        await notify(env, userId, 'Mentoring session tomorrow', `Your session "${slot.title}" starts ${when}.`, isStudent ? '/student/mentoring' : '/instructor/mentoring');
      }
      if (hours <= 1 && !slot.reminder_1_sent) {
        await db.query('UPDATE mentoring_slots SET reminder_1_sent = 1 WHERE id = $1', [slot.id]);
        await notify(env, userId, 'Mentoring session starting soon', `"${slot.title}" starts in under an hour (${when}).`, isStudent ? '/student/mentoring' : '/instructor/mentoring');
      }
    }
  } catch { /* reminders must never break the request */ }
}

async function notify(env: Env, userId: string, title: string, message: string, link: string): Promise<void> {
  await getDb(env).query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, 'reminder', $4)`,
    [userId, title, message, link]
  );
  await sendPushToUser(env, userId, { title, body: message, url: link });
}
