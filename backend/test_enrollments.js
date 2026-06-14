const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  await client.connect();

  try {
    const { rows: users } = await client.query('SELECT DISTINCT user_id FROM enrollments LIMIT 1');
    if (users.length === 0) {
      console.log('No users with enrollments found');
      return;
    }

    const userId = users[0].user_id;
    console.log('Testing query getEnrollmentsByUser for user:', userId);
    
    const { rows } = await client.query(`
      SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug, c.category,
              u.name as instructor_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.instructor_id = u.id
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC
    `, [userId]);
    console.log('Query OK. Found', rows.length, 'records.');
    console.log(rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
