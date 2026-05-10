"""Route contract tests for saved request instance endpoints."""


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


def test_request_instances_crud_contract(client, request_record):
    created = assert_success(
        client.post(
            f"/api/requests/{request_record['id']}/instances",
            json={
                "name": "Happy path",
                "method": "post",
                "url": "https://api.example.test/widgets",
                "headers": [{"key": "Accept", "value": "application/json"}],
                "response_status": 200,
                "response_status_text": "OK",
                "response_headers": {"Content-Type": "application/json"},
                "response_body": {"ok": True},
                "response_time_ms": 42,
                "response_size": "11 B",
            },
        ),
        201,
    )
    assert created["name"] == "Happy path"
    assert created["method"] == "POST"
    assert created["response_body"] == {"ok": True}

    listed = assert_success(client.get(f"/api/requests/{request_record['id']}/instances"))
    assert [item["id"] for item in listed] == [created["id"]]

    fetched = assert_success(client.get(f"/api/request-instances/{created['id']}"))
    assert fetched["response_headers"] == {"Content-Type": "application/json"}

    updated = assert_success(
        client.put(
            f"/api/request-instances/{created['id']}",
            json={"name": "Updated path", "response_body": "plain text"},
        )
    )
    assert updated["name"] == "Updated path"
    assert updated["response_body"] == "plain text"

    deleted = assert_success(client.delete(f"/api/request-instances/{created['id']}"))
    assert deleted == {"deleted": 1}


def test_request_instances_error_contracts(client):
    assert_error(client.get("/api/requests/404/instances"), 404, "Request not found")
    assert_error(client.get("/api/request-instances/404"), 404, "Request instance not found")
    assert_error(client.post("/api/requests/404/instances", json={"name": "Nope"}), 400, "Request not found")
