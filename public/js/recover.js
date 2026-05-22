import { resetRecovery, verifyRecovery } from './state/user.js';

document.addEventListener('DOMContentLoaded', function() {
    var statusEl = document.getElementById('recoveryStatus');
    var identityEl = document.getElementById('recoverIdentity');
    var keyEl = document.getElementById('recoverKey');
    var passwordEl = document.getElementById('recoverNewPassword');
    var verifyBtn = document.getElementById('recoverVerifyBtn');
    var resetBtn = document.getElementById('recoverResetBtn');

    function setStatus(text, isError) {
        if (!statusEl) return;
        statusEl.textContent = text || '';
        statusEl.classList.toggle('auth-error', !!isError);
    }

    if (verifyBtn) verifyBtn.addEventListener('click', async function() {
        try {
            await verifyRecovery({
                username: identityEl.value.trim(),
                recovery_key: keyEl.value
            });
            setStatus('Recovery key verified. You can now reset your password.', false);
        } catch (err) {
            setStatus('Recovery verification failed: ' + err.message, true);
        }
    });

    if (resetBtn) resetBtn.addEventListener('click', async function() {
        try {
            var result = await resetRecovery({
                username: identityEl.value.trim(),
                recovery_key: keyEl.value,
                new_password: passwordEl.value
            });
            setStatus('Password reset. Save your rotated recovery key: ' + result.recovery_key, false);
            passwordEl.value = '';
        } catch (err) {
            setStatus('Password reset failed: ' + err.message, true);
        }
    });
});
