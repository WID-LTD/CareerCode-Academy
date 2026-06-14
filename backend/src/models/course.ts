import { query } from '../config/db';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  price: number;
  category: string;
  instructor_id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  published: boolean;
  slug: string;
  learning_outcomes: string[];
  featured: boolean;
  status: string;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCourseInput {
  title: string;
  description: string;
  thumbnail?: string;
  price: number;
  category: string;
  instructor_id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  slug: string;
  learning_outcomes?: string[];
  published?: boolean;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  thumbnail?: string;
  price?: number;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  published?: boolean;
  slug?: string;
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const { rows } = await query<Course>(
    `INSERT INTO courses (title, description, thumbnail, price, category, instructor_id, level, duration, slug, learning_outcomes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [input.title, input.description, input.thumbnail || null, input.price, input.category, input.instructor_id, input.level, input.duration, input.slug, input.learning_outcomes || []]
  );
  return rows[0];
}

export async function getAllCourses(limit: number = 50, offset: number = 0, filters?: { published?: boolean; status?: string; category?: string; level?: string; instructor_id?: string }): Promise<Course[]> {
  let sql = `SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar,
             COALESCE(COUNT(DISTINCT e.id)::int, 0) as student_count,
             COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float as avg_rating
             FROM courses c
             JOIN users u ON c.instructor_id = u.id
             LEFT JOIN enrollments e ON e.course_id = c.id
             LEFT JOIN reviews r ON r.course_id = c.id
             WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    sql += ` AND c.status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.published !== undefined) {
    sql += ` AND c.published = $${paramIndex++}`;
    params.push(filters.published);
  }
  if (filters?.category) {
    sql += ` AND c.category = $${paramIndex++}`;
    params.push(filters.category);
  }
  if (filters?.level) {
    sql += ` AND c.level = $${paramIndex++}`;
    params.push(filters.level);
  }
  if (filters?.instructor_id) {
    sql += ` AND c.instructor_id = $${paramIndex++}`;
    params.push(filters.instructor_id);
  }

  sql += ` GROUP BY c.id, u.name, u.avatar ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const { rows } = await query<Course>(sql, params);
  return rows;
}

export async function updateCourseStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<Course | null> {
  const published = status === 'published';
  const { rows } = await query<Course>(
    `UPDATE courses SET status = $1, published = $2, review_notes = COALESCE($3, review_notes), reviewed_by = COALESCE($4, reviewed_by), reviewed_at = CASE WHEN $4 IS NOT NULL THEN NOW() ELSE reviewed_at END, updated_at = NOW() WHERE id = $5 RETURNING *`,
    [status, published, reviewNotes || null, reviewedBy || null, id]
  );
  return rows[0] || null;
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { rows } = await query<Course>(
    'SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const { rows } = await query<Course>(
    'SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.slug = $1',
    [slug]
  );
  return rows[0] || null;
}

export async function updateCourse(id: string, input: UpdateCourseInput): Promise<Course | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getCourseById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await query<Course>(
    `UPDATE courses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteCourse(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM courses WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function countCourses(published?: boolean): Promise<number> {
  if (published !== undefined) {
    const { rows } = await query('SELECT COUNT(*) FROM courses WHERE published = $1', [published]);
    return parseInt(rows[0].count, 10);
  }
  const { rows } = await query('SELECT COUNT(*) FROM courses', []);
  return parseInt(rows[0].count, 10);
}

export async function getRevenueStats(): Promise<{ total_revenue: number; total_enrollments: number; average_price: number }> {
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(p.amount), 0) as total_revenue,
       COUNT(DISTINCT p.id) as total_enrollments,
       COALESCE(AVG(p.amount), 0) as average_price
     FROM payments p
     WHERE p.status = 'completed'`
  );
  return rows[0];
}
