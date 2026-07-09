import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const port = Number(process.env.PLAYWRIGHT_DJANGO_PORT || 3212);
const tmp = mkdtempSync(path.join(tmpdir(), 'postboy-playwright-'));
const dbPath = path.join(tmp, 'postboy-playwright.sqlite3');

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /.*\.spec\.mjs/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'python app.py',
    url: `http://127.0.0.1:${port}/api/auth/csrf`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      PORT: String(port),
      POSTBOY_CONFIG: 'testing',
      POSTBOY_TEST_DB_PATH: dbPath,
      POSTBOY_DB_PATH: dbPath,
      POSTBOY_DJANGO_DB_PATH: dbPath,
      ALLOWED_HOSTS: '127.0.0.1,localhost',
      SESSION_COOKIE_SECURE: 'false',
      CSRF_COOKIE_SECURE: 'false',
      PYTHONUNBUFFERED: '1',
    },
  },
});
