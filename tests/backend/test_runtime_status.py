"""Runtime connection status contract tests."""

import pytest


@pytest.mark.parametrize(
    ("status", "retryable"),
    [
        ("connecting", False),
        ("connected", False),
        ("disconnected", True),
        ("failed", True),
    ],
)
def test_runtime_status_contract_for_each_connection_status(client, user_a_headers, monkeypatch, status, retryable):
    monkeypatch.setenv("POSTBOY_CONNECTION_STATUS", status)
    monkeypatch.setenv("POSTBOY_CONNECTION_DIAGNOSTICS", "socket closed|last attempt timed out")
    monkeypatch.setenv("POSTBOY_RUNTIME_RETRY_INTERVAL_MS", "5000")
    monkeypatch.setenv("POSTBOY_RUNTIME_RETRY_BACKOFF", "3")

    payload = client.get("/api/runtime/status", headers=user_a_headers).get_json()

    assert payload["success"] is True
    data = payload["data"]
    assert data["connectionStatus"] == status
    assert data["diagnostics"] == ["socket closed", "last attempt timed out"]
    assert data["retry"] == {
        "intervalMs": 5000,
        "backoff": 3,
        "maxIntervalMs": 120000,
        "retryable": retryable,
    }
    assert data["syncStatus"]["status"] == "synchronized"


@pytest.mark.parametrize(
    ("sync_status", "connection_status"),
    [
        ("synchronized", "connected"),
        ("synchronizing", "connecting"),
        ("offline", "disconnected"),
        ("failed", "failed"),
    ],
)
def test_runtime_endpoint_explicitly_maps_sync_status_when_connection_status_is_absent(client, user_a_headers, monkeypatch, sync_status, connection_status):
    monkeypatch.delenv("POSTBOY_CONNECTION_STATUS", raising=False)
    monkeypatch.setenv("POSTBOY_SYNC_STATUS", sync_status)
    monkeypatch.setenv("POSTBOY_SYNC_DIAGNOSTICS", "peer unavailable")

    payload = client.get("/api/runtime/status", headers=user_a_headers).get_json()["data"]

    assert payload["connectionStatus"] == connection_status
    assert payload["syncStatus"]["status"] == sync_status
    if connection_status != "connected":
        assert payload["diagnostics"] == ["peer unavailable"]


def test_runtime_status_invalid_connection_status_fails_with_diagnostics(client, user_a_headers, monkeypatch):
    monkeypatch.setenv("POSTBOY_CONNECTION_STATUS", "unknown")
    monkeypatch.setenv("POSTBOY_CONNECTION_DIAGNOSTICS", "bad runtime state")

    payload = client.get("/api/runtime/status", headers=user_a_headers).get_json()["data"]

    assert payload["connectionStatus"] == "failed"
    assert payload["diagnostics"] == ["bad runtime state"]
    assert payload["retry"]["retryable"] is True


def test_runtime_status_returns_normalized_server_authoritative_stage(client, user_a_headers, monkeypatch):
    monkeypatch.setenv("POSTBOY_RUNTIME_STAGE", "prod")
    monkeypatch.setenv("POSTBOY_STAGE", "Editable Local")

    payload = client.get("/api/runtime/status", headers=user_a_headers).get_json()["data"]

    assert payload["stage"] == "Production"
    assert payload["stageLabel"] == "Production"
    assert payload["stageClassification"] == "production"
    assert payload["isProductionStage"] is True


def test_runtime_status_classifies_non_production_stage(client, user_a_headers, monkeypatch):
    monkeypatch.setenv("POSTBOY_RUNTIME_STAGE", "staging")

    payload = client.get("/api/runtime/status", headers=user_a_headers).get_json()["data"]

    assert payload["stage"] == "Staging"
    assert payload["stageLabel"] == "Staging (non-production)"
    assert payload["stageClassification"] == "non-production"
    assert payload["isProductionStage"] is False


def test_runtime_status_reports_enabled_proxy_safe_metadata(client, user_a_headers, monkeypatch):
    monkeypatch.setenv("POSTBOY_PROXY_ENABLED", "true")
    monkeypatch.setenv("POSTBOY_PROXY_TARGET", "https://proxy.example.test")
    monkeypatch.setenv("POSTBOY_PROXY_TRANSPORT", "https")
    monkeypatch.setenv("POSTBOY_PROXY_AUTH_POLICY", "client-token")

    payload = client.get("/api/runtime/status", headers=user_a_headers).get_json()["data"]

    assert payload["proxy"] == {
        "enabled": True,
        "configured": True,
        "mode": "enabled",
        "target": "https://proxy.example.test",
        "transport": "https",
        "authPolicy": "client-token",
        "diagnostics": ["Proxy target configured: https://proxy.example.test"],
    }


def test_runtime_status_redacts_proxy_credentials(client, user_a_headers, monkeypatch):
    monkeypatch.setenv("POSTBOY_PROXY_ENABLED", "true")
    monkeypatch.setenv("POSTBOY_PROXY_TARGET", "https://alice:secret-token@proxy.example.test:8443/api")

    proxy = client.get("/api/runtime/status", headers=user_a_headers).get_json()["data"]["proxy"]

    assert "alice" not in str(proxy)
    assert "secret-token" not in str(proxy)
    assert proxy["target"] == "https://[redacted]@proxy.example.test:8443/api"
    assert proxy["diagnostics"] == ["Proxy target configured: https://[redacted]@proxy.example.test:8443/api"]


def test_runtime_status_reports_disabled_proxy_policy(client, user_a_headers, monkeypatch):
    monkeypatch.setenv("POSTBOY_PROXY_ENABLED", "false")

    proxy = client.get("/api/runtime/status", headers=user_a_headers).get_json()["data"]["proxy"]

    assert proxy["enabled"] is False
    assert proxy["mode"] == "disabled"
    assert "disabled by backend configuration" in proxy["diagnostics"][0]
