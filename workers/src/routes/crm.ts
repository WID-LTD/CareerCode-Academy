import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';
import { logAudit, requestMeta } from '../admin/helpers';
import { createNotification } from '../instructor';
import { sendEmail } from '../email';
import {
  asInt,
  buildSegmentWhere,
  ensureProfiles,
  logCrmActivity,
  parseJson,
  refreshProfileScores,
  syncInbox,
  type CrmDefinition,
} from '../crm-service';

const crm = new Hono<{ Bindings: Env }>();
const ADMIN = ['admin', 'super_admin'];

function json(value: any, fallback: any = null) {
  return parseJson(value, fallback);
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

async function admin(c: any) {
  return requireRole(c, ADMIN);
}

async function audit(c: any, session: any, action: string, resourceType: string, resourceId: string | null, details: string) {
  const meta = requestMeta(c);
  await logAudit(c.env, {
    adminId: session.userId,
    action,
    resourceType,
    resourceId,
    details,
    ...meta,
  });
}

function profileRow(row: any) {
  if (!row) return row;
  return {
    ...row,
    tags: json(row.tags, []),
    custom_fields: json(row.custom_fields, {}),
  };
}

function paging(c: any, defaultLimit = 25) {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || String(defaultLimit), 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

// ─────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────
crm.get('/overview', async (c) => {
  try {
    await admin(c);
    await ensureProfiles(c.env);
    const db = getDb(c.env);

    const [people, stages, revenue, pipeline, tasks, inbox, campaigns, sources, courses, recent, trends] = await Promise.all([
      db.query<any>(`SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN lifecycle_stage IN ('lead','prospect','applicant') THEN 1 ELSE 0 END)::int AS leads,
        SUM(CASE WHEN lifecycle_stage = 'trial' THEN 1 ELSE 0 END)::int AS trials,
        SUM(CASE WHEN lifecycle_stage IN ('paid','active') THEN 1 ELSE 0 END)::int AS paid,
        SUM(CASE WHEN lifecycle_stage = 'at_risk' OR risk_score >= 60 THEN 1 ELSE 0 END)::int AS at_risk,
        SUM(CASE WHEN lifecycle_stage = 'completed' THEN 1 ELSE 0 END)::int AS completed,
        SUM(CASE WHEN lifecycle_stage = 'alumni' THEN 1 ELSE 0 END)::int AS alumni,
        COALESCE(AVG(lifetime_value),0)::float AS avg_ltv,
        COALESCE(AVG(risk_score),0)::float AS avg_risk
        FROM crm_profiles`),
      db.query<any>(`SELECT lifecycle_stage, COUNT(*)::int AS n FROM crm_profiles GROUP BY lifecycle_stage`),
      db.query<any>(`SELECT
        COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0)::float AS total,
        COALESCE(SUM(CASE WHEN status='completed' AND created_at >= date_trunc('month', NOW()) THEN amount ELSE 0 END),0)::float AS month,
        COALESCE(SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END),0)::float AS refunds
        FROM payments`),
      db.query<any>(`SELECT s.id, s.label, s.position, s.color, s.is_won, s.is_lost,
        COUNT(o.id)::int AS count, COALESCE(SUM(o.value),0)::float AS value
        FROM crm_pipeline_stages s LEFT JOIN crm_opportunities o ON o.stage_id = s.id
        WHERE s.kind='opportunity' GROUP BY s.id ORDER BY s.position`),
      db.query<any>(`SELECT
        SUM(CASE WHEN status='open' THEN 1 ELSE 0 END)::int AS open,
        SUM(CASE WHEN status='open' AND due_at IS NOT NULL AND due_at < NOW() THEN 1 ELSE 0 END)::int AS overdue,
        SUM(CASE WHEN status='open' AND due_at IS NOT NULL AND date(due_at) = date('now') THEN 1 ELSE 0 END)::int AS due_today
        FROM crm_tasks`),
      db.query<any>(`SELECT
        SUM(CASE WHEN status='open' THEN 1 ELSE 0 END)::int AS open,
        SUM(CASE WHEN status='open' AND assignee_id IS NULL THEN 1 ELSE 0 END)::int AS unassigned,
        SUM(CASE WHEN status='open' AND sla_due_at IS NOT NULL AND sla_due_at < NOW() THEN 1 ELSE 0 END)::int AS sla_breaches
        FROM crm_conversations`),
      db.query<any>(`SELECT
        SUM(CASE WHEN status IN ('scheduled','sending') THEN 1 ELSE 0 END)::int AS active,
        SUM(sent_count)::int AS sent,
        SUM(converted_count)::int AS converted
        FROM crm_campaigns`),
      db.query<any>(`SELECT COALESCE(lead_source,'organic') AS source, COUNT(*)::int AS count,
        COALESCE(SUM(lifetime_value),0)::float AS value
        FROM crm_profiles GROUP BY source ORDER BY count DESC LIMIT 8`),
      db.query<any>(`SELECT c.id, c.title, c.slug,
        COUNT(DISTINCT e.user_id)::int AS students,
        COALESCE(AVG(e.progress),0)::float AS avg_progress,
        COALESCE(SUM(CASE WHEN p.status='completed' THEN p.amount ELSE 0 END),0)::float AS revenue
        FROM courses c LEFT JOIN enrollments e ON e.course_id=c.id LEFT JOIN payments p ON p.course_id=c.id
        GROUP BY c.id ORDER BY students DESC LIMIT 8`),
      db.query<any>(`SELECT a.*, u.name AS person_name, u.email AS person_email
        FROM crm_activities a LEFT JOIN users u ON u.id=a.person_id
        ORDER BY a.created_at DESC LIMIT 12`),
      db.query<any>(`SELECT date(created_at) AS day, COUNT(*)::int AS people FROM crm_profiles
        WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`),
    ]);

    return c.json({
      success: true,
      data: {
        people: people.rows[0] || {},
        stages: stages.rows,
        revenue: revenue.rows[0] || {},
        pipeline: pipeline.rows,
        tasks: tasks.rows[0] || {},
        inbox: inbox.rows[0] || {},
        campaigns: campaigns.rows[0] || {},
        sources: sources.rows,
        courses: courses.rows,
        recent: recent.rows,
        trends: trends.rows,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load CRM overview');
  }
});

// ─────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────
crm.get('/people', async (c) => {
  try {
    await admin(c);
    await ensureProfiles(c.env);
    const db = getDb(c.env);
    const { page, limit, offset } = paging(c);
    const search = (c.req.query('search') || '').trim();
    const stage = c.req.query('stage') || '';
    const owner = c.req.query('owner') || '';
    const tag = c.req.query('tag') || '';
    const course = c.req.query('course') || '';
    const riskMin = Number(c.req.query('risk_min') || 0) || 0;
    const sort = c.req.query('sort') || 'last_activity_at';
    const dir = (c.req.query('dir') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const sortMap: Record<string, string> = {
      name: 'u.name', email: 'u.email', created_at: 'u.created_at', last_activity_at: 'p.last_activity_at',
      lifetime_value: 'p.lifetime_value', risk_score: 'p.risk_score', engagement_score: 'p.engagement_score',
      lead_score: 'p.lead_score', lifecycle_stage: 'p.lifecycle_stage', updated_at: 'p.updated_at',
    };
    const order = sortMap[sort] || 'p.last_activity_at';

    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (stage) { params.push(stage); where.push(`p.lifecycle_stage = $${params.length}`); }
    if (owner) { params.push(owner); where.push(`p.owner_id = $${params.length}`); }
    if (tag) {
      params.push(tag);
      where.push(`EXISTS (SELECT 1 FROM crm_profile_tags pt JOIN crm_tags t ON t.id=pt.tag_id WHERE pt.profile_user_id=p.user_id AND t.name=$${params.length})`);
    }
    if (course) {
      params.push(course);
      where.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id=p.user_id AND e.course_id=$${params.length})`);
    }
    if (riskMin > 0) { params.push(riskMin); where.push(`p.risk_score >= $${params.length}`); }

    const count = await db.query<any>(
      `SELECT COUNT(*)::int AS n FROM crm_profiles p JOIN users u ON u.id=p.user_id WHERE ${where.join(' AND ')}`,
      params
    );
    params.push(limit, offset);
    const rows = await db.query<any>(
      `SELECT u.id, u.name, u.email, u.avatar, u.role, u.is_suspended, u.created_at, u.last_login,
        p.lifecycle_stage, p.owner_id, p.lead_source, p.phone, p.country, p.company, p.job_title,
        p.lead_score, p.engagement_score, p.risk_score, p.health_score, p.lifetime_value, p.currency,
        p.tags, p.last_activity_at, p.last_contacted_at, p.next_follow_up_at,
        (SELECT COUNT(*)::int FROM enrollments e WHERE e.user_id=u.id) AS courses,
        (SELECT COUNT(*)::int FROM enrollments e WHERE e.user_id=u.id AND e.completed=1) AS completed_courses,
        (SELECT COUNT(*)::int FROM certificates cert WHERE cert.user_id=u.id AND cert.revoked=0) AS certificates,
        (SELECT COUNT(*)::int FROM crm_tasks t WHERE t.person_id=u.id AND t.status='open') AS open_tasks
       FROM crm_profiles p JOIN users u ON u.id=p.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${order} ${dir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return c.json({
      success: true,
      data: rows.rows.map(profileRow),
      pagination: { page, limit, total: Number(count.rows[0]?.n) || 0, pages: Math.ceil((Number(count.rows[0]?.n) || 0) / limit) },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load people');
  }
});

crm.get('/people/:id', async (c) => {
  try {
    await admin(c);
    const data = await personDetail(c.env, c.req.param('id'), null);
    if (!data) return fail(c, 404, 'Person not found');
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load person');
  }
});

export async function personDetail(env: Env, userId: string, instructorId: string | null) {
  const db = getDb(env);
  if (instructorId) {
    const allowed = await db.query<any>(
      `SELECT 1 FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 AND c.instructor_id=$2 LIMIT 1`,
      [userId, instructorId]
    );
    if (!allowed.rows.length) return null;
  }

  const user = await db.query<any>(
    `SELECT u.id,u.name,u.email,u.avatar,u.role,u.bio,u.location,u.website,u.github,u.twitter,u.linkedin,
      u.is_verified,u.is_suspended,u.created_at AS user_created_at,u.last_login,
      p.user_id AS profile_user_id,p.lifecycle_stage,p.owner_id,p.account_id,p.lead_source,p.phone,p.country,p.timezone,
      p.company,p.job_title,p.lead_score,p.engagement_score,p.risk_score,p.health_score,p.lifetime_value,p.currency,
      p.tags,p.custom_fields,p.email_opt_in,p.sms_opt_in,p.push_opt_in,p.whatsapp_opt_in,p.do_not_contact,
      p.last_activity_at,p.last_contacted_at,p.next_follow_up_at,p.created_at AS profile_created_at,p.updated_at AS profile_updated_at
     FROM users u LEFT JOIN crm_profiles p ON p.user_id=u.id WHERE u.id=$1`,
    [userId]
  );
  if (!user.rows.length) return null;

  const coursesWhere = instructorId
    ? `AND c.instructor_id = $2`
    : '';
  const courseParams = instructorId ? [userId, instructorId] : [userId];
  const paymentsWhere = instructorId
    ? `AND p.course_id IN (SELECT c.id FROM courses c WHERE c.instructor_id = $2)`
    : '';
  const paymentParams = instructorId ? [userId, instructorId] : [userId];

  const [courses, payments, certificates, exams, projects, tickets, activities, tasks, consents, opportunities, plans, referrals, conversations, accounts] = await Promise.all([
    db.query<any>(`SELECT e.id AS enrollment_id,e.course_id,e.access_type,e.status,e.progress,e.completed,e.enrolled_at,e.trial_ends_at,e.completed_at,
      c.title,c.slug,c.level,c.price,c.thumbnail,
      (SELECT COUNT(*)::int FROM lesson_progress lp WHERE lp.user_id=e.user_id AND lp.course_id=e.course_id) AS lessons_done,
      (SELECT MAX(lp.updated_at) FROM lesson_progress lp WHERE lp.user_id=e.user_id AND lp.course_id=e.course_id) AS last_activity
      FROM enrollments e JOIN courses c ON c.id=e.course_id
      WHERE e.user_id=$1 ${coursesWhere} ORDER BY e.enrolled_at DESC`, courseParams),
    db.query<any>(`SELECT p.id,p.reference,p.amount,p.currency,p.status,p.provider,p.created_at,p.course_id,c.title AS course_title
      FROM payments p LEFT JOIN courses c ON c.id=p.course_id WHERE p.user_id=$1 ${paymentsWhere} ORDER BY p.created_at DESC LIMIT 50`, paymentParams),
    db.query<any>(`SELECT cert.id,cert.course_id,cert.verification_code,cert.issued_at,cert.revoked,c.title AS course_title
      FROM certificates cert JOIN courses c ON c.id=cert.course_id WHERE cert.user_id=$1 ${instructorId ? 'AND c.instructor_id=$2' : ''} ORDER BY cert.issued_at DESC`, courseParams),
    db.query<any>(`SELECT ea.id,ea.exam_id,ea.score,ea.passed,ea.started_at,ea.submitted_at,e.title AS exam_title
      FROM exam_attempts ea LEFT JOIN exams e ON e.id=ea.exam_id WHERE ea.user_id=$1 ORDER BY ea.started_at DESC LIMIT 30`, [userId]),
    db.query<any>(`SELECT p.id,p.title,p.status,p.created_at,p.updated_at FROM projects p WHERE p.user_id=$1 ORDER BY p.created_at DESC LIMIT 30`, [userId]),
    db.query<any>(`SELECT t.id,t.subject,t.status,t.priority,t.created_at,t.updated_at FROM support_tickets t WHERE t.user_id=$1 ORDER BY t.created_at DESC LIMIT 30`, [userId]),
    db.query<any>(`SELECT a.*, u.name AS owner_name FROM crm_activities a LEFT JOIN users u ON u.id=a.owner_id WHERE a.person_id=$1 ORDER BY a.created_at DESC LIMIT 50`, [userId]),
    db.query<any>(`SELECT t.*, u.name AS assignee_name FROM crm_tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.person_id=$1 ORDER BY CASE WHEN t.status='open' THEN 0 ELSE 1 END, t.due_at ASC LIMIT 50`, [userId]),
    db.query<any>(`SELECT * FROM crm_consents WHERE person_id=$1 ORDER BY created_at DESC LIMIT 30`, [userId]),
    db.query<any>(`SELECT o.*, s.label AS stage_label, s.color AS stage_color FROM crm_opportunities o JOIN crm_pipeline_stages s ON s.id=o.stage_id WHERE o.person_id=$1 ORDER BY o.created_at DESC`, [userId]),
    db.query<any>(`SELECT sp.*, (SELECT COUNT(*)::int FROM crm_success_milestones m WHERE m.plan_id=sp.id AND m.status='completed') AS milestones_done,
      (SELECT COUNT(*)::int FROM crm_success_milestones m WHERE m.plan_id=sp.id) AS milestones_total
      FROM crm_success_plans sp WHERE sp.person_id=$1 ORDER BY sp.created_at DESC`, [userId]),
    db.query<any>(`SELECT * FROM crm_referrals WHERE referrer_id=$1 OR referred_user_id=$1 ORDER BY created_at DESC LIMIT 20`, [userId]),
    db.query<any>(`SELECT cv.*, (SELECT body FROM crm_messages m WHERE m.conversation_id=cv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
      FROM crm_conversations cv WHERE cv.person_id=$1 ORDER BY cv.last_message_at DESC LIMIT 20`, [userId]),
    db.query<any>(`SELECT a.*, ac.name AS account_name FROM crm_account_contacts a JOIN crm_accounts ac ON ac.id=a.account_id WHERE a.user_id=$1`, [userId]),
  ]);

  const profile = profileRow(user.rows[0]);
  return {
    user: {
      id: profile.id, name: profile.name, email: profile.email, avatar: profile.avatar, role: profile.role,
      bio: profile.bio, phone: profile.phone, location: profile.location,
      website: profile.website, github: profile.github, twitter: profile.twitter, linkedin: profile.linkedin,
      is_verified: profile.is_verified, is_suspended: profile.is_suspended,
      created_at: profile.user_created_at, last_login: profile.last_login,
    },
    profile,
    courses: courses.rows,
    payments: payments.rows,
    certificates: certificates.rows,
    exams: exams.rows,
    projects: projects.rows,
    tickets: tickets.rows,
    activities: activities.rows.map((a: any) => ({ ...a, metadata: json(a.metadata, {}) })),
    tasks: tasks.rows,
    consents: consents.rows,
    opportunities: opportunities.rows,
    plans: plans.rows,
    referrals: referrals.rows,
    conversations: conversations.rows,
    accounts: accounts.rows,
  };
}

crm.get('/users/:id', async (c) => {
  try {
    await admin(c);
    const data = await personDetail(c.env, c.req.param('id'), null);
    if (!data) return fail(c, 404, 'User not found');
    return c.json({
      success: true,
      data: {
        user: data.user,
        profile: data.profile,
        courses: data.courses,
        payments: data.payments,
        certificates: data.certificates,
        tickets: data.tickets,
        activities: data.activities,
        tasks: data.tasks,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load user CRM');
  }
});

crm.put('/people/:id', async (c) => {
  try {
    const session = await admin(c);
    const db = getDb(c.env);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    await ensureProfiles(c.env);
    const allowed = ['lifecycle_stage', 'owner_id', 'account_id', 'lead_source', 'phone', 'country', 'timezone', 'company', 'job_title', 'email_opt_in', 'sms_opt_in', 'push_opt_in', 'whatsapp_opt_in', 'do_not_contact', 'next_follow_up_at'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${values.length + 1}`);
        values.push(typeof body[key] === 'boolean' ? (body[key] ? 1 : 0) : body[key]);
      }
    }
    if (body.custom_fields !== undefined) {
      fields.push(`custom_fields = $${values.length + 1}`);
      values.push(JSON.stringify(body.custom_fields));
    }
    if (fields.length) {
      fields.push('updated_at = NOW()');
      values.push(id);
      await db.query(`UPDATE crm_profiles SET ${fields.join(', ')} WHERE user_id = $${values.length}`, values);
    }
    if (Array.isArray(body.tags)) {
      await db.query('DELETE FROM crm_profile_tags WHERE profile_user_id=$1', [id]);
      for (const name of body.tags) {
        const tag = await db.query<any>('SELECT id FROM crm_tags WHERE name=$1', [String(name)]);
        let tagId = tag.rows[0]?.id;
        if (!tagId) {
          tagId = crypto.randomUUID();
          await db.query('INSERT INTO crm_tags (id,name,color) VALUES ($1,$2,$3)', [tagId, String(name), 'gray']);
        }
        await db.query('INSERT OR IGNORE INTO crm_profile_tags (profile_user_id,tag_id) VALUES ($1,$2)', [id, tagId]);
      }
    }
    await logCrmActivity(c.env, { personId: id, type: 'system', subject: 'Profile updated', ownerId: session.userId });
    await audit(c, session, 'update', 'crm_person', id, 'Updated CRM profile');
    const data = await personDetail(c.env, id, null);
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update person');
  }
});

crm.post('/people/:id/notes', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.body || '').trim()) return fail(c, 400, 'Note body is required');
    await logCrmActivity(c.env, {
      personId: id,
      type: 'note',
      subject: body.subject || 'Note',
      body: String(body.body),
      ownerId: session.userId,
      channel: 'crm',
    });
    await audit(c, session, 'create', 'crm_note', id, 'Added CRM note');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to add note');
  }
});

crm.post('/people/:id/tasks', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.title || '').trim()) return fail(c, 400, 'Task title is required');
    const taskId = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_tasks (id,title,description,person_id,assignee_id,due_at,priority,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8)`,
      [taskId, String(body.title), body.description || null, id, body.assignee_id || session.userId, body.due_at || null, body.priority || 'medium', session.userId]
    );
    await logCrmActivity(c.env, { personId: id, type: 'task', subject: `Task created: ${body.title}`, ownerId: session.userId });
    await audit(c, session, 'create', 'crm_task', taskId, `Created task for person ${id}`);
    return c.json({ success: true, data: { id: taskId } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create task');
  }
});

crm.post('/people/:id/tags', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    if (!name) return fail(c, 400, 'Tag name is required');
    const db = getDb(c.env);
    let tagId = body.tag_id;
    if (!tagId) {
      const existing = await db.query<any>('SELECT id FROM crm_tags WHERE name=$1', [name]);
      tagId = existing.rows[0]?.id;
      if (!tagId) {
        tagId = crypto.randomUUID();
        await db.query('INSERT INTO crm_tags (id,name,color) VALUES ($1,$2,$3)', [tagId, name, body.color || 'gray']);
      }
    }
    await db.query('INSERT OR IGNORE INTO crm_profile_tags (profile_user_id,tag_id) VALUES ($1,$2)', [id, tagId]);
    await audit(c, session, 'create', 'crm_tag', id, `Added tag ${name}`);
    return c.json({ success: true, data: { tag_id: tagId } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to add tag');
  }
});

crm.delete('/people/:id/tags/:tagId', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_profile_tags WHERE profile_user_id=$1 AND tag_id=$2', [c.req.param('id'), c.req.param('tagId')]);
    await audit(c, session, 'delete', 'crm_tag', c.req.param('id'), 'Removed tag');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to remove tag');
  }
});

crm.post('/people/:id/consent', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const channel = String(body.channel || 'email');
    const status = body.status ? 1 : 0;
    const db = getDb(c.env);
    await db.query(
      `INSERT INTO crm_consents (id,person_id,channel,status,source,ip,user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), id, channel, status, body.source || 'crm', c.req.header('cf-connecting-ip') || null, c.req.header('user-agent') || null]
    );
    const column: Record<string, string> = { email: 'email_opt_in', sms: 'sms_opt_in', push: 'push_opt_in', whatsapp: 'whatsapp_opt_in' };
    if (column[channel]) {
      await db.query(`UPDATE crm_profiles SET ${column[channel]}=$1, updated_at=NOW() WHERE user_id=$2`, [status, id]);
    }
    await audit(c, session, 'update', 'crm_consent', id, `${channel} consent set to ${status}`);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save consent');
  }
});

crm.get('/people/:id/timeline', async (c) => {
  try {
    await admin(c);
    const id = c.req.param('id');
    const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || '100', 10) || 100));
    const db = getDb(c.env);
    const rows = await db.query<any>(
      `SELECT 'activity' AS kind, a.id, a.type AS subtype, COALESCE(a.subject,a.type) AS title, a.body AS detail, a.created_at, u.name AS actor
       FROM crm_activities a LEFT JOIN users u ON u.id=a.owner_id WHERE a.person_id=$1
       UNION ALL
       SELECT 'enrollment', e.id, e.access_type, c.title, 'Enrolled in ' || c.title, e.enrolled_at, NULL
       FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1
       UNION ALL
       SELECT 'payment', p.id, p.status, 'Payment ' || p.currency || ' ' || p.amount, p.provider, p.created_at, NULL
       FROM payments p WHERE p.user_id=$1
       UNION ALL
       SELECT 'certificate', cert.id, 'issued', c.title, cert.verification_code, cert.issued_at, NULL
       FROM certificates cert JOIN courses c ON c.id=cert.course_id WHERE cert.user_id=$1
       UNION ALL
       SELECT 'ticket', t.id, t.status, t.subject, t.description, t.created_at, NULL
       FROM support_tickets t WHERE t.user_id=$1
       UNION ALL
       SELECT 'message', m.id, m.channel, cv.subject, m.body, m.created_at, NULL
       FROM crm_messages m JOIN crm_conversations cv ON cv.id=m.conversation_id WHERE cv.person_id=$1
       ORDER BY created_at DESC LIMIT $2`,
      [id, limit]
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load timeline');
  }
});

// ─────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────
crm.get('/accounts', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const search = (c.req.query('search') || '').trim();
    const type = c.req.query('type') || '';
    const status = c.req.query('status') || '';
    const params: any[] = [];
    const where: string[] = ['1=1'];
    if (search) { params.push(`%${search}%`); where.push(`(a.name ILIKE $${params.length} OR a.email ILIKE $${params.length})`); }
    if (type) { params.push(type); where.push(`a.type = $${params.length}`); }
    if (status) { params.push(status); where.push(`a.status = $${params.length}`); }
    const rows = await db.query<any>(
      `SELECT a.*, u.name AS owner_name,
        (SELECT COUNT(*)::int FROM crm_account_contacts ac WHERE ac.account_id=a.id) AS contacts,
        (SELECT COUNT(*)::int FROM crm_opportunities o WHERE o.account_id=a.id) AS opportunities,
        (SELECT COALESCE(SUM(o.value),0)::float FROM crm_opportunities o WHERE o.account_id=a.id AND o.won_at IS NOT NULL) AS won_value
       FROM crm_accounts a LEFT JOIN users u ON u.id=a.owner_id WHERE ${where.join(' AND ')} ORDER BY a.updated_at DESC LIMIT 200`,
      params
    );
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, custom_fields: json(r.custom_fields, {}) })) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load accounts');
  }
});

crm.post('/accounts', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.name || '').trim()) return fail(c, 400, 'Account name is required');
    const id = crypto.randomUUID();
    const slug = String(body.slug || body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await getDb(c.env).query(
      `INSERT INTO crm_accounts (id,name,slug,type,website,industry,size,region,country,address,phone,email,owner_id,status,health_score,annual_value,currency,notes,custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [id, body.name, slug, body.type || 'school', body.website || null, body.industry || null, body.size || null, body.region || null, body.country || null, body.address || null, body.phone || null, body.email || null, body.owner_id || session.userId, body.status || 'prospect', asInt(body.health_score, 70), Number(body.annual_value) || 0, body.currency || 'NGN', body.notes || null, JSON.stringify(body.custom_fields || {})]
    );
    await audit(c, session, 'create', 'crm_account', id, `Created account ${body.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create account');
  }
});

crm.get('/accounts/:id', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const id = c.req.param('id');
    const [account, contacts, opportunities, activities, contracts] = await Promise.all([
      db.query<any>(`SELECT a.*, u.name AS owner_name FROM crm_accounts a LEFT JOIN users u ON u.id=a.owner_id WHERE a.id=$1`, [id]),
      db.query<any>(`SELECT ac.*, u.name AS user_name FROM crm_account_contacts ac LEFT JOIN users u ON u.id=ac.user_id WHERE ac.account_id=$1 ORDER BY ac.is_primary DESC, ac.created_at`, [id]),
      db.query<any>(`SELECT o.*, s.label AS stage_label FROM crm_opportunities o JOIN crm_pipeline_stages s ON s.id=o.stage_id WHERE o.account_id=$1 ORDER BY o.created_at DESC`, [id]),
      db.query<any>(`SELECT a.*, u.name AS owner_name FROM crm_activities a LEFT JOIN users u ON u.id=a.owner_id WHERE a.account_id=$1 ORDER BY a.created_at DESC LIMIT 50`, [id]),
      db.query<any>(`SELECT * FROM crm_contracts WHERE account_id=$1 ORDER BY created_at DESC`, [id]),
    ]);
    if (!account.rows.length) return fail(c, 404, 'Account not found');
    return c.json({ success: true, data: { account: { ...account.rows[0], custom_fields: json(account.rows[0].custom_fields, {}) }, contacts: contacts.rows, opportunities: opportunities.rows, activities: activities.rows, contracts: contracts.rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load account');
  }
});

crm.put('/accounts/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const allowed = ['name', 'slug', 'type', 'website', 'industry', 'size', 'region', 'country', 'address', 'phone', 'email', 'owner_id', 'status', 'health_score', 'annual_value', 'currency', 'notes'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) { fields.push(`${key} = $${values.length + 1}`); values.push(body[key]); }
    }
    if (body.custom_fields !== undefined) { fields.push(`custom_fields = $${values.length + 1}`); values.push(JSON.stringify(body.custom_fields)); }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at = NOW()');
    values.push(id);
    await getDb(c.env).query(`UPDATE crm_accounts SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    await audit(c, session, 'update', 'crm_account', id, 'Updated account');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update account');
  }
});

crm.delete('/accounts/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    await getDb(c.env).query('DELETE FROM crm_accounts WHERE id=$1', [id]);
    await audit(c, session, 'delete', 'crm_account', id, 'Deleted account');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete account');
  }
});

crm.post('/accounts/:id/contacts', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.name || '').trim()) return fail(c, 400, 'Contact name is required');
    const contactId = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_account_contacts (id,account_id,user_id,name,email,phone,role,title,is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [contactId, id, body.user_id || null, body.name, body.email || null, body.phone || null, body.role || 'contact', body.title || null, body.is_primary ? 1 : 0]
    );
    await audit(c, session, 'create', 'crm_account_contact', contactId, `Added contact to account ${id}`);
    return c.json({ success: true, data: { id: contactId } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to add contact');
  }
});

crm.delete('/accounts/:id/contacts/:contactId', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_account_contacts WHERE id=$1 AND account_id=$2', [c.req.param('contactId'), c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_account_contact', c.req.param('contactId'), 'Removed account contact');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to remove contact');
  }
});

// ─────────────────────────────────────────────────────────────
// Leads
// ─────────────────────────────────────────────────────────────
crm.get('/leads', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const stage = c.req.query('stage') || '';
    const search = (c.req.query('search') || '').trim();
    const params: any[] = [];
    const where = ['1=1'];
    if (stage) { params.push(stage); where.push(`l.stage=$${params.length}`); }
    if (search) { params.push(`%${search}%`); where.push(`(l.name ILIKE $${params.length} OR l.email ILIKE $${params.length})`); }
    const rows = await db.query<any>(
      `SELECT l.*, u.name AS owner_name, a.name AS account_name FROM crm_leads l LEFT JOIN users u ON u.id=l.owner_id LEFT JOIN crm_accounts a ON a.id=l.account_id
       WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC LIMIT 200`,
      params
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load leads');
  }
});

crm.post('/leads', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.name || '').trim()) return fail(c, 400, 'Lead name is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_leads (id,name,email,phone,source,interest,stage,owner_id,account_id,score,notes,consent_email,consent_sms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, body.name, body.email || null, body.phone || null, body.source || 'organic', body.interest || null, body.stage || 'new', body.owner_id || session.userId, body.account_id || null, asInt(body.score, 0), body.notes || null, body.consent_email === false ? 0 : 1, body.consent_sms ? 1 : 0]
    );
    await audit(c, session, 'create', 'crm_lead', id, `Created lead ${body.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create lead');
  }
});

crm.put('/leads/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const allowed = ['name', 'email', 'phone', 'source', 'interest', 'stage', 'owner_id', 'account_id', 'score', 'notes', 'consent_email', 'consent_sms', 'converted_user_id'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) { fields.push(`${key} = $${values.length + 1}`); values.push(body[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at = NOW()');
    values.push(id);
    await getDb(c.env).query(`UPDATE crm_leads SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_lead', id, 'Updated lead');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update lead');
  }
});

crm.delete('/leads/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_leads WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_lead', c.req.param('id'), 'Deleted lead');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete lead');
  }
});

// ─────────────────────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────────────────────
crm.get('/pipeline', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const kind = c.req.query('kind') || 'opportunity';
    const [stages, opportunities] = await Promise.all([
      db.query<any>(`SELECT * FROM crm_pipeline_stages WHERE kind=$1 ORDER BY position`, [kind]),
      db.query<any>(`SELECT o.*, s.label AS stage_label, s.color AS stage_color,
        COALESCE(u.name,l.name,a.name) AS person_name, COALESCE(u.email,l.email) AS person_email,
        c.title AS course_title, ac.name AS account_name
        FROM crm_opportunities o
        JOIN crm_pipeline_stages s ON s.id=o.stage_id
        LEFT JOIN users u ON u.id=o.person_id
        LEFT JOIN crm_leads l ON l.id=o.lead_id
        LEFT JOIN crm_accounts ac ON ac.id=o.account_id
        LEFT JOIN crm_accounts a ON a.id=o.account_id
        LEFT JOIN courses c ON c.id=o.course_id
        WHERE s.kind=$1 ORDER BY o.created_at DESC`, [kind]),
    ]);
    return c.json({ success: true, data: { stages: stages.rows, opportunities: opportunities.rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load pipeline');
  }
});

crm.get('/pipeline/stages', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM crm_pipeline_stages ORDER BY kind, position');
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load stages');
  }
});

crm.post('/pipeline/stages', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    const id = crypto.randomUUID();
    const key = String(body.key || body.label || 'stage').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    await getDb(c.env).query(
      `INSERT INTO crm_pipeline_stages (id,key,label,kind,position,color,is_won,is_lost) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, key, body.label || key, body.kind || 'opportunity', asInt(body.position, 99), body.color || 'blue', body.is_won ? 1 : 0, body.is_lost ? 1 : 0]
    );
    await audit(c, session, 'create', 'crm_stage', id, `Created stage ${body.label || key}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create stage');
  }
});

crm.put('/pipeline/stages/:id', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['label', 'position', 'color', 'is_won', 'is_lost']) {
      if (body[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(typeof body[key] === 'boolean' ? (body[key] ? 1 : 0) : body[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_pipeline_stages SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_stage', c.req.param('id'), 'Updated stage');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update stage');
  }
});

crm.delete('/pipeline/stages/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_pipeline_stages WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_stage', c.req.param('id'), 'Deleted stage');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete stage');
  }
});

crm.post('/opportunities', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.title || '').trim()) return fail(c, 400, 'Opportunity title is required');
    let stageId = body.stage_id;
    if (!stageId) {
      const stage = await getDb(c.env).query<any>(`SELECT id FROM crm_pipeline_stages WHERE kind='opportunity' ORDER BY position LIMIT 1`);
      stageId = stage.rows[0]?.id;
    }
    if (!stageId) return fail(c, 400, 'No pipeline stage configured');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_opportunities (id,person_id,lead_id,account_id,course_id,program_id,title,stage_id,value,currency,probability,owner_id,source,expected_close_at,next_step)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id, body.person_id || null, body.lead_id || null, body.account_id || null, body.course_id || null, body.program_id || null, body.title, stageId, Number(body.value) || 0, body.currency || 'NGN', asInt(body.probability, 20), body.owner_id || session.userId, body.source || 'organic', body.expected_close_at || null, body.next_step || null]
    );
    await logCrmActivity(c.env, { personId: body.person_id || null, leadId: body.lead_id || null, accountId: body.account_id || null, opportunityId: id, type: 'system', subject: 'Opportunity created', ownerId: session.userId });
    await audit(c, session, 'create', 'crm_opportunity', id, `Created opportunity ${body.title}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create opportunity');
  }
});

crm.put('/opportunities/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const allowed = ['person_id', 'lead_id', 'account_id', 'course_id', 'program_id', 'title', 'stage_id', 'value', 'currency', 'probability', 'owner_id', 'source', 'expected_close_at', 'won_at', 'lost_at', 'lost_reason', 'next_step'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(body[key]); }
    }
    if (body.stage_id) {
      const stage = await getDb(c.env).query<any>('SELECT is_won,is_lost FROM crm_pipeline_stages WHERE id=$1', [body.stage_id]);
      if (stage.rows[0]?.is_won && !body.won_at) { fields.push(`won_at=$${values.length + 1}`); values.push(new Date().toISOString()); }
      if (stage.rows[0]?.is_lost && !body.lost_at) { fields.push(`lost_at=$${values.length + 1}`); values.push(new Date().toISOString()); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()');
    values.push(id);
    await getDb(c.env).query(`UPDATE crm_opportunities SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_opportunity', id, 'Updated opportunity');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update opportunity');
  }
});

crm.delete('/opportunities/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_opportunities WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_opportunity', c.req.param('id'), 'Deleted opportunity');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete opportunity');
  }
});

// ─────────────────────────────────────────────────────────────
// Segments
// ─────────────────────────────────────────────────────────────
crm.get('/segments', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT s.*, u.name AS owner_name FROM crm_segments s LEFT JOIN users u ON u.id=s.owner_id ORDER BY s.created_at DESC`
    );
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, definition: json(r.definition, { match: 'all', rules: [] }) })) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load segments');
  }
});

crm.post('/segments', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.name || '').trim()) return fail(c, 400, 'Segment name is required');
    const id = crypto.randomUUID();
    const definition = body.definition || { match: 'all', rules: [] };
    const preview = await segmentCount(c.env, definition);
    await getDb(c.env).query(
      `INSERT INTO crm_segments (id,name,description,definition,owner_id,is_shared,last_count,last_run_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [id, body.name, body.description || null, JSON.stringify(definition), session.userId, body.is_shared === false ? 0 : 1, preview]
    );
    await audit(c, session, 'create', 'crm_segment', id, `Created segment ${body.name}`);
    return c.json({ success: true, data: { id, count: preview } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create segment');
  }
});

crm.put('/segments/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    if (body.name !== undefined) { fields.push(`name=$${values.length + 1}`); values.push(body.name); }
    if (body.description !== undefined) { fields.push(`description=$${values.length + 1}`); values.push(body.description); }
    if (body.definition !== undefined) {
      fields.push(`definition=$${values.length + 1}`); values.push(JSON.stringify(body.definition));
      const count = await segmentCount(c.env, body.definition);
      fields.push(`last_count=$${values.length + 1}`); values.push(count);
      fields.push('last_run_at=NOW()');
    }
    if (body.is_shared !== undefined) { fields.push(`is_shared=$${values.length + 1}`); values.push(body.is_shared ? 1 : 0); }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()');
    values.push(id);
    await getDb(c.env).query(`UPDATE crm_segments SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_segment', id, 'Updated segment');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update segment');
  }
});

crm.delete('/segments/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_segments WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_segment', c.req.param('id'), 'Deleted segment');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete segment');
  }
});

async function segmentCount(env: Env, definition: any): Promise<number> {
  const { where, params } = buildSegmentWhere(definition as CrmDefinition);
  const rows = await getDb(env).query<any>(`SELECT COUNT(*)::int AS n FROM crm_profiles p WHERE ${where}`, params);
  return Number(rows.rows[0]?.n) || 0;
}

async function segmentMembers(env: Env, definition: any, limit = 100): Promise<any[]> {
  const { where, params } = buildSegmentWhere(definition as CrmDefinition);
  params.push(limit);
  const rows = await getDb(env).query<any>(
    `SELECT u.id,u.name,u.email,u.avatar,p.lifecycle_stage,p.risk_score,p.lifetime_value,p.last_activity_at
     FROM crm_profiles p JOIN users u ON u.id=p.user_id WHERE ${where}
     ORDER BY p.lifetime_value DESC, p.last_activity_at DESC LIMIT $${params.length}`,
    params
  );
  return rows.rows;
}

crm.post('/segments/:id/preview', async (c) => {
  try {
    await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    let definition = body.definition;
    if (!definition) {
      const row = await getDb(c.env).query<any>('SELECT definition FROM crm_segments WHERE id=$1', [c.req.param('id')]);
      if (!row.rows.length) return fail(c, 404, 'Segment not found');
      definition = json(row.rows[0].definition, {});
    }
    const count = await segmentCount(c.env, definition);
    const sample = await segmentMembers(c.env, definition, 10);
    return c.json({ success: true, data: { count, sample } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to preview segment');
  }
});

crm.post('/segments/:id/refresh', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const row = await getDb(c.env).query<any>('SELECT definition FROM crm_segments WHERE id=$1', [id]);
    if (!row.rows.length) return fail(c, 404, 'Segment not found');
    const definition = json(row.rows[0].definition, {});
    const members = await segmentMembers(c.env, definition, 5000);
    await getDb(c.env).query('DELETE FROM crm_segment_members WHERE segment_id=$1', [id]);
    for (const member of members) {
      await getDb(c.env).query(
        'INSERT OR IGNORE INTO crm_segment_members (segment_id, person_id) VALUES ($1,$2)',
        [id, member.id]
      );
    }
    const count = await segmentCount(c.env, definition);
    await getDb(c.env).query('UPDATE crm_segments SET last_count=$1,last_run_at=NOW() WHERE id=$2', [count, id]);
    await audit(c, session, 'update', 'crm_segment', id, `Refreshed segment (${count})`);
    return c.json({ success: true, data: { count } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to refresh segment');
  }
});

crm.get('/segments/:id/members', async (c) => {
  try {
    await admin(c);
    const row = await getDb(c.env).query<any>('SELECT definition FROM crm_segments WHERE id=$1', [c.req.param('id')]);
    if (!row.rows.length) return fail(c, 404, 'Segment not found');
    const members = await segmentMembers(c.env, json(row.rows[0].definition, {}), 500);
    return c.json({ success: true, data: members });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load segment members');
  }
});

// ─────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────
crm.get('/campaigns', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT c.*, t.name AS template_name, s.name AS segment_name
       FROM crm_campaigns c LEFT JOIN crm_templates t ON t.id=c.template_id LEFT JOIN crm_segments s ON s.id=c.segment_id
       ORDER BY c.created_at DESC LIMIT 200`
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load campaigns');
  }
});

crm.post('/campaigns', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.name || '').trim()) return fail(c, 400, 'Campaign name is required');
    const id = crypto.randomUUID();
    let audience = 0;
    if (body.segment_id) {
      const seg = await getDb(c.env).query<any>('SELECT definition FROM crm_segments WHERE id=$1', [body.segment_id]);
      if (seg.rows.length) audience = await segmentCount(c.env, json(seg.rows[0].definition, {}));
    }
    await getDb(c.env).query(
      `INSERT INTO crm_campaigns (id,name,channel,template_id,segment_id,status,scheduled_at,created_by,audience_count,goal,course_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, body.name, body.channel || 'email', body.template_id || null, body.segment_id || null, body.status || 'draft', body.scheduled_at || null, session.userId, audience, body.goal || null, body.course_id || null]
    );
    await audit(c, session, 'create', 'crm_campaign', id, `Created campaign ${body.name}`);
    return c.json({ success: true, data: { id, audience } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create campaign');
  }
});

crm.put('/campaigns/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const allowed = ['name', 'channel', 'template_id', 'segment_id', 'status', 'scheduled_at', 'goal', 'course_id'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(body[key]); }
    }
    if (body.segment_id !== undefined) {
      const seg = await getDb(c.env).query<any>('SELECT definition FROM crm_segments WHERE id=$1', [body.segment_id]);
      if (seg.rows.length) {
        const audience = await segmentCount(c.env, json(seg.rows[0].definition, {}));
        fields.push(`audience_count=$${values.length + 1}`); values.push(audience);
      }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()');
    values.push(id);
    await getDb(c.env).query(`UPDATE crm_campaigns SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_campaign', id, 'Updated campaign');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update campaign');
  }
});

crm.delete('/campaigns/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_campaigns WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_campaign', c.req.param('id'), 'Deleted campaign');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete campaign');
  }
});

crm.get('/campaigns/:id', async (c) => {
  try {
    await admin(c);
    const id = c.req.param('id');
    const [campaign, recipients] = await Promise.all([
      getDb(c.env).query<any>(`SELECT c.*, t.name AS template_name, t.subject AS template_subject, t.body AS template_body, s.name AS segment_name FROM crm_campaigns c LEFT JOIN crm_templates t ON t.id=c.template_id LEFT JOIN crm_segments s ON s.id=c.segment_id WHERE c.id=$1`, [id]),
      getDb(c.env).query<any>(`SELECT r.*, u.name, u.email FROM crm_campaign_recipients r JOIN users u ON u.id=r.person_id WHERE r.campaign_id=$1 ORDER BY r.created_at DESC LIMIT 200`, [id]),
    ]);
    if (!campaign.rows.length) return fail(c, 404, 'Campaign not found');
    return c.json({ success: true, data: { campaign: campaign.rows[0], recipients: recipients.rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load campaign');
  }
});

crm.post('/campaigns/:id/send', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const db = getDb(c.env);
    const campaign = (await db.query<any>('SELECT * FROM crm_campaigns WHERE id=$1', [id])).rows[0];
    if (!campaign) return fail(c, 404, 'Campaign not found');
    if (!campaign.segment_id) return fail(c, 400, 'Campaign has no audience segment');
    const segment = (await db.query<any>('SELECT definition FROM crm_segments WHERE id=$1', [campaign.segment_id])).rows[0];
    if (!segment) return fail(c, 400, 'Segment not found');
    const template = campaign.template_id
      ? (await db.query<any>('SELECT * FROM crm_templates WHERE id=$1', [campaign.template_id])).rows[0]
      : null;
    const members = await segmentMembers(c.env, json(segment.definition, {}), 300);
    await db.query('UPDATE crm_campaigns SET status=$1, sent_at=NOW(), audience_count=$2 WHERE id=$3', ['sending', members.length, id]);
    let sent = 0;
    let delivered = 0;
    for (const member of members) {
      const person = (await db.query<any>(
        `SELECT u.id,u.name,u.email,p.email_opt_in,p.push_opt_in,p.do_not_contact FROM users u JOIN crm_profiles p ON p.user_id=u.id WHERE u.id=$1`,
        [member.id]
      )).rows[0];
      if (!person || person.do_not_contact) continue;
      const already = await db.query<any>('SELECT 1 FROM crm_campaign_recipients WHERE campaign_id=$1 AND person_id=$2', [id, person.id]);
      if (already.rows.length) continue;
      const recipientId = crypto.randomUUID();
      try {
        if (campaign.channel === 'email' && template && person.email_opt_in) {
          const subject = String(template.subject || campaign.name).replace(/\{\{name\}\}/g, person.name || 'there');
          const html = String(template.body || '').replace(/\{\{name\}\}/g, person.name || 'there');
          const result = await sendEmail(c.env, { to: person.email, subject, html });
          delivered += result.ok ? 1 : 0;
        } else if (campaign.channel === 'in_app' || campaign.channel === 'push') {
          await createNotification(c.env, { user_id: person.id, type: 'info', title: campaign.name, message: template?.body || campaign.goal || campaign.name });
          delivered++;
        }
        await db.query(
          `INSERT INTO crm_campaign_recipients (id,campaign_id,person_id,status,sent_at,delivered_at) VALUES ($1,$2,$3,'sent',NOW(),$4)`,
          [recipientId, id, person.id, delivered ? new Date().toISOString() : null]
        );
        sent++;
      } catch (err: any) {
        await db.query(
          `INSERT INTO crm_campaign_recipients (id,campaign_id,person_id,status,error) VALUES ($1,$2,$3,'failed',$4)`,
          [recipientId, id, person.id, err?.message || 'send failed']
        );
      }
    }
    await db.query('UPDATE crm_campaigns SET status=$1, sent_count=$2, delivered_count=$3 WHERE id=$4', ['sent', sent, delivered, id]);
    await audit(c, session, 'send', 'crm_campaign', id, `Sent campaign to ${sent} people`);
    return c.json({ success: true, data: { sent, delivered, audience: members.length } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send campaign');
  }
});

// ─────────────────────────────────────────────────────────────
// Inbox
// ─────────────────────────────────────────────────────────────
crm.get('/inbox', async (c) => {
  try {
    await admin(c);
    await syncInbox(c.env);
    const db = getDb(c.env);
    const status = c.req.query('status') || '';
    const channel = c.req.query('channel') || '';
    const assignee = c.req.query('assignee') || '';
    const search = (c.req.query('search') || '').trim();
    const params: any[] = [];
    const where = ['1=1'];
    if (status) { params.push(status); where.push(`cv.status=$${params.length}`); }
    if (channel) { params.push(channel); where.push(`cv.channel=$${params.length}`); }
    if (assignee) { params.push(assignee); where.push(`cv.assignee_id=$${params.length}`); }
    if (search) { params.push(`%${search}%`); where.push(`(cv.subject ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }
    const rows = await db.query<any>(
      `SELECT cv.*, u.name AS person_name, u.email AS person_email, u.avatar AS person_avatar,
        a.name AS assignee_name,
        (SELECT body FROM crm_messages m WHERE m.conversation_id=cv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
       FROM crm_conversations cv LEFT JOIN users u ON u.id=cv.person_id LEFT JOIN users a ON a.id=cv.assignee_id
       WHERE ${where.join(' AND ')} ORDER BY CASE WHEN cv.status='open' THEN 0 ELSE 1 END, cv.last_message_at DESC LIMIT 200`,
      params
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load inbox');
  }
});

crm.get('/inbox/:id', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const id = c.req.param('id');
    const conversation = await db.query<any>(
      `SELECT cv.*, u.name AS person_name, u.email AS person_email, u.avatar AS person_avatar, a.name AS assignee_name
       FROM crm_conversations cv LEFT JOIN users u ON u.id=cv.person_id LEFT JOIN users a ON a.id=cv.assignee_id WHERE cv.id=$1`,
      [id]
    );
    if (!conversation.rows.length) return fail(c, 404, 'Conversation not found');
    const messages = await db.query<any>(
      `SELECT m.*, u.name AS author_name FROM crm_messages m LEFT JOIN users u ON u.id=m.author_id WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`,
      [id]
    );
    await db.query('UPDATE crm_messages SET read_at=COALESCE(read_at,NOW()) WHERE conversation_id=$1', [id]);
    await db.query('UPDATE crm_conversations SET unread_count=0 WHERE id=$1', [id]);
    return c.json({ success: true, data: { conversation: conversation.rows[0], messages: messages.rows.map((m: any) => ({ ...m, metadata: json(m.metadata, {}) })) } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load conversation');
  }
});

crm.post('/inbox/:id/reply', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const text = String(body.body || '').trim();
    if (!text) return fail(c, 400, 'Reply body is required');
    const db = getDb(c.env);
    const conversation = (await db.query<any>('SELECT * FROM crm_conversations WHERE id=$1', [id])).rows[0];
    if (!conversation) return fail(c, 404, 'Conversation not found');
    await db.query(
      `INSERT INTO crm_messages (id,conversation_id,direction,channel,body,author_id,is_internal,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [crypto.randomUUID(), id, body.is_internal ? 'internal' : 'outbound', conversation.channel, text, session.userId, body.is_internal ? 1 : 0, JSON.stringify({ source: 'crm_reply' })]
    );
    await db.query('UPDATE crm_conversations SET last_message_at=NOW(), status=$1, updated_at=NOW() WHERE id=$2', [body.status || conversation.status, id]);
    if (conversation.related_type === 'support_ticket' && conversation.related_id && !body.is_internal) {
      await db.query(
        `INSERT INTO ticket_replies (id,ticket_id,admin_id,message) VALUES ($1,$2,$3,$4)`,
        [crypto.randomUUID(), conversation.related_id, session.userId, text]
      );
      await db.query(`UPDATE support_tickets SET status='pending', updated_at=NOW() WHERE id=$1`, [conversation.related_id]);
    }
    await audit(c, session, 'reply', 'crm_conversation', id, 'Replied to conversation');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to send reply');
  }
});

crm.put('/inbox/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['assignee_id', 'status', 'priority', 'sla_due_at']) {
      if (body[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(body[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()');
    values.push(id);
    await getDb(c.env).query(`UPDATE crm_conversations SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_conversation', id, 'Updated conversation');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update conversation');
  }
});

// ─────────────────────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────────────────────
crm.get('/tasks', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const status = c.req.query('status') || '';
    const assignee = c.req.query('assignee') || '';
    const person = c.req.query('person_id') || '';
    const overdue = c.req.query('overdue') === '1';
    const params: any[] = [];
    const where = ['1=1'];
    if (status) { params.push(status); where.push(`t.status=$${params.length}`); }
    if (assignee) { params.push(assignee); where.push(`t.assignee_id=$${params.length}`); }
    if (person) { params.push(person); where.push(`t.person_id=$${params.length}`); }
    if (overdue) where.push(`t.status='open' AND t.due_at IS NOT NULL AND t.due_at < NOW()`);
    const rows = await db.query<any>(
      `SELECT t.*, u.name AS assignee_name, p.name AS person_name, p.email AS person_email, a.name AS account_name
       FROM crm_tasks t LEFT JOIN users u ON u.id=t.assignee_id LEFT JOIN users p ON p.id=t.person_id LEFT JOIN crm_accounts a ON a.id=t.account_id
       WHERE ${where.join(' AND ')} ORDER BY CASE WHEN t.status='open' THEN 0 ELSE 1 END, t.due_at ASC LIMIT 300`,
      params
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load tasks');
  }
});

crm.post('/tasks', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.title || '').trim()) return fail(c, 400, 'Task title is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_tasks (id,title,description,person_id,lead_id,account_id,opportunity_id,assignee_id,due_at,priority,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, body.title, body.description || null, body.person_id || null, body.lead_id || null, body.account_id || null, body.opportunity_id || null, body.assignee_id || session.userId, body.due_at || null, body.priority || 'medium', body.status || 'open', session.userId]
    );
    await audit(c, session, 'create', 'crm_task', id, `Created task ${body.title}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create task');
  }
});

crm.put('/tasks/:id', async (c) => {
  try {
    const session = await admin(c);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['title', 'description', 'assignee_id', 'due_at', 'priority', 'status', 'person_id', 'account_id', 'opportunity_id']) {
      if (body[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(body[key]); }
    }
    if (body.status === 'completed') { fields.push('completed_at=NOW()'); }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()');
    values.push(id);
    await getDb(c.env).query(`UPDATE crm_tasks SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_task', id, 'Updated task');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update task');
  }
});

crm.delete('/tasks/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_tasks WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_task', c.req.param('id'), 'Deleted task');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete task');
  }
});

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────
crm.get('/reports', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const [funnel, revenue, sources, courses, instructors, support, campaigns, retention, surveys] = await Promise.all([
      db.query<any>(`SELECT lifecycle_stage AS stage, COUNT(*)::int AS count FROM crm_profiles GROUP BY lifecycle_stage ORDER BY count DESC`),
      db.query<any>(`SELECT substr(created_at,1,7) AS month,
        COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0)::float AS revenue,
        COALESCE(SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END),0)::float AS refunds,
        COUNT(*)::int AS transactions
        FROM payments GROUP BY month ORDER BY month DESC LIMIT 12`),
      db.query<any>(`SELECT COALESCE(lead_source,'organic') AS source, COUNT(*)::int AS people,
        COALESCE(SUM(lifetime_value),0)::float AS value,
        COALESCE(AVG(lifetime_value),0)::float AS average
        FROM crm_profiles GROUP BY source ORDER BY value DESC`),
      db.query<any>(`SELECT c.id,c.title,c.level,COUNT(DISTINCT e.user_id)::int AS students,
        COALESCE(AVG(e.progress),0)::float AS avg_progress,
        SUM(CASE WHEN e.completed=1 THEN 1 ELSE 0 END)::int AS completions,
        COALESCE(SUM(CASE WHEN p.status='completed' THEN p.amount ELSE 0 END),0)::float AS revenue
        FROM courses c LEFT JOIN enrollments e ON e.course_id=c.id LEFT JOIN payments p ON p.course_id=c.id
        GROUP BY c.id ORDER BY students DESC LIMIT 30`),
      db.query<any>(`SELECT u.id,u.name,COUNT(DISTINCT c.id)::int AS courses,COUNT(DISTINCT e.user_id)::int AS students,
        COALESCE(AVG(r.rating),0)::float AS rating,
        COALESCE(SUM(CASE WHEN p.status='completed' THEN p.amount ELSE 0 END),0)::float AS revenue
        FROM users u LEFT JOIN courses c ON c.instructor_id=u.id LEFT JOIN enrollments e ON e.course_id=c.id
        LEFT JOIN reviews r ON r.course_id=c.id LEFT JOIN payments p ON p.course_id=c.id
        WHERE u.role='instructor' GROUP BY u.id ORDER BY students DESC LIMIT 30`),
      db.query<any>(`SELECT status, COUNT(*)::int AS count FROM support_tickets GROUP BY status`),
      db.query<any>(`SELECT id,name,channel,status,audience_count,sent_count,delivered_count,opened_count,clicked_count,converted_count FROM crm_campaigns ORDER BY created_at DESC LIMIT 30`),
      db.query<any>(`SELECT substr(u.created_at,1,7) AS cohort, COUNT(DISTINCT u.id)::int AS signups,
        COUNT(DISTINCT CASE WHEN lp.updated_at IS NOT NULL THEN u.id END)::int AS activated
        FROM users u LEFT JOIN lesson_progress lp ON lp.user_id=u.id
        GROUP BY cohort ORDER BY cohort DESC LIMIT 12`),
      db.query<any>(`SELECT s.name,s.type,COUNT(r.id)::int AS responses,COALESCE(AVG(r.score),0)::float AS average_score
        FROM crm_surveys s LEFT JOIN crm_survey_responses r ON r.survey_id=s.id GROUP BY s.id ORDER BY responses DESC`),
    ]);
    return c.json({
      success: true,
      data: {
        funnel: funnel.rows,
        revenue: revenue.rows,
        sources: sources.rows,
        courses: courses.rows,
        instructors: instructors.rows,
        support: support.rows,
        campaigns: campaigns.rows,
        retention: retention.rows,
        surveys: surveys.rows,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load reports');
  }
});

// ─────────────────────────────────────────────────────────────
// Settings and utilities
// ─────────────────────────────────────────────────────────────
crm.get('/settings', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const [stages, tags, fields, templates, playbooks, owners, trials] = await Promise.all([
      db.query<any>('SELECT * FROM crm_pipeline_stages ORDER BY kind, position'),
      db.query<any>('SELECT * FROM crm_tags ORDER BY name'),
      db.query<any>('SELECT * FROM crm_custom_fields ORDER BY entity, position'),
      db.query<any>('SELECT * FROM crm_templates ORDER BY name'),
      db.query<any>('SELECT * FROM crm_playbooks ORDER BY name'),
      db.query<any>(`SELECT id,name,email,role FROM users WHERE role IN ('admin','super_admin','instructor') ORDER BY name`),
      db.query<any>(`SELECT * FROM trial_settings WHERE id='default'`),
    ]);
    return c.json({
      success: true,
      data: {
        stages: stages.rows,
        tags: tags.rows,
        custom_fields: fields.rows.map((f: any) => ({ ...f, options: json(f.options, []) })),
        templates: templates.rows,
        playbooks: playbooks.rows.map((p: any) => ({ ...p, steps: json(p.steps, []) })),
        owners: owners.rows,
        trial_settings: trials.rows[0] || null,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load CRM settings');
  }
});

crm.get('/owners', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(`SELECT id,name,email,role FROM users WHERE role IN ('admin','super_admin','instructor') ORDER BY name`);
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load owners');
  }
});

crm.get('/tags', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM crm_tags ORDER BY name');
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load tags');
  }
});

crm.post('/tags', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    if (!name) return fail(c, 400, 'Tag name is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query('INSERT INTO crm_tags (id,name,color) VALUES ($1,$2,$3)', [id, name, body.color || 'gray']);
    await audit(c, session, 'create', 'crm_tag', id, `Created tag ${name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create tag');
  }
});

crm.get('/templates', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM crm_templates ORDER BY name');
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load templates');
  }
});

crm.post('/templates', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!String(body.name || '').trim() || !String(body.body || '').trim()) return fail(c, 400, 'Template name and body are required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_templates (id,name,channel,subject,body,category,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, body.name, body.channel || 'email', body.subject || null, body.body, body.category || 'general', session.userId]
    );
    await audit(c, session, 'create', 'crm_template', id, `Created template ${body.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create template');
  }
});

crm.put('/templates/:id', async (c) => {
  try {
    const session = await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ['name', 'channel', 'subject', 'body', 'category']) {
      if (body[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(body[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()');
    values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_templates SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_template', c.req.param('id'), 'Updated template');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update template');
  }
});

crm.delete('/templates/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_templates WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_template', c.req.param('id'), 'Deleted template');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete template');
  }
});

crm.post('/maintenance/refresh', async (c) => {
  try {
    const session = await admin(c);
    await ensureProfiles(c.env);
    await refreshProfileScores(c.env);
    await audit(c, session, 'refresh', 'crm', null, 'Refreshed CRM profiles and scores');
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to refresh CRM');
  }
});

crm.get('/search', async (c) => {
  try {
    await admin(c);
    const q = (c.req.query('q') || '').trim();
    if (!q) return c.json({ success: true, data: { people: [], accounts: [], leads: [] } });
    const like = `%${q}%`;
    const db = getDb(c.env);
    const [people, accounts, leads] = await Promise.all([
      db.query<any>(`SELECT u.id,u.name,u.email,p.lifecycle_stage FROM crm_profiles p JOIN users u ON u.id=p.user_id WHERE u.name ILIKE $1 OR u.email ILIKE $1 LIMIT 10`, [like]),
      db.query<any>(`SELECT id,name,type,status FROM crm_accounts WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10`, [like]),
      db.query<any>(`SELECT id,name,email,stage FROM crm_leads WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 10`, [like]),
    ]);
    return c.json({ success: true, data: { people: people.rows, accounts: accounts.rows, leads: leads.rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to search CRM');
  }
});

// ─────────────────────────────────────────────────────────────
// Success plans, referrals, surveys and contracts
// ─────────────────────────────────────────────────────────────
crm.get('/success-plans', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT sp.*, u.name AS person_name, u.email AS person_email, o.name AS owner_name,
        (SELECT COUNT(*)::int FROM crm_success_milestones m WHERE m.plan_id=sp.id) AS milestones,
        (SELECT COUNT(*)::int FROM crm_success_milestones m WHERE m.plan_id=sp.id AND m.status='completed') AS completed
       FROM crm_success_plans sp JOIN users u ON u.id=sp.person_id LEFT JOIN users o ON o.id=sp.owner_id
       ORDER BY sp.created_at DESC LIMIT 200`
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load success plans'); }
});

crm.post('/success-plans', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.person_id || !String(b.name || '').trim()) return fail(c, 400, 'Person and plan name are required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_success_plans (id,person_id,name,goal,status,owner_id,start_date,target_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, b.person_id, b.name, b.goal || null, b.status || 'active', b.owner_id || session.userId, b.start_date || null, b.target_date || null]
    );
    await audit(c, session, 'create', 'crm_success_plan', id, `Created success plan ${b.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create success plan'); }
});

crm.put('/success-plans/:id', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['name', 'goal', 'status', 'owner_id', 'start_date', 'target_date']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_success_plans SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_success_plan', c.req.param('id'), 'Updated success plan');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update success plan'); }
});

crm.delete('/success-plans/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_success_plans WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_success_plan', c.req.param('id'), 'Deleted success plan');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete success plan'); }
});

crm.get('/success-plans/:id/milestones', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM crm_success_milestones WHERE plan_id=$1 ORDER BY position, created_at', [c.req.param('id')]);
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load milestones'); }
});

crm.post('/success-plans/:id/milestones', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!String(b.title || '').trim()) return fail(c, 400, 'Milestone title is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_success_milestones (id,plan_id,title,description,due_at,status,position) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, c.req.param('id'), b.title, b.description || null, b.due_at || null, b.status || 'open', asInt(b.position, 0)]
    );
    await audit(c, session, 'create', 'crm_success_milestone', id, `Added milestone ${b.title}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to add milestone'); }
});

crm.put('/success-plans/:id/milestones/:milestoneId', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['title', 'description', 'due_at', 'status', 'position']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (b.status === 'completed') fields.push('completed_at=NOW()');
    if (!fields.length) return c.json({ success: true });
    values.push(c.req.param('milestoneId'));
    await getDb(c.env).query(`UPDATE crm_success_milestones SET ${fields.join(', ')} WHERE id=$${values.length} AND plan_id=$${values.length + 1}`, [...values, c.req.param('id')]);
    await audit(c, session, 'update', 'crm_success_milestone', c.req.param('milestoneId'), 'Updated milestone');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update milestone'); }
});

crm.delete('/success-plans/:id/milestones/:milestoneId', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_success_milestones WHERE id=$1 AND plan_id=$2', [c.req.param('milestoneId'), c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_success_milestone', c.req.param('milestoneId'), 'Deleted milestone');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete milestone'); }
});

crm.get('/referrals', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT r.*, u.name AS referrer_name, u.email AS referrer_email FROM crm_referrals r LEFT JOIN users u ON u.id=r.referrer_id ORDER BY r.created_at DESC LIMIT 200`
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load referrals'); }
});

crm.post('/referrals', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_referrals (id,referrer_id,referred_name,referred_email,referred_user_id,code,status,reward_amount,currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, b.referrer_id || null, b.referred_name || null, b.referred_email || null, b.referred_user_id || null, b.code || null, b.status || 'invited', Number(b.reward_amount) || 0, b.currency || 'NGN']
    );
    await audit(c, session, 'create', 'crm_referral', id, 'Created referral');
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create referral'); }
});

crm.put('/referrals/:id', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['referrer_id', 'referred_name', 'referred_email', 'referred_user_id', 'code', 'status', 'reward_amount', 'currency']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (b.status === 'converted') fields.push('converted_at=NOW()');
    if (!fields.length) return c.json({ success: true });
    values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_referrals SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_referral', c.req.param('id'), 'Updated referral');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update referral'); }
});

crm.delete('/referrals/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_referrals WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_referral', c.req.param('id'), 'Deleted referral');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete referral'); }
});

crm.get('/surveys', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT s.*, (SELECT COUNT(*)::int FROM crm_survey_responses r WHERE r.survey_id=s.id) AS responses,
        (SELECT COALESCE(AVG(r.score),0)::float FROM crm_survey_responses r WHERE r.survey_id=s.id) AS average_score
       FROM crm_surveys s ORDER BY s.created_at DESC`
    );
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, questions: json(r.questions, []) })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load surveys'); }
});

crm.post('/surveys', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!String(b.name || '').trim()) return fail(c, 400, 'Survey name is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_surveys (id,name,type,questions,status) VALUES ($1,$2,$3,$4,$5)`,
      [id, b.name, b.type || 'nps', JSON.stringify(b.questions || []), b.status || 'draft']
    );
    await audit(c, session, 'create', 'crm_survey', id, `Created survey ${b.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create survey'); }
});

crm.put('/surveys/:id', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['name', 'type', 'status']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (b.questions !== undefined) { fields.push(`questions=$${values.length + 1}`); values.push(JSON.stringify(b.questions)); }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_surveys SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_survey', c.req.param('id'), 'Updated survey');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update survey'); }
});

crm.delete('/surveys/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_surveys WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_survey', c.req.param('id'), 'Deleted survey');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete survey'); }
});

crm.get('/surveys/:id/responses', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT r.*, u.name AS person_name FROM crm_survey_responses r LEFT JOIN users u ON u.id=r.person_id WHERE r.survey_id=$1 ORDER BY r.created_at DESC LIMIT 200`,
      [c.req.param('id')]
    );
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, answers: json(r.answers, {}) })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load responses'); }
});

crm.post('/surveys/:id/responses', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_survey_responses (id,survey_id,person_id,score,answers,comment) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, c.req.param('id'), b.person_id || null, b.score === undefined ? null : asInt(b.score, 0), JSON.stringify(b.answers || {}), b.comment || null]
    );
    await audit(c, session, 'create', 'crm_survey_response', id, 'Recorded survey response');
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to record response'); }
});

crm.get('/contracts', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT ct.*, a.name AS account_name, u.name AS person_name FROM crm_contracts ct LEFT JOIN crm_accounts a ON a.id=ct.account_id LEFT JOIN users u ON u.id=ct.person_id ORDER BY ct.created_at DESC LIMIT 200`
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load contracts'); }
});

crm.post('/contracts', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!String(b.title || '').trim()) return fail(c, 400, 'Contract title is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_contracts (id,account_id,person_id,title,type,value,currency,start_date,end_date,renewal_date,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, b.account_id || null, b.person_id || null, b.title, b.type || 'training', Number(b.value) || 0, b.currency || 'NGN', b.start_date || null, b.end_date || null, b.renewal_date || null, b.status || 'draft', b.notes || null]
    );
    await audit(c, session, 'create', 'crm_contract', id, `Created contract ${b.title}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create contract'); }
});

crm.put('/contracts/:id', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['account_id', 'person_id', 'title', 'type', 'value', 'currency', 'start_date', 'end_date', 'renewal_date', 'status', 'notes']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_contracts SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_contract', c.req.param('id'), 'Updated contract');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update contract'); }
});

crm.delete('/contracts/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_contracts WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_contract', c.req.param('id'), 'Deleted contract');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete contract'); }
});

// ─────────────────────────────────────────────────────────────
// Playbooks, approvals, targets, automations and custom fields
// ─────────────────────────────────────────────────────────────
crm.get('/playbooks', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM crm_playbooks ORDER BY name');
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, steps: json(r.steps, []) })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load playbooks'); }
});

crm.post('/playbooks', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!String(b.name || '').trim()) return fail(c, 400, 'Playbook name is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_playbooks (id,name,description,trigger,steps,status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, b.name, b.description || null, b.trigger || null, JSON.stringify(b.steps || []), b.status || 'active']
    );
    await audit(c, session, 'create', 'crm_playbook', id, `Created playbook ${b.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create playbook'); }
});

crm.put('/playbooks/:id', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['name', 'description', 'trigger', 'status']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (b.steps !== undefined) { fields.push(`steps=$${values.length + 1}`); values.push(JSON.stringify(b.steps)); }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_playbooks SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_playbook', c.req.param('id'), 'Updated playbook');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update playbook'); }
});

crm.delete('/playbooks/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_playbooks WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_playbook', c.req.param('id'), 'Deleted playbook');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete playbook'); }
});

crm.get('/approvals', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT ap.*, req.name AS requested_by_name, rev.name AS reviewed_by_name FROM crm_approvals ap
       LEFT JOIN users req ON req.id=ap.requested_by LEFT JOIN users rev ON rev.id=ap.reviewed_by ORDER BY ap.created_at DESC LIMIT 200`
    );
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load approvals'); }
});

crm.post('/approvals', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.type || !b.entity || !b.entity_id) return fail(c, 400, 'Type, entity and entity id are required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_approvals (id,type,entity,entity_id,requested_by,status,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, b.type, b.entity, b.entity_id, session.userId, b.status || 'pending', b.reason || null]
    );
    await audit(c, session, 'create', 'crm_approval', id, `Requested approval for ${b.entity}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create approval'); }
});

crm.put('/approvals/:id', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['status', 'reason']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(b[key]); }
    }
    if (b.status && b.status !== 'pending') { fields.push(`reviewed_by=$${values.length + 1}`); values.push(session.userId); fields.push('reviewed_at=NOW()'); }
    if (!fields.length) return c.json({ success: true });
    values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_approvals SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_approval', c.req.param('id'), 'Reviewed approval');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update approval'); }
});

crm.get('/targets', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(`SELECT t.*, u.name AS owner_name FROM crm_targets t LEFT JOIN users u ON u.id=t.owner_id ORDER BY t.created_at DESC`);
    return c.json({ success: true, data: rows.rows });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load targets'); }
});

crm.post('/targets', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.period || !b.metric) return fail(c, 400, 'Period and metric are required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_targets (id,owner_id,period,metric,target_value,currency) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, b.owner_id || null, b.period, b.metric, Number(b.target_value) || 0, b.currency || 'NGN']
    );
    await audit(c, session, 'create', 'crm_target', id, `Created target ${b.metric} for ${b.period}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create target'); }
});

crm.delete('/targets/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_targets WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_target', c.req.param('id'), 'Deleted target');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete target'); }
});

crm.get('/custom-fields', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM crm_custom_fields ORDER BY entity, position, label');
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, options: json(r.options, []) })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load custom fields'); }
});

crm.post('/custom-fields', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.key || !b.label) return fail(c, 400, 'Field key and label are required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_custom_fields (id,entity,key,label,type,options,required,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, b.entity || 'person', b.key, b.label, b.type || 'text', JSON.stringify(b.options || []), b.required ? 1 : 0, asInt(b.position, 0)]
    );
    await audit(c, session, 'create', 'crm_custom_field', id, `Created custom field ${b.label}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create custom field'); }
});

crm.delete('/custom-fields/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_custom_fields WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_custom_field', c.req.param('id'), 'Deleted custom field');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete custom field'); }
});

crm.get('/automations', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>(
      `SELECT a.*, (SELECT COUNT(*)::int FROM crm_automation_runs r WHERE r.automation_id=a.id) AS runs
       FROM crm_automations a ORDER BY a.created_at DESC`
    );
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, conditions: json(r.conditions, {}), actions: json(r.actions, []) })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load automations'); }
});

crm.post('/automations', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!String(b.name || '').trim() || !b.trigger) return fail(c, 400, 'Automation name and trigger are required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_automations (id,name,trigger,conditions,actions,enabled,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, b.name, b.trigger, JSON.stringify(b.conditions || { match: 'all', rules: [] }), JSON.stringify(b.actions || []), b.enabled === false ? 0 : 1, session.userId]
    );
    await audit(c, session, 'create', 'crm_automation', id, `Created automation ${b.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create automation'); }
});

crm.put('/automations/:id', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = []; const values: any[] = [];
    for (const key of ['name', 'trigger', 'enabled']) {
      if (b[key] !== undefined) { fields.push(`${key}=$${values.length + 1}`); values.push(typeof b[key] === 'boolean' ? (b[key] ? 1 : 0) : b[key]); }
    }
    if (b.conditions !== undefined) { fields.push(`conditions=$${values.length + 1}`); values.push(JSON.stringify(b.conditions)); }
    if (b.actions !== undefined) { fields.push(`actions=$${values.length + 1}`); values.push(JSON.stringify(b.actions)); }
    if (!fields.length) return c.json({ success: true });
    fields.push('updated_at=NOW()'); values.push(c.req.param('id'));
    await getDb(c.env).query(`UPDATE crm_automations SET ${fields.join(', ')} WHERE id=$${values.length}`, values);
    await audit(c, session, 'update', 'crm_automation', c.req.param('id'), 'Updated automation');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update automation'); }
});

crm.delete('/automations/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_automations WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_automation', c.req.param('id'), 'Deleted automation');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete automation'); }
});

crm.post('/automations/:id/run', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const id = c.req.param('id');
    const runId = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_automation_runs (id,automation_id,person_id,status,log,finished_at) VALUES ($1,$2,$3,'success',$4,NOW())`,
      [runId, id, b.person_id || null, JSON.stringify({ triggered_by: session.userId, at: new Date().toISOString(), note: b.note || 'Manual run' })]
    );
    await getDb(c.env).query('UPDATE crm_automations SET last_run_at=NOW(), run_count=run_count+1 WHERE id=$1', [id]);
    await audit(c, session, 'run', 'crm_automation', id, 'Ran automation');
    return c.json({ success: true, data: { run_id: runId } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to run automation'); }
});

crm.get('/saved-views', async (c) => {
  try {
    await admin(c);
    const rows = await getDb(c.env).query<any>('SELECT * FROM crm_saved_views ORDER BY created_at DESC');
    return c.json({ success: true, data: rows.rows.map((r: any) => ({ ...r, filters: json(r.filters, {}), sort: json(r.sort, {}) })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load saved views'); }
});

crm.post('/saved-views', async (c) => {
  try {
    const session = await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    if (!String(b.name || '').trim()) return fail(c, 400, 'View name is required');
    const id = crypto.randomUUID();
    await getDb(c.env).query(
      `INSERT INTO crm_saved_views (id,name,entity,filters,sort,owner_id,is_shared) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, b.name, b.entity || 'people', JSON.stringify(b.filters || {}), JSON.stringify(b.sort || {}), session.userId, b.is_shared === false ? 0 : 1]
    );
    await audit(c, session, 'create', 'crm_saved_view', id, `Created saved view ${b.name}`);
    return c.json({ success: true, data: { id } }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to create saved view'); }
});

crm.delete('/saved-views/:id', async (c) => {
  try {
    const session = await admin(c);
    await getDb(c.env).query('DELETE FROM crm_saved_views WHERE id=$1', [c.req.param('id')]);
    await audit(c, session, 'delete', 'crm_saved_view', c.req.param('id'), 'Deleted saved view');
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to delete saved view'); }
});

// Convert a lead into a user account with a set-password invite.
crm.post('/leads/:id/convert', async (c) => {
  try {
    const session = await admin(c);
    const db = getDb(c.env);
    const lead = (await db.query<any>('SELECT * FROM crm_leads WHERE id=$1', [c.req.param('id')])).rows[0];
    if (!lead) return fail(c, 404, 'Lead not found');
    if (lead.converted_user_id) return fail(c, 400, 'Lead has already been converted');
    if (!lead.email) return fail(c, 400, 'Lead needs an email address before conversion');
    const existing = (await db.query<any>('SELECT id FROM users WHERE email=$1', [lead.email])).rows[0];
    let userId = existing?.id;
    if (!userId) {
      const { hashPassword, randomToken } = await import('../auth-helpers');
      const setupToken = randomToken(24);
      const password = await hashPassword(c.env, randomToken(24));
      const created = await db.query<any>(
        `INSERT INTO users (name,email,password,role,is_verified,setup_token,setup_token_expires)
         VALUES ($1,$2,$3,'student',0,$4,$5) RETURNING id`,
        [lead.name, lead.email, password, setupToken, new Date(Date.now() + 24 * 3600 * 1000).toISOString()]
      );
      userId = created.rows[0]?.id;
      const link = `${c.env.FRONTEND_URL}/set-password?token=${setupToken}`;
      await sendEmail(c.env, {
        to: lead.email,
        subject: 'Your CareerCode account is ready',
        html: `<p>Hi ${lead.name},</p><p>Your CareerCode account is ready. Set your password to get started.</p><p><a href="${link}">Set your password</a></p>`,
      }).catch(() => {});
    }
    await db.query('UPDATE crm_leads SET converted_user_id=$1, stage=$2, updated_at=NOW() WHERE id=$3', [userId, 'converted', lead.id]);
    await ensureProfiles(c.env);
    await audit(c, session, 'convert', 'crm_lead', lead.id, `Converted lead to user ${userId}`);
    return c.json({ success: true, data: { user_id: userId } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to convert lead'); }
});

// ─────────────────────────────────────────────────────────────
// Existing trial and access endpoints
// ─────────────────────────────────────────────────────────────
crm.put('/users/:id/courses/:courseId/trial', async (c) => {
  try {
    await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const course = (await db.query<any>('SELECT * FROM courses WHERE id=$1', [c.req.param('courseId')])).rows[0];
    if (!course) return fail(c, 404, 'Course not found');
    const days = Math.max(1, Number(body.days) || 7);
    const startsAt = body.starts_at || new Date().toISOString();
    const endsAt = body.ends_at || new Date(new Date(startsAt).getTime() + days * 86400000).toISOString();
    const existing = (await db.query<any>('SELECT id FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), course.id])).rows[0];
    let row: any;
    if (existing) {
      row = (await db.query<any>(
        `UPDATE enrollments SET access_type='trial', status='active', trial_started_at=$1, trial_ends_at=$2, enrolled_at=NOW() WHERE id=$3 RETURNING *`,
        [startsAt, endsAt, existing.id]
      )).rows[0];
    } else {
      row = (await db.query<any>(
        `INSERT INTO enrollments (user_id,course_id,status,access_type,trial_started_at,trial_ends_at,progress,completed_lessons,completed)
         VALUES ($1,$2,'active','trial',$3,$4,0,'[]',false) RETURNING *`,
        [c.req.param('id'), course.id, startsAt, endsAt]
      )).rows[0];
    }
    return c.json({ success: true, data: { ...row, trial_days_remaining: daysLeft(endsAt) } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to update trial'); }
});

crm.post('/users/:id/trial-all', async (c) => {
  try {
    await admin(c);
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const days = Math.max(1, Number(body.days) || 7);
    const startsAt = body.starts_at || new Date().toISOString();
    const endsAt = body.ends_at || new Date(new Date(startsAt).getTime() + days * 86400000).toISOString();
    const courses = await db.query<any>('SELECT id FROM courses WHERE published=1');
    for (const course of courses.rows) {
      const existing = await db.query<any>('SELECT id, access_type FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), course.id]);
      if (existing.rows[0] && ['paid', 'admin_grant'].includes(existing.rows[0].access_type)) continue;
      if (existing.rows[0]) {
        await db.query(`UPDATE enrollments SET access_type='trial', status='active', trial_started_at=$1, trial_ends_at=$2, enrolled_at=NOW() WHERE id=$3`, [startsAt, endsAt, existing.rows[0].id]);
      } else {
        await db.query(`INSERT INTO enrollments (user_id,course_id,status,access_type,trial_started_at,trial_ends_at,progress,completed_lessons,completed) VALUES ($1,$2,'active','trial',$3,$4,0,'[]',false)`, [c.req.param('id'), course.id, startsAt, endsAt]);
      }
    }
    return c.json({ success: true, data: { courses: courses.rows.length, days, starts_at: startsAt, ends_at: endsAt } });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to start all-course trial'); }
});

crm.post('/users/:id/courses/:courseId/enroll', async (c) => {
  try {
    await admin(c);
    const db = getDb(c.env);
    const existing = await db.query<any>('SELECT id FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), c.req.param('courseId')]);
    if (existing.rows[0]) {
      const row = (await db.query<any>(`UPDATE enrollments SET access_type='admin_grant', status='active', trial_ends_at=NULL WHERE id=$1 RETURNING *`, [existing.rows[0].id])).rows[0];
      return c.json({ success: true, data: row });
    }
    const row = (await db.query<any>(
      `INSERT INTO enrollments (user_id,course_id,status,access_type,progress,completed_lessons,completed)
       VALUES ($1,$2,'active','admin_grant',0,'[]',false) RETURNING *`,
      [c.req.param('id'), c.req.param('courseId')]
    )).rows[0];
    return c.json({ success: true, data: row }, 201 as any);
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to grant access'); }
});

crm.delete('/users/:id/courses/:courseId/access', async (c) => {
  try {
    await admin(c);
    await getDb(c.env).query('DELETE FROM enrollments WHERE user_id=$1 AND course_id=$2', [c.req.param('id'), c.req.param('courseId')]);
    return c.json({ success: true });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to revoke access'); }
});

crm.get('/courses/:courseId/roster', async (c) => {
  try {
    await admin(c);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT e.id AS enrollment_id, e.access_type, e.status, e.progress, e.trial_ends_at, e.enrolled_at,
              u.id AS user_id, u.name, u.email, u.avatar
       FROM enrollments e JOIN users u ON u.id=e.user_id WHERE e.course_id=$1 ORDER BY e.enrolled_at DESC`,
      [c.req.param('courseId')]
    );
    return c.json({ success: true, data: rows.map((r: any) => ({ ...r, trial_days_remaining: r.access_type === 'trial' ? daysLeft(r.trial_ends_at) : null })) });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load roster'); }
});

crm.get('/settings/trials', async (c) => {
  try {
    await admin(c);
    const settings = (await getDb(c.env).query<any>("SELECT * FROM trial_settings WHERE id='default'")).rows[0];
    return c.json({ success: true, data: settings || null });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to load trial settings'); }
});

crm.put('/settings/trials', async (c) => {
  try {
    await admin(c);
    const b: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO trial_settings (id,enabled,default_days,campaign_start,campaign_end,certificate_allowed,oral_defense_allowed,gigo_daily_limit,max_trials,reset_allowed,updated_at)
       VALUES ('default',$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT(id) DO UPDATE SET enabled=$1,default_days=$2,campaign_start=$3,campaign_end=$4,certificate_allowed=$5,oral_defense_allowed=$6,gigo_daily_limit=$7,max_trials=$8,reset_allowed=$9,updated_at=NOW()
       RETURNING *`,
      [b.enabled ? 1 : 0, Number(b.default_days) || 7, b.campaign_start || null, b.campaign_end || null, b.certificate_allowed ? 1 : 0, b.oral_defense_allowed ? 1 : 0, Number(b.gigo_daily_limit) || 20, Number(b.max_trials) || 1, b.reset_allowed ? 1 : 0]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) { return fail(c, statusOf(e), e?.message || 'Failed to save trial settings'); }
});

export default crm;
