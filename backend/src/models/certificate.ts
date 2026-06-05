import { query } from '../config/db';

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_url: string | null;
  verification_code: string;
  issued_at: Date;
}

export interface CreateCertificateInput {
  user_id: string;
  course_id: string;
  certificate_url?: string;
  verification_code: string;
}

export async function createCertificate(input: CreateCertificateInput): Promise<Certificate> {
  const { rows } = await query<Certificate>(
    `INSERT INTO certificates (user_id, course_id, certificate_url, verification_code)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.user_id, input.course_id, input.certificate_url || null, input.verification_code]
  );
  return rows[0];
}

export async function getCertificatesByUser(userId: string): Promise<Certificate[]> {
  const { rows } = await query<Certificate>(
    `SELECT cert.*, c.title as course_title, c.category, u.name as user_name
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     JOIN users u ON cert.user_id = u.id
     WHERE cert.user_id = $1
     ORDER BY cert.issued_at DESC`,
    [userId]
  );
  return rows;
}

export async function getCertificateByVerificationCode(code: string): Promise<Certificate | null> {
  const { rows } = await query<Certificate>(
    `SELECT cert.*, c.title as course_title, c.category, u.name as user_name, u.email as user_email
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     JOIN users u ON cert.user_id = u.id
     WHERE cert.verification_code = $1`,
    [code]
  );
  return rows[0] || null;
}

export async function getCertificateByUserAndCourse(userId: string, courseId: string): Promise<Certificate | null> {
  const { rows } = await query<Certificate>(
    'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows[0] || null;
}

export async function getCertificateById(id: string): Promise<Certificate | null> {
  const { rows } = await query<Certificate>('SELECT * FROM certificates WHERE id = $1', [id]);
  return rows[0] || null;
}
