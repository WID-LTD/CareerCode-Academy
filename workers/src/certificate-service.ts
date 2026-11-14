import type { Env } from './env';
import { getDb } from './db';
import { buildPdf } from './receipt';

export interface CertificateEligibility {
  eligible: boolean;
  reason: string;
  course: any | null;
  enrollment: any | null;
  template: any | null;
  lessons: { total: number; completed: number };
}

function randomCertificateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `CERT-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export async function certificateEligibility(env: Env, userId: string, courseId: string): Promise<CertificateEligibility> {
  const db = getDb(env);
  const course = (await db.query<any>('SELECT id, title, slug FROM courses WHERE id = $1', [courseId])).rows[0] || null;
  if (!course) {
    return { eligible: false, reason: 'Course not found', course: null, enrollment: null, template: null, lessons: { total: 0, completed: 0 } };
  }

  const enrollment = (await db.query<any>(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  )).rows[0] || null;
  if (!enrollment) {
    return { eligible: false, reason: 'You are not enrolled in this course', course, enrollment: null, template: null, lessons: { total: 0, completed: 0 } };
  }
  if (enrollment.access_type === 'trial' && enrollment.trial_ends_at && new Date(enrollment.trial_ends_at) <= new Date()) {
    return { eligible: false, reason: 'Your free trial has expired. Purchase the course to earn a certificate.', course, enrollment, template: null, lessons: { total: 0, completed: 0 } };
  }

  const total = Number((await db.query<any>('SELECT COUNT(*)::int AS n FROM lessons WHERE course_id = $1', [courseId])).rows[0]?.n) || 0;
  const completed = Number((await db.query<any>(
    `SELECT COUNT(*)::int AS n FROM lesson_progress
     WHERE user_id = $1 AND course_id = $2 AND completed = true`,
    [userId, courseId]
  )).rows[0]?.n) || 0;
  if (total > 0 && completed < total) {
    return { eligible: false, reason: `Complete all ${total} lessons first (${completed}/${total} done).`, course, enrollment, template: null, lessons: { total, completed } };
  }

  const template = (await db.query<any>(
    'SELECT * FROM certificate_templates WHERE course_id = $1 LIMIT 1',
    [courseId]
  )).rows[0] || null;

  if (template?.requires_exam) {
    const passed = (await db.query<any>(
      `SELECT ea.id FROM exam_attempts ea JOIN exams e ON e.id = ea.exam_id
       WHERE ea.user_id = $1 AND e.course_id = $2 AND ea.passed = true LIMIT 1`,
      [userId, courseId]
    )).rows[0];
    if (!passed) {
      return { eligible: false, reason: 'Pass the required exam before a certificate can be issued.', course, enrollment, template, lessons: { total, completed } };
    }
  }

  // Courses with portfolio projects require at least one verified submission.
  const projectCount = Number((await db.query<any>(
    'SELECT COUNT(*)::int AS n FROM course_projects WHERE course_id = $1',
    [courseId]
  )).rows[0]?.n) || 0;
  if (projectCount > 0) {
    const verified = (await db.query<any>(
      `SELECT p.id FROM projects p
       JOIN course_projects cp ON cp.id = p.project_id
       WHERE p.user_id = $1 AND cp.course_id = $2 AND p.repo_verified = 1 LIMIT 1`,
      [userId, courseId]
    )).rows[0];
    if (!verified) {
      return { eligible: false, reason: 'Submit and verify at least one course project before a certificate can be issued.', course, enrollment, template, lessons: { total, completed } };
    }
  }

  return { eligible: true, reason: 'Eligible', course, enrollment, template, lessons: { total, completed } };
}

export async function issueCertificateIfEligible(env: Env, userId: string, courseId: string): Promise<{
  issued: boolean;
  reason: string;
  certificate: any | null;
}> {
  const db = getDb(env);
  const existing = (await db.query<any>(
    'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2 LIMIT 1',
    [userId, courseId]
  )).rows[0];
  if (existing) return { issued: false, reason: 'Certificate already issued', certificate: existing };

  const check = await certificateEligibility(env, userId, courseId);
  if (!check.eligible || !check.course) return { issued: false, reason: check.reason, certificate: null };

  const code = randomCertificateCode();
  const { rows } = await db.query<any>(
    `INSERT INTO certificates (user_id, course_id, certificate_template_id, verification_code)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, courseId, check.template?.id || null, code]
  );

  await db.query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, 'Certificate earned', $2, 'certificate', '/student/certificates')`,
    [userId, `Congratulations! You earned a certificate for "${check.course.title}".`]
  ).catch(() => {});

  return { issued: true, reason: 'Certificate issued', certificate: rows[0] };
}

export function certificatePdf(input: {
  learner: string;
  course: string;
  issuedAt: string;
  code: string;
  orgName?: string;
  orgRc?: string;
  instructor?: string;
}): Uint8Array {
  return buildPdf([
    { text: input.orgName || 'CareerCode Academy', size: 22, bold: true, gap: 0 },
    { text: `${input.orgRc || 'WID LTD · RC 8824091'} · Agbara, Ogun State, Nigeria`, size: 9, gap: 18 },
    { text: 'CERTIFICATE OF COMPLETION', size: 18, bold: true, gap: 38 },
    { text: 'This certifies that', size: 11, gap: 28 },
    { text: input.learner, size: 20, bold: true, gap: 28 },
    { text: 'has successfully completed', size: 11, gap: 22 },
    { text: input.course, size: 16, bold: true, gap: 30 },
    { text: `Issued: ${input.issuedAt}`, size: 10, gap: 22 },
    { text: `Verification code: ${input.code}`, size: 10, gap: 22 },
    { text: '------------------------------------------------------------', size: 10, gap: 28 },
    { text: input.instructor || 'CareerCode Faculty', size: 12, bold: true, gap: 18 },
    { text: 'Authorised signatory', size: 9, gap: 16, color: [0.45, 0.48, 0.55] },
    { text: `Verify at https://careercode.com.ng/verify-certificate?code=${input.code}`, size: 8, gap: 26, color: [0.45, 0.48, 0.55] },
  ], `Certificate ${input.code}`);
}
