import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

const mentoring = new Hono<{ Bindings: Env }>();
const STAFF = ['instructor', 'admin', 'super_admin'];

function json(value: any, fallback: any = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return fallback; }
}

function activeEnrollmentSql() {
  return `e.status = 'active'
    AND e.access_type IN ('trial','paid','admin_grant')
    AND (e.access_type != 'trial' OR e.trial_ends_at IS NULL OR e.trial_ends_at > NOW())`;
}

async function sharedInstructor(env: Env, userId: string, instructorId: string): Promise<boolean> {
  const rows = await getDb(env).query<any>(
    `SELECT 1 FROM enrollments e JOIN courses c ON c.id=e.course_id
     WHERE e.user_id=$1 AND c.instructor_id=$2 AND ${activeEnrollmentSql()} LIMIT 1`,
    [userId, instructorId]
  );
  return rows.rows.length > 0;
}

async function ensureProfile(env: Env, instructorId: string) {
  const db = getDb(env);
  await db.query(
    `INSERT OR IGNORE INTO mentoring_profiles (user_id, bio, topics, languages, timezone)
     SELECT id, bio, '[]', '["English"]', COALESCE((SELECT timezone FROM crm_profiles WHERE user_id=users.id), 'Africa/Lagos')
     FROM users WHERE id=$1`,
    [instructorId]
  );
  return (await db.query<any>('SELECT * FROM mentoring_profiles WHERE user_id=$1', [instructorId])).rows[0];
}

/** Convert a wall-clock time in an IANA zone to a UTC Date. */
function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  let utc = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(utc));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), 0, 0);
    const offset = asUtc - utc;
    utc -= offset;
  }
  return new Date(utc);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function timeToMinutes(t: string): number {
  const [h, m] = String(t || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function previewRule(env: Env, rule: any, weeks = 4) {
  const db = getDb(env);
  const exceptions = await db.query<any>(
    `SELECT * FROM mentoring_exceptions WHERE instructor_id=$1 AND date >= $2`,
    [rule.instructor_id, isoDate(new Date())]
  );
  const blocked = new Set(exceptions.rows.map((e: any) => e.date));
  const existing = await db.query<any>(
    `SELECT start_time FROM mentoring_slots WHERE instructor_id=$1 AND status IN ('available','booked','draft') AND start_time > NOW()`,
    [rule.instructor_id]
  );
  const existingStarts = new Set(existing.rows.map((r: any) => new Date(r.start_time).toISOString()));
  const startMin = timeToMinutes(rule.start_time);
  const endMin = timeToMinutes(rule.end_time);
  const duration = Number(rule.slot_minutes) || 45;
  const buffer = Number(rule.buffer_minutes) || 0;
  const out: any[] = [];
  const today = new Date();
  const from = rule.valid_from ? new Date(rule.valid_from) : today;
  const until = rule.valid_until ? new Date(rule.valid_until) : addDays(today, weeks * 7);
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const limit = addDays(until, 1);
  while (cursor < limit) {
    if (cursor >= from && cursor.getUTCDay() === Number(rule.weekday) && !blocked.has(isoDate(cursor))) {
      for (let m = startMin; m + duration <= endMin; m += duration + buffer) {
        const start = zonedToUtc(isoDate(cursor), minutesToTime(m), rule.timezone || 'Africa/Lagos');
        const end = new Date(start.getTime() + duration * 60000);
        if (start.getTime() <= Date.now()) continue;
        if (existingStarts.has(start.toISOString())) continue;
        out.push({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          timezone: rule.timezone,
          duration_minutes: duration,
          buffer_minutes: buffer,
        });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

// ── Student ──────────────────────────────────────────────────
mentoring.get('/instructors', async (c) => {
  try {
    const s = await requireAuth(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT u.id,u.name,u.email,u.avatar,u.headline,u.bio,
        mp.bio AS mentoring_bio, mp.topics, mp.languages, mp.timezone, mp.default_duration_minutes,
        COUNT(DISTINCT c.id)::int AS course_count,
        GROUP_CONCAT(DISTINCT c.title) AS course_titles,
        (SELECT COUNT(*)::int FROM mentoring_slots ms WHERE ms.instructor_id=u.id AND ms.status='available' AND ms.start_time > NOW()) AS available_slots,
        (SELECT MIN(ms.start_time) FROM mentoring_slots ms WHERE ms.instructor_id=u.id AND ms.status='available' AND ms.start_time > NOW()) AS next_slot,
        COALESCE(AVG(r.rating),0)::float AS rating, COUNT(r.id)::int AS reviews
       FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=c.instructor_id
       LEFT JOIN mentoring_profiles mp ON mp.user_id=u.id
       LEFT JOIN reviews r ON r.course_id=c.id
       WHERE e.user_id=$1 AND ${activeEnrollmentSql()} AND COALESCE(mp.enabled,1)=1
       GROUP BY u.id
       HAVING available_slots > 0
       ORDER BY next_slot ASC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, topics: json(r.topics), languages: json(r.languages) })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load instructors'); }
});

mentoring.get('/instructors/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    if (!(await sharedInstructor(c.env, s.userId, c.req.param('id')))) return fail(c, 404, 'Instructor not available');
    const db = getDb(c.env);
    const profile = await ensureProfile(c.env, c.req.param('id'));
    const user = (await db.query<any>('SELECT id,name,email,avatar,headline,bio,expertise,location FROM users WHERE id=$1', [c.req.param('id')])).rows[0];
    const courses = await db.query<any>(
      `SELECT DISTINCT c.id,c.title,c.slug,c.level FROM enrollments e JOIN courses c ON c.id=e.course_id
       WHERE e.user_id=$1 AND c.instructor_id=$2 AND ${activeEnrollmentSql()}`,
      [s.userId, c.req.param('id')]
    );
    const slots = await db.query<any>(
      `SELECT * FROM mentoring_slots WHERE instructor_id=$1 AND status='available' AND start_time > NOW() ORDER BY start_time ASC LIMIT 100`,
      [c.req.param('id')]
    );
    const reviews = await db.query<any>(
      `SELECT r.rating,r.comment,r.created_at,u.name AS learner_name FROM reviews r JOIN users u ON u.id=r.user_id JOIN courses c ON c.id=r.course_id WHERE c.instructor_id=$1 ORDER BY r.created_at DESC LIMIT 10`,
      [c.req.param('id')]
    );
    return c.json({ success: true, data: { instructor: { ...user, ...profile, topics: json(profile.topics), languages: json(profile.languages) }, courses: courses.rows, slots: slots.rows, reviews: reviews.rows } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load instructor'); }
});

mentoring.get('/slots', async (c) => {
  try {
    const s = await requireAuth(c);
    const instructorId = c.req.query('instructor_id') || '';
    const params: any[] = [s.userId];
    let filter = '';
    if (instructorId) { params.push(instructorId); filter = `AND ms.instructor_id=$${params.length}`; }
    const rows = await getDb(c.env).query<any>(
      `SELECT ms.*, u.name AS instructor_name, u.avatar AS instructor_avatar, u.headline AS instructor_headline,
        c.title AS course_title
       FROM mentoring_slots ms
       JOIN users u ON u.id=ms.instructor_id
       LEFT JOIN courses c ON c.id=ms.course_id
       WHERE ms.status='available' AND ms.start_time > NOW()
         AND EXISTS (SELECT 1 FROM enrollments e JOIN courses c2 ON c2.id=e.course_id
           WHERE e.user_id=$1 AND c2.instructor_id=ms.instructor_id AND ${activeEnrollmentSql()})
         ${filter}
       ORDER BY ms.start_time ASC LIMIT 200`,
      params
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load slots'); }
});

mentoring.get('/my-bookings', async (c) => {
  try {
    const s = await requireAuth(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT ms.*, u.name AS instructor_name, u.avatar AS instructor_avatar, c.title AS course_title
       FROM mentoring_slots ms JOIN users u ON u.id=ms.instructor_id LEFT JOIN courses c ON c.id=ms.course_id
       WHERE ms.student_id=$1 ORDER BY ms.start_time DESC LIMIT 100`,
      [s.userId]
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load bookings'); }
});

mentoring.post('/slots/:id/book', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const slot = (await db.query<any>("SELECT * FROM mentoring_slots WHERE id=$1 AND status='available'", [c.req.param('id')])).rows[0];
    if (!slot) return fail(c, 404, 'Slot not available');
    if (new Date(slot.start_time).getTime() < Date.now()) return fail(c, 400, 'This slot has already started');
    if (!(await sharedInstructor(c.env, s.userId, slot.instructor_id))) return fail(c, 403, 'Mentoring is available only for your active courses');
    if (slot.course_id) {
      const enrolled = await db.query<any>(
        `SELECT 1 FROM enrollments e WHERE e.user_id=$1 AND e.course_id=$2 AND ${activeEnrollmentSql()} LIMIT 1`,
        [s.userId, slot.course_id]
      );
      if (!enrolled.rows.length) return fail(c, 403, 'This session is for a course you are not enrolled in');
    }
    const updated = await db.query<any>(
      `UPDATE mentoring_slots SET student_id=$1, status='booked', updated_at=NOW() WHERE id=$2 AND status='available' RETURNING *`,
      [s.userId, slot.id]
    );
    if (!updated.rows.length) return fail(c, 409, 'Slot was just taken');
    return c.json({ success: true, data: updated.rows[0] });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to book slot'); }
});

mentoring.post('/slots/:id/cancel', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const slot = (await db.query<any>('SELECT * FROM mentoring_slots WHERE id=$1', [c.req.param('id')])).rows[0];
    if (!slot) return fail(c, 404, 'Slot not found');
    if (slot.student_id !== s.userId) return fail(c, 403, 'This booking is not yours');
    if (new Date(slot.start_time).getTime() < Date.now()) return fail(c, 400, 'This session has already started');
    await db.query("UPDATE mentoring_slots SET student_id=NULL, status='available', updated_at=NOW() WHERE id=$1", [slot.id]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to cancel booking'); }
});

mentoring.post('/slots/:id/reschedule', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const b: any = await c.req.json().catch(() => ({}));
    const slot = (await db.query<any>('SELECT * FROM mentoring_slots WHERE id=$1', [c.req.param('id')])).rows[0];
    if (!slot) return fail(c, 404, 'Slot not found');
    if (slot.student_id !== s.userId) return fail(c, 403, 'This booking is not yours');
    const start = b.proposed_start_time ? new Date(b.proposed_start_time) : null;
    const end = b.proposed_end_time ? new Date(b.proposed_end_time) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail(c, 400, 'Valid proposed times are required');
    if (start.getTime() < Date.now() || end.getTime() <= start.getTime()) return fail(c, 400, 'Choose a future end time after the start');
    await db.query(
      `UPDATE mentoring_slots SET reschedule_status='requested', reschedule_requested_by=$1, reschedule_reason=$2,
       proposed_start_time=$3, proposed_end_time=$4, updated_at=NOW() WHERE id=$5`,
      [s.userId, b.reason || null, start.toISOString(), end.toISOString(), slot.id]
    );
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to request reschedule'); }
});

// ── Instructor ───────────────────────────────────────────────
mentoring.get('/instructor/profile', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const profile = await ensureProfile(c.env, s.userId);
    const user = (await getDb(c.env).query<any>('SELECT id,name,email,avatar,headline,bio,expertise,location FROM users WHERE id=$1', [s.userId])).rows[0];
    return c.json({ success: true, data: { ...user, ...profile, topics: json(profile.topics), languages: json(profile.languages) } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load profile'); }
});

mentoring.put('/instructor/profile', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    await ensureProfile(c.env, s.userId);
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['enabled', 'bio', 'timezone', 'default_duration_minutes', 'buffer_minutes', 'max_sessions_per_week', 'default_meeting_url']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(typeof b[key] === 'boolean' ? (b[key] ? 1 : 0) : b[key]); }
    }
    if (b.topics !== undefined) { fields.push(`topics=$${values.length + 1}`); values.push(JSON.stringify(b.topics)); }
    if (b.languages !== undefined) { fields.push(`languages=$${values.length + 1}`); values.push(JSON.stringify(b.languages)); }
    if (fields.length) {
      fields.push('updated_at=NOW()'); values.push(s.userId);
      await getDb(c.env).query(`UPDATE mentoring_profiles SET ${fields.join(', ')} WHERE user_id=$${values.length}`, values);
    }
    const profile = await ensureProfile(c.env, s.userId);
    return c.json({ success: true, data: { ...profile, topics: json(profile.topics), languages: json(profile.languages) } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to save profile'); }
});

mentoring.get('/instructor/availability', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const rows = await getDb(c.env).query<any>(
      `SELECT a.*, c.title AS course_title FROM mentoring_availability a LEFT JOIN courses c ON c.id=a.course_id WHERE a.instructor_id=$1 ORDER BY a.weekday, a.start_time`,
      [s.userId]
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load availability'); }
});

mentoring.post('/instructor/availability', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    if (b.weekday === undefined || !b.start_time || !b.end_time) return fail(c, 400, 'Weekday, start time and end time are required');
    if (timeToMinutes(b.end_time) <= timeToMinutes(b.start_time)) return fail(c, 400, 'End time must be after start time');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO mentoring_availability (id,instructor_id,course_id,weekday,start_time,end_time,timezone,slot_minutes,buffer_minutes,meeting_url,valid_from,valid_until,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, s.userId, b.course_id || null, Number(b.weekday), b.start_time, b.end_time, b.timezone || 'Africa/Lagos', Number(b.slot_minutes) || 45, Number(b.buffer_minutes) || 15, b.meeting_url || null, b.valid_from || null, b.valid_until || null, b.status || 'active']
    );
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create availability'); }
});

mentoring.put('/instructor/availability/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['course_id', 'weekday', 'start_time', 'end_time', 'timezone', 'slot_minutes', 'buffer_minutes', 'meeting_url', 'valid_from', 'valid_until', 'status']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'), s.userId);
    await getDb(c.env).query(`UPDATE mentoring_availability SET ${fields.join(', ')} WHERE id=$${values.length - 1} AND instructor_id=$${values.length}`, values);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update availability'); }
});

mentoring.delete('/instructor/availability/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    await getDb(c.env).query('DELETE FROM mentoring_availability WHERE id=$1 AND instructor_id=$2', [c.req.param('id'), s.userId]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete availability'); }
});

mentoring.post('/instructor/availability/:id/preview', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    const rule = (await getDb(c.env).query<any>('SELECT * FROM mentoring_availability WHERE id=$1 AND instructor_id=$2', [c.req.param('id'), s.userId])).rows[0];
    if (!rule) return fail(c, 404, 'Availability not found');
    const slots = await previewRule(c.env, rule, Number(b.weeks) || 4);
    return c.json({ success: true, data: { slots, count: slots.length } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to preview availability'); }
});

mentoring.post('/instructor/availability/:id/approve', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const rule = (await db.query<any>('SELECT * FROM mentoring_availability WHERE id=$1 AND instructor_id=$2', [c.req.param('id'), s.userId])).rows[0];
    if (!rule) return fail(c, 404, 'Availability not found');
    const slots = await previewRule(c.env, rule, Number(b.weeks) || 4);
    const selected = Array.isArray(b.slots) && b.slots.length ? slots.filter((x) => b.slots.includes(x.start_time)) : slots;
    let created = 0;
    for (const slot of selected) {
      const dupe = await db.query<any>('SELECT 1 FROM mentoring_slots WHERE instructor_id=$1 AND start_time=$2 LIMIT 1', [s.userId, slot.start_time]);
      if (dupe.rows.length) continue;
      await db.query(
        `INSERT INTO mentoring_slots (id,instructor_id,course_id,title,description,start_time,end_time,status,meeting_url,availability_id,timezone,duration_minutes,buffer_minutes,published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'available',$8,$9,$10,$11,$12,NOW())`,
        [crypto.randomUUID(), s.userId, rule.course_id || null, b.title || 'Mentoring Session', b.description || null, slot.start_time, slot.end_time, rule.meeting_url || null, rule.id, rule.timezone, slot.duration_minutes, slot.buffer_minutes]
      );
      created++;
    }
    return c.json({ success: true, data: { created, total: selected.length } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to approve availability'); }
});

mentoring.get('/instructor/slots', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const rows = await getDb(c.env).query<any>(
      `SELECT ms.*, c.title AS course_title, u.name AS student_name, u.email AS student_email, u.avatar AS student_avatar
       FROM mentoring_slots ms LEFT JOIN courses c ON c.id=ms.course_id LEFT JOIN users u ON u.id=ms.student_id
       WHERE ms.instructor_id=$1 ORDER BY ms.start_time DESC LIMIT 300`,
      [s.userId]
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load slots'); }
});

mentoring.put('/instructor/slots/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['title', 'description', 'course_id', 'start_time', 'end_time', 'meeting_url', 'status']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'), s.userId);
    await getDb(c.env).query(`UPDATE mentoring_slots SET ${fields.join(', ')} WHERE id=$${values.length - 1} AND instructor_id=$${values.length}`, values);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update slot'); }
});

mentoring.delete('/instructor/slots/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    await getDb(c.env).query("DELETE FROM mentoring_slots WHERE id=$1 AND instructor_id=$2 AND status='available'", [c.req.param('id'), s.userId]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete slot'); }
});

mentoring.post('/instructor/slots/:id/complete', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    await getDb(c.env).query("UPDATE mentoring_slots SET status='completed', completed_at=NOW() WHERE id=$1 AND instructor_id=$2", [c.req.param('id'), s.userId]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to complete session'); }
});

mentoring.post('/instructor/slots/:id/no-show', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    await getDb(c.env).query("UPDATE mentoring_slots SET status='no_show', no_show=1 WHERE id=$1 AND instructor_id=$2", [c.req.param('id'), s.userId]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to mark no-show'); }
});

mentoring.get('/instructor/stats', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const [slots, week, rating] = await Promise.all([
      db.query<any>(`SELECT COUNT(*)::int AS total, SUM(CASE WHEN status='booked' THEN 1 ELSE 0 END)::int AS booked, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END)::int AS completed, SUM(CASE WHEN status='no_show' THEN 1 ELSE 0 END)::int AS no_show FROM mentoring_slots WHERE instructor_id=$1`, [s.userId]),
      db.query<any>(`SELECT COUNT(*)::int AS n FROM mentoring_slots WHERE instructor_id=$1 AND start_time >= NOW() AND start_time <= NOW() + INTERVAL '7 days'`, [s.userId]),
      db.query<any>(`SELECT COALESCE(AVG(r.rating),0)::float AS rating, COUNT(r.id)::int AS reviews FROM reviews r JOIN courses c ON c.id=r.course_id WHERE c.instructor_id=$1`, [s.userId]),
    ]);
    return c.json({ success: true, data: { ...slots.rows[0], this_week: week.rows[0]?.n || 0, ...rating.rows[0] } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load stats'); }
});

export default mentoring;
