import type { Context } from 'hono';
import type { Env } from './env';
import { authenticate, type TokenPayload } from './auth-helpers';

// Shared helpers for the ported route modules.

export function fail(c: any, status: number, message: string, extra: Record<string, any> = {}) {
  return c.json({ success: false, message, ...extra }, status as any);
}

export async function requireAuth(c: Context<{ Bindings: Env }>): Promise<TokenPayload> {
  try {
    return await authenticate(c);
  } catch (e: any) {
    throw Object.assign(new Error(e?.message || 'Not authenticated'), { statusCode: e?.statusCode || 401 });
  }
}

export async function requireRole(c: Context<{ Bindings: Env }>, roles: string[]): Promise<TokenPayload> {
  const session = await requireAuth(c);
  if (!roles.includes(session.role)) {
    throw Object.assign(new Error('You do not have permission to perform this action'), { statusCode: 403 });
  }
  return session;
}

export function statusOf(e: any, fallback = 500): number {
  return Number(e?.statusCode) || fallback;
}

export function pageParams(c: any, defaultLimit = 20) {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || String(defaultLimit), 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}
