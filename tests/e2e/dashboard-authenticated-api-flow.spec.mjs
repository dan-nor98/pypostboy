import { test, expect } from '@playwright/test';
import { assertImportedRequestFields, createCollectionAndRequest, curlPayload, importCurlText, registerUser, selectRequestRow, startEchoServer } from './helpers/postboy-fixtures.mjs';

test('authenticated dashboard sends through server proxy and persists response snapshots', async ({ page, context, baseURL }) => {
  const echo = await startEchoServer();
  try {
    await registerUser(context.request, baseURL);
    await page.addInitScript(() => window.sessionStorage.setItem('postboy_proxy_mode', 'server'));
    await page.goto('/dashboard/');
    await expect(page.getByTestId('signed-in-auth-state')).toBeVisible();

    await createCollectionAndRequest(page, 'Authenticated API collection');
    await importCurlText(page, curlPayload(echo.url));
    await assertImportedRequestFields(page, echo.url);
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText('Request saved.')).toBeVisible();

    await page.getByRole('button', { name: /^send$/i }).click();
    await expect(page.getByTestId('response-pane')).toContainText('Status 202 Accepted');
    await expect(page.getByTestId('response-headers')).toContainText('x-echo-mode: playwright');
    await expect(page.getByTestId('response-body')).toContainText('hello from playwright');
    expect(echo.requests).toHaveLength(1);
    expect(echo.requests[0]).toMatchObject({ method: 'POST', url: '/echo?source=playwright&enabled=true' });
    expect(echo.requests[0].headers['x-trace-id']).toBe('e2e-trace');

    await page.getByRole('button', { name: /save snapshot/i }).click();
    await expect(page.getByTestId('snapshots-panel').getByTestId('snapshot-row')).toHaveCount(1);

    await page.reload();
    await selectRequestRow(page);
    await expect(page.getByTestId('snapshots-panel').getByTestId('snapshot-row')).toHaveCount(1);
    await expect(page.getByTestId('snapshot-row').first()).toContainText('Status 202 Accepted');
  } finally {
    await echo.close();
  }
});
