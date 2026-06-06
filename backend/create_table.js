const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instructor_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        country VARCHAR(100),
        state VARCHAR(100),
        professional_title VARCHAR(200),
        years_experience VARCHAR(50),
        specialization VARCHAR(100),
        github_url TEXT,
        linkedin_url TEXT,
        portfolio_url TEXT,
        resume_url TEXT,
        profile_image_url TEXT,
        bio TEXT,
        teaching_experience TEXT,
        interested_courses TEXT,
        availability VARCHAR(100),
        motivation TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("Table instructor_applications created successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
