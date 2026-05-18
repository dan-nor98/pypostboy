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
