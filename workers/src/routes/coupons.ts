import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';

const coupons = new Hono<{ Bindings: Env }>();
const ADMIN = ['admin', 'super_admin'];

function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `CC-${out}`;
}

function parseRow(row: any) {
  return { ...row, value: Number(row.value) || 0, uses: Number(row.uses) || 0, max_uses: row.max_uses == null ? null : Number(row.max_uses) };
}

coupons.get('/', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT cc.*, c.title AS course_title, lp.title AS path_title
       FROM coupons cc
       LEFT JOIN courses c ON c.id = cc.course_id
       LEFT JOIN learning_paths lp ON lp.id = cc.path_id
       ORDER BY cc.created_at DESC LIMIT 500`
    );
    return c.json({ success: true, data: rows.map(parseRow) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load coupons');
  }
});

coupons.post('/', async (c) => {
  try {
    const s = await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const discountType = body.discount_type === 'amount' ? 'amount' : 'percent';
    const value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0) return fail(c, 400, 'Discount value must be greater than 0');
    if (discountType === 'percent' && value > 100) return fail(c, 400, 'Percentage cannot exceed 100');
    const maxUses = body.max_uses == null || body.max_uses === '' ? null : Math.max(1, Number(body.max_uses) || 1);
    const code = String(body.code || makeCode()).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (code.length < 4) return fail(c, 400, 'Code is too short');
    const db = getDb(c.env);
    const existing = await db.query<any>('SELECT id FROM coupons WHERE code = $1', [code]);
    if (existing.rows.length) return fail(c, 409, 'That coupon code already exists');
    const { rows } = await db.query<any>(
      `INSERT INTO coupons (code, discount_type, value, course_id, path_id, max_uses, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code, discountType, value, body.course_id || null, body.path_id || null, maxUses, body.expires_at || null, s.userId]
    );
    return c.json({ success: true, data: parseRow(rows[0]) }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create coupon');
  }
});

coupons.put('/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const status = ['active', 'disabled', 'expired'].includes(body.status) ? body.status : 'active';
    const { rows } = await getDb(c.env).query<any>(
      'UPDATE coupons SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, c.req.param('id')]
    );
    if (!rows.length) return fail(c, 404, 'Coupon not found');
    return c.json({ success: true, data: parseRow(rows[0]) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update coupon');
  }
});

coupons.delete('/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    await getDb(c.env).query('DELETE FROM coupons WHERE id=$1', [c.req.param('id')]);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete coupon');
  }
});

export default coupons;
