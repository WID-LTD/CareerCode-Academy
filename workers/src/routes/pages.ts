import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';

// Ported from backend/src/routes/page.routes.ts + backend/src/models/page.ts.
// Mounted at /api/v1/pages.

const pages = new Hono<{ Bindings: Env }>();

const ADMIN_ROLES = ['admin', 'super_admin'];

function validation(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

function isUniqueViolation(e: any): boolean {
  return e?.code === '23505' || /unique constraint/i.test(String(e?.message || ''));
}

// GET /api/v1/pages/:slug — public: published page only
pages.get('/:slug', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM pages WHERE slug = $1 AND published = true',
      [c.req.param('slug')]
    );
    if (!rows.length) return fail(c, 404, 'Page not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load page');
  }
});

// GET /api/v1/pages — admin: list all pages
pages.get('/', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const { rows } = await getDb(c.env).query<any>('SELECT * FROM pages ORDER BY title ASC');
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load pages');
  }
});

// POST /api/v1/pages — admin: create page
pages.post('/', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));

    const errors: Record<string, string[]> = {};
    if (typeof body.slug !== 'string' || body.slug.length < 1 || body.slug.length > 200) {
      errors.slug = ['String must contain at least 1 character(s)'];
    }
    if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
      errors.title = ['String must contain at least 1 character(s)'];
    }
    if (Object.keys(errors).length) return validation(c, errors);

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO pages (slug, title, content, meta, published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        body.slug,
        body.title,
        body.content === undefined ? null : JSON.stringify(body.content),
        JSON.stringify(body.meta ?? {}),
        body.published ?? true,
      ]
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    if (isUniqueViolation(e)) return fail(c, 409, 'Page slug already exists');
    return fail(c, statusOf(e), e?.message || 'Failed to create page');
  }
});

// PUT /api/v1/pages/:slug — admin: update page
pages.put('/:slug', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const slug = c.req.param('slug');
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
        return validation(c, { title: ['String must contain at least 1 character(s)'] });
      }
      fields.push(`title = $${idx++}`);
      values.push(body.title);
    }
    if (body.content !== undefined) {
      fields.push(`content = $${idx++}`);
      values.push(JSON.stringify(body.content));
    }
    if (body.meta !== undefined) {
      fields.push(`meta = $${idx++}`);
      values.push(JSON.stringify(body.meta));
    }
    if (body.published !== undefined) {
      fields.push(`published = $${idx++}`);
      values.push(body.published);
    }

    if (!fields.length) {
      const { rows } = await db.query<any>(
        'SELECT * FROM pages WHERE slug = $1 AND published = true',
        [slug]
      );
      if (!rows.length) return fail(c, 404, 'Page not found');
      return c.json({ success: true, data: rows[0] });
    }

    fields.push('updated_at = NOW()');
    values.push(slug);
    const { rows } = await db.query<any>(
      `UPDATE pages SET ${fields.join(', ')} WHERE slug = $${idx} RETURNING *`,
      values
    );
    if (!rows.length) return fail(c, 404, 'Page not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update page');
  }
});

// DELETE /api/v1/pages/:slug — admin: delete page
pages.delete('/:slug', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    // DbClient has no rowCount; RETURNING gives us the same signal.
    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM pages WHERE slug = $1 RETURNING id',
      [c.req.param('slug')]
    );
    if (!rows.length) return fail(c, 404, 'Page not found');
    return c.json({ success: true, message: 'Page deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete page');
  }
});

export default pages;
