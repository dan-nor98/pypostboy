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


def test_apply_parsed_import_payload_preserves_json_body_in_editor_state():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { applyParsedImportPayload } from './public/js/features/import-export.js';

        const payload = {
            method: 'POST',
            url: 'https://api.example.test/widgets',
            headers: [{ key: 'Content-Type', value: 'application/json' }],
            body_type: 'json',
            body_content: '{"name":"Ada"}',
            form_data: [],
        };
        const calls = [];
        const editorState = {
            method: 'GET',
            url: '',
            bodyType: 'none',
            bodyContent: '',
            formData: [{ key: 'stale', value: 'field' }],
        };
        const editor = {
            setMethod(method) {
                calls.push(['setMethod', method]);
                editorState.method = method;
            },
            setUrl(url) {
                calls.push(['setUrl', url]);
                editorState.url = url;
            },
            syncParamsFromUrl() {},
            clearHeaders() {},
            addHeaderRow() {},
            ensureHeaderRow() {},
            setBodyType(bodyType) {
                calls.push(['setBodyType', bodyType]);
                editorState.bodyType = bodyType;
                editorState.bodyContent = '';
            },
            setBodyContent(content) {
                calls.push(['setBodyContent', content]);
                editorState.bodyContent = content;
            },
            clearFormData() {
                calls.push(['clearFormData']);
                editorState.formData = [];
            },
            addFormDataRow(key, value) {
                calls.push(['addFormDataRow', key, value]);
                editorState.formData.push({ key, value });
            },
        };

        const parsed = applyParsedImportPayload(payload, editor);

        assert.deepEqual(parsed, payload);
        assert.ok(calls.some((call) => call[0] === 'setBodyType' && call[1] === 'json'));
        assert.ok(calls.some((call) => call[0] === 'setBodyContent' && call[1] === '{"name":"Ada"}'));
        assert.deepEqual(editorState, {
            method: 'POST',
            url: 'https://api.example.test/widgets',
            bodyType: 'json',
            bodyContent: '{"name":"Ada"}',
            formData: [],
        });
        """
    )


def test_form_urlencoded_body_content_normalizes_to_form_rows_for_preview_and_apply():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { applyParsedImportPayload, normalizeParsedImportPayload } from './public/js/features/import-export.js';

        const payload = {
            method: 'POST',
            url: 'https://api.example.test/search',
            body_type: 'form-urlencoded',
            body_content: 'q=postboy&page=2',
            form_data: [],
        };

        const parsed = normalizeParsedImportPayload(payload);
        assert.deepEqual(parsed.form_data, [
            { key: 'q', value: 'postboy' },
            { key: 'page', value: '2' },
        ]);
        assert.equal(parsed.body_content, 'q=postboy&page=2');

        const calls = [];
        const editor = {
            setMethod(method) { calls.push(['setMethod', method]); },
            setUrl(url) { calls.push(['setUrl', url]); },
            syncParamsFromUrl() { calls.push(['syncParamsFromUrl']); },
            clearHeaders() { calls.push(['clearHeaders']); },
            addHeaderRow(key, value) { calls.push(['addHeaderRow', key, value]); },
            ensureHeaderRow() { calls.push(['ensureHeaderRow']); },
            setBodyType(bodyType) { calls.push(['setBodyType', bodyType]); },
            setBodyContent(content) { calls.push(['setBodyContent', content]); },
            clearFormData() { calls.push(['clearFormData']); },
            addFormDataRow(key, value) { calls.push(['addFormDataRow', key, value]); },
        };

        applyParsedImportPayload(payload, editor);

        assert.deepEqual(
            calls.filter((call) => call[0] === 'addFormDataRow'),
            [
                ['addFormDataRow', 'q', 'postboy'],
                ['addFormDataRow', 'page', '2'],
            ],
        );
        """
    )


def test_parse_curl_fallback_data_flags_populate_form_urlencoded_rows():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { parseCurlFallback } from './public/js/features/import-export.js';

        const dataParsed = parseCurlFallback(`curl https://api.example.test/search -d 'q=postboy&page=2'`);
        assert.equal(dataParsed.method, 'POST');
        assert.equal(dataParsed.url, 'https://api.example.test/search');
        assert.equal(dataParsed.body_type, 'form-urlencoded');
        assert.equal(dataParsed.body_content, 'q=postboy&page=2');
        assert.deepEqual(dataParsed.form_data, [
            { key: 'q', value: 'postboy' },
            { key: 'page', value: '2' },
        ]);

        const encodedParsed = parseCurlFallback(`curl https://api.example.test/search --data-urlencode 'q=Ada Lovelace'`);
        assert.equal(encodedParsed.method, 'POST');
        assert.equal(encodedParsed.url, 'https://api.example.test/search');
        assert.equal(encodedParsed.body_type, 'form-urlencoded');
        assert.equal(encodedParsed.body_content, 'q=Ada Lovelace');
        assert.deepEqual(encodedParsed.form_data, [
            { key: 'q', value: 'Ada Lovelace' },
        ]);
        """
    )


def test_form_urlencoded_body_content_decodes_percent_encoding_and_plus_spaces():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { normalizeParsedImportPayload } from './public/js/features/import-export.js';

        const parsed = normalizeParsedImportPayload({
            body_type: 'form-urlencoded',
            body_content: 'q=Ada+Lovelace&redirect=https%3A%2F%2Fexample.test%2Fdone%3Fx%3D1',
            form_data: [],
        });

        assert.deepEqual(parsed.form_data, [
            { key: 'q', value: 'Ada Lovelace' },
            { key: 'redirect', value: 'https://example.test/done?x=1' },
        ]);
        """
    )
