"""Route contract tests for request endpoints."""

from pypostboy.repositories.collections import Collections


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


def reorder_token(items):
    return "|".join(f"{item['id']}:{item['updated_at']}" for item in items)

def test_requests_crud_duplicate_move_and_reorder_contract(
    client, collection, user_a, user_a_headers
):
    created = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={
                "collection_id": collection["id"],
                "name": "Create widget",
                "method": "post",
                "url": "https://api.example.test/widgets",
                "headers": [{"key": "Content-Type", "value": "application/json"}],
                "body_type": "json",
                "body_content": '{"name":"Ada"}',
            },
        ),
        201,
    )
    assert created["method"] == "POST"
    assert created["headers"] == [{"key": "Content-Type", "value": "application/json"}]

    second = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={"collection_id": collection["id"], "name": "Second"},
        ),
        201,
    )

    fetched = assert_success(
        client.get(f"/api/requests/{created['id']}", headers=user_a_headers)
    )
    assert fetched["name"] == "Create widget"

    listed = assert_success(
        client.get(
            f"/api/collections/{collection['id']}/requests", headers=user_a_headers
        )
    )
    assert [req["id"] for req in listed] == [created["id"], second["id"]]

    updated = assert_success(
        client.put(
            f"/api/requests/{created['id']}",
            headers=user_a_headers,
            json={"method": "patch", "name": "Patch widget"},
        )
    )
    assert updated["method"] == "PATCH"
    assert updated["name"] == "Patch widget"

    listed = assert_success(
        client.get(
            f"/api/collections/{collection['id']}/requests", headers=user_a_headers
        )
    )
    reordered = assert_success(
        client.put(
            "/api/requests/reorder",
            headers=user_a_headers,
            json={
                "collection_id": collection["id"],
                "ordered_ids": [second["id"], created["id"]],
                "reorder_token": reorder_token(listed),
            },
        )
    )
    assert reordered == {"updated": 2}

    duplicate = assert_success(
        client.post(f"/api/requests/{created['id']}/duplicate", headers=user_a_headers)
    )
    assert duplicate["name"] == "Patch widget (copy)"

    target = Collections.create(user_a["id"], {"name": "Target"})
    moved = assert_success(
        client.put(
            f"/api/requests/{created['id']}/move",
            headers=user_a_headers,
            json={"collection_id": target["id"]},
        )
    )
    assert moved["collection_id"] == target["id"]

    deleted = assert_success(
        client.delete(f"/api/requests/{created['id']}", headers=user_a_headers)
    )
    assert deleted == {"deleted": 1}


def test_request_create_and_update_reject_malformed_json(
    client, collection, user_a_headers
):
    assert_error(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            data='{',
            content_type="application/json",
        ),
        400,
        "Invalid JSON request body",
    )

    created = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={"collection_id": collection["id"], "name": "Valid request"},
        ),
        201,
    )
    assert_error(
        client.put(
            f"/api/requests/{created['id']}",
            headers=user_a_headers,
            data='{',
            content_type="application/json",
        ),
        400,
        "Invalid JSON request body",
    )

def test_requests_error_contracts(client, user_a_headers):
    assert_error(
        client.get("/api/requests/404", headers=user_a_headers),
        404,
        "Request not found",
    )
    assert_error(
        client.post(
            "/api/requests", headers=user_a_headers, json={"name": "Missing collection"}
        ),
        400,
        "collection_id",
    )
    assert_error(
        client.put("/api/requests/reorder", headers=user_a_headers, json={}),
        400,
        "collection_id required",
    )
    assert_error(
        client.put("/api/requests/404/move", headers=user_a_headers, json={}),
        400,
        "collection_id required",
    )

def test_user_cannot_access_or_move_other_users_request(
    client, user_a_headers, user_b_headers
):
    user_a_collection = assert_success(
        client.post(
            "/api/collections", headers=user_a_headers, json={"name": "User A root"}
        ),
        201,
    )
    user_b_collection = assert_success(
        client.post(
            "/api/collections", headers=user_b_headers, json={"name": "User B root"}
        ),
        201,
    )
    user_b_request = assert_success(
        client.post(
            "/api/requests",
            headers=user_b_headers,
            json={"collection_id": user_b_collection["id"], "name": "User B request"},
        ),
        201,
    )
    user_a_request = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={"collection_id": user_a_collection["id"], "name": "User A request"},
        ),
        201,
    )

    assert_error(
        client.get(f"/api/requests/{user_b_request['id']}", headers=user_a_headers),
        404,
        "Request not found",
    )
    assert_error(
        client.put(
            f"/api/requests/{user_a_request['id']}/move",
            headers=user_a_headers,
            json={"collection_id": user_b_collection["id"]},
        ),
        404,
        "Target collection not found",
    )

def test_user_cannot_reorder_requests_with_other_users_ids(
    client, user_a_headers, user_b_headers
):
    user_a_collection = assert_success(
        client.post(
            "/api/collections", headers=user_a_headers, json={"name": "User A root"}
        ),
        201,
    )
    user_b_collection = assert_success(
        client.post(
            "/api/collections", headers=user_b_headers, json={"name": "User B root"}
        ),
        201,
    )
    user_a_request = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={"collection_id": user_a_collection["id"], "name": "User A request"},
        ),
        201,
    )
    user_b_request = assert_success(
        client.post(
            "/api/requests",
            headers=user_b_headers,
            json={"collection_id": user_b_collection["id"], "name": "User B request"},
        ),
        201,
    )

    assert_error(
        client.put(
            "/api/requests/reorder",
            headers=user_a_headers,
            json={
                "collection_id": user_a_collection["id"],
                "ordered_ids": [user_a_request["id"], user_b_request["id"]],
                "reorder_token": f"{user_a_request['id']}:{user_a_request['updated_at']}",
            },
        ),
        400,
        "exactly the requests",
    )

def test_request_repository_move_and_reorder_validation(collection, user_a):
    from pypostboy.repositories.requests import Requests

    first = Requests.create(
        user_a["id"], {"collection_id": collection["id"], "name": "First"}
    )
    second = Requests.create(
        user_a["id"], {"collection_id": collection["id"], "name": "Second"}
    )

    assert Requests.reorder(
        collection["id"],
        user_a["id"],
        [second["id"], first["id"]],
        reorder_token([first, second]),
    ) == {"updated": 2}
    assert [
        item["id"]
        for item in Requests.get_by_collection(collection["id"], user_a["id"])
    ] == [
        second["id"],
        first["id"],
    ]

    try:
        Requests.reorder(collection["id"], user_a["id"], [first["id"], first["id"]])
    except ValueError as err:
        assert "duplicates" in str(err)
    else:
        raise AssertionError("Expected duplicate request IDs to fail")


def test_reorder_requests_rejects_stale_token(client, collection, user_a_headers):
    first = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={"collection_id": collection["id"], "name": "First"},
        ),
        201,
    )
    second = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={"collection_id": collection["id"], "name": "Second"},
        ),
        201,
    )

    assert_error(
        client.put(
            "/api/requests/reorder",
            headers=user_a_headers,
            json={
                "collection_id": collection["id"],
                "ordered_ids": [second["id"], first["id"]],
                "reorder_token": "stale",
            },
        ),
        409,
        "stale",
    )
    listed = assert_success(
        client.get(
            f"/api/collections/{collection['id']}/requests", headers=user_a_headers
        )
    )
    assert [item["id"] for item in listed] == [first["id"], second["id"]]
