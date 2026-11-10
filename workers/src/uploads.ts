import type { Context } from 'hono';
import type { Env } from './env';

// Shared upload parsing for every endpoint the UI calls.
// Accepts:
//   - multipart/form-data (any file field)
//   - application/json  { data|base64, filename, contentType }
//   - application/json  { url }  (external URL, validated)
// The Express app used multer; the UI still sends multipart, so this is the
// compatibility layer.

export interface ParsedBody {
  fields: Record<string, any>;
  file: File | null;
  url: string | null;
}

const MAX_UPLOAD_BYTES = 95 * 1024 * 1024; // Workers request body cap is 100 MB

function bytesFromBase64(data: string): Uint8Array {
  const clean = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function parseBody(c: Context<{ Bindings: Env }>): Promise<ParsedBody> {
  const type = c.req.header('content-type') || '';
  const fields: Record<string, any> = {};
  let file: File | null = null;
  let url: string | null = null;

  if (type.includes('multipart/form-data')) {
    const form = await c.req.formData().catch(() => null);
    if (form) {
      for (const [key, value] of form.entries()) {
        if (typeof value !== 'string' && (value as any) instanceof File) {
          const f = value as unknown as File;
          if (!file || f.size > 0) file = f;
          fields[key] = value;
        } else {
          fields[key] = value;
        }
      }
    }
    return { fields, file, url };
  }

  const body: any = await c.req.json().catch(() => ({}));
  for (const [k, v] of Object.entries(body || {})) fields[k] = v;

  const candidate = body?.file ?? body;
  const data = candidate?.data ?? candidate?.base64 ?? candidate?.fileData ?? body?.data ?? body?.base64;
  if (typeof data === 'string' && data.length > 0) {
    const name = String(candidate?.filename ?? candidate?.fileName ?? candidate?.name ?? body?.filename ?? 'upload');
    const mime = String(candidate?.contentType ?? candidate?.mimeType ?? candidate?.type ?? body?.contentType ?? 'application/octet-stream');
    if (bytesFromBase64(data).byteLength > MAX_UPLOAD_BYTES) {
      throw Object.assign(new Error('File is too large'), { statusCode: 413 });
    }
    file = new File([bytesFromBase64(data)], name, { type: mime });
  } else if (typeof body?.url === 'string') {
    url = body.url;
  }

  return { fields, file, url };
}

export function validExternalUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function publicUrl(env: Env, key: string): string {
  const base = env.R2_PUBLIC_URL || (env as any).R2_PUBLIC_DOMAIN || (env as any).PUBLIC_R2_URL;
  return base ? `${String(base).replace(/\/$/, '')}/${key}` : `/uploads/${key}`;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'file';
}

export async function storeFile(env: Env, file: File, folder: string): Promise<string> {
  if (!env.R2) throw Object.assign(new Error('Object storage (R2) is not configured'), { statusCode: 503 });
  if (file.size > MAX_UPLOAD_BYTES) throw Object.assign(new Error('File is too large'), { statusCode: 413 });
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name)}`;
  await env.R2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  return publicUrl(env, key);
}

/** URL if provided (validated), else upload the file, else null. */
export async function storeOrLink(env: Env, file: File | null, url: string | null, folder: string): Promise<string | null> {
  if (url) {
    if (!validExternalUrl(url)) throw Object.assign(new Error('Invalid URL'), { statusCode: 400 });
    return url;
  }
  if (!file) return null;
  return storeFile(env, file, folder);
}

export function field(fields: Record<string, any>, ...names: string[]): any {
  for (const n of names) {
    const v = fields[n];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}
