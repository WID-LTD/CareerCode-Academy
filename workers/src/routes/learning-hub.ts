import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import { parseBody, storeOrLink } from '../uploads';

const hub = new Hono<{ Bindings: Env }>();
const STAFF = ['instructor', 'admin', 'super_admin'];

function parseJson(value: any, fallback: any) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return fallback; }
}

async function enrolled(env: Env, userId: string, courseId: string) {
  const { rows } = await getDb(env).query<any>('SELECT 1 FROM enrollments WHERE user_id=$1 AND course_id=$2 LIMIT 1', [userId, courseId]);
  return rows.length > 0;
}

async function projectForUser(env: Env, projectId: string, userId: string) {
  const { rows } = await getDb(env).query<any>(
    `SELECT cp.*, c.title AS course_title, c.slug AS course_slug,
            p.id AS submission_id, p.status AS submission_status, p.source_url, p.demo_url, p.repo_verified
     FROM course_projects cp
     JOIN courses c ON c.id = cp.course_id
     LEFT JOIN projects p ON p.project_id = cp.id AND p.user_id = $2
     WHERE cp.id = $1`,
    [projectId, userId]
  );
  return rows[0] || null;
}

// ── Project workspace ─────────────────────────────────────────────────────
hub.get('/projects/:id/workspace', async (c) => {
  try {
    const s = await requireAuth(c);
    const project = await projectForUser(c.env, c.req.param('id'), s.userId);
    if (!project) return fail(c, 404, 'Project not found');
    if (!(await enrolled(c.env, s.userId, project.course_id))) return fail(c, 403, 'Enroll in this course first');
    const db = getDb(c.env);
    const [tickets, standups, retro, defense, sandbox] = await Promise.all([
      db.query<any>('SELECT * FROM project_tickets WHERE project_id=$1 AND user_id=$2 ORDER BY sort_order, created_at', [project.id, s.userId]),
      db.query<any>('SELECT * FROM project_standups WHERE project_id=$1 AND user_id=$2 ORDER BY standup_date DESC, created_at DESC LIMIT 20', [project.id, s.userId]),
      db.query<any>('SELECT * FROM project_retrospectives WHERE project_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1', [project.id, s.userId]),
      db.query<any>('SELECT * FROM oral_defenses WHERE project_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1', [project.id, s.userId]),
      db.query<any>('SELECT * FROM sandbox_environments WHERE course_id=$1 ORDER BY created_at DESC LIMIT 1', [project.course_id]),
    ]);
    return c.json({
      success: true,
      data: {
        project: {
          ...project,
          requirements: parseJson(project.requirements, []),
          tools: parseJson(project.tools, []),
          steps: parseJson(project.steps, []),
          required_languages: parseJson(project.required_languages, []),
        },
        tickets: tickets.rows,
        standups: standups.rows,
        retrospective: retro.rows[0] || null,
        oral_defense: defense.rows[0] || null,
        sandbox: sandbox.rows[0] || null,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load project workspace');
  }
});

hub.post('/projects/:id/tickets', async (c) => {
  try {
    const s = await requireAuth(c);
    const project = await projectForUser(c.env, c.req.param('id'), s.userId);
    if (!project) return fail(c, 404, 'Project not found');
    const body: any = await c.req.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    if (!title) return fail(c, 400, 'Ticket title is required');
    const status = ['backlog', 'in_progress', 'review', 'done'].includes(body.status) ? body.status : 'backlog';
    const priority = ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium';
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO project_tickets (project_id,user_id,title,description,status,priority,estimate_hours,due_at,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [project.id, s.userId, title, body.description || null, status, priority, body.estimate_hours || null, body.due_at || null, Number(body.sort_order) || 0]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create ticket');
  }
});

hub.put('/tickets/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['title', 'description', 'status', 'priority', 'estimate_hours', 'due_at', 'sort_order']) {
      if (body[key] !== undefined) {
        values.push(body[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }
    if (!fields.length) return fail(c, 400, 'No fields to update');
    values.push(c.req.param('id'), s.userId);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE project_tickets SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length - 1} AND user_id=$${values.length} RETURNING *`,
      values
    );
    if (!rows.length) return fail(c, 404, 'Ticket not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update ticket');
  }
});

hub.delete('/tickets/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    await getDb(c.env).query('DELETE FROM project_tickets WHERE id=$1 AND user_id=$2', [c.req.param('id'), s.userId]);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete ticket');
  }
});

hub.post('/projects/:id/standups', async (c) => {
  try {
    const s = await requireAuth(c);
    const project = await projectForUser(c.env, c.req.param('id'), s.userId);
    if (!project) return fail(c, 404, 'Project not found');
    const body: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO project_standups (project_id,user_id,standup_date,yesterday,today,blockers)
       VALUES ($1,$2,COALESCE($3,date('now')),$4,$5,$6) RETURNING *`,
      [project.id, s.userId, body.standup_date || null, body.yesterday || null, body.today || null, body.blockers || null]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save standup');
  }
});

hub.post('/projects/:id/retrospective', async (c) => {
  try {
    const s = await requireAuth(c);
    const project = await projectForUser(c.env, c.req.param('id'), s.userId);
    if (!project) return fail(c, 404, 'Project not found');
    const body: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO project_retrospectives (project_id,user_id,went_well,improve,actions)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [project.id, s.userId, body.went_well || null, body.improve || null, body.actions || null]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save retrospective');
  }
});

// ── Oral defense ─────────────────────────────────────────────────────────
hub.post('/projects/:id/oral-defense', async (c) => {
  try {
    const s = await requireAuth(c);
    const project = await projectForUser(c.env, c.req.param('id'), s.userId);
    if (!project) return fail(c, 404, 'Project not found');
    if (!(await enrolled(c.env, s.userId, project.course_id))) return fail(c, 403, 'Enroll in this course first');
    const { fields, file } = await parseBody(c as any);
    const url = await storeOrLink(c.env, file, (fields.video_url || fields.url || null) as any, 'oral-defenses');
    if (!url) return fail(c, 400, 'Upload a video or provide a video URL');
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO oral_defenses (project_id,user_id,video_url,notes,status) VALUES ($1,$2,$3,$4,'submitted') RETURNING *`,
      [project.id, s.userId, url, fields.notes || null]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit oral defense');
  }
});

hub.get('/review/oral-defenses', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const admin = ['admin', 'super_admin'].includes(s.role);
    const vals: any[] = admin ? [] : [s.userId];
    const where = admin ? '' : 'WHERE c.instructor_id = $1';
    const { rows } = await getDb(c.env).query<any>(
      `SELECT od.*, cp.title AS project_title, c.title AS course_title, c.instructor_id,
              u.name AS student_name, u.email AS student_email
       FROM oral_defenses od
       JOIN course_projects cp ON cp.id = od.project_id
       JOIN courses c ON c.id = cp.course_id
       JOIN users u ON u.id = od.user_id
       ${where} ORDER BY CASE WHEN od.status='submitted' THEN 0 ELSE 1 END, od.created_at DESC LIMIT 300`,
      vals
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load oral defenses');
  }
});

hub.put('/oral-defenses/:id/review', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const score = Number(body.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) return fail(c, 400, 'Score must be 0-100');
    const status = body.status === 'needs_work' ? 'needs_work' : 'passed';
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE oral_defenses SET status=$1, score=$2, feedback=$3, reviewer_id=$4, reviewed_at=NOW()
       WHERE id=$5 RETURNING *`,
      [status, score, body.feedback || null, s.userId, c.req.param('id')]
    );
    if (!rows.length) return fail(c, 404, 'Oral defense not found');
    await getDb(c.env).query(
      `INSERT INTO notifications (user_id,title,message,type,link) VALUES ($1,$2,$3,'success','/student/lab')`,
      [rows[0].user_id, 'Oral defense reviewed', `${score}/100. ${body.feedback || ''}`.slice(0, 500)]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to review oral defense');
  }
});

// ── Skill badges ─────────────────────────────────────────────────────────
hub.get('/badges', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const [defs, mine] = await Promise.all([
      db.query<any>('SELECT * FROM skill_badges ORDER BY category, level, title'),
      db.query<any>('SELECT ub.*, sb.title, sb.slug FROM user_badges ub JOIN skill_badges sb ON sb.id=ub.badge_id WHERE ub.user_id=$1 ORDER BY ub.created_at DESC', [s.userId]),
    ]);
    return c.json({ success: true, data: { badges: defs.rows.map((b) => ({ ...b, rubric: parseJson(b.rubric, []) })), mine: mine.rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load badges');
  }
});

hub.post('/badges/:id/request', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const code = `CCB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO user_badges (user_id,badge_id,evidence_url,status,verified_code)
       VALUES ($1,$2,$3,'pending',$4) RETURNING *`,
      [s.userId, c.req.param('id'), body.evidence_url || null, code]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to request badge');
  }
});

hub.get('/badges/verify/:code', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ub.status, ub.awarded_at, sb.title, sb.description, sb.category, u.name AS learner_name
       FROM user_badges ub JOIN skill_badges sb ON sb.id=ub.badge_id JOIN users u ON u.id=ub.user_id
       WHERE ub.verified_code=$1 LIMIT 1`,
      [c.req.param('code')]
    );
    if (!rows.length) return fail(c, 404, 'Badge not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to verify badge');
  }
});

hub.get('/review/badges', async (c) => {
  try {
    await requireRole(c, STAFF);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT ub.*, sb.title, sb.rubric, u.name AS learner_name, u.email
       FROM user_badges ub JOIN skill_badges sb ON sb.id=ub.badge_id JOIN users u ON u.id=ub.user_id
       ORDER BY CASE WHEN ub.status='pending' THEN 0 ELSE 1 END, ub.created_at DESC LIMIT 300`
    );
    return c.json({ success: true, data: rows.map((r) => ({ ...r, rubric: parseJson(r.rubric, []) })) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load badge requests');
  }
});

hub.put('/badges/:id/review', async (c) => {
  try {
    await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const status = body.status === 'rejected' ? 'rejected' : 'awarded';
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE user_badges SET status=$1, awarded_at=CASE WHEN $1='awarded' THEN NOW() ELSE NULL END WHERE id=$2 RETURNING *`,
      [status, c.req.param('id')]
    );
    if (!rows.length) return fail(c, 404, 'Badge request not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to review badge');
  }
});

// ── Client projects ──────────────────────────────────────────────────────
hub.get('/client-projects', async (c) => {
  try {
    await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>('SELECT * FROM client_projects ORDER BY created_at DESC LIMIT 100');
    return c.json({ success: true, data: rows.map((r) => ({ ...r, skills: parseJson(r.skills, []) })) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load client projects');
  }
});

hub.post('/client-projects/:id/apply', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO client_project_applications (client_project_id,user_id,pitch) VALUES ($1,$2,$3) RETURNING *`,
      [c.req.param('id'), s.userId, body.pitch || null]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to apply');
  }
});

hub.get('/client-projects/my', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT a.*, cp.title, cp.client_name FROM client_project_applications a
       JOIN client_projects cp ON cp.id=a.client_project_id WHERE a.user_id=$1 ORDER BY a.created_at DESC`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load applications');
  }
});

// ── Peer review ──────────────────────────────────────────────────────────
hub.get('/peer-reviews/queue', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT p.id, p.title, p.description, p.source_url, p.demo_url, p.status, p.verification,
              cp.title AS project_title, c.title AS course_title, u.name AS learner_name
       FROM projects p JOIN course_projects cp ON cp.id=p.project_id
       JOIN courses c ON c.id=p.course_id JOIN users u ON u.id=p.user_id
       WHERE p.user_id <> $1 AND p.project_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM peer_reviews pr WHERE pr.project_id=p.id AND pr.reviewer_id=$1)
       ORDER BY p.created_at DESC LIMIT 10`,
      [s.userId]
    );
    return c.json({ success: true, data: rows.map((r) => ({ ...r, verification: parseJson(r.verification, {}) })) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load peer review queue');
  }
});

hub.post('/peer-reviews/:projectId', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const project = (await db.query<any>('SELECT user_id FROM projects WHERE id=$1', [c.req.param('projectId')])).rows[0];
    if (!project) return fail(c, 404, 'Project not found');
    if (project.user_id === s.userId) return fail(c, 400, 'You cannot review your own project');
    const { rows } = await db.query<any>(
      `INSERT INTO peer_reviews (project_id,reviewer_id,owner_id,status,score,feedback,reviewed_at)
       VALUES ($1,$2,$3,'completed',$4,$5,NOW()) RETURNING *`,
      [c.req.param('projectId'), s.userId, project.user_id, Number(body.score) || null, body.feedback || null]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit peer review');
  }
});

// ── Learning events and spaced review ────────────────────────────────────
hub.post('/events', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.event_type) return fail(c, 400, 'event_type is required');
    await getDb(c.env).query(
      `INSERT INTO learning_events (user_id,event_type,course_id,lesson_id,project_id,metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [s.userId, body.event_type, body.course_id || null, body.lesson_id || null, body.project_id || null, JSON.stringify(body.metadata || {})]
    );
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to track event');
  }
});

hub.get('/spaced-reviews', async (c) => {
  try {
    const s = await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT sr.*, l.title AS lesson_title, c.title AS course_title, c.slug AS course_slug
       FROM spaced_reviews sr JOIN lessons l ON l.id=sr.lesson_id JOIN courses c ON c.id=l.course_id
       WHERE sr.user_id=$1 AND sr.due_at <= NOW() ORDER BY sr.due_at ASC LIMIT 50`,
      [s.userId]
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load reviews');
  }
});

hub.post('/spaced-reviews', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.lesson_id) return fail(c, 400, 'lesson_id is required');
    const lesson = (await getDb(c.env).query<any>('SELECT course_id FROM lessons WHERE id=$1', [body.lesson_id])).rows[0];
    if (!lesson) return fail(c, 404, 'Lesson not found');
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO spaced_reviews (user_id,course_id,lesson_id,due_at,interval_days,repetitions)
       VALUES ($1,$2,$3,NOW() + INTERVAL '1 day',1,0) RETURNING *`,
      [s.userId, lesson.course_id, body.lesson_id]
    );
    return c.json({ success: true, data: rows[0] }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to schedule review');
  }
});

hub.post('/spaced-reviews/:id/complete', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const review = (await getDb(c.env).query<any>('SELECT * FROM spaced_reviews WHERE id=$1 AND user_id=$2', [c.req.param('id'), s.userId])).rows[0];
    if (!review) return fail(c, 404, 'Review not found');
    const passed = body.result !== 'again';
    const interval = passed ? Math.min(60, Math.max(1, Number(review.interval_days) || 1) * 2) : 1;
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE spaced_reviews SET interval_days=$1, repetitions=repetitions+1, last_result=$2,
       due_at=NOW() + ($3 || ' days')::interval WHERE id=$4 RETURNING *`,
      [interval, body.result || 'good', interval, review.id]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to complete review');
  }
});

// ── Sandbox ──────────────────────────────────────────────────────────────
hub.get('/sandbox/:courseId', async (c) => {
  try {
    await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM sandbox_environments WHERE course_id=$1 ORDER BY created_at DESC LIMIT 1',
      [c.req.param('courseId')]
    );
    return c.json({ success: true, data: rows[0] || null });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load sandbox');
  }
});

export default hub;
