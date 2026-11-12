import type { Env } from './env';
import { getDb } from './db';
import { ingestJobs, jobsAreStale } from './jobs-ingest';
import { sendMentoringReminders } from './mentoring-reminders';
import { sendPushToUser } from './push';
import { sendEmail } from './email';

// Cloudflare Cron Triggers:
//   */15 * * * *  -> mentorship + to-do due reminders
//   0 * * * *     -> job ingestion (when stale), daily digest, nightly cleanup
//
// Every run is recorded in cron_runs so the admin System Health page can show
// whether the scheduler is actually working.

async function record(env: Env, name: string, status: 'ok' | 'error', detail: string) {
  try {
    await getDb(env).query(
      `INSERT INTO cron_runs (name, last_run_at, last_status, last_detail)
       VALUES ($1, NOW(), $2, $3)
       ON CONFLICT (name) DO UPDATE SET last_run_at = NOW(), last_status = $2, last_detail = $3`,
      [name, status, detail.slice(0, 900)]
    );
  } catch { /* never break the cron */ }
}

async function reminders(env: Env) {
  const db = getDb(env);
  const { rows } = await db.query<any>(
    `SELECT DISTINCT user_id FROM (
       SELECT student_id AS user_id FROM mentoring_slots WHERE status = 'booked' AND student_id IS NOT NULL
       UNION
       SELECT instructor_id AS user_id FROM mentoring_slots WHERE status = 'booked'
     ) WHERE user_id IS NOT NULL LIMIT 500`
  );
  for (const row of rows) await sendMentoringReminders(env, row.user_id);

  let liveDetail = '';
  try { liveDetail = await liveReminders(env); } catch { liveDetail = 'live reminders failed'; }

  // To-do reminders: notify once per task when it is due today or overdue.
  const due = await db.query<any>(
    `SELECT t.id, t.user_id, t.title, t.due_at
     FROM todos t
     WHERE t.status = 'open' AND t.due_at IS NOT NULL
       AND date(t.due_at) <= date('now')
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.user_id = t.user_id AND n.type = 'todo' AND n.link = '/student/todos'
           AND n.message LIKE '%' || t.title || '%'
           AND date(n.created_at) = date('now')
       )
     LIMIT 500`
  );
  for (const todo of due.rows) {
    const late = new Date(todo.due_at).getTime() < Date.now();
    const title = late ? 'Task overdue' : 'Task due today';
    const message = `"${todo.title}" is ${late ? 'overdue' : 'due today'}.`;
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, 'todo', '/student/todos')`,
      [todo.user_id, title, message]
    );
    await sendPushToUser(env, todo.user_id, { title, body: message, url: '/student/todos' }).catch(() => {});
  }
  return `mentoring users=${rows.length}, todo reminders=${due.rows.length}, ${liveDetail}`;
}

const LIVE_WINDOWS = [
  { key: '2d', minutes: 2880, label: '2 days' },
  { key: '1d', minutes: 1440, label: '1 day' },
  { key: '90m', minutes: 90, label: '1 hour 30 minutes' },
  { key: '60m', minutes: 60, label: '1 hour' },
];

function escapeHtml(value: string): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function liveReminders(env: Env): Promise<string> {
  const db = getDb(env);
  let sent = 0;
  let skipped = 0;
  for (const win of LIVE_WINDOWS) {
    const { rows: events } = await db.query<any>(
      `SELECT ce.*, c.title AS course_title, c.price AS course_price, u.name AS instructor_name
       FROM calendar_events ce
       JOIN courses c ON c.id = ce.course_id
       LEFT JOIN users u ON u.id = ce.instructor_id
       WHERE ce.event_type = 'live_session' AND ce.status = 'scheduled'
         AND ce.course_id IS NOT NULL AND c.price > 0
         AND (julianday(ce.start_datetime) - julianday('now')) * 24 * 60 BETWEEN $1 AND $2`,
      [win.minutes - 10, win.minutes + 10]
    );
    for (const event of events) {
      const { rows: users } = await db.query<any>(
        `SELECT DISTINCT u.id, u.name, u.email
         FROM users u
         JOIN enrollments e ON e.user_id = u.id
         JOIN courses c ON c.id = e.course_id
         WHERE e.course_id = $1 AND c.price > 0 AND COALESCE(u.is_suspended, 0) = 0`,
        [event.course_id]
      );
      for (const user of users) {
        const already = await db.query<any>(
          'SELECT 1 FROM live_reminder_log WHERE event_id = $1 AND user_id = $2 AND window = $3 LIMIT 1',
          [event.id, user.id, win.key]
        );
        if (already.rows.length) { skipped++; continue; }
        await db.query(
          'INSERT INTO live_reminder_log (event_id, user_id, window) VALUES ($1, $2, $3)',
          [event.id, user.id, win.key]
        );
        const title = `Live lab in ${win.label}`;
        const when = new Date(event.start_datetime).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
        const join = event.meeting_url || 'the CareerCode dashboard';
        const message = `${event.title} starts in ${win.label} (${when}). Join: ${join}`;
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, 'live_session', '/student/calendar')`,
          [user.id, title, message]
        );
        await sendPushToUser(env, user.id, { title, body: message, url: event.meeting_url || '/student/calendar' }).catch(() => {});
        if (user.email) {
          await sendEmail(env, {
            to: user.email,
            subject: `Reminder: ${event.title} starts in ${win.label}`,
            html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#4f46e5;margin:0 0 12px">Live lab reminder</h2>
              <p><strong>${escapeHtml(event.title)}</strong> starts in <strong>${win.label}</strong>.</p>
              <p>${escapeHtml(when)} · ${escapeHtml(event.course_title || 'CareerCode')}</p>
              <p><a href="${escapeHtml(join)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Join the live lab</a></p>
              <p style="color:#6b7280;font-size:13px">Bring your current project, one blocker and one question. This reminder is sent only to enrolled students in paid courses.</p>
              <p style="color:#9ca3af;font-size:12px">CareerCode Academy · WID LTD · RC 8824091</p>
            </div>`,
            text: `${event.title} starts in ${win.label} (${when}). Join: ${join}`,
          }).catch(() => {});
        }
        sent++;
      }
    }
  }
  return `live reminders sent=${sent}, already-sent=${skipped}`;
}

async function digest(env: Env) {
  const db = getDb(env);
  const { rows } = await db.query<any>(
    `SELECT user_id, COUNT(*)::int AS n,
            SUM(CASE WHEN date(due_at) < date('now') THEN 1 ELSE 0 END)::int AS overdue
     FROM todos WHERE status = 'open' AND due_at IS NOT NULL AND date(due_at) <= date('now')
     GROUP BY user_id LIMIT 1000`
  );
  for (const row of rows) {
    const title = 'Your daily plan';
    const message = row.overdue > 0
      ? `You have ${row.n} task(s) due, ${row.overdue} overdue. Open To-Do to catch up.`
      : `You have ${row.n} task(s) due today. Open To-Do to see them.`;
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, 'todo', '/student/todos')`,
      [row.user_id, title, message]
    );
    await sendPushToUser(env, row.user_id, { title, body: message, url: '/student/todos' }).catch(() => {});
  }
  return `digest users=${rows.length}`;
}

async function cleanup(env: Env) {
  const db = getDb(env);
  const results: string[] = [];
  const run = async (label: string, sql: string) => {
    try {
      const r: any = await db.query(sql);
      results.push(`${label}=${r?.meta?.changes ?? 'ok'}`);
    } catch { results.push(`${label}=skip`); }
  };
  await run('refresh_tokens', `DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
  let retentionDays = 90;
  try {
    const r = await db.query<any>(`SELECT value FROM system_settings WHERE key = 'notification_retention_days'`);
    retentionDays = Math.max(7, Math.min(365, Number(r.rows[0]?.value) || 90));
  } catch { /* default */ }
  const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
  await run('notifications', `DELETE FROM notifications WHERE created_at < '${cutoff}'`);
  await run('ai_usage', `DELETE FROM ai_usage WHERE day < date('now', '-90 day')`);
  await run('ai_messages', `DELETE FROM ai_messages WHERE created_at < NOW() - INTERVAL '180 days'`);
  await run('cron_runs', `DELETE FROM cron_runs WHERE last_run_at < NOW() - INTERVAL '180 days'`);
  return results.join(', ');
}

export async function runScheduled(env: Env, cron: string): Promise<void> {
  const db = getDb(env);
  const now = new Date();
  const trigger = String(cron || '');

  if (trigger.startsWith('*/15')) {
    try {
      const detail = await reminders(env);
      await record(env, 'reminders', 'ok', detail);
    } catch (e: any) {
      await record(env, 'reminders', 'error', e?.message || 'failed');
    }
    return;
  }

  // Hourly job
  try {
    let jobsDetail = 'not due';
    if (await jobsAreStale(env)) {
      const result = await ingestJobs(env);
      jobsDetail = `inserted=${result.inserted}`;
    }
    await record(env, 'jobs', 'ok', jobsDetail);
  } catch (e: any) {
    await record(env, 'jobs', 'error', e?.message || 'failed');
  }

  if (now.getHours() === 7) {
    try {
      const detail = await digest(env);
      await record(env, 'digest', 'ok', detail);
    } catch (e: any) {
      await record(env, 'digest', 'error', e?.message || 'failed');
    }
  }

  if (now.getHours() === 2) {
    try {
      const detail = await cleanup(env);
      await record(env, 'cleanup', 'ok', detail);
    } catch (e: any) {
      await record(env, 'cleanup', 'error', e?.message || 'failed');
    }
  }

  // Keep the action-center timestamp fresh even if ingestion is skipped.
  try {
    const last = await db.query<any>(`SELECT value FROM system_settings WHERE key='jobs_last_ingest'`);
    if (!last.rows.length) {
      await db.query(`INSERT INTO system_settings (key, value, category) VALUES ('jobs_last_ingest', $1, 'jobs')`, [now.toISOString()]);
    }
  } catch { /* ignore */ }
}
