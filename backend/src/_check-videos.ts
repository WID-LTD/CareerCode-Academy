import dotenv from 'dotenv';
dotenv.config();
import { query } from './config/db';

async function main() {
  const { rows: courses } = await query(`
    SELECT c.title, COUNT(l.id) as total,
      COUNT(l.video_url) FILTER (WHERE l.video_url IS NOT NULL) as have_video
    FROM courses c
    LEFT JOIN lessons l ON l.course_id = c.id
    GROUP BY c.id, c.title
    ORDER BY c.title
  `);
  console.log('Courses:');
  courses.forEach((r: any) => {
    console.log(`  ${r.title}: ${r.total} lessons, ${r.have_video} have video`);
  });
  const { rows: totalRows } = await query('SELECT COUNT(*) FROM lessons');
  console.log('Total lessons:', totalRows[0].count);
  const { rows: needRows } = await query('SELECT COUNT(*) FROM lessons WHERE video_url IS NULL');
  console.log('Need video:', needRows[0].count);
}
main().catch(console.error).finally(() => process.exit(0));
