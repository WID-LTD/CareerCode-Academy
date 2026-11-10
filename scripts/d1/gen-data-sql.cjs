// Emit a single SQL file that reproduces the exported Neon data.
const fs = require('fs');
const { readManifest, DATA_DIR } = require('./lib.cjs');
const out = ['PRAGMA foreign_keys = OFF;'];
const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};
for (const { table } of readManifest()) {
  const rows = JSON.parse(fs.readFileSync(`${DATA_DIR}/${table}.json`, 'utf8'));
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    out.push(`INSERT OR REPLACE INTO "${table}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES ` +
      chunk.map((r) => '(' + cols.map((c) => lit(r[c])).join(',') + ')').join(',') + ';');
  }
}
fs.writeFileSync(process.argv[2] || '/tmp/opencode/d1/data.sql', out.join('\n'));
console.log('WROTE', (process.argv[2] || '/tmp/opencode/d1/data.sql'), (out.join('\n').length / 1e6).toFixed(1) + 'MB');
