import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';

const schools = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

// GET /api/v1/schools — list with program counts
schools.get('/', async (c) => {
  try {
    const { rows } = await getDb(c.env).query(
      `SELECT s.*, COUNT(p.id)::int as program_count
       FROM schools s LEFT JOIN programs p ON p.school_id = s.id
       GROUP BY s.id ORDER BY s.sort_order ASC`
    );
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load schools');
  }
});

// GET /api/v1/schools/programs/:slug — program detail with courses
// NOTE: registered before /:slug so "programs" isn't captured as a slug.
schools.get('/programs/:slug', async (c) => {
  try {
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT p.*, s.name as school_name, s.slug as school_slug,
              COUNT(pc.id)::int as course_count,
              mc.title as main_course_title, mc.slug as main_course_slug,
              mc.thumbnail as main_course_thumbnail
       FROM programs p JOIN schools s ON s.id = p.school_id
       LEFT JOIN program_courses pc ON pc.program_id = p.id
       LEFT JOIN courses mc ON mc.id = p.main_course_id
       WHERE p.slug = $1
       GROUP BY p.id, s.name, s.slug, mc.title, mc.slug, mc.thumbnail`,
      [c.req.param('slug')]
    );
    if (!rows.length) return err(c, 404, 'Program not found');
    const program = rows[0];
    const { rows: courses } = await db.query(
      `SELECT c.*, pc.order_index, u.name as instructor_name, u.avatar as instructor_avatar,
              COALESCE(COUNT(DISTINCT e.id)::int, 0) as student_count,
              COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float as avg_rating
       FROM program_courses pc JOIN courses c ON c.id = pc.course_id
       JOIN users u ON c.instructor_id = u.id
       LEFT JOIN enrollments e ON e.course_id = c.id
       LEFT JOIN reviews r ON r.course_id = c.id
       WHERE pc.program_id = $1 AND c.published = true
       GROUP BY c.id, pc.order_index, u.name, u.avatar
       ORDER BY pc.order_index ASC`,
      [program.id]
    );
    return c.json({ success: true, data: { ...program, courses } });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load program');
  }
});

// GET /api/v1/schools/:slug — school detail with programs
schools.get('/:slug', async (c) => {
  try {
    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT * FROM schools WHERE slug = $1', [c.req.param('slug')]);
    if (!rows.length) return err(c, 404, 'School not found');
    const school = rows[0];
    const { rows: programs } = await db.query(
      `SELECT p.*, COUNT(pc.id)::int as course_count,
              mc.title as main_course_title, mc.slug as main_course_slug,
              mc.thumbnail as main_course_thumbnail
       FROM programs p
       LEFT JOIN program_courses pc ON pc.program_id = p.id
       LEFT JOIN courses mc ON mc.id = p.main_course_id
       WHERE p.school_id = $1
       GROUP BY p.id, mc.title, mc.slug, mc.thumbnail
       ORDER BY p.sort_order ASC`,
      [school.id]
    );
    return c.json({ success: true, data: { ...school, programs } });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to load school');
  }
});

export default schools;
