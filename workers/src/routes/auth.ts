import { Hono } from 'hono';
import { getDb } from '../db';
import { getCookie } from 'hono/cookie';
import type { Env } from '../env';
import {
  authenticate,
  clearAuthCookies,
  createRefreshToken,
  createUser,
  deleteAllRefreshTokensForUser,
  deleteRefreshToken,
  findRefreshToken,
  generateRefreshToken,
  generateToken,
  getUserByEmail,
  getUserById,
  hashPassword,
  sendVerificationEmail,
  setAuthCookies,
  verificationCode,
  verifyPassword,
  verifyRefreshToken,
} from '../auth-helpers';

const auth = new Hono<{ Bindings: Env }>();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function err(c: any, status: number, message: string, extra?: Record<string, any>) {
  return c.json({ success: false, message, ...extra }, status as any);
}

// POST /api/v1/auth/register
auth.post('/register', async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return err(c, 400, 'Invalid JSON body');
  }
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = body.role === 'student' || !body.role ? 'student' : body.role;
  if (name.length < 1 || name.length > 100) return err(c, 400, 'Validation failed', { errors: { name: ['Name is required'] } });
  if (!EMAIL_RE.test(email)) return err(c, 400, 'Validation failed', { errors: { email: ['Invalid email address'] } });
  if (password.length < 6 || password.length > 100) return err(c, 400, 'Validation failed', { errors: { password: ['Password must be at least 6 characters'] } });
  if (role !== 'student') return err(c, 400, 'Validation failed', { errors: { role: ['Invalid role'] } });

  try {
    const existing = await getUserByEmail(c.env, email);
    if (existing) return err(c, 409, 'Email already registered');

    const hashed = await hashPassword(c.env, password);
    const code = verificationCode();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await createUser(c.env, {
      name, email, password: hashed, role,
      verification_token: code, verification_token_expires: expires,
    });

    await sendVerificationEmail(c.env, email, code);

    const payload = { userId: (user as any).id, role: (user as any).role };
    const token = await generateToken(c.env, payload);
    const refreshToken = await generateRefreshToken(c.env, payload);
    await createRefreshToken(c.env, (user as any).id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setAuthCookies(c, token, refreshToken);

    return c.json({
      success: true,
      message: 'Account created. Please verify your email.',
      data: { userId: (user as any).id, name: (user as any).name, email: (user as any).email, role: (user as any).role, token, refreshToken },
    }, 201 as any);
  } catch (e: any) {
    if (e?.code === '23505' || /duplicate|unique/i.test(e?.message || '')) {
      return err(c, 409, 'Email already registered');
    }
    throw e;
  }
});

// POST /api/v1/auth/login
auth.post('/login', async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return err(c, 400, 'Invalid JSON body');
  }
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!EMAIL_RE.test(email)) return err(c, 400, 'Validation failed', { errors: { email: ['Invalid email address'] } });
  if (!password) return err(c, 400, 'Validation failed', { errors: { password: ['Password is required'] } });

  const user = await getUserByEmail(c.env, email);
  if (!user || !(user as any).password) {
    return err(c, 401, 'Invalid email or password');
  }
  const ok = await verifyPassword(c.env, password, (user as any).password);
  if (!ok) return err(c, 401, 'Invalid email or password');
  if (!(user as any).is_verified) return err(c, 401, 'Please verify your email address.');
  if ((user as any).is_suspended) return err(c, 403, 'Your account has been suspended. Please contact support.');

  await getDb(c.env).query('UPDATE users SET last_login = NOW() WHERE id = $1', [(user as any).id]);

  const payload = { userId: (user as any).id, role: (user as any).role };
  const token = await generateToken(c.env, payload);
  const refreshToken = await generateRefreshToken(c.env, payload);
  await createRefreshToken(c.env, (user as any).id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  setAuthCookies(c, token, refreshToken);

  return c.json({
    success: true,
    data: {
      userId: (user as any).id,
      name: (user as any).name,
      email: (user as any).email,
      role: (user as any).role,
      avatar: (user as any).avatar,
      isVerified: (user as any).is_verified,
      allowed_dashboards: (user as any).allowed_dashboards ?? null,
      allowedDashboards: (user as any).allowed_dashboards ?? null,
      token,
      refreshToken,
    },
  });
});

// GET /api/v1/auth/me
auth.get('/me', async (c) => {
  try {
    const session = await authenticate(c);
    const user = await getUserById(c.env, session.userId);
    if (!user) return err(c, 404, 'User not found');
    return c.json({ success: true, data: user });
  } catch (e: any) {
    return err(c, e?.statusCode || 401, e?.message || 'Not authenticated');
  }
});

// POST /api/v1/auth/refresh-token
auth.post('/refresh-token', async (c) => {
  let body: any = {};
  try {
    body = await c.req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const refreshToken = body.refreshToken || getCookie(c, 'refreshToken');
  if (!refreshToken) return err(c, 401, 'Refresh token is required');
  let decoded: { userId: string; role: any };
  try {
    decoded = await verifyRefreshToken(c.env, refreshToken);
  } catch {
    return err(c, 401, 'Invalid or expired refresh token');
  }
  try {
    const dbToken = await findRefreshToken(c.env, refreshToken);
    if (!dbToken) return err(c, 401, 'Invalid or revoked refresh token');
    const user = await getUserById(c.env, decoded.userId);
    if (!user) return err(c, 401, 'User not found');
    if ((user as any).is_suspended) {
      await deleteAllRefreshTokensForUser(c.env, (user as any).id);
      return err(c, 403, 'Your account has been suspended. Please contact support.');
    }
    const payload = { userId: (user as any).id, role: (user as any).role };
    const newToken = await generateToken(c.env, payload);
    const newRefreshToken = await generateRefreshToken(c.env, payload);
    await deleteRefreshToken(c.env, refreshToken);
    await createRefreshToken(c.env, (user as any).id, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setAuthCookies(c, newToken, newRefreshToken);
    return c.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
  } catch (e: any) {
    if (e?.code === '23505') {
      try {
        const d2 = await verifyRefreshToken(c.env, body.refreshToken || getCookie(c, 'refreshToken') || '');
        await deleteAllRefreshTokensForUser(c.env, d2.userId);
      } catch { /* ignore */ }
      return err(c, 401, 'Refresh token already used — please re-authenticate');
    }
    throw e;
  }
});

// POST /api/v1/auth/logout
auth.post('/logout', async (c) => {
  let body: any = {};
  try {
    body = await c.req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const refreshToken = body.refreshToken || getCookie(c, 'refreshToken');
  if (refreshToken) {
    try {
      await deleteRefreshToken(c.env, refreshToken);
    } catch { /* ignore */ }
  }
  clearAuthCookies(c);
  return c.json({ success: true, message: 'Logged out successfully' });
});

export default auth;
