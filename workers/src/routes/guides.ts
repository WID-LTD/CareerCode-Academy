import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

const guides = new Hono<{ Bindings: Env }>();
const ADMIN = ['admin', 'super_admin'];

function json(value: any, fallback: any = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return fallback; }
}

async function tourWithSteps(env: Env, keyOrId: string) {
  const db = getDb(env);
  const tour = (await db.query<any>('SELECT * FROM guide_tours WHERE key=$1 OR id=$1 LIMIT 1', [keyOrId])).rows[0];
  if (!tour) return null;
  const steps = await db.query<any>('SELECT * FROM guide_steps WHERE tour_id=$1 ORDER BY position, created_at', [tour.id]);
  return { ...tour, steps: steps.rows.map((s: any) => ({ ...s, arrow: !!s.arrow, optional: !!s.optional, requires_access: !!s.requires_access })) };
}

guides.get('/tours', async (c) => {
  try {
    await requireAuth(c);
    const rows = await getDb(c.env).query<any>(`SELECT * FROM guide_tours WHERE active=1 ORDER BY role, type, created_at`);
    return c.json({ success: true, data: rows.rows.map((t: any) => ({ ...t, active: !!t.active, is_builtin: !!t.is_builtin })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load tours'); }
});

guides.get('/tours/:key', async (c) => {
  try {
    await requireAuth(c);
    const tour = await tourWithSteps(c.env, c.req.param('key'));
    if (!tour) return fail(c, 404, 'Tour not found');
    return c.json({ success: true, data: tour });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load tour'); }
});

guides.get('/progress', async (c) => {
  try {
    const s = await requireAuth(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM user_guide_progress WHERE user_id=$1 ORDER BY updated_at DESC', [s.userId]);
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load progress'); }
});

guides.put('/progress', async (c) => {
  try {
    const s = await requireAuth(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.tour_key) return fail(c, 400, 'Tour key is required');
    await getDb(c.env).query(
      `INSERT INTO user_guide_progress (user_id,tour_key,step_index,status,started_at,updated_at,completed_at)
       VALUES ($1,$2,$3,$4,NOW(),NOW(),$5)
       ON CONFLICT(user_id,tour_key) DO UPDATE SET step_index=$3,status=$4,updated_at=NOW(),completed_at=$5`,
      [s.userId, b.tour_key, Number(b.step_index) || 0, b.status || 'in_progress', b.status === 'completed' ? new Date().toISOString() : null]
    );
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to save progress'); }
});

guides.post('/events', async (c) => {
  try {
    const s = await requireAuth(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.tour_key || !b.event) return fail(c, 400, 'Tour key and event are required');
    await getDb(c.env).query(
      `INSERT INTO guide_events (id,user_id,tour_key,step_index,event) VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), s.userId, b.tour_key, b.step_index ?? null, b.event]
    );
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to record event'); }
});

// ── Admin editor ─────────────────────────────────────────────
guides.get('/admin/tours', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const db = getDb(c.env);
    const tours = await db.query<any>(
      `SELECT t.*, (SELECT COUNT(*)::int FROM guide_steps s WHERE s.tour_id=t.id) AS step_count,
        (SELECT COUNT(*)::int FROM user_guide_progress p WHERE p.tour_key=t.key AND p.status='completed') AS completions
       FROM guide_tours t ORDER BY t.role, t.created_at`
    );
    return c.json({ success: true, data: tours.rows.map((t: any) => ({ ...t, active: !!t.active, is_builtin: !!t.is_builtin })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load tours'); }
});

guides.post('/admin/tours', async (c) => {
  try {
    const s = await requireRole(c, ADMIN);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.name || !b.role) return fail(c, 400, 'Tour name and role are required');
    const key = String(b.key || b.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO guide_tours (id,key,name,role,type,description,active,is_builtin,version,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,1,NOW(),NOW())`,
      [id, key, b.name, b.role, b.type || 'role_journey', b.description || null, b.active === false ? 0 : 1]
    );
    return c.json({ success: true, data: { id, key } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create tour'); }
});

guides.put('/admin/tours/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['name', 'role', 'type', 'description', 'active']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(typeof b[key] === 'boolean' ? (b[key] ? 1 : 0) : b[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE guide_tours SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update tour'); }
});

guides.delete('/admin/tours/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    await getDb(c.env).query('DELETE FROM guide_tours WHERE id=$1', [c.req.param('id')]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete tour'); }
});

guides.get('/admin/tours/:id/steps', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const rows = await getDb(c.env).query<any>('SELECT * FROM guide_steps WHERE tour_id=$1 ORDER BY position, created_at', [c.req.param('id')]);
    return c.json({ success: true, data: rows.rows.map((s: any) => ({ ...s, arrow: !!s.arrow, optional: !!s.optional, requires_access: !!s.requires_access })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load steps'); }
});

guides.post('/admin/tours/:id/steps', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.title || !b.route) return fail(c, 400, 'Step title and route are required');
    const id = crypto.randomUUID();
    const pos = Number(b.position) || 0;
    await getDb(c.env).query(
      `INSERT INTO guide_steps (id,tour_id,position,route,selector,title,body,placement,arrow,spotlight_padding,optional,requires_access,action,prompt,chapter,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())`,
      [id, c.req.param('id'), pos, b.route, b.selector || '[data-tour="page-content"]', b.title, b.body || '', b.placement || 'auto', b.arrow === false ? 0 : 1, Number(b.spotlight_padding) || 8, b.optional ? 1 : 0, b.requires_access ? 1 : 0, b.action || 'none', b.prompt || null, b.chapter || null]
    );
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create step'); }
});

guides.put('/admin/steps/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['position', 'route', 'selector', 'title', 'body', 'placement', 'arrow', 'spotlight_padding', 'optional', 'requires_access', 'action', 'prompt', 'chapter']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(typeof b[key] === 'boolean' ? (b[key] ? 1 : 0) : b[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE guide_steps SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update step'); }
});

guides.delete('/admin/steps/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    await getDb(c.env).query('DELETE FROM guide_steps WHERE id=$1', [c.req.param('id')]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete step'); }
});

guides.post('/admin/tours/:id/reorder', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const b: any = await c.req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(b.step_ids) ? b.step_ids : [];
    for (let i = 0; i < ids.length; i++) {
      await getDb(c.env).query('UPDATE guide_steps SET position=$1, updated_at=NOW() WHERE id=$2 AND tour_id=$3', [i, ids[i], c.req.param('id')]);
    }
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to reorder steps'); }
});

guides.post('/admin/tours/:id/publish', async (c) => {
  try {
    const s = await requireRole(c, ADMIN);
    const db = getDb(c.env);
    const tour = (await db.query<any>('SELECT * FROM guide_tours WHERE id=$1', [c.req.param('id')])).rows[0];
    if (!tour) return fail(c, 404, 'Tour not found');
    const steps = await db.query<any>('SELECT * FROM guide_steps WHERE tour_id=$1 ORDER BY position', [tour.id]);
    const version = Number(tour.version || 1) + 1;
    await db.query(
      `INSERT INTO guide_tour_versions (id,tour_id,version,snapshot,created_by) VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), tour.id, version, JSON.stringify({ tour, steps: steps.rows }), s.userId]
    );
    await db.query('UPDATE guide_tours SET version=$1, active=1, updated_at=NOW() WHERE id=$2', [version, tour.id]);
    return c.json({ success: true, data: { version } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to publish tour'); }
});

guides.post('/admin/progress/:userId/reset', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const b: any = await c.req.json().catch(() => ({}));
    if (b.tour_key) await getDb(c.env).query('DELETE FROM user_guide_progress WHERE user_id=$1 AND tour_key=$2', [c.req.param('userId'), b.tour_key]);
    else await getDb(c.env).query('DELETE FROM user_guide_progress WHERE user_id=$1', [c.req.param('userId')]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to reset progress'); }
});

guides.get('/admin/analytics', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const rows = await getDb(c.env).query<any>(
      `SELECT tour_key,event,COUNT(*)::int AS count FROM guide_events GROUP BY tour_key,event ORDER BY count DESC`
    );
    const progress = await getDb(c.env).query<any>(
      `SELECT tour_key,status,COUNT(*)::int AS count FROM user_guide_progress GROUP BY tour_key,status`
    );
    return c.json({ success: true, data: { events: rows.rows, progress: progress.rows } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load analytics'); }
});

export default guides;
