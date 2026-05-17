"""Authentication API views for PostBoy."""

from django.contrib.auth.hashers import check_password, make_password
from django.views.decorators.csrf import csrf_exempt

from pypostboy.auth import (
    USER_ID_COOKIE_NAMES,
    clear_legacy_identity_cookies,
    get_current_user,
)
from pypostboy.db.adapter import (
    execute as db_execute,
    insert_and_get_id,
    row_to_mapping,
)
from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import DEFAULT_LOCAL_USERNAME
from pypostboy.db.serializers import timestamp
from pypostboy.djangoapp.request import BadJsonBody, json_body
from pypostboy.http.responses import created, error, ok


def _public_user(user):
    """Return a client-safe user representation."""
    if not user:
        return None
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "auth_provider": user["auth_provider"],
        "is_guest": user["username"] == DEFAULT_LOCAL_USERNAME
        and not user["password_hash"],
    }


def _normalize_credentials(payload):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    email = (payload.get("email") or "").strip() or None
    return username, password, email


def current_user(request):
    """Return the current session/header/cookie resolved user."""
    return ok(_public_user(get_current_user(request)))


def _registration_conflict_query(username, email):
    """Return SQL and params for detecting conflicting register identities."""
    if email is None:
        return "SELECT id FROM users WHERE username = ?", (username,)
    return "SELECT id FROM users WHERE username = ? OR email = ?", (username, email)


@csrf_exempt
def login(request):
    """Start a session for a username/password user."""
    try:
        username, password, _email = _normalize_credentials(
            json_body(request, allow_blank=False)
        )
    except BadJsonBody:
        return error("Invalid JSON request body", 400)
    if not username or not password:
        return error("Username and password are required", 400)

    user = db_execute(
        get_connection(),
        "SELECT * FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if (
        not user
        or not user["password_hash"]
        or not check_password(password, user["password_hash"])
    ):
        return error("Invalid username or password", 401)

    request.session["user_id"] = user["id"]
    request.session.modified = True
    request.current_user = dict(row_to_mapping(user))
    return clear_legacy_identity_cookies(ok(_public_user(user)))


@csrf_exempt
def register(request):
    """Create a local username/password user and start a session."""
    try:
        username, password, email = _normalize_credentials(
            json_body(request, allow_blank=False)
        )
    except BadJsonBody:
        return error("Invalid JSON request body", 400)
    if not username or not password:
        return error("Username and password are required", 400)
    if len(password) < 8:
        return error("Password must be at least 8 characters", 400)

    conn = get_connection()
    conflict_sql, conflict_params = _registration_conflict_query(username, email)
    existing = db_execute(conn, conflict_sql, conflict_params).fetchone()
    if existing:
        return error("Username or email already exists", 409)

    now = timestamp()
    user_id = insert_and_get_id(
        conn,
        """INSERT INTO users (
            username, email, password_hash, auth_provider, auth_subject, created_at, updated_at
        ) VALUES (?, ?, ?, 'local', NULL, ?, ?)""",
        (username, email, make_password(password), now, now),
    )
    conn.commit()

    user = db_execute(
        conn,
        "SELECT * FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    request.session["user_id"] = user["id"]
    request.session.modified = True
    request.current_user = dict(row_to_mapping(user))
    return clear_legacy_identity_cookies(created(_public_user(user)))


@csrf_exempt
def logout(request):
    """Clear the current browser session."""
    request.session.pop("user_id", None)
    request.session.modified = True
    for cookie_name in USER_ID_COOKIE_NAMES:
        request.COOKIES.pop(cookie_name, None)
    if hasattr(request, "current_user"):
        delattr(request, "current_user")
    return clear_legacy_identity_cookies(ok(_public_user(get_current_user(request))))
