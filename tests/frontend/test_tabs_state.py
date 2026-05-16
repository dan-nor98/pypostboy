import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_open_tab_snapshots_are_scoped_to_current_user():
    run_node(
        """
        import assert from 'node:assert/strict';
        import {
            clearOpenTabsSnapshot,
            loadOpenTabsSnapshot,
            saveOpenTabsSnapshot
        } from './public/js/state/tabs.js';

        const storage = new Map();
        globalThis.localStorage = {
            getItem(key) {
                return storage.has(key) ? storage.get(key) : null;
            },
            setItem(key, value) {
                storage.set(key, String(value));
            },
            removeItem(key) {
                storage.delete(key);
            }
        };

        const userA = { id: 101, username: 'user-a' };
        const userB = { id: 202, username: 'user-b' };
        const userASnapshot = {
            activeTabId: 'tab-a',
            openTabs: [{ id: 'tab-a', label: 'User A private tab', method: 'GET' }]
        };

        localStorage.setItem('postboy_open_tabs', JSON.stringify(userASnapshot));
        saveOpenTabsSnapshot(userASnapshot, userA);

        assert.equal(
            loadOpenTabsSnapshot(userB),
            null,
            'user B must not restore user A saved tabs'
        );
        assert.equal(
            localStorage.getItem('postboy_open_tabs'),
            null,
            'legacy global tab snapshots should be cleared instead of restored across users'
        );
        assert.deepEqual(JSON.parse(loadOpenTabsSnapshot(userA)), userASnapshot);

        clearOpenTabsSnapshot(userB);
        assert.deepEqual(
            JSON.parse(loadOpenTabsSnapshot(userA)),
            userASnapshot,
            'clearing user B snapshots must not delete user A snapshots'
        );
        """
    )
