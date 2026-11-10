// Export every table from Neon to NDJSON-ish JSON files with SQLite-friendly types.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const backendRequire = createRequire(path.join(__dirname, '../../backend/package.json'));
const { Client } = backendRequire('pg');
const { DATA_DIR } = require('./lib.cjs');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

function norm(v, udt) {
  if (v === null || v === undefined) return null;
  if (udt === 'bool' || udt === 'boolean') return v ? 1 : 0;
  if (udt === 'jsonb' || udt === 'json') return typeof v === 'string' ? v : JSON.stringify(v);
  if (udt.startsWith('_')) return Array.isArray(v) ? JSON.stringify(v) : v;
  if (udt === 'timestamptz' || udt === 'timestamp') return v instanceof Date ? v.toISOString() : String(v);
  if (udt === 'date') return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
  if (udt === 'numeric' || udt === 'float4' || udt === 'float8') return v === '' ? null : Number(v);
  if (udt === 'int2' || udt === 'int4' || udt === 'int8') return Number(v);
  return v;
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows: tables } = await c.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`
  );
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const manifest = [];
  for (const { table_name } of tables) {
    const { rows: cols } = await c.query(
      `SELECT column_name, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [table_name]
    );
    const types = Object.fromEntries(cols.map((x) => [x.column_name, x.udt_name]));
    const { rows } = await c.query(`SELECT * FROM "${table_name}"`);
    const out = rows.map((r) => Object.fromEntries(Object.keys(r).map((k) => [k, norm(r[k], types[k])])));
    fs.writeFileSync(`${DATA_DIR}/${table_name}.json`, JSON.stringify(out));
    manifest.push({ table: table_name, rows: out.length });
    process.stdout.write(`${table_name}=${out.length} `);
  }
  fs.writeFileSync(`${DATA_DIR}/manifest.json`, JSON.stringify(manifest, null, 2));
  console.log(`\nEXPORTED ${manifest.reduce((s, x) => s + x.rows, 0)} rows / ${manifest.length} tables -> ${DATA_DIR}`);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
