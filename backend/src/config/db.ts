import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

function isConnectionError(err: any): boolean {
  if (typeof AggregateError !== 'undefined' && err instanceof AggregateError) {
    return err.errors?.some((e: any) => isConnectionError(e)) || false;
  }
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('econnrefused') || msg.includes('etimedout') ||
         msg.includes('database') || msg.includes('connect') ||
         msg.includes('closed') || msg.includes('timeout');
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('DATABASE_URL not set — database queries will fail');
    }

    pool = new Pool({
      connectionString: connectionString || undefined,
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 120000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client, resetting pool:', (err as Error).message);
      resetPool();
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const p = getPool();
    const start = Date.now();
    try {
      const result = await p.query<T>(text, params);
      return result;
    } catch (err: any) {
      const isConnErr = isConnectionError(err);
      if (isConnErr && attempt < maxRetries) {
        console.warn(`Query attempt ${attempt + 1} failed (connection error), retrying...`);
        resetPool();
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      console.error('Query error:', err.message || err);
      throw err;
    }
  }
  throw new Error('Query failed after retries');
}

export async function getClient() {
  const client = await getPool().connect();
  return client;
}

export function resetPool() {
  if (pool) {
    try {
      pool.end().catch(() => {});
    } catch {}
    pool = null;
  }
}

export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

const db = { getPool, query, getClient, resetPool, isDatabaseAvailable };
export default db;
