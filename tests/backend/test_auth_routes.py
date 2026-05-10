"""Authentication route tests."""


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


def test_register_login_logout_session_scopes_collections(client):
    user = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "browser-user", "password": "password123"},
        ),
        201,
    )
    assert user["username"] == "browser-user"
    assert user["is_guest"] is False
    assert "password_hash" not in user

    created_collection = assert_success(
        client.post("/api/collections", json={"name": "Browser collection"}),
        201,
    )
    assert created_collection["user_id"] == user["id"]
    assert len(assert_success(client.get("/api/collections"))) == 1

    current_after_logout = assert_success(client.post("/api/auth/logout"))
    assert current_after_logout["username"] == "local_user"
    assert current_after_logout["is_guest"] is True
    assert_success(client.get("/api/collections")) == []

    assert_error(
        client.post(
            "/api/auth/login",
            json={"username": "browser-user", "password": "wrong-password"},
        ),
        401,
        "Invalid username or password",
    )

    logged_in = assert_success(
        client.post(
            "/api/auth/login",
            json={"username": "browser-user", "password": "password123"},
        )
    )
    assert logged_in["id"] == user["id"]
    assert logged_in["is_guest"] is False
    assert len(assert_success(client.get("/api/collections"))) == 1


def test_auth_me_uses_default_local_user_for_legacy_local_mode(client):
    current = assert_success(client.get("/api/auth/me"))
    assert current["username"] == "local_user"
    assert current["is_guest"] is True
