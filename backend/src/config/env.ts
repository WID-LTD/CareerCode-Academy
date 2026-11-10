import { z } from 'zod';

const envSchema = z.object({
  // App
  PORT: z.string().default('5000').transform(v => parseInt(v, 10)).pipe(z.number().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').url().refine(
    v => v.startsWith('postgresql://') || v.startsWith('postgres://'),
    'DATABASE_URL must be a postgres connection string'
  ),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Brevo

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().startsWith('sk_', 'PAYSTACK_SECRET_KEY must start with sk_'),
  PAYSTACK_PUBLIC_KEY: z.string().startsWith('pk_', 'PAYSTACK_PUBLIC_KEY must start with pk_'),
  FLUTTERWAVE_SECRET_KEY: z.string().min(1),
  FLUTTERWAVE_PUBLIC_KEY: z.string().min(1),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().includes('apps.googleusercontent.com'),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  GOOGLE_CALLBACK_URL: z.string().url(),

  // S3 / R2
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_REGION: z.string().default('auto'),
  S3_PUBLIC_URL: z.string().url(),

  // Cloudflare
  CLOUDFLARE_WORKERS_AI_TOKEN: z.string().startsWith('cfut_'),
  CLOUDFLARE_AI_TOKEN: z.string().startsWith('cfut_'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('\n❌ Environment validation failed:');
    for (const issue of result.error.issues) {
      const key = issue.path.join('.');
      console.error(`  - ${key}: ${issue.message} (received: ${JSON.stringify(process.env[key as keyof NodeJS.ProcessEnv])?.slice(0, 80)})`);
    }
    console.error('\nHint: Copy backend/.env.example to backend/.env and fill missing values.\n');
    // In production fail hard, in dev warn but continue
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing in development mode despite env errors...\n');
      // Return partial env with defaults where possible
      return process.env as unknown as Env;
    }
  }
  parsedEnv = result.data;
  return result.data;
}

export function getEnv(): Env {
  if (parsedEnv) return parsedEnv;
  return validateEnv();
}

// Helper to check single var
export function isEnvValid(): boolean {
  return envSchema.safeParse(process.env).success;
}

export function getEnvStatus() {
  const result = envSchema.safeParse(process.env);
  const fields = Object.keys(envSchema.shape) as (keyof Env)[];
  return fields.map(key => {
    const raw = process.env[key as string];
    const hasValue = !!raw && raw.length > 0;
    const issue = !result.success ? result.error.issues.find(i => i.path[0] === key) : undefined;
    return {
      key,
      hasValue,
      valid: !issue,
      error: issue?.message,
      masked: raw ? `${raw.slice(0, 8)}...${raw.slice(-4)}` : '(empty)',
    };
  });
}
