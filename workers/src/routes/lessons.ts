import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

const lessons = new Hono<{ Bindings: Env }>();

const STAFF = ['instructor', 'admin', 'super_admin'];

async function courseOfLesson(env: Env, lessonId: string) {
  const { rows } = await getDb(env).query<any>('SELECT * FROM lessons WHERE id = $1', [lessonId]);
  return rows[0] || null;
}

async function canManage(env: Env, courseId: string, session: { userId: string; role: string }) {
  const { rows } = await getDb(env).query<any>('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
  if (!rows.length) return false;
  return session.role === 'admin' || session.role === 'super_admin' || rows[0].instructor_id === session.userId;
}

// GET /api/v1/lessons/:id
lessons.get('/:id', async (c) => {
  try {
    const lesson = await courseOfLesson(c.env, c.req.param('id'));
    if (!lesson) return fail(c, 404, 'Lesson not found');
    const course = await getDb(c.env).query<any>('SELECT * FROM courses WHERE id = $1', [lesson.course_id]);
    if (!course.rows.length || !course.rows[0].published) return fail(c, 404, 'Lesson not found');
    return c.json({ success: true, data: lesson });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load lesson');
  }
});

// POST /api/v1/lessons (instructor/admin)
lessons.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const { courseId, title, description, videoUrl, duration, orderIndex, resources, isFree } = body;
    if (!courseId || !title || !description) return fail(c, 400, 'courseId, title and description are required');
    if (!(await canManage(c.env, courseId, s))) return fail(c, 403, 'You can only add lessons to your own courses');

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO lessons (course_id, title, description, video_url, duration, order_index, resources, is_free)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        courseId, title, description, videoUrl || null, Number(duration) || 0, Number(orderIndex) || 0,
        resources ? JSON.stringify(resources) : null, !!isFree,
      ]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create lesson');
  }
});

// PUT /api/v1/lessons/:id
lessons.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const lesson = await courseOfLesson(c.env, c.req.param('id'));
    if (!lesson) return fail(c, 404, 'Lesson not found');
    if (!(await canManage(c.env, lesson.course_id, s))) return fail(c, 403, 'You can only edit lessons in your own courses');

    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    const push = (col: string, value: any) => { fields.push(`${col} = $${values.length + 1}`); values.push(value); };
    if (body.title !== undefined) push('title', body.title);
    if (body.description !== undefined) push('description', body.description);
    if (body.duration !== undefined) push('duration', body.duration);
    if (body.orderIndex !== undefined) push('order_index', body.orderIndex);
    if (body.resources !== undefined) push('resources', JSON.stringify(body.resources));
    if (body.isFree !== undefined) push('is_free', !!body.isFree);
    if (body.videoUrl) push('video_url', body.videoUrl);

    if (!fields.length) return c.json({ success: true, data: lesson });
    fields.push('updated_at = NOW()');
    values.push(lesson.id);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE lessons SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update lesson');
  }
});

// DELETE /api/v1/lessons/:id
lessons.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const lesson = await courseOfLesson(c.env, c.req.param('id'));
    if (!lesson) return fail(c, 404, 'Lesson not found');
    if (!(await canManage(c.env, lesson.course_id, s))) return fail(c, 403, 'You can only delete lessons in your own courses');
    await getDb(c.env).query('DELETE FROM lessons WHERE id = $1', [lesson.id]);
    return c.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete lesson');
  }
});

// GET /api/v1/lessons/:id/notes
lessons.get('/:id/notes', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<{ content: string }>(
      'SELECT content FROM lesson_notes WHERE user_id = $1 AND lesson_id = $2',
      [s.userId, c.req.param('id')]
    );
    return c.json({ success: true, data: rows[0]?.content || '' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load notes');
  }
});

// POST /api/v1/lessons/:id/notes
lessons.post('/:id/notes', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    await getDb(c.env).query(
      `INSERT INTO lesson_notes (user_id, lesson_id, content, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET content = $3, updated_at = NOW()`,
      [s.userId, c.req.param('id'), body.content || '']
    );
    return c.json({ success: true, message: 'Notes saved' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save notes');
  }
});

export default lessons;
