import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_login_refreshes_csrf_before_unsafe_collection_mutation():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { pathToFileURL } from 'node:url';

        const storage = () => {
          const values = new Map();
          return {
            getItem(key) { return values.has(key) ? values.get(key) : null; },
            setItem(key, value) { values.set(key, String(value)); },
            removeItem(key) { values.delete(key); },
          };
        };

        globalThis.sessionStorage = storage();
        globalThis.document = { cookie: '' };

        const calls = [];
        globalThis.fetch = async (path, options = {}) => {
          const headers = options.headers || {};
          calls.push({ path, method: options.method || 'GET', csrf: headers['X-CSRFToken'] });

          if (path === '/api/auth/csrf' && calls.length === 1) {
            document.cookie = 'csrftoken=anonymous-token';
            return jsonResponse(200, { success: true, data: { csrf_token: 'anonymous-token' } });
          }

          if (path === '/api/auth/login') {
            assert.equal(options.method, 'POST');
            assert.equal(headers['X-CSRFToken'], 'anonymous-token');
            document.cookie = 'csrftoken=stale-cookie-token';
            return jsonResponse(200, {
              success: true,
              data: { id: 1, username: 'csrf-login-user', email: null, auth_provider: 'local', is_guest: false },
            });
          }

          if (path === '/api/auth/csrf' && calls.length === 3) {
            assert.equal(headers['X-CSRFToken'], undefined);
            document.cookie = 'csrftoken=authenticated-token';
            return jsonResponse(200, { success: true, data: { csrf_token: 'authenticated-token' } });
          }

          if (path === '/api/collections') {
            assert.equal(options.method, 'POST');
            assert.equal(headers['X-CSRFToken'], 'authenticated-token');
            return jsonResponse(201, { success: true, data: { id: 1, name: 'After login' } });
          }

          throw new Error(`Unexpected fetch #${calls.length}: ${path}`);
        };

        function jsonResponse(status, payload) {
          return {
            ok: status >= 200 && status < 300,
            status,
            headers: { get() { return 'application/json'; } },
            text: async () => JSON.stringify(payload),
          };
        }

        const userModuleUrl = pathToFileURL(process.cwd() + '/frontend/src/state/user.js').href;
        const clientModuleUrl = pathToFileURL(process.cwd() + '/frontend/src/services/apiClient.js').href;
        const { loginUser } = await import(userModuleUrl);
        const { apiClient } = await import(clientModuleUrl);

        await loginUser({ username: 'csrf-login-user', password: 'password123' });
        await apiClient.createCollection({ name: 'After login' });

        assert.deepEqual(
          calls.map(({ path, method, csrf }) => ({ path, method, csrf })),
          [
            { path: '/api/auth/csrf', method: 'GET', csrf: undefined },
            { path: '/api/auth/login', method: 'POST', csrf: 'anonymous-token' },
            { path: '/api/auth/csrf', method: 'GET', csrf: undefined },
            { path: '/api/collections', method: 'POST', csrf: 'authenticated-token' },
          ],
        );
        """
    )
