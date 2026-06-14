const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync('password123', salt);
    
    // Reset passwords for typical test emails to 'password123' and ensure they are verified
    const emails = [
      'admin@careercode.com',
      'instructor@careercode.com',
      'emmach793@gmail.com',
      'emmach396@gmail.com',
      'ikewisdom92@gmail.com'
    ];

    for (const email of emails) {
      await client.query(
        'UPDATE users SET password = $1, is_verified = true WHERE email = $2',
        [hashedPassword, email]
      );
      console.log(`Reset password for ${email} to 'password123' and marked as verified.`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
