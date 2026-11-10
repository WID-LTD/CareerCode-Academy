import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';

// Ported from backend/src/routes/promotion.routes.ts + backend/src/models/promotion.ts.
// Mounted at /api/v1/promotions. Socket dashboard emits are dropped.

const promotions = new Hono<{ Bindings: Env }>();

const ADMIN_ROLES = ['admin', 'super_admin'];
const SCOPES = ['all', 'category', 'course'];

const SELECT_META = `
  SELECT p.*,
    c.name as category_name,
    co.title as course_title
  FROM promotions p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN courses co ON p.course_id = co.id
`;

/** Promotions are optional marketing data — reads must never break courses. */
function isMissingPromotionsTable(err: any): boolean {
  const code = err?.code;
  const msg = String(err?.message || '').toLowerCase();
  return code === '42P01' || (msg.includes('promotions') && (msg.includes('does not exist') || msg.includes('no such table')));
}

async function logAudit(c: any, entry: {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: string;
}): Promise<void> {
  try {
    await getDb(c.env).query(
      `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.adminId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.details || null,
        c.req.header('cf-connecting-ip') || null,
        c.req.header('user-agent') || null,
      ]
    );
  } catch {
    /* audit logging is best-effort */
  }
}

function validation(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

function dateValue(v: any): Date | null {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Shared shape checks. `partial` mirrors the update schema. */
function checkPromotion(body: any, partial: boolean): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has('title')) {
    if (typeof body.title !== 'string' || body.title.length < 3 || body.title.length > 200) {
      errors.title = ['String must contain at least 3 character(s)'];
    }
  }
  if (!partial || has('description')) {
    if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) {
      errors.description = ['String must contain at most 5000 character(s)'];
    }
  }
  if (has('slug')) {
    if (typeof body.slug !== 'string' || body.slug.length < 2 || body.slug.length > 100 || !/^[a-z0-9-]+$/i.test(body.slug)) {
      errors.slug = ['Invalid slug'];
    }
  }
  if (!partial || has('discount_percent')) {
    if (typeof body.discount_percent !== 'number' || body.discount_percent < 0.01 || body.discount_percent > 100) {
      errors.discount_percent = ['Number must be between 0.01 and 100'];
    }
  }
  if (!partial || has('scope')) {
    if (!SCOPES.includes(body.scope)) {
      errors.scope = ['Invalid enum value'];
    }
  }

  if (!partial) {
    if (body.starts_at === undefined || dateValue(body.starts_at) === null) {
      errors.starts_at = ['Invalid date'];
    }
    if (body.ends_at === undefined || dateValue(body.ends_at) === null) {
      errors.ends_at = ['Invalid date'];
    }
  } else {
    if (has('starts_at') && dateValue(body.starts_at) === null) errors.starts_at = ['Invalid date'];
    if (has('ends_at') && dateValue(body.ends_at) === null) errors.ends_at = ['Invalid date'];
  }

  if (body.scope === 'category' && !body.category_id) {
    errors.category_id = ['category_id is required for category scope'];
  }
  if (body.scope === 'course' && !body.course_id) {
    errors.course_id = ['course_id is required for course scope'];
  }
  if (body.scope === 'all' && (body.category_id || body.course_id)) {
    errors.scope = ['category_id/course_id must be empty for all scope'];
  }

  const starts = has('starts_at') ? dateValue(body.starts_at) : null;
  const ends = has('ends_at') ? dateValue(body.ends_at) : null;
  if (!partial) {
    if (starts && ends && ends <= starts) errors.ends_at = ['ends_at must be after starts_at'];
  } else if (starts && ends && ends <= starts) {
    errors.ends_at = ['ends_at must be after starts_at'];
  }

  return errors;
}

async function listPromotions(env: Env): Promise<any[]> {
  try {
    const { rows } = await getDb(env).query<any>(`${SELECT_META} ORDER BY p.created_at DESC`);
    return rows;
  } catch (err) {
    if (isMissingPromotionsTable(err)) return [];
    throw err;
  }
}

async function getActivePromotions(env: Env): Promise<any[]> {
  try {
    const { rows } = await getDb(env).query<any>(
      `${SELECT_META}
       WHERE p.is_active = true AND p.starts_at <= NOW() AND p.ends_at > NOW()
       ORDER BY p.ends_at ASC`
    );
    return rows;
  } catch (err) {
    if (isMissingPromotionsTable(err)) return [];
    throw err;
  }
}

async function getPromotionById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(`${SELECT_META} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

async function getPromotionBySlug(env: Env, slug: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(`${SELECT_META} WHERE p.slug = $1`, [slug]);
  return rows[0] || null;
}

// GET /api/v1/promotions/active — public
promotions.get('/active', async (c) => {
  try {
    return c.json({ success: true, data: await getActivePromotions(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load promotions');
  }
});

// GET /api/v1/promotions — admin: list all
promotions.get('/', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    return c.json({ success: true, data: await listPromotions(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load promotions');
  }
});

// POST /api/v1/promotions — admin: create
promotions.post('/', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkPromotion(body, false);
    if (Object.keys(errors).length) return validation(c, errors);

    if (body.slug) {
      const existing = await getPromotionBySlug(c.env, body.slug);
      if (existing) return fail(c, 409, 'A promotion with this slug already exists');
    }

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO promotions (title, description, slug, discount_percent, scope, category_id, course_id, starts_at, ends_at, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        body.title,
        body.description || null,
        body.slug || null,
        body.discount_percent,
        body.scope,
        body.category_id || null,
        body.course_id || null,
        dateValue(body.starts_at),
        dateValue(body.ends_at),
        body.is_active ?? true,
        s.userId,
      ]
    );

    await logAudit(c, {
      adminId: s.userId,
      action: 'promotion.create',
      resourceType: 'promotion',
      resourceId: rows[0].id,
      details: `Created promotional event "${rows[0].title}"`,
    });

    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create promotion');
  }
});

// PUT /api/v1/promotions/:id — admin: update
promotions.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkPromotion(body, true);
    if (Object.keys(errors).length) return validation(c, errors);

    const existing = await getPromotionById(c.env, id);
    if (!existing) return fail(c, 404, 'Promotion not found');

    if (body.slug && body.slug !== existing.slug) {
      const dup = await getPromotionBySlug(c.env, body.slug);
      if (dup && dup.id !== existing.id) return fail(c, 409, 'A promotion with this slug already exists');
    }

    const allowed = [
      'title', 'description', 'slug', 'discount_percent', 'scope',
      'category_id', 'course_id', 'starts_at', 'ends_at', 'is_active',
    ];
    const sets: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      let value = body[key];
      if (key === 'starts_at' || key === 'ends_at') value = dateValue(value);
      values.push(value === null ? null : value);
      sets.push(`${key} = $${values.length}`);
    }

    let promotion: any = existing;
    if (sets.length) {
      sets.push('updated_at = NOW()');
      values.push(id);
      const { rows } = await getDb(c.env).query<any>(
        `UPDATE promotions SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      promotion = rows[0] || null;
    }

    await logAudit(c, {
      adminId: s.userId,
      action: 'promotion.update',
      resourceType: 'promotion',
      resourceId: id,
      details: `Updated promotional event "${existing.title}"`,
    });

    return c.json({ success: true, data: promotion });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update promotion');
  }
});

// DELETE /api/v1/promotions/:id — admin: delete
promotions.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const id = c.req.param('id');
    const existing = await getPromotionById(c.env, id);
    if (!existing) return fail(c, 404, 'Promotion not found');

    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM promotions WHERE id = $1 RETURNING id',
      [id]
    );

    await logAudit(c, {
      adminId: s.userId,
      action: 'promotion.delete',
      resourceType: 'promotion',
      resourceId: id,
      details: `Deleted promotional event "${existing.title}"`,
    });

    return c.json({ success: true, data: { deleted: rows.length > 0 } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete promotion');
  }
});

export default promotions;
