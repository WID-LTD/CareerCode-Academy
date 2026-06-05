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
    `INSERT INTO courses (title, description, thumbnail, price, category, instructor_id, level, duration, slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [input.title, input.description, input.thumbnail || null, input.price, input.category, input.instructor_id, input.level, input.duration, input.slug]
  );
  return rows[0];
}

export async function getAllCourses(limit: number = 50, offset: number = 0, filters?: { published?: boolean; category?: string; level?: string; instructor_id?: string }): Promise<Course[]> {
  let sql = 'SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar FROM courses c JOIN users u ON c.instructor_id = u.id WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

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

  sql += ' ORDER BY c.created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
  params.push(limit, offset);

  const { rows } = await query<Course>(sql, params);
  return rows;
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
