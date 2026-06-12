const { Pool } = require("pg");
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_W67MIFPciCEw@ep-lingering-wave-apu8tnqc-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require",
});
async function main() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const tables = {};
  for (const row of res.rows) {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(row);
  }
  for (const [t, cols] of Object.entries(tables)) {
    console.log("\n" + t);
    for (const c of cols)
      console.log(
        "  " +
          c.column_name +
          " " +
          c.data_type +
          (c.is_nullable === "NO" ? " NOT NULL" : "") +
          (c.column_default ? " DEFAULT " + c.column_default : "")
      );
  }
  await pool.end();
}
main().catch(console.error);
