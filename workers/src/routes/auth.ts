import { Hono } from 'hono';
import { getDb } from '../db';
import { verifyTurnstile } from '../turnstile';
import { isEnabled } from '../feature-flags';
import { backupCodes, generateSecret, otpauthUrl, sha256Hex as totpHash, verifyTotp } from '../totp';
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
  randomToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  setAuthCookies,
  sha256Hex,
  signOAuthExchange,
  signOAuthState,
  verifyOAuthExchange,
  verifyOAuthState,
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
  if (!(await isEnabled(c.env, 'registration_enabled'))) return err(c, 403, 'Registration is currently closed');
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = body.role === 'student' || !body.role ? 'student' : body.role;
  if (name.length < 1 || name.length > 100) return err(c, 400, 'Validation failed', { errors: { name: ['Name is required'] } });
  if (!EMAIL_RE.test(email)) return err(c, 400, 'Validation failed', { errors: { email: ['Invalid email address'] } });
  if (password.length < 6 || password.length > 100) return err(c, 400, 'Validation failed', { errors: { password: ['Password must be at least 6 characters'] } });
  if (role !== 'student') return err(c, 400, 'Validation failed', { errors: { role: ['Invalid role'] } });

  const captcha = await verifyTurnstile(c.env, body.turnstileToken, c.req.header('cf-connecting-ip'));
  if (!captcha.ok) return err(c, 400, captcha.error || 'Captcha verification failed');

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

  const captcha = await verifyTurnstile(c.env, body.turnstileToken, c.req.header('cf-connecting-ip'));
  if (!captcha.ok) return err(c, 400, captcha.error || 'Captcha verification failed');

  const user = await getUserByEmail(c.env, email);
  if (!user || !(user as any).password) {
    return err(c, 401, 'Invalid email or password');
  }
  if ((user as any).locked_until && new Date((user as any).locked_until).getTime() > Date.now()) {
    return err(c, 429, 'Too many failed sign-in attempts. Try again in a few minutes.');
  }
  const ok = await verifyPassword(c.env, password, (user as any).password);
  if (!ok) {
    const attempts = Number((user as any).failed_login_attempts || 0) + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await getDb(c.env).query(
      'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
      [attempts, lockedUntil, (user as any).id]
    ).catch(() => {});
    return err(c, 401, 'Invalid email or password');
  }
  await getDb(c.env).query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [(user as any).id]
  ).catch(() => {});
  if (!(user as any).is_verified) return err(c, 401, 'Please verify your email address.');
  if ((user as any).is_suspended) return err(c, 403, 'Your account has been suspended. Please contact support.');

  if ((user as any).two_factor_enabled) {
    const code = String(body.twoFactorCode || '').trim();
    if (!code) {
      return c.json({ success: false, message: 'Two-factor code required', twoFactorRequired: true }, 401 as any);
    }
    let passed = await verifyTotp((user as any).two_factor_secret, code);
    if (!passed) {
      const hash = await totpHash(code.toUpperCase());
      const { rows } = await getDb(c.env).query<any>(
        `SELECT id FROM two_factor_backup_codes
         WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL LIMIT 1`,
        [(user as any).id, hash]
      );
      if (rows.length) {
        await getDb(c.env).query('UPDATE two_factor_backup_codes SET used_at = NOW() WHERE id = $1', [rows[0].id]);
        passed = true;
      }
    }
    if (!passed) return err(c, 401, 'Invalid two-factor code');
  }

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
    if (e?.code === '23505' || /unique constraint/i.test(e?.message || '')) {
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


// ── Email verification ────────────────────────────────────────────────────

async function issueSession(c: any, user: any) {
  const payload = { userId: user.id, role: user.role };
  const token = await generateToken(c.env, payload);
  const refreshToken = await generateRefreshToken(c.env, payload);
  await createRefreshToken(c.env, user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  setAuthCookies(c, token, refreshToken);
  return { token, refreshToken };
}

function sessionPayload(user: any, token: string, refreshToken: string) {
  return {
    userId: user.id, name: user.name, email: user.email, role: user.role,
    isVerified: user.is_verified, token, refreshToken,
  };
}

// POST /api/v1/auth/verify-email { email, code }
auth.post('/verify-email', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  if (!EMAIL_RE.test(email)) return err(c, 400, 'Validation failed', { errors: { email: ['Invalid email address'] } });
  if (code.length !== 6) return err(c, 400, 'Verification code must be 6 digits');

  try {
    const user = await getUserByEmail(c.env, email);
    if (!user || (user as any).verification_token !== code) return err(c, 401, 'Invalid verification code');
    if ((user as any).is_verified) return c.json({ success: true, message: 'Email already verified.' });
    if ((user as any).verification_token_expires && new Date((user as any).verification_token_expires) < new Date()) {
      return err(c, 401, 'Verification code has expired. Please request a new one.');
    }

    await getDb(c.env).query(
      'UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expires = NULL, updated_at = NOW() WHERE id = $1',
      [(user as any).id]
    );
    const fresh = await getUserById(c.env, (user as any).id);
    const { token, refreshToken } = await issueSession(c, fresh);
    c.executionCtx.waitUntil(sendWelcomeEmail(c.env, email, (fresh as any).name).catch(() => {}));
    return c.json({ success: true, message: 'Email verified successfully.', data: sessionPayload(fresh, token, refreshToken) });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Verification failed');
  }
});

// GET /api/v1/auth/verify-email/:token (link in the email)
auth.get('/verify-email/:token', async (c) => {
  try {
    const tokenParam = c.req.param('token');
    const { rows } = await getDb(c.env).query<any>(
      `SELECT * FROM users WHERE verification_token = $1
       AND (verification_token_expires IS NULL OR verification_token_expires > NOW())`,
      [tokenParam]
    );
    const user = rows[0];
    if (!user) return err(c, 401, 'Invalid or expired verification token');

    await getDb(c.env).query(
      'UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expires = NULL, updated_at = NOW() WHERE id = $1',
      [user.id]
    );
    const fresh = await getUserById(c.env, user.id);
    const { token, refreshToken } = await issueSession(c, fresh);
    c.executionCtx.waitUntil(sendWelcomeEmail(c.env, user.email, user.name).catch(() => {}));
    return c.json({ success: true, message: 'Email verified successfully.', data: sessionPayload(fresh, token, refreshToken) });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Verification failed');
  }
});

// POST /api/v1/auth/resend-verification
auth.post('/resend-verification', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return err(c, 400, 'Validation failed', { errors: { email: ['Invalid email address'] } });
  try {
    const user = await getUserByEmail(c.env, email);
    if (user && !(user as any).is_verified) {
      const code = verificationCode();
      await getDb(c.env).query(
        'UPDATE users SET verification_token = $1, verification_token_expires = $2, updated_at = NOW() WHERE id = $3',
        [code, new Date(Date.now() + 24 * 60 * 60 * 1000), (user as any).id]
      );
      await sendVerificationEmail(c.env, email, code);
    }
    // Never reveal whether the account exists.
    return c.json({ success: true, message: 'If the account exists and is unverified, a verification email has been sent.' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to resend verification');
  }
});

// ── Password reset ────────────────────────────────────────────────────────

// POST /api/v1/auth/forgot-password
auth.post('/forgot-password', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return err(c, 400, 'Validation failed', { errors: { email: ['Invalid email address'] } });
  const captcha = await verifyTurnstile(c.env, body.turnstileToken, c.req.header('cf-connecting-ip'));
  if (!captcha.ok) return err(c, 400, captcha.error || 'Captcha verification failed');
  try {
    const user = await getUserByEmail(c.env, email);
    const delay = new Promise((r) => setTimeout(r, 300));
    if (user) {
      const raw = randomToken(32);
      const hashed = await sha256Hex(raw);
      await getDb(c.env).query(
        'UPDATE users SET reset_token = $1, reset_token_expiry = $2, updated_at = NOW() WHERE id = $3',
        [hashed, new Date(Date.now() + 15 * 60 * 1000), (user as any).id]
      );
      c.executionCtx.waitUntil(sendPasswordResetEmail(c.env, email, raw).catch(() => {}));
    }
    await delay;
    return c.json({ success: true, message: 'If the email exists, a password reset link has been sent.' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to process request');
  }
});

// POST /api/v1/auth/reset-password { token, password }
auth.post('/reset-password', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const token = String(body.token || '');
  const password = String(body.password || '');
  if (!token) return err(c, 400, 'Token is required');
  if (password.length < 6 || password.length > 100) return err(c, 400, 'Password must be at least 6 characters');

  try {
    const hashed = await sha256Hex(token);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [hashed]
    );
    const user = rows[0];
    if (!user) return err(c, 401, 'Invalid or expired reset token');

    const passwordHash = await hashPassword(c.env, password);
    await getDb(c.env).query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id]
    );
    await deleteAllRefreshTokensForUser(c.env, user.id);
    return c.json({ success: true, message: 'Password reset successful. All other sessions have been logged out.' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to reset password');
  }
});

// POST /api/v1/auth/set-password (first-time setup / instructor approval)
auth.post('/set-password', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const token = String(body.token || '');
  const password = String(body.password || '');
  if (!token) return err(c, 400, 'Token is required');
  if (password.length < 6 || password.length > 100) return err(c, 400, 'Password must be at least 6 characters');

  try {
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM users WHERE setup_token = $1 AND setup_token_expires > NOW()',
      [token]
    );
    const user = rows[0];
    if (!user) return err(c, 401, 'Invalid or expired setup token');

    const passwordHash = await hashPassword(c.env, password);
    await getDb(c.env).query(
      `UPDATE users SET password = $1, setup_token = NULL, setup_token_expires = NULL,
       is_verified = true, updated_at = NOW() WHERE id = $2`,
      [passwordHash, user.id]
    );
    c.executionCtx.waitUntil(sendWelcomeEmail(c.env, user.email, user.name).catch(() => {}));
    return c.json({ success: true, message: 'Password set successfully. You can now log in.' });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to set password');
  }
});

// ── Profile & password change ─────────────────────────────────────────────

// PUT /api/v1/auth/profile
auth.put('/profile', async (c) => {
  let session;
  try { session = await authenticate(c); } catch (e: any) { return err(c, e?.statusCode || 401, e?.message || 'Not authenticated'); }
  const body: any = await c.req.json().catch(() => ({}));
  const allowed = ['name', 'bio', 'avatar', 'headline', 'location', 'website', 'github', 'twitter', 'linkedin', 'expertise'];
  const fields: string[] = [];
  const values: any[] = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = $${values.length + 1}`);
      values.push(key === 'expertise' ? JSON.stringify(body[key]) : body[key]);
    }
  }
  try {
    if (!fields.length) {
      const user = await getUserById(c.env, session.userId);
      return c.json({ success: true, data: user });
    }
    fields.push('updated_at = NOW()');
    values.push(session.userId);
    await getDb(c.env).query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    const user = await getUserById(c.env, session.userId);
    return c.json({ success: true, data: user });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to update profile');
  }
});

// POST /api/v1/auth/change-password
auth.post('/change-password', async (c) => {
  let session;
  try { session = await authenticate(c); } catch (e: any) { return err(c, e?.statusCode || 401, e?.message || 'Not authenticated'); }
  const body: any = await c.req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword) return err(c, 400, 'Current password is required');
  if (newPassword.length < 6 || newPassword.length > 100) return err(c, 400, 'New password must be at least 6 characters');

  try {
    const { rows } = await getDb(c.env).query<any>('SELECT * FROM users WHERE id = $1', [session.userId]);
    const user = rows[0];
    if (!user) return err(c, 404, 'User not found');
    const ok = await verifyPassword(c.env, currentPassword, user.password);
    if (!ok) return err(c, 401, 'Current password is incorrect');

    const passwordHash = await hashPassword(c.env, newPassword);
    await getDb(c.env).query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [passwordHash, user.id]);
    await deleteAllRefreshTokensForUser(c.env, user.id);
    const { token, refreshToken } = await issueSession(c, user);
    return c.json({
      success: true,
      message: 'Password changed successfully. Other sessions have been logged out.',
      data: { token, refreshToken },
    });
  } catch (e: any) {
    return err(c, e?.statusCode || 500, e?.message || 'Failed to change password');
  }
});

// ── Google OAuth (authorization-code flow, no passport) ───────────────────

function googleRedirectUri(c: any): string {
  if (c.env.GOOGLE_CALLBACK_URL) return c.env.GOOGLE_CALLBACK_URL;
  return new URL(c.req.url).origin + '/api/v1/auth/google/callback';
}

// GET /api/v1/auth/google?intent=login|signup
auth.get('/google', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return err(c, 503, 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  const intent = c.req.query('intent') === 'signup' ? 'signup' : 'login';
  const state = await signOAuthState(c.env, intent);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', googleRedirectUri(c));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  return c.redirect(url.toString());
});

// GET /api/v1/auth/google/callback
auth.get('/google/callback', async (c) => {
  const frontend = c.env.FRONTEND_URL || 'https://careercode.com.ng';
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) return c.redirect(`${frontend}/login?error=google_auth_failed`);

  let intent = 'login';
  try {
    intent = (await verifyOAuthState(c.env, state)).intent;
  } catch {
    return c.redirect(`${frontend}/login?error=oauth_state_mismatch`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID || '',
        client_secret: c.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: googleRedirectUri(c),
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson: any = await tokenRes.json();
    if (!tokenJson.access_token) return c.redirect(`${frontend}/login?error=google_auth_failed`);

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const info: any = await infoRes.json();
    const email = String(info.email || '').toLowerCase();
    if (!email) return c.redirect(`${frontend}/login?error=google_auth_failed`);

    let user = await getUserByEmail(c.env, email);
    if (!user) {
      const randomPassword = await hashPassword(c.env, randomToken(24));
      user = await createUser(c.env, {
        name: info.name || email.split('@')[0],
        email,
        password: randomPassword,
        role: 'student',
        is_verified: true,
      });
    }
    if ((user as any).is_suspended) return c.redirect(`${frontend}/login?error=account_suspended`);

    const exchange = await signOAuthExchange(c.env, (user as any).id, (user as any).role);
    return c.redirect(`${frontend}/auth/callback?code=${encodeURIComponent(exchange)}&intent=${intent}`);
  } catch {
    return c.redirect(`${frontend}/login?error=google_auth_failed`);
  }
});

// POST /api/v1/auth/oauth/exchange { code }
auth.post('/oauth/exchange', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  if (!body.code) return err(c, 400, 'OAuth code is required');
  try {
    const decoded = await verifyOAuthExchange(c.env, String(body.code));
    const user = await getUserById(c.env, decoded.userId);
    if (!user) return err(c, 401, 'User not found');
    if ((user as any).is_suspended) return err(c, 403, 'Your account has been suspended. Please contact support.');
    const { token, refreshToken } = await issueSession(c, user);
    return c.json({ success: true, data: sessionPayload(user, token, refreshToken) });
  } catch (e: any) {
    return err(c, 401, 'Invalid or expired OAuth code');
  }
});

// ── Two-factor authentication (TOTP) ─────────────────────────────────────
auth.get('/2fa/status', async (c) => {
  try {
    const s = await authenticate(c);
    const { rows } = await getDb(c.env).query<any>('SELECT two_factor_enabled FROM users WHERE id = $1', [s.userId]);
    return c.json({ success: true, data: { enabled: !!rows[0]?.two_factor_enabled } });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to load status'); }
});

auth.post('/2fa/setup', async (c) => {
  try {
    const s = await authenticate(c);
    const user = await getUserById(c.env, s.userId);
    const secret = generateSecret();
    await getDb(c.env).query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, s.userId]);
    return c.json({
      success: true,
      data: { secret, otpauth: otpauthUrl(secret, (user as any)?.email || s.userId) },
    });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to start 2FA setup'); }
});

auth.post('/2fa/enable', async (c) => {
  try {
    const s = await authenticate(c);
    const body: any = await c.req.json().catch(() => ({}));
    const { rows } = await getDb(c.env).query<any>('SELECT two_factor_secret FROM users WHERE id = $1', [s.userId]);
    const secret = rows[0]?.two_factor_secret;
    if (!secret) return err(c, 400, 'Start 2FA setup first');
    if (!(await verifyTotp(secret, String(body.code || '')))) return err(c, 400, 'Invalid authenticator code');

    await getDb(c.env).query('UPDATE users SET two_factor_enabled = true WHERE id = $1', [s.userId]);
    await getDb(c.env).query('DELETE FROM two_factor_backup_codes WHERE user_id = $1', [s.userId]);
    const codes = backupCodes();
    for (const code of codes) {
      await getDb(c.env).query(
        'INSERT INTO two_factor_backup_codes (user_id, code_hash) VALUES ($1, $2)',
        [s.userId, await totpHash(code.toUpperCase())]
      );
    }
    return c.json({ success: true, data: { enabled: true, backupCodes: codes } });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to enable 2FA'); }
});

auth.post('/2fa/disable', async (c) => {
  try {
    const s = await authenticate(c);
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT two_factor_secret, two_factor_enabled, password FROM users WHERE id = $1', [s.userId]);
    const user = rows[0];
    if (!user?.two_factor_enabled) return c.json({ success: true, data: { enabled: false } });

    let ok = false;
    if (body.code) ok = await verifyTotp(user.two_factor_secret, String(body.code));
    if (!ok && body.password) ok = await verifyPassword(c.env, String(body.password), user.password);
    if (!ok) return err(c, 400, 'Provide a valid authenticator code or your password');

    await db.query('UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [s.userId]);
    await db.query('DELETE FROM two_factor_backup_codes WHERE user_id = $1', [s.userId]);
    return c.json({ success: true, data: { enabled: false } });
  } catch (e: any) { return err(c, e?.statusCode || 500, e?.message || 'Failed to disable 2FA'); }
});

export default auth;
