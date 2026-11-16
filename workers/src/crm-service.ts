import type { Env } from './env';
import { getDb } from './db';

export type CrmRule = {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in';
  value: any;
};

export type CrmDefinition = {
  match?: 'all' | 'any';
  rules?: CrmRule[];
};

export function parseJson<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

export function asInt(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function asBool(value: any): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

const FIELD_SQL: Record<string, { expr: string; text?: boolean }> = {
  lifecycle_stage: { expr: 'p.lifecycle_stage', text: true },
  owner_id: { expr: 'p.owner_id', text: true },
  lead_source: { expr: 'p.lead_source', text: true },
  country: { expr: 'p.country', text: true },
  company: { expr: 'p.company', text: true },
  job_title: { expr: 'p.job_title', text: true },
  risk_score: { expr: 'p.risk_score' },
  engagement_score: { expr: 'p.engagement_score' },
  health_score: { expr: 'p.health_score' },
  lead_score: { expr: 'p.lead_score' },
  lifetime_value: { expr: 'p.lifetime_value' },
  email_opt_in: { expr: 'p.email_opt_in' },
  push_opt_in: { expr: 'p.push_opt_in' },
  do_not_contact: { expr: 'p.do_not_contact' },
  last_activity_days: { expr: `(julianday('now') - julianday(p.last_activity_at))` },
  created_days: { expr: `(julianday('now') - julianday(p.created_at))` },
  trial_days_left: { expr: `(SELECT MAX(julianday(e.trial_ends_at) - julianday('now')) FROM enrollments e WHERE e.user_id = p.user_id AND e.access_type = 'trial')` },
  completed_courses: { expr: `(SELECT COUNT(*) FROM enrollments e WHERE e.user_id = p.user_id AND e.completed = 1)` },
  certificate_count: { expr: `(SELECT COUNT(*) FROM certificates c WHERE c.user_id = p.user_id AND c.revoked = 0)` },
  failed_payments: { expr: `(SELECT COUNT(*) FROM payments p2 WHERE p2.user_id = p.user_id AND p2.status = 'failed')` },
  course_id: { expr: `(SELECT COUNT(*) FROM enrollments e WHERE e.user_id = p.user_id AND e.course_id = __VALUE__)` },
  access_type: { expr: `(SELECT COUNT(*) FROM enrollments e WHERE e.user_id = p.user_id AND e.access_type = __VALUE__)` },
  tag: { expr: `(SELECT COUNT(*) FROM crm_profile_tags pt JOIN crm_tags t ON t.id = pt.tag_id WHERE pt.profile_user_id = p.user_id AND t.name = __VALUE__)` },
};

function valuePlaceholder(expr: string, params: any[], value: any): string {
  params.push(value);
  return expr.replace('__VALUE__', `$${params.length}`);
}

export function buildSegmentWhere(definition: CrmDefinition | null | undefined): { where: string; params: any[] } {
  const def = definition && Array.isArray(definition.rules) ? definition : { match: 'all' as const, rules: [] };
  const params: any[] = [];
  const clauses: string[] = [];

  for (const rule of def.rules || []) {
    const field = FIELD_SQL[rule.field];
    if (!field) continue;
    const expr = field.expr;
    const op = rule.op || 'eq';
    const value = rule.value;

    if (rule.field === 'course_id' || rule.field === 'access_type' || rule.field === 'tag') {
      const placeholder = valuePlaceholder(expr, params, value);
      const cmp = op === 'neq' || op === 'not_in' ? '=' : '>';
      clauses.push(`(${placeholder}) ${cmp} 0`);
      continue;
    }

    if (op === 'contains') {
      params.push(`%${String(value ?? '')}%`);
      clauses.push(`${expr} LIKE $${params.length}`);
      continue;
    }
    if (op === 'in' || op === 'not_in') {
      const list = Array.isArray(value) ? value : String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
      if (!list.length) continue;
      const placeholders = list.map((v) => { params.push(v); return `$${params.length}`; }).join(', ');
      clauses.push(`${expr} ${op === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`);
      continue;
    }

    params.push(value);
    const placeholder = `$${params.length}`;
    const sqlOp = op === 'eq' ? '=' : op === 'neq' ? '!=' : op === 'gt' ? '>' : op === 'gte' ? '>=' : op === 'lt' ? '<' : '<=';
    clauses.push(`${expr} ${sqlOp} ${placeholder}`);
  }

  if (!clauses.length) return { where: '1=1', params: [] };
  const join = def.match === 'any' ? ' OR ' : ' AND ';
  return { where: `(${clauses.join(join)})`, params };
}

export async function ensureProfiles(env: Env): Promise<void> {
  const db = getDb(env);
  await db.query(
    `INSERT OR IGNORE INTO crm_profiles (user_id, lifecycle_stage, lead_source, last_activity_at)
     SELECT id,
       CASE
         WHEN role = 'instructor' THEN 'active'
         WHEN role IN ('admin','super_admin') THEN 'active'
         WHEN EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = users.id AND e.access_type = 'paid') THEN 'paid'
         WHEN EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = users.id AND e.access_type = 'trial') THEN 'trial'
         ELSE 'lead'
       END,
       'organic',
       COALESCE(last_login, created_at)
     FROM users`
  );
}

export async function refreshProfileScores(env: Env, userId?: string): Promise<void> {
  const db = getDb(env);
  const filter = userId ? 'AND p.user_id = $1' : '';
  const params = userId ? [userId] : [];
  await db.query(
    `UPDATE crm_profiles p SET
       lifetime_value = COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.user_id = p.user_id AND pay.status = 'completed'), 0),
       last_activity_at = COALESCE(
         (SELECT MAX(lp.updated_at) FROM lesson_progress lp WHERE lp.user_id = p.user_id),
         p.last_activity_at
       ),
       engagement_score = MIN(100,
         10
         + COALESCE((SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = p.user_id), 0) * 3
         + COALESCE((SELECT COUNT(*) FROM payments pay WHERE pay.user_id = p.user_id AND pay.status = 'completed'), 0) * 8
         + CASE WHEN p.last_activity_at IS NOT NULL AND julianday('now') - julianday(p.last_activity_at) < 7 THEN 20 ELSE 0 END
       ),
       risk_score = CASE
         WHEN p.last_activity_at IS NULL THEN 70
         WHEN julianday('now') - julianday(p.last_activity_at) > 30 THEN 90
         WHEN julianday('now') - julianday(p.last_activity_at) > 14 THEN 70
         WHEN julianday('now') - julianday(p.last_activity_at) > 7 THEN 45
         ELSE 15
       END,
       health_score = MAX(0, 100 - CASE
         WHEN p.last_activity_at IS NULL THEN 70
         WHEN julianday('now') - julianday(p.last_activity_at) > 30 THEN 90
         WHEN julianday('now') - julianday(p.last_activity_at) > 14 THEN 70
         WHEN julianday('now') - julianday(p.last_activity_at) > 7 THEN 45
         ELSE 15
       END),
       updated_at = NOW()
     WHERE 1=1 ${filter}`,
    params
  );
}

/**
 * Import support tickets and contact messages into the CRM inbox. This is
 * idempotent: related records are linked with a unique conversation key and
 * messages carry a source id in metadata.
 */
export async function syncInbox(env: Env): Promise<void> {
  const db = getDb(env);

  const tickets = await db.query<any>(
    `SELECT t.*, u.name AS user_name, u.email AS user_email
     FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC LIMIT 100`
  );
  for (const t of tickets.rows) {
    const conv = await db.query<any>(
      `INSERT INTO crm_conversations (id, person_id, channel, subject, status, priority, sla_due_at, last_message_at, related_type, related_id)
       VALUES ($1,$2,'support',$3,$4,$5,$6,$7,'support_ticket',$8)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        crypto.randomUUID(),
        t.user_id || null,
        t.subject || 'Support request',
        t.status === 'closed' ? 'closed' : 'open',
        t.priority || 'medium',
        t.status === 'closed' ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        t.updated_at || t.created_at,
        t.id,
      ]
    );
    const conversation = conv.rows[0] || (await db.query<any>(
      `SELECT id FROM crm_conversations WHERE related_type='support_ticket' AND related_id=$1`,
      [t.id]
    )).rows[0];
    if (!conversation) continue;
    const existing = await db.query<any>(
      `SELECT COUNT(*)::int AS n FROM crm_messages WHERE conversation_id=$1`,
      [conversation.id]
    );
    if (Number(existing.rows[0]?.n) === 0) {
      await db.query(
        `INSERT INTO crm_messages (id, conversation_id, direction, channel, body, author_id, metadata, created_at)
         VALUES ($1,$2,'inbound','support',$3,$4,$5,$6)`,
        [
          crypto.randomUUID(),
          conversation.id,
          t.description || t.subject || 'Support request',
          t.user_id || null,
          JSON.stringify({ source: 'support_ticket', source_id: t.id, author: t.user_name || t.user_email || 'Learner' }),
          t.created_at || new Date().toISOString(),
        ]
      );
    }
    const replies = await db.query<any>(
      `SELECT tr.*, u.name AS admin_name FROM ticket_replies tr LEFT JOIN users u ON u.id = tr.admin_id WHERE tr.ticket_id=$1 ORDER BY tr.created_at ASC`,
      [t.id]
    );
    for (const reply of replies.rows) {
      const dupe = await db.query<any>(
        `SELECT 1 FROM crm_messages WHERE conversation_id=$1 AND json_extract(metadata,'$.source_id')=$2 LIMIT 1`,
        [conversation.id, reply.id]
      );
      if (dupe.rows.length) continue;
      await db.query(
        `INSERT INTO crm_messages (id, conversation_id, direction, channel, body, author_id, metadata, created_at)
         VALUES ($1,$2,'outbound','support',$3,$4,$5,$6)`,
        [
          crypto.randomUUID(),
          conversation.id,
          reply.message,
          reply.admin_id || null,
          JSON.stringify({ source: 'ticket_reply', source_id: reply.id, author: reply.admin_name || 'Support' }),
          reply.created_at || new Date().toISOString(),
        ]
      );
    }
    await db.query(`UPDATE crm_conversations SET last_message_at=$1, updated_at=NOW() WHERE id=$2`, [t.updated_at || t.created_at, conversation.id]);
  }

  const messages = await db.query<any>(
    `SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100`
  );
  for (const m of messages.rows) {
    const conv = await db.query<any>(
      `INSERT INTO crm_conversations (id, channel, subject, status, priority, sla_due_at, last_message_at, related_type, related_id)
       VALUES ($1,'contact',$2,'open','medium',$3,$4,'contact_message',$5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        crypto.randomUUID(),
        m.subject || 'Website contact message',
        new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        m.created_at,
        m.id,
      ]
    );
    const conversation = conv.rows[0] || (await db.query<any>(
      `SELECT id FROM crm_conversations WHERE related_type='contact_message' AND related_id=$1`,
      [m.id]
    )).rows[0];
    if (!conversation) continue;
    const existing = await db.query<any>(`SELECT COUNT(*)::int AS n FROM crm_messages WHERE conversation_id=$1`, [conversation.id]);
    if (Number(existing.rows[0]?.n) === 0) {
      await db.query(
        `INSERT INTO crm_messages (id, conversation_id, direction, channel, body, metadata, created_at)
         VALUES ($1,$2,'inbound','contact',$3,$4,$5)`,
        [
          crypto.randomUUID(),
          conversation.id,
          m.message,
          JSON.stringify({ source: 'contact_message', source_id: m.id, author: m.name, email: m.email }),
          m.created_at,
        ]
      );
    }
  }
}

export async function logCrmActivity(
  env: Env,
  input: {
    personId?: string | null;
    leadId?: string | null;
    accountId?: string | null;
    opportunityId?: string | null;
    type: string;
    subject?: string | null;
    body?: string | null;
    direction?: string;
    channel?: string;
    ownerId?: string | null;
    metadata?: any;
  }
): Promise<void> {
  await getDb(env).query(
    `INSERT INTO crm_activities (id,person_id,lead_id,account_id,opportunity_id,type,subject,body,direction,channel,owner_id,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      crypto.randomUUID(),
      input.personId || null,
      input.leadId || null,
      input.accountId || null,
      input.opportunityId || null,
      input.type,
      input.subject || null,
      input.body || null,
      input.direction || 'internal',
      input.channel || 'crm',
      input.ownerId || null,
      JSON.stringify(input.metadata || {}),
    ]
  );
}

export function scopeForInstructor(instructorId: string | null): { where: string; params: any[] } {
  if (!instructorId) return { where: '1=1', params: [] };
  return {
    where: `EXISTS (SELECT 1 FROM enrollments se JOIN courses sc ON sc.id = se.course_id WHERE se.user_id = p.user_id AND sc.instructor_id = $1)`,
    params: [instructorId],
  };
}
