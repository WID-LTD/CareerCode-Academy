import type { Env } from './env';
import { toSqlite, toD1Params } from './sql-compat';
import { BOOL_COLUMNS, JSON_COLUMNS, ARRAY_COLUMNS, AMBIGUOUS_JSON_COLUMNS, NUMERIC_SCALE } from './schema-types';

// Cloudflare D1 is the only runtime datastore. Postgres SQL from the original
// Express app is translated by sql-compat.ts and results are normalised back to
// the shapes node-postgres produced.

export type DbBackend = 'd1';

export interface DbClient {
  query: <T = any>(sql: string, params?: any[]) => Promise<{ rows: T[] }>;
}

export function dbBackend(_env?: Env): DbBackend {
  return 'd1';
}

function normalizeRow(sql: string, row: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value === null || value === undefined) continue;

    if (BOOL_COLUMNS.has(key)) {
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
      row[key] = scale === null ? String(value) : value.toFixed(scale);
    }
  }
  return row;
}

export function getDb(env: Env): DbClient {
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
