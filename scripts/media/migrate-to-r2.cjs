// Migrate external/base64 media into Cloudflare R2 and rewrite the DB.
//
//   node scripts/media/migrate-to-r2.cjs --dry-run
//   node scripts/media/migrate-to-r2.cjs --apply
//
// Scope:
//   - courses.thumbnail      (images.unsplash.com hotlinks)
//   - resources.file_url     (data:text/plain;base64 transcripts)
//   - courses.banner_image   (external URLs, when present)
//
// Uses the D1 REST API for reads/writes and `wrangler r2 object put` for the
// upload (no S3 credentials required).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { d1, d1Retry } = require('../d1/lib.cjs');

const APPLY = process.argv.includes('--apply');
const BUCKET = 'career-code-academy';
const PUBLIC_BASE = process.env.R2_PUBLIC_URL || 'https://pub-a2269f45348a44958044822fb0428bb7.r2.dev';
const ROOT = path.resolve(__dirname, '../..');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100) || 'asset';
}

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get('content-type') || 'application/octet-stream';
  return { buf, type };
}

function upload(buf, key, contentType) {
  const tmp = path.join(os.tmpdir(), `r2-${crypto.randomUUID()}-${path.basename(key)}`);
  fs.writeFileSync(tmp, buf);
  try {
    execFileSync(
      'npx',
      ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', tmp, '--content-type', contentType],
      { cwd: path.join(ROOT, 'workers'), stdio: 'pipe', env: process.env }
    );
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return `${PUBLIC_BASE.replace(/\/$/, '')}/${key}`;
}

async function record(entityType, entityId, sourceUrl, key, mime, bytes, hash, license, author) {
  await d1Retry(
    `INSERT OR IGNORE INTO media_assets (id, entity_type, entity_id, source_url, r2_key, mime, bytes, hash, license, author)
     VALUES ('${crypto.randomUUID()}', '${entityType}', '${entityId}', '${String(sourceUrl).replace(/'/g, "''")}', '${key}', '${mime}', ${bytes}, '${hash}', '${license}', '${author}')`,
    `media ${entityId}`
  );
}

async function migrateCourses() {
  const rows = (await d1Retry(
    "SELECT id, thumbnail FROM courses WHERE thumbnail LIKE 'http%' AND thumbnail NOT LIKE '%r2.dev%'",
    'courses'
  )).result[0].results;
  console.log(`courses with external thumbnails: ${rows.length}`);
  for (const row of rows) {
    try {
      const { buf, type } = await download(row.thumbnail);
      const hash = sha256(buf);
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const key = `courses/${row.id}-${hash.slice(0, 10)}.${ext}`;
      console.log(`${APPLY ? '→' : '·'} ${row.id} ${(buf.length / 1024).toFixed(0)}KB`);
      if (!APPLY) continue;
      const url = upload(buf, key, type);
      await d1Retry(`UPDATE courses SET thumbnail = '${url}' WHERE id = '${row.id}'`, 'course update');
      await record('course_thumbnail', row.id, row.thumbnail, key, type, buf.length, hash, 'unsplash', null);
    } catch (e) {
      console.log(`  ! ${row.id}: ${e.message}`);
    }
  }
}

async function migrateResources() {
  const rows = (await d1Retry(
    "SELECT id, course_id, title, file_url, file_type FROM resources WHERE file_url LIKE 'data:%'",
    'resources'
  )).result[0].results;
  console.log(`resources with data URIs: ${rows.length}`);
  for (const row of rows) {
    try {
      const match = /^data:([^;]+);base64,(.*)$/s.exec(row.file_url);
      if (!match) continue;
      const mime = match[1];
      const buf = Buffer.from(match[2], 'base64');
      const hash = sha256(buf);
      const ext = mime.includes('plain') ? 'txt' : mime.includes('pdf') ? 'pdf' : 'bin';
      const key = `resources/${row.id}-${hash.slice(0, 10)}.${ext}`;
      console.log(`${APPLY ? '→' : '·'} ${row.title} ${(buf.length / 1024).toFixed(0)}KB`);
      if (!APPLY) continue;
      const url = upload(buf, key, mime);
      await d1Retry(
        `UPDATE resources SET file_url = '${url}', file_type = '${mime}' WHERE id = '${row.id}'`,
        'resource update'
      );
      await record('resource', row.id, row.title, key, mime, buf.length, hash, 'original', null);
    } catch (e) {
      console.log(`  ! ${row.id}: ${e.message}`);
    }
  }
}

(async () => {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY RUN'} | bucket: ${BUCKET}`);
  if (APPLY) {
    try {
      execFileSync('npx', ['wrangler', 'r2', 'bucket', 'create', BUCKET], { cwd: path.join(ROOT, 'workers'), stdio: 'pipe' });
    } catch { /* already exists */ }
  }
  await migrateCourses();
  await migrateResources();
  console.log('done');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
