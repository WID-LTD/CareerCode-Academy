// Load exported Neon data into D1 in dependency order (SCC-aware, FK-safe).
const fs = require('fs');
const { d1Retry, readManifest, DATA_DIR } = require('./lib.cjs');

const SCHEMA = process.env.D1_SCHEMA || `${__dirname}/../../workers/sql/d1_schema.sql`;

function dependencyGraph() {
  const ddl = fs.readFileSync(SCHEMA, 'utf8');
  const deps = {};
  for (const m of ddl.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)" \(([\s\S]*?)\n\);/g)) {
    deps[m[1]] = [...m[2].matchAll(/FOREIGN KEY \([^)]+\) REFERENCES "([^"]+)"/g)]
      .map((x) => x[1]).filter((x) => x !== m[1]);
  }
  return deps;
}

function componentOrder(deps) {
  let i = 0;
  const st = [], on = new Set(), idx = {}, low = {}, scc = [];
  const strong = (v) => {
    idx[v] = low[v] = i++; st.push(v); on.add(v);
    for (const w of deps[v] || []) {
      if (!(w in idx)) { strong(w); low[v] = Math.min(low[v], low[w]); }
      else if (on.has(w)) low[v] = Math.min(low[v], idx[w]);
    }
    if (low[v] === idx[v]) {
      const c = []; let w;
      do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v);
      scc.push(c);
    }
  };
  Object.keys(deps).sort().forEach((v) => { if (!(v in idx)) strong(v); });

  const compOf = {};
  scc.forEach((c, k) => c.forEach((t) => (compOf[t] = k)));
  const edges = scc.map(() => new Set());
  const indeg = new Array(scc.length).fill(0);
  for (const [t, ds] of Object.entries(deps)) {
    for (const d of ds) {
      if (!deps[d]) continue;
      const a = compOf[d], b = compOf[t];
      if (a === b || edges[a].has(b)) continue;
      edges[a].add(b); indeg[b]++;
    }
  }
  const q = [];
  indeg.forEach((n, k) => { if (n === 0) q.push(k); });
  const groups = [];
  while (q.length) {
    const k = q.shift();
    groups.push(scc[k].sort());
    for (const j of edges[k]) if (--indeg[j] === 0) q.push(j);
  }
  if (groups.length !== scc.length) throw new Error(`unresolved order ${groups.length}/${scc.length}`);
  return groups;
}

const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};

(async () => {
  const manifest = readManifest();
  const known = new Set(manifest.map((m) => m.table));
  const skip = new Set((process.env.D1_SKIP_TABLES || '').split(',').filter(Boolean));
  const only = new Set((process.env.D1_ONLY_TABLES || '').split(',').filter(Boolean));
  const deps = dependencyGraph();
  const groups = componentOrder(deps);
  let total = 0;
  for (const g of groups) {
    const tables = g.filter((t) => known.has(t) && !skip.has(t) && (!only.size || only.has(t)))
      .map((t) => ({ t, rows: JSON.parse(fs.readFileSync(`${DATA_DIR}/${t}.json`, 'utf8')) }))
      .filter((x) => x.rows.length);
    if (!tables.length) continue;
    // Rows whose values are larger than D1's per-statement SQL budget must be
    // sent as bound parameters (short SQL, big params).
    const bigTables = new Set();
    const stmts = [g.length > 1 ? 'PRAGMA defer_foreign_keys = ON;' : ''];
    for (const { t, rows } of tables) {
      const cols = Object.keys(rows[0]);
      const colSql = cols.map((c) => `"${c}"`).join(',');
      // Chunk by row count AND byte size: D1 rejects very large statements.
      const MAX_BYTES = 48000;
      let batch = [], size = 0;
      const flush = () => {
        if (!batch.length) return;
        stmts.push(`INSERT OR REPLACE INTO "${t}" (${colSql}) VALUES ${batch.join(',')};`);
        batch = []; size = 0;
      };
      for (const r of rows) {
        const tuple = '(' + cols.map((c) => lit(r[c])).join(',') + ')';
        if (tuple.length > 40000) { bigTables.add(t); continue; }
        if (batch.length >= 200 || size + tuple.length > MAX_BYTES) flush();
        batch.push(tuple); size += tuple.length + 1;
      }
      flush();
    }
    await d1Retry(stmts.join('\n'), tables.map((x) => x.t).join('+'));
    for (const { t, rows } of tables) {
      if (!bigTables.has(t)) continue;
      const cols = Object.keys(rows[0]);
      const colSql = cols.map((c) => `"${c}"`).join(',');
      const sql = `INSERT OR REPLACE INTO "${t}" (${colSql}) VALUES (${cols.map(() => '?').join(',')});`;
      for (const r of rows) {
        if ('(' + cols.map((c) => lit(r[c])).join(',') + ')'.length <= 40000) continue;
        // D1 cannot bind booleans; values are already normalised to primitives.
        await d1Retry(sql, `${t} big row`, 6, cols.map((c) => r[c]));
      }
    }
    for (const { t, rows } of tables) {
      const r = await d1Retry(`SELECT COUNT(*) AS c FROM "${t}";`, `${t} count`);
      const c = r.result[0].results[0].c;
      console.log(`${t}: ${rows.length} -> ${c} ${c === rows.length ? 'OK' : 'MISMATCH'}`);
      total += rows.length;
    }
  }
  console.log('TOTAL', total);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
