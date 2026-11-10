import type { Env } from './env';
import { getDb } from './db';
import { awardXp } from './gamification';

// Learning-path completion bookkeeping, ported from
// backend/src/models/learningPath.ts + models/career.ts (upsertAlumni).

export interface CompletedPath {
  id: string;
  slug: string;
  title: string;
}

/** Recompute progress for every path the user is enrolled in; return newly completed ones. */
export async function recalculateLearningPathProgress(env: Env, userId: string): Promise<CompletedPath[]> {
  const db = getDb(env);
  const { rows: enrollments } = await db.query<any>(
    `SELECT lpe.id, lpe.path_id, lpe.completed AS was_completed, lp.slug, lp.title
     FROM learning_path_enrollments lpe
     JOIN learning_paths lp ON lp.id = lpe.path_id
     WHERE lpe.user_id = $1`,
    [userId]
  );

  const newlyCompleted: CompletedPath[] = [];
  for (const row of enrollments) {
    const totalRes = await db.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM learning_path_courses WHERE path_id = $1',
      [row.path_id]
    );
    const completedRes = await db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT c.id)::int AS count
       FROM learning_path_courses lpc
       JOIN courses c ON c.id = lpc.course_id
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1 AND e.completed = true
       WHERE lpc.path_id = $2`,
      [userId, row.path_id]
    );
    const total = Number(totalRes.rows[0]?.count) || 0;
    const completed = Number(completedRes.rows[0]?.count) || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isCompleted = total > 0 && progress >= 100;

    await db.query(
      `UPDATE learning_path_enrollments
       SET progress = $1,
           completed = $2,
           completed_at = CASE WHEN $2 = true AND completed = false THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE user_id = $3 AND path_id = $4`,
      [progress, isCompleted, userId, row.path_id]
    );

    if (isCompleted && !row.was_completed) {
      newlyCompleted.push({ id: row.path_id, slug: row.slug, title: row.title });
    }
  }
  return newlyCompleted;
}

async function upsertAlumni(env: Env, userId: string): Promise<void> {
  await getDb(env).query(
    `INSERT INTO alumni (user_id, graduation_year)
     VALUES ($1, EXTRACT(YEAR FROM NOW())::int)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

/** Notify + reward + mark alumni for paths completed by this action. */
export async function celebrateCompletedLearningPaths(env: Env, userId: string): Promise<void> {
  const db = getDb(env);
  const completedPaths = await recalculateLearningPathProgress(env, userId);
  for (const path of completedPaths) {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'Pathway Completed!', $2, 'pathway_complete', $3)`,
      [userId, `Congratulations! You completed the "${path.title}" learning pathway.`, '/student/learning-paths']
    );
    await awardXp(env, userId, 150, 'pathway_complete', `Completed learning pathway: ${path.title}`);
    await upsertAlumni(env, userId);
  }
}
