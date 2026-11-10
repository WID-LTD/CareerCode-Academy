import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';

const modules = new Hono<{ Bindings: Env }>();
const STAFF = ['instructor', 'admin', 'super_admin'];

async function moduleWithOwner(env: Env, id: string) {
  const { rows } = await getDb(env).query<any>(
    `SELECT m.*, c.instructor_id FROM modules m JOIN courses c ON m.course_id = c.id WHERE m.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// GET /api/v1/modules/course/:courseId
modules.get('/course/:courseId', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index ASC, created_at ASC',
      [c.req.param('courseId')]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load modules');
  }
});

// POST /api/v1/modules
modules.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const { courseId, title, orderIndex } = body;
    if (!courseId || !title) return fail(c, 400, 'courseId and title are required');

    const course = await getDb(c.env).query<any>('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
    if (!course.rows.length) return fail(c, 404, 'Course not found');
    if (s.role !== 'admin' && s.role !== 'super_admin' && course.rows[0].instructor_id !== s.userId) {
      return fail(c, 403, 'You can only add modules to your own courses');
    }

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO modules (course_id, title, order_index) VALUES ($1, $2, $3) RETURNING *`,
      [courseId, title, Number(orderIndex) || 0]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create module');
  }
});

// PUT /api/v1/modules/:id
modules.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const moduleItem = await moduleWithOwner(c.env, c.req.param('id'));
    if (!moduleItem) return fail(c, 404, 'Module not found');
    if (s.role !== 'admin' && s.role !== 'super_admin' && moduleItem.instructor_id !== s.userId) {
      return fail(c, 403, 'You can only edit modules in your own courses');
    }
    const body: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE modules
       SET title = COALESCE($1, title), order_index = COALESCE($2, order_index), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [body.title ?? null, body.orderIndex ?? null, moduleItem.id]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update module');
  }
});

// DELETE /api/v1/modules/:id
modules.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const moduleItem = await moduleWithOwner(c.env, c.req.param('id'));
    if (!moduleItem) return fail(c, 404, 'Module not found');
    if (s.role !== 'admin' && s.role !== 'super_admin' && moduleItem.instructor_id !== s.userId) {
      return fail(c, 403, 'You can only delete modules in your own courses');
    }
    await getDb(c.env).query('DELETE FROM modules WHERE id = $1', [moduleItem.id]);
    return c.json({ success: true, message: 'Module deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete module');
  }
});

export default modules;
