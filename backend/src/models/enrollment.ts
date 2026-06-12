import { query } from '../config/db';

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed_lessons: string[];
  completed: boolean;
  enrolled_at: Date;
  completed_at: Date | null;
}

export interface CreateEnrollmentInput {
  user_id: string;
  course_id: string;
  status?: string;
}

export async function createEnrollment(input: CreateEnrollmentInput): Promise<Enrollment> {
  const { rows } = await query<Enrollment>(
    `INSERT INTO enrollments (user_id, course_id, status)
     VALUES ($1, $2, COALESCE($3, 'active'))
     RETURNING *`,
    [input.user_id, input.course_id, input.status || 'active']
  );
  return rows[0];
}

export async function updateEnrollmentStatus(id: string, status: string): Promise<Enrollment | null> {
  const { rows } = await query<Enrollment>(
    `UPDATE enrollments SET status = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

export async function getAllEnrollmentsPaginated(limit: number, offset: number, status?: string) {
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
  const { rows } = await query(sql, params);
  return rows;
}

export async function getEnrollmentsByUser(userId: string): Promise<Enrollment[]> {
  const { rows } = await query<Enrollment>(
    `SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug, c.category,
            u.name as instructor_name
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE e.user_id = $1
     ORDER BY e.enrolled_at DESC`,
    [userId]
  );
  return rows;
}

export async function getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]> {
  const { rows } = await query<Enrollment>(
    `SELECT e.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     WHERE e.course_id = $1
     ORDER BY e.enrolled_at DESC`,
    [courseId]
  );
  return rows;
}

export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const { rows } = await query<Enrollment>(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}

export async function updateProgress(id: string, progress: number, completedLessons: string[], completed: boolean): Promise<Enrollment | null> {
  const { rows } = await query<Enrollment>(
    `UPDATE enrollments
     SET progress = $1, completed_lessons = $2, completed = $3,
         completed_at = CASE WHEN $3 = true THEN NOW() ELSE completed_at END
     WHERE id = $4
     RETURNING *`,
    [progress, JSON.stringify(completedLessons), completed, id]
  );
  return rows[0] || null;
}

export async function deleteEnrollment(userId: string, courseId: string): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return (rowCount ?? 0) > 0;
}

export async function countEnrollments(courseId?: string): Promise<number> {
  if (courseId) {
    const { rows } = await query('SELECT COUNT(*) FROM enrollments WHERE course_id = $1', [courseId]);
    return parseInt(rows[0].count, 10);
  }
  const { rows } = await query('SELECT COUNT(*) FROM enrollments', []);
  return parseInt(rows[0].count, 10);
}

export async function getEnrollmentById(id: string): Promise<Enrollment | null> {
  const { rows } = await query<Enrollment>('SELECT * FROM enrollments WHERE id = $1', [id]);
  return rows[0] || null;
}
