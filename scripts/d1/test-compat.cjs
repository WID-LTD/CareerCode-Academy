// Validate Postgres->SQLite translation against a real SQLite engine loaded
// with the generated D1 schema.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const tsx = path.join(__dirname, '../../backend/node_modules/.bin/tsx');
const helper = path.join(__dirname, '_translate.ts');
fs.writeFileSync(helper, `
import { toSqlite } from '../../workers/src/sql-compat';
const chunks: string[] = [];
process.stdin.on('data', (c) => chunks.push(String(c)));
process.stdin.on('end', () => {
  const queries = JSON.parse(chunks.join(''));
  process.stdout.write(JSON.stringify(queries.map((q: string) => toSqlite(q))));
});
`);
const translate = (queries) => JSON.parse(execFileSync(tsx, [helper], { input: JSON.stringify(queries), encoding: 'utf8' }));

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(__dirname, '../../workers/sql/d1_schema.sql'), 'utf8'));
db.exec('PRAGMA foreign_keys = OFF;');

// minimal fixture
const now = new Date().toISOString();
const old = new Date(Date.now() - 3 * 3600e3).toISOString();
db.exec(`INSERT INTO users (id,name,email,password,role,is_verified,created_at) VALUES
  ('u1','A','a@x.c','h','student',1,'${now}'),
  ('u2','B','b@x.c','h','student',0,'${now}')`);
db.exec(`INSERT INTO notifications (id,user_id,title,message,read,created_at) VALUES
  ('n1','u1','t','m',1,'${now}'),('n2','u1','t','m',0,'${old}')`);
db.exec(`INSERT INTO courses (id,title,description,price,category,instructor_id,level,duration,published,slug,status)
  VALUES ('c1','Course','d',10.5,'cat','u1','beginner',120,1,'course','published')`);
db.exec(`INSERT INTO enrollments (id,user_id,course_id,progress,completed,completed_lessons,enrolled_at)
  VALUES ('e1','u1','c1',50,0,'["l1","l2"]','${now}')`);
db.exec(`INSERT INTO lesson_progress (id,user_id,course_id,lesson_id,completed,completed_at)
  VALUES ('lp1','u1','c1','l1',1,'${now}'),('lp2','u1','c1','l2',1,'${old}')`);
db.exec(`INSERT INTO daily_xp_log (user_id,xp_earned,date) VALUES ('u1',30,date('now'))`);

const cases = [
  { name: 'placeholders', sql: 'SELECT * FROM users WHERE id = $1 AND role = $2', params: ['u1', 'student'] },
  { name: 'int casts', sql: `SELECT COUNT(*)::int AS n, COALESCE((SELECT SUM(jsonb_array_length(completed_lessons))::int FROM enrollments WHERE user_id = $1), 0) AS lessons FROM enrollments WHERE user_id = $1`, params: ['u1'] },
  { name: 'bool filter', sql: 'SELECT * FROM notifications WHERE user_id = $1 AND read = false', params: ['u1'] },
  { name: 'now compare', sql: 'SELECT * FROM notifications WHERE user_id = $1 AND created_at > NOW() - INTERVAL \'1 hour\'', params: ['u1'] },
  { name: 'date_trunc week', sql: `SELECT TO_CHAR(completed_at, 'Dy') as day, COUNT(*)::int as hours FROM lesson_progress
     WHERE user_id = $1 AND completed = true AND completed_at >= date_trunc('week', NOW())
     GROUP BY TO_CHAR(completed_at, 'Dy') ORDER BY MIN(completed_at)`, params: ['u1'] },
  { name: 'date_trunc month', sql: `SELECT date_trunc('month', NOW()) AS m`, params: [] },
  { name: 'interval on trunc', sql: `SELECT DATE(completed_at) as day, COUNT(*)::int as count FROM lesson_progress
     WHERE user_id = $1 AND completed = true
       AND completed_at >= date_trunc('week', NOW()) - INTERVAL '7 weeks'
       AND completed_at < date_trunc('week', NOW()) + INTERVAL '1 week'
     GROUP BY DATE(completed_at)`, params: ['u1'] },
  { name: 'extract epoch', sql: 'SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age FROM notifications WHERE id = $1', params: ['n2'] },
  { name: 'to_char mon', sql: `SELECT TO_CHAR(completed_at, 'Mon') as month, COUNT(*)::int as hours FROM lesson_progress
     WHERE user_id = $1 AND completed = true AND completed_at >= date_trunc('year', NOW())
     GROUP BY TO_CHAR(completed_at, 'Mon'), EXTRACT(MONTH FROM completed_at)
     ORDER BY EXTRACT(MONTH FROM completed_at)`, params: ['u1'] },
  { name: 'round avg cast', sql: 'SELECT ROUND(AVG(progress))::int as current FROM enrollments WHERE user_id = $1', params: ['u1'] },
  { name: 'current_date join', sql: `SELECT d.xp_earned, d.goal_reached, u.daily_xp_goal FROM daily_xp_log d
     RIGHT JOIN users u ON u.id = d.user_id AND d.date = CURRENT_DATE WHERE u.id = $1`, params: ['u1'] },
  { name: 'array insert', sql: 'INSERT INTO user_journeys (visitor_id, pages_visited) VALUES ($1, ARRAY[$2])', params: ['v1', '/x'] },
  { name: 'returning', sql: `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3) RETURNING *`, params: ['u1', 'tok', new Date(Date.now() + 1000).toISOString()] },
  { name: 'upsert', sql: `INSERT INTO live_participants (session_id, user_id, role_in_room, joined_at, left_at)
     VALUES ($1,$2,$3,NOW(),NULL) ON CONFLICT (session_id, user_id) DO UPDATE SET left_at = NULL, joined_at = NOW(), role_in_room = $3`, params: ['s1', 'u1', 'host'] },
  { name: 'numeric float cast', sql: 'SELECT (price * 0.8)::numeric AS discounted FROM courses WHERE id = $1', params: ['c1'] },
  { name: 'date add', sql: `SELECT a.due_date, CASE WHEN a.due_date - NOW() <= INTERVAL '2 days' THEN 'high' ELSE 'low' END AS p FROM assignments a`, params: [] },
];

let out;
try { out = translate(cases.map((c) => c.sql)); } catch (e) { console.error('TRANSLATE FAILED', e.message); process.exit(1); }

let fail = 0;
cases.forEach((c, i) => {
  const sql = out[i];
  try {
    const stmt = db.prepare(sql);
    if (c.params.length) stmt.all(...c.params); else stmt.all();
    console.log(`PASS ${c.name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL ${c.name}: ${e.message}\n   SQL: ${sql.replace(/\s+/g, ' ').slice(0, 220)}`);
  }
});
// show a couple of translations for eyeballing
console.log('\n-- sample --');
console.log(out[4]);
console.log(out[7]);
process.exit(fail ? 1 : 0);
