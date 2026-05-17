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


def test_login_rejects_malformed_json(client):
    assert_error(
        client.post(
            "/api/auth/login",
            data='{',
            content_type="application/json",
        ),
        400,
        "Invalid JSON request body",
    )

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

def test_wsgi_browser_session_cookie_persists_login_for_collections(app, sqlite_connection):
    """A WSGI/browser cookie flow keeps login state without shared test-client memory."""
    import io
    import json
    from http.cookies import SimpleCookie

    from django.contrib.auth.hashers import make_password

    from pypostboy.db.serializers import timestamp
    from pypostboy.repositories.collections import Collections

    now = timestamp()
    cursor = sqlite_connection.execute(
        """INSERT INTO users (
            username, email, password_hash, auth_provider, auth_subject, created_at, updated_at
        ) VALUES (?, ?, ?, 'local', NULL, ?, ?)""",
        (
            "wsgi-browser-user",
            "wsgi-browser-user@example.test",
            make_password("password123"),
            now,
            now,
        ),
    )
    sqlite_connection.commit()
    user_id = cursor.lastrowid
    collection = Collections.create(user_id, {"name": "WSGI browser collection"})

    def wsgi_request(method, path, payload=None, cookie_header=None):
        body = b'' if payload is None else json.dumps(payload).encode('utf-8')
        environ = {
            'REQUEST_METHOD': method,
            'PATH_INFO': path,
            'wsgi.input': io.BytesIO(body),
            'CONTENT_LENGTH': str(len(body)),
        }
        if payload is not None:
            environ['CONTENT_TYPE'] = 'application/json'
            environ['HTTP_CONTENT_TYPE'] = 'application/json'
        if cookie_header:
            environ['HTTP_COOKIE'] = cookie_header

        captured = {}

        def start_response(status, headers):
            captured['status'] = status
            captured['headers'] = dict(headers)

        response_body = b''.join(app(environ, start_response))
        return captured['status'], captured['headers'], json.loads(response_body.decode('utf-8'))

    login_status, login_headers, login_payload = wsgi_request(
        'POST',
        '/api/auth/login',
        {'username': 'wsgi-browser-user', 'password': 'password123'},
    )
    assert login_status.startswith('200')
    assert login_payload['success'] is True
    assert login_payload['data']['id'] == user_id
    assert 'Set-Cookie' in login_headers
    session_cookie = SimpleCookie(login_headers['Set-Cookie'])
    assert 'sessionid' in session_cookie
    assert session_cookie['sessionid']['samesite'] == 'Lax'

    cookie_header = session_cookie.output(header='', attrs=[]).strip()
    collections_status, _headers, collections_payload = wsgi_request(
        'GET',
        '/api/collections',
        cookie_header=cookie_header,
    )
    assert collections_status.startswith('200')
    assert collections_payload['success'] is True
    assert len(collections_payload['data']) == 1
    persisted_collection = collections_payload['data'][0]
    assert persisted_collection['id'] == collection['id']
    assert persisted_collection['name'] == 'WSGI browser collection'
    assert persisted_collection['user_id'] == user_id


def _set_cookie(client, name, value):
    client._client.cookies[name] = value


def _assert_deletes_legacy_identity_cookies(response):
    for cookie_name in ("postboy_user_id", "user_id"):
        assert cookie_name in response.cookies
        assert response.cookies[cookie_name]["max-age"] == 0

def test_invalid_user_id_cookie_continue_as_guest_clears_cookie(client):
    _set_cookie(client, "user_id", "999999")

    response = client.get("/api/auth/me")
    current = assert_success(response)

    assert current["username"] == "local_user"
    assert current["is_guest"] is True
    _assert_deletes_legacy_identity_cookies(response)

def test_valid_legacy_user_id_cookie_is_ignored_and_cleared(client, user_b):
    _set_cookie(client, "user_id", str(user_b["id"]))

    response = client.get("/api/auth/me")
    current = assert_success(response)

    assert current["username"] == "local_user"
    assert current["is_guest"] is True
    assert current["id"] != user_b["id"]
    _assert_deletes_legacy_identity_cookies(response)

def test_invalid_cookie_does_not_override_login(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "cookie-login-user", "password": "password123"},
        ),
        201,
    )
    assert registered["username"] == "cookie-login-user"
    assert_success(client.post("/api/auth/logout"))

    _set_cookie(client, "user_id", "999999")
    login_response = client.post(
        "/api/auth/login",
        json={"username": "cookie-login-user", "password": "password123"},
    )
    logged_in = assert_success(login_response)

    assert logged_in["id"] == registered["id"]
    assert logged_in["is_guest"] is False
    _assert_deletes_legacy_identity_cookies(login_response)

def test_stale_cookie_does_not_override_session_and_logout_clears_it(client, user_b):
    session_user = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "session-user", "password": "password123"},
        ),
        201,
    )
    _set_cookie(client, "user_id", str(user_b["id"]))

    current = assert_success(client.get("/api/auth/me"))
    assert current["id"] == session_user["id"]

    logout_response = client.post("/api/auth/logout")
    current_after_logout = assert_success(logout_response)
    assert current_after_logout["username"] == "local_user"
    assert current_after_logout["is_guest"] is True
    _assert_deletes_legacy_identity_cookies(logout_response)


def test_registration_conflict_query_omits_nullable_email_parameter_when_absent():
    """PostgreSQL cannot infer a standalone NULL parameter in IS NOT NULL."""
    from pypostboy.routes.auth import _registration_conflict_query

    sql, params = _registration_conflict_query("new-user", None)

    assert sql == "SELECT id FROM users WHERE username = ?"
    assert params == ("new-user",)


def test_registration_conflict_query_checks_email_when_provided():
    from pypostboy.routes.auth import _registration_conflict_query

    sql, params = _registration_conflict_query("new-user", "new-user@example.test")

    assert sql == "SELECT id FROM users WHERE username = ? OR email = ?"
    assert params == ("new-user", "new-user@example.test")
