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


def test_import_route_curl_response_shape_documents_editor_contract(client):
    response = client.post(
        "/api/import",
        json={
            "type": "curl",
            "data": (
                "curl -X PATCH 'https://api.example.test/widgets/1' "
                "-H 'Accept: application/json' "
                "-H 'Content-Type: application/json' "
                "--data '{\"name\":\"Ada\"}'"
            ),
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert set(payload["data"].keys()) == {
        "method",
        "url",
        "headers",
        "body_type",
        "body_content",
        "form_data",
    }
    assert payload["data"] == {
        "method": "PATCH",
        "url": "https://api.example.test/widgets/1",
        "headers": [
            {"key": "Accept", "value": "application/json"},
            {"key": "Content-Type", "value": "application/json"},
        ],
        "body_type": "json",
        "body_content": '{"name":"Ada"}',
        "form_data": [],
    }


def test_import_route_curl_form_data_response_shape_documents_editor_contract(client):
    response = client.post(
        "/api/import",
        json={
            "type": "curl",
            "data": "curl https://api.example.test/upload -F 'name=Ada' --form 'avatar=@/tmp/a.png'",
        },
    )

    assert response.status_code == 200
    assert response.get_json()["data"] == {
        "method": "POST",
        "url": "https://api.example.test/upload",
        "headers": [],
        "body_type": "form-data",
        "body_content": "",
        "form_data": [
            {"key": "name", "value": "Ada"},
            {"key": "avatar", "value": "@/tmp/a.png"},
        ],
    }


def test_import_route_returns_structured_curl_errors(client):
    response = client.post(
        "/api/import",
        json={"type": "curl", "data": "curl https://api.example.test --data-raw"},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["success"] is False
    assert payload["errors"] == [
        {
            "code": "missing_body_value",
            "message": "The --data-raw option requires a value.",
            "option": "--data-raw",
        }
    ]
    assert payload["warnings"] == []
