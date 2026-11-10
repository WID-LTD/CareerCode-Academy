// Print row counts from D1 and diff against the exported Neon manifest.
const { d1Retry, readManifest } = require('./lib.cjs');
(async () => {
  const manifest = readManifest();
  let total = 0, bad = 0, missing = 0;
  for (const m of manifest) {
    let live;
    try {
      const r = await d1Retry(`SELECT COUNT(*) AS c FROM "${m.table}";`, m.table);
      live = r.result[0].results[0].c;
    } catch (e) { console.log(`MISSING_TABLE ${m.table}: ${e.message.slice(0, 80)}`); missing++; continue; }
    total += live;
    if (live !== m.rows) { bad++; console.log(`MISMATCH ${m.table}: d1=${live} neon=${m.rows}`); }
  }
  console.log(`TABLES=${manifest.length} D1_ROWS=${total} NEON_ROWS=${manifest.reduce((s, x) => s + x.rows, 0)} MISMATCH=${bad} MISSING=${missing}`);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
