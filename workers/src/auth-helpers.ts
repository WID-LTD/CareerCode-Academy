import { sign, verify } from 'hono/jwt';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { Env } from './env';
import { getDb } from './db';

export interface TokenPayload {
  userId: string;
  role: 'student' | 'instructor' | 'admin' | 'super_admin';
}

function parseDuration(value: string | undefined, fallbackSec: number): number {
  if (!value) return fallbackSec;
  const m = /^(\d+)([smhd])$/.exec(value.trim());
  if (!m) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallbackSec;
  }
  const mult = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return Number(m[1]) * mult[m[2] as 's' | 'm' | 'h' | 'd'];
}

export async function generateToken(env: Env, payload: TokenPayload): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + parseDuration(env.JWT_EXPIRES_IN, 900);
  return sign({ ...payload, exp }, env.JWT_SECRET);
}

export async function generateRefreshToken(env: Env, payload: TokenPayload): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + parseDuration(env.JWT_REFRESH_EXPIRES_IN, 604800);
  return sign({ ...payload, exp }, env.JWT_REFRESH_SECRET);
}

export async function verifyToken(env: Env, token: string): Promise<TokenPayload> {
  const decoded = (await verify(token, env.JWT_SECRET, 'HS256')) as unknown as TokenPayload & { exp?: number };
  if (!decoded?.userId || !decoded?.role) throw new Error('Invalid token payload');
  return { userId: decoded.userId, role: decoded.role };
}

export async function verifyRefreshToken(env: Env, token: string): Promise<TokenPayload> {
  const decoded = (await verify(token, env.JWT_REFRESH_SECRET, 'HS256')) as unknown as TokenPayload & { exp?: number };
  if (!decoded?.userId || !decoded?.role) throw new Error('Invalid token payload');
  return { userId: decoded.userId, role: decoded.role };
}

export function isJwtError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  const name = (err?.name || '').toLowerCase();
  return (
    msg.includes('invalid') || msg.includes('expired') || msg.includes('jwt') ||
    name.includes('jwt') || name.includes('token')
  );
}

function crossSite(env: Env): boolean {
  return (env.FRONTEND_URL || '').startsWith('https://');
}

export function setAuthCookies(c: Context<{ Bindings: Env }>, token: string, refreshToken: string): void {
  const secure = crossSite(c.env);
  const sameSite = (secure ? 'None' : 'Lax') as 'None' | 'Lax';
  setCookie(c, 'token', token, {
    httpOnly: true, secure, sameSite, path: '/', maxAge: 15 * 60,
  });
  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true, secure, sameSite, path: '/api/v1/auth', maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearAuthCookies(c: Context<{ Bindings: Env }>): void {
  deleteCookie(c, 'token', { path: '/' });
  deleteCookie(c, 'refreshToken', { path: '/api/v1/auth' });
}

// ── Durable-Object bcrypt ( CPU-heavy work must not run in the request path ) ──
async function callAuthDO(env: Env, body: Record<string, any>): Promise<any> {
  const ns = (env as any).AUTH_DO;
  if (!ns) throw new Error('AUTH_DO binding is not configured');
  const stub = ns.get(ns.idFromName('auth-v1'));
  const resp = await stub.fetch('https://do/crypto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success) throw new Error(data.message || 'Crypto service failed');
  return data;
}

export async function hashPassword(env: Env, password: string): Promise<string> {
  const data = await callAuthDO(env, { action: 'hash', password });
  return data.hash;
}

export async function verifyPassword(env: Env, password: string, hash: string): Promise<boolean> {
  const data = await callAuthDO(env, { action: 'verify', password, hash });
  return !!data.ok;
}

// ── Models (same SQL as backend, via Neon driver) ──
export interface DbUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: TokenPayload['role'];
  avatar?: string | null;
  bio?: string | null;
  is_verified?: boolean;
  is_suspended?: boolean;
  allowed_dashboards?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

const PUBLIC_USER_COLS =
  'id, name, email, role, avatar, bio, headline, location, website, github, twitter, linkedin, expertise, is_verified, is_suspended, allowed_dashboards, created_at, updated_at';

export async function getUserByEmail(env: Env, email: string): Promise<DbUser | null> {
  const { rows } = await getDb(env).query<DbUser>('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

export async function getUserById(env: Env, id: string): Promise<DbUser | null> {
  const { rows } = await getDb(env).query<DbUser>(
    `SELECT ${PUBLIC_USER_COLS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser(env: Env, input: {
  name: string; email: string; password: string; role?: string;
  verification_token?: string | null; verification_token_expires?: Date | null; is_verified?: boolean;
}): Promise<DbUser> {
  const { rows } = await getDb(env).query<DbUser>(
    `INSERT INTO users (name, email, password, role, verification_token, verification_token_expires, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.name, input.email, input.password, input.role || 'student', input.verification_token || null, input.verification_token_expires || null, input.is_verified ?? false]
  );
  return rows[0];
}

export async function createRefreshToken(env: Env, userId: string, token: string, expiresAt: Date): Promise<void> {
  await getDb(env).query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
}

export async function findRefreshToken(env: Env, token: string): Promise<any | null> {
  const { rows } = await getDb(env).query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  return rows[0] || null;
}

export async function deleteRefreshToken(env: Env, token: string): Promise<void> {
  await getDb(env).query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}

export async function deleteAllRefreshTokensForUser(env: Env, userId: string): Promise<void> {
  await getDb(env).query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

// ── authenticate (mirrors backend middleware/auth.ts) ──
export async function authenticate(c: Context<{ Bindings: Env }>): Promise<TokenPayload> {
  const authHeader = c.req.header('authorization');
  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];
  if (!token) token = getCookie(c, 'token');
  if (!token) {
    throw Object.assign(new Error('No token provided'), { statusCode: 401 });
  }
  let decoded: TokenPayload;
  try {
    decoded = await verifyToken(c.env, token);
  } catch {
    throw Object.assign(new Error('Invalid or expired token'), { statusCode: 401 });
  }
  const user = await getUserById(c.env, decoded.userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 401 });
  if ((user as any).is_suspended) {
    throw Object.assign(new Error('Your account has been suspended. Please contact support.'), { statusCode: 403 });
  }
  if (!(user as any).is_verified) {
    throw Object.assign(new Error('Please verify your email address.'), { statusCode: 401 });
  }
  return { userId: (user as any).id, role: (user as any).role };
}

export function verificationCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

export async function sendVerificationEmail(env: Env, email: string, code: string): Promise<void> {
  if (!env.BREVO_API_KEY) return;
  const frontend = env.FRONTEND_URL || 'https://careercode.com.ng';
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL || 'johndavidnzubechukwu008@gmail.com', name: env.BREVO_SENDER_NAME || 'CareerCode Academy' },
        to: [{ email }],
        subject: `Your verification code: ${code} - CareerCode Academy`,
        htmlContent: `<p>Welcome to CareerCode Academy! Your verification code is <strong>${code}</strong>.</p><p>Or verify instantly: <a href="${frontend}/verify-email/${code}">${frontend}/verify-email/${code}</a></p><p>This code expires in 24 hours.</p>`,
      }),
    });
  } catch { /* email failures must not break registration */ }
}
