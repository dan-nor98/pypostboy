"""Route contract tests for collection endpoints."""


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

def test_collections_crud_duplicate_and_reorder_contract(client, user_a_headers):
    created = assert_success(
        client.post(
            "/api/collections",
            headers=user_a_headers,
            json={"name": "Root", "description": "Docs"},
        ),
        201,
    )
    assert created["name"] == "Root"
    assert created["description"] == "Docs"

    child = assert_success(
        client.post(
            "/api/collections",
            headers=user_a_headers,
            json={"name": "Child", "parent_id": created["id"]},
        ),
        201,
    )
    sibling = assert_success(
        client.post(
            "/api/collections", headers=user_a_headers, json={"name": "Sibling"}
        ),
        201,
    )

    collections = assert_success(client.get("/api/collections", headers=user_a_headers))
    assert [item["name"] for item in collections] == ["Root", "Sibling"]
    assert collections[0]["children"][0]["id"] == child["id"]

    fetched = assert_success(
        client.get(f"/api/collections/{created['id']}", headers=user_a_headers)
    )
    assert fetched["requests"] == []
    assert fetched["children"][0]["name"] == "Child"

    updated = assert_success(
        client.put(
            f"/api/collections/{created['id']}",
            headers=user_a_headers,
            json={"name": "Renamed"},
        )
    )
    assert updated["name"] == "Renamed"

    reordered = assert_success(
        client.put(
            "/api/collections/reorder",
            headers=user_a_headers,
            json={"parent_id": None, "ordered_ids": [sibling["id"], created["id"]]},
        )
    )
    assert reordered == {"updated": 2}
    assert [
        item["id"]
        for item in assert_success(
            client.get("/api/collections", headers=user_a_headers)
        )
    ] == [
        sibling["id"],
        created["id"],
    ]

    duplicate = assert_success(
        client.post(
            f"/api/collections/{created['id']}/duplicate", headers=user_a_headers
        )
    )
    assert duplicate["name"] == "Renamed (copy)"

    deleted = assert_success(
        client.delete(f"/api/collections/{created['id']}", headers=user_a_headers)
    )
    assert deleted == {"deleted": 2}
    assert_error(
        client.delete("/api/collections/999", headers=user_a_headers),
        404,
        "Collection not found",
    )


def test_create_nested_collection_rejects_blank_names_and_preserves_requests(
    client, user_a_headers
):
    root = assert_success(
        client.post(
            "/api/collections", headers=user_a_headers, json={"name": "Root"}
        ),
        201,
    )
    request = assert_success(
        client.post(
            "/api/requests",
            headers=user_a_headers,
            json={"collection_id": root["id"], "name": "Keep me"},
        ),
        201,
    )

    assert_error(
        client.post(
            "/api/collections",
            headers=user_a_headers,
            json={"name": "   ", "parent_id": root["id"]},
        ),
        400,
        "Collection name is required",
    )

    child = assert_success(
        client.post(
            "/api/collections",
            headers=user_a_headers,
            json={"name": "Child", "parent_id": root["id"]},
        ),
        201,
    )
    grandchild = assert_success(
        client.post(
            "/api/collections",
            headers=user_a_headers,
            json={"name": "Grandchild", "parent_id": child["id"]},
        ),
        201,
    )

    collections = assert_success(client.get("/api/collections", headers=user_a_headers))
    assert collections[0]["id"] == root["id"]
    assert collections[0]["children"][0]["id"] == child["id"]
    assert collections[0]["children"][0]["children"][0]["id"] == grandchild["id"]
    assert [item["id"] for item in collections[0]["requests"]] == [request["id"]]
    assert collections[0]["children"][0]["requests"] == []

def test_collection_create_and_update_reject_malformed_json(client, user_a_headers):
    assert_error(
        client.post(
            "/api/collections",
            headers=user_a_headers,
            data='{',
            content_type="application/json",
        ),
        400,
        "Invalid JSON request body",
    )

    created = assert_success(
        client.post(
            "/api/collections", headers=user_a_headers, json={"name": "Valid"}
        ),
        201,
    )
    assert_error(
        client.put(
            f"/api/collections/{created['id']}",
            headers=user_a_headers,
            data='{',
            content_type="application/json",
        ),
        400,
        "Invalid JSON request body",
    )

def test_collections_error_contracts(client, user_a_headers):
    assert_error(
        client.get("/api/collections/404", headers=user_a_headers),
        404,
        "Collection not found",
    )
    assert_error(
        client.put("/api/collections/reorder", headers=user_a_headers, json={}),
        400,
        "ordered_ids required",
    )
    assert_error(
        client.put(
            "/api/collections/reorder",
            headers=user_a_headers,
            json={"ordered_ids": [1, 1]},
        ),
        400,
        "duplicates",
    )

def test_get_collections_only_lists_current_users_collections(
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

    user_a_list = assert_success(client.get("/api/collections", headers=user_a_headers))
    assert [item["id"] for item in user_a_list] == [user_a_collection["id"]]
    assert user_b_collection["id"] not in [item["id"] for item in user_a_list]

def test_user_cannot_access_or_parent_to_other_users_collection(
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

    assert_error(
        client.get(
            f"/api/collections/{user_b_collection['id']}", headers=user_a_headers
        ),
        404,
        "Collection not found",
    )
    assert_error(
        client.put(
            f"/api/collections/{user_a_collection['id']}",
            headers=user_a_headers,
            json={"parent_id": user_b_collection["id"]},
        ),
        404,
        "Parent collection not found",
    )

def test_user_cannot_reorder_collections_with_other_users_ids(
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

    assert_error(
        client.put(
            "/api/collections/reorder",
            headers=user_a_headers,
            json={
                "parent_id": None,
                "ordered_ids": [user_a_collection["id"], user_b_collection["id"]],
            },
        ),
        400,
        "exactly the sibling collections",
    )


def test_collections_endpoint_accepts_trailing_slash(client, user_a_headers):
    response = client.get('/api/collections/', headers=user_a_headers)

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['success'] is True
