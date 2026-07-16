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



def test_session_auth_post_rejects_without_csrf_token(app):
    from django.test import Client as DjangoClient

    client = DjangoClient(enforce_csrf_checks=True)
    response = client.post(
        "/api/auth/register",
        data='{"username": "csrf-user", "password": "password123"}',
        content_type="application/json",
    )
    assert response.status_code == 403


def test_session_auth_post_succeeds_with_valid_csrf_token(app):
    from django.test import Client as DjangoClient

    client = DjangoClient(enforce_csrf_checks=True)
    csrf_response = client.get("/api/auth/csrf")
    assert csrf_response.status_code == 200
    csrf_token = csrf_response.cookies["csrftoken"].value

    response = client.post(
        "/api/auth/register",
        data='{"username": "csrf-user-ok", "password": "password123"}',
        content_type="application/json",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["success"] is True


def test_login_succeeds_with_csrf_for_localhost_8080_origin(app, monkeypatch):
    from django.test import Client as DjangoClient

    monkeypatch.setattr(
        'django.conf.settings.CSRF_TRUSTED_ORIGINS',
        ['http://localhost:8080', 'http://127.0.0.1:8080'],
        raising=False,
    )

    client = DjangoClient(enforce_csrf_checks=True)
    csrf_response = client.get('/api/auth/csrf')
    assert csrf_response.status_code == 200
    csrf_token = csrf_response.cookies['csrftoken'].value

    register_response = client.post(
        '/api/auth/register',
        data='{"username": "csrf-login-user", "password": "password123"}',
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token,
        HTTP_ORIGIN='http://localhost:8080',
    )
    assert register_response.status_code == 201

    csrf_token = register_response.cookies['csrftoken'].value

    logout_response = client.post(
        '/api/auth/logout',
        HTTP_X_CSRFTOKEN=csrf_token,
        HTTP_ORIGIN='http://localhost:8080',
    )
    assert logout_response.status_code == 200

    login_response = client.post(
        '/api/auth/login',
        data='{"username": "csrf-login-user", "password": "password123"}',
        content_type='application/json',
        HTTP_X_CSRFTOKEN=csrf_token,
        HTTP_ORIGIN='http://localhost:8080',
    )
    assert login_response.status_code == 200
    payload = login_response.json()
    assert payload['success'] is True
    assert payload['data']['username'] == 'csrf-login-user'

def test_register_login_logout_session_scopes_collections(client):
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "browser-user", "password": "password123"},
        ),
        201,
    )
    user = registration["user"]
    assert registration["recovery_key"]
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
    assert_error(client.get("/api/collections"), 401, "Authentication required")

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


def test_login_accepts_email_after_registering_with_email(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={
                "username": "email-login-user",
                "email": "email-login-user@example.test",
                "password": "password123",
            },
        ),
        201,
    )
    assert_success(client.post("/api/auth/logout"))

    logged_in = assert_success(
        client.post(
            "/api/auth/login",
            json={"email": "email-login-user@example.test", "password": "password123"},
        )
    )

    assert logged_in["id"] == registered["user"]["id"]
    assert logged_in["username"] == "email-login-user"
    assert logged_in["email"] == "email-login-user@example.test"


def test_login_accepts_identity_field(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={
                "username": "identity-login-user",
                "email": "identity-login-user@example.test",
                "password": "password123",
            },
        ),
        201,
    )
    assert_success(client.post("/api/auth/logout"))

    logged_in = assert_success(
        client.post(
            "/api/auth/login",
            json={"identity": "identity-login-user@example.test", "password": "password123"},
        )
    )

    assert logged_in["id"] == registered["user"]["id"]


def test_token_endpoint_accepts_email(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={
                "username": "email-token-user",
                "email": "email-token-user@example.test",
                "password": "password123",
            },
        ),
        201,
    )
    assert_success(client.post("/api/auth/logout"))

    token_payload = assert_success(
        client.post(
            "/api/auth/token",
            json={"email": "email-token-user@example.test", "password": "password123"},
        )
    )

    current = assert_success(
        client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token_payload['token']}"},
        )
    )
    assert current["id"] == registered["user"]["id"]


def test_invalid_email_password_uses_generic_auth_error(client):
    assert_success(
        client.post(
            "/api/auth/register",
            json={
                "username": "invalid-email-password-user",
                "email": "invalid-email-password-user@example.test",
                "password": "password123",
            },
        ),
        201,
    )
    assert_success(client.post("/api/auth/logout"))

    assert_error(
        client.post(
            "/api/auth/login",
            json={"email": "invalid-email-password-user@example.test", "password": "wrong-password"},
        ),
        401,
        "Invalid username or password",
    )

def test_login_rate_limit_enforces_failed_attempt_threshold(client):
    assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "login-rate-limit-user", "password": "password123"},
        ),
        201,
    )
    assert_success(client.post("/api/auth/logout"))

    for _ in range(5):
        assert_error(
            client.post(
                "/api/auth/login",
                json={"username": "login-rate-limit-user", "password": "wrong-password"},
            ),
            401,
            "Invalid username or password",
        )

    assert_error(
        client.post(
            "/api/auth/login",
            json={"username": "login-rate-limit-user", "password": "password123"},
        ),
        429,
        "Too many authentication attempts, try again later",
    )


def test_token_rate_limit_enforces_failed_attempt_threshold(client):
    assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "token-rate-limit-user", "password": "password123"},
        ),
        201,
    )
    assert_success(client.post("/api/auth/logout"))

    for _ in range(5):
        assert_error(
            client.post(
                "/api/auth/token",
                json={"username": "token-rate-limit-user", "password": "wrong-password"},
            ),
            401,
            "Invalid username or password",
        )

    assert_error(
        client.post(
            "/api/auth/token",
            json={"username": "token-rate-limit-user", "password": "password123"},
        ),
        429,
        "Too many authentication attempts, try again later",
    )


def test_protected_api_routes_require_session_or_bearer_token(client):
    protected_requests = [
        client.get("/api/collections"),
        client.post("/api/collections", json={"name": "No auth"}),
        client.get("/api/collections/1/requests"),
        client.post("/api/collections/1/requests", json={"name": "No auth"}),
        client.get("/api/requests/1"),
        client.post("/api/requests/1/instances", json={"name": "No auth"}),
        client.get("/api/request-instances/1"),
        client.post("/api/import", json={"type": "curl", "data": "curl https://api.example.test"}),
    ]

    for response in protected_requests:
        assert_error(response, 401, "Authentication required")

def test_auth_me_uses_default_local_user_for_legacy_local_mode(client):
    current = assert_success(client.get("/api/auth/me"))
    assert current["username"] == "local_user"
    assert current["is_guest"] is True


def test_auth_session_register_logout_login_and_me_flow(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "session-flow-user", "password": "password123"},
        ),
        201,
    )
    assert "sessionid" in client._client.cookies
    assert registered["user"]["username"] == "session-flow-user"

    current = assert_success(client.get("/api/auth/me"))
    assert current["id"] == registered["user"]["id"]
    assert current["username"] == "session-flow-user"

    assert_success(client.post("/api/auth/logout"))
    logged_in = assert_success(
        client.post(
            "/api/auth/login",
            json={"username": "session-flow-user", "password": "password123"},
        )
    )
    assert logged_in["id"] == registered["user"]["id"]

    current_after_login = assert_success(client.get("/api/auth/me"))
    assert current_after_login["id"] == registered["user"]["id"]
    assert current_after_login["username"] == "session-flow-user"


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

    def wsgi_request(method, path, payload=None, cookie_header=None, headers=None):
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
        for key, value in (headers or {}).items():
            environ[f"HTTP_{key.upper().replace('-', '_')}"] = value

        captured = {}

        def start_response(status, headers):
            captured['status'] = status
            captured['headers'] = headers

        response_body = b''.join(app(environ, start_response))
        header_map = {}
        for key, value in captured['headers']:
            if key.lower() == 'set-cookie' and key in header_map:
                header_map[key] = f"{header_map[key]}, {value}"
            else:
                header_map[key] = value
        return captured['status'], header_map, json.loads(response_body.decode('utf-8'))

    csrf_status, csrf_headers, csrf_payload = wsgi_request('GET', '/api/auth/csrf')
    assert csrf_status.startswith('200')
    assert csrf_payload['success'] is True
    csrf_cookie = SimpleCookie(csrf_headers['Set-Cookie'])
    csrf_cookie_header = '; '.join(f'{morsel.key}={morsel.value}' for morsel in csrf_cookie.values())

    login_status, login_headers, login_payload = wsgi_request(
        'POST',
        '/api/auth/login',
        {'username': 'wsgi-browser-user', 'password': 'password123'},
        cookie_header=csrf_cookie_header,
        headers={'X-CSRFToken': csrf_cookie['csrftoken'].value},
    )
    assert login_status.startswith('200')
    assert login_payload['success'] is True
    assert login_payload['data']['id'] == user_id
    assert 'Set-Cookie' in login_headers
    session_cookie = SimpleCookie(login_headers['Set-Cookie'])
    assert 'sessionid' in session_cookie
    assert session_cookie['sessionid']['samesite'] == 'Lax'

    cookie_header = '; '.join(f'{morsel.key}={morsel.value}' for morsel in session_cookie.values())
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


def _session_cookie_value(client):
    return client._client.cookies["sessionid"].value


def test_logout_invalidates_reused_server_side_session_cookie(app):
    client = app.test_client()
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "logout-invalidate-user", "password": "password123"},
        ),
        201,
    )
    assert_success(client.post("/api/collections", json={"name": "Private"}), 201)

    reused_cookie_client = app.test_client()
    _set_cookie(reused_cookie_client, "sessionid", _session_cookie_value(client))
    before_logout = assert_success(reused_cookie_client.get("/api/auth/me"))
    assert before_logout["id"] == registered["user"]["id"]

    assert_success(client.post("/api/auth/logout"))

    after_logout = assert_success(reused_cookie_client.get("/api/auth/me"))
    assert after_logout["username"] == "local_user"
    assert after_logout["is_guest"] is True
    assert_error(reused_cookie_client.get("/api/collections"), 401, "Authentication required")


def test_password_reset_invalidates_reused_server_side_session_cookie(app):
    client = app.test_client()
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "reset-invalidate-user", "password": "password123"},
        ),
        201,
    )
    assert_success(client.post("/api/collections", json={"name": "Before reset"}), 201)

    reused_cookie_client = app.test_client()
    _set_cookie(reused_cookie_client, "sessionid", _session_cookie_value(client))
    before_reset = assert_success(reused_cookie_client.get("/api/auth/me"))
    assert before_reset["id"] == registration["user"]["id"]

    reset = assert_success(
        client.post(
            "/api/auth/recover/reset",
            json={
                "username": "reset-invalidate-user",
                "recovery_key": registration["recovery_key"],
                "new_password": "newpassword123",
            },
        )
    )
    assert reset["password_reset"] is True

    after_reset = assert_success(reused_cookie_client.get("/api/auth/me"))
    assert after_reset["username"] == "local_user"
    assert after_reset["is_guest"] is True
    assert_error(reused_cookie_client.get("/api/collections"), 401, "Authentication required")


def test_stale_user_id_cookie_is_ignored(client, user_b):
    _set_cookie(client, "user_id", str(user_b["id"]))

    response = client.get("/api/auth/me")
    current = assert_success(response)

    assert current["username"] == "local_user"
    assert current["is_guest"] is True
    assert current["id"] != user_b["id"]
    assert "user_id" not in response.cookies


def test_api_token_clients_can_post_without_csrf_token(app, sqlite_connection):
    from django.contrib.auth.hashers import make_password
    from django.test import Client as DjangoClient

    from pypostboy.db.serializers import timestamp

    now = timestamp()
    sqlite_connection.execute(
        """INSERT INTO users (
            username, email, password_hash, auth_provider, auth_subject, created_at, updated_at
        ) VALUES (?, ?, ?, 'local', NULL, ?, ?)""",
        (
            "token-csrf-user",
            "token-csrf-user@example.test",
            make_password("password123"),
            now,
            now,
        ),
    )
    sqlite_connection.commit()

    csrf_client = DjangoClient(enforce_csrf_checks=True)
    token_response = csrf_client.post(
        "/api/auth/token",
        data='{"username": "token-csrf-user", "password": "password123"}',
        content_type="application/json",
    )
    assert token_response.status_code == 200
    token = token_response.json()["data"]["token"]

    collection_response = csrf_client.post(
        "/api/collections",
        data='{"name": "Token collection"}',
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {token}",
    )
    assert collection_response.status_code == 201
    payload = collection_response.json()
    assert payload["success"] is True
    assert payload["data"]["name"] == "Token collection"


def test_api_token_endpoint_issues_short_lived_bearer_token(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "token-user", "password": "password123"},
        ),
        201,
    )
    assert_success(client.post("/api/auth/logout"))

    token_payload = assert_success(
        client.post(
            "/api/auth/token",
            json={"username": "token-user", "password": "password123"},
        )
    )

    assert token_payload["token_type"] == "Bearer"
    assert token_payload["expires_in"] == 15 * 60
    token_headers = {"Authorization": f"Bearer {token_payload['token']}"}

    current = assert_success(client.get("/api/auth/me", headers=token_headers))
    assert current["id"] == registered["user"]["id"]

def test_password_reset_invalidates_existing_api_tokens(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "token-reset-user", "password": "password123"},
        ),
        201,
    )
    recovery_key = registered["recovery_key"]
    assert_success(client.post("/api/auth/logout"))

    old_token_payload = assert_success(
        client.post(
            "/api/auth/token",
            json={"username": "token-reset-user", "password": "password123"},
        )
    )
    old_token_headers = {"Authorization": f"Bearer {old_token_payload['token']}"}
    assert_success(client.get("/api/auth/me", headers=old_token_headers))

    reset_payload = assert_success(
        client.post(
            "/api/auth/recover/reset",
            json={
                "username": "token-reset-user",
                "recovery_key": recovery_key,
                "new_password": "password456",
            },
        )
    )
    assert reset_payload["password_reset"] is True

    assert_error(
        client.get("/api/auth/me", headers=old_token_headers),
        401,
        "Invalid API token",
    )

    new_token_payload = assert_success(
        client.post(
            "/api/auth/token",
            json={"username": "token-reset-user", "password": "password456"},
        )
    )
    new_token_headers = {"Authorization": f"Bearer {new_token_payload['token']}"}
    current = assert_success(client.get("/api/auth/me", headers=new_token_headers))
    assert current["id"] == registered["user"]["id"]


def test_invalid_api_token_is_rejected(client):
    assert_error(
        client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"}),
        401,
        "Invalid API token",
    )


def test_postboy_auth_backend_authenticate_uses_password_hash_mapping(sqlite_connection):
    from django.contrib.auth.hashers import make_password

    from pypostboy.apps.core.models import User
    from pypostboy.db.serializers import timestamp
    from pypostboy.djangoapp.auth_backend import PostBoyAuthBackend

    now = timestamp()
    username = "backend-auth-user"
    raw_password = "password123"
    hashed_password = make_password(raw_password)

    sqlite_connection.execute(
        """INSERT INTO users (
            username, email, password_hash, auth_provider, auth_subject, created_at, updated_at
        ) VALUES (?, ?, ?, 'local', NULL, ?, ?)""",
        (username, f"{username}@example.test", hashed_password, now, now),
    )
    sqlite_connection.commit()

    user = User.objects.get(username=username)
    assert user.password == hashed_password

    backend = PostBoyAuthBackend()
    authenticated = backend.authenticate(None, username=username, password=raw_password)
    assert authenticated is not None
    assert authenticated.username == username

    assert backend.authenticate(None, username=username, password="wrong-password") is None

def test_invalid_cookie_does_not_override_login(client):
    registered = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "cookie-login-user", "password": "password123"},
        ),
        201,
    )
    assert registered["user"]["username"] == "cookie-login-user"
    assert_success(client.post("/api/auth/logout"))

    _set_cookie(client, "user_id", "999999")
    login_response = client.post(
        "/api/auth/login",
        json={"username": "cookie-login-user", "password": "password123"},
    )
    logged_in = assert_success(login_response)

    assert logged_in["id"] == registered["user"]["id"]
    assert logged_in["is_guest"] is False
    assert "user_id" not in login_response.cookies

def test_stale_cookie_does_not_override_session(client, user_b):
    session_user = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "session-user", "password": "password123"},
        ),
        201,
    )
    _set_cookie(client, "user_id", str(user_b["id"]))

    current = assert_success(client.get("/api/auth/me"))
    assert current["id"] == session_user["user"]["id"]

    logout_response = client.post("/api/auth/logout")
    current_after_logout = assert_success(logout_response)
    assert current_after_logout["username"] == "local_user"
    assert current_after_logout["is_guest"] is True


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



def test_register_returns_conflict_when_insert_raises_sqlite_integrity_error(client, monkeypatch):
    import sqlite3

    from pypostboy.routes import auth

    def _raise_unique(*_args, **_kwargs):
        raise sqlite3.IntegrityError("UNIQUE constraint failed: users.username")

    monkeypatch.setattr(auth, "insert_and_get_id", _raise_unique)

    response = client.post(
        "/api/auth/register",
        json={"username": "conflict-user", "password": "password123"},
    )

    assert_error(response, 409, "Username or email already exists")


def test_register_returns_conflict_when_insert_raises_postgres_unique_violation(client, monkeypatch):
    from pypostboy.routes import auth

    class FakeUniqueViolation(Exception):
        sqlstate = "23505"

    def _raise_unique(*_args, **_kwargs):
        raise FakeUniqueViolation("duplicate key value violates unique constraint")

    monkeypatch.setattr(auth, "insert_and_get_id", _raise_unique)

    response = client.post(
        "/api/auth/register",
        json={"username": "conflict-user-pg", "password": "password123"},
    )

    assert_error(response, 409, "Username or email already exists")

def test_recover_request_existing_and_missing_accounts_return_identical_responses(client):
    from pypostboy.apps.core.models import User

    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={
                "username": "forgot-existing-user",
                "email": "forgot-existing-user@example.test",
                "password": "password123",
            },
        ),
        201,
    )
    user = User.objects.get(username="forgot-existing-user")
    previous_recovery_hash = user.recovery_key_hash

    existing_payload = assert_success(
        client.post(
            "/api/auth/recover/request",
            json={"email": "forgot-existing-user@example.test"},
        )
    )
    user.refresh_from_db()

    missing_payload = assert_success(
        client.post(
            "/api/auth/recover/request",
            json={"email": "forgot-missing-user@example.test"},
        )
    )

    assert existing_payload == missing_payload
    assert existing_payload == {
        "recovery_requested": True,
        "message": (
            "If the account exists, recovery instructions have been prepared. "
            "PyPostBoy is local-first and does not send email unless a notification adapter is configured."
        ),
    }
    assert user.recovery_key_hash != previous_recovery_hash
    assert user.recovery_key_hash != registration["recovery_key"]


def test_recover_request_accepts_username_without_exposing_missing_accounts(client):
    assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "forgot-username-user", "password": "password123"},
        ),
        201,
    )

    existing_response = client.post(
        "/api/auth/recover/request",
        json={"username": "forgot-username-user"},
    )
    missing_response = client.post(
        "/api/auth/recover/request",
        json={"username": "forgot-username-missing"},
    )

    assert existing_response.status_code == missing_response.status_code == 200
    assert existing_response.get_json() == missing_response.get_json()


def test_recovery_verify_reset_and_rotate_key(client):
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "recover-user", "password": "password123"},
        ),
        201,
    )
    recovery_key = registration["recovery_key"]

    verified = assert_success(
        client.post(
            "/api/auth/recover/verify",
            json={"username": "recover-user", "recovery_key": recovery_key},
        )
    )
    assert verified["valid"] is True

    reset = assert_success(
        client.post(
            "/api/auth/recover/reset",
            json={
                "username": "recover-user",
                "recovery_key": recovery_key,
                "new_password": "newpassword123",
            },
        )
    )
    assert reset["password_reset"] is True
    assert reset["recovery_key"]
    assert reset["recovery_key"] != recovery_key

    assert_error(
        client.post(
            "/api/auth/recover/verify",
            json={"username": "recover-user", "recovery_key": recovery_key},
        ),
        401,
        "Invalid recovery credentials",
    )

    logged_in = assert_success(
        client.post(
            "/api/auth/login",
            json={"username": "recover-user", "password": "newpassword123"},
        )
    )
    assert logged_in["username"] == "recover-user"


def test_recovery_verify_successes_do_not_consume_failure_quota(client):
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "recover-valid-repeat-user", "password": "password123"},
        ),
        201,
    )

    for _ in range(6):
        verified = assert_success(
            client.post(
                "/api/auth/recover/verify",
                json={
                    "username": "recover-valid-repeat-user",
                    "recovery_key": registration["recovery_key"],
                },
            )
        )
        assert verified["valid"] is True


def test_successful_recovery_verify_clears_prior_failed_attempts(client):
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "recover-clear-failures-user", "password": "password123"},
        ),
        201,
    )

    for _ in range(4):
        assert_error(
            client.post(
                "/api/auth/recover/verify",
                json={"username": "recover-clear-failures-user", "recovery_key": "wrong"},
            ),
            401,
            "Invalid recovery credentials",
        )

    verified = assert_success(
        client.post(
            "/api/auth/recover/verify",
            json={
                "username": "recover-clear-failures-user",
                "recovery_key": registration["recovery_key"],
            },
        )
    )
    assert verified["valid"] is True

    for _ in range(5):
        assert_error(
            client.post(
                "/api/auth/recover/verify",
                json={"username": "recover-clear-failures-user", "recovery_key": "wrong"},
            ),
            401,
            "Invalid recovery credentials",
        )

    assert_error(
        client.post(
            "/api/auth/recover/verify",
            json={
                "username": "recover-clear-failures-user",
                "recovery_key": registration["recovery_key"],
            },
        ),
        429,
        "Too many recovery attempts, try again later",
    )


def test_recovery_rate_limit_enforces_threshold(client):
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "rate-limit-user", "password": "password123"},
        ),
        201,
    )

    for _ in range(5):
        assert_error(
            client.post(
                "/api/auth/recover/verify",
                json={"username": "rate-limit-user", "recovery_key": "wrong"},
            ),
            401,
            "Invalid recovery credentials",
        )

    assert_error(
        client.post(
            "/api/auth/recover/verify",
            json={"username": "rate-limit-user", "recovery_key": registration["recovery_key"]},
        ),
        429,
        "Too many recovery attempts, try again later",
    )


def test_recovery_rate_limit_resets_after_window_expiry(client, monkeypatch):
    import time

    from pypostboy.routes import auth

    monkeypatch.setattr(auth, "RECOVERY_WINDOW_SECONDS", 1)
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "rate-limit-reset-user", "password": "password123"},
        ),
        201,
    )

    for _ in range(5):
        assert_error(
            client.post(
                "/api/auth/recover/verify",
                json={"username": "rate-limit-reset-user", "recovery_key": "wrong"},
            ),
            401,
            "Invalid recovery credentials",
        )

    assert_error(
        client.post(
            "/api/auth/recover/verify",
            json={"username": "rate-limit-reset-user", "recovery_key": registration["recovery_key"]},
        ),
        429,
        "Too many recovery attempts, try again later",
    )

    time.sleep(1.1)
    verified = assert_success(
        client.post(
            "/api/auth/recover/verify",
            json={"username": "rate-limit-reset-user", "recovery_key": registration["recovery_key"]},
        )
    )
    assert verified["valid"] is True


def test_recovery_rate_limit_is_consistent_across_repeated_calls(client):
    registration = assert_success(
        client.post(
            "/api/auth/register",
            json={"username": "rate-limit-consistency-user", "password": "password123"},
        ),
        201,
    )

    for _ in range(5):
        assert_error(
            client.post(
                "/api/auth/recover/reset",
                json={
                    "username": "rate-limit-consistency-user",
                    "recovery_key": "wrong",
                    "new_password": "newpassword123",
                },
            ),
            401,
            "Invalid recovery credentials",
        )

    assert_error(
        client.post(
            "/api/auth/recover/reset",
            json={
                "username": "rate-limit-consistency-user",
                "recovery_key": registration["recovery_key"],
                "new_password": "newpassword123",
            },
        ),
        429,
        "Too many recovery attempts, try again later",
    )

    assert_error(
        client.post(
            "/api/auth/recover/verify",
            json={
                "username": "rate-limit-consistency-user",
                "recovery_key": registration["recovery_key"],
            },
        ),
        429,
        "Too many recovery attempts, try again later",
    )
