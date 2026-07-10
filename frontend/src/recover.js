import './styles/index.css';
import { renderRecoveryPage } from './pages/RecoveryPage.js';
import { resetRecovery, verifyRecovery } from './state/user.js';

document.querySelector('#root').innerHTML = renderRecoveryPage();

const statusEl = document.getElementById('recoveryStatus');
const identityEl = document.getElementById('recoverIdentity');
const keyEl = document.getElementById('recoverKey');
const passwordEl = document.getElementById('recoverNewPassword');
const verifyBtn = document.getElementById('recoverVerifyBtn');
const resetBtn = document.getElementById('recoverResetBtn');

function setStatus(text, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = text || '';
  statusEl.classList.toggle('auth-error', isError);
}

verifyBtn?.addEventListener('click', async () => {
  try {
    await verifyRecovery({
      username: identityEl.value.trim(),
      recovery_key: keyEl.value,
    });
    setStatus('Recovery key verified. You can now reset your password.');
  } catch (err) {
    setStatus(`Recovery verification failed: ${err.message}`, true);
  }
});

resetBtn?.addEventListener('click', async () => {
  try {
    const result = await resetRecovery({
      username: identityEl.value.trim(),
      recovery_key: keyEl.value,
      new_password: passwordEl.value,
    });
    setStatus(`Password reset. Save your rotated recovery key: ${result.recovery_key}`);
    passwordEl.value = '';
  } catch (err) {
    setStatus(`Password reset failed: ${err.message}`, true);
  }
});
