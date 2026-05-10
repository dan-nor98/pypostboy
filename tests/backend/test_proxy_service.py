"""Tests for outbound proxy service behavior."""

import pytest
import requests

from pypostboy.services import proxy_service
from pypostboy.services.proxy_service import (
    ProxyConnectionError,
    ProxyTimeoutError,
    proxy_http_request,
)


class FakeResponse:
    status_code = 201
    reason = "Created"
    headers = {"Content-Type": "application/json"}
    text = '{"ok": true}'

    def json(self):
        return {"ok": True}


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
    assert result["body"] == {"ok": True}
    assert calls[0]["headers"] == {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    assert calls[0]["data"] == '{"name":"Ada"}'
    assert calls[0]["timeout"] == 30


def test_proxy_http_request_requires_url():
    with pytest.raises(ValueError, match="URL is required"):
        proxy_http_request({"method": "GET"})


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


def test_proxy_route_returns_proxy_payload_and_validation_errors(client, monkeypatch):
    # The route imports proxy_http_request directly, so patch that route symbol.
    import pypostboy.routes.proxy as proxy_route

    monkeypatch.setattr(
        proxy_route,
        "proxy_http_request",
        lambda body: {"status": 204, "statusText": "No Content", "headers": {}, "body": "", "time": 1},
    )

    response = client.post("/api/proxy", json={"url": "https://api.example.test", "method": "GET"})
    assert response.status_code == 200
    assert response.get_json()["status"] == 204

    def raise_value_error(body):
        raise ValueError("URL is required")

    monkeypatch.setattr(proxy_route, "proxy_http_request", raise_value_error)
    invalid = client.post("/api/proxy", json={})
    assert invalid.status_code == 400
    assert invalid.get_json() == {"error": "URL is required"}
