// Shared environment typings for the Workers app.
// Secrets are injected via `wrangler secret put` / .dev.vars — never committed.

export interface Env {
  // Primary datastore (Cloudflare D1).
  DB?: D1Database;
  // Neon fallback, used only when DB_BACKEND=neon.
  DATABASE_URL?: string;
  // Manual switch: 'd1' (default) or 'neon'. Set as a worker secret/var.
  DB_BACKEND?: 'd1' | 'neon';
  // R2 bucket for database backups (see scripts/backup-d1.sh).
  BACKUPS?: R2Bucket;
  // R2 bucket for course media / uploads.
  R2?: R2Bucket;
  R2_PUBLIC_URL?: string;
  FRONTEND_URL: string;
  CORS_ORIGINS?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  // Transactional email: Cloudflare Email Service binding (send_email).
  EMAIL?: { send: (message: any) => Promise<any> };
  MAIL_FROM?: string;
  // Cloudflare Turnstile
  TURNSTILE_SECRET?: string;
  // Workers AI binding
  AI?: { run: (model: string, input: any) => Promise<any> };
  // Web Push (VAPID)
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_PUBLIC_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
  FLUTTERWAVE_PUBLIC_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
  CLOUDFLARE_AI_TOKEN?: string;
  // Cloudflare API automation (portfolio custom domains)
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_PAGES_PROJECT?: string;
  // Bindings (phased in)
  // HYPERDRIVE?: Hyperdrive;
  // R2?: R2Bucket;
  AUTH_DO?: DurableObjectNamespace;
  TURN_KEY_ID?: string;
  TURN_KEY_SECRET?: string;
}
