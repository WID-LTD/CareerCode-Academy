import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, statusOf } from '../route-utils';

// Ported from backend/src/routes/application.routes.ts.
// Multer/multipart is intentionally not implemented: send JSON. Optional
// `resume` / `profileImage` base64 payloads are stored in R2 when bound;
// otherwise the URL fields stay null so the application still submits.

const applications = new Hono<{ Bindings: Env }>();

function base64Bytes(data: string): Uint8Array {
  const clean = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'file';
}

function publicUrl(env: Env, key: string): string {
  const base = (env as any).R2_PUBLIC_URL || (env as any).R2_PUBLIC_DOMAIN || (env as any).PUBLIC_R2_URL;
  return base ? `${String(base).replace(/\/$/, '')}/${key}` : `/uploads/${key}`;
}

/** Accept either an already-hosted URL or a base64 payload ({data|base64, name, type}). */
async function resolveUpload(env: Env, providedUrl: any, file: any, folder: string): Promise<string | null> {
  if (typeof providedUrl === 'string' && providedUrl) return providedUrl;
  if (!file) return null;

  const data = typeof file === 'string' ? file : file.data || file.base64 || file.fileData;
  if (!data) return null;

  const r2 = (env as any).R2 as R2Bucket | undefined;
  if (!r2) return null; // no object storage — keep the application submittable

  const filename = safeName(file.name || file.filename || file.fileName || 'file');
  const contentType = file.type || file.contentType || file.mimeType || 'application/octet-stream';
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
  await r2.put(key, base64Bytes(String(data)), { httpMetadata: { contentType } });
  return publicUrl(env, key);
}

// POST /api/v1/applications/instructor — public instructor application
applications.post('/instructor', async (c) => {
  try {
    const body: any = await c.req.json().catch(() => ({}));

    const resumeUrl = await resolveUpload(c.env, body.resumeUrl ?? body.resume_url, body.resume, 'resumes');
    const profileImageUrl = await resolveUpload(
      c.env,
      body.profileImageUrl ?? body.profile_image_url,
      body.profileImage ?? body.profile_image,
      'profiles'
    );

    const interestedCourses = Array.isArray(body.interestedCourses)
      ? body.interestedCourses.join(', ')
      : body.interestedCourses ?? null;

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO instructor_applications (
        full_name, email, phone, country, state, professional_title, years_experience,
        specialization, github_url, linkedin_url, portfolio_url, resume_url, profile_image_url,
        bio, teaching_experience, interested_courses, availability, motivation
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING id`,
      [
        body.fullName ?? body.full_name ?? null,
        body.email ?? null,
        body.phone ?? null,
        body.country ?? null,
        body.state ?? null,
        body.professionalTitle ?? body.professional_title ?? null,
        body.yearsExperience ?? body.years_experience ?? null,
        body.specialization ?? null,
        body.githubUrl ?? body.github_url ?? null,
        body.linkedinUrl ?? body.linkedin_url ?? null,
        body.portfolioUrl ?? body.portfolio_url ?? null,
        resumeUrl,
        profileImageUrl,
        body.bio ?? null,
        body.teachingExperience ?? body.teaching_experience ?? null,
        interestedCourses,
        body.availability ?? null,
        body.motivation ?? null,
      ]
    );

    return c.json(
      { success: true, message: 'Application submitted successfully', data: rows[0] },
      201 as any
    );
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit application');
  }
});

export default applications;
