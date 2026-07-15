"""Tests for Postman and cURL export endpoints."""

from pypostboy.repositories.collections import Collections
from pypostboy.repositories.requests import Requests


def assert_success(response, status=200):
    assert response.status_code == status
    payload = response.get_json()
    assert payload["success"] is True
    return payload["data"]


def test_collection_export_returns_postman_collection_tree(client, user_a, user_a_headers):
    root = Collections.create(user_a["id"], {"name": "Exports", "description": "Export me"})
    child = Collections.create(user_a["id"], {"name": "Nested", "parent_id": root["id"]})
    Requests.create(user_a["id"], {
        "collection_id": root["id"],
        "name": "Create widget",
        "method": "POST",
        "url": "https://example.test/widgets?verbose=true",
        "headers": [{"enabled": True, "key": "Content-Type", "value": "application/json"}],
        "body_type": "raw",
        "body_content": '{"name":"demo"}',
        "body_raw_type": "application/json",
        "auth_type": "bearer",
        "auth_data": {"token": "secret-token"},
    })
    Requests.create(user_a["id"], {
        "collection_id": child["id"],
        "name": "Upload widget",
        "method": "POST",
        "url": "https://example.test/upload",
        "body_type": "form_data",
        "form_data": [{"key": "name", "value": "demo"}],
    })

    exported = assert_success(client.get(f"/api/collections/{root['id']}/export", headers=user_a_headers))

    assert exported["info"]["name"] == "Exports"
    assert exported["info"]["schema"].endswith("collection/v2.1.0/collection.json")
    assert exported["item"][0]["name"] == "Create widget"
    request = exported["item"][0]["request"]
    assert request["method"] == "POST"
    assert request["url"]["query"] == [{"key": "verbose", "value": "true"}]
    assert request["header"] == [{"key": "Content-Type", "value": "application/json", "type": "text"}]
    assert request["body"]["raw"] == '{"name":"demo"}'
    assert request["auth"]["bearer"][0]["value"] == "secret-token"
    assert exported["item"][1]["name"] == "Nested"
    assert exported["item"][1]["item"][0]["request"]["body"]["mode"] == "formdata"


def test_request_export_curl_includes_headers_body_form_and_auth(client, collection, user_a, user_a_headers):
    request = Requests.create(user_a["id"], {
        "collection_id": collection["id"],
        "name": "Create widget",
        "method": "POST",
        "url": "https://example.test/widgets",
        "headers": [{"key": "Content-Type", "value": "application/json"}],
        "body_content": '{"name":"demo"}',
        "auth_type": "basic",
        "auth_data": {"username": "alice", "password": "secret"},
    })

    exported = assert_success(client.get(f"/api/requests/{request['id']}/export/curl", headers=user_a_headers))

    assert exported["curl"] == "curl -X POST https://example.test/widgets -H 'Content-Type: application/json' -u alice:secret --data '{\"name\":\"demo\"}'"
