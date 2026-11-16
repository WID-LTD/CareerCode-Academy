import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';
import { personDetail } from './crm';
import { logCrmActivity, syncInbox } from '../crm-service';

const instructorCrm = new Hono<{ Bindings: Env }>();
const STAFF = ['instructor', 'admin', 'super_admin'];

async function staff(c: any) {
  return requireRole(c, STAFF);
}

async function ownsStudent(env: Env, instructorId: string, userId: string): Promise<boolean> {
  const rows = await getDb(env).query<any>(
    `SELECT 1 FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 AND c.instructor_id=$2 LIMIT 1`,
    [userId, instructorId]
  );
  return rows.rows.length > 0;
}

instructorCrm.get('/overview', async (c) => {
  try {
    const s = await staff(c);
    const db = getDb(c.env);
    const id = s.userId;
    const [students, courses, risk, tasks, inbox, revenue, reviews, submissions, trend] = await Promise.all([
      db.query<any>(`SELECT
        COUNT(DISTINCT e.user_id)::int AS total,
        COUNT(DISTINCT CASE WHEN p.risk_score >= 60 THEN e.user_id END)::int AS at_risk,
        COUNT(DISTINCT CASE WHEN e.access_type='trial' THEN e.user_id END)::int AS trials,
        COUNT(DISTINCT CASE WHEN e.access_type IN ('paid','admin_grant') THEN e.user_id END)::int AS paid,
        COALESCE(AVG(e.progress),0)::float AS avg_progress,
        SUM(CASE WHEN e.completed=1 THEN 1 ELSE 0 END)::int AS completions
        FROM enrollments e JOIN courses c ON c.id=e.course_id LEFT JOIN crm_profiles p ON p.user_id=e.user_id
        WHERE c.instructor_id=$1`, [id]),
      db.query<any>(`SELECT COUNT(*)::int AS total, SUM(CASE WHEN published=1 THEN 1 ELSE 0 END)::int AS published FROM courses WHERE instructor_id=$1`, [id]),
      db.query<any>(`SELECT u.id,u.name,u.email,u.avatar,p.risk_score,p.lifecycle_stage,e.progress,c.title AS course_title
        FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=e.user_id LEFT JOIN crm_profiles p ON p.user_id=u.id
        WHERE c.instructor_id=$1 AND (p.risk_score >= 60 OR e.progress < 25) ORDER BY p.risk_score DESC LIMIT 12`, [id]),
      db.query<any>(`SELECT COUNT(*)::int AS open, SUM(CASE WHEN due_at IS NOT NULL AND due_at < NOW() THEN 1 ELSE 0 END)::int AS overdue
        FROM crm_tasks WHERE assignee_id=$1 AND status='open'`, [id]),
      db.query<any>(`SELECT COUNT(*)::int AS open FROM crm_conversations cv
        WHERE cv.status='open' AND cv.person_id IN (SELECT e.user_id FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.instructor_id=$1)`, [id]),
      db.query<any>(`SELECT COALESCE(SUM(CASE WHEN p.status='completed' THEN p.amount ELSE 0 END),0)::float AS total
        FROM payments p JOIN courses c ON c.id=p.course_id WHERE c.instructor_id=$1`, [id]),
      db.query<any>(`SELECT COALESCE(AVG(r.rating),0)::float AS rating, COUNT(r.id)::int AS count
        FROM reviews r JOIN courses c ON c.id=r.course_id WHERE c.instructor_id=$1`, [id]),
      db.query<any>(`SELECT COUNT(*)::int AS pending FROM submissions s JOIN courses c ON c.id=s.course_id WHERE c.instructor_id=$1 AND s.status='submitted'`, [id]).catch(() => ({ rows: [{ pending: 0 }] } as any)),
      db.query<any>(`SELECT date(e.enrolled_at) AS day, COUNT(*)::int AS enrollments
        FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.instructor_id=$1 AND e.enrolled_at >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day`, [id]),
    ]);
    return c.json({
      success: true,
      data: {
        students: students.rows[0] || {},
        courses: courses.rows[0] || {},
        at_risk: risk.rows,
        tasks: tasks.rows[0] || {},
        inbox: inbox.rows[0] || {},
        revenue: revenue.rows[0] || {},
        reviews: reviews.rows[0] || {},
        submissions: submissions.rows[0] || {},
        trend: trend.rows,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load instructor CRM overview');
  }
});

instructorCrm.get('/people', async (c) => {
  try {
    const s = await staff(c);
    const db = getDb(c.env);
    const search = (c.req.query('search') || '').trim();
    const risk = c.req.query('risk') || '';
    const params: any[] = [s.userId];
    const where = ['c.instructor_id=$1'];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (risk === 'high') where.push('p.risk_score >= 60');
    if (risk === 'low') where.push('p.risk_score < 60');
    const rows = await db.query<any>(
      `SELECT u.id,u.name,u.email,u.avatar,u.last_login,p.lifecycle_stage,p.risk_score,p.engagement_score,p.health_score,p.lifetime_value,p.last_activity_at,
        COUNT(DISTINCT e.course_id)::int AS courses, COALESCE(AVG(e.progress),0)::float AS avg_progress,
        SUM(CASE WHEN e.completed=1 THEN 1 ELSE 0 END)::int AS completions,
        MIN(e.enrolled_at) AS first_enrolled,
        GROUP_CONCAT(DISTINCT c.title) AS course_titles
       FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=e.user_id LEFT JOIN crm_profiles p ON p.user_id=u.id
       WHERE ${where.join(' AND ')}
       GROUP BY u.id ORDER BY p.risk_score DESC, p.last_activity_at DESC LIMIT 300`,
      params
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load students');
  }
});

instructorCrm.get('/people/:id', async (c) => {
  try {
    const s = await staff(c);
    if (!(await ownsStudent(c.env, s.userId, c.req.param('id')))) return fail(c, 404, 'Student not found');
    const data = await personDetail(c.env, c.req.param('id'), s.userId);
    if (!data) return fail(c, 404, 'Student not found');
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load student');
  }
});

instructorCrm.post('/people/:id/notes', async (c) => {
  try {
    const s = await staff(c);
    if (!(await ownsStudent(c.env, s.userId, c.req.param('id')))) return fail(c, 404, 'Student not found');
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.body || '').trim()) return fail(c, 400, 'Note body is required');
    await logCrmActivity(c.env, { personId: c.req.param('id'), type: 'note', subject: body.subject || 'Instructor note', body: body.body, ownerId: s.userId });
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to add note');
  }
});

instructorCrm.post('/people/:id/tasks', async (c) => {
  try {
    const s = await staff(c);
    if (!(await ownsStudent(c.env, s.userId, c.req.param('id')))) return fail(c, 404, 'Student not found');
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.title || '').trim()) return fail(c, 400, 'Task title is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_tasks (id,title,description,person_id,assignee_id,due_at,priority,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8)`,
      [id, body.title, body.description || null, c.req.param('id'), body.assignee_id || s.userId, body.due_at || null, body.priority || 'medium', s.userId]
    );
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create task');
  }
});

instructorCrm.get('/tasks', async (c) => {
  try {
    const s = await staff(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT t.*, u.name AS person_name, u.email AS person_email
       FROM crm_tasks t LEFT JOIN users u ON u.id=t.person_id
       WHERE t.assignee_id=$1 OR t.created_by=$1
       ORDER BY CASE WHEN t.status='open' THEN 0 ELSE 1 END, t.due_at ASC LIMIT 200`,
      [s.userId]
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load tasks');
  }
});

instructorCrm.post('/tasks', async (c) => {
  try {
    const s = await staff(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.title || '').trim()) return fail(c, 400, 'Task title is required');
    if (body.person_id && !(await ownsStudent(c.env, s.userId, body.person_id))) return fail(c, 404, 'Student not found');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_tasks (id,title,description,person_id,assignee_id,due_at,priority,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8)`,
      [id, body.title, body.description || null, body.person_id || null, body.assignee_id || s.userId, body.due_at || null, body.priority || 'medium', s.userId]
    );
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create task');
  }
});

instructorCrm.delete('/tasks/:id', async (c) => {
  try {
    const s = await staff(c);
    await getDb(c.env).query('DELETE FROM crm_tasks WHERE id=$1 AND (assignee_id=$2 OR created_by=$2)', [c.req.param('id'), s.userId]);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete task');
  }
});

instructorCrm.put('/tasks/:id', async (c) => {
  try {
    const s = await staff(c);
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['title', 'description', 'due_at', 'priority', 'status']) {
      if (body[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(body[key]); }
    }
    if (body.status === 'completed') fields.push('completed_at=NOW()');
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()');
    values.push(c.req.param('id'), s.userId);
    await getDb(c.env).query(`UPDATE crm_tasks SET ${fields.join(', ')} WHERE id=$${values.length - 1} AND (assignee_id=$${values.length} OR created_by=$${values.length})`, values);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update task');
  }
});

instructorCrm.get('/inbox', async (c) => {
  try {
    const s = await staff(c);
    await syncInbox(c.env);
    const rows = await getDb(c.env).query<any>(
      `SELECT cv.*, u.name AS person_name, u.email AS person_email,
        (SELECT body FROM crm_messages m WHERE m.conversation_id=cv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
       FROM crm_conversations cv JOIN users u ON u.id=cv.person_id
       WHERE cv.person_id IN (SELECT e.user_id FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.instructor_id=$1)
       ORDER BY CASE WHEN cv.status='open' THEN 0 ELSE 1 END, cv.last_message_at DESC LIMIT 200`,
      [s.userId]
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load inbox');
  }
});

instructorCrm.get('/inbox/:id', async (c) => {
  try {
    const s = await staff(c);
    const db = getDb(c.env);
    const conversation = (await db.query<any>(
      `SELECT cv.*, u.name AS person_name, u.email AS person_email
       FROM crm_conversations cv JOIN users u ON u.id=cv.person_id
       WHERE cv.id=$1 AND cv.person_id IN (SELECT e.user_id FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.instructor_id=$2)`,
      [c.req.param('id'), s.userId]
    )).rows[0];
    if (!conversation) return fail(c, 404, 'Conversation not found');
    const messages = await db.query<any>(
      `SELECT m.*, u.name AS author_name FROM crm_messages m LEFT JOIN users u ON u.id=m.author_id WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`,
      [c.req.param('id')]
    );
    await db.query('UPDATE crm_messages SET read_at=COALESCE(read_at,NOW()) WHERE conversation_id=$1', [c.req.param('id')]);
    await db.query('UPDATE crm_conversations SET unread_count=0 WHERE id=$1', [c.req.param('id')]);
    return c.json({ success: true, data: { conversation, messages } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load conversation');
  }
});

instructorCrm.post('/inbox/:id/reply', async (c) => {
  try {
    const s = await staff(c);
    const db = getDb(c.env);
    const body: any = await c.req.json().catch(() => ({}));
    const text = String(body.body || '').trim();
    if (!text) return fail(c, 400, 'Reply body is required');
    const conversation = (await db.query<any>(
      `SELECT cv.* FROM crm_conversations cv WHERE cv.id=$1 AND cv.person_id IN
       (SELECT e.user_id FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.instructor_id=$2)`,
      [c.req.param('id'), s.userId]
    )).rows[0];
    if (!conversation) return fail(c, 404, 'Conversation not found');
    await db.query(
      `INSERT INTO crm_messages (id,conversation_id,direction,channel,body,author_id,is_internal,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [crypto.randomUUID(), c.req.param('id'), body.is_internal ? 'internal' : 'outbound', conversation.channel, text, s.userId, body.is_internal ? 1 : 0, JSON.stringify({ source: 'instructor_reply' })]
    );
    await db.query('UPDATE crm_conversations SET last_message_at=NOW(), status=$1, updated_at=NOW() WHERE id=$2', [body.status || conversation.status, c.req.param('id')]);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send reply');
  }
});

instructorCrm.get('/pipeline', async (c) => {
  try {
    const s = await staff(c);
    const db = getDb(c.env);
    const stages = await db.query<any>(`SELECT * FROM crm_pipeline_stages WHERE kind='learner' ORDER BY position`);
    const learners = await db.query<any>(
      `SELECT u.id,u.name,u.email,u.avatar,p.lifecycle_stage,p.risk_score,p.engagement_score,
        COUNT(DISTINCT e.course_id)::int AS courses, COALESCE(AVG(e.progress),0)::float AS progress
       FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=e.user_id LEFT JOIN crm_profiles p ON p.user_id=u.id
       WHERE c.instructor_id=$1 GROUP BY u.id ORDER BY p.risk_score DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: { stages: stages.rows, learners: learners.rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load learner pipeline');
  }
});

instructorCrm.get('/reports', async (c) => {
  try {
    const s = await staff(c);
    const db = getDb(c.env);
    const [courses, risk, reviews, progress] = await Promise.all([
      db.query<any>(`SELECT c.id,c.title,c.level,COUNT(DISTINCT e.user_id)::int AS students,
        COALESCE(AVG(e.progress),0)::float AS avg_progress,
        SUM(CASE WHEN e.completed=1 THEN 1 ELSE 0 END)::int AS completions
        FROM courses c LEFT JOIN enrollments e ON e.course_id=c.id WHERE c.instructor_id=$1 GROUP BY c.id ORDER BY students DESC`, [s.userId]),
      db.query<any>(`SELECT CASE WHEN p.risk_score >= 60 THEN 'high' WHEN p.risk_score >= 35 THEN 'medium' ELSE 'low' END AS band, COUNT(DISTINCT u.id)::int AS people
        FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=e.user_id LEFT JOIN crm_profiles p ON p.user_id=u.id
        WHERE c.instructor_id=$1 GROUP BY band`, [s.userId]),
      db.query<any>(`SELECT c.title,COALESCE(AVG(r.rating),0)::float AS rating,COUNT(r.id)::int AS reviews
        FROM reviews r JOIN courses c ON c.id=r.course_id WHERE c.instructor_id=$1 GROUP BY c.id ORDER BY reviews DESC`, [s.userId]),
      db.query<any>(`SELECT date(e.enrolled_at) AS day, COUNT(*)::int AS enrollments FROM enrollments e JOIN courses c ON c.id=e.course_id
        WHERE c.instructor_id=$1 AND e.enrolled_at >= NOW() - INTERVAL '90 days' GROUP BY day ORDER BY day`, [s.userId]),
    ]);
    return c.json({ success: true, data: { courses: courses.rows, risk: risk.rows, reviews: reviews.rows, progress: progress.rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load instructor reports');
  }
});

export default instructorCrm;
