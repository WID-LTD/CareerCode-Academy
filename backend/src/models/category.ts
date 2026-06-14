import { query } from '../config/db';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export async function getAllCategories(): Promise<Category[]> {
  const { rows } = await query<Category>('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
  return rows;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const { rows } = await query<Category>('SELECT * FROM categories WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createCategory(input: { name: string; slug: string; description?: string; icon?: string; color?: string; parent_id?: string; sort_order?: number }): Promise<Category> {
  const { rows } = await query<Category>(
    `INSERT INTO categories (name, slug, description, icon, color, parent_id, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.name, input.slug, input.description || null, input.icon || null, input.color || null, input.parent_id || null, input.sort_order || 0]
  );
  return rows[0];
}

export async function updateCategory(id: string, input: Partial<{ name: string; slug: string; description: string; icon: string; color: string; parent_id: string | null; sort_order: number }>): Promise<Category | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getCategoryById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Category>(`UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
  return rows[0] || null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function countCategories(): Promise<number> {
  const { rows } = await query('SELECT COUNT(*) FROM categories', []);
  return parseInt(rows[0].count, 10);
}
