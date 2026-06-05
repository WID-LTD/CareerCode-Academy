import { query } from '../config/db';

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string | null;
  duration: number;
  order_index: number;
  resources: string[] | null;
  is_free: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLessonInput {
  course_id: string;
  title: string;
  description: string;
  video_url?: string;
  duration: number;
  order_index: number;
  resources?: string[];
  is_free?: boolean;
}

export interface UpdateLessonInput {
  title?: string;
  description?: string;
  video_url?: string;
  duration?: number;
  order_index?: number;
  resources?: string[];
  is_free?: boolean;
}

export async function createLesson(input: CreateLessonInput): Promise<Lesson> {
  const { rows } = await query<Lesson>(
    `INSERT INTO lessons (course_id, title, description, video_url, duration, order_index, resources, is_free)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [input.course_id, input.title, input.description, input.video_url || null, input.duration, input.order_index, input.resources ? JSON.stringify(input.resources) : null, input.is_free || false]
  );
  return rows[0];
}

export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
  const { rows } = await query<Lesson>(
    'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC',
    [courseId]
  );
  return rows;
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const { rows } = await query<Lesson>('SELECT * FROM lessons WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateLesson(id: string, input: UpdateLessonInput): Promise<Lesson | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (key === 'resources') {
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (fields.length === 0) return getLessonById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Lesson>(
    `UPDATE lessons SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteLesson(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM lessons WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function countLessonsByCourse(courseId: string): Promise<number> {
  const { rows } = await query('SELECT COUNT(*) FROM lessons WHERE course_id = $1', [courseId]);
  return parseInt(rows[0].count, 10);
}

export async function getFreeLessonsByCourse(courseId: string): Promise<Lesson[]> {
  const { rows } = await query<Lesson>(
    'SELECT * FROM lessons WHERE course_id = $1 AND is_free = true ORDER BY order_index ASC',
    [courseId]
  );
  return rows;
}
