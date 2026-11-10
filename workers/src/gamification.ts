import type { Env } from './env';
import { getDb } from './db';

// Gamification primitives shared by the learning routes. Ported from
// backend/src/models/gamification.ts; SQL is unchanged (translated to SQLite
// by the D1 client).

export async function awardXp(env: Env, userId: string, amount: number, source: string, description?: string): Promise<number> {
  const db = getDb(env);
  await db.query(
    'INSERT INTO xp_history (user_id, amount, source, description) VALUES ($1, $2, $3, $4)',
    [userId, amount, source, description || null]
  );
  await db.query(
    `INSERT INTO daily_xp_log (user_id, xp_earned, date) VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (user_id, date) DO UPDATE SET xp_earned = daily_xp_log.xp_earned + $2`,
    [userId, amount]
  );
  const { rows } = await db.query<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM xp_history WHERE user_id = $1',
    [userId]
  );
  return Number(rows[0]?.total) || 0;
}

export async function updateStreak(env: Env, userId: string): Promise<{ current: number; best: number }> {
  const db = getDb(env);
  const { rows: userRows } = await db.query<{ best_streak: number }>(
    'SELECT best_streak FROM users WHERE id = $1',
    [userId]
  );
  const prevBest = Number(userRows[0]?.best_streak) || 0;
  const { rows: days } = await db.query<{ day: string }>(
    `SELECT DISTINCT DATE(completed_at) as day FROM lesson_progress
     WHERE user_id = $1 AND completed = true ORDER BY day DESC`,
    [userId]
  );
  if (!days.length) {
    await db.query('UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1', [userId]);
    return { current: 0, best: prevBest };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(days[0].day);
  firstDay.setHours(0, 0, 0, 0);
  if (Math.floor((today.getTime() - firstDay.getTime()) / 86400000) > 1) {
    await db.query('UPDATE users SET last_active_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1', [userId]);
    return { current: 0, best: prevBest };
  }
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1].day);
    const curr = new Date(days[i].day);
    if ((prev.getTime() - curr.getTime()) / 86400000 === 1) streak++;
    else break;
  }
  const newBest = Math.max(prevBest, streak);
  await db.query(
    'UPDATE users SET last_active_date = CURRENT_DATE, best_streak = $1, updated_at = NOW() WHERE id = $2',
    [newBest, userId]
  );
  return { current: streak, best: newBest };
}
