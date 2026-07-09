from pathlib import Path


MAIN_JS = Path("public/js/main.js")


def read_main_js():
    return MAIN_JS.read_text(encoding="utf-8")


def test_form_data_send_request_builds_real_form_data_and_server_contract():
    source = read_main_js()
    form_data_start = source.index("} else if (bodyType === 'form-data')")
    form_data_end = source.index("}\n        }\n\n        var payload", form_data_start)
    form_data_block = source[form_data_start:form_data_end]

    assert "var fd = new FormData();" in form_data_block
    assert "fd.append(k, v);" in form_data_block
    assert "body = fd;" in form_data_block
    assert "JSON.stringify(fd)" not in form_data_block
    assert "formData.push({ key: k, value: v });" in form_data_block

    proxy_start = source.index("function buildServerProxyPayload")
    proxy_end = source.index("async function executeRequest", proxy_start)
    proxy_block = source[proxy_start:proxy_end]

    assert "delete proxyPayload.body;" in proxy_block
    assert "proxyPayload.formData" in proxy_block


def test_client_mode_does_not_set_content_type_for_form_data():
    source = read_main_js()
    headers_start = source.index("function buildClientFetchHeaders")
    headers_end = source.index("function headersToObject", headers_start)
    headers_block = source[headers_start:headers_end]

    assert "var isMultipartFormData = contentType === 'multipart/form-data';" in headers_block
    assert "normalizedName === 'content-type'" in headers_block
    assert "if (contentType && !isMultipartFormData" in headers_block


def test_form_body_editor_is_visible_for_urlencoded_and_multipart_bodies():
    source = read_main_js()
    visibility_start = source.index("function updateBodyEditorsVisibility")
    visibility_end = source.index("// ─── Mobile Response Bottom Sheet", visibility_start)
    visibility_block = source[visibility_start:visibility_end]

    assert "formDataContainer.style.display = isForm ? '' : 'none';" in visibility_block
