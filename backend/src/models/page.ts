import { query } from '../config/db';

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: any;
  meta: any;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const { rows } = await query(
    'SELECT * FROM pages WHERE slug = $1 AND published = true',
    [slug]
  );
  return rows[0] || null;
}

export async function getAllPages(): Promise<Page[]> {
  const { rows } = await query(
    'SELECT * FROM pages ORDER BY title ASC'
  );
  return rows;
}

export async function createPage(input: { slug: string; title: string; content: any; meta?: any; published?: boolean }): Promise<Page> {
  const { rows } = await query(
    `INSERT INTO pages (slug, title, content, meta, published)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.slug, input.title, JSON.stringify(input.content), JSON.stringify(input.meta || {}), input.published ?? true]
  );
  return rows[0];
}

export async function updatePage(slug: string, input: { title?: string; content?: any; meta?: any; published?: boolean }): Promise<Page | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.title !== undefined) { fields.push(`title = $${idx++}`); values.push(input.title); }
  if (input.content !== undefined) { fields.push(`content = $${idx++}`); values.push(JSON.stringify(input.content)); }
  if (input.meta !== undefined) { fields.push(`meta = $${idx++}`); values.push(JSON.stringify(input.meta)); }
  if (input.published !== undefined) { fields.push(`published = $${idx++}`); values.push(input.published); }

  if (fields.length === 0) return getPageBySlug(slug);

  fields.push('updated_at = NOW()');
  values.push(slug);

  const { rows } = await query(
    `UPDATE pages SET ${fields.join(', ')} WHERE slug = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deletePage(slug: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM pages WHERE slug = $1', [slug]);
  return (rowCount ?? 0) > 0;
}
