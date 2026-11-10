import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';

// Ported from backend/src/routes/video.routes.ts.
// Multer/multipart is replaced by a JSON base64 body; the file is written to
// R2 when the binding exists, otherwise the upload endpoint returns 501.

const videos = new Hono<{ Bindings: Env }>();

const UPLOAD_ROLES = ['instructor', 'admin', 'super_admin'];

interface UploadFile {
  filename: string;
  contentType: string;
  data: string;
}

function readFile(body: any): UploadFile | null {
  const file = body?.file ?? body;
  const data = file?.data ?? file?.base64 ?? file?.fileData ?? body?.data ?? body?.base64;
  if (!data) return null;
  return {
    filename: String(file?.filename ?? file?.fileName ?? file?.name ?? body?.filename ?? `video-${Date.now()}`),
    contentType: String(file?.contentType ?? file?.mimeType ?? file?.type ?? body?.contentType ?? 'video/mp4'),
    data: String(data),
  };
}

function base64Bytes(data: string): Uint8Array {
  const clean = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'video';
}

function publicUrl(env: Env, key: string): string {
  const base = (env as any).R2_PUBLIC_URL || (env as any).R2_PUBLIC_DOMAIN || (env as any).PUBLIC_R2_URL;
  return base ? `${String(base).replace(/\/$/, '')}/${key}` : `/uploads/${key}`;
}

async function putToR2(env: Env, folder: string, file: UploadFile): Promise<{ url: string; filename: string } | null> {
  const r2 = (env as any).R2 as R2Bucket | undefined;
  if (!r2) return null;
  const filename = safeName(file.filename);
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
  await r2.put(key, base64Bytes(file.data), { httpMetadata: { contentType: file.contentType } });
  return { url: publicUrl(env, key), filename };
}

async function deleteStoredVideo(env: Env, url: string | null): Promise<void> {
  if (!url) return;
  const r2 = (env as any).R2 as R2Bucket | undefined;
  if (!r2) return;
  const base = (env as any).R2_PUBLIC_URL || (env as any).R2_PUBLIC_DOMAIN || (env as any).PUBLIC_R2_URL;
  let key: string | null = null;
  if (base && url.startsWith(String(base))) key = url.slice(String(base).length).replace(/^\/+/, '');
  else if (url.startsWith('/uploads/')) key = url.slice('/uploads/'.length);
  else if (!url.includes('://')) key = url;
  if (!key) return;
  try {
    await r2.delete(key);
  } catch {
    /* best-effort, mirrors the Express deleteFile try/catch */
  }
}

// POST /api/v1/videos/upload/:lessonId — upload/replace a lesson video
videos.post('/upload/:lessonId', async (c) => {
  try {
    const s = await requireRole(c, UPLOAD_ROLES);
    const lessonId = c.req.param('lessonId');
    const db = getDb(c.env);

    const lessonRes = await db.query<any>(
      `SELECT l.*, c.instructor_id
       FROM lessons l JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    if (!lessonRes.rows.length) return fail(c, 404, 'Lesson not found');
    // Same ownership rule as the Express route.
    if (s.role !== 'admin' && lessonRes.rows[0].instructor_id !== s.userId) {
      return fail(c, 403, 'You can only upload videos to your own lessons');
    }

    const body: any = await c.req.json().catch(() => ({}));
    const file = readFile(body);
    if (!file) return fail(c, 400, 'No video file provided');

    const stored = await putToR2(c.env, 'videos', file);
    if (!stored) {
      return fail(
        c,
        501,
        'Video uploads are not configured on this deployment (R2 binding missing). Bind env.R2 or host the video externally and set video_url through the lesson editor.'
      );
    }

    await db.query(
      `UPDATE lessons SET video_url = $1, video_thumbnail = NULL WHERE id = $2`,
      [stored.url, lessonId]
    );

    return c.json({
      success: true,
      data: {
        video_url: stored.url,
        streaming_url: null,
        thumbnail: null,
        filename: stored.filename,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to upload video');
  }
});

// GET /api/v1/videos/stream/:lessonId — video info for a lesson
videos.get('/stream/:lessonId', async (c) => {
  try {
    await requireAuth(c);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT id, video_url, video_thumbnail FROM lessons WHERE id = $1',
      [c.req.param('lessonId')]
    );
    if (!rows.length) return fail(c, 404, 'Lesson not found');
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load video');
  }
});

// DELETE /api/v1/videos/:lessonId — remove a lesson video
videos.delete('/:lessonId', async (c) => {
  try {
    const s = await requireRole(c, UPLOAD_ROLES);
    const lessonId = c.req.param('lessonId');
    const db = getDb(c.env);

    const lessonRes = await db.query<any>(
      `SELECT l.*, c.instructor_id
       FROM lessons l JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    if (!lessonRes.rows.length) return fail(c, 404, 'Lesson not found');
    if (s.role !== 'admin' && lessonRes.rows[0].instructor_id !== s.userId) {
      return fail(c, 403, 'Unauthorized');
    }

    await deleteStoredVideo(c.env, lessonRes.rows[0].video_url);
    await db.query(
      'UPDATE lessons SET video_url = NULL, video_thumbnail = NULL WHERE id = $1',
      [lessonId]
    );

    return c.json({ success: true, message: 'Video removed' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to remove video');
  }
});

export default videos;
