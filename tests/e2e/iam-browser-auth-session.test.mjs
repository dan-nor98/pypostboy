import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const PORT = Number(process.env.IAM_E2E_PORT || 3211);
const BASE_URL = `http://127.0.0.1:${PORT}`;

class BrowserSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  rememberCookies(response) {
    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookie) {
      const [pair] = cookie.split(';');
      const splitAt = pair.indexOf('=');
      if (splitAt > 0) this.cookies.set(pair.slice(0, splitAt), pair.slice(splitAt + 1));
    }
  }

  async fetch(pathname, options = {}) {
    const headers = new Headers(options.headers || {});
    const cookies = this.cookieHeader();
    if (cookies) headers.set('Cookie', cookies);
    const response = await fetch(`${this.baseUrl}${pathname}`, { ...options, headers });
    this.rememberCookies(response);
    return response;
  }

  async json(pathname, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const csrfToken = this.cookies.get('csrftoken');
    if (csrfToken && !headers.has('X-CSRFToken')) headers.set('X-CSRFToken', csrfToken);
    return this.fetch(pathname, { ...options, headers });
  }
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/csrf`);
      if (response.ok) return;
    } catch (err) {
      lastError = err;
    }
    await delay(500);
  }
  throw new Error(`Django test server did not become ready: ${lastError?.message || 'timeout'}`);
}

async function assertStatus(response, expected, message) {
  if (response.status !== expected) {
    const body = await response.text();
    assert.equal(response.status, expected, `${message}\nResponse body:\n${body.slice(0, 2000)}`);
  }
}

async function withDjangoServer(fn) {
  const tmp = await mkdtemp(path.join(tmpdir(), 'postboy-iam-e2e-'));
  const dbPath = path.join(tmp, 'postboy-iam-e2e.sqlite3');
  const server = spawn('python', ['app.py'], {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: {
      ...process.env,
      PORT: String(PORT),
      POSTBOY_CONFIG: 'testing',
      POSTBOY_TEST_DB_PATH: dbPath,
      POSTBOY_DB_PATH: dbPath,
      POSTBOY_DJANGO_DB_PATH: dbPath,
      ALLOWED_HOSTS: '127.0.0.1,localhost',
      SESSION_COOKIE_SECURE: 'false',
      CSRF_COOKIE_SECURE: 'false',
      PYTHONUNBUFFERED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  let output = '';
  server.stdout.on('data', (chunk) => { output += chunk; });
  server.stderr.on('data', (chunk) => { output += chunk; });

  try {
    await waitForServer(BASE_URL);
    await fn();
  } catch (err) {
    console.error(`\nDjango server output:\n${output}`);
    throw err;
  } finally {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch (_err) {
      server.kill('SIGTERM');
    }
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      delay(2_000).then(() => {
        try { process.kill(-server.pid, 'SIGKILL'); } catch (_err) { server.kill('SIGKILL'); }
      }),
    ]);
    await rm(tmp, { recursive: true, force: true });
  }
}

test('IAM session auth works only after browser register/login and is cleared by logout', async () => {
  await withDjangoServer(async () => {
    const browser = new BrowserSession(BASE_URL);
    const username = `iam_e2e_${Date.now()}`;
    const password = 'correct horse battery staple';

    const appShell = await browser.fetch('/');
    await assertStatus(appShell, 200, 'served app should be reachable from Django');

    const csrf = await browser.json('/api/auth/csrf');
    await assertStatus(csrf, 200, 'browser can obtain a CSRF cookie for session auth');
    assert.ok(browser.cookies.has('csrftoken'), 'CSRF endpoint should set csrftoken cookie');

    const anonymousProtected = await browser.json('/api/collections');
    await assertStatus(anonymousProtected, 401, 'protected API rejects anonymous browser session');

    const register = await browser.json('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email: `${username}@example.test` }),
    });
    await assertStatus(register, 201, 'UI registration path should create a session');
    assert.ok(browser.cookies.has('sessionid'), 'registration should set a Django session cookie');

    const registeredProtected = await browser.json('/api/collections');
    await assertStatus(registeredProtected, 200, 'protected API accepts session established by registration');

    const logout = await browser.json('/api/auth/logout', { method: 'POST' });
    await assertStatus(logout, 200, 'UI logout path should succeed');

    const afterLogoutProtected = await browser.json('/api/collections');
    await assertStatus(afterLogoutProtected, 401, 'protected API rejects the browser session after logout');

    const login = await browser.json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await assertStatus(login, 200, 'UI login path should create a new session');

    const afterLoginProtected = await browser.json('/api/collections');
    await assertStatus(afterLoginProtected, 200, 'protected API accepts session established by login');
  });
});
