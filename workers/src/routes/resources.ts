import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';

const resources = new Hono<{ Bindings: Env }>();
const STAFF = ['instructor', 'admin', 'super_admin'];

// GET /api/v1/resources/course/:courseId
resources.get('/course/:courseId', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM resources WHERE course_id = $1 ORDER BY created_at DESC',
      [c.req.param('courseId')]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load resources');
  }
});

// GET /api/v1/resources/lesson/:lessonId
resources.get('/lesson/:lessonId', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM resources WHERE lesson_id = $1 ORDER BY created_at DESC',
      [c.req.param('lessonId')]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load resources');
  }
});

// POST /api/v1/resources (instructor/admin)
resources.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const { courseId, lessonId, title, fileUrl, fileType } = body;
    if (!courseId || !title) return fail(c, 400, 'courseId and title are required');

    const db = getDb(c.env);
    const course = await db.query<any>('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
    if (!course.rows.length) return fail(c, 404, 'Course not found');
    if (!['admin', 'super_admin'].includes(s.role) && course.rows[0].instructor_id !== s.userId) {
      return fail(c, 403, 'You can only add resources to your own courses');
    }

    const { rows } = await db.query<any>(
      `INSERT INTO resources (course_id, lesson_id, title, file_url, file_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [courseId, lessonId || null, title, fileUrl || '', fileType || '']
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create resource');
  }
});

// DELETE /api/v1/resources/:id
resources.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT r.*, c.instructor_id FROM resources r JOIN courses c ON r.course_id = c.id WHERE r.id = $1`,
      [c.req.param('id')]
    );
    const resource = rows[0];
    if (!resource) return fail(c, 404, 'Resource not found');
    if (!['admin', 'super_admin'].includes(s.role) && resource.instructor_id !== s.userId) {
      return fail(c, 403, 'You can only delete resources from your own courses');
    }
    await db.query('DELETE FROM resources WHERE id = $1', [resource.id]);
    return c.json({ success: true, message: 'Resource deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete resource');
  }
});

export default resources;
