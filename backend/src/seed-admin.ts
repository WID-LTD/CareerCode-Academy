import bcrypt from 'bcryptjs';
import { query } from './config/db';

async function seedAdmin() {
  try {
    const email = 'admin@careercode.com';
    const password = 'Admin123!';
    const name = 'Admin';

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`Admin user already exists (${email}).`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await query(
      `INSERT INTO users (name, email, password, role, is_verified)
       VALUES ($1, $2, $3, 'admin', true)`,
      [name, email, hashedPassword]
    );

    console.log('Admin user created successfully!');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('Login at /login and access /admin/dashboard.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  }
}

seedAdmin();
