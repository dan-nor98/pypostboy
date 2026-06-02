import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_dashboard_auth_flow_uses_rotated_csrf_cookie_for_logout():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { readFileSync } from 'node:fs';
        import ts from './frontend/node_modules/typescript/lib/typescript.js';

        const source = readFileSync('./frontend/src/dashboard/adapters.ts', 'utf8');
        const { outputText } = ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ES2022,
            target: ts.ScriptTarget.ES2022,
            importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
          },
        });
        const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64');

        const storage = () => {
          const values = new Map();
          return {
            getItem(key) { return values.has(key) ? values.get(key) : null; },
            setItem(key, value) { values.set(key, String(value)); },
            removeItem(key) { values.delete(key); },
          };
        };

        globalThis.window = { sessionStorage: storage(), localStorage: storage() };
        globalThis.document = { cookie: '' };

        const calls = [];
        globalThis.fetch = async (path, options = {}) => {
          const headers = options.headers || {};
          calls.push({ path, method: options.method || 'GET', csrf: headers['X-CSRFToken'] });

          if (path === '/api/auth/csrf') {
            assert.equal(options.method || 'GET', 'GET');
            assert.equal(headers['X-CSRFToken'], undefined);
            document.cookie = 'csrftoken=initial-token';
            return jsonResponse(200, { success: true, data: { csrf_token: 'initial-token' } });
          }

          if (path === '/api/auth/register') {
            assert.equal(options.method, 'POST');
            assert.equal(headers['X-CSRFToken'], 'initial-token');
            document.cookie = 'csrftoken=rotated-register-token';
            return jsonResponse(201, {
              success: true,
              data: {
                user: {
                  id: 1,
                  username: 'csrf-rotation-user',
                  email: null,
                  auth_provider: 'local',
                  is_guest: false,
                },
                recovery_key: 'recovery-key',
              },
            });
          }

          if (path === '/api/auth/logout') {
            assert.equal(options.method, 'POST');
            assert.equal(headers['X-CSRFToken'], 'rotated-register-token');
            document.cookie = 'csrftoken=rotated-logout-token';
            return jsonResponse(200, { success: true, data: { username: 'local_user', is_guest: true } });
          }

          throw new Error(`Unexpected fetch: ${path}`);
        };

        function jsonResponse(status, payload) {
          return {
            ok: status >= 200 && status < 300,
            status,
            text: async () => JSON.stringify(payload),
          };
        }

        const adapters = await import(moduleUrl);
        await adapters.register({ username: 'csrf-rotation-user', password: 'password123' });
        await adapters.logout();

        assert.deepEqual(
          calls.map(({ path, method, csrf }) => ({ path, method, csrf })),
          [
            { path: '/api/auth/csrf', method: 'GET', csrf: undefined },
            { path: '/api/auth/register', method: 'POST', csrf: 'initial-token' },
            { path: '/api/auth/logout', method: 'POST', csrf: 'rotated-register-token' },
          ],
        );
        """
    )
