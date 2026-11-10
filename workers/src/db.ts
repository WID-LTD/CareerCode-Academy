import type { Env } from './env';
import { toSqlite, toD1Params } from './sql-compat';
import { BOOL_COLUMNS, JSON_COLUMNS, ARRAY_COLUMNS, AMBIGUOUS_JSON_COLUMNS, NUMERIC_SCALE } from './schema-types';

// Cloudflare D1 (SQLite) client that speaks the same interface the Neon
// Postgres driver exposed: `db.query(sql, params) -> { rows }`.
//
// SQL written for Postgres runs through `toSqlite()` (placeholder + syntax
// translation) and results are normalised back to the JSON shapes Postgres
// produced (booleans as true/false, jsonb as parsed values).

export interface DbClient {
  query: <T = any>(sql: string, params?: any[]) => Promise<{ rows: T[] }>;
}

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

export function getDb(env: Env): DbClient {
  const d1 = (env as any).DB as D1Database | undefined;
  if (!d1) {
    // Never silently fall back to another database: an unbound D1 would have
    // meant writing to nowhere.
    throw new Error('D1 binding (DB) is not configured');
  }
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
