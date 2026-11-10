// Postgres -> SQLite translation for the queries written for the Express/Neon
// backend. D1 only speaks SQLite, so `getDb()` pipes every statement through
// here. The goal is behavioural parity, not a general-purpose transpiler:
// only the constructs this codebase actually uses are translated.
//
// Covered:
//   $1 placeholders        -> ?1
//   expr::type casts       -> CAST(expr AS type)
//   NOW()                  -> ISO-8601 UTC timestamp with milliseconds
//   CURRENT_DATE           -> YYYY-MM-DD (UTC)
//   NOW() - INTERVAL 'x'   -> strftime(...,'now','-x')
//   date_trunc(...)        -> ISO-8601 truncation
//   EXTRACT(EPOCH FROM a-b)-> (julianday(a)-julianday(b))*86400
//   EXTRACT(MONTH FROM x)  -> CAST(strftime('%m', x) AS INTEGER)
//   TO_CHAR(x,'Dy'|'Mon')  -> CASE expression
//   jsonb_array_length(x)  -> json_array_length(x)
//   ARRAY[x]               -> json_array(x)
//   ILIKE                  -> LIKE (SQLite LIKE is ASCII case-insensitive)

const TS_NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

/** ISO-8601 midnight (UTC) of the current week (Postgres weeks start Monday). */
const WEEK_START = `strftime('%Y-%m-%dT%H:%M:%fZ','now','-' || (CAST(strftime('%w','now') AS INTEGER) + 6) % 7 || ' days','start of day')`;
const MONTH_START = `strftime('%Y-%m-01T00:00:00.000Z','now')`;
const YEAR_START = `strftime('%Y-01-01T00:00:00.000Z','now')`;

function castType(raw: string): string | null {
  const t = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (t.endsWith('[]')) return null; // array casts are dropped entirely
  if (/^(int|int2|int4|int8|integer|smallint|bigint|boolean|bool)$/.test(t)) return 'INTEGER';
  if (/^(numeric|decimal|real|float|float4|float8|double precision)/.test(t)) return 'REAL';
  if (/^(text|varchar|character varying|character|char|citext|uuid|jsonb?|timestamptz|timestamp|date|time|interval)/.test(t)) return 'TEXT';
  return null;
}

/** Walk backwards from the end of `out` to find where the left operand starts. */
function exprStart(out: string): number {
  let i = out.length;
  const skipWs = () => { while (i > 0 && /\s/.test(out[i - 1])) i--; };

  skipWs();
  if (i > 0 && out[i - 1] === ')') {
    let depth = 0;
    for (; i > 0; i--) {
      const ch = out[i - 1];
      if (ch === ')') depth++;
      else if (ch === '(') { depth--; if (depth === 0) { i--; break; } }
    }
    // include a preceding function name, e.g. ROUND(...) / COALESCE(...)
    let j = i;
    while (j > 0 && /[\w.]/.test(out[j - 1])) j--;
    if (j !== i) i = j;
    return i;
  }
  if (i > 0 && out[i - 1] === "'") {
    i--;
    while (i > 0) {
      if (out[i - 1] === "'") {
        if (out[i - 2] === "'") { i -= 2; continue; }
        i--; break;
      }
      i--;
    }
    return i;
  }
  while (i > 0 && /[\w.$\]]/.test(out[i - 1])) i--;
  if (i > 0 && out[i - 1] === ']') {
    // array subscript, e.g. a[1]
    i--;
    while (i > 0 && out[i - 1] !== '[') i--;
    if (i > 0) i--;
  }
  return i;
}

export function rewriteCasts(sql: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < sql.length) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) { out += sql[i + 1]; i += 2; continue; }
        quote = null;
      }
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; out += ch; i++; continue; }
    if (ch === ':' && sql[i + 1] === ':') {
      const m = /^::\s*(timestamp with(?:out)? time zone|character varying|double precision|interval|int8|int4|int2|integer|int|smallint|bigint|numeric|decimal|boolean|citext|varchar|character|jsonb|json|real|float8|float4|float|text|bool|char|uuid|date|time)(?![A-Za-z0-9_])(\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\))?(\[\])?/i.exec(sql.slice(i));
      if (m) {
        const type = castType(m[1] + (m[2] || '') + (m[3] || ''));
        i += m[0].length;
        if (type) {
          const start = exprStart(out);
          const expr = out.slice(start).trim();
          out = out.slice(0, start) + `CAST(${expr} AS ${type})`;
        }
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

/** Replace a SQL function call with balanced parens, e.g. EXTRACT(EPOCH FROM (...) ). */
function replaceBalanced(sql: string, startIdx: number, fnName: string): { inner: string; end: number } | null {
  const afterFn = startIdx + fnName.length;
  if (sql[afterFn] !== '(') return null;
  let depth = 0;
  let i = afterFn;
  for (; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth === 0) break; }
  }
  if (depth !== 0) return null;
  return { inner: sql.slice(afterFn + 1, i), end: i + 1 };
}

function translateDateTrunc(sql: string): string {
  const re = /date_trunc\s*\(\s*'(week|month|year)'\s*,\s*(NOW\s*\(\s*\)|[^)]+?)\s*\)/gi;
  return sql.replace(re, (_m, unit: string, expr: string) => {
    if (/^now$/i.test(expr.replace(/[\s()]/g, ''))) {
      return unit.toLowerCase() === 'week' ? WEEK_START : unit.toLowerCase() === 'month' ? MONTH_START : YEAR_START;
    }
    return `strftime('%Y-%m-%dT%H:%M:%fZ', ${expr}, 'start of day')`;
  });
}

/** `NOW() - INTERVAL '1 hour'`, `date_trunc(...) - INTERVAL '7 weeks'`, etc. */
function translateTimestampDiff(sql: string): string {
  // `col - NOW() <= INTERVAL '2 days'`  ->  julianday diff in days
  const units: Record<string, number> = {
    second: 1 / 86400, seconds: 1 / 86400, minute: 1 / 1440, minutes: 1 / 1440,
    hour: 1 / 24, hours: 1 / 24, day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30,
  };
  const re = /([A-Za-z_][\w.]*)\s*-\s*NOW\s*\(\s*\)\s*(<=|>=|<>|!=|<|>|=)\s*INTERVAL\s*'(\d+(?:\.\d+)?)\s+([a-z]+)'/gi;
  return sql.replace(re, (_m, col: string, op: string, n: string, unit: string) => {
    const factor = units[unit.toLowerCase()] ?? 1;
    return `(julianday(${col}) - julianday('now')) ${op} ${Number(n) * factor}`;
  });
}

function translateIntervals(sql: string): string {
  // only expressions that are already timestamps are supported
  const re = /(NOW\s*\(\s*\)|date_trunc\s*\(\s*'(?:week|month|year)'\s*,\s*NOW\s*\(\s*\)\s*\))\s*([+-])\s*INTERVAL\s*'([^']+)'/gi;
  return sql.replace(re, (_m, expr: string, op: string, amount: string) => {
    const sign = op === '-' ? '-' : '+';
    if (/^now/i.test(expr.replace(/[\s()]/g, ''))) {
      return `strftime('%Y-%m-%dT%H:%M:%fZ','now','${sign}${amount}')`;
    }
    return `strftime('%Y-%m-%dT%H:%M:%fZ', ${expr}, '${sign}${amount}')`;
  });
}

function translateExtract(sql: string): string {
  let out = '';
  let i = 0;
  const lower = sql.toLowerCase();
  while (i < sql.length) {
    const at = lower.indexOf('extract', i);
    if (at === -1) { out += sql.slice(i); break; }
    out += sql.slice(i, at);
    const parsed = replaceBalanced(sql, at, 'extract');
    if (!parsed) { out += sql[at]; i = at + 1; continue; }
    const inner = parsed.inner.trim();
    const month = /^month\s+from\s+(.+)$/is.exec(inner);
    const epoch = /^epoch\s+from\s+(.+)$/is.exec(inner);
    const year = /^year\s+from\s+(.+)$/is.exec(inner);
    if (month) out += `CAST(strftime('%m', ${month[1]}) AS INTEGER)`;
    else if (year) out += `CAST(strftime('%Y', ${year[1]}) AS INTEGER)`;
    else if (epoch) out += epochSeconds(epoch[1]);
    else out += sql.slice(at, parsed.end);
    i = parsed.end;
  }
  return out;
}

/** Split `a - b` at top level (outside parens/quotes). */
function splitTopLevelMinus(expr: string): [string, string] | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'") { quote = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '-' && depth === 0 && /\s/.test(expr[i - 1] || '') && /\s/.test(expr[i + 1] || '')) {
      const left = expr.slice(0, i).trim();
      const right = expr.slice(i + 1).trim();
      if (left && right) return [left, right];
    }
  }
  return null;
}

function stripOuterParens(expr: string): string {
  let e = expr.trim();
  while (e.startsWith('(') && e.endsWith(')')) {
    let depth = 0;
    let wraps = true;
    for (let i = 0; i < e.length; i++) {
      if (e[i] === '(') depth++;
      else if (e[i] === ')') { depth--; if (depth === 0 && i !== e.length - 1) { wraps = false; break; } }
    }
    if (!wraps) break;
    e = e.slice(1, -1).trim();
  }
  return e;
}

/** EXTRACT(EPOCH FROM x) where x is `timestamp - timestamp`. */
function epochSeconds(inner: string): string {
  const parts = splitTopLevelMinus(stripOuterParens(inner));
  if (!parts) return `(julianday(${inner.trim()}) * 86400.0)`;
  return `((julianday(${parts[0]}) - julianday(${parts[1]})) * 86400.0)`;
}

const DOW_CASE = `CASE CAST(strftime('%w', __E__) AS INTEGER) WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' ELSE 'Sat' END`;
const MON_CASE = `CASE CAST(strftime('%m', __E__) AS INTEGER) WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Apr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' WHEN 9 THEN 'Sep' WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' ELSE 'Dec' END`;

function translateToChar(sql: string): string {
  const re = /to_char\s*\(\s*([^,()]+?)\s*,\s*'(Dy|Mon|YYYY-MM-DD|YYYY)'\s*\)/gi;
  return sql.replace(re, (_m, expr: string, fmt: string) => {
    const e = expr.trim();
    if (/^dy$/i.test(fmt)) return `(${DOW_CASE.replace('__E__', e)})`;
    if (/^mon$/i.test(fmt)) return `(${MON_CASE.replace('__E__', e)})`;
    if (/^yyyy-mm-dd$/i.test(fmt)) return `strftime('%Y-%m-%d', ${e})`;
    return `strftime('%Y', ${e})`;
  });
}

export function toSqlite(raw: string): string {
  let sql = raw;

  // 1. Interval arithmetic must run before NOW() is rewritten.
  sql = translateTimestampDiff(sql);
  sql = translateIntervals(sql);
  sql = translateDateTrunc(sql);

  // 2. Function translations.
  sql = translateExtract(sql);
  sql = translateToChar(sql);
  sql = sql.replace(/\bjsonb_array_length\s*\(/gi, 'json_array_length(');
  sql = sql.replace(/\bARRAY\s*\[([^\]]*)\]/gi, 'json_array($1)');
  sql = sql.replace(/\bILIKE\b/gi, 'LIKE');

  // 3. Casts (after ARRAY[] handling so `::type[]` can be dropped).
  sql = rewriteCasts(sql);

  // 4. Scalars.
  sql = sql.replace(/\bNOW\s*\(\s*\)/gi, TS_NOW);
  sql = sql.replace(/\bCURRENT_DATE\b/gi, `strftime('%Y-%m-%d','now')`);
  sql = sql.replace(/\bCURRENT_TIMESTAMP\b/gi, TS_NOW);

  // 5. Placeholders last.
  sql = sql.replace(/\$(\d+)/g, '?$1');
  return sql;
}

/** Normalise JS values into the primitive types D1 accepts. */
export function toD1Params(params: any[] = []): any[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (p === null) return null;
    if (p instanceof Date) return p.toISOString();
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (typeof p === 'object') return JSON.stringify(p);
    return p;
  });
}
