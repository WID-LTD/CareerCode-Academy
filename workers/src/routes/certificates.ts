import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { authenticate } from '../auth-helpers';

const certificates = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

// GET /api/v1/certificates?page=&limit=
certificates.get('/', async (c) => {
  try {
    const s = await authenticate(c).catch((e: any) => {
      throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
    });
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20') || 20));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);
    const { rows } = await db.query(
      `SELECT cert.*, c.title as course_title, c.category, u.name as user_name
       FROM certificates cert JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.user_id = $1 ORDER BY cert.issued_at DESC LIMIT $2 OFFSET $3`,
      [s.userId, limit, offset]
    );
    const total = await db.query<{ count: string }>('SELECT COUNT(*)::int as total FROM certificates WHERE user_id = $1', [s.userId]);
    const totalN = Number((total.rows[0] as any)?.total) || 0;
    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load certificates');
  }
});

// GET /api/v1/certificates/verify/:code (public)
certificates.get('/verify/:code', async (c) => {
  try {
    const { rows } = await getDb(c.env).query(
      `SELECT cert.*, c.title as course_title, c.category, u.name as user_name, u.email as user_email
       FROM certificates cert JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.verification_code = $1`,
      [c.req.param('code')]
    );
    if (!rows.length) return err(c, 404, 'Certificate not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to verify certificate');
  }
});

export default certificates;
