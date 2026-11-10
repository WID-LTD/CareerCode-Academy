import dotenv from 'dotenv';
dotenv.config();

import { getEnvStatus, validateEnv } from '../config/env';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

type Check = { name: string; status: 'pass' | 'fail' | 'warn' | 'skip'; message: string; detail?: string };

const checks: Check[] = [];

function add(name: string, status: Check['status'], message: string, detail?: string) {
  checks.push({ name, status, message, detail });
}

async function testDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) { add('DATABASE_URL', 'fail', 'Missing'); return; }
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    add('DATABASE_URL', 'fail', 'Must start with postgresql://');
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW() as now, version() as version');
    const ms = Date.now() - start;
    add('DATABASE_URL', 'pass', `Connected in ${ms}ms`, `Server time: ${res.rows[0].now} | ${String(res.rows[0].version).slice(0, 60)}...`);
  } catch (e: any) {
    add('DATABASE_URL', 'fail', `Connection failed: ${e.message}`, e.code ? `code: ${e.code}` : undefined);
  } finally {
    await pool.end().catch(()=>{});
  }
}

function testJwt() {
  const s = process.env.JWT_SECRET || '';
  const rs = process.env.JWT_REFRESH_SECRET || '';
  if (s.length < 32) add('JWT_SECRET', 'fail', `Too short (${s.length} < 32)`);
  else if (s.includes('change_me')) add('JWT_SECRET', 'warn', 'Using placeholder - change in production!', `length ${s.length}`);
  else add('JWT_SECRET', 'pass', `Length ${s.length} ok`);
  if (rs.length < 32) add('JWT_REFRESH_SECRET', 'fail', `Too short (${rs.length} < 32)`);
  else if (rs.includes('change_me')) add('JWT_REFRESH_SECRET', 'warn', 'Using placeholder - change in production!', `length ${rs.length}`);
  else add('JWT_REFRESH_SECRET', 'pass', `Length ${rs.length} ok`);

  // Test sign/verify
  try {
    const token = jwt.sign({ userId: 'test', role: 'student' }, s, { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any });
    const decoded = jwt.verify(token, s) as any;
    if (decoded.userId === 'test') add('JWT sign/verify', 'pass', 'JWT sign & verify works', `exp: ${process.env.JWT_EXPIRES_IN}`);
    else add('JWT sign/verify', 'fail', 'Decoded payload mismatch');
  } catch (e: any) { add('JWT sign/verify', 'fail', e.message); }

  try {
    const rt = jwt.sign({ userId: 'test' }, rs, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any });
    jwt.verify(rt, rs);
    add('JWT_REFRESH sign/verify', 'pass', `Works (${process.env.JWT_REFRESH_EXPIRES_IN})`);
  } catch (e: any) { add('JWT_REFRESH sign/verify', 'fail', e.message); }
}

function testBrevo() {
}

function testPaystack() {
  const s = process.env.PAYSTACK_SECRET_KEY || '';
  const p = process.env.PAYSTACK_PUBLIC_KEY || '';
  if (!s.startsWith('sk_')) add('PAYSTACK_SECRET_KEY', 'fail', 'Must start with sk_');
  else add('PAYSTACK_SECRET_KEY', s.includes('test') ? 'pass' : 'warn', `${s.slice(0,12)}... len ${s.length}`, s.includes('test') ? 'test mode' : 'live mode?');
  if (!p.startsWith('pk_')) add('PAYSTACK_PUBLIC_KEY', 'fail', 'Must start with pk_');
  else add('PAYSTACK_PUBLIC_KEY', p.includes('test') ? 'pass' : 'warn', `${p.slice(0,12)}... len ${p.length}`, p.includes('test') ? 'test mode' : 'live mode?');
  const fs = process.env.FLUTTERWAVE_SECRET_KEY || '';
  const fp = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
  if (!fs) add('FLUTTERWAVE_SECRET_KEY', 'warn', 'Empty - set FLWSECK_TEST-xxx or skip');
  else add('FLUTTERWAVE_SECRET_KEY', fs.startsWith('FLWSECK') ? 'pass' : 'warn', `${fs.slice(0,12)}...`);
  if (!fp) add('FLUTTERWAVE_PUBLIC_KEY', 'warn', 'Empty');
  else add('FLUTTERWAVE_PUBLIC_KEY', fp.startsWith('FLWPUBK') ? 'pass' : 'warn', `${fp.slice(0,12)}...`);
}

function testGoogle() {
  const id = process.env.GOOGLE_CLIENT_ID || '';
  const secret = process.env.GOOGLE_CLIENT_SECRET || '';
  const cb = process.env.GOOGLE_CALLBACK_URL || '';
  if (!id.includes('apps.googleusercontent.com')) add('GOOGLE_CLIENT_ID', 'fail', 'Should contain apps.googleusercontent.com');
  else add('GOOGLE_CLIENT_ID', 'pass', `${id.slice(0,15)}...`);
  if (secret.length < 10) add('GOOGLE_CLIENT_SECRET', 'fail', 'Too short');
  else add('GOOGLE_CLIENT_SECRET', 'pass', `${secret.slice(0,6)}... len ${secret.length}`);
  try { new URL(cb); add('GOOGLE_CALLBACK_URL', 'pass', cb); } catch { add('GOOGLE_CALLBACK_URL', 'fail', `Invalid URL: ${cb}`); }
  const expCb = `http://localhost:${process.env.PORT || 5000}/api/v1/auth/google/callback`;
  if (cb !== expCb) add('GOOGLE_CALLBACK_URL', 'warn', `Expected ${expCb} for local dev`, `got: ${cb}`);
}

async function testS3() {
  const endpoint = process.env.S3_ENDPOINT || '';
  const bucket = process.env.S3_BUCKET || '';
  const access = process.env.S3_ACCESS_KEY_ID || '';
  const secret = process.env.S3_SECRET_ACCESS_KEY || '';
  const publicUrl = process.env.S3_PUBLIC_URL || '';
  const region = process.env.S3_REGION || 'auto';
  try { new URL(endpoint); add('S3_ENDPOINT', 'pass', endpoint); } catch { add('S3_ENDPOINT', 'fail', `Invalid URL: ${endpoint}`); }
  if (!bucket) add('S3_BUCKET', 'fail', 'Empty');
  else add('S3_BUCKET', 'pass', bucket);
  if (!access || access.length < 8) add('S3_ACCESS_KEY_ID', 'fail', 'Too short');
  else add('S3_ACCESS_KEY_ID', 'pass', `${access.slice(0,6)}... len ${access.length}`);
  if (!secret || secret.length < 20) add('S3_SECRET_ACCESS_KEY', 'fail', 'Too short');
  else add('S3_SECRET_ACCESS_KEY', 'pass', `${secret.slice(0,6)}... len ${secret.length}`);
  try { new URL(publicUrl); add('S3_PUBLIC_URL', 'pass', publicUrl); } catch { add('S3_PUBLIC_URL', 'fail', `Invalid: ${publicUrl}`); }
  add('S3_REGION', 'pass', region);

  // Actual connectivity test (HeadBucket) - optional, may fail in offline but warn
  if (endpoint && bucket && access && secret) {
    const client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId: access, secretAccessKey: secret },
      forcePathStyle: true,
    });
    try {
      const start = Date.now();
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      add('S3 connectivity', 'pass', `HeadBucket succeeded in ${Date.now() - start}ms`);
    } catch (e: any) {
      const msg = e.message || String(e);
      const isNotFound = msg.includes('NotFound') || msg.includes('NoSuchBucket');
      if (isNotFound) add('S3 connectivity', 'warn', `Bucket not found or not accessible: ${msg.slice(0,120)}`);
      else if (msg.includes('InvalidAccessKeyId') || msg.includes('SignatureDoesNotMatch')) add('S3 connectivity', 'fail', `Auth failed: ${msg.slice(0,120)}`);
      else add('S3 connectivity', 'warn', `HeadBucket warn: ${msg.slice(0,120)} (may be network/R2)`);
    }
  } else {
    add('S3 connectivity', 'skip', 'Skipped - missing credentials');
  }
}

function testCloudflare() {
  const token = process.env.CLOUDFLARE_AI_TOKEN || '';
  const token2 = process.env.CLOUDFLARE_WORKERS_AI_TOKEN || '';
  for (const [k, v] of [['CLOUDFLARE_AI_TOKEN', token], ['CLOUDFLARE_WORKERS_AI_TOKEN', token2]] as const) {
    if (!v) add(k, 'fail', 'Missing');
    else if (!v.startsWith('cfut_')) add(k, 'fail', 'Must start with cfut_');
    else add(k, v === token2 && token !== token2 ? 'warn' : 'pass', `${v.slice(0,10)}... len ${v.length}`, v !== token2 ? 'tokens differ' : undefined);
  }
}

function testApp() {
  const port = process.env.PORT || '';
  const env = process.env.NODE_ENV || '';
  const front = process.env.FRONTEND_URL || '';
  if (!port || isNaN(parseInt(port, 10))) add('PORT', 'fail', `Invalid: ${port}`);
  else add('PORT', parseInt(port,10) === 5000 ? 'pass' : 'warn', `PORT=${port}`, parseInt(port,10)!==5000 ? 'expected 5000 for local' : undefined);
  if (!['development','production','test'].includes(env)) add('NODE_ENV', 'fail', `Invalid: ${env}`);
  else add('NODE_ENV', 'pass', env);
  try { new URL(front); add('FRONTEND_URL', front === 'http://localhost:3000' ? 'pass' : 'warn', front, front!=='http://localhost:3000' ? 'expected http://localhost:3000' : undefined); } catch { add('FRONTEND_URL', 'fail', `Invalid: ${front}`); }
  const expJwt = process.env.JWT_EXPIRES_IN || '';
  const expRef = process.env.JWT_REFRESH_EXPIRES_IN || '';
  add('JWT_EXPIRES_IN', /^[0-9]+[smhd]$/.test(expJwt) ? 'pass' : 'warn', expJwt);
  add('JWT_REFRESH_EXPIRES_IN', /^[0-9]+[smhd]$/.test(expRef) ? 'pass' : 'warn', expRef);
}

async function main() {
  console.log('\n🔍 CareerCode Academy — Environment Validation\n' + '='.repeat(60));
  // Zod schema check first
  const status = getEnvStatus();
  const invalid = status.filter(s=>!s.valid);
  if (invalid.length === 0) console.log('✅ Zod schema: all variables valid format\n');
  else {
    console.log(`⚠️  Zod schema: ${invalid.length} issue(s):`);
    invalid.forEach(s => console.log(`  - ${s.key}: ${s.error}`));
    console.log('');
  }

  // Detailed checks
  testApp();
  await testDatabase();
  testJwt();
  testBrevo();
  testPaystack();
  testGoogle();
  await testS3();
  testCloudflare();

  // Print report
  console.log('\n' + '='.repeat(60));
  console.log('📊 Detailed Checks:\n');
  const icon: Record<Check['status'], string> = { pass: '✅', fail: '❌', warn: '⚠️ ', skip: '⏭️ ' };
  let pass=0, fail=0, warn=0;
  for (const c of checks) {
    if (c.status==='pass') pass++;
    if (c.status==='fail') fail++;
    if (c.status==='warn') warn++;
    const line = `${icon[c.status]} ${c.name.padEnd(28)} ${c.message}`;
    console.log(line);
    if (c.detail) console.log(`   ↳ ${c.detail}`);
  }
  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${pass} passed, ${warn} warnings, ${fail} failed, ${checks.length} total`);
  if (fail>0) console.log('❌ Fix failed checks before production deploy.');
  else if (warn>0) console.log('⚠️  Warnings are ok for development but review for prod.');
  else console.log('✅ All good!');
  console.log('='.repeat(60)+'\n');

  // Frontend check hint
  console.log('💡 Frontend env should be in frontend/.env:');
  console.log('   VITE_API_URL=http://localhost:5000/api/v1');
  console.log('   VITE_PAYSTACK_PUBLIC_KEY=pk_test_...\n');

  process.exit(fail>0 ? 1 : 0);
}

main().catch(e=>{ console.error(e); process.exit(1); });
