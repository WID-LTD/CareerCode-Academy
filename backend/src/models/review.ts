import { query } from '../config/db';

export interface Review {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
}

export interface CreateReviewInput {
  course_id: string;
  user_id: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { rows } = await query<Review>(
    `INSERT INTO reviews (course_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.course_id, input.user_id, input.rating, input.comment || null]
  );
  return rows[0];
}

export async function getReviewsByCourse(courseId: string): Promise<Review[]> {
  const { rows } = await query<Review>(
    `SELECT r.*, u.name as user_name, u.avatar as user_avatar
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.course_id = $1
     ORDER BY r.created_at DESC`,
    [courseId]
  );
  return rows;
}

export async function getReviewById(id: string): Promise<Review | null> {
  const { rows } = await query<Review>(
    `SELECT r.*, u.name as user_name, u.avatar as user_avatar
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function updateReview(id: string, input: UpdateReviewInput): Promise<Review | null> {
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

  if (fields.length === 0) return getReviewById(id);

  values.push(id);

  const { rows } = await query<Review>(
    `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteReview(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function getAverageRating(courseId: string): Promise<number> {
  const { rows } = await query(
    'SELECT AVG(rating)::float as average, COUNT(*)::int as count FROM reviews WHERE course_id = $1',
    [courseId]
  );
  return rows[0]?.average || 0;
}

export async function getUserReviewForCourse(userId: string, courseId: string): Promise<Review | null> {
  const { rows } = await query<Review>(
    'SELECT * FROM reviews WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}
