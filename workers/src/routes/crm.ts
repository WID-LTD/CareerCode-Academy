import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';

const crm = new Hono<{ Bindings: Env }>();
const ADMIN = ['admin', 'super_admin'];

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

crm.get('/overview', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const db = getDb(c.env);
    const [users, trials, expiring, paid, revenue] = await Promise.all([
      db.query<any>('SELECT COUNT(*)::int n FROM users'),
      db.query<any>(`SELECT COUNT(*)::int n FROM enrollments WHERE access_type='trial' AND trial_ends_at > NOW()`),
      db.query<any>(`SELECT COUNT(*)::int n FROM enrollments WHERE access_type='trial' AND trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'`),
      db.query<any>(`SELECT COUNT(*)::int n FROM enrollments WHERE access_type='paid'`),
      db.query<any>(`SELECT COALESCE(SUM(amount),0) total FROM payments WHERE status='completed'`),
    ]);
    return c.json({ success: true, data: {
      users: users.rows[0]?.n || 0,
      active_trials: trials.rows[0]?.n || 0,
      expiring_trials: expiring.rows[0]?.n || 0,
      paid_enrollments: paid.rows[0]?.n || 0,
      revenue: Number(revenue.rows[0]?.total) || 0,
    }});
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load CRM overview'); }
});

crm.get('/users/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const db = getDb(c.env);
    const user = (await db.query<any>('SELECT id,name,email,role,avatar,is_suspended,is_verified,created_at,last_login FROM users WHERE id=$1', [c.req.param('id')])).rows[0];
    if (!user) return fail(c, 404, 'User not found');
    const courses = (await db.query<any>(
      `SELECT e.id AS enrollment_id, e.course_id, e.access_type, e.status, e.progress, e.completed,
              e.enrolled_at, e.trial_started_at, e.trial_ends_at,
              c.title, c.slug, c.price, c.thumbnail, c.level, c.category,
              (SELECT COUNT(*)::int FROM projects p WHERE p.user_id=e.user_id AND p.course_id=e.course_id) AS projects,
              (SELECT COUNT(*)::int FROM user_badges ub WHERE ub.user_id=e.user_id AND ub.status='awarded') AS badges
       FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 ORDER BY e.enrolled_at DESC`,
      [user.id]
    )).rows.map((r: any) => ({ ...r, trial_days_remaining: r.access_type === 'trial' ? daysLeft(r.trial_ends_at) : null }));
    const payments = (await db.query<any>(
      `SELECT id,reference,amount,currency,status,provider,created_at FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [user.id]
    )).rows;
    return c.json({ success: true, data: { user, courses, payments } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load user CRM'); }
});

crm.put('/users/:id/courses/:courseId/trial', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const course = (await db.query<any>('SELECT * FROM courses WHERE id=$1', [c.req.param('courseId')])).rows[0];
    if (!course) return fail(c, 404, 'Course not found');
    const days = Math.max(1, Number(body.days) || 7);
    const startsAt = body.starts_at || new Date().toISOString();
    const endsAt = body.ends_at || new Date(new Date(startsAt).getTime() + days * 86400000).toISOString();
    const existing = (await db.query<any>('SELECT id FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), course.id])).rows[0];
    let row: any;
    if (existing) {
      row = (await db.query<any>(
        `UPDATE enrollments SET access_type='trial', status='active', trial_started_at=$1, trial_ends_at=$2, enrolled_at=NOW() WHERE id=$3 RETURNING *`,
        [startsAt, endsAt, existing.id]
      )).rows[0];
    } else {
      row = (await db.query<any>(
        `INSERT INTO enrollments (user_id,course_id,status,access_type,trial_started_at,trial_ends_at,progress,completed_lessons,completed)
         VALUES ($1,$2,'active','trial',$3,$4,0,'[]',false) RETURNING *`,
        [c.req.param('id'), course.id, startsAt, endsAt]
      )).rows[0];
    }
    return c.json({ success: true, data: { ...row, trial_days_remaining: daysLeft(endsAt) } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update trial'); }
});

crm.post('/users/:id/trial-all', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const days = Math.max(1, Number(body.days) || 7);
    const startsAt = body.starts_at || new Date().toISOString();
    const endsAt = body.ends_at || new Date(new Date(startsAt).getTime() + days * 86400000).toISOString();
    const courses = await db.query<any>('SELECT id FROM courses WHERE published=1');
    for (const course of courses.rows) {
      const existing = (await db.query<any>('SELECT id, access_type FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), course.id])).rows[0];
      if (existing && ['paid', 'admin_grant'].includes(existing.access_type)) continue;
      if (existing) {
        await db.query(`UPDATE enrollments SET access_type='trial', status='active', trial_started_at=$1, trial_ends_at=$2, enrolled_at=NOW() WHERE id=$3`, [startsAt, endsAt, existing.id]);
      } else {
        await db.query(`INSERT INTO enrollments (user_id,course_id,status,access_type,trial_started_at,trial_ends_at,progress,completed_lessons,completed) VALUES ($1,$2,'active','trial',$3,$4,0,'[]',false)`, [c.req.param('id'), course.id, startsAt, endsAt]);
      }
    }
    return c.json({ success: true, data: { courses: courses.rows.length, days, starts_at: startsAt, ends_at: endsAt } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to start all-course trial'); }
});

crm.post('/users/:id/courses/:courseId/enroll', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const db = getDb(c.env);
    const existing = (await db.query<any>('SELECT id FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), c.req.param('courseId')])).rows[0];
    if (existing) {
      const row = (await db.query<any>(`UPDATE enrollments SET access_type='admin_grant', status='active', trial_ends_at=NULL WHERE id=$1 RETURNING *`, [existing.id])).rows[0];
      return c.json({ success: true, data: row });
    }
    const row = (await db.query<any>(
      `INSERT INTO enrollments (user_id,course_id,status,access_type,progress,completed_lessons,completed)
       VALUES ($1,$2,'active','admin_grant',0,'[]',false) RETURNING *`,
      [c.req.param('id'), c.req.param('courseId')]
    )).rows[0];
    return c.json({ success: true, data: row }, 201);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to grant access'); }
});

crm.delete('/users/:id/courses/:courseId/access', async (c) => {
  try {
    await requireRole(c, ADMIN);
    await getDb(c.env).query('DELETE FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), c.req.param('courseId')]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to revoke access'); }
});

crm.get('/courses/:courseId/roster', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT e.id AS enrollment_id, e.access_type, e.status, e.progress, e.trial_ends_at, e.enrolled_at,
              u.id AS user_id, u.name, u.email, u.avatar
       FROM enrollments e JOIN users u ON u.id=e.user_id WHERE e.course_id=$1 ORDER BY e.enrolled_at DESC`,
      [c.req.param('courseId')]
    );
    return c.json({ success: true, data: rows.map((r: any) => ({ ...r, trial_days_remaining: r.access_type === 'trial' ? daysLeft(r.trial_ends_at) : null })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load roster'); }
});

crm.get('/settings/trials', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const settings = (await getDb(c.env).query<any>("SELECT * FROM trial_settings WHERE id='default'")).rows[0];
    return c.json({ success: true, data: settings || null });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load trial settings'); }
});

crm.put('/settings/trials', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const b: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO trial_settings (id,enabled,default_days,campaign_start,campaign_end,certificate_allowed,oral_defense_allowed,gigo_daily_limit,max_trials,reset_allowed,updated_at)
       VALUES ('default',$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT(id) DO UPDATE SET enabled=$1,default_days=$2,campaign_start=$3,campaign_end=$4,certificate_allowed=$5,oral_defense_allowed=$6,gigo_daily_limit=$7,max_trials=$8,reset_allowed=$9,updated_at=NOW()
       RETURNING *`,
      [b.enabled ? 1 : 0, Number(b.default_days) || 7, b.campaign_start || null, b.campaign_end || null, b.certificate_allowed ? 1 : 0, b.oral_defense_allowed ? 1 : 0, Number(b.gigo_daily_limit) || 20, Number(b.max_trials) || 1, b.reset_allowed ? 1 : 0]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to save trial settings'); }
});

export default crm;
