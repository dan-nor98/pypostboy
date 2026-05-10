"""Tests for Postman import conversion and persistence."""

from pypostboy.db.serializers import parse_json_or_text, safe_parse, safe_stringify
from pypostboy.repositories.collections import Collections
from pypostboy.services.import_service import import_postman_to_db


def test_import_postman_collection_preserves_folders_requests_bodies_and_auth(sqlite_connection):
    imported = import_postman_to_db(
        {
            "info": {"name": "Postman Sample", "description": "Imported docs"},
            "item": [
                {
                    "name": "Users",
                    "description": "User folder",
                    "item": [
                        {
                            "name": "Create user",
                            "request": {
                                "method": "post",
                                "url": {"raw": "https://api.example.test/users"},
                                "header": [{"key": "X-Trace", "value": "abc"}],
                                "body": {
                                    "mode": "raw",
                                    "raw": '{"name":"Ada"}',
                                    "options": {"raw": {"language": "json"}},
                                },
                                "auth": {
                                    "type": "bearer",
                                    "bearer": [{"key": "token", "value": "secret-token"}],
                                },
                            },
                        },
                        {
                            "name": "Search users",
                            "request": {
                                "method": "GET",
                                "url": "https://api.example.test/users?q=ada",
                                "body": {
                                    "mode": "urlencoded",
                                    "urlencoded": [{"key": "q", "value": "ada"}],
                                },
                            },
                        },
                    ],
                }
            ],
        }
    )

    assert imported["name"] == "Postman Sample"
    assert imported["description"] == "Imported docs"
    assert imported["children"][0]["name"] == "Users"

    users = Collections.get_by_id(imported["children"][0]["id"])
    assert [req["name"] for req in users["requests"]] == ["Create user", "Search users"]
    assert users["requests"][0]["method"] == "POST"
    assert users["requests"][0]["body_type"] == "json"
    assert users["requests"][0]["auth_type"] == "bearer"
    assert users["requests"][0]["auth_data"] == {"token": "secret-token"}
    assert users["requests"][1]["body_type"] == "form-urlencoded"
    assert users["requests"][1]["form_data"] == [{"key": "q", "value": "ada"}]


def test_serialization_helpers_handle_json_text_and_fallbacks():
    assert safe_parse('{"ok": true}', {}) == {"ok": True}
    assert safe_parse("not-json", []) == []
    assert safe_stringify({"ok": True}) == '{"ok": true}'
    assert safe_stringify("not-json", "[]") == "[]"
    assert parse_json_or_text('{"ok": true}', {}) == {"ok": True}
    assert parse_json_or_text("plain text", {}) == "plain text"


def test_import_route_supports_curl_postman_and_unknown_type(client):
    curl_payload = client.post(
        "/api/import",
        json={"type": "curl", "data": "curl -H 'Accept: application/json' https://api.example.test"},
    )
    assert curl_payload.status_code == 200
    assert curl_payload.get_json()["data"]["url"] == "https://api.example.test"

    postman_payload = client.post(
        "/api/import",
        json={"type": "postman", "data": {"info": {"name": "Imported"}, "item": []}},
    )
    assert postman_payload.status_code == 200
    assert postman_payload.get_json()["data"]["name"] == "Imported"

    missing_data = client.post("/api/import", json={"type": "curl"})
    assert missing_data.status_code == 400
    assert missing_data.get_json() == {"success": False, "error": "No data provided"}

    unknown_type = client.post("/api/import", json={"type": "har", "data": {"ok": True}})
    assert unknown_type.status_code == 400
    assert 'Unknown import type' in unknown_type.get_json()["error"]
