import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_parse_curl_fallback_handles_ansi_c_quoted_header_value():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { parseCurlFallback, tokenize } from './public/js/features/import-export.js';

        const cmd = String.raw`curl 'https://apib-prod.daricgold.com/api/plan/' -H $'access: H~C` + "`" + String.raw`''Xj{qccjLHEmA@4(' -H $'escaped: \'quoted\' \\ slash'`;
        const tokens = tokenize(cmd);
        assert.equal(tokens[3], "access: H~C`'Xj{qccjLHEmA@4(");
        assert.equal(tokens[5], "escaped: 'quoted' \\ slash");

        const parsed = parseCurlFallback(cmd);
        assert.equal(parsed.url, 'https://apib-prod.daricgold.com/api/plan/');
        assert.deepEqual(parsed.headers, [
            { key: 'access', value: "H~C`'Xj{qccjLHEmA@4(" },
            { key: 'escaped', value: "'quoted' \\ slash" },
        ]);
        """
    )


def test_parse_curl_fallback_handles_json_flag_with_space_separated_value():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { parseCurlFallback } from './public/js/features/import-export.js';

        const parsed = parseCurlFallback(`curl https://api.example.test/widgets --json '{"name":"Ada"}'`);

        assert.equal(parsed.method, 'POST');
        assert.equal(parsed.url, 'https://api.example.test/widgets');
        assert.equal(parsed.body_type, 'json');
        assert.equal(parsed.body_content, '{"name":"Ada"}');
        assert.deepEqual(parsed.headers, [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
        ]);
        """
    )


def test_parse_curl_fallback_handles_json_flag_with_equals_and_existing_headers():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { parseCurlFallback } from './public/js/features/import-export.js';

        const parsed = parseCurlFallback(`curl --request PATCH https://api.example.test/widgets/1 -H 'accept: application/vnd.api+json' -H 'content-type: application/merge-patch+json' --json={"name":"Ada"}`);

        assert.equal(parsed.method, 'PATCH');
        assert.equal(parsed.body_type, 'json');
        assert.equal(parsed.body_content, '{"name":"Ada"}');
        assert.deepEqual(parsed.headers, [
            { key: 'accept', value: 'application/vnd.api+json' },
            { key: 'content-type', value: 'application/merge-patch+json' },
        ]);
        """
    )
