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


def test_requests_crud_duplicate_move_and_reorder_contract(client, collection):
    created = assert_success(
        client.post(
            "/api/requests",
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
            json={"collection_id": collection["id"], "name": "Second"},
        ),
        201,
    )

    fetched = assert_success(client.get(f"/api/requests/{created['id']}"))
    assert fetched["name"] == "Create widget"

    listed = assert_success(client.get(f"/api/collections/{collection['id']}/requests"))
    assert [req["id"] for req in listed] == [created["id"], second["id"]]

    updated = assert_success(
        client.put(f"/api/requests/{created['id']}", json={"method": "patch", "name": "Patch widget"})
    )
    assert updated["method"] == "PATCH"
    assert updated["name"] == "Patch widget"

    reordered = assert_success(
        client.put(
            "/api/requests/reorder",
            json={"collection_id": collection["id"], "ordered_ids": [second["id"], created["id"]]},
        )
    )
    assert reordered == {"updated": 2}

    duplicate = assert_success(client.post(f"/api/requests/{created['id']}/duplicate"))
    assert duplicate["name"] == "Patch widget (copy)"

    target = Collections.create({"name": "Target"})
    moved = assert_success(
        client.put(f"/api/requests/{created['id']}/move", json={"collection_id": target["id"]})
    )
    assert moved["collection_id"] == target["id"]

    deleted = assert_success(client.delete(f"/api/requests/{created['id']}"))
    assert deleted == {"deleted": 1}


def test_requests_error_contracts(client):
    assert_error(client.get("/api/requests/404"), 404, "Request not found")
    assert_error(client.post("/api/requests", json={"name": "Missing collection"}), 400, "collection_id")
    assert_error(client.put("/api/requests/reorder", json={}), 400, "collection_id required")
    assert_error(client.put("/api/requests/404/move", json={}), 400, "collection_id required")


def test_request_repository_move_and_reorder_validation(collection):
    from pypostboy.repositories.requests import Requests

    first = Requests.create({"collection_id": collection["id"], "name": "First"})
    second = Requests.create({"collection_id": collection["id"], "name": "Second"})

    assert Requests.reorder(collection["id"], [second["id"], first["id"]]) == {"updated": 2}
    assert [item["id"] for item in Requests.get_by_collection(collection["id"])] == [
        second["id"],
        first["id"],
    ]

    try:
        Requests.reorder(collection["id"], [first["id"], first["id"]])
    except ValueError as err:
        assert "duplicates" in str(err)
    else:
        raise AssertionError("Expected duplicate request IDs to fail")
