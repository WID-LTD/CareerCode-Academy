import { Hono } from 'hono';
import type { Env } from '../env';
import { fail, requireRole, statusOf } from '../route-utils';

// Ported from backend/src/routes/upload.routes.ts.
// Multipart/multer is intentionally not implemented. Send JSON:
//   { filename, contentType, data }  (data = base64 or data URL)
// The object is stored in R2 when the binding exists; otherwise 501.

const upload = new Hono<{ Bindings: Env }>();

const UPLOAD_ROLES = ['instructor', 'admin', 'super_admin', 'student'];

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

function readFile(body: any): { filename: string; contentType: string; data: string } | null {
  const file = body?.file ?? body;
  const data = file?.data ?? file?.base64 ?? file?.fileData ?? body?.data ?? body?.base64;
  if (!data) return null;
  return {
    filename: String(file?.filename ?? file?.fileName ?? file?.name ?? body?.filename ?? `upload-${Date.now()}`),
    contentType: String(file?.contentType ?? file?.mimeType ?? file?.type ?? body?.contentType ?? 'application/octet-stream'),
    data: String(data),
  };
}

// POST /api/v1/upload — generic file upload returning a public URL
upload.post('/', async (c) => {
  try {
    await requireRole(c, UPLOAD_ROLES);

    const body: any = await c.req.json().catch(() => ({}));
    const file = readFile(body);
    if (!file) return fail(c, 400, 'No file uploaded');

    const r2 = (c.env as any).R2 as R2Bucket | undefined;
    if (!r2) {
      return fail(
        c,
        501,
        'File uploads are not configured on this deployment (R2 binding missing). Bind env.R2, or host the file externally and submit its URL instead.'
      );
    }

    const filename = safeName(file.filename);
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${filename}`;
    await r2.put(key, base64Bytes(file.data), { httpMetadata: { contentType: file.contentType } });
    const url = publicUrl(c.env, key);

    return c.json({ success: true, data: { url, path: url } }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to upload file');
  }
});

export default upload;
