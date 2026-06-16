import { query } from '../config/db';

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  level: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}

export async function getAllLearningPaths(): Promise<any[]> {
  const { rows } = await query(
    `SELECT lp.*,
       COUNT(lpc.course_id)::int as courses_count,
       COALESCE(SUM(c.duration), 0)::int as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)
        FROM enrollments e
        JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
        WHERE lpc2.path_id = lp.id) as students_count
     FROM learning_paths lp
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.path_id
     LEFT JOIN courses c ON lpc.course_id = c.id
     GROUP BY lp.id
     ORDER BY lp.title ASC
    `
  );
  return rows;
}

export async function getLearningPathBySlug(slug: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT lp.*,
       COUNT(lpc.course_id)::int as courses_count
     FROM learning_paths lp
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.path_id
     WHERE lp.slug = $1
     GROUP BY lp.id`,
    [slug]
  );
  return rows[0] || null;
}
