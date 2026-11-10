// Dump live Neon schema metadata (types/defaults/constraints/indexes) as JSON.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const backendRequire = createRequire(path.join(__dirname, '../../backend/package.json'));
const { Client } = backendRequire('pg');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const OUT = path.join(__dirname, 'neon-schema.json');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const q = async (s, p) => (await c.query(s, p)).rows;
  const tables = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
  const out = [];
  for (const { table_name } of tables) {
    const cols = await q(`SELECT column_name, data_type, udt_name, is_nullable, column_default,
        character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [table_name]);
    const cnt = await q(`SELECT COUNT(*)::int n FROM "${table_name}"`);
    out.push({ table: table_name, rows: cnt[0].n, cols });
  }
  const cons = await q(`SELECT con.conname, con.contype, rel.relname AS table_name, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid
    JOIN pg_namespace n ON n.oid=rel.relnamespace WHERE n.nspname='public' ORDER BY rel.relname, con.contype`);
  const idx = await q(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public'`);
  fs.writeFileSync(OUT, JSON.stringify({ tables: out, cons, idx }, null, 2));
  console.log('WROTE', OUT, 'tables', out.length, 'rows', out.reduce((s, x) => s + x.rows, 0));
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
