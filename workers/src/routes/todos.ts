import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';

const todos = new Hono<{ Bindings: Env }>();

const PRIORITIES = ['low', 'medium', 'high'];
const CATEGORIES = ['personal', 'study', 'career', 'admin'];
const STATUSES = ['open', 'done'];

function clean(value: any, max = 2000): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
}

async function createTodo(env: Env, userId: string, input: any): Promise<any> {
  const db = getDb(env);
  const id = crypto.randomUUID();
  const priority = PRIORITIES.includes(input.priority) ? input.priority : 'medium';
  const category = CATEGORIES.includes(input.category) ? input.category : 'personal';
  const { rows } = await db.query<any>(
    `INSERT INTO todos (id, user_id, title, notes, due_at, priority, category, course_id, lesson_id, path_id, source, auto_key, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      id,
      userId,
      String(input.title || '').trim().slice(0, 300),
      clean(input.notes),
      input.due_at || null,
      priority,
      category,
      input.course_id || null,
      input.lesson_id || null,
      input.path_id || null,
      clean(input.source, 40) || 'manual',
      input.auto_key || null,
      Number(input.sort_order) || 0,
    ]
  );
  return rows[0];
}

// GET /api/v1/todos?status=open&category=study&due=today
todos.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const status = c.req.query('status');
    const category = c.req.query('category');
    const due = c.req.query('due');
    const search = c.req.query('search');
    const clauses = ['user_id = $1'];
    const params: any[] = [s.userId];

    if (status && STATUSES.includes(status)) { params.push(status); clauses.push(`status = $${params.length}`); }
    if (category && CATEGORIES.includes(category)) { params.push(category); clauses.push(`category = $${params.length}`); }
    if (due === 'today') clauses.push(`due_at IS NOT NULL AND date(due_at) = date('now')`);
    if (due === 'overdue') clauses.push(`due_at IS NOT NULL AND date(due_at) < date('now') AND status = 'open'`);
    if (due === 'week') clauses.push(`due_at IS NOT NULL AND date(due_at) <= date('now', '+7 day')`);
    if (search) { params.push(`%${search}%`); clauses.push(`(title LIKE $${params.length} OR notes LIKE $${params.length})`); }

    const { rows } = await db.query<any>(
      `SELECT * FROM todos WHERE ${clauses.join(' AND ')}
       ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END,
                CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
                due_at ASC, sort_order ASC, created_at DESC
       LIMIT 500`,
      params
    );

    const stats = await db.query<any>(
      `SELECT
         COUNT(*)::int AS total,
         SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)::int AS open,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END)::int AS done,
         SUM(CASE WHEN status = 'open' AND due_at IS NOT NULL AND date(due_at) < date('now') THEN 1 ELSE 0 END)::int AS overdue,
         SUM(CASE WHEN status = 'open' AND due_at IS NOT NULL AND date(due_at) = date('now') THEN 1 ELSE 0 END)::int AS today
       FROM todos WHERE user_id = $1`,
      [s.userId]
    );

    return c.json({ success: true, data: rows, stats: stats.rows[0] || { total: 0, open: 0, done: 0, overdue: 0, today: 0 } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load to-dos');
  }
});

// POST /api/v1/todos
todos.post('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.title || !String(body.title).trim()) return fail(c, 400, 'title is required');
    const row = await createTodo(c.env, s.userId, body);
    return c.json({ success: true, data: row }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create to-do');
  }
});

// PUT /api/v1/todos/:id
todos.put('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const existing = await db.query<any>('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [c.req.param('id'), s.userId]);
    if (!existing.rows.length) return fail(c, 404, 'To-do not found');

    const priority = body.priority && PRIORITIES.includes(body.priority) ? body.priority : existing.rows[0].priority;
    const category = body.category && CATEGORIES.includes(body.category) ? body.category : existing.rows[0].category;
    const status = body.status && STATUSES.includes(body.status) ? body.status : existing.rows[0].status;
    const { rows } = await db.query<any>(
      `UPDATE todos SET
         title = COALESCE($1, title), notes = COALESCE($2, notes), due_at = COALESCE($3, due_at),
         priority = $4, category = $5, status = $6,
         completed_at = CASE WHEN $6 = 'done' THEN COALESCE(completed_at, NOW()) ELSE NULL END,
         updated_at = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [
        clean(body.title, 300), body.notes !== undefined ? clean(body.notes) : null,
        body.due_at !== undefined ? (body.due_at || null) : existing.rows[0].due_at,
        priority, category, status, c.req.param('id'), s.userId,
      ]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update to-do');
  }
});

// PATCH /api/v1/todos/:id/toggle
todos.patch('/:id/toggle', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `UPDATE todos SET
         status = CASE WHEN status = 'open' THEN 'done' ELSE 'open' END,
         completed_at = CASE WHEN status = 'open' THEN NOW() ELSE NULL END,
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [c.req.param('id'), s.userId]
    );
    if (!rows.length) return fail(c, 404, 'To-do not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update to-do');
  }
});

// DELETE /api/v1/todos/:id
todos.delete('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING id',
      [c.req.param('id'), s.userId]
    );
    if (!rows.length) return fail(c, 404, 'To-do not found');
    return c.json({ success: true, message: 'To-do deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete to-do');
  }
});

// POST /api/v1/todos/bulk { action: 'complete'|'delete'|'reorder', ids, order }
todos.post('/bulk', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) return fail(c, 400, 'ids is required');
    const db = getDb(c.env);

    if (body.action === 'delete') {
      for (const id of ids) await db.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, s.userId]);
    } else if (body.action === 'complete') {
      for (const id of ids) {
        await db.query(
          `UPDATE todos SET status = 'done', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [id, s.userId]
        );
      }
    } else if (body.action === 'reorder' && Array.isArray(body.order)) {
      for (let i = 0; i < body.order.length; i++) {
        await db.query('UPDATE todos SET sort_order = $1 WHERE id = $2 AND user_id = $3', [i, String(body.order[i]), s.userId]);
      }
    } else {
      return fail(c, 400, 'Unsupported bulk action');
    }
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Bulk update failed');
  }
});

// POST /api/v1/todos/generate/path/:slug — create tasks for every course in a path
todos.post('/generate/path/:slug', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const path = await db.query<any>('SELECT id, title, slug FROM learning_paths WHERE slug = $1', [c.req.param('slug')]);
    if (!path.rows.length) return fail(c, 404, 'Learning path not found');
    const p = path.rows[0];
    const courses = await db.query<any>(
      `SELECT c.id, c.title, c.slug FROM learning_path_courses lpc
       JOIN courses c ON c.id = lpc.course_id WHERE lpc.path_id = $1 ORDER BY lpc.order_index ASC`,
      [p.id]
    );
    const created: any[] = [];
    for (let i = 0; i < courses.rows.length; i++) {
      const course = courses.rows[i];
      const autoKey = `path:${p.id}:course:${course.id}`;
      const existing = await db.query<any>('SELECT id FROM todos WHERE user_id = $1 AND auto_key = $2', [s.userId, autoKey]);
      if (existing.rows.length) continue;
      const row = await createTodo(c.env, s.userId, {
        title: `Work through: ${course.title}`,
        notes: `Part of the ${p.title} learning path.`,
        category: 'study',
        priority: i === 0 ? 'high' : 'medium',
        course_id: course.id,
        path_id: p.id,
        source: 'path',
        auto_key: autoKey,
        sort_order: i,
      });
      created.push(row);
    }
    return c.json({ success: true, data: created, message: `${created.length} task(s) added` }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to generate path tasks');
  }
});

// POST /api/v1/todos/generate/assignments — sync open assignments into to-dos
todos.post('/generate/assignments', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT a.id, a.title, a.due_date, a.course_id
       FROM assignments a
       JOIN enrollments e ON e.course_id = a.course_id AND e.user_id = $1
       WHERE a.due_date IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1)
       ORDER BY a.due_date ASC LIMIT 100`,
      [s.userId]
    );
    const created: any[] = [];
    for (const a of rows) {
      const autoKey = `assignment:${a.id}`;
      const existing = await db.query<any>('SELECT id FROM todos WHERE user_id = $1 AND auto_key = $2', [s.userId, autoKey]);
      if (existing.rows.length) continue;
      created.push(await createTodo(c.env, s.userId, {
        title: `Submit: ${a.title}`,
        category: 'study',
        priority: 'high',
        due_at: a.due_date,
        course_id: a.course_id,
        source: 'assignment',
        auto_key: autoKey,
      }));
    }
    return c.json({ success: true, data: created, message: `${created.length} assignment task(s) added` }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to sync assignments');
  }
});

export default todos;
