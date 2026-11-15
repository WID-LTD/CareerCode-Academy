#!/usr/bin/env node
/**
 * Small production contract check. It verifies the public API and the
 * authenticated endpoints that previously returned 404 because a route was
 * missing or shadowed. Run against any environment with API_BASE.
 */
const API = process.env.API_BASE || 'https://api.careercode.com.ng';
const WEB = process.env.WEB_BASE || 'https://careercode.com.ng';

const checks = [
  ['GET', `${API}/health`, 200],
  ['GET', `${API}/api/v1/public/course-categories`, 200],
  ['GET', `${API}/api/v1/courses?limit=1`, 200],
  ['GET', `${API}/api/v1/courses/instructor`, 401],
  ['GET', `${API}/api/v1/instructor/courses`, 401],
  ['GET', `${API}/api/v1/instructor/certificates`, 401],
  ['GET', `${API}/api/v1/instructor/earnings`, 401],
  ['POST', `${API}/api/v1/career-goals/backend-developer/enroll`, 401],
  ['GET', `${API}/api/v1/lessons/00000000-0000-4000-8000-000000000000/study-pack`, 401],
  ['POST', `${API}/api/v1/payments/webhook`, 401],
  ['GET', `${WEB}/courses`, 200],
  ['GET', `${WEB}/trial`, 200],
  ['GET', `${WEB}/community`, 200],
  ['GET', `${WEB}/contact`, 200],
];

let failed = 0;
for (const [method, url, expected] of checks) {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
    const ok = res.status === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${method} ${url} -> ${res.status} (expected ${expected})`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`FAIL ${method} ${url} -> ${e.message}`);
    failed++;
  }
}
console.log(`${checks.length - failed}/${checks.length} contract checks passed`);
process.exitCode = failed ? 1 : 0;
