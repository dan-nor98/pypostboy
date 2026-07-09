import { test, expect } from '@playwright/test';
import { assertImportedRequestFields, createCollectionAndRequest, curlPayload, enterGuestMode, importCurlText, mockClientProxy, mockCurlImport } from './helpers/postboy-fixtures.mjs';

test('guest dashboard imports cURL, sends through client proxy, and does not persist snapshots', async ({ page }) => {
  const proxyCalls = await mockClientProxy(page);
  const echoUrl = 'https://api.example.test/echo';
  await mockCurlImport(page, echoUrl);

  await enterGuestMode(page);
  await createCollectionAndRequest(page, 'Guest API collection');
  await importCurlText(page, curlPayload(echoUrl));
  await assertImportedRequestFields(page, echoUrl);

  await page.getByRole('button', { name: /^send$/i }).click();
  await expect(page.getByTestId('response-pane')).toContainText('Status 207 Multi-Status');
  await expect(page.getByTestId('response-headers')).toContainText('x-client-proxy: mocked');
  await expect(page.getByTestId('response-body')).toContainText('hello from playwright');
  expect(proxyCalls).toHaveLength(1);
  expect(proxyCalls[0]).toMatchObject({ method: 'POST', url: `${echoUrl}?source=playwright&enabled=true` });

  await page.getByRole('button', { name: /save snapshot/i }).click();
  await expect(page.getByTestId('snapshots-panel')).toContainText('No saved response history for this request.');
  await expect(page.getByTestId('snapshot-row')).toHaveCount(0);
});
