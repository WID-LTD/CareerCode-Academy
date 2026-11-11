import type { Env } from '../env';
import { getDb } from '../db';
import { buildUpdate } from './helpers';

// Ports of the model functions admin.routes.ts imports. Same SQL, same column
// lists, same return values — only the driver differs (see ../db.ts).

const PUBLIC_USER_COLS =
  'id, name, email, role, avatar, bio, headline, location, website, github, twitter, linkedin, expertise, is_verified, is_suspended, allowed_dashboards, created_at, updated_at';

// ── users (backend/src/models/user.ts) ───────────────────────────────────
export async function countUsers(env: Env, role?: string): Promise<number> {
  const db = getDb(env);
  const { rows } = role
    ? await db.query<{ count: any }>('SELECT COUNT(*) as count FROM users WHERE role = $1', [role])
    : await db.query<{ count: any }>('SELECT COUNT(*) as count FROM users');
  return parseInt(String(rows[0]?.count ?? 0), 10);
}

export async function getAllUsers(env: Env, limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT id, name, email, role, avatar, bio, headline, location, website, github, twitter, linkedin, expertise, is_verified, is_suspended, allowed_dashboards, created_at, updated_at
     FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getUserById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(`SELECT ${PUBLIC_USER_COLS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getUserByEmail(env: Env, email: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

export async function createUser(env: Env, input: {
  name: string;
  email: string;
  password: string;
  role?: string;
  verification_token?: string | null;
  verification_token_expires?: Date | null;
  is_verified?: boolean;
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO users (name, email, password, role, verification_token, verification_token_expires, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.name,
      input.email,
      input.password,
      input.role || 'student',
      input.verification_token || null,
      input.verification_token_expires || null,
      input.is_verified ?? false,
    ]
  );
  return rows[0];
}

export async function updateUser(env: Env, id: string, input: Record<string, any>): Promise<any | null> {
  const { fields, values } = buildUpdate(input);
  if (!fields.length) return getUserById(env, id);
  fields.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await getDb(env).query<any>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
     RETURNING id, name, email, role, avatar, bio, headline, location, website, github, twitter, linkedin, expertise, is_verified, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

export async function deleteUser(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

// ── courses (backend/src/models/course.ts) ───────────────────────────────
export async function createCourse(env: Env, input: {
  title: string;
  description: string;
  thumbnail?: string;
  price: number;
  discount_percentage?: number;
  category: string;
  instructor_id: string;
  level: string;
  duration: number;
  slug: string;
  learning_outcomes?: string[];
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO courses (title, description, thumbnail, price, discount_percentage, category, instructor_id, level, duration, slug, learning_outcomes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.title,
      input.description,
      input.thumbnail || null,
      input.price,
      input.discount_percentage ?? 0,
      input.category,
      input.instructor_id,
      input.level,
      input.duration,
      input.slug,
      input.learning_outcomes || [],
    ]
  );
  return rows[0];
}

export async function getAllCourses(
  env: Env,
  limit = 50,
  offset = 0,
  filters?: { published?: boolean; status?: string; category?: string; level?: string; instructor_id?: string }
): Promise<any[]> {
  let sql = `SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar,
             COALESCE(COUNT(DISTINCT e.id)::int, 0) as student_count,
             COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float as avg_rating
             FROM courses c
             JOIN users u ON c.instructor_id = u.id
             LEFT JOIN enrollments e ON e.course_id = c.id
             LEFT JOIN reviews r ON r.course_id = c.id
             WHERE 1=1`;
  const params: any[] = [];

  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND c.status = $${params.length}`;
  }
  if (filters?.published !== undefined) {
    params.push(filters.published);
    sql += ` AND c.published = $${params.length}`;
  }
  if (filters?.category) {
    params.push(filters.category);
    sql += ` AND c.category = $${params.length}`;
  }
  if (filters?.level) {
    params.push(filters.level);
    sql += ` AND c.level = $${params.length}`;
  }
  if (filters?.instructor_id) {
    params.push(filters.instructor_id);
    sql += ` AND c.instructor_id = $${params.length}`;
  }

  sql += ` GROUP BY c.id, u.name, u.avatar ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await getDb(env).query<any>(sql, params);
  return rows;
}

export async function updateCourseStatus(
  env: Env,
  id: string,
  status: string,
  reviewNotes?: string | null,
  reviewedBy?: string | null
): Promise<any | null> {
  const published = status === 'published';
  const { rows } = await getDb(env).query<any>(
    `UPDATE courses SET status = $1, published = $2, review_notes = COALESCE($3, review_notes),
       reviewed_by = COALESCE($4, reviewed_by),
       reviewed_at = CASE WHEN $4 IS NOT NULL THEN NOW() ELSE reviewed_at END,
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [status, published, reviewNotes || null, reviewedBy || null, id]
  );
  return rows[0] || null;
}

export async function getCourseById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar,
            pr.name as program_name, pr.slug as program_slug, pr.icon as program_icon,
            s.name as school_name, s.slug as school_slug
     FROM courses c
     JOIN users u ON c.instructor_id = u.id
     LEFT JOIN programs pr ON pr.id = c.program_id
     LEFT JOIN schools s ON s.id = pr.school_id
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function updateCourse(env: Env, id: string, input: Record<string, any>): Promise<any | null> {
  const { fields, values } = buildUpdate(input);
  if (!fields.length) return getCourseById(env, id);
  fields.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await getDb(env).query<any>(
    `UPDATE courses SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteCourse(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

export async function countCourses(env: Env, published?: boolean): Promise<number> {
  const db = getDb(env);
  const { rows } = published !== undefined
    ? await db.query<{ count: any }>('SELECT COUNT(*) as count FROM courses WHERE published = $1', [published])
    : await db.query<{ count: any }>('SELECT COUNT(*) as count FROM courses');
  return parseInt(String(rows[0]?.count ?? 0), 10);
}

export async function getRevenueStats(env: Env): Promise<{ total_revenue: any; total_enrollments: any; average_price: any }> {
  const { rows } = await getDb(env).query<any>(
    `SELECT
       COALESCE(SUM(p.amount), 0) as total_revenue,
       COUNT(DISTINCT p.id) as total_enrollments,
       COALESCE(AVG(p.amount), 0) as average_price
     FROM payments p
     WHERE p.status = 'completed'`
  );
  return rows[0];
}

// ── categories (backend/src/models/category.ts) ──────────────────────────
export async function getAllCategories(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
  return rows;
}

export async function getCategoryById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>('SELECT * FROM categories WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createCategory(env: Env, input: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  sort_order?: number;
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO categories (name, slug, description, icon, color, parent_id, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      input.name,
      input.slug,
      input.description || null,
      input.icon || null,
      input.color || null,
      input.parent_id || null,
      input.sort_order || 0,
    ]
  );
  return rows[0];
}

export async function updateCategory(env: Env, id: string, input: Record<string, any>): Promise<any | null> {
  // Category columns are already snake_case — no camelCase conversion.
  const { fields, values } = buildUpdate(input, {
    name: 'name', slug: 'slug', description: 'description', icon: 'icon',
    color: 'color', parent_id: 'parent_id', sort_order: 'sort_order',
  });
  if (!fields.length) return getCategoryById(env, id);
  fields.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await getDb(env).query<any>(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteCategory(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

export async function countCategories(env: Env): Promise<number> {
  const { rows } = await getDb(env).query<{ count: any }>('SELECT COUNT(*) as count FROM categories');
  return parseInt(String(rows[0]?.count ?? 0), 10);
}

// ── enrollments (backend/src/models/enrollment.ts) ───────────────────────
export async function getAllEnrollmentsPaginated(env: Env, limit: number, offset: number, status?: string): Promise<any[]> {
  let sql = `SELECT e.*, u.name as student_name, u.email as student_email, c.title as course_title, c.price
             FROM enrollments e
             JOIN users u ON e.user_id = u.id
             JOIN courses c ON e.course_id = c.id`;
  const params: any[] = [];
  if (status) {
    params.push(status);
    sql += ` WHERE e.status = $1`;
  }
  sql += ` ORDER BY e.enrolled_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const { rows } = await getDb(env).query<any>(sql, params);
  return rows;
}

export async function countEnrollments(env: Env, courseId?: string): Promise<number> {
  const db = getDb(env);
  const { rows } = courseId
    ? await db.query<{ count: any }>('SELECT COUNT(*) as count FROM enrollments WHERE course_id = $1', [courseId])
    : await db.query<{ count: any }>('SELECT COUNT(*) as count FROM enrollments');
  return parseInt(String(rows[0]?.count ?? 0), 10);
}

export async function updateEnrollmentStatus(env: Env, id: string, status: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE enrollments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

export async function getEnrollmentsByUser(env: Env, userId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug, c.category, c.level, c.duration, c.price, c.description as course_description,
            u.name as instructor_name, u.avatar as instructor_avatar,
            (SELECT COUNT(*)::int FROM lessons WHERE course_id = c.id) as total_lessons,
            (SELECT COUNT(*)::int FROM modules WHERE course_id = c.id) as total_modules,
            COALESCE((SELECT COUNT(*)::int FROM lesson_progress WHERE user_id = e.user_id AND course_id = c.id AND completed = true), 0) as completed_lessons_count,
            (SELECT l.title FROM lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id AND lp.completed = true WHERE l.course_id = c.id AND lp.lesson_id IS NULL ORDER BY l.order_index ASC LIMIT 1) as next_lesson_title,
            (SELECT l.id FROM lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id AND lp.completed = true WHERE l.course_id = c.id AND lp.lesson_id IS NULL ORDER BY l.order_index ASC LIMIT 1) as next_lesson_id
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE e.user_id = $1
     ORDER BY e.enrolled_at DESC`,
    [userId]
  );
  return rows;
}

// ── payments (backend/src/models/payment.ts) ─────────────────────────────
export async function getAllPayments(env: Env, limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT p.*, u.name as user_name, u.email as user_email,
            COALESCE(c.title, 'Learning path bundle') as course_title
     FROM payments p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN courses c ON p.course_id = c.id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

// ── notifications (backend/src/models/notification.ts) ───────────────────
export async function createNotification(env: Env, input: {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
}): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.user_id, input.title, input.message, input.type || 'info', input.link || null]
  );
  return rows[0];
}

// ── certificates (backend/src/models/certificate.ts) ─────────────────────
export async function getAllCertificates(env: Env, limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT cert.*, u.name as user_name, u.email as user_email, c.title as course_title
     FROM certificates cert
     JOIN users u ON cert.user_id = u.id
     JOIN courses c ON cert.course_id = c.id
     ORDER BY cert.issued_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function countCertificates(env: Env): Promise<number> {
  const { rows } = await getDb(env).query<{ count: any }>('SELECT COUNT(*) as count FROM certificates');
  return parseInt(String(rows[0]?.count ?? 0), 10);
}

export async function revokeCertificateById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE certificates SET revoked = true, revoked_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

export async function reissueCertificateById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `UPDATE certificates SET revoked = false, revoked_at = NULL, issued_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

// ── certificate templates (backend/src/models/certificateTemplate.ts) ────
export async function getAllTemplates(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ct.*, c.title as course_title
     FROM certificate_templates ct
     JOIN courses c ON ct.course_id = c.id
     ORDER BY ct.created_at DESC`
  );
  return rows;
}

export async function getTemplateById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>(
    `SELECT ct.*, c.title as course_title
     FROM certificate_templates ct
     JOIN courses c ON ct.course_id = c.id
     WHERE ct.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createTemplate(env: Env, input: any): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO certificate_templates (name, course_id, layout_style, stamp_url, signature_url, logo_url, show_stamp, show_signature, instructor_name, org_name, org_rc, requires_exam)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.name,
      input.course_id,
      input.layout_style || 'professional',
      input.stamp_url || null,
      input.signature_url || null,
      input.logo_url || null,
      input.show_stamp ?? true,
      input.show_signature ?? true,
      input.instructor_name || 'Udokamma Emmanuel',
      input.org_name || 'Career Code WID Ltd',
      input.org_rc || 'RC 8824091',
      input.requires_exam ?? false,
    ]
  );
  return rows[0];
}

export async function updateTemplate(env: Env, id: string, input: Record<string, any>): Promise<any | null> {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(input)) {
    const column = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${column} = $${values.length + 1}`);
    values.push(value !== undefined ? value : null);
  }
  if (!fields.length) return getTemplateById(env, id);
  values.push(id);
  const { rows } = await getDb(env).query<any>(
    `UPDATE certificate_templates SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteTemplate(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>('DELETE FROM certificate_templates WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}
