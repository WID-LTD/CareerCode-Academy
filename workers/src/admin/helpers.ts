import type { Env } from '../env';
import { getDb } from '../db';

// Shared helpers for the ported admin routes. Mirrors the pieces of
// backend/src/utils/helpers.ts, middleware/audit.ts and utils/currency.ts that
// admin.routes.ts relies on.

export interface AuditEntry {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Insert an audit row; failures never break the request (same as Express). */
export async function logAudit(env: Env, entry: AuditEntry): Promise<void> {
  try {
    await getDb(env).query(
      `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.adminId,
        entry.action,
        entry.resourceType,
        entry.resourceId ?? null,
        entry.details || null,
        entry.ipAddress || null,
        entry.userAgent || null,
      ]
    );
  } catch (e) {
    console.error('Failed to log audit:', e);
  }
}

/** Client IP / user-agent for audit rows (Express used req.ip / req.headers). */
export function requestMeta(c: any): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || null,
    userAgent: c.req.header('user-agent') || null,
  };
}

export function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Email (Brevo HTTP API; Workers cannot use SMTP) ──────────────────────
async function sendMail(env: Env, to: string, subject: string, html: string): Promise<void> {
  if (!env.BREVO_API_KEY) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_SENDER_EMAIL || 'johndavidnzubechukwu008@gmail.com',
          name: env.BREVO_SENDER_NAME || 'CareerCode Academy',
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
  } catch {
    /* email failures must never break the request */
  }
}

export async function sendInstructorApprovalEmail(env: Env, email: string, name: string, setupToken: string): Promise<void> {
  const frontend = env.FRONTEND_URL || 'https://careercode.com.ng';
  const setupUrl = `${frontend}/auth/set-password/${setupToken}`;
  await sendMail(
    env,
    email,
    'CareerCode Academy - Your Instructor Account is Ready!',
    `<h1>Congratulations, ${name}!</h1>
     <p>Your instructor application has been approved. Your instructor account is ready.</p>
     <p><a href="${setupUrl}">Set your password</a></p>
     <p>Or copy this URL: <a href="${setupUrl}">${setupUrl}</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}

export async function sendInstructorUpgradeEmail(env: Env, email: string, name: string): Promise<void> {
  const frontend = env.FRONTEND_URL || 'https://careercode.com.ng';
  await sendMail(
    env,
    email,
    'CareerCode Academy - Instructor Application Approved!',
    `<h1>Congratulations, ${name}!</h1>
     <p>Your application to become an instructor has been approved.</p>
     <p>Your existing student account has been upgraded to an Instructor account. Your password remains the same.</p>
     <p><a href="${frontend}/login">Log in to Instructor Dashboard</a></p>`
  );
}

// ── Currency (backend/src/utils/currency.ts) ──────────────────────────────
export const SUPPORTED_CURRENCIES: Record<string, { symbol: string; locale: string; name: string }> = {
  NGN: { symbol: '₦', locale: 'en-NG', name: 'Nigerian Naira' },
  USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
  GHS: { symbol: 'GH₵', locale: 'en-GH', name: 'Ghanaian Cedi' },
  KES: { symbol: 'KSh', locale: 'en-KE', name: 'Kenyan Shilling' },
  ZAR: { symbol: 'R', locale: 'en-ZA', name: 'South African Rand' },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound' },
  EUR: { symbol: '€', locale: 'de-DE', name: 'Euro' },
  UGX: { symbol: 'USh', locale: 'en-UG', name: 'Ugandan Shilling' },
  TZS: { symbol: 'TSh', locale: 'en-TZ', name: 'Tanzanian Shilling' },
  RWF: { symbol: 'RF', locale: 'rw-RW', name: 'Rwandan Franc' },
  XAF: { symbol: 'FCFA', locale: 'fr-CM', name: 'Central African CFA' },
  XOF: { symbol: 'CFA', locale: 'fr-SN', name: 'West African CFA' },
  CAD: { symbol: 'CA$', locale: 'en-CA', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar' },
};

export function isSupportedCurrency(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, code);
}

// ── Dates / labels (Postgres to_char replacement, computed in JS) ─────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function asDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** to_char(x, 'Mon DD') */
export function monDay(value: any): string | null {
  const d = asDate(value);
  if (!d) return null;
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** to_char(x, 'Mon YYYY') */
export function monYear(value: any): string | null {
  const d = asDate(value);
  if (!d) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** to_char(x, 'HH24:00') */
export function hourLabel(value: any): string | null {
  const d = asDate(value);
  if (!d) return null;
  return `${String(d.getUTCHours()).padStart(2, '0')}:00`;
}

/** YYYY-MM-DD (the shape SQLite's DATE() returns). */
export function dateOnly(value: any): string | null {
  const d = asDate(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** Postgres returned NUMERIC aggregates as strings; normalise for maths. */
export function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function intCount(value: any): number {
  return parseInt(String(value ?? '0'), 10) || 0;
}

/** Build `col = $n, ...` from a plain object, skipping undefined values. */
export function buildUpdate(
  input: Record<string, any>,
  columns?: Record<string, string>
): { fields: string[]; values: any[] } {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const column = columns?.[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${column} = $${values.length + 1}`);
    values.push(value);
  }
  return { fields, values };
}

// ── Zod-equivalent validation for the admin course payloads ───────────────
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const COURSE_STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'archived'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUrl(value: any): boolean {
  try {
    new URL(String(value));
    return true;
  } catch {
    return false;
  }
}

export interface CoursePayloadRules {
  required: boolean;
}

/**
 * Mirrors adminCreateCourseSchema / adminUpdateCourseSchema.
 * Returns a field -> messages map, or null when valid.
 */
export function validateCoursePayload(body: any, rules: CoursePayloadRules): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  const add = (field: string, message: string) => {
    (errors[field] ||= []).push(message);
  };
  const has = (key: string) => body?.[key] !== undefined;
  const required = (key: string) => {
    if (rules.required && !has(key)) {
      add(key, 'Required');
      return false;
    }
    return has(key);
  };

  if (required('title') && (typeof body.title !== 'string' || body.title.length < 3 || body.title.length > 200)) {
    add('title', 'String must contain at least 3 and at most 200 character(s)');
  }
  if (required('description') && (typeof body.description !== 'string' || body.description.length < 10 || body.description.length > 5000)) {
    add('description', 'String must contain at least 10 and at most 5000 character(s)');
  }
  if (required('price') && (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) {
    add('price', 'Number must be greater than or equal to 0');
  }
  if (required('category') && (typeof body.category !== 'string' || body.category.length < 2)) {
    add('category', 'String must contain at least 2 character(s)');
  }
  if (required('level') && !LEVELS.includes(body.level)) {
    add('level', `Invalid enum value. Expected 'beginner' | 'intermediate' | 'advanced'`);
  }
  if (required('duration') && (typeof body.duration !== 'number' || !Number.isFinite(body.duration) || body.duration < 1)) {
    add('duration', 'Number must be greater than or equal to 1');
  }
  if (has('thumbnail') && !isUrl(body.thumbnail)) {
    add('thumbnail', 'Invalid url');
  }
  if (has('status') && !COURSE_STATUSES.includes(body.status)) {
    add('status', `Invalid enum value. Expected 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'`);
  }
  if (required('instructor_id') && (typeof body.instructor_id !== 'string' || !UUID_RE.test(body.instructor_id))) {
    add('instructor_id', 'Invalid uuid');
  }
  if (has('learning_outcomes') && (!Array.isArray(body.learning_outcomes) || body.learning_outcomes.some((v: any) => typeof v !== 'string'))) {
    add('learning_outcomes', 'Expected array of strings');
  }

  return Object.keys(errors).length ? errors : null;
}

/** body parser that tolerates empty/invalid JSON, like Express' body parser. */
export async function jsonBody(c: any): Promise<any> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}
