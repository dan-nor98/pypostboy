import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_continue_as_guest_sets_local_guest_user_without_network_roundtrip():
    run_node(
        """
        import assert from 'node:assert/strict';
        import { continueAsGuest, userState } from './frontend/src/state/user.js';

        const storage = new Map();
        globalThis.sessionStorage = {
          getItem(key) { return storage.has(key) ? storage.get(key) : null; },
          setItem(key, value) { storage.set(key, String(value)); },
          removeItem(key) { storage.delete(key); },
        };
        globalThis.fetch = async () => {
          throw new Error('continueAsGuest should not call the network');
        };

        const user = await continueAsGuest();

        assert.equal(user.username, 'Guest');
        assert.equal(user.is_guest, true);
        assert.equal(userState.explicitGuest, true);
        assert.equal(storage.get('postboy_explicit_guest'), 'true');
        """
    )
