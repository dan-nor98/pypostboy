import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_guest_storage_uses_session_storage_and_redacts_request_secrets():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
        import { tmpdir } from 'node:os';
        import { join } from 'node:path';
        import { pathToFileURL } from 'node:url';

        const source = readFileSync('./public/js/api/guest-storage.js', 'utf8');
        const tempDir = mkdtempSync(join(tmpdir(), 'guest-storage-'));
        const modulePath = join(tempDir, 'guest-storage.mjs');
        writeFileSync(modulePath, source);

        const createStorage = () => {
          const values = new Map();
          return {
            getItem(key) { return values.has(key) ? values.get(key) : null; },
            setItem(key, value) { values.set(key, String(value)); },
            removeItem(key) { values.delete(key); },
          };
        };

        globalThis.localStorage = createStorage();
        globalThis.sessionStorage = createStorage();

        const { guestStorageApi } = await import(pathToFileURL(modulePath));
        const collection = guestStorageApi.createCollection({ name: 'Secrets' });
        const request = guestStorageApi.createRequest({
          collection_id: collection.id,
          name: 'Sensitive request',
          headers: [
            { key: 'Authorization', value: 'Bearer super-secret-token' },
            { key: 'Cookie', value: 'sid=super-secret-cookie' },
            { key: 'X-Api-Key', value: 'super-secret-api-key' },
            { key: 'Accept', value: 'application/json' },
          ],
          auth_config: {
            username: 'demo',
            password: 'super-secret-password',
            bearerToken: 'super-secret-bearer',
          },
        });

        const durablePayload = localStorage.getItem('postboy_guest_workspace_v1');
        const sessionPayload = sessionStorage.getItem('postboy_guest_workspace_v1');
        assert.equal(durablePayload, null);
        assert.ok(sessionPayload);
        assert.equal(sessionPayload.includes('super-secret'), false);

        assert.deepEqual(
          request.headers.map(({ key, value }) => [key, value]),
          [
            ['Authorization', '[redacted]'],
            ['Cookie', '[redacted]'],
            ['X-Api-Key', '[redacted]'],
            ['Accept', 'application/json'],
          ],
        );
        assert.equal(request.auth_config.username, 'demo');
        assert.equal(request.auth_config.password, '[redacted]');
        assert.equal(request.auth_config.bearerToken, '[redacted]');
        """
    )
