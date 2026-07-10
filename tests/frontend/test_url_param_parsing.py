import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_parse_query_params_from_url_keeps_malformed_percent_encoded_values():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { parseQueryParamsFromUrl } from './frontend/src/utils/urlParams.js';

        assert.deepEqual(parseQueryParamsFromUrl('https://example.test?a=%'), [
            { key: 'a', value: '%', description: '', enabled: true },
        ]);
        assert.deepEqual(parseQueryParamsFromUrl('?bad=%E0%A4%A'), [
            { key: 'bad', value: '%E0%A4%A', description: '', enabled: true },
        ]);
        """
    )


def test_parse_query_params_safely_decodes_malformed_key_without_value_separator():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { parseQueryParamsFromUrl } from './frontend/src/utils/urlParams.js';

        assert.deepEqual(parseQueryParamsFromUrl('?%E0%A4%A'), [
            { key: '%E0%A4%A', value: '', description: '', enabled: true },
        ]);
        """
    )


def test_build_url_with_params_preserves_hash_and_omits_disabled_rows():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { buildUrlWithParams } from './frontend/src/utils/urlParams.js';

        assert.equal(
            buildUrlWithParams('https://example.test/path?old=1#section', [
                { enabled: true, key: 'q', value: 'hello world' },
                { enabled: false, key: 'skip', value: 'nope' },
            ]),
            'https://example.test/path?q=hello%20world#section',
        );
        """
    )
