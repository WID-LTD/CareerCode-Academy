# Neon → Cloudflare D1 migration

The API worker now reads and writes **Cloudflare D1** (SQLite). Neon is no
longer used by any native worker route.

## What runs where

| Layer | Datastore | Notes |
|---|---|---|
| Worker native routes (`/api/v1/auth`, `analytics`, `public`, `live`, `courses`, `schools`, `student`, `notifications`, `certificates`, `career-goals`) | **D1** | `workers/src/db.ts` |
| Routes still proxied to Render (payments, admin, community, quizzes, …) | Neon | Removed as each route is ported |

## Why a compatibility layer

All ~75 SQL statements in the worker were written for Postgres (Neon). Instead
of rewriting them by hand, `workers/src/sql-compat.ts` translates the specific
Postgres constructs this codebase uses into SQLite at runtime:

- `$1` → `?1`
- `expr::type` → `CAST(expr AS type)`
- `NOW()` / `CURRENT_DATE` → ISO-8601 UTC strings (millisecond precision, so
  string comparison against stored timestamps is chronological)
- `NOW() - INTERVAL '1 hour'`, `date_trunc('week'|'month'|'year', NOW())`
- `EXTRACT(EPOCH FROM a - b)`, `EXTRACT(MONTH FROM x)`
- `TO_CHAR(x, 'Dy'|'Mon')`
- `jsonb_array_length()` → `json_array_length()`
- `ARRAY[x]` → `json_array(x)`
- `ILIKE` → `LIKE`

`workers/src/db.ts` also restores the JSON shapes Postgres produced:

- `BOOLEAN` columns → `true` / `false` (SQLite stores 1/0)
- `jsonb` and array columns → parsed values (SQLite stores JSON text)
- `NUMERIC(…,2)` columns → fixed-scale strings (`"8500.00"`), exactly what
  node-postgres returned

These column maps are generated from the live schema into
`workers/src/schema-types.ts`.

## Schema and data

- D1 database: `careercode-academy`
  (`1287fa42-8291-4192-a2c9-47b44b03001b`, WEUR)
- SQLite schema: `workers/sql/d1_schema.sql` (106 tables, 326 indexes,
  generated from the live Neon schema)
- Migration verified at **45,828 / 45,828 rows, 0 mismatches** across 106 tables

Postgres types map as: `uuid`/`timestamptz`/`date`/`time` → `TEXT`,
`bool` → `INTEGER`, `jsonb`/arrays → `TEXT` (JSON), `numeric` → `REAL`,
`int*` → `INTEGER`.

UUID and timestamp defaults are SQL expressions, so inserts that rely on the
database (`DEFAULT gen_random_uuid()`, `DEFAULT NOW()`) keep working.

## Tooling (`scripts/d1/`)

Run from the repo root. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and
`D1_ID` must be exported (see `~/.config/cloudflare/wid-ltd.env`).

```bash
node scripts/d1/introspect.cjs     # dump live Neon schema -> neon-schema.json
node scripts/d1/gen-types.cjs      # regenerate workers/src/schema-types.ts
node scripts/d1/export.cjs         # Neon -> /tmp/opencode/d1/data/*.json
node scripts/d1/import.cjs         # JSON -> D1 (SCC-aware FK order)
node scripts/d1/inspect.cjs        # row-count diff D1 vs Neon export
node scripts/d1/seed-local.cjs     # seed the local miniflare D1 file
node scripts/d1/test-compat.cjs    # unit-test SQL translation
backend/node_modules/.bin/tsx scripts/d1/test-routes.ts   # route suite on D1
```

`test-routes.ts` boots the real Hono app against a local SQLite file with a
small D1 shim: 24 checks covering every native route, the full auth flow, and
analytics persistence.

Regenerating the SQLite schema from a changed Neon schema:

```bash
node scripts/d1/introspect.cjs
node scripts/d1/gen-schema.cjs > workers/sql/d1_schema.sql
```

## Known differences / gotchas

- **D1 statement size**: single statements must stay under ~100 KB. Rows with
  very large text (e.g. `resources.file_url` data URLs) must be inserted with
  bound parameters, not inline literals — the importer handles this
  automatically.
- **FK order**: `courses` ↔ `programs` reference each other. The importer
  collapses SCCs and inserts them in one deferred-FK transaction.
- **`waitUntil` swallows errors**: analytics writes run post-response with
  `.catch(() => {})`. The page-view/click/scroll/journey handlers now create the
  `visitors` row first — without it the FK failed silently, which is why
  `page_views` had only 3 rows despite 40k visitors.
- **Free plan writes**: 100k rows written/day, 5M rows read/day. Analytics is
  the main write source; monitor in the Cloudflare dashboard.
- **Refresh tokens** now carry a random `jti`, because `refresh_tokens.token`
  is UNIQUE and two logins in the same second produced identical JWTs.
