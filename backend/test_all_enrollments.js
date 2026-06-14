const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  await client.connect();

  try {
    const { rows: users } = await client.query('SELECT DISTINCT user_id FROM enrollments');
    console.log('Users with enrollments:', users.map(u => u.user_id));
    
    for (const u of users) {
      try {
        await client.query(`
          SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail, c.slug as course_slug, c.category,
                  u.name as instructor_name
           FROM enrollments e
           JOIN courses c ON e.course_id = c.id
           JOIN users u ON c.instructor_id = u.id
           WHERE e.user_id = $1
           ORDER BY e.enrolled_at DESC
        `, [u.user_id]);
        console.log(`User ${u.user_id} OK`);
      } catch (e) {
        console.error(`User ${u.user_id} FAILED:`, e.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
