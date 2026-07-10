import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_form_data_send_request_builds_real_form_data_and_server_contract():
    run_node(
        """
        import assert from 'node:assert/strict';
        import {
          buildClientFetchOptions,
          buildServerProxyPayload,
        } from './frontend/src/features/requests/requestPayload.js';

        const state = {
          method: 'POST',
          url: 'https://api.example.test/upload',
          params: [],
          headers: [],
          body_type: 'form-data',
          body_content: '',
          form_data: [{ key: 'file', value: '@avatar.png' }],
          auth_type: 'none',
          auth_config: {},
        };

        const client = buildClientFetchOptions(state, 'omit');
        assert.equal(client.options.body instanceof FormData, true);
        assert.equal(client.options.headers['Content-Type'], undefined);

        const proxy = buildServerProxyPayload(state);
        assert.equal(Object.hasOwn(proxy, 'body'), false);
        assert.equal(proxy.contentType, 'multipart/form-data');
        assert.deepEqual(proxy.formData, [{ key: 'file', value: '@avatar.png' }]);
      """
    )


def test_client_mode_sets_content_type_for_urlencoded_but_not_multipart():
    run_node(
        """
        import assert from 'node:assert/strict';
        import { buildClientFetchOptions } from './frontend/src/features/requests/requestPayload.js';

        const base = {
          method: 'POST',
          url: 'https://api.example.test/search',
          params: [],
          headers: [],
          body_content: '',
          form_data: [{ key: 'q', value: 'postboy' }],
          auth_type: 'none',
          auth_config: {},
        };

        const urlencoded = buildClientFetchOptions({ ...base, body_type: 'form-urlencoded' }, 'omit');
        assert.equal(urlencoded.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
        assert.equal(urlencoded.options.body instanceof URLSearchParams, true);

        const multipart = buildClientFetchOptions({ ...base, body_type: 'form-data' }, 'omit');
        assert.equal(multipart.options.headers['Content-Type'], undefined);
        assert.equal(multipart.options.body instanceof FormData, true);
      """
    )


def test_form_body_editor_is_visible_for_urlencoded_and_multipart_bodies():
    const_source = "const showForm = ['form-urlencoded', 'form-data'].includes(bodyType);"
    source = open("frontend/src/pages/workspaceController.js", encoding="utf-8").read()

    assert const_source in source
    assert "$('#formDataContainer').hidden = !showForm;" in source
