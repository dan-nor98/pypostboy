"""Synchronization status and conflict policy contract tests."""

import pytest


@pytest.mark.parametrize(
    ("status", "retryable"),
    [
        ("synchronized", False),
        ("synchronizing", False),
        ("offline", True),
        ("failed", True),
    ],
)
def test_sync_status_contract_for_each_status(client, user_a_headers, monkeypatch, status, retryable):
    monkeypatch.setenv("POSTBOY_SYNC_STATUS", status)
    monkeypatch.setenv("POSTBOY_SYNC_DIAGNOSTICS", "peer unavailable|last attempt timed out")

    payload = client.get("/api/sync/status", headers=user_a_headers).get_json()

    assert payload["success"] is True
    data = payload["data"]
    assert data["status"] == status
    assert data["retryable"] is retryable
    assert "conflict_policy" in data
    assert data["diagnostics"] == ["peer unavailable", "last attempt timed out"]


def test_sync_retry_reports_synchronizing(client, user_a_headers):
    payload = client.post("/api/sync/retry", headers=user_a_headers).get_json()

    assert payload["success"] is True
    assert payload["data"]["status"] == "synchronizing"
    assert payload["data"]["diagnostics"] == ["Retry requested by client"]


def test_collections_response_includes_sync_status_metadata(client, user_a_headers):
    response = client.get("/api/collections", headers=user_a_headers)
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["success"] is True
    assert isinstance(payload["data"], list)
    assert payload["sync_status"]["status"] == "synchronized"


def test_stale_collection_update_returns_conflict_metadata(client, user_a_headers):
    created = client.post("/api/collections", headers=user_a_headers, json={"name": "Root"}).get_json()["data"]

    response = client.put(
        f"/api/collections/{created['id']}",
        headers=user_a_headers,
        json={"name": "Stale", "expected_updated_at": "older-version"},
    )
    payload = response.get_json()

    assert response.status_code == 409
    assert payload["success"] is False
    assert payload["conflict"]["resource_type"] == "collection"
    assert payload["conflict"]["resource_id"] == created["id"]
    assert payload["conflict"]["actual_updated_at"] == created["updated_at"]
    assert "never be overwritten silently" in payload["conflict"]["policy"]


def test_stale_request_update_returns_conflict_metadata(client, user_a_headers):
    collection = client.post("/api/collections", headers=user_a_headers, json={"name": "Root"}).get_json()["data"]
    request = client.post(
        "/api/requests",
        headers=user_a_headers,
        json={"collection_id": collection["id"], "name": "Health"},
    ).get_json()["data"]

    response = client.put(
        f"/api/requests/{request['id']}",
        headers=user_a_headers,
        json={"name": "Stale", "expected_updated_at": "older-version"},
    )
    payload = response.get_json()

    assert response.status_code == 409
    assert payload["conflict"]["resource_type"] == "request"
    assert payload["conflict"]["resource_id"] == request["id"]
