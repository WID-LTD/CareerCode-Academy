import { query } from '../config/db';
import { slugify } from '../utils/helpers';

export type ProgramStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export interface ProgramCourseInput {
  course_id: string;
  week_number?: number;
  is_required?: boolean;
}

export interface ProgramCohortInput {
  title: string;
  starts_at: string;
  ends_at: string;
  capacity?: number;
  price?: number | null;
}

export interface CreateProgramInput {
  school_id: string;
  name: string;
  slug?: string;
  description?: string | null;
  duration_weeks?: number | null;
  price?: number;
  currency?: string;
  thumbnail_url?: string | null;
  career_outcomes?: string[];
  created_by: string;
  status?: ProgramStatus;
  courses?: ProgramCourseInput[];
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = 'program';
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    const { rows } = await query('SELECT 1 FROM programs WHERE slug = $1', [candidate]);
    if (!rows.length) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

export async function createProgram(input: CreateProgramInput): Promise<any> {
  const slug = await uniqueSlug(input.slug || input.name);
  const { rows } = await query(
    `INSERT INTO programs (school_id, name, slug, description, duration, duration_weeks, price, currency, thumbnail_url, career_outcomes, created_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.school_id,
      input.name,
      slug,
      input.description || null,
      input.duration_weeks ? `${input.duration_weeks} weeks` : null,
      input.duration_weeks || null,
      input.price ?? 0,
      input.currency || 'NGN',
      input.thumbnail_url || null,
      input.career_outcomes || [],
      input.created_by,
      input.status || 'draft',
    ]
  );
  const program = rows[0];
  if (input.courses?.length) {
    await setProgramCourses(program.id, input.courses);
  }
  return getProgramById(program.id);
}

export async function setProgramCourses(programId: string, courses: ProgramCourseInput[]): Promise<void> {
  const ids = [...new Set(courses.map((c) => c.course_id))];
  if (!ids.length) {
    await query('DELETE FROM program_courses WHERE program_id = $1', [programId]);
    return;
  }
  const { rows } = await query('SELECT id FROM courses WHERE id = ANY($1)', [ids]);
  const valid = new Set(rows.map((r: any) => r.id));
  const filtered = courses.filter((c) => valid.has(c.course_id));
  await query('DELETE FROM program_courses WHERE program_id = $1', [programId]);
  for (let i = 0; i < filtered.length; i++) {
    const c = filtered[i];
    await query(
      `INSERT INTO program_courses (program_id, course_id, order_index, week_number, is_required)
       VALUES ($1,$2,$3,$4,$5)`,
      [programId, c.course_id, i, Math.max(1, Math.min(52, c.week_number || 1)), c.is_required !== false]
    );
  }
}

export async function updateProgram(id: string, patch: Record<string, any>): Promise<any> {
  const allowed = ['school_id', 'name', 'slug', 'description', 'duration_weeks', 'price', 'currency', 'thumbnail_url', 'career_outcomes', 'status', 'rejection_reason'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    if (key === 'duration_weeks') {
      sets.push(`duration_weeks = $${vals.length + 1}`);
      vals.push(patch[key]);
      sets.push(`duration = $${vals.length + 1}`);
      vals.push(patch[key] ? `${patch[key]} weeks` : null);
    } else if (key === 'career_outcomes') {
      sets.push(`career_outcomes = $${vals.length + 1}`);
      vals.push(patch[key] || []);
    } else {
      sets.push(`${key} = $${vals.length + 1}`);
      vals.push(patch[key]);
    }
  }
  if (!sets.length) return getProgramById(id);
  sets.push('updated_at = NOW()');
  const { rows } = await query(`UPDATE programs SET ${sets.join(', ')} WHERE id = $${vals.length + 1} RETURNING *`, [...vals, id]);
  return rows[0] ? getProgramById(id) : null;
}

export async function getProgramById(id: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT p.*, s.name AS school_name, s.slug AS school_slug,
            (SELECT COUNT(*)::int FROM program_courses pc WHERE pc.program_id = p.id) AS course_count,
            (SELECT COUNT(*)::int FROM program_cohorts c WHERE c.program_id = p.id) AS cohort_count
     FROM programs p LEFT JOIN schools s ON s.id = p.school_id
     WHERE p.id = $1`,
    [id]
  );
  if (!rows.length) return null;
  const program = rows[0];
  const { rows: courses } = await query(
    `SELECT pc.course_id, pc.week_number, pc.is_required, pc.order_index,
            c.title AS course_title, c.slug AS course_slug, c.price AS course_price
     FROM program_courses pc JOIN courses c ON c.id = pc.course_id
     WHERE pc.program_id = $1 ORDER BY pc.order_index ASC`,
    [id]
  );
  program.courses = courses;
  program.cohorts = await listCohorts(id);
  return program;
}

export async function listPrograms(filters: { status?: string; school_id?: string; limit?: number; offset?: number; ownerId?: string; ownerOnly?: boolean }): Promise<any[]> {
  const conds: string[] = [];
  const vals: any[] = [];
  if (filters.status) {
    conds.push(`p.status = $${vals.length + 1}`);
    vals.push(filters.status);
  }
  if (filters.school_id) {
    conds.push(`p.school_id = $${vals.length + 1}`);
    vals.push(filters.school_id);
  }
  if (filters.ownerOnly && filters.ownerId) {
    conds.push(`p.created_by = $${vals.length + 1}`);
    vals.push(filters.ownerId);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = Math.max(0, filters.offset || 0);
  const { rows } = await query(
    `SELECT p.*, s.name AS school_name, s.slug AS school_slug,
            (SELECT COUNT(*)::int FROM program_courses pc WHERE pc.program_id = p.id) AS course_count,
            (SELECT COUNT(*)::int FROM program_cohorts c WHERE c.program_id = p.id) AS cohort_count,
            (SELECT COUNT(*)::int FROM program_cohort_members m JOIN program_cohorts c ON c.id = m.cohort_id WHERE c.program_id = p.id AND m.status = 'active') AS student_count
     FROM programs p LEFT JOIN schools s ON s.id = p.school_id
     ${where} ORDER BY p.updated_at DESC LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
    [...vals, limit, offset]
  );
  return rows;
}

// ── Cohorts ──

export async function createCohort(programId: string, input: ProgramCohortInput, createdBy: string): Promise<any> {
  const { rows } = await query(
    `INSERT INTO program_cohorts (program_id, title, starts_at, ends_at, capacity, price, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [programId, input.title, input.starts_at, input.ends_at, input.capacity || 100, input.price ?? null, createdBy]
  );
  return rows[0];
}

export async function listCohorts(programId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT c.*, (SELECT COUNT(*)::int FROM program_cohort_members m WHERE m.cohort_id = c.id AND m.status = 'active') AS enrolled_count
     FROM program_cohorts c WHERE c.program_id = $1 ORDER BY c.starts_at ASC`,
    [programId]
  );
  return rows;
}

export async function getCohortById(cohortId: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT c.*, p.price AS program_price, p.currency AS program_currency, p.status AS program_status,
            (SELECT COUNT(*)::int FROM program_cohort_members m WHERE m.cohort_id = c.id AND m.status = 'active') AS enrolled_count
     FROM program_cohorts c JOIN programs p ON p.id = c.program_id WHERE c.id = $1`,
    [cohortId]
  );
  return rows[0] || null;
}

export async function setCohortStatus(cohortId: string, status: string): Promise<void> {
  await query('UPDATE program_cohorts SET status = $1, updated_at = NOW() WHERE id = $2', [status, cohortId]);
}

// ── Membership + bundled enrollment ──

export async function getMembership(cohortId: string, userId: string): Promise<any | null> {
  const { rows } = await query('SELECT * FROM program_cohort_members WHERE cohort_id = $1 AND user_id = $2', [cohortId, userId]);
  return rows[0] || null;
}

export async function enrollMember(cohortId: string, userId: string, paymentId: string | null): Promise<any> {
  const cohort = await getCohortById(cohortId);
  if (!cohort) throw new Error('Cohort not found');
  if (cohort.enrolled_count >= cohort.capacity) {
    const e: any = new Error('Cohort is full');
    e.statusCode = 409;
    throw e;
  }
  const { rows } = await query(
    `INSERT INTO program_cohort_members (cohort_id, user_id, payment_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (cohort_id, user_id) DO UPDATE SET status = 'active', payment_id = COALESCE($3, program_cohort_members.payment_id)
     RETURNING *`,
    [cohortId, userId, paymentId]
  );
  // Enroll into every required bundled course (idempotent)
  await query(
    `INSERT INTO enrollments (user_id, course_id, status)
     SELECT $1, pc.course_id, 'active' FROM program_courses pc
     WHERE pc.program_id = $2 AND pc.is_required = true
     ON CONFLICT (user_id, course_id) DO NOTHING`,
    [userId, cohort.program_id]
  );
  if (cohort.enrolled_count + 1 >= cohort.capacity) {
    await setCohortStatus(cohortId, 'full');
  }
  return rows[0];
}

export async function createProgramPayment(input: { user_id: string; cohort_id: string; amount: number; currency: string; provider: string; reference: string }): Promise<any> {
  const { rows } = await query(
    `INSERT INTO payments (user_id, course_id, program_cohort_id, amount, currency, provider, reference)
     VALUES ($1, NULL, $2, $3, $4, $5, $6) RETURNING *`,
    [input.user_id, input.cohort_id, input.amount, input.currency, input.provider, input.reference]
  );
  return rows[0];
}

export async function getMemberCohorts(userId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT m.*, c.title AS cohort_title, c.starts_at, c.ends_at, c.status AS cohort_status,
            p.id AS program_id, p.name AS program_name, p.slug AS program_slug
     FROM program_cohort_members m
     JOIN program_cohorts c ON c.id = m.cohort_id
     JOIN programs p ON p.id = c.program_id
     WHERE m.user_id = $1 ORDER BY m.enrolled_at DESC`,
    [userId]
  );
  return rows;
}
