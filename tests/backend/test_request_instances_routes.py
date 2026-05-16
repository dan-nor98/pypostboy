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

def test_request_instances_crud_contract(client, request_record, user_a_headers):
    created = assert_success(
        client.post(
            f"/api/requests/{request_record['id']}/instances",
            headers=user_a_headers,
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

    listed = assert_success(
        client.get(
            f"/api/requests/{request_record['id']}/instances", headers=user_a_headers
        )
    )
    assert [item["id"] for item in listed] == [created["id"]]

    fetched = assert_success(
        client.get(f"/api/request-instances/{created['id']}", headers=user_a_headers)
    )
    assert fetched["response_headers"] == {"Content-Type": "application/json"}

    updated = assert_success(
        client.put(
            f"/api/request-instances/{created['id']}",
            headers=user_a_headers,
            json={"name": "Updated path", "response_body": "plain text"},
        )
    )
    assert updated["name"] == "Updated path"
    assert updated["response_body"] == "plain text"

    deleted = assert_success(
        client.delete(f"/api/request-instances/{created['id']}", headers=user_a_headers)
    )
    assert deleted == {"deleted": 1}


def test_request_instance_create_and_update_reject_malformed_json(
    client, request_record, user_a_headers
):
    assert_error(
        client.post(
            f"/api/requests/{request_record['id']}/instances",
            headers=user_a_headers,
            data='{',
            content_type="application/json",
        ),
        400,
        "Invalid JSON request body",
    )

    created = assert_success(
        client.post(
            f"/api/requests/{request_record['id']}/instances",
            headers=user_a_headers,
            json={"name": "Valid snapshot"},
        ),
        201,
    )
    assert_error(
        client.put(
            f"/api/request-instances/{created['id']}",
            headers=user_a_headers,
            data='{',
            content_type="application/json",
        ),
        400,
        "Invalid JSON request body",
    )

def test_request_instances_error_contracts(client, user_a_headers):
    assert_error(
        client.get("/api/requests/404/instances", headers=user_a_headers),
        404,
        "Request not found",
    )
    assert_error(
        client.get("/api/request-instances/404", headers=user_a_headers),
        404,
        "Request instance not found",
    )
    assert_error(
        client.post(
            "/api/requests/404/instances", headers=user_a_headers, json={"name": "Nope"}
        ),
        404,
        "Request not found",
    )

def test_user_cannot_access_other_users_request_or_instance_ids(
    client, user_a_headers, user_b_headers
):
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
    user_b_instance = assert_success(
        client.post(
            f"/api/requests/{user_b_request['id']}/instances",
            headers=user_b_headers,
            json={"name": "User B snapshot"},
        ),
        201,
    )

    assert_error(
        client.get(
            f"/api/requests/{user_b_request['id']}/instances", headers=user_a_headers
        ),
        404,
        "Request not found",
    )
    assert_error(
        client.post(
            f"/api/requests/{user_b_request['id']}/instances",
            headers=user_a_headers,
            json={"name": "No access"},
        ),
        404,
        "Request not found",
    )
    assert_error(
        client.get(
            f"/api/request-instances/{user_b_instance['id']}", headers=user_a_headers
        ),
        404,
        "Request instance not found",
    )
    assert_error(
        client.put(
            f"/api/request-instances/{user_b_instance['id']}",
            headers=user_a_headers,
            json={"name": "No access"},
        ),
        404,
        "Request instance not found",
    )
    assert_error(
        client.delete(
            f"/api/request-instances/{user_b_instance['id']}", headers=user_a_headers
        ),
        404,
        "Request instance not found",
    )
