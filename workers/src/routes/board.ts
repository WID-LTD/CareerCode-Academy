import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';
import { authenticate, type TokenPayload } from '../auth-helpers';

// Ported from backend/src/routes/board.routes.ts + backend/src/models/board.ts.
// Mounted at /api/v1/board. Postgres FILTER (WHERE ...) aggregates are
// rewritten as SUM(CASE WHEN ...) for D1.

const board = new Hono<{ Bindings: Env }>();

const ADMIN_ROLES = ['admin', 'super_admin'];
const POLICY_CATEGORIES = ['pricing', 'content', 'community', 'data', 'finance', 'operations', 'governance'];
const POLICY_DRAFT_STATUSES = ['draft', 'pending_review'];

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function validation(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

function isUrl(value: any): boolean {
  try {
    new URL(String(value));
    return true;
  } catch {
    return false;
  }
}

function dateValue(v: any): Date | null {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function optionalSession(c: any): Promise<TokenPayload | null> {
  try {
    return await authenticate(c);
  } catch {
    return null;
  }
}

async function logAudit(c: any, entry: {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: string;
}): Promise<void> {
  try {
    await getDb(c.env).query(
      `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.adminId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.details || null,
        c.req.header('cf-connecting-ip') || null,
        c.req.header('user-agent') || null,
      ]
    );
  } catch {
    /* audit logging is best-effort */
  }
}

// ── Board members ─────────────────────────────────────────────────────────

async function getActiveBoardMembers(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM board_members WHERE is_active = true ORDER BY sort_order ASC, joined_at ASC`
  );
  return rows;
}

async function listBoardMembers(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM board_members ORDER BY sort_order ASC, created_at DESC`
  );
  return rows;
}

async function getBoardMemberById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>('SELECT * FROM board_members WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createBoardMember(env: Env, input: any): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO board_members (name, title, bio, avatar_url, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      input.name,
      input.title,
      input.bio || null,
      input.avatar_url || null,
      input.sort_order ?? 0,
      input.is_active ?? true,
    ]
  );
  return rows[0];
}

async function updateBoardMember(env: Env, id: string, input: any): Promise<any | null> {
  const allowed = ['name', 'title', 'bio', 'avatar_url', 'sort_order', 'is_active'];
  const sets: string[] = [];
  const values: any[] = [];
  for (const key of allowed) {
    if (input[key] !== undefined) {
      values.push(input[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (!sets.length) return getBoardMemberById(env, id);

  sets.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await getDb(env).query<any>(
    `UPDATE board_members SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteBoardMember(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'DELETE FROM board_members WHERE id = $1 RETURNING id',
    [id]
  );
  return rows.length > 0;
}

// ── Board policies ────────────────────────────────────────────────────────

async function getPublishedPolicies(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM board_policies WHERE published = true AND status = 'approved' ORDER BY updated_at DESC`
  );
  return rows;
}

async function getPolicyBySlug(env: Env, slug: string, publishedOnly = false): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM board_policies WHERE slug = $1 ${publishedOnly ? "AND published = true AND status = 'approved'" : ''}`,
    [slug]
  );
  return rows[0] || null;
}

async function listPolicies(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM board_policies ORDER BY updated_at DESC`
  );
  return rows;
}

async function getPolicyById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>('SELECT * FROM board_policies WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createPolicy(env: Env, input: any): Promise<any> {
  const slug = slugify(input.title);
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO board_policies (title, slug, category, summary, body, status, proposed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      input.title,
      slug,
      input.category,
      input.summary || null,
      input.body,
      input.status || 'draft',
      input.proposed_by || null,
    ]
  );
  return rows[0];
}

async function updatePolicy(env: Env, id: string, input: any): Promise<any | null> {
  const existing = await getPolicyById(env, id);
  if (!existing) return null;

  const allowed = ['title', 'category', 'summary', 'body', 'status', 'version', 'published', 'decision_notes'];
  const sets: string[] = [];
  const values: any[] = [];
  for (const key of allowed) {
    if (input[key] !== undefined) {
      values.push(input[key] === null ? null : input[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (input.title) {
    sets.push(`slug = $${values.length + 1}`);
    values.push(slugify(input.title));
  }
  if (!sets.length) return existing;

  sets.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await getDb(env).query<any>(
    `UPDATE board_policies SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function decidePolicy(
  env: Env,
  id: string,
  status: 'approved' | 'rejected',
  approvedBy: string,
  notes?: string,
  publish = false
): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE board_policies
     SET status = $1, approved_by = $2, decided_at = NOW(), decision_notes = COALESCE($3, decision_notes),
         published = $4, version = CASE WHEN $1 = 'approved' THEN version + 1 ELSE version END,
         updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [status, approvedBy, notes || null, publish, id]
  );
  return rows[0] || null;
}

async function deletePolicy(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'DELETE FROM board_policies WHERE id = $1 RETURNING id',
    [id]
  );
  return rows.length > 0;
}

// ── Board resolutions ─────────────────────────────────────────────────────

async function listResolutions(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM board_resolutions ORDER BY meeting_date DESC, created_at DESC`
  );
  return rows;
}

async function createResolution(env: Env, input: any): Promise<any> {
  const meetingDate = dateValue(input.meeting_date) as Date;
  const year = meetingDate.getFullYear();
  const db = getDb(env);
  const { rows: countRows } = await db.query<any>(
    `SELECT COUNT(*) as count FROM board_resolutions WHERE EXTRACT(YEAR FROM meeting_date) = $1`,
    [year]
  );
  const seq = String((parseInt(countRows[0]?.count, 10) || 0) + 1).padStart(3, '0');
  const resolutionNumber = `RES-${year}-${seq}`;

  const { rows } = await db.query<any>(
    `INSERT INTO board_resolutions (resolution_number, title, summary, body, passed, meeting_date, passed_at, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      resolutionNumber,
      input.title,
      input.summary || null,
      input.body || null,
      input.passed ?? true,
      meetingDate,
      input.passed ? new Date() : null,
      input.recorded_by || null,
    ]
  );
  return rows[0];
}

async function deleteResolution(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'DELETE FROM board_resolutions WHERE id = $1 RETURNING id',
    [id]
  );
  return rows.length > 0;
}

// ── Oversight summary ─────────────────────────────────────────────────────

async function getBoardOversightSummary(env: Env): Promise<any> {
  const db = getDb(env);
  const [members, policies, ops, resolutions, recentPolicies] = await Promise.all([
    db.query<any>(
      `SELECT
         COALESCE(SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END), 0)::int as active,
         COUNT(*)::int as total
       FROM board_members`
    ),
    db.query<any>(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END), 0)::int as pending_review,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0)::int as approved,
         COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0)::int as rejected,
         COALESCE(SUM(CASE WHEN status = 'approved' AND published = true THEN 1 ELSE 0 END), 0)::int as published
       FROM board_policies`
    ),
    db.query<any>(
      `SELECT
         (SELECT COALESCE(SUM(amount), 0)::float FROM payments WHERE status = 'completed') as total_revenue,
         (SELECT COUNT(*)::int FROM enrollments) as total_enrollments,
         (SELECT COUNT(*)::int FROM users WHERE role = 'student') as total_students,
         (SELECT COUNT(*)::int FROM promotions WHERE is_active = true AND starts_at <= NOW() AND ends_at > NOW()) as active_promotions,
         (SELECT COUNT(*)::int FROM courses WHERE published = true) as published_courses,
         (SELECT COUNT(*)::int FROM certificates) as certificates_issued,
         (SELECT COUNT(*)::int FROM instructor_applications WHERE status = 'pending') as pending_instructor_applications`
    ),
    db.query<any>(
      `SELECT * FROM board_resolutions ORDER BY meeting_date DESC, created_at DESC LIMIT 5`
    ),
    db.query<any>(
      `SELECT * FROM board_policies ORDER BY updated_at DESC LIMIT 8`
    ),
  ]);

  return {
    members: members.rows[0],
    policies: policies.rows[0],
    operations: ops.rows[0],
    recentResolutions: resolutions.rows,
    recentPolicies: recentPolicies.rows,
  };
}

// ── Validation ────────────────────────────────────────────────────────────

function checkMember(body: any, partial: boolean): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || body.name.length < 2 || body.name.length > 200) {
      errors.name = ['String must contain at least 2 character(s)'];
    }
  }
  if (!partial || has('title')) {
    if (typeof body.title !== 'string' || body.title.length < 2 || body.title.length > 200) {
      errors.title = ['String must contain at least 2 character(s)'];
    }
  }
  if (has('bio') && body.bio !== null && (typeof body.bio !== 'string' || body.bio.length > 5000)) {
    errors.bio = ['String must contain at most 5000 character(s)'];
  }
  if (has('avatar_url') && body.avatar_url !== null && !isUrl(body.avatar_url)) {
    errors.avatar_url = ['Invalid url'];
  }
  if (has('sort_order') && (!Number.isInteger(body.sort_order))) {
    errors.sort_order = ['Expected integer'];
  }
  if (has('is_active') && typeof body.is_active !== 'boolean') {
    errors.is_active = ['Expected boolean'];
  }
  return errors;
}

function checkPolicy(body: any, partial: boolean): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has('title')) {
    if (typeof body.title !== 'string' || body.title.length < 3 || body.title.length > 200) {
      errors.title = ['String must contain at least 3 character(s)'];
    }
  }
  if (!partial || has('category')) {
    if (!POLICY_CATEGORIES.includes(body.category)) errors.category = ['Invalid enum value'];
  }
  if (has('summary') && (typeof body.summary !== 'string' || body.summary.length > 500)) {
    errors.summary = ['String must contain at most 500 character(s)'];
  }
  if (!partial || has('body')) {
    if (typeof body.body !== 'string' || body.body.length < 10) {
      errors.body = ['String must contain at least 10 character(s)'];
    }
  }
  if (has('status') && !POLICY_DRAFT_STATUSES.includes(body.status)) {
    errors.status = ['Invalid enum value'];
  }
  return errors;
}

function checkResolution(body: any): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (typeof body.title !== 'string' || body.title.length < 3 || body.title.length > 200) {
    errors.title = ['String must contain at least 3 character(s)'];
  }
  if (body.summary !== undefined && typeof body.summary !== 'string') errors.summary = ['Expected string'];
  if (body.body !== undefined && typeof body.body !== 'string') errors.body = ['Expected string'];
  if (body.passed !== undefined && typeof body.passed !== 'boolean') errors.passed = ['Expected boolean'];
  if (body.meeting_date === undefined || dateValue(body.meeting_date) === null) {
    errors.meeting_date = ['Invalid date'];
  }
  return errors;
}

function checkDecision(body: any): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (body.status !== 'approved' && body.status !== 'rejected') {
    errors.status = ['Invalid enum value'];
  }
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 2000)) {
    errors.notes = ['String must contain at most 2000 character(s)'];
  }
  if (body.publish !== undefined && typeof body.publish !== 'boolean') {
    errors.publish = ['Expected boolean'];
  }
  return errors;
}

// ── Public routes ─────────────────────────────────────────────────────────

// GET /api/v1/board/members — public active members. Admins (when they send a
// token) receive the management list, matching the Express admin endpoint that
// was otherwise shadowed by this same path.
board.get('/members', async (c) => {
  try {
    const s = await optionalSession(c);
    const isAdmin = !!s && ADMIN_ROLES.includes(s.role);
    return c.json({
      success: true,
      data: isAdmin ? await listBoardMembers(c.env) : await getActiveBoardMembers(c.env),
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load board members');
  }
});

// GET /api/v1/board/policies — public published policies (admin: all)
board.get('/policies', async (c) => {
  try {
    const s = await optionalSession(c);
    const isAdmin = !!s && ADMIN_ROLES.includes(s.role);
    return c.json({
      success: true,
      data: isAdmin ? await listPolicies(c.env) : await getPublishedPolicies(c.env),
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load policies');
  }
});

// GET /api/v1/board/policies/:slug — public published policy
board.get('/policies/:slug', async (c) => {
  try {
    const policy = await getPolicyBySlug(c.env, c.req.param('slug'), true);
    if (!policy) return fail(c, 404, 'Policy not found');
    return c.json({ success: true, data: policy });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load policy');
  }
});

// GET /api/v1/board/resolutions — public + admin
board.get('/resolutions', async (c) => {
  try {
    return c.json({ success: true, data: await listResolutions(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load resolutions');
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────

// GET /api/v1/board/oversight — admin dashboard summary
board.get('/oversight', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    return c.json({ success: true, data: await getBoardOversightSummary(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load oversight summary');
  }
});

// POST /api/v1/board/members — admin: create member
board.post('/members', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkMember(body, false);
    if (Object.keys(errors).length) return validation(c, errors);

    const member = await createBoardMember(c.env, body);
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.member.create',
      resourceType: 'board_member',
      resourceId: member.id,
      details: `Added board member ${member.name}`,
    });
    return c.json({ success: true, data: member }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create board member');
  }
});

// PUT /api/v1/board/members/:id — admin: update member
board.put('/members/:id', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkMember(body, true);
    if (Object.keys(errors).length) return validation(c, errors);

    const existing = await getBoardMemberById(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Board member not found');

    const member = await updateBoardMember(c.env, c.req.param('id'), body);
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.member.update',
      resourceType: 'board_member',
      resourceId: c.req.param('id'),
      details: `Updated board member ${member?.name ?? existing.name}`,
    });
    return c.json({ success: true, data: member });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update board member');
  }
});

// DELETE /api/v1/board/members/:id — admin: delete member
board.delete('/members/:id', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const existing = await getBoardMemberById(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Board member not found');

    await deleteBoardMember(c.env, c.req.param('id'));
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.member.delete',
      resourceType: 'board_member',
      resourceId: c.req.param('id'),
      details: `Removed board member ${existing.name}`,
    });
    return c.json({ success: true, data: { deleted: true } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete board member');
  }
});

// POST /api/v1/board/policies — admin: draft policy
board.post('/policies', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkPolicy(body, false);
    if (Object.keys(errors).length) return validation(c, errors);

    const policy = await createPolicy(c.env, { ...body, proposed_by: s.userId });
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.policy.create',
      resourceType: 'board_policy',
      resourceId: policy.id,
      details: `Drafted policy "${policy.title}"`,
    });
    return c.json({ success: true, data: policy }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create policy');
  }
});

// PUT /api/v1/board/policies/:id — admin: update policy
board.put('/policies/:id', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkPolicy(body, true);
    if (Object.keys(errors).length) return validation(c, errors);

    const existing = await getPolicyById(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Policy not found');

    const policy = await updatePolicy(c.env, c.req.param('id'), body);
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.policy.update',
      resourceType: 'board_policy',
      resourceId: c.req.param('id'),
      details: `Updated policy "${policy?.title ?? existing.title}"`,
    });
    return c.json({ success: true, data: policy });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update policy');
  }
});

// POST /api/v1/board/policies/:id/submit — admin: submit for board review
board.post('/policies/:id/submit', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const existing = await getPolicyById(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Policy not found');

    const policy = await updatePolicy(c.env, c.req.param('id'), { status: 'pending_review' });
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.policy.submit',
      resourceType: 'board_policy',
      resourceId: c.req.param('id'),
      details: `Submitted "${policy?.title ?? existing.title}" for board review`,
    });
    return c.json({ success: true, data: policy });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit policy');
  }
});

// POST /api/v1/board/policies/:id/decide — admin: approve/reject policy
board.post('/policies/:id/decide', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkDecision(body);
    if (Object.keys(errors).length) return validation(c, errors);

    const existing = await getPolicyById(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Policy not found');

    const policy = await decidePolicy(
      c.env,
      c.req.param('id'),
      body.status,
      s.userId,
      body.notes,
      body.publish
    );
    await logAudit(c, {
      adminId: s.userId,
      action: `board.policy.${body.status}`,
      resourceType: 'board_policy',
      resourceId: c.req.param('id'),
      details: `Board ${body.status} "${existing.title}"`,
    });
    return c.json({ success: true, data: policy });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to decide policy');
  }
});

// DELETE /api/v1/board/policies/:id — admin: delete policy
board.delete('/policies/:id', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const existing = await getPolicyById(c.env, c.req.param('id'));
    if (!existing) return fail(c, 404, 'Policy not found');

    await deletePolicy(c.env, c.req.param('id'));
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.policy.delete',
      resourceType: 'board_policy',
      resourceId: c.req.param('id'),
      details: `Deleted policy "${existing.title}"`,
    });
    return c.json({ success: true, data: { deleted: true } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete policy');
  }
});

// POST /api/v1/board/resolutions — admin: record resolution
board.post('/resolutions', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = checkResolution(body);
    if (Object.keys(errors).length) return validation(c, errors);

    const resolution = await createResolution(c.env, { ...body, recorded_by: s.userId });
    await logAudit(c, {
      adminId: s.userId,
      action: 'board.resolution.create',
      resourceType: 'board_resolution',
      resourceId: resolution.id,
      details: `Recorded resolution ${resolution.resolution_number}`,
    });
    return c.json({ success: true, data: resolution }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create resolution');
  }
});

// DELETE /api/v1/board/resolutions/:id — admin: delete resolution
board.delete('/resolutions/:id', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const deleted = await deleteResolution(c.env, c.req.param('id'));
    return c.json({ success: true, data: { deleted } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete resolution');
  }
});

export default board;
