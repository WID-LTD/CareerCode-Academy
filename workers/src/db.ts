import { neon, neonConfig } from '@neondatabase/serverless';
import type { Env } from './env';

// Neon serverless driver uses fetch/WebSocket — the only Postgres client
// shape that runs inside the Workers runtime. SQL stays 100% Postgres:
// every query written for `pg` works unchanged against Neon.
neonConfig.fetchConnectionCache = true;

export interface DbClient {
  query: <T = any>(sql: string, params?: any[]) => Promise<{ rows: T[] }>;
}

export function getDb(env: Env): DbClient {
  // Phase 2+: prefer Hyperdrive pooling when bound.
  const connectionString =
    (env as any).HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }
  const sql = neon(connectionString);
  return {
    query: async <T = any>(text: string, params: any[] = []) => {
      const rows = (await sql(text, params)) as T[];
      return { rows: Array.isArray(rows) ? rows : [] };
    },
  };
}
