// Seed the local wrangler/miniflare D1 file from the exported Neon data.
// Usage: node scripts/d1/seed-local.cjs [path-to.sqlite]
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { readManifest, DATA_DIR } = require('./lib.cjs');

const glob = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? glob(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const target = process.argv[2] || glob(path.join(__dirname, '../../workers/.wrangler/state/v3/d1'))
  .find((f) => f.endsWith('.sqlite'));
if (!target) throw new Error('no local D1 sqlite file found — run `wrangler d1 execute --local` first');

const ddl = fs.readFileSync(path.join(__dirname, '../../workers/sql/d1_schema.sql'), 'utf8');
const deps = {};
for (const m of ddl.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)" \(([\s\S]*?)\n\);/g)) {
  deps[m[1]] = [...m[2].matchAll(/FOREIGN KEY \([^)]+\) REFERENCES "([^"]+)"/g)].map((x) => x[1]).filter((x) => x !== m[1]);
}

const db = new DatabaseSync(target);
db.exec('PRAGMA foreign_keys = OFF;');
const manifest = readManifest();
let total = 0;
for (const { table, rows } of manifest) {
  if (!rows) continue;
  const data = JSON.parse(fs.readFileSync(`${DATA_DIR}/${table}.json`, 'utf8'));
  if (!data.length) continue;
  const cols = Object.keys(data[0]);
  const sql = `INSERT OR REPLACE INTO "${table}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
  const stmt = db.prepare(sql);
  db.exec('BEGIN');
  try {
    for (const row of data) stmt.run(...cols.map((c) => (row[c] === undefined ? null : row[c])));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error(`FAILED ${table}: ${e.message}`);
    process.exit(1);
  }
  total += data.length;
  process.stdout.write(`${table}=${data.length} `);
}
console.log(`\nSEEDED ${total} rows into ${target}`);
