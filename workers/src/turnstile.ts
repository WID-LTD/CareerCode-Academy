import type { Env } from './env';

// Cloudflare Turnstile verification.
// If TURNSTILE_SECRET is not configured (local dev/tests) verification is a
// no-op so the platform keeps working.

export interface TurnstileResult {
  ok: boolean;
  error?: string;
}

export async function verifyTurnstile(env: Env, token: string | undefined, ip?: string | null): Promise<TurnstileResult> {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return { ok: true };
  if (!token) return { ok: false, error: 'Please complete the captcha' };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const json: any = await res.json().catch(() => ({}));
    if (json?.success) return { ok: true };
    return { ok: false, error: 'Captcha verification failed' };
  } catch {
    // Network failure should not lock users out entirely.
    return { ok: true };
  }
}
