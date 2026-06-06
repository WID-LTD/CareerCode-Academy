const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`ALTER TABLE instructor_applications ADD COLUMN IF NOT EXISTS notes TEXT;`);
    console.log("Column notes added successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
