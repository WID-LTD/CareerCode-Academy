import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';

const analytics = new Hono<{ Bindings: Env }>();
const ADMIN = ['admin', 'super_admin', 'instructor'];

analytics.get('/', async (c) => {
  try {
    const s = await requireRole(c, ADMIN);
    const db = getDb(c.env);
    const admin = ['admin', 'super_admin'].includes(s.role);
    const where = admin ? '' : 'WHERE c.instructor_id = $1';
    const vals = admin ? [] : [s.userId];
    const summary = (await db.query<any>(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(CASE WHEN p.repo_verified THEN 1 ELSE 0 END),0)::int AS verified,
              COALESCE(SUM(CASE WHEN p.status='needs_work' THEN 1 ELSE 0 END),0)::int AS needs_work,
              COALESCE(SUM(CASE WHEN p.score IS NOT NULL THEN 1 ELSE 0 END),0)::int AS reviewed,
              COALESCE(ROUND(AVG(p.score),1),0) AS average_score
       FROM projects p JOIN courses c ON c.id=p.course_id ${where}`,
      vals
    )).rows[0];
    const byCourse = (await db.query<any>(
      `SELECT c.id, c.title, c.slug, COUNT(p.id)::int AS submissions,
              COALESCE(SUM(CASE WHEN p.repo_verified THEN 1 ELSE 0 END),0)::int AS verified,
              COALESCE(ROUND(AVG(p.score),1),0) AS average_score
       FROM courses c LEFT JOIN projects p ON p.course_id=c.id
       ${admin ? '' : 'WHERE c.instructor_id=$1'}
       GROUP BY c.id ORDER BY submissions DESC LIMIT 100`,
      vals
    )).rows;
    const recent = (await db.query<any>(
      `SELECT p.id,p.title,p.status,p.repo_verified,p.score,p.created_at,p.verification,
              cp.title AS project_title,c.title AS course_title,u.name AS student_name
       FROM projects p JOIN course_projects cp ON cp.id=p.project_id
       JOIN courses c ON c.id=p.course_id JOIN users u ON u.id=p.user_id
       ${where} ORDER BY p.created_at DESC LIMIT 100`,
      vals
    )).rows;
    const failed: Record<string, number> = {};
    for (const row of recent) {
      let v: any = row.verification;
      try { if (typeof v === 'string') v = JSON.parse(v); } catch { v = {}; }
      for (const check of (v?.checks || [])) if (!check.passed) failed[check.label || check.key] = (failed[check.label || check.key] || 0) + 1;
    }
    return c.json({
      success: true,
      data: {
        summary,
        by_course: byCourse,
        recent: recent.map((r) => { let v: any = r.verification; try { if (typeof v === 'string') v = JSON.parse(v); } catch { v = {}; } return { ...r, verification: v }; }),
        common_failed_checks: Object.entries(failed).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count })),
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load project analytics');
  }
});

export default analytics;
