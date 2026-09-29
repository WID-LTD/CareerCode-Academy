import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { authenticate } from '../auth-helpers';
import { closeRealtimeSession, createRealtimeSession, mintParticipantToken, probeRealtime } from '../realtime';

const live = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

async function requireRole(c: any, roles: string[]): Promise<{ userId: string; role: string }> {
  const s = await authenticate(c).catch((e: any) => {
    throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
  });
  if (!roles.includes(s.role)) {
    throw Object.assign(new Error('You do not have permission to perform this action'), { statusCode: 403 });
  }
  return s;
}

// POST /api/v1/live/sessions (instructor/admin): schedule + provision room
live.post('/sessions', async (c) => {
  try {
    const session = await requireRole(c, ['admin', 'super_admin', 'instructor']);
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      return err(c, 400, 'Invalid JSON body');
    }
    const title = String(body.title || '').trim().slice(0, 200);
    if (!title) return err(c, 400, 'title is required');
    const max = Math.min(Math.max(Number(body.max_participants) || 100, 1), 500);

    let provider: any = null;
    let providerError: string | null = null;
    try {
      provider = await createRealtimeSession(c.env, title);
    } catch (e: any) {
      providerError = e?.message || 'Realtime provisioning failed';
    }

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO live_sessions (title, calendar_event_id, program_cohort_id, course_id, created_by, cf_session_id, max_participants)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        title,
        body.calendar_event_id || null,
        body.program_cohort_id || null,
        body.course_id || null,
        session.userId,
        provider?.providerSessionId || null,
        max,
      ]
    );
    const row = rows[0];
    let creatorToken: any = null;
    if (provider) {
      try {
        creatorToken = await mintParticipantToken(c.env, provider.providerSessionId, session.userId, 'host');
      } catch { /* join-time mint fallback */ }
    }
    return c.json({
      success: true,
      data: { ...row, realtime: provider ? { ...provider, client: creatorToken } : null, providerError },
    }, 201 as any);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to create live session');
  }
});

// GET /api/v1/live/sessions?status=live (upcoming/live rooms)
live.get('/sessions', async (c) => {
  try {
    const status = c.req.query('status');
    const vals: any[] = [];
    const where = status && status !== 'all' ? 'WHERE s.status = $1' : '';
    if (where) vals.push(status);
    const { rows } = await getDb(c.env).query(
      `SELECT s.*, u.name AS host_name,
        (SELECT COUNT(*)::int FROM live_participants p WHERE p.session_id = s.id AND p.left_at IS NULL) AS present_count
       FROM live_sessions s LEFT JOIN users u ON u.id = s.created_by
       ${where} ORDER BY s.created_at DESC LIMIT 50`,
      vals
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to list sessions');
  }
});

// POST /api/v1/live/sessions/:id/join (enrolled students + hosts)
live.post('/sessions/:id/join', async (c) => {
  try {
    const session = await authenticate(c).catch((e: any) => {
      throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
    });
    const { rows } = await getDb(c.env).query<any>('SELECT * FROM live_sessions WHERE id = $1', [c.req.param('id')]);
    const room = rows[0];
    if (!room) return err(c, 404, 'Session not found');
    if (room.status === 'ended' || room.status === 'cancelled') {
      return err(c, 409, `Session is ${room.status}`);
    }
    const isHost = room.created_by === session.userId || ['admin', 'super_admin', 'instructor'].includes(session.role);
    const role = isHost ? 'host' : 'student';

    // Enrollment gate for linked cohorts/courses (hosts bypass).
    if (!isHost && (room.program_cohort_id || room.course_id)) {
      const checks: string[] = [];
      const vals: any[] = [session.userId];
      if (room.program_cohort_id) {
        checks.push(`EXISTS (SELECT 1 FROM program_cohort_members m JOIN program_cohorts ch ON ch.id = m.cohort_id WHERE m.user_id = $1 AND ch.program_id = (SELECT program_id FROM program_cohorts WHERE id = $${vals.length + 1}) AND m.status = 'active')`);
        vals.push(room.program_cohort_id);
      }
      if (room.course_id) {
        checks.push(`EXISTS (SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $${vals.length + 1})`);
        vals.push(room.course_id);
      }
      const { rows: ok } = await getDb(c.env).query<any>(`SELECT (${checks.join(' OR ')}) AS allowed`, vals);
      if (!ok[0]?.allowed) return err(c, 403, 'This live session is restricted to enrolled learners');
    }

    const present = await getDb(c.env).query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM live_participants WHERE session_id = $1 AND left_at IS NULL`,
      [room.id]
    );
    if ((present.rows[0]?.n || 0) >= (room.max_participants || 100)) {
      const already = await getDb(c.env).query('SELECT id FROM live_participants WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL', [room.id, session.userId]);
      if (!already.rows.length) return err(c, 409, 'Room is full');
    }

    await getDb(c.env).query(
      `INSERT INTO live_participants (session_id, user_id, role_in_room, joined_at, left_at)
       VALUES ($1, $2, $3, NOW(), NULL)
       ON CONFLICT (session_id, user_id) DO UPDATE SET left_at = NULL, joined_at = NOW(), role_in_room = $3`,
      [room.id, session.userId, role]
    );

    let client: any = null;
    if (room.cf_session_id) {
      try {
        client = await mintParticipantToken(c.env, room.cf_session_id, session.userId, role === 'host' ? 'host' : 'student');
      } catch (e: any) {
        client = { error: e?.message || 'Token mint failed' };
      }
    }
    return c.json({ success: true, data: { session: room, role, realtime: client } });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to join session');
  }
});

// POST /api/v1/live/sessions/:id/leave (claims minutes for cap accounting)
live.post('/sessions/:id/leave', async (c) => {
  try {
    const session = await authenticate(c).catch((e: any) => {
      throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
    });
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE live_participants SET left_at = NOW(),
        minutes_claimed = minutes_claimed + GREATEST(1, EXTRACT(EPOCH FROM (NOW() - joined_at))::int / 60)
       WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL RETURNING *`,
      [c.req.param('id'), session.userId]
    );
    return c.json({ success: true, data: rows[0] || null });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to leave session');
  }
});

// POST /api/v1/live/sessions/:id/end (owner/admin)
live.post('/sessions/:id/end', async (c) => {
  try {
    const session = await requireRole(c, ['admin', 'super_admin', 'instructor']);
    const { rows } = await getDb(c.env).query<any>('SELECT * FROM live_sessions WHERE id = $1', [c.req.param('id')]);
    const room = rows[0];
    if (!room) return err(c, 404, 'Session not found');
    const isOwner = room.created_by === session.userId || ['admin', 'super_admin'].includes(session.role);
    if (!isOwner) return err(c, 403, 'Only the host or an admin can end this session');
    if (room.cf_session_id) {
      try {
        await closeRealtimeSession(c.env, room.cf_session_id);
      } catch { /* provider cleanup best-effort */ }
    }
    await getDb(c.env).query(
      `UPDATE live_participants SET left_at = COALESCE(left_at, NOW()),
        minutes_claimed = minutes_claimed + GREATEST(1, EXTRACT(EPOCH FROM (COALESCE(left_at, NOW()) - joined_at))::int / 60)
       WHERE session_id = $1 AND left_at IS NULL`,
      [room.id]
    );
    await getDb(c.env).query(
      `UPDATE live_sessions SET status = 'ended', ended_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [room.id]
    );
    return c.json({ success: true, data: { id: room.id, status: 'ended' } });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to end session');
  }
});

// GET /api/v1/live/admin/verify (admin): self-test Realtime wiring live
live.get('/admin/verify', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const checks = await probeRealtime(c.env);
    const allOk = checks.every((x) => x.ok);
    return c.json({ success: allOk, data: { checks } }, (allOk ? 200 : 503) as any);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Verify failed');
  }
});

// GET /api/v1/live/admin/usage (admin): free-tier minute accounting
live.get('/admin/usage', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const db = getDb(c.env);
    const month = await db.query<any>(
      `SELECT COALESCE(SUM(minutes_claimed), 0)::int AS minutes,
              COUNT(DISTINCT session_id)::int AS sessions,
              COUNT(DISTINCT user_id)::int AS participants
       FROM live_participants WHERE joined_at >= date_trunc('month', NOW())`
    );
    const open = await db.query<any>(
      `SELECT COUNT(*)::int AS open_sessions,
              COUNT(p.id)::int AS present_now
       FROM live_sessions s LEFT JOIN live_participants p ON p.session_id = s.id AND p.left_at IS NULL
       WHERE s.status = 'live'`
    );
    const minutes = month.rows[0]?.minutes || 0;
    return c.json({
      success: true,
      data: {
        month: new Date().toISOString().slice(0, 7),
        realtime_minutes_claimed: minutes,
        sessions_this_month: month.rows[0]?.sessions || 0,
        participants_this_month: month.rows[0]?.participants || 0,
        open_sessions: open.rows[0]?.open_sessions || 0,
        present_now: open.rows[0]?.present_now || 0,
        free_allowance_note: 'Realtime SFU + TURN share 1,000 GB/mo free. Track GB in Cloudflare dashboard → Realtime; minutes here approximate usage.',
      },
    });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load usage');
  }
});

export default live;
