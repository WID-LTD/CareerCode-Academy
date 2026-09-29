import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';

const pub = new Hono<{ Bindings: Env }>();

// GET /api/v1/public/stats — real platform counts (same shape as Express)
pub.get('/stats', async (c) => {
  const count = async (sql: string): Promise<number> => {
    try {
      const { rows } = await getDb(c.env).query<{ n: number }>(sql);
      return Number(rows[0]?.n) || 0;
    } catch {
      return 0;
    }
  };
  const [students, courses, certificates, alumni] = await Promise.all([
    count(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'student'`),
    count(`SELECT COUNT(*)::int AS n FROM courses WHERE published = true`),
    count(`SELECT COUNT(*)::int AS n FROM certificates`),
    count(`SELECT COUNT(*)::int AS n FROM alumni`),
  ]);
  return c.json({ success: true, data: { students, courses, certificates, alumni } });
});

export default pub;
