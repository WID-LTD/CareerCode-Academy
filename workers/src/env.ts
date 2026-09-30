// Shared environment typings for the Workers app.
// Secrets are injected via `wrangler secret put` / .dev.vars — never committed.

export interface Env {
  DATABASE_URL: string;
  FRONTEND_URL: string;
  CORS_ORIGINS?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_PUBLIC_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
  FLUTTERWAVE_PUBLIC_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
  CLOUDFLARE_AI_TOKEN?: string;
  // Bindings (phased in)
  // HYPERDRIVE?: Hyperdrive;
  // R2?: R2Bucket;
  AUTH_DO?: DurableObjectNamespace;
  TURN_KEY_ID?: string;
  TURN_KEY_SECRET?: string;
}
