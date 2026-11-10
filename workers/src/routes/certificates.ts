import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { authenticate } from '../auth-helpers';
import { requireAuth } from '../route-utils';

const certificates = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

// GET /api/v1/certificates?page=&limit=
certificates.get('/', async (c) => {
  try {
    const s = await authenticate(c).catch((e: any) => {
      throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
    });
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20') || 20));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);
    const { rows } = await db.query(
      `SELECT cert.*, c.title as course_title, c.category, u.name as user_name
       FROM certificates cert JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.user_id = $1 ORDER BY cert.issued_at DESC LIMIT $2 OFFSET $3`,
      [s.userId, limit, offset]
    );
    const total = await db.query<{ count: string }>('SELECT COUNT(*)::int as total FROM certificates WHERE user_id = $1', [s.userId]);
    const totalN = Number((total.rows[0] as any)?.total) || 0;
    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: totalN, pages: Math.ceil(totalN / limit) },
    });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to load certificates');
  }
});

// GET /api/v1/certificates/verify/:code (public)
certificates.get('/verify/:code', async (c) => {
  try {
    const { rows } = await getDb(c.env).query(
      `SELECT cert.*, c.title as course_title, c.category, u.name as user_name, u.email as user_email
       FROM certificates cert JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.verification_code = $1`,
      [c.req.param('code')]
    );
    if (!rows.length) return err(c, 404, 'Certificate not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to verify certificate');
  }
});


// POST /api/v1/certificates/auto — issue on course completion
certificates.post('/auto', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const courseId = body.courseId;
    if (!courseId) return err(c, 400, 'courseId is required');
    const db = getDb(c.env);

    const course = (await db.query<any>('SELECT id, title FROM courses WHERE id = $1', [courseId])).rows[0];
    if (!course) return err(c, 404, 'Course not found');

    const enrollment = (await db.query<any>(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    )).rows[0];
    if (!enrollment) return err(c, 400, 'Not enrolled in this course');
    if (!enrollment.completed) return err(c, 400, 'Course not yet completed');

    const existing = (await db.query<any>(
      'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
      [s.userId, courseId]
    )).rows[0];
    if (existing) return c.json({ success: true, data: existing });

    const template = (await db.query<any>(
      'SELECT * FROM certificate_templates WHERE course_id = $1',
      [courseId]
    )).rows[0];

    if (template?.requires_exam) {
      const passing = (await db.query<any>(
        `SELECT ea.id FROM exam_attempts ea JOIN exams e ON e.id = ea.exam_id
         WHERE ea.user_id = $1 AND e.course_id = $2 AND ea.passed = true LIMIT 1`,
        [s.userId, courseId]
      )).rows[0];
      if (!passing) {
        return c.json({
          success: false,
          message: 'This course requires a passing exam score before a certificate can be issued.',
          requiresExam: true,
        });
      }
    }

    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = `CERT-${Date.now().toString(36).toUpperCase()}-${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

    const { rows } = await db.query<any>(
      `INSERT INTO certificates (user_id, course_id, certificate_template_id, verification_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [s.userId, courseId, template?.id || null, code]
    );
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, 'New Certificate Earned!', $2, 'certificate', $3)`,
      [s.userId, `Congratulations! You earned a certificate for "${course.title}".`, '/student/certificates']
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to issue certificate');
  }
});

export default certificates;

