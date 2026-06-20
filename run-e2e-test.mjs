import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.join(__dirname, 'backend');
const FRONTEND_DIR = path.join(__dirname, 'frontend');

function httpGet(host, port, pathname = '/') {
  return new Promise((resolve) => {
    const options = { hostname: host, port, path: pathname, method: 'GET', timeout: 2000 };
    const request = http.get(options, (res) => {
      res.resume();
      resolve(true);
    });
    request.on('error', (err) => {
      if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    request.on('timeout', () => { request.destroy(); resolve(false); });
  });
}

async function waitForServer(host, port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await httpGet(host, port);
      if (result) return;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Server ${host}:${port} not ready after ${timeoutMs}ms`);
}

function log(label, data) {
  const lines = data.toString().trim().split('\n');
  for (const line of lines) {
    if (line) console.log(`[${label}] ${line}`);
  }
}

async function main() {
  console.log('═══ E2E Test Runner ═══\n');

  const backend = spawn('npx.cmd', ['tsx', 'src/index.ts'], {
    cwd: BACKEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  backend.stdout.on('data', d => log('backend', d));
  backend.stderr.on('data', d => log('backend-err', d));

  const frontend = spawn('npx.cmd', ['vite', '--host', '--port', '3000'], {
    cwd: FRONTEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  frontend.stdout.on('data', d => log('frontend', d));
  frontend.stderr.on('data', d => log('frontend-err', d));

  let exitCode = 0;

  try {
    console.log('Waiting for backend...');
    await waitForServer('localhost', 5000, 40000);
    console.log('✓ Backend ready');

    console.log('Waiting for frontend...');
    await waitForServer('localhost', 3000, 30000);
    console.log('✓ Frontend ready');

    console.log('\nRunning Playwright tests...\n');
    const pw = spawn('npx.cmd', ['playwright', 'test', '--project=exam-proctoring', '--reporter=list'], {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        BASE_URL: 'http://localhost:3000',
        API_URL: 'http://localhost:5000/api/v1',
      },
    });

    exitCode = await new Promise((resolve) => {
      pw.on('close', resolve);
      pw.on('error', () => resolve(1));
    });
  } catch (err) {
    console.error('Error:', err.message);
    exitCode = 1;
  } finally {
    console.log('\nCleanup...');
    backend.kill();
    frontend.kill();
    // Give processes time to cleanup
    await new Promise(r => setTimeout(r, 2000));
    try {
      spawn('taskkill', ['/F', '/IM', 'node.exe', '/T'], { stdio: 'ignore' });
    } catch {}
  }

  console.log(`\nExit code: ${exitCode}`);
  process.exit(exitCode);
}

main();
