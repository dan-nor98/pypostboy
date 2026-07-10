import { field } from '../components/common/Form.js';
import { button, linkButton } from '../components/common/Button.js';

export function renderRecoveryPage() {
  return `
    <main class="login-screen" aria-labelledby="recoveryTitle">
      <section class="login-card">
        <p class="login-kicker">Account recovery</p>
        <h1 id="recoveryTitle">Reset password</h1>
        <p class="login-subtitle">Verify your recovery key, then set a new password.</p>
        <div class="account-status login-status" id="recoveryStatus" role="status"></div>
        <div class="recovery-panel recovery-panel-visible">
          ${field({ id: 'recoverIdentity', label: 'Username or email', placeholder: 'Username or email', className: 'compact-field' })}
          ${field({ id: 'recoverKey', label: 'Recovery key', type: 'password', placeholder: 'Recovery key', className: 'compact-field' })}
          ${field({ id: 'recoverNewPassword', label: 'New password', type: 'password', placeholder: 'New password (min 8 chars)', className: 'compact-field' })}
          <div class="login-actions">
            ${button({ id: 'recoverVerifyBtn', variant: 'secondary', label: 'Verify key' })}
            ${button({ id: 'recoverResetBtn', variant: 'primary', label: 'Reset password' })}
            ${linkButton({ className: 'login-link-button', href: '/', label: 'Back to login' })}
          </div>
        </div>
      </section>
    </main>
  `;
}
