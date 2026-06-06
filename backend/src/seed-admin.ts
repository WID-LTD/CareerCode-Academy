import bcrypt from 'bcryptjs';
import { query } from './config/db';

async function seedAdmin() {
  try {
    const adminEmail = 'admin@careercode.com';
    const adminPassword = 'Admin123!';
    const superAdminEmail = 'superadmin@careercode.com';
    const superAdminPassword = 'SuperAdmin123!';

    // Seed admin
    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await query(
        `INSERT INTO users (name, email, password, role, is_verified)
         VALUES ($1, $2, $3, 'admin', true)`,
        ['Admin', adminEmail, hashedPassword]
      );
      console.log('Admin user created successfully!');
    } else {
      console.log(`Admin user already exists (${adminEmail}).`);
    }

    // Seed super_admin
    const existingSuper = await query('SELECT id FROM users WHERE email = $1', [superAdminEmail]);
    if (existingSuper.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(superAdminPassword, 12);
      await query(
        `INSERT INTO users (name, email, password, role, is_verified)
         VALUES ($1, $2, $3, 'super_admin', true)`,
        ['Super Admin', superAdminEmail, hashedPassword]
      );
      console.log('Super Admin user created successfully!');
    } else {
      console.log(`Super Admin user already exists (${superAdminEmail}).`);
    }

    console.log('Login at /login and access the dashboard.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  }
}

seedAdmin();
