import { query } from '../config/db';
import { createNotification } from '../models/notification';
import { Server } from 'socket.io';

const REMINDER_INTERVALS = [
  { label: '7 days', hours: 168 },
  { label: '3 days', hours: 72 },
  { label: '24 hours', hours: 24 },
  { label: '1 hour', hours: 1 },
];

let interval: ReturnType<typeof setInterval> | null = null;

export function startCalendarReminderWorker(io: Server) {
  if (interval) return;
  interval = setInterval(async () => {
    try {
      const now = new Date();

      for (const reminder of REMINDER_INTERVALS) {
        const target = new Date(now.getTime() + reminder.hours * 60 * 60 * 1000);

        // Live classes starting soon
        const liveClasses = await query(`
          SELECT lc.id, lc.title, lc.scheduled_at, lc.course_id, c.title as course_title
          FROM live_classes lc
          JOIN courses c ON c.id = lc.course_id
          WHERE lc.scheduled_at BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const lc of liveClasses.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [lc.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Upcoming Live Class: ${lc.title}`,
              message: `"${lc.title}" starts in ${reminder.label}. Join on time!`,
              type: 'info',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Upcoming Live Class: ${lc.title}`,
              message: `"${lc.title}" starts in ${reminder.label}. Join on time!`,
              type: 'info',
            });
          }
        }

        // Assignments due soon
        const assignments = await query(`
          SELECT a.id, a.title, a.due_date, a.course_id, c.title as course_title
          FROM assignments a
          JOIN courses c ON c.id = a.course_id
          WHERE a.due_date BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const a of assignments.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [a.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Assignment Due: ${a.title}`,
              message: `"${a.title}" is due in ${reminder.label}. Don't forget to submit!`,
              type: 'warning',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Assignment Due: ${a.title}`,
              message: `"${a.title}" is due in ${reminder.label}. Don't forget to submit!`,
              type: 'warning',
            });
          }
        }

        // Quizzes due soon
        const quizzes = await query(`
          SELECT q.id, q.title, q.due_date, q.course_id, c.title as course_title
          FROM quizzes q
          JOIN courses c ON c.id = q.course_id
          WHERE q.due_date IS NOT NULL AND q.due_date BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const q of quizzes.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [q.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Quiz Due: ${q.title}`,
              message: `"${q.title}" is due in ${reminder.label}. Complete it before the deadline!`,
              type: 'warning',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Quiz Due: ${q.title}`,
              message: `"${q.title}" is due in ${reminder.label}. Complete it before the deadline!`,
              type: 'warning',
            });
          }
        }

        // Exams starting soon
        const exams = await query(`
          SELECT e.id, e.title, e.starts_at, e.course_id, c.title as course_title
          FROM exams e
          JOIN courses c ON c.id = e.course_id
          WHERE e.starts_at IS NOT NULL AND e.starts_at BETWEEN $1 AND $2
        `, [new Date(target.getTime() - 60000), target]);

        for (const ex of exams.rows) {
          const enrolled = await query(
            `SELECT user_id FROM enrollments WHERE course_id = $1`,
            [ex.course_id]
          );
          for (const e of enrolled.rows) {
            await createNotification({
              user_id: e.user_id,
              title: `Exam Starting: ${ex.title}`,
              message: `"${ex.title}" starts in ${reminder.label}. Be prepared!`,
              type: 'warning',
            });
            io.to(e.user_id).emit('new_notification', {
              title: `Exam Starting: ${ex.title}`,
              message: `"${ex.title}" starts in ${reminder.label}. Be prepared!`,
              type: 'warning',
            });
          }
        }
      }
    } catch (err) {
    }
  }, 60000);
}

export function stopCalendarReminderWorker() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
