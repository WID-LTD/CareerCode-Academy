import type { Env } from './env';
import { toSqlite, toD1Params } from './sql-compat';
import { BOOL_COLUMNS, JSON_COLUMNS, ARRAY_COLUMNS, AMBIGUOUS_JSON_COLUMNS, NUMERIC_SCALE } from './schema-types';

// Two interchangeable datastores behind one interface:
//
//   DB_BACKEND=d1    (default) Cloudflare D1 / SQLite — Postgres SQL is
//                    translated by sql-compat.ts and results are normalised
//                    back to the shapes node-postgres produced.
//   DB_BACKEND=neon  Neon Postgres via @neondatabase/serverless — the original
//                    driver. SQL runs unchanged.
//
// Flip with `wrangler secret put DB_BACKEND` (or the [vars] entry) and redeploy.
// No route code knows which backend is active.

export type DbBackend = 'd1' | 'neon';

export interface DbClient {
  query: <T = any>(sql: string, params?: any[]) => Promise<{ rows: T[] }>;
}

export function dbBackend(env: Env): DbBackend {
  const explicit = (env.DB_BACKEND || '').toLowerCase();
  if (explicit === 'neon' || explicit === 'postgres') return 'neon';
  if (explicit === 'd1' || explicit === 'sqlite') return 'd1';
  // No explicit choice: prefer the D1 binding, fall back to Neon if only a
  // connection string is configured (e.g. a rollback deploy).
  if (env.DB) return 'd1';
  if (env.DATABASE_URL) return 'neon';
  throw new Error('No database configured: bind D1 (DB) or set DATABASE_URL');
}

// ── D1 ────────────────────────────────────────────────────────────────────
function normalizeRow(sql: string, row: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value === null || value === undefined) continue;

    if (BOOL_COLUMNS.has(key)) {
      // SQLite has no boolean type — 1/0 must become true/false again.
      row[key] = value === true || value === 1 || value === '1';
      continue;
    }

    const ambiguousOwners = AMBIGUOUS_JSON_COLUMNS[key];
    if (ambiguousOwners) {
      if (typeof value === 'string' && ambiguousOwners.some((t) => sql.includes(t))) {
        try { row[key] = JSON.parse(value); } catch { /* leave as text */ }
      }
      continue;
    }

    if ((JSON_COLUMNS.has(key) || ARRAY_COLUMNS.has(key)) && typeof value === 'string') {
      try { row[key] = JSON.parse(value); } catch { /* leave as text */ }
      continue;
    }

    if (key in NUMERIC_SCALE && typeof value === 'number') {
      const scale = NUMERIC_SCALE[key];
      // Postgres emits NUMERIC as a fixed-scale string; keep the API contract.
      row[key] = scale === null ? String(value) : value.toFixed(scale);
    }
  }
  return row;
}

function d1Client(env: Env): DbClient {
  const d1 = env.DB;
  if (!d1) throw new Error('D1 binding (DB) is not configured');
  return {
    query: async <T = any>(text: string, params: any[] = []) => {
      const sql = toSqlite(text);
      const bound = toD1Params(params);
      const stmt = bound.length ? d1.prepare(sql).bind(...bound) : d1.prepare(sql);
      const result = await stmt.all<Record<string, any>>();
      const rows = (result?.results || []).map((row) => normalizeRow(sql, row));
      return { rows: rows as T[] };
    },
  };
}

// ── Neon ──────────────────────────────────────────────────────────────────
// Loaded lazily so the Postgres driver is only pulled in when actually used.
let neonFactory: Promise<(conn: string) => any> | null = null;
let neonClientCache: { conn: string; sql: any } | null = null;

function neonClient(env: Env): DbClient {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured (required for DB_BACKEND=neon)');
  return {
    query: async <T = any>(text: string, params: any[] = []) => {
      if (!neonFactory) {
        neonFactory = import('@neondatabase/serverless').then((m) => {
          (m as any).neonConfig.fetchConnectionCache = true;
          return (conn: string) => (m as any).neon(conn);
        });
      }
      const make = await neonFactory;
      if (!neonClientCache || neonClientCache.conn !== connectionString) {
        neonClientCache = { conn: connectionString, sql: make(connectionString) };
      }
      const rows = (await neonClientCache.sql(text, params)) as T[];
      return { rows: Array.isArray(rows) ? rows : [] };
    },
  };
}

export function getDb(env: Env): DbClient {
  return dbBackend(env) === 'neon' ? neonClient(env) : d1Client(env);
}
