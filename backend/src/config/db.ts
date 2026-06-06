import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

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
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getPool();
  const start = Date.now();
  try {
    const result = await p.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('Query error:', (err as Error).message);
    throw err;
  }
}

export async function getClient() {
  const client = await getPool().connect();
  return client;
}

export function resetPool() {
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
}

export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

const db = { getPool, query, getClient, resetPool, isDatabaseAvailable };
export default db;
