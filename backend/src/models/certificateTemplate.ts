import { query } from '../config/db';

export interface CertificateTemplate {
  id: string;
  name: string;
  course_id: string;
  layout_style: string;
  stamp_url: string | null;
  signature_url: string | null;
  logo_url: string | null;
  show_stamp: boolean;
  show_signature: boolean;
  instructor_name: string;
  org_name: string;
  org_rc: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCertificateTemplateInput {
  name: string;
  course_id: string;
  layout_style?: string;
  stamp_url?: string;
  signature_url?: string;
  logo_url?: string;
  show_stamp?: boolean;
  show_signature?: boolean;
  instructor_name?: string;
  org_name?: string;
  org_rc?: string;
}

export async function createTemplate(input: CreateCertificateTemplateInput): Promise<CertificateTemplate> {
  const { rows } = await query<CertificateTemplate>(
    `INSERT INTO certificate_templates (name, course_id, layout_style, stamp_url, signature_url, logo_url, show_stamp, show_signature, instructor_name, org_name, org_rc)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.name, input.course_id, input.layout_style || 'professional',
      input.stamp_url || null, input.signature_url || null, input.logo_url || null,
      input.show_stamp ?? true, input.show_signature ?? true,
      input.instructor_name || 'Udokamma Emmanuel',
      input.org_name || 'Career Code WID Ltd', input.org_rc || 'RC 8824091',
    ]
  );
  return rows[0];
}

export async function getAllTemplates(): Promise<any[]> {
  const { rows } = await query(
    `SELECT ct.*, c.title as course_title
     FROM certificate_templates ct
     JOIN courses c ON ct.course_id = c.id
     ORDER BY ct.created_at DESC`
  );
  return rows;
}

export async function getTemplateById(id: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT ct.*, c.title as course_title
     FROM certificate_templates ct
     JOIN courses c ON ct.course_id = c.id
     WHERE ct.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getTemplateByCourseId(courseId: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT * FROM certificate_templates WHERE course_id = $1`,
    [courseId]
  );
  return rows[0] || null;
}

export async function updateTemplate(id: string, input: Partial<CreateCertificateTemplateInput>): Promise<CertificateTemplate | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(input)) {
    const column = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${column} = $${paramIndex}`);
    values.push(value !== undefined ? value : null);
    paramIndex++;
  }

  if (fields.length === 0) return getTemplateById(id) as Promise<CertificateTemplate | null>;

  values.push(id);
  const { rows } = await query<CertificateTemplate>(
    `UPDATE certificate_templates SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM certificate_templates WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}
