const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  await client.connect();

  try {
    const range = '6m';
    const intervalMap = { '7d': '7 days', '30d': '30 days', '6m': '6 months', '1y': '1 year' };
    const chartInterval = range === '7d' || range === '30d' ? 'day' : 'month';
    const dateTrunc = chartInterval === 'day' ? 'DATE' : "DATE_TRUNC('month', created_at)::date";
    const labelExpr = chartInterval === 'day' ? "to_char(created_at, 'Mon DD')" : "to_char(DATE_TRUNC('month', created_at), 'Mon YYYY')";
    const enrollLabel = chartInterval === 'day' ? "to_char(enrolled_at, 'Mon DD')" : "to_char(DATE_TRUNC('month', enrolled_at), 'Mon YYYY')";
    const enrollTrunc = chartInterval === 'day' ? 'DATE(enrolled_at)' : "DATE_TRUNC('month', enrolled_at)::date";
    const userLabel = "to_char(created_at, 'Mon DD')";

    const intervalStr = intervalMap[range] || '6 months';

    console.log('Testing queries...');
    await client.query(`SELECT COUNT(*) FROM instructor_applications WHERE status = 'pending'`);
    await client.query(`SELECT COUNT(*) FROM courses WHERE published = false`);
    await client.query(`SELECT COUNT(*) FROM users WHERE is_suspended = false OR is_suspended IS NULL`);
    await client.query(`SELECT COUNT(*) FROM certificates`);

    await client.query(`SELECT ${enrollTrunc} as date, ${enrollLabel} as label, COUNT(*) as enrollments FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`);
    await client.query(`SELECT DATE(created_at) as date, ${userLabel} as label, COUNT(*) as users FROM users WHERE created_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`);
    await client.query(`SELECT c.title, c.slug, COUNT(e.id) as enrollments FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id GROUP BY c.id, c.title, c.slug ORDER BY enrollments DESC LIMIT 5`);
    await client.query(`SELECT al.*, u.name as admin_name FROM audit_logs al JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 10`);
    await client.query(`SELECT ${dateTrunc} as date, ${labelExpr} as label, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as transactions FROM payments WHERE status = 'completed' AND created_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`);
    await client.query(`SELECT ${dateTrunc} as date, ${labelExpr} as label, COALESCE(SUM(amount), 0) as refunds FROM payments WHERE status = 'refunded' AND created_at > NOW() - INTERVAL '${intervalStr}' GROUP BY date, label ORDER BY date`);
    await client.query(`SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_students,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_instructors,
        (SELECT COUNT(*) FROM enrollments WHERE enrolled_at < NOW() - INTERVAL '${intervalStr}') as prev_enrollments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at < NOW() - INTERVAL '${intervalStr}') as prev_revenue
      `);
    console.log('Queries OK');
  } catch (err) {
    console.error('Error in query:', err.message);
  } finally {
    await client.end();
  }
}

test();
