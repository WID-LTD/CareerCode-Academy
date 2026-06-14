const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync('password123', salt);
    
    // Update all users!
    const { rowCount } = await client.query(
      'UPDATE users SET password = $1, is_verified = true',
      [hashedPassword]
    );
    console.log(`Reset passwords to password123 and verified for ALL ${rowCount} users.`);
    
    const { rows } = await client.query('SELECT email FROM users');
    console.log('List of all emails in DB:', rows.map(r => r.email));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
