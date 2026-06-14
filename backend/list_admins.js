const { Client } = require('pg');
require('dotenv').config();

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query('SELECT id, name, email, role, is_verified FROM users WHERE role IN (\'admin\', \'super_admin\')');
    console.log('Admin Users:');
    console.table(rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
