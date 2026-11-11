import type { Env } from './env';
import { getDb } from './db';

const DEFAULTS: Record<string, boolean> = {
  ai_enabled: true,
  ai_voice_enabled: true,
  registration_enabled: true,
  paid_enrollment_enabled: true,
  community_enabled: true,
  mentorship_enabled: true,
  jobs_enabled: true,
  portfolio_enabled: true,
  certificates_enabled: true,
  maintenance_mode: false,
};

/** Read a feature flag, falling back to the product default when unset. */
export async function isEnabled(env: Env, key: string, fallback?: boolean): Promise<boolean> {
  try {
    const { rows } = await getDb(env).query<any>('SELECT enabled FROM feature_flags WHERE key = $1', [key]);
    if (rows.length) return !!rows[0].enabled;
  } catch { /* table may not exist during first boot */ }
  return fallback ?? DEFAULTS[key] ?? false;
}

export async function getFlags(env: Env): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = { ...DEFAULTS };
  try {
    const { rows } = await getDb(env).query<any>('SELECT key, enabled FROM feature_flags');
    for (const row of rows) out[row.key] = !!row.enabled;
  } catch { /* ignore */ }
  return out;
}
