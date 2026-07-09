import { expect, test, type Page } from '@playwright/test';

function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function expectLoginUi(page: Page) {
  await expect(page.locator('#loginScreen')).toBeVisible();
  await expect(page.locator('#authUsername')).toBeVisible();
  await expect(page.locator('#authPassword')).toBeVisible();
  await expect(page.locator('#loginBtn')).toBeVisible();
  await expect(page.locator('#registerBtn')).toBeVisible();
}

async function fillCredentials(page: Page, username: string, password: string) {
  await page.locator('#authUsername').fill(username);
  await page.locator('#authPassword').fill(password);
}

async function closeRecoveryModalIfOpen(page: Page) {
  const modal = page.locator('#registerSuccessModal.show');
  await modal.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  if (!(await modal.isVisible())) return;

  await page.locator('#registerRecoveryAcknowledge').check();
  await page.locator('#registerRecoveryCloseBtn').click();
  await expect(modal).toBeHidden();
}

async function register(page: Page, username: string, password: string) {
  await fillCredentials(page, username, password);
  await page.locator('#registerBtn').click();
  await expect(page.locator('#appContainer')).toBeVisible();
  await closeRecoveryModalIfOpen(page);
}

async function login(page: Page, username: string, password: string) {
  await fillCredentials(page, username, password);
  await page.locator('#loginBtn').click();
  await expect(page.locator('#appContainer')).toBeVisible();
}

async function logout(page: Page) {
  await page.locator('#logoutBtn').click();
  await expect(page.locator('#loginScreen')).toBeVisible();
}

async function createCollection(page: Page, name: string) {
  await page.locator('#newCollectionBtn').click();
  await expect(page.locator('#newCollectionModal')).toHaveClass(/active/);
  await page.locator('#newColName').fill(name);
  await page.locator('#newColSaveBtn').click();
  await expect(page.locator('#newCollectionModal')).not.toHaveClass(/active/);
  await expect(page.locator('#collectionList')).toContainText(name);
}

async function createRequestInCollection(page: Page, collectionName: string, requestName: string) {
  const collectionHeader = page.locator('#collectionList .folder-header', { hasText: collectionName }).first();
  await collectionHeader.click();
  await collectionHeader.click({ button: 'right' });
  await page.locator('#contextMenu .context-menu-item[data-action="add-request"]').click();
  await expect(page.locator('#requestModal')).toHaveClass(/active/);
  await page.locator('#reqNameInput').fill(requestName);
  await page.locator('#reqSaveBtn').click();
  await expect(page.locator('#requestModal')).not.toHaveClass(/active/);
  await expect(page.locator('#collectionList')).toContainText(requestName);
}

test.describe('PostBoy authenticated workspace', () => {
  test('registers users, persists user-scoped requests, clears visible state on logout, isolates accounts, and bootstraps CSRF', async ({ page, context }) => {
    const password = 'password123';
    const userOne = uniqueName('e2e-user-one');
    const userTwo = uniqueName('e2e-user-two');
    const collectionName = uniqueName('E2E Collection');
    const requestName = uniqueName('E2E Request');
    const csrfCalls: Array<{ url: string; method: string }> = [];

    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/csrf')) {
        csrfCalls.push({ url: request.url(), method: request.method() });
      }
    });

    await page.goto('/');
    await expectLoginUi(page);

    await register(page, userOne, password);
    await expect(page.locator('#appAuthStatus')).toContainText(userOne);
    await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === 'sessionid')).toBe(true);
    expect(csrfCalls.length).toBeGreaterThanOrEqual(1);

    await createCollection(page, collectionName);
    await createRequestInCollection(page, collectionName, requestName);
    await expect(page.locator('#collectionList')).toContainText(collectionName);
    await expect(page.locator('#collectionList')).toContainText(requestName);

    await logout(page);
    await expect(page.locator('#collectionList')).not.toContainText(collectionName);
    await expect(page.locator('#collectionList')).not.toContainText(requestName);

    await login(page, userOne, password);
    await expect(page.locator('#collectionList')).toContainText(collectionName);
    await expect(page.locator('#collectionList')).toContainText(requestName);

    await logout(page);
    await register(page, userTwo, password);
    await expect(page.locator('#appAuthStatus')).toContainText(userTwo);
    await expect(page.locator('#collectionList')).not.toContainText(collectionName);
    await expect(page.locator('#collectionList')).not.toContainText(requestName);
    expect(csrfCalls.map((call) => call.method)).toContain('GET');
  });
});
