import { query } from '../config/db';

export interface Blog {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_id: string;
  category: string;
  tags: string[];
  image_url: string | null;
  slug: string;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBlogInput {
  title: string;
  content: string;
  excerpt?: string;
  author_id: string;
  category: string;
  tags?: string[];
  image_url?: string;
  slug: string;
}

export interface UpdateBlogInput {
  title?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  image_url?: string;
  slug?: string;
  published?: boolean;
}

export async function createBlog(input: CreateBlogInput): Promise<Blog> {
  const { rows } = await query<Blog>(
    `INSERT INTO blogs (title, content, excerpt, author_id, category, tags, image_url, slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [input.title, input.content, input.excerpt || null, input.author_id, input.category, input.tags ? JSON.stringify(input.tags) : '[]', input.image_url || null, input.slug]
  );
  return rows[0];
}

export async function getAllBlogs(limit: number = 50, offset: number = 0, published?: boolean): Promise<Blog[]> {
  let sql = `SELECT b.*, u.name as author_name, u.avatar as author_avatar
             FROM blogs b JOIN users u ON b.author_id = u.id WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (published !== undefined) {
    sql += ` AND b.published = $${paramIndex++}`;
    params.push(published);
  }

  sql += ` ORDER BY b.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  const { rows } = await query<Blog>(sql, params);
  return rows;
}

export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  const { rows } = await query<Blog>(
    `SELECT b.*, u.name as author_name, u.avatar as author_avatar
     FROM blogs b JOIN users u ON b.author_id = u.id
     WHERE b.slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

export async function getBlogById(id: string): Promise<Blog | null> {
  const { rows } = await query<Blog>('SELECT * FROM blogs WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateBlog(id: string, input: UpdateBlogInput): Promise<Blog | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (key === 'tags') {
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (fields.length === 0) return getBlogById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const { rows } = await query<Blog>(
    `UPDATE blogs SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteBlog(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM blogs WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function countBlogs(published?: boolean): Promise<number> {
  if (published !== undefined) {
    const { rows } = await query('SELECT COUNT(*) FROM blogs WHERE published = $1', [published]);
    return parseInt(rows[0].count, 10);
  }
  const { rows } = await query('SELECT COUNT(*) FROM blogs', []);
  return parseInt(rows[0].count, 10);
}
