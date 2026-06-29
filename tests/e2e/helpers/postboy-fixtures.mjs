import { expect } from '@playwright/test';
import http from 'node:http';

export const curlPayload = (url) => `curl -X POST '${url}?source=playwright&enabled=true' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Trace-Id: e2e-trace' \\
  --data '{"message":"hello from playwright","count":2}'`;

export async function registerUser(request, baseURL, suffix = Date.now()) {
  const username = `pw_user_${suffix}`;
  const password = 'correct horse battery staple';
  const csrf = await request.get(`${baseURL}/api/auth/csrf`);
  expect(csrf.ok()).toBeTruthy();
  const response = await request.post(`${baseURL}/api/auth/register`, {
    data: { username, password, email: `${username}@example.test` },
  });
  expect(response.status()).toBe(201);
  return { username, password };
}

export async function enterGuestMode(page) {
  await page.goto('/dashboard/');
  await page.getByRole('button', { name: /continue as guest/i }).click();
  await expect(page.getByTestId('signed-in-auth-state')).toContainText('Guest');
}

export async function createCollectionAndRequest(page, collectionName) {
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Collection name');
    await dialog.accept(collectionName);
  });
  await page.getByTestId('collections-panel').getByRole('button', { name: /collection/i }).click();
  await expect(page.getByTestId('collection-row').filter({ hasText: collectionName })).toBeVisible();
  await page.getByTestId('collections-panel').getByRole('button', { name: /request/i }).click();
  await expect(page.getByTestId('request-url-input')).toBeVisible();
}

export async function importCurlText(page, curlText) {
  const panel = page.getByTestId('import-export-panel');
  await panel.getByPlaceholder(/paste postman json or curl command/i).fill(curlText);
  await panel.getByRole('button', { name: /curl/i }).click();
  await expect(page.getByTestId('request-method-select')).toHaveValue('POST');
}

export async function assertImportedRequestFields(page, echoUrl) {
  await expect(page.getByTestId('request-method-select')).toHaveValue('POST');
  await expect(page.getByTestId('request-url-input')).toHaveValue(`${echoUrl}?source=playwright&enabled=true`);
  await page.getByTestId('request-tab-params').click();
  await expect(page.getByTestId('request-builder')).toContainText('source');
  await expect(page.getByTestId('request-builder')).toContainText('playwright');
  await page.getByTestId('request-tab-headers').click();
  await expect(page.getByTestId('request-builder')).toContainText('X-Trace-Id');
  await expect(page.getByTestId('request-builder')).toContainText('e2e-trace');
  await page.getByTestId('request-tab-body').click();
  await expect(page.getByTestId('request-body-editor')).toHaveValue(/hello from playwright/);
}

export async function selectRequestRow(page, name = 'New request') {
  await page.getByTestId('collection-request-row').filter({ hasText: name }).first().click();
  await expect(page.getByTestId('request-name-input')).toHaveValue(name);
}

export async function startEchoServer() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const record = { method: req.method, url: req.url, headers: req.headers, body };
      requests.push(record);
      res.writeHead(202, { 'content-type': 'application/json', 'x-echo-mode': 'playwright' });
      res.end(JSON.stringify({ ok: true, received: record }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/echo`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}


export async function mockCurlImport(page, echoUrl) {
  await page.route('**/api/import', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.type).toBe('curl');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 0,
          collection_id: 0,
          name: 'Imported cURL Request',
          method: 'POST',
          url: `${echoUrl}?source=playwright&enabled=true`,
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }, { key: 'X-Trace-Id', value: 'e2e-trace', enabled: true }],
          params: [{ key: 'source', value: 'playwright', enabled: true }, { key: 'enabled', value: 'true', enabled: true }],
          body_type: 'raw',
          body_content: '{"message":"hello from playwright","count":2}',
          body_raw_type: 'application/json',
          form_data: [],
          auth_type: 'none',
          auth_data: {},
        },
      }),
    });
  });
}

export async function mockClientProxy(page) {
  const calls = [];
  await page.route('**/client-proxy', async (route) => {
    const payload = route.request().postDataJSON();
    calls.push(payload);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 207, statusText: 'Multi-Status', headers: { 'x-client-proxy': 'mocked' }, body: { ok: true, echoed: payload }, responseTimeMs: 12, responseSize: '128 B' }),
    });
  });
  return calls;
}
