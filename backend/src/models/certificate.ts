import { query } from '../config/db';

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_url: string | null;
  verification_code: string;
  certificate_template_id: string | null;
  issued_at: Date;
}

export interface CreateCertificateInput {
  user_id: string;
  course_id: string;
  certificate_url?: string;
  verification_code: string;
  certificate_template_id?: string | null;
}

export async function createCertificate(input: CreateCertificateInput): Promise<Certificate> {
  const { rows } = await query<Certificate>(
    `INSERT INTO certificates (user_id, course_id, certificate_url, verification_code, certificate_template_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.user_id, input.course_id, input.certificate_url || null, input.verification_code, input.certificate_template_id || null]
  );
  return rows[0];
}

export async function getCertificatesByUser(userId: string, limit?: number, offset?: number): Promise<Certificate[]> {
  let sql = `SELECT cert.*, c.title as course_title, c.category, u.name as user_name
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     JOIN users u ON cert.user_id = u.id
     WHERE cert.user_id = $1
     ORDER BY cert.issued_at DESC`;
  const params: any[] = [userId];
  if (limit !== undefined && offset !== undefined) {
    sql += ` LIMIT $2 OFFSET $3`;
    params.push(limit, offset);
  }
  const { rows } = await query<Certificate>(sql, params);
  return rows;
}

export async function countCertificatesByUser(userId: string): Promise<number> {
  const { rows } = await query(
    'SELECT COUNT(*)::int as total FROM certificates WHERE user_id = $1',
    [userId]
  );
  return rows[0]?.total || 0;
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

export async function getAllCertificates(limit = 50, offset = 0): Promise<any[]> {
  const { rows } = await query(
    `SELECT cert.*, u.name as user_name, u.email as user_email, c.title as course_title
     FROM certificates cert
     JOIN users u ON cert.user_id = u.id
     JOIN courses c ON cert.course_id = c.id
     ORDER BY cert.issued_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function countCertificates(): Promise<number> {
  const { rows } = await query('SELECT COUNT(*) FROM certificates');
  return parseInt(rows[0].count, 10);
}

export async function revokeCertificateById(id: string): Promise<any> {
  const { rows } = await query(
    `UPDATE certificates SET revoked = true, revoked_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

export async function reissueCertificateById(id: string): Promise<any> {
  const { rows } = await query(
    `UPDATE certificates SET revoked = false, revoked_at = NULL, issued_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}
