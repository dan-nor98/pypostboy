import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const port = Number(process.env.PORT || 3001);
const e2eDbPath = path.join(process.cwd(), '.tmp', 'postboy-e2e.sqlite3');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'mkdir -p .tmp && rm -f .tmp/postboy-e2e.sqlite3 && python app.py',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ...process.env,
      PORT: String(port),
      POSTBOY_DB_PATH: e2eDbPath,
      POSTBOY_DJANGO_DB_PATH: e2eDbPath,
      POSTBOY_TEST_DB_PATH: e2eDbPath,
      POSTBOY_CONFIG: 'testing',
      ALLOWED_HOSTS: 'localhost,127.0.0.1,[::1]',
      CSRF_TRUSTED_ORIGINS: `http://127.0.0.1:${port},http://localhost:${port}`,
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
