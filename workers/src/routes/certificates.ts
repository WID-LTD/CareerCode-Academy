import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import { certificatePdf, issueCertificateIfEligible } from '../certificate-service';

const certificates = new Hono<{ Bindings: Env }>();

function err(c: any, status: number, message: string) {
  return c.json({ success: false, message }, status as any);
}

// GET /api/v1/certificates — current user's certificates
certificates.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20') || 20));
    const offset = (page - 1) * limit;
    const db = getDb(c.env);

    // Backwards-compatible query verification used by the certificate page.
    const code = c.req.query('code');
    if (code) {
      const { rows } = await db.query<any>(
        `SELECT cert.*, c.title as course_title, c.category, u.name as user_name
         FROM certificates cert JOIN courses c ON c.id = cert.course_id
         JOIN users u ON u.id = cert.user_id
         WHERE cert.verification_code = $1 LIMIT 1`,
        [code]
      );
      if (!rows.length) return err(c, 404, 'Certificate not found');
      return c.json({ success: true, data: rows[0] });
    }

    const { rows } = await db.query<any>(
      `SELECT cert.*, c.title as course_title, c.category, u.name as user_name
       FROM certificates cert JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.user_id = $1 ORDER BY cert.issued_at DESC LIMIT $2 OFFSET $3`,
      [s.userId, limit, offset]
    );
    const total = await db.query<{ total: number }>(
      'SELECT COUNT(*)::int as total FROM certificates WHERE user_id = $1',
      [s.userId]
    );
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

// GET /api/v1/certificates/verify/:code — public, no email exposure
certificates.get('/verify/:code', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT cert.id, cert.verification_code, cert.issued_at, cert.course_id,
              c.title as course_title, c.category, u.name as user_name
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.verification_code = $1 LIMIT 1`,
      [c.req.param('code')]
    );
    if (!rows.length) return err(c, 404, 'Certificate not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return err(c, 500, e?.message || 'Failed to verify certificate');
  }
});

// GET /api/v1/certificates/:id/download — authenticated PDF
certificates.get('/:id/download', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT cert.*, c.title as course_title, u.name as user_name
       FROM certificates cert JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.id = $1 LIMIT 1`,
      [c.req.param('id')]
    );
    const cert = rows[0];
    if (!cert) return err(c, 404, 'Certificate not found');
    if (cert.user_id !== s.userId && !['admin', 'super_admin'].includes(s.role)) return err(c, 403, 'Forbidden');

    const template = cert.certificate_template_id
      ? (await db.query<any>('SELECT * FROM certificate_templates WHERE id = $1 LIMIT 1', [cert.certificate_template_id])).rows[0]
      : null;

    const pdf = certificatePdf({
      learner: cert.user_name || 'Learner',
      course: cert.course_title || 'Course',
      issuedAt: new Date(cert.issued_at || Date.now()).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }),
      code: cert.verification_code,
      orgName: template?.org_name || 'CareerCode Academy',
      orgRc: template?.org_rc ? `WID LTD · ${template.org_rc}` : 'WID LTD · RC 8824091',
      instructor: template?.instructor_name || 'CareerCode Faculty',
    });

    return c.body(pdf.buffer as ArrayBuffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${cert.verification_code}.pdf"`,
      'Cache-Control': 'private, no-store',
    });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to download certificate');
  }
});

// POST /api/v1/certificates/auto — issue only when eligible
certificates.post('/auto', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const courseId = body.courseId;
    if (!courseId) return err(c, 400, 'courseId is required');
    const result = await issueCertificateIfEligible(c.env, s.userId, courseId);
    if (!result.issued && result.reason !== 'Certificate already issued') {
      return c.json({ success: false, message: result.reason }, 400 as any);
    }
    return c.json({ success: true, data: result.certificate, alreadyIssued: !result.issued }, result.issued ? 201 as any : 200 as any);
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to issue certificate');
  }
});

export default certificates;
