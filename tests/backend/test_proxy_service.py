"""Tests for outbound proxy service behavior."""

import pytest
import requests

from pypostboy.services import proxy_service
from pypostboy.services.proxy_service import (
    ProxyConnectionError,
    ProxyTlsError,
    ProxyTimeoutError,
    proxy_http_request,
)


class FakeResponse:
    status_code = 201
    reason = "Created"
    headers = {"Content-Type": "application/json"}
    content = b'{"ok": true}'
    encoding = "utf-8"


def test_proxy_http_request_filters_headers_sets_content_type_and_serializes_response(monkeypatch):
    calls = []

    def fake_request(**kwargs):
        calls.append(kwargs)
        return FakeResponse()

    monkeypatch.setattr(proxy_service.http_requests, "request", fake_request)

    result = proxy_http_request(
        {
            "url": "https://api.example.test/widgets",
            "method": "POST",
            "headers": {"Accept": "application/json", "Empty": ""},
            "body": '{"name":"Ada"}',
            "contentType": "application/json",
        }
    )

    assert result["status"] == 201
    assert result["statusText"] == "Created"
    assert result["headers"] == {"Content-Type": "application/json"}
    assert result["body"] == '{"ok": true}'
    assert result["isJsonValid"] is True
    assert result["contentType"] == "application/json"
    assert result["bodyType"] == "json"
    assert result["isBinary"] is False
    assert result["isTruncated"] is False
    assert result["size"] == len(b'{"ok": true}')
    assert result["originalSize"] == len(b'{"ok": true}')
    assert result["truncatedSize"] == len(b'{"ok": true}')
    assert calls[0]["headers"] == {
        "Accept": "application/json",
        "Accept-Encoding": "identity",
        "Content-Type": "application/json",
    }
    assert calls[0]["data"] == '{"name":"Ada"}'
    assert calls[0]["timeout"] == 30


@pytest.mark.parametrize(
    ("content_type", "content", "expected_body_type", "expected_body", "is_binary"),
    [
        ("application/json", b'{"ok": true}', "json", '{"ok": true}', False),
        ("text/plain; charset=utf-8", b"hello\nworld", "text", "hello\nworld", False),
        ("text/html", b"<h1>Hello</h1>", "markup", "<h1>Hello</h1>", False),
        ("application/xml", b"<root><ok>true</ok></root>", "markup", "<root><ok>true</ok></root>", False),
        ("image/png", b"\x89PNG\r\n\x1a\n", "binary", "", True),
        ("application/json", b"", "empty", "", False),
        ("application/json", b"{not json", "json", "{not json", False),
        ("application/x-protobuf", b"field: value", "unsupported", "", False),
    ],
)
def test_proxy_http_request_serializes_response_bodies_by_content_type(
    monkeypatch, content_type, content, expected_body_type, expected_body, is_binary
):
    class ContentResponse:
        status_code = 200
        reason = "OK"
        headers = {"Content-Type": content_type}
        encoding = "utf-8"

        def __init__(self):
            self.content = content

    monkeypatch.setattr(proxy_service.http_requests, "request", lambda **kwargs: ContentResponse())

    result = proxy_http_request({"url": "https://api.example.test", "method": "GET"})

    assert result["contentType"] == content_type
    assert result["bodyType"] == expected_body_type
    assert result["body"] == expected_body
    assert result["isJsonValid"] is (content_type == "application/json" and content == b'{"ok": true}')
    assert result["isBinary"] is is_binary
    assert result["isTruncated"] is False
    assert result["size"] == len(content)
    assert result["originalSize"] == len(content)
    assert result["truncatedSize"] == len(content)


def test_proxy_http_request_preserves_raw_json_text_and_validity_metadata(monkeypatch):
    raw_json = '{"large":900719925474099312345,"decimal":1234567890.1234567890123456789,"unicode":"café ☃️ こんにちは","nested":[true,null]}'

    class JsonResponse:
        status_code = 200
        reason = "OK"
        headers = {"Content-Type": "application/json; charset=utf-8"}
        encoding = "utf-8"
        content = raw_json.encode("utf-8")

    monkeypatch.setattr(proxy_service.http_requests, "request", lambda **kwargs: JsonResponse())

    result = proxy_http_request({"url": "https://api.example.test", "method": "GET"})

    assert result["body"] == raw_json
    assert result["bodyType"] == "json"
    assert result["isJsonValid"] is True
    assert "900719925474099312345" in result["body"]
    assert "1234567890.1234567890123456789" in result["body"]
    assert "café ☃️ こんにちは" in result["body"]


def test_proxy_http_request_marks_invalid_json_without_replacing_raw_text(monkeypatch):
    raw_json = '{"ok": true, "broken": }'

    class InvalidJsonResponse:
        status_code = 200
        reason = "OK"
        headers = {"Content-Type": "application/json"}
        encoding = "utf-8"
        content = raw_json.encode("utf-8")

    monkeypatch.setattr(proxy_service.http_requests, "request", lambda **kwargs: InvalidJsonResponse())

    result = proxy_http_request({"url": "https://api.example.test", "method": "GET"})

    assert result["body"] == raw_json
    assert result["bodyType"] == "json"
    assert result["isJsonValid"] is False


def test_proxy_http_request_truncates_large_text_response(monkeypatch):
    class LargeResponse:
        status_code = 200
        reason = "OK"
        headers = {"Content-Type": "text/plain"}
        encoding = "utf-8"
        content = b"a" * (proxy_service.MAX_RESPONSE_BODY_BYTES + 1)

    monkeypatch.setattr(proxy_service.http_requests, "request", lambda **kwargs: LargeResponse())

    result = proxy_http_request({"url": "https://api.example.test", "method": "GET"})

    assert result["body"] == "a" * proxy_service.MAX_RESPONSE_BODY_BYTES
    assert result["isTruncated"] is True
    assert result["size"] == proxy_service.MAX_RESPONSE_BODY_BYTES
    assert result["originalSize"] == proxy_service.MAX_RESPONSE_BODY_BYTES + 1
    assert result["truncatedSize"] == proxy_service.MAX_RESPONSE_BODY_BYTES


def test_proxy_http_request_returns_binary_metadata_without_body_bytes(monkeypatch):
    binary_body = b"\x89PNG\r\n\x1a\n" + (b"raw-bytes" * 4)

    class BinaryResponse:
        status_code = 200
        reason = "OK"
        headers = {"Content-Type": "application/octet-stream", "Content-Length": str(len(binary_body))}
        encoding = None
        content = binary_body

    monkeypatch.setattr(proxy_service.http_requests, "request", lambda **kwargs: BinaryResponse())

    result = proxy_http_request({"url": "https://api.example.test/download", "method": "GET"})

    assert result["headers"] == {"Content-Type": "application/octet-stream", "Content-Length": str(len(binary_body))}
    assert result["body"] == ""
    assert result["contentType"] == "application/octet-stream"
    assert result["bodyType"] == "binary"
    assert result["isBinary"] is True
    assert result["isJsonValid"] is False
    assert result["size"] == len(binary_body)
    assert result["originalSize"] == len(binary_body)


def test_proxy_http_request_truncates_large_json_as_raw_text_with_metadata(monkeypatch):
    large_json = b'{"items":[' + (b'"payload",' * (proxy_service.MAX_RESPONSE_BODY_BYTES // 10)) + b'"tail"]}'

    class LargeJsonResponse:
        status_code = 200
        reason = "OK"
        headers = {"Content-Type": "application/json"}
        encoding = "utf-8"
        content = large_json

    monkeypatch.setattr(proxy_service.http_requests, "request", lambda **kwargs: LargeJsonResponse())

    result = proxy_http_request({"url": "https://api.example.test/large", "method": "GET"})

    assert result["body"] == large_json[:proxy_service.MAX_RESPONSE_BODY_BYTES].decode("utf-8", errors="replace")
    assert result["contentType"] == "application/json"
    assert result["bodyType"] == "json"
    assert result["isBinary"] is False
    assert result["isTruncated"] is True
    assert result["isJsonValid"] is False
    assert result["size"] == proxy_service.MAX_RESPONSE_BODY_BYTES
    assert result["originalSize"] == len(large_json)
    assert result["truncatedSize"] == proxy_service.MAX_RESPONSE_BODY_BYTES


def test_proxy_http_request_preserves_duplicate_and_multiline_response_headers(monkeypatch):
    from urllib3._collections import HTTPHeaderDict

    class RawHeadersResponse:
        status_code = 200
        reason = "OK"
        headers = {"Content-Type": "text/plain", "Set-Cookie": "session=abc"}
        encoding = "utf-8"
        content = b"ok"

        class Raw:
            headers = HTTPHeaderDict([
                ("Content-Type", "text/plain"),
                ("Set-Cookie", "session=abc; HttpOnly"),
                ("Set-Cookie", "theme=dark; Path=/"),
                ("X-Multiline", "first\r\n second"),
            ])

        raw = Raw()

    monkeypatch.setattr(proxy_service.http_requests, "request", lambda **kwargs: RawHeadersResponse())

    result = proxy_http_request({"url": "https://api.example.test", "method": "GET"})

    assert result["headers"] == {"Content-Type": "text/plain", "Set-Cookie": "session=abc"}
    assert result["headerList"] == [
        {"name": "Content-Type", "value": "text/plain"},
        {"name": "Set-Cookie", "value": "session=abc; HttpOnly"},
        {"name": "Set-Cookie", "value": "theme=dark; Path=/"},
        {"name": "X-Multiline", "value": "first second"},
    ]


def test_proxy_http_request_does_not_forward_unsafe_transport_headers(monkeypatch):
    calls = []

    def fake_request(**kwargs):
        calls.append(kwargs)
        return FakeResponse()

    monkeypatch.setattr(proxy_service.http_requests, "request", fake_request)

    proxy_http_request(
        {
            "url": "https://api.example.test/widgets",
            "method": "GET",
            "headers": {
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Content-Length": "999",
                "Host": "wrong.example.test",
                "Connection": "keep-alive",
                "Accept": "application/json",
            },
        }
    )

    assert calls[0]["headers"] == {
        "Accept": "application/json",
        "Accept-Encoding": "identity",
    }


def test_proxy_http_request_combines_comma_safe_duplicate_header_rows(monkeypatch):
    calls = []

    def fake_request(**kwargs):
        calls.append(kwargs)
        return FakeResponse()

    monkeypatch.setattr(proxy_service.http_requests, "request", fake_request)

    proxy_http_request(
        {
            "url": "https://api.example.test/widgets",
            "method": "GET",
            "headers": [
                {"enabled": True, "key": "Accept", "value": "application/json"},
                {"enabled": True, "key": "Accept", "value": "text/plain"},
            ],
        }
    )

    assert calls[0]["headers"] == {
        "Accept": "application/json, text/plain",
        "Accept-Encoding": "identity",
    }


def test_proxy_http_request_rejects_non_combinable_duplicate_header_rows(monkeypatch):
    def fake_request(**kwargs):
        return FakeResponse()

    monkeypatch.setattr(proxy_service.http_requests, "request", fake_request)

    with pytest.raises(ValueError, match="Duplicate header Set-Cookie is not supported"):
        proxy_http_request(
            {
                "url": "https://api.example.test/widgets",
                "method": "GET",
                "headers": [
                    {"enabled": True, "key": "Set-Cookie", "value": "a=1"},
                    {"enabled": True, "key": "Set-Cookie", "value": "b=2"},
                ],
            }
        )


def test_proxy_http_request_skips_disabled_empty_and_restricted_header_rows(monkeypatch):
    calls = []

    def fake_request(**kwargs):
        calls.append(kwargs)
        return FakeResponse()

    monkeypatch.setattr(proxy_service.http_requests, "request", fake_request)

    proxy_http_request(
        {
            "url": "https://api.example.test/widgets",
            "method": "GET",
            "headers": [
                {"enabled": False, "key": "X-Disabled", "value": "skip"},
                {"enabled": True, "key": "X-Empty", "value": ""},
                {"enabled": True, "key": "Host", "value": "evil.example"},
                {"enabled": True, "key": "X-Tenant", "value": "acme"},
            ],
        }
    )

    assert calls[0]["headers"] == {
        "X-Tenant": "acme",
        "Accept-Encoding": "identity",
    }


def test_proxy_http_request_requires_url():
    with pytest.raises(ValueError, match="URL is required"):
        proxy_http_request({"method": "GET"})


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost:3000/sign",
        "http://127.0.0.1:3000/sign",
        "http://[::1]:3000/sign",
    ],
)
def test_proxy_http_request_routes_loopback_urls_to_configured_host(monkeypatch, url):
    calls = []

    def fake_request(**kwargs):
        calls.append(kwargs)
        return FakeResponse()

    monkeypatch.setenv("POSTBOY_PROXY_LOCALHOST_HOST", "host.docker.internal")
    monkeypatch.setattr(proxy_service.http_requests, "request", fake_request)

    proxy_http_request({"url": url, "method": "GET"})

    assert calls[0]["url"] == "http://host.docker.internal:3000/sign"


def test_proxy_http_request_leaves_non_loopback_url_unchanged(monkeypatch):
    monkeypatch.setenv("POSTBOY_PROXY_LOCALHOST_HOST", "host.docker.internal")

    assert proxy_service._rewrite_loopback_url_for_host(
        "https://api.example.test/widgets"
    ) == "https://api.example.test/widgets"




def test_proxy_http_request_rejects_invalid_url_scheme(monkeypatch):
    def raise_invalid_schema(**kwargs):
        raise requests.exceptions.MissingSchema('Invalid URL')

    monkeypatch.setattr(proxy_service.http_requests, "request", raise_invalid_schema)

    with pytest.raises(ValueError, match="valid http:// or https:// scheme"):
        proxy_http_request({"url": "example.test", "method": "GET"})

def test_proxy_http_request_maps_timeout_and_connection_errors(monkeypatch):
    def raise_timeout(**kwargs):
        raise requests.exceptions.Timeout()

    monkeypatch.setattr(proxy_service.http_requests, "request", raise_timeout)
    with pytest.raises(ProxyTimeoutError):
        proxy_http_request({"url": "https://api.example.test", "method": "GET"})

    def raise_connection(**kwargs):
        raise requests.exceptions.ConnectionError("offline")

    monkeypatch.setattr(proxy_service.http_requests, "request", raise_connection)
    with pytest.raises(ProxyConnectionError, match="offline"):
        proxy_http_request({"url": "https://api.example.test", "method": "GET"})


def test_proxy_http_request_maps_ssl_errors_to_tls_error(monkeypatch):
    def raise_ssl(**kwargs):
        raise requests.exceptions.SSLError('certificate verify failed')

    monkeypatch.setattr(proxy_service.http_requests, "request", raise_ssl)

    with pytest.raises(ProxyTlsError, match="TLS certificate verification failed"):
        proxy_http_request({"url": "https://api.example.test", "method": "GET"})


def test_proxy_route_returns_proxy_payload_and_validation_errors(client, monkeypatch, user_a_headers):
    # The route imports proxy_http_request directly, so patch that route symbol.
    import pypostboy.routes.proxy as proxy_route

    monkeypatch.setattr(
        proxy_route,
        "proxy_http_request",
        lambda body: {"status": 204, "statusText": "No Content", "headers": {}, "body": "", "time": 1},
    )

    response = client.post("/api/proxy", headers=user_a_headers, json={"url": "https://api.example.test", "method": "GET"})
    assert response.status_code == 200
    assert response.get_json()["status"] == 204

    def raise_value_error(body):
        raise ValueError("URL is required")

    monkeypatch.setattr(proxy_route, "proxy_http_request", raise_value_error)
    invalid = client.post("/api/proxy", headers=user_a_headers, json={})
    assert invalid.status_code == 400
    assert invalid.get_json() == {"error": "URL is required"}


def test_proxy_route_allows_guest_requests(client, monkeypatch):
    import pypostboy.routes.proxy as proxy_route

    monkeypatch.setattr(
        proxy_route,
        "proxy_http_request",
        lambda body: {"status": 200, "statusText": "OK", "headers": {}, "body": {"guest": True}, "time": 1},
    )

    response = client.post("/api/proxy", json={"url": "https://api.example.test", "method": "GET"})

    assert response.status_code == 200
    assert response.get_json()["body"] == {"guest": True}


def test_proxy_route_allows_authenticated_requests(client, monkeypatch, user_a_headers):
    import pypostboy.routes.proxy as proxy_route

    monkeypatch.setattr(
        proxy_route,
        "proxy_http_request",
        lambda body: {"status": 200, "statusText": "OK", "headers": {}, "body": {"ok": True}, "time": 1},
    )

    response = client.post("/api/proxy", headers=user_a_headers, json={"url": "https://api.example.test", "method": "GET"})

    assert response.status_code == 200
    assert response.get_json()["body"] == {"ok": True}


def test_proxy_route_is_csrf_exempt_for_post_requests(app, monkeypatch, user_a_headers):
    from django.test import Client as DjangoClient
    import pypostboy.routes.proxy as proxy_route

    monkeypatch.setattr(
        proxy_route,
        "proxy_http_request",
        lambda body: {"status": 200, "statusText": "OK", "headers": {}, "body": {"ok": True}, "time": 1},
    )

    client = DjangoClient(enforce_csrf_checks=True)
    response = client.post(
        "/api/proxy",
        data='{"url": "https://api.example.test", "method": "GET"}',
        content_type="application/json",
        HTTP_AUTHORIZATION=user_a_headers["Authorization"],
    )

    assert response.status_code == 200
    assert response.json()["body"] == {"ok": True}


def test_proxy_http_request_serializes_form_data_as_multipart(monkeypatch):
    calls = []

    def fake_request(**kwargs):
        calls.append(kwargs)
        return FakeResponse()

    monkeypatch.setattr(proxy_service.http_requests, "request", fake_request)

    proxy_http_request(
        {
            "url": "https://api.example.test/upload",
            "method": "POST",
            "headers": {"Content-Type": "multipart/form-data", "Accept": "application/json"},
            "contentType": "multipart/form-data",
            "formData": [{"key": "name", "value": "Ada"}],
        }
    )

    assert "Content-Type" not in calls[0]["headers"]
    assert calls[0]["data"] is None
    assert calls[0]["files"] == [("name", (None, "Ada"))]


def test_proxy_route_sends_imported_curl_form_data_to_echo_endpoint_as_multipart(client, user_a_headers):
    import json
    import threading
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    from pypostboy.services.curl_parser import parse_curl_to_request

    class EchoMultipartHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length).decode("utf-8", errors="replace")
            response = json.dumps(
                {
                    "content_type": self.headers.get("Content-Type", ""),
                    "body": body,
                }
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)

        def log_message(self, *args):
            pass

    parsed_curl = parse_curl_to_request(
        "curl http://example.test/echo -F 'name=Ada'"
    )
    server = ThreadingHTTPServer(("127.0.0.1", 0), EchoMultipartHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        response = client.post(
            "/api/proxy",
            headers=user_a_headers,
            json={
                "url": f"http://127.0.0.1:{server.server_port}/echo",
                "method": "POST",
                "headers": {"Content-Type": "multipart/form-data"},
                "contentType": "multipart/form-data",
                "formData": parsed_curl["form_data"],
            },
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    assert response.status_code == 200
    echoed = json.loads(response.get_json()["body"])
    assert response.get_json()["isJsonValid"] is True
    assert echoed["content_type"].startswith("multipart/form-data; boundary=")
    assert "application/json" not in echoed["content_type"]
    assert 'name="name"' in echoed["body"]
    assert "Ada" in echoed["body"]
