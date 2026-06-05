import { query } from '../config/db';

export interface Assignment {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string;
  due_date: Date | null;
  max_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAssignmentInput {
  course_id: string;
  lesson_id?: string;
  title: string;
  description: string;
  due_date?: string;
  max_score?: number;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  due_date?: string;
  max_score?: number;
}

export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  const { rows } = await query<Assignment>(
    `INSERT INTO assignments (course_id, lesson_id, title, description, due_date, max_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.course_id, input.lesson_id || null, input.title, input.description, input.due_date || null, input.max_score || 100]
  );
  return rows[0];
}

export async function getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
  const { rows } = await query<Assignment>(
    'SELECT * FROM assignments WHERE course_id = $1 ORDER BY created_at DESC',
    [courseId]
  );
  return rows;
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const { rows } = await query<Assignment>('SELECT * FROM assignments WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateAssignment(id: string, input: UpdateAssignmentInput): Promise<Assignment | null> {
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

  if (fields.length === 0) return getAssignmentById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Assignment>(
    `UPDATE assignments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteAssignment(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM assignments WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}
