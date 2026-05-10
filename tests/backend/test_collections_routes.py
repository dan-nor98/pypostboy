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


def test_collections_crud_duplicate_and_reorder_contract(client):
    created = assert_success(
        client.post("/api/collections", json={"name": "Root", "description": "Docs"}),
        201,
    )
    assert created["name"] == "Root"
    assert created["description"] == "Docs"

    child = assert_success(
        client.post("/api/collections", json={"name": "Child", "parent_id": created["id"]}),
        201,
    )
    sibling = assert_success(client.post("/api/collections", json={"name": "Sibling"}), 201)

    collections = assert_success(client.get("/api/collections"))
    assert [item["name"] for item in collections] == ["Root", "Sibling"]
    assert collections[0]["children"][0]["id"] == child["id"]

    fetched = assert_success(client.get(f"/api/collections/{created['id']}"))
    assert fetched["requests"] == []
    assert fetched["children"][0]["name"] == "Child"

    updated = assert_success(
        client.put(f"/api/collections/{created['id']}", json={"name": "Renamed"})
    )
    assert updated["name"] == "Renamed"

    reordered = assert_success(
        client.put(
            "/api/collections/reorder",
            json={"parent_id": None, "ordered_ids": [sibling["id"], created["id"]]},
        )
    )
    assert reordered == {"updated": 2}
    assert [item["id"] for item in assert_success(client.get("/api/collections"))] == [
        sibling["id"],
        created["id"],
    ]

    duplicate = assert_success(client.post(f"/api/collections/{created['id']}/duplicate"))
    assert duplicate["name"] == "Renamed (copy)"

    deleted = assert_success(client.delete(f"/api/collections/{created['id']}"))
    assert deleted == {"deleted": 2}
    assert_success(client.delete("/api/collections/999"))["deleted"] == 1


def test_collections_error_contracts(client):
    assert_error(client.get("/api/collections/404"), 404, "Collection not found")
    assert_error(client.put("/api/collections/reorder", json={}), 400, "ordered_ids required")
    assert_error(
        client.put("/api/collections/reorder", json={"ordered_ids": [1, 1]}),
        400,
        "duplicates",
    )
