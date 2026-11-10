// Shared helpers for the Neon -> Cloudflare D1 migration toolkit.
const https = require('https');
const fs = require('fs');

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCT = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1 = process.env.D1_ID;

function d1(sql, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params ? { sql, params } : { sql });
    const r = https.request({
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${ACCT}/d1/database/${D1}/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 180000,
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (!j.success) return reject(new Error(JSON.stringify(j.errors).slice(0, 400)));
          resolve(j);
        } catch (e) { reject(new Error('bad json: ' + d.slice(0, 200))); }
      });
    });
    r.on('error', reject);
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.write(body);
    r.end();
  });
}

async function d1Retry(sql, label = '', attempts = 6, params) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await d1(sql, params); } catch (e) {
      last = e;
      console.log(`  retry ${i + 1}/${attempts} ${label}: ${e.message.slice(0, 140)}`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}

const DATA_DIR = process.env.D1_DATA_DIR || '/tmp/opencode/d1/data';

function readManifest() {
  return JSON.parse(fs.readFileSync(`${DATA_DIR}/manifest.json`, 'utf8'));
}

module.exports = { d1, d1Retry, readManifest, DATA_DIR };
