import { query } from '../config/db';

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  watch_position: number;
  watch_percentage: number;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | null> {
  const { rows } = await query(
    'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
    [userId, lessonId]
  );
  return rows[0] || null;
}

export async function getCourseProgress(userId: string, courseId: string): Promise<LessonProgress[]> {
  const { rows } = await query(
    'SELECT * FROM lesson_progress WHERE user_id = $1 AND course_id = $2 ORDER BY created_at ASC',
    [userId, courseId]
  );
  return rows;
}

export async function upsertLessonProgress(
  userId: string, lessonId: string, courseId: string,
  completed: boolean, watchPosition?: number, watchPercentage?: number
): Promise<LessonProgress> {
  const { rows } = await query(
    `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, watch_position, watch_percentage)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, lesson_id)
     DO UPDATE SET
       completed = COALESCE($4, lesson_progress.completed),
       watch_position = COALESCE($5, lesson_progress.watch_position),
       watch_percentage = COALESCE($6, lesson_progress.watch_percentage),
       completed_at = CASE WHEN $4 = true AND lesson_progress.completed = false THEN NOW() ELSE lesson_progress.completed_at END,
       updated_at = NOW()
     RETURNING *`,
    [userId, lessonId, courseId, completed, watchPosition ?? 0, watchPercentage ?? 0]
  );
  return rows[0];
}

export async function getCourseCompletionStats(userId: string, courseId: string): Promise<{ completed: number; total: number; percentage: number }> {
  const { rows } = await query(
    `SELECT
       COUNT(l.id) as total,
       COUNT(lp.id) FILTER (WHERE lp.completed = true) as completed
     FROM lessons l
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
     WHERE l.course_id = $2`,
    [userId, courseId]
  );
  const total = parseInt(rows[0].total, 10);
  const completed = parseInt(rows[0].completed, 10);
  return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export async function getContinueWatching(userId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT DISTINCT ON (lp.course_id)
       lp.course_id, l.title as lesson_title, lp.watch_position, lp.watch_percentage,
       c.title as course_title, c.slug as course_slug, c.thumbnail
     FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     JOIN courses c ON lp.course_id = c.id
     WHERE lp.user_id = $1 AND lp.completed = false
     ORDER BY lp.course_id, lp.updated_at DESC
     LIMIT 10`,
    [userId]
  );
  return rows;
}
