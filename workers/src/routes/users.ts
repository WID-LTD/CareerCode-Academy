import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

const users = new Hono<{ Bindings: Env }>();

const PUBLIC_COLS =
  'id, name, email, role, avatar, bio, headline, location, website, github, twitter, linkedin, expertise, is_verified, is_suspended, allowed_dashboards, created_at, updated_at';

// GET /api/v1/users (admin)
users.get('/', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT ${PUBLIC_COLS} FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await db.query<{ count: number }>('SELECT COUNT(*)::int as count FROM users');
    const totalN = Number(total.rows[0]?.count) || 0;
    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load users');
  }
});

// GET /api/v1/users/me/preferences (before /:id)
users.get('/me/preferences', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT data FROM user_preferences WHERE user_id = $1',
      [s.userId]
    );
    let data: any = {};
    try { data = rows[0]?.data ? JSON.parse(rows[0].data) : {}; } catch { data = {}; }
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load preferences');
  }
});

// PUT /api/v1/users/me/preferences
users.put('/me/preferences', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const data = body?.data ?? body ?? {};
    await getDb(c.env).query(
      `INSERT INTO user_preferences (user_id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [s.userId, JSON.stringify(data)]
    );
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save preferences');
  }
});

// GET /api/v1/users/:id
users.get('/:id', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`,
      [c.req.param('id')]
    );
    if (!rows.length) return fail(c, 404, 'User not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load user');
  }
});

// PUT /api/v1/users/:id
users.put('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const id = c.req.param('id');
    if (s.role !== 'admin' && s.role !== 'super_admin' && s.userId !== id) return fail(c, 403, 'Forbidden');

    const body: any = await c.req.json().catch(() => ({}));
    const allowed = ['name', 'bio', 'avatar', 'headline', 'location', 'website', 'github', 'twitter', 'linkedin', 'expertise'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${values.length + 1}`);
        values.push(key === 'expertise' ? JSON.stringify(body[key]) : body[key]);
      }
    }
    // role/verification are admin-only
    if (['admin', 'super_admin'].includes(s.role)) {
      if (body.role !== undefined) { fields.push(`role = $${values.length + 1}`); values.push(body.role); }
      if (body.isVerified !== undefined) { fields.push(`is_verified = $${values.length + 1}`); values.push(!!body.isVerified); }
      if (body.isSuspended !== undefined) { fields.push(`is_suspended = $${values.length + 1}`); values.push(!!body.isSuspended); }
    }

    const db = getDb(c.env);
    if (!fields.length) {
      const { rows } = await db.query<any>(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [id]);
      if (!rows.length) return fail(c, 404, 'User not found');
      return c.json({ success: true, data: rows[0] });
    }
    fields.push('updated_at = NOW()');
    values.push(id);
    const { rows } = await db.query<any>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING ${PUBLIC_COLS}`,
      values
    );
    if (!rows.length) return fail(c, 404, 'User not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update user');
  }
});

// DELETE /api/v1/users/:id (admin)
users.delete('/:id', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const { rows } = await getDb(c.env).query<any>('DELETE FROM users WHERE id = $1 RETURNING id', [c.req.param('id')]);
    if (!rows.length) return fail(c, 404, 'User not found');
    return c.json({ success: true, message: 'User deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete user');
  }
});

export default users;
