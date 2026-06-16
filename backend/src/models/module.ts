import { query } from '../config/db';

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateModuleInput {
  course_id: string;
  title: string;
  order_index?: number;
}

export async function getModulesByCourse(courseId: string): Promise<Module[]> {
  const { rows } = await query(
    'SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index ASC, created_at ASC',
    [courseId]
  );
  return rows;
}

export async function getModuleById(id: string): Promise<Module | null> {
  const { rows } = await query('SELECT * FROM modules WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createModule(input: CreateModuleInput): Promise<Module> {
  const { rows } = await query(
    `INSERT INTO modules (course_id, title, order_index)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.course_id, input.title, input.order_index ?? 0]
  );
  return rows[0];
}

export async function updateModule(id: string, input: { title?: string; order_index?: number }): Promise<Module | null> {
  const { rows } = await query(
    `UPDATE modules
     SET title = COALESCE($1, title),
         order_index = COALESCE($2, order_index),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [input.title, input.order_index, id]
  );
  return rows[0] || null;
}

export async function deleteModule(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM modules WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}
