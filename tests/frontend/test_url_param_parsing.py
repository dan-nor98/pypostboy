import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_sync_params_from_url_keeps_malformed_percent_encoded_values():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { readFileSync } from 'node:fs';

        const source = readFileSync('./public/js/main.js', 'utf8');
        const helperStart = source.indexOf('function safeDecodeURIComponent');
        const syncEnd = source.indexOf('function syncUrlFromParams', helperStart);
        assert.notEqual(helperStart, -1);
        assert.notEqual(syncEnd, -1);
        const paramsCode = source.slice(helperStart, syncEnd);

        const createHarness = new Function(`
            let updatingUrlFromParams = false;
            let updatingParamsFromUrl = false;
            const rows = [];
            const urlInput = { value: '' };
            const paramsBody = {
                _html: '',
                get innerHTML() { return this._html; },
                set innerHTML(value) { this._html = value; rows.length = 0; },
                querySelectorAll(selector) {
                    if (selector !== 'tr') return [];
                    return rows.map(function(row) {
                        return {
                            querySelector: function(selector) {
                                if (selector === '.param-key') return { value: row.key };
                                if (selector === '.param-desc') return { value: row.desc };
                                return null;
                            }
                        };
                    });
                }
            };
            function addParamRow(key, value, desc, enabled) {
                rows.push({ key: key, value: value, desc: desc, enabled: enabled });
            }
            ${paramsCode}
            return {
                parse: function(url) {
                    urlInput.value = url;
                    syncParamsFromUrl();
                    return rows.map(function(row) {
                        return { key: row.key, value: row.value, desc: row.desc, enabled: row.enabled };
                    });
                }
            };
        `);

        const harness = createHarness();
        assert.deepEqual(harness.parse('https://example.test?a=%'), [
            { key: 'a', value: '%', desc: '', enabled: true },
        ]);
        assert.deepEqual(harness.parse('?bad=%E0%A4%A'), [
            { key: 'bad', value: '%E0%A4%A', desc: '', enabled: true },
        ]);
        """
    )


def test_sync_params_from_url_safely_decodes_malformed_key_without_value_separator():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { readFileSync } from 'node:fs';

        const source = readFileSync('./public/js/main.js', 'utf8');
        const helperStart = source.indexOf('function safeDecodeURIComponent');
        const syncEnd = source.indexOf('function syncUrlFromParams', helperStart);
        const paramsCode = source.slice(helperStart, syncEnd);

        const createHarness = new Function(`
            let updatingUrlFromParams = false;
            let updatingParamsFromUrl = false;
            const rows = [];
            const urlInput = { value: '' };
            const paramsBody = {
                set innerHTML(value) { rows.length = 0; },
                querySelectorAll: function() { return []; }
            };
            function addParamRow(key, value, desc, enabled) {
                rows.push({ key: key, value: value, desc: desc, enabled: enabled });
            }
            ${paramsCode}
            return {
                parse: function(url) {
                    urlInput.value = url;
                    syncParamsFromUrl();
                    return rows;
                }
            };
        `);

        assert.deepEqual(createHarness().parse('?%E0%A4%A'), [
            { key: '%E0%A4%A', value: '', desc: '', enabled: true },
        ]);
        """
    )
