import { button, linkButton } from '../components/common/Button.js';
import { field } from '../components/common/Form.js';

export function renderLoginPage() {
  return `
    <main id="loginScreen" class="login-screen" aria-labelledby="loginTitle">
      <section class="login-card">
        <div class="login-branding" aria-hidden="true">PB</div>
        <p class="login-kicker">API Testing Client</p>
        <h1 id="loginTitle">PostBoy</h1>
        <p class="login-subtitle">Sign in to sync your workspace, create an account, or continue with a temporary guest workspace.</p>
        <div class="account-status login-status" id="authStatus" role="status">Checking account...</div>
        <div class="login-fields">
          ${field({ id: 'authUsername', label: 'Username', autocomplete: 'username', placeholder: 'Username', className: 'compact-field' })}
          ${field({ id: 'authPassword', label: 'Password', type: 'password', autocomplete: 'current-password', placeholder: 'Password', className: 'compact-field' })}
        </div>
        <div class="login-actions">
          ${button({ id: 'loginBtn', variant: 'primary', label: 'Log in' })}
          ${button({ id: 'registerBtn', variant: 'secondary', label: 'Create account' })}
          ${linkButton({ id: 'forgotPasswordBtn', className: 'login-link-button', href: '/recover.html', label: 'Forgot password?' })}
          ${button({ id: 'guestLoginBtn', variant: 'ghost', label: 'Continue as guest' })}
        </div>
        <p class="login-warning" role="note">Guest mode stores request workspace data in this browser session. Avoid entering secrets; sensitive headers and auth fields are redacted before storage.</p>
      </section>
    </main>
  `;
}
