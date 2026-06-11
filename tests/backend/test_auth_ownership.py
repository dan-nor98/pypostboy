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
    client, sqlite_connection, collection, request_record, user_a_headers, auth_headers
):
    other_user_id = create_user(sqlite_connection, "other-user")
    other_headers = auth_headers(other_user_id)

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
    client, sqlite_connection, request_record, user_a, auth_headers
):
    other_user_id = create_user(sqlite_connection, "snapshot-user")
    instance = RequestInstances.create(
        request_record["id"], user_a["id"], {"name": "Owned snapshot"}
    )
    other_headers = auth_headers(other_user_id)

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


def test_unsigned_user_id_header_is_ignored(
    client, collection, request_record, user_b
):
    """A forged user-id header cannot switch identity."""
    forged_headers = {"X-Postboy-User-Id": str(user_b["id"])}

    collections = assert_success(client.get("/api/collections", headers=forged_headers))
    assert collections == []
    assert_error(
        client.get(f"/api/collections/{collection['id']}", headers=forged_headers),
        404,
        "Collection not found",
    )
    assert_error(
        client.get(f"/api/requests/{request_record['id']}", headers=forged_headers),
        404,
        "Request not found",
    )


def test_session_identity_wins_over_forged_user_id_header(client, collection, user_b):
    """Signed session identity is used for browsers even with a forged user-id header."""
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "signed-session-user", "password": "password123"},
        ),
        201,
    )
    own_collection = assert_success(
        client.post("/api/collections", json={"name": "Signed session collection"}),
        201,
    )
    forged_headers = {"X-Postboy-User-Id": str(user_b["id"])}

    current = assert_success(client.get("/api/auth/me", headers=forged_headers))
    assert current["id"] == registered["user"]["id"]

    collections = assert_success(client.get("/api/collections", headers=forged_headers))
    assert [item["id"] for item in collections] == [own_collection["id"]]
    assert collection["id"] not in [item["id"] for item in collections]
