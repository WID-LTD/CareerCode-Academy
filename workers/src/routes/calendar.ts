import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

const calendar = new Hono<{ Bindings: Env }>();

const EVENT_TYPE_COLORS: Record<string, string> = {
  live_session: '#3b82f6', class: '#6366f1', lecture: '#8b5cf6', module_release: '#a855f7',
  assignment: '#f97316', quiz: '#a855f7', exam: '#ef4444', challenge: '#eab308',
  project_deadline: '#f43f5e', code_review: '#14b8a6', mentorship: '#22c55e',
  career_event: '#06b6d4', community_event: '#ec4899', announcement: '#64748b',
  workshop: '#0ea5e9', meeting: '#6366f1',
};

const EVENT_COLS = `ce.*,
    c.title as course_title,
    u.name as instructor_name, u.avatar as instructor_avatar,
    s.name as school_name,
    (SELECT COUNT(*)::int FROM calendar_event_rsvps WHERE event_id = ce.id AND status = 'going') as rsvp_count`;

const EVENT_FROM = `FROM calendar_events ce
  LEFT JOIN courses c ON c.id = ce.course_id
  LEFT JOIN users u ON u.id = ce.instructor_id
  LEFT JOIN schools s ON s.id = ce.school_id`;

const canCreate = (role: string) => ['admin', 'super_admin', 'instructor'].includes(role);
const canManage = (role: string, event: any, userId: string) =>
  ['admin', 'super_admin'].includes(role) || event.created_by === userId || event.instructor_id === userId;

async function getEvent(env: Env, id: string, userId?: string) {
  const db = getDb(env);
  const extra = userId
    ? `, COALESCE((SELECT status FROM calendar_event_rsvps WHERE event_id = ce.id AND user_id = $2), '') as rsvp_status`
    : '';
  const { rows } = await db.query<any>(
    `SELECT ${EVENT_COLS}${extra} ${EVENT_FROM} WHERE ce.id = $1`,
    userId ? [id, userId] : [id]
  );
  const row = rows[0];
  if (row && userId) row.is_rsvpd = row.rsvp_status === 'going';
  return row || null;
}

// GET /api/v1/calendar
calendar.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const conds: string[] = [];
    const vals: any[] = [];
    const push = (sql: string, v: any) => { vals.push(v); conds.push(sql.replace('?', `$${vals.length}`)); };

    if (!['admin', 'super_admin'].includes(s.role)) {
      vals.push(s.userId);
      const p = `$${vals.length}`;
      conds.push(`(ce.visibility = 'public' OR ce.created_by = ${p} OR ce.instructor_id = ${p} OR (ce.visibility = 'course' AND ce.course_id IN (SELECT course_id FROM enrollments WHERE user_id = ${p})))`);
    }
    for (const [key, col] of [
      ['event_type', 'event_type'], ['status', 'status'], ['course_id', 'course_id'],
      ['instructor_id', 'instructor_id'], ['school_id', 'school_id'],
      ['community_id', 'community_id'], ['created_by', 'created_by'],
    ] as const) {
      const v = c.req.query(key);
      if (v) push(`ce.${col} = ?`, v);
    }
    if (c.req.query('start')) push('ce.end_datetime >= ?', c.req.query('start'));
    if (c.req.query('end')) push('ce.start_datetime <= ?', c.req.query('end'));
    if (c.req.query('search')) {
      vals.push(`%${c.req.query('search')}%`);
      const p = `$${vals.length}`;
      conds.push(`(ce.title ILIKE ${p} OR ce.description ILIKE ${p})`);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
    const offset = (page - 1) * limit;

    const count = await db.query<any>(`SELECT COUNT(*)::int as count FROM calendar_events ce ${where}`, vals);
    const total = Number(count.rows[0]?.count) || 0;

    const mainVals = [...vals, s.userId];
    const userParam = `$${mainVals.length}`;
    const { rows } = await db.query<any>(
      `SELECT ${EVENT_COLS},
         COALESCE((SELECT status FROM calendar_event_rsvps WHERE event_id = ce.id AND user_id = ${userParam}), '') as rsvp_status
       ${EVENT_FROM} ${where} ORDER BY ce.start_datetime ASC LIMIT ${limit} OFFSET ${offset}`,
      mainVals
    );
    rows.forEach((r) => { r.is_rsvpd = r.rsvp_status === 'going'; });
    return c.json({ success: true, data: rows, total });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load events');
  }
});

// GET /api/v1/calendar/range
calendar.get('/range', async (c) => {
  try {
    const s = await requireAuth(c);
    const start = c.req.query('start');
    const end = c.req.query('end');
    if (!start || !end) return fail(c, 400, 'start and end query params required');
    const conds = ['ce.start_datetime <= $2', 'ce.end_datetime >= $1'];
    const vals: any[] = [start, end];
    if (!['admin', 'super_admin'].includes(s.role)) {
      vals.push(s.userId);
      const p = `$${vals.length}`;
      conds.push(`(ce.visibility = 'public' OR ce.created_by = ${p} OR ce.instructor_id = ${p} OR (ce.visibility = 'course' AND ce.course_id IN (SELECT course_id FROM enrollments WHERE user_id = ${p})))`);
    }
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ${EVENT_COLS} ${EVENT_FROM} WHERE ${conds.join(' AND ')} ORDER BY ce.start_datetime ASC`,
      vals
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load events');
  }
});

// GET /api/v1/calendar/upcoming
calendar.get('/upcoming', async (c) => {
  try {
    const s = await requireAuth(c);
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '10', 10) || 10));
    const conds = [`ce.start_datetime >= NOW()`, `ce.status IN ('scheduled', 'live')`];
    if (!['admin', 'super_admin'].includes(s.role)) {
      conds.push(`(ce.visibility = 'public' OR ce.created_by = $1 OR ce.instructor_id = $1)`);
    }
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ${EVENT_COLS},
         COALESCE((SELECT status FROM calendar_event_rsvps WHERE event_id = ce.id AND user_id = $1), '') as rsvp_status
       ${EVENT_FROM} WHERE ${conds.join(' AND ')} ORDER BY ce.start_datetime ASC LIMIT ${limit}`,
      [s.userId]
    );
    rows.forEach((r) => { r.is_rsvpd = r.rsvp_status === 'going'; });
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load events');
  }
});

// GET /api/v1/calendar/stats (admin)
calendar.get('/stats', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT COUNT(*)::int as total,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END)::int as scheduled,
        SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END)::int as live,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::int as cancelled,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)::int as draft
       FROM calendar_events`
    );
    const types = await db.query<any>('SELECT event_type, COUNT(*)::int as count FROM calendar_events GROUP BY event_type');
    const by_type: Record<string, number> = {};
    for (const r of types.rows) by_type[r.event_type] = Number(r.count);
    return c.json({ success: true, data: { ...rows[0], by_type } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load stats');
  }
});

// GET /api/v1/calendar/:id
calendar.get('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const event = await getEvent(c.env, c.req.param('id'), s.userId);
    if (!event) return fail(c, 404, 'Event not found');
    return c.json({ success: true, data: event });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load event');
  }
});

// POST /api/v1/calendar
calendar.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    if (!canCreate(s.role)) return fail(c, 403, 'Only admins and instructors can create events');
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.title || !b.event_type || !b.start_datetime || !b.end_datetime) {
      return fail(c, 400, 'title, event_type, start_datetime and end_datetime are required');
    }
    const cols = [
      'title', 'description', 'event_type', 'start_datetime', 'end_datetime', 'timezone',
      'location', 'meeting_url', 'meeting_platform', 'color', 'course_id', 'module_id',
      'program_id', 'cohort_id', 'school_id', 'instructor_id', 'community_id', 'channel_id',
      'created_by', 'visibility', 'visibility_target_id', 'status', 'is_recurring',
      'recurrence_rule', 'max_attendees', 'reminder_minutes',
    ];
    const values: any[] = [
      b.title, b.description || null, b.event_type, b.start_datetime, b.end_datetime, b.timezone || 'UTC',
      b.location || null, b.meeting_url || null, b.meeting_platform || null,
      b.color || EVENT_TYPE_COLORS[b.event_type] || '#6366f1',
      b.course_id || null, b.module_id || null, b.program_id || null, b.cohort_id || null,
      b.school_id || null, b.instructor_id || null, b.community_id || null, b.channel_id || null,
      s.userId, b.visibility || 'public', b.visibility_target_id || null, b.status || 'scheduled',
      !!b.is_recurring, b.recurrence_rule || null, b.max_attendees || null,
      JSON.stringify(b.reminder_minutes || [1440, 60, 15]),
    ];
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO calendar_events (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create event');
  }
});

// PUT /api/v1/calendar/:id
calendar.put('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const existing = await getEvent(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Event not found');
    if (!canManage(s.role, existing, s.userId)) return fail(c, 403, 'You do not have permission to edit this event');

    const b: any = await c.req.json().catch(() => ({}));
    const allowed = [
      'title', 'description', 'event_type', 'start_datetime', 'end_datetime', 'timezone',
      'location', 'meeting_url', 'meeting_platform', 'color', 'course_id', 'module_id',
      'program_id', 'cohort_id', 'school_id', 'instructor_id', 'community_id', 'channel_id',
      'visibility', 'visibility_target_id', 'status', 'is_recurring', 'recurrence_rule',
      'max_attendees', 'reminder_minutes',
    ];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (b[key] !== undefined) {
        fields.push(`${key} = $${values.length + 1}`);
        values.push(key === 'reminder_minutes' ? JSON.stringify(b[key]) : b[key]);
      }
    }
    if (!fields.length) return c.json({ success: true, data: existing });
    fields.push('updated_at = NOW()');
    values.push(existing.id);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE calendar_events SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update event');
  }
});

// DELETE /api/v1/calendar/:id
calendar.delete('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const existing = await getEvent(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Event not found');
    if (!canManage(s.role, existing, s.userId)) return fail(c, 403, 'You do not have permission to delete this event');
    await getDb(c.env).query('DELETE FROM calendar_events WHERE id = $1', [existing.id]);
    return c.json({ success: true, message: 'Event deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete event');
  }
});

// POST /api/v1/calendar/:id/rsvp
calendar.post('/:id/rsvp', async (c) => {
  try {
    const s = await requireAuth(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!['going', 'maybe', 'not_going'].includes(b.status)) return fail(c, 400, 'status must be going, maybe or not_going');
    const event = await getEvent(c.env, c.req.param('id'));
    if (!event) return fail(c, 404, 'Event not found');
    await getDb(c.env).query(
      `INSERT INTO calendar_event_rsvps (event_id, user_id, status) VALUES ($1,$2,$3)
       ON CONFLICT (event_id, user_id) DO UPDATE SET status = $3`,
      [event.id, s.userId, b.status]
    );
    return c.json({ success: true, message: 'RSVP updated' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to RSVP');
  }
});

// GET /api/v1/calendar/:id/rsvps
calendar.get('/:id/rsvps', async (c) => {
  try {
    await requireAuth(c);
    const event = await getEvent(c.env, c.req.param('id'));
    if (!event) return fail(c, 404, 'Event not found');
    const { rows } = await getDb(c.env).query<any>(
      `SELECT r.*, u.name, u.avatar FROM calendar_event_rsvps r
       JOIN users u ON u.id = r.user_id WHERE r.event_id = $1 ORDER BY r.created_at ASC`,
      [event.id]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load RSVPs');
  }
});

export default calendar;
