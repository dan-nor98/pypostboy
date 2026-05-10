"""Authentication and ownership enforcement tests."""

from pypostboy.db.serializers import timestamp
from pypostboy.repositories.request_instances import RequestInstances


def assert_success(response, status=200):
    assert response.status_code == status
    payload = response.get_json()
    assert payload["success"] is True
    return payload["data"]


def assert_error(response, status, message):
    assert response.status_code == status
    payload = response.get_json()
    assert payload["success"] is False
    assert message in payload["error"]


def create_user(conn, username):
    now = timestamp()
    cursor = conn.execute(
        """INSERT INTO users (
            username, email, password_hash, auth_provider, auth_subject, created_at, updated_at
        ) VALUES (?, ?, NULL, 'local', NULL, ?, ?)""",
        (username, f"{username}@example.test", now, now),
    )
    conn.commit()
    return cursor.lastrowid


def test_api_routes_scope_resources_to_current_user(
    client, sqlite_connection, collection, request_record, user_a_headers
):
    other_user_id = create_user(sqlite_connection, "other-user")
    other_headers = {"X-Postboy-User-Id": str(other_user_id)}

    assert_success(client.get("/api/collections", headers=user_a_headers))
    assert_success(client.get("/api/collections", headers=other_headers)) == []

    assert_error(
        client.get(f"/api/collections/{collection['id']}", headers=other_headers),
        404,
        "Collection not found",
    )
    assert_error(
        client.get(f"/api/requests/{request_record['id']}", headers=other_headers),
        404,
        "Request not found",
    )
    assert_error(
        client.put(
            f"/api/requests/{request_record['id']}",
            headers=other_headers,
            json={"name": "No access"},
        ),
        404,
        "Request not found",
    )

    other_collection = assert_success(
        client.post("/api/collections", headers=other_headers, json={"name": "Other"}),
        201,
    )
    assert other_collection["user_id"] == other_user_id

    assert_error(
        client.put(
            f"/api/requests/{request_record['id']}/move",
            headers=user_a_headers,
            json={"collection_id": other_collection["id"]},
        ),
        404,
        "Target collection not found",
    )


def test_request_instances_scope_to_current_user(
    client, sqlite_connection, request_record, user_a
):
    other_user_id = create_user(sqlite_connection, "snapshot-user")
    instance = RequestInstances.create(
        request_record["id"], user_a["id"], {"name": "Owned snapshot"}
    )
    other_headers = {"X-Postboy-User-Id": str(other_user_id)}

    assert_error(
        client.get(f"/api/request-instances/{instance['id']}", headers=other_headers),
        404,
        "Request instance not found",
    )
    assert_error(
        client.delete(
            f"/api/request-instances/{instance['id']}", headers=other_headers
        ),
        404,
        "Request instance not found",
    )
