import { renderLoginPage } from './LoginPage.js';
import { renderWorkspacePage } from './WorkspacePage.js';
import { renderAppModals } from './modals.js';

export function renderAppPage() {
  return `
    ${renderLoginPage()}
    ${renderWorkspacePage()}
    ${renderAppModals()}
    <div class="loading-overlay" id="loadingOverlay" hidden>
      <div class="spinner"></div>
    </div>
  `;
}
