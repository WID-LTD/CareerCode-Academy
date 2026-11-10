import type { Env } from './env';
import { getDb } from './db';

// Program queries ported from backend/src/models/program.ts.

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function uniqueSlug(env: Env, base: string): Promise<string> {
  const root = slugify(base) || 'program';
  const db = getDb(env);
  let candidate = root;
  for (let i = 1; i < 50; i++) {
    const { rows } = await db.query<any>('SELECT id FROM programs WHERE slug = $1', [candidate]);
    if (!rows.length) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export async function listCohorts(env: Env, programId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT c.*, (SELECT COUNT(*)::int FROM program_cohort_members m WHERE m.cohort_id = c.id AND m.status = 'active') AS enrolled_count
     FROM program_cohorts c WHERE c.program_id = $1 ORDER BY c.starts_at ASC`,
    [programId]
  );
  return rows;
}

export async function getCohortById(env: Env, cohortId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT c.*, p.price AS program_price, p.currency AS program_currency, p.status AS program_status,
            (SELECT COUNT(*)::int FROM program_cohort_members m WHERE m.cohort_id = c.id AND m.status = 'active') AS enrolled_count
     FROM program_cohorts c JOIN programs p ON p.id = c.program_id WHERE c.id = $1`,
    [cohortId]
  );
  return rows[0] || null;
}

export async function getProgramById(env: Env, id: string): Promise<any | null> {
  const db = getDb(env);
  const { rows } = await db.query<any>(
    `SELECT p.*, s.name AS school_name, s.slug AS school_slug,
            (SELECT COUNT(*)::int FROM program_courses pc WHERE pc.program_id = p.id) AS course_count,
            (SELECT COUNT(*)::int FROM program_cohorts c WHERE c.program_id = p.id) AS cohort_count
     FROM programs p LEFT JOIN schools s ON s.id = p.school_id
     WHERE p.id = $1`,
    [id]
  );
  if (!rows.length) return null;
  const program = rows[0];
  const { rows: courses } = await db.query<any>(
    `SELECT pc.course_id, pc.week_number, pc.is_required, pc.order_index,
            c.title AS course_title, c.slug AS course_slug, c.price AS course_price
     FROM program_courses pc JOIN courses c ON c.id = pc.course_id
     WHERE pc.program_id = $1 ORDER BY pc.order_index ASC`,
    [id]
  );
  program.courses = courses;
  program.cohorts = await listCohorts(env, id);
  return program;
}

export async function listPrograms(env: Env, filters: { status?: string; school_id?: string; limit?: number; offset?: number; ownerId?: string; ownerOnly?: boolean }): Promise<any[]> {
  const conds: string[] = [];
  const vals: any[] = [];
  if (filters.status) { conds.push(`p.status = $${vals.length + 1}`); vals.push(filters.status); }
  if (filters.school_id) { conds.push(`p.school_id = $${vals.length + 1}`); vals.push(filters.school_id); }
  if (filters.ownerOnly && filters.ownerId) { conds.push(`p.created_by = $${vals.length + 1}`); vals.push(filters.ownerId); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = Math.max(0, filters.offset || 0);
  const { rows } = await getDb(env).query<any>(
    `SELECT p.*, s.name AS school_name, s.slug AS school_slug,
            (SELECT COUNT(*)::int FROM program_courses pc WHERE pc.program_id = p.id) AS course_count,
            (SELECT COUNT(*)::int FROM program_cohorts c WHERE c.program_id = p.id) AS cohort_count,
            (SELECT COUNT(*)::int FROM program_cohort_members m JOIN program_cohorts c ON c.id = m.cohort_id WHERE c.program_id = p.id AND m.status = 'active') AS student_count
     FROM programs p LEFT JOIN schools s ON s.id = p.school_id
     ${where}
     ORDER BY p.created_at DESC LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
    [...vals, limit, offset]
  );
  return rows;
}

export async function setProgramCourses(env: Env, programId: string, courses: any[]): Promise<void> {
  const db = getDb(env);
  await db.query('DELETE FROM program_courses WHERE program_id = $1', [programId]);
  if (!courses?.length) return;
  const ids = [...new Set(courses.map((c) => c.course_id))];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await db.query<any>(`SELECT id FROM courses WHERE id IN (${placeholders})`, ids);
  const valid = new Set(rows.map((r: any) => r.id));
  const filtered = courses.filter((c) => valid.has(c.course_id));
  for (let i = 0; i < filtered.length; i++) {
    const c = filtered[i];
    await db.query(
      `INSERT INTO program_courses (program_id, course_id, order_index, week_number, is_required)
       VALUES ($1,$2,$3,$4,$5)`,
      [programId, c.course_id, i, Math.max(1, Math.min(52, c.week_number || 1)), c.is_required !== false]
    );
  }
}

export async function createProgram(env: Env, input: any): Promise<any> {
  const db = getDb(env);
  const slug = await uniqueSlug(env, input.slug || input.name);
  const { rows } = await db.query<any>(
    `INSERT INTO programs (school_id, name, slug, description, duration, duration_weeks, price, currency, thumbnail_url, career_outcomes, created_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      input.school_id, input.name, slug, input.description || null,
      input.duration_weeks ? `${input.duration_weeks} weeks` : null,
      input.duration_weeks || null, input.price ?? 0, input.currency || 'NGN',
      input.thumbnail_url || null, JSON.stringify(input.career_outcomes || []),
      input.created_by, input.status || 'draft',
    ]
  );
  const program = rows[0];
  if (input.courses?.length) await setProgramCourses(env, program.id, input.courses);
  return program;
}

export async function updateProgram(env: Env, id: string, patch: Record<string, any>): Promise<any> {
  const db = getDb(env);
  const allowed = ['school_id', 'name', 'slug', 'description', 'duration_weeks', 'price', 'currency', 'thumbnail_url', 'career_outcomes', 'status', 'rejection_reason'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    if (key === 'duration_weeks') {
      sets.push(`duration_weeks = $${vals.length + 1}`); vals.push(patch[key]);
      sets.push(`duration = $${vals.length + 1}`); vals.push(patch[key] ? `${patch[key]} weeks` : null);
    } else if (key === 'career_outcomes') {
      sets.push(`career_outcomes = $${vals.length + 1}`); vals.push(JSON.stringify(patch[key] || []));
    } else {
      sets.push(`${key} = $${vals.length + 1}`); vals.push(patch[key]);
    }
  }
  if (!sets.length) return getProgramById(env, id);
  sets.push('updated_at = NOW()');
  await db.query(`UPDATE programs SET ${sets.join(', ')} WHERE id = $${vals.length + 1}`, [...vals, id]);
  return getProgramById(env, id);
}

export async function createCohort(env: Env, programId: string, input: any, createdBy: string): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO program_cohorts (program_id, title, starts_at, ends_at, capacity, price, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [programId, input.title, input.starts_at, input.ends_at, input.capacity || 100, input.price ?? null, createdBy]
  );
  return rows[0];
}

export async function setCohortStatus(env: Env, cohortId: string, status: string): Promise<void> {
  await getDb(env).query('UPDATE program_cohorts SET status = $1, updated_at = NOW() WHERE id = $2', [status, cohortId]);
}

export async function getMembership(env: Env, cohortId: string, userId: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    'SELECT * FROM program_cohort_members WHERE cohort_id = $1 AND user_id = $2',
    [cohortId, userId]
  );
  return rows[0] || null;
}

export async function enrollMember(env: Env, cohortId: string, userId: string, paymentId: string | null): Promise<any> {
  const db = getDb(env);
  const cohort = await getCohortById(env, cohortId);
  if (!cohort) throw Object.assign(new Error('Cohort not found'), { statusCode: 404 });
  if (Number(cohort.enrolled_count) >= Number(cohort.capacity)) {
    throw Object.assign(new Error('Cohort is full'), { statusCode: 409 });
  }
  const { rows } = await db.query<any>(
    `INSERT INTO program_cohort_members (cohort_id, user_id, payment_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (cohort_id, user_id) DO UPDATE SET status = 'active', payment_id = COALESCE($3, program_cohort_members.payment_id)
     RETURNING *`,
    [cohortId, userId, paymentId]
  );
  await db.query(
    `INSERT INTO enrollments (user_id, course_id, status)
     SELECT $1, pc.course_id, 'active' FROM program_courses pc
     WHERE pc.program_id = $2 AND pc.is_required = true
     ON CONFLICT (user_id, course_id) DO NOTHING`,
    [userId, cohort.program_id]
  );
  if (Number(cohort.enrolled_count) + 1 >= Number(cohort.capacity)) {
    await setCohortStatus(env, cohortId, 'full');
  }
  return rows[0];
}

export async function getMemberCohorts(env: Env, userId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
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
