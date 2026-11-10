
import { toSqlite } from '../../workers/src/sql-compat';
const chunks: string[] = [];
process.stdin.on('data', (c) => chunks.push(String(c)));
process.stdin.on('end', () => {
  const queries = JSON.parse(chunks.join(''));
  process.stdout.write(JSON.stringify(queries.map((q: string) => toSqlite(q))));
});
