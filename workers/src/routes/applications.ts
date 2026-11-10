import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, statusOf } from '../route-utils';
import { parseBody, field, storeOrLink } from '../uploads';
import { mail } from '../email';
import { verifyTurnstile } from '../turnstile';

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
  if (typeof file === 'string' && /^https?:\/\//i.test(file)) return file;

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
    const { fields, file } = await parseBody(c);

    const captcha = await verifyTurnstile(c.env, field(fields, 'turnstileToken', 'cf-turnstile-response'), c.req.header('cf-connecting-ip'));
    if (!captcha.ok) return fail(c, 400, captcha.error || 'Captcha verification failed');

    const fullName = field(fields, 'fullName', 'full_name', 'name');
    const email = String(field(fields, 'email') || '').trim().toLowerCase();
    if (!fullName) return fail(c, 400, 'Validation failed', { errors: { fullName: ['Full name is required'] } });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(c, 400, 'Validation failed', { errors: { email: ['A valid email is required'] } });
    }

    // The form sends files as `resume` / `profileImage`; parseBody keeps the
    // first File, so read them from the multipart form explicitly.
    const contentType = c.req.header('content-type') || '';
    let resumeFile: File | null = contentType.includes('multipart/form-data') ? null : file;
    let profileFile: File | null = null;
    if (contentType.includes('multipart/form-data')) {
      // parseBody already consumed the body; re-read from fields when present.
      const r = fields.resume;
      const p = fields.profileImage ?? fields.profile_image;
      if (r && typeof r !== 'string') resumeFile = r as unknown as File;
      if (p && typeof p !== 'string') profileFile = p as unknown as File;
    }

    const resumeUrl = await storeOrLink(
      c.env,
      resumeFile,
      typeof fields.resumeUrl === 'string' ? fields.resumeUrl : null,
      'resumes'
    );
    const profileImageUrl = await storeOrLink(
      c.env,
      profileFile,
      typeof fields.profileImageUrl === 'string' ? fields.profileImageUrl : null,
      'profiles'
    );

    const interested = fields.interestedCourses ?? fields.interested_courses;
    const interestedCourses = Array.isArray(interested) ? interested.join(', ') : interested ?? null;

    const { rows } = await getDb(c.env).query<any>(
      `INSERT INTO instructor_applications (
        full_name, email, phone, country, state, professional_title, years_experience,
        specialization, github_url, linkedin_url, portfolio_url, resume_url, profile_image_url,
        bio, teaching_experience, interested_courses, availability, motivation
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING id`,
      [
        String(fullName),
        email,
        field(fields, 'phone') ?? null,
        field(fields, 'country') ?? null,
        field(fields, 'state') ?? null,
        field(fields, 'professionalTitle', 'professional_title') ?? null,
        field(fields, 'yearsExperience', 'years_experience') ?? null,
        field(fields, 'specialization') ?? null,
        field(fields, 'githubUrl', 'github_url') ?? null,
        field(fields, 'linkedinUrl', 'linkedin_url') ?? null,
        field(fields, 'portfolioUrl', 'portfolio_url') ?? null,
        resumeUrl,
        profileImageUrl,
        field(fields, 'bio') ?? null,
        field(fields, 'teachingExperience', 'teaching_experience') ?? null,
        interestedCourses,
        field(fields, 'availability') ?? null,
        field(fields, 'motivation') ?? null,
      ]
    );

    c.executionCtx.waitUntil(mail.applicationReceived(c.env, email, String(fullName)).catch(() => {}));

    return c.json(
      { success: true, message: 'Application submitted successfully', data: rows[0] },
      201 as any
    );
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit application');
  }
});

export default applications;
