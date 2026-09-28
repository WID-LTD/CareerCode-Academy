import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
const prodPath = path.resolve(process.cwd(), '.env.production');

const files = [envPath, prodPath];
let loaded = false;
for (const f of files) {
  if (fs.existsSync(f)) {
    dotenv.config({ path: f, override: false });
    console.log(`Loaded ${path.basename(f)}`);
    loaded = true;
  }
}
// fallback load default dotenv if no file
if (!loaded) dotenv.config();

console.log('\n🔍 Frontend Env Validation');
console.log('='.repeat(60));

const checks = [];

function add(name, status, msg, detail) {
  checks.push({ name, status, msg, detail });
}

const viteApi = process.env.VITE_API_URL;
if (!viteApi) add('VITE_API_URL', 'fail', 'Missing - should be http://localhost:5000/api/v1 for local');
else {
  try { new URL(viteApi); 
    if (viteApi.includes('localhost:5000')) add('VITE_API_URL', 'pass', viteApi);
    else if (viteApi.includes('careercode.com.ng')) add('VITE_API_URL', 'warn', `${viteApi} (production URL, use localhost for dev)`);
    else add('VITE_API_URL', 'pass', viteApi);
  } catch { add('VITE_API_URL', 'fail', `Invalid URL: ${viteApi}`); }
}

const ps = process.env.VITE_PAYSTACK_PUBLIC_KEY;
if (!ps) add('VITE_PAYSTACK_PUBLIC_KEY', 'warn', 'Missing - payment UI may fail');
else if (!ps.startsWith('pk_')) add('VITE_PAYSTACK_PUBLIC_KEY', 'fail', 'Must start with pk_');
else add('VITE_PAYSTACK_PUBLIC_KEY', 'pass', `${ps.slice(0,12)}...`);

const gid = process.env.VITE_GOOGLE_CLIENT_ID;
if (!gid) add('VITE_GOOGLE_CLIENT_ID', 'warn', 'Missing - Google OAuth disabled');
else if (!gid.includes('apps.googleusercontent.com')) add('VITE_GOOGLE_CLIENT_ID', 'fail', 'Should contain apps.googleusercontent.com');
else add('VITE_GOOGLE_CLIENT_ID', 'pass', `${gid.slice(0,15)}...`);

const proxy = process.env.VITE_PROXY_TARGET;
if (proxy) {
  try { new URL(proxy); add('VITE_PROXY_TARGET', 'pass', proxy); } catch { add('VITE_PROXY_TARGET', 'fail', proxy); }
} else {
  add('VITE_PROXY_TARGET', 'warn', 'Not set, defaults to http://localhost:5000 in vite.config.ts');
}

const apiUrl = viteApi || '/api/v1';
const expectedProxy = 'http://localhost:5000';
if (apiUrl === '/api/v1' && !proxy) {
  add('Proxy check', 'warn', 'Using relative /api/v1 - requires Vite proxy to backend 5000 (ok for local)');
} else if (viteApi && viteApi.startsWith('http://localhost:5000')) {
  add('Proxy check', 'pass', 'Frontend will call backend directly at 5000');
}

console.log('');
const icons = { pass: '✅', fail: '❌', warn: '⚠️ ', skip: '⏭️ ' };
let p=0,f=0,w=0;
for (const c of checks) {
  if (c.status==='pass') p++;
  if (c.status==='fail') f++;
  if (c.status==='warn') w++;
  console.log(`${icons[c.status]} ${c.name.padEnd(28)} ${c.msg}`);
  if (c.detail) console.log(`   ↳ ${c.detail}`);
}
console.log('\n' + '='.repeat(60));
console.log(`Summary: ${p} passed, ${w} warnings, ${f} failed`);
if (f>0) console.log('❌ Fix frontend/.env before running');
else if (w>0) console.log('⚠️  Ready for dev, warnings ok');
else console.log('✅ Frontend env ready!');
console.log('='.repeat(60)+'\n');

if (f>0) process.exit(1);
