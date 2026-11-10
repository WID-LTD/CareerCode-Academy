// Helpers for the ported instructor routes.
//
// Mirrors the model functions the Express router used to import:
//   backend/src/models/notification.ts  -> createNotification
//   backend/src/models/enrollment.ts    -> getEnrollmentsByCourse
//   backend/src/models/user.ts          -> getInstructorUser / updateInstructorUser
//   backend/src/config/mailer.ts        -> sendMail (Brevo, same as auth-helpers)
//
// Only new file — no existing module is modified.

import type { Env } from './env';
import { sendEmail } from './email';
import { getDb } from './db';

/** Roles accepted by `authorize('instructor', 'admin', 'super_admin')`. */
export const STAFF_ROLES = ['instructor', 'admin', 'super_admin'];

const PUBLIC_USER_COLS =
  'id, name, email, role, avatar, bio, headline, location, website, github, twitter, linkedin, expertise, is_verified, is_suspended, allowed_dashboards, created_at, updated_at';

export interface InstructorNotificationInput {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

/** Port of backend/src/models/notification.ts#createNotification. */
export async function createNotification(env: Env, input: InstructorNotificationInput): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.user_id, input.title, input.message, input.type || 'info']
  );
  return rows[0];
}

/** Port of backend/src/models/enrollment.ts#getEnrollmentsByCourse. */
export async function getEnrollmentsByCourse(env: Env, courseId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT e.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     WHERE e.course_id = $1
     ORDER BY e.enrolled_at DESC`,
    [courseId]
  );
  return rows;
}

/** Port of backend/src/models/user.ts#getUserById (public columns only). */
export async function getInstructorUser(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ${PUBLIC_USER_COLS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/** Port of backend/src/models/user.ts#updateUser for the profile fields. */
export async function updateInstructorUser(
  env: Env,
  id: string,
  input: Record<string, any>
): Promise<any | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = $${fields.length + 1}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getInstructorUser(env, id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await getDb(env).query<any>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
     RETURNING id, name, email, role, avatar, bio, headline, location, website, github, twitter, linkedin, expertise, is_verified, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

/**
 * Port of backend/src/config/mailer.ts#sendMail.
 *
 * Like the Express implementation this never throws: a missing key or a Brevo
 * failure is swallowed so request handlers keep their original control flow.
 */
export async function sendMail(
  env: Env,
  options: { to: string; subject: string; html: string; text?: string }
): Promise<void> {
  await sendEmail(env, options);
}

/** `YYYY-MM` key for a date/date-string returned by either backend. */
export function monthKey(value: any): string {
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const s = String(value ?? '');
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return s.slice(0, 7);
}

/** Last `count` months (ascending), including the current one, as `YYYY-MM`. */
export function monthsBack(count: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

/** ISO timestamp for the first instant of the month after `key` (`YYYY-MM`). */
export function monthEndIso(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString();
}

/** Postgres `DATE_TRUNC('month', x)::date` is serialised as an ISO timestamp. */
export function monthIso(key: string): string {
  return `${key}-01T00:00:00.000Z`;
}

/**
 * Port of the recurring-event expansion loop in GET /instructor/schedule.
 * `generate_series` is not available in SQLite, so the same "next 60 days"
 * window is materialised in JavaScript.
 */
export function expandRecurringEvents(rows: any[], now: Date = new Date()): any[] {
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const recurringEvents: any[] = [];

  for (const re of rows) {
    const current = new Date(re.start_date);
    const end = re.end_date ? new Date(re.end_date) : sixtyDaysFromNow;

    while (current <= end) {
      if (current < now) {
        if (re.recurrence_pattern === 'daily') { current.setDate(current.getDate() + 1); continue; }
        else if (re.recurrence_pattern === 'weekly') { current.setDate(current.getDate() + 7); continue; }
        else if (re.recurrence_pattern === 'biweekly') { current.setDate(current.getDate() + 14); continue; }
        else if (re.recurrence_pattern === 'monthly') { current.setMonth(current.getMonth() + 1); continue; }
        else break;
      }

      let matches = false;
      if (re.recurrence_pattern === 'daily') matches = true;
      else if (re.recurrence_pattern === 'weekly') matches = current.getDay() === re.day_of_week;
      else if (re.recurrence_pattern === 'biweekly') matches = current.getDay() === re.day_of_week;
      else if (re.recurrence_pattern === 'monthly') matches = current.getDate() === re.day_of_month;

      if (matches) {
        const eventDate = new Date(current);
        const [hours, minutes] = re.start_time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);

        recurringEvents.push({
          id: re.id + '-' + eventDate.toISOString(),
          title: re.title,
          date: eventDate.toISOString(),
          type: 'live_class',
          meeting_url: re.meeting_url,
          course_title: re.course_title || '',
          recurring: true,
        });
      }

      if (re.recurrence_pattern === 'daily') current.setDate(current.getDate() + 1);
      else if (re.recurrence_pattern === 'weekly') current.setDate(current.getDate() + 7);
      else if (re.recurrence_pattern === 'biweekly') current.setDate(current.getDate() + 14);
      else if (re.recurrence_pattern === 'monthly') current.setMonth(current.getMonth() + 1);
      else break;

      if (recurringEvents.length > 20) break;
    }
  }

  return recurringEvents;
}
