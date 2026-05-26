"""Authentication API views for PostBoy."""
import hashlib
import hmac
import secrets
import sqlite3

from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.core.cache import cache
from django.contrib.auth.hashers import make_password
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

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

RECOVERY_KEY_BYTES = 32
GENERIC_RECOVERY_ERROR = "Invalid recovery credentials"
RECOVERY_MAX_ATTEMPTS = 5
RECOVERY_WINDOW_SECONDS = 300


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


def _normalize_recovery_identity(payload):
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip()
    return username, email


def _validate_password_policy(password):
    return len(password or "") >= 8


def _issue_recovery_key():
    return secrets.token_urlsafe(RECOVERY_KEY_BYTES)


def _hash_recovery_key(recovery_key):
    return hashlib.sha256((recovery_key or "").encode("utf-8")).hexdigest()


def _constant_time_recovery_match(recovery_key, expected_hash):
    candidate_hash = _hash_recovery_key(recovery_key)
    return hmac.compare_digest(candidate_hash, expected_hash or "")


def _hashed_recovery_identity(identity):
    normalized = (identity or "unknown").strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _hashed_remote_addr(request):
    remote_addr = (request.META.get("REMOTE_ADDR") or "unknown").strip()
    return hashlib.sha256(remote_addr.encode("utf-8")).hexdigest()


def _is_recovery_rate_limited(request, identity):
    key = f"recover_rate_limit::{_hashed_remote_addr(request)}::{_hashed_recovery_identity(identity)}"
    current = cache.get(key)
    if current is None:
        cache.add(key, 1, timeout=RECOVERY_WINDOW_SECONDS)
        return False
    if current >= RECOVERY_MAX_ATTEMPTS:
        return True
    cache.incr(key)
    return False


def current_user(request):
    """Return the current session/header/cookie resolved user."""
    return ok(_public_user(get_current_user(request)))


@ensure_csrf_cookie
def csrf_token(request):
    """Set and return CSRF token for SPA bootstrapping."""
    return ok({"csrf_token": get_token(request)})


def _is_unique_constraint_error(exc):
    """Return True if the exception represents a uniqueness constraint violation."""

    def _matches(candidate):
        if isinstance(candidate, sqlite3.IntegrityError):
            return True
        if getattr(candidate, "sqlstate", None) == "23505":
            return True
        if getattr(candidate, "pgcode", None) == "23505":
            return True
        if candidate.__class__.__name__ == "UniqueViolation":
            return True
        return False

    current = exc
    while current is not None:
        if _matches(current):
            return True
        current = getattr(current, "__cause__", None) or getattr(current, "__context__", None)
    return False

def _registration_conflict_query(username, email):
    """Return SQL and params for detecting conflicting register identities."""
    if email is None:
        return "SELECT id FROM users WHERE username = ?", (username,)
    return "SELECT id FROM users WHERE username = ? OR email = ?", (username, email)


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

    user = authenticate(request, username=username, password=password)
    if not user:
        return error("Invalid username or password", 401)

    django_login(request, user, backend="pypostboy.djangoapp.auth_backend.PostBoyAuthBackend")
    row = db_execute(get_connection(), "SELECT * FROM users WHERE id = ?", (user.id,)).fetchone()
    request.current_user = dict(row_to_mapping(row))
    return clear_legacy_identity_cookies(ok(_public_user(row)))


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
    if not _validate_password_policy(password):
        return error("Password must be at least 8 characters", 400)

    conn = get_connection()
    conflict_sql, conflict_params = _registration_conflict_query(username, email)
    existing = db_execute(conn, conflict_sql, conflict_params).fetchone()
    if existing:
        return error("Username or email already exists", 409)

    now = timestamp()
    recovery_key = _issue_recovery_key()
    recovery_key_hash = _hash_recovery_key(recovery_key)
    try:
        user_id = insert_and_get_id(
            conn,
            """INSERT INTO users (
                username, email, password_hash, auth_provider, auth_subject,
                recovery_key_hash, recovery_key_created_at, recovery_key_rotated_at,
                created_at, updated_at
            ) VALUES (?, ?, ?, 'local', NULL, ?, ?, NULL, ?, ?)""",
            (username, email, make_password(password), recovery_key_hash, now, now, now),
        )
        conn.commit()
    except Exception as exc:
        if _is_unique_constraint_error(exc):
            return error("Username or email already exists", 409)
        raise

    user = db_execute(
        conn,
        "SELECT * FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    django_login(
        request,
        authenticate(request, username=username, password=password),
        backend="pypostboy.djangoapp.auth_backend.PostBoyAuthBackend",
    )
    request.current_user = dict(row_to_mapping(user))
    return clear_legacy_identity_cookies(
        created({"user": _public_user(user), "recovery_key": recovery_key})
    )


def _find_user_for_recovery(conn, username, email):
    if username:
        return db_execute(conn, "SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if email:
        return db_execute(conn, "SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return None


def recover_verify(request):
    try:
        payload = json_body(request, allow_blank=False)
    except BadJsonBody:
        return error("Invalid JSON request body", 400)

    username, email = _normalize_recovery_identity(payload)
    recovery_key = payload.get("recovery_key") or ""
    if (not username and not email) or not recovery_key:
        return error(GENERIC_RECOVERY_ERROR, 401)

    identity = username or email
    if _is_recovery_rate_limited(request, identity):
        return error("Too many recovery attempts, try again later", 429)

    user = _find_user_for_recovery(get_connection(), username, email)
    if (
        not user
        or not user["recovery_key_hash"]
        or not _constant_time_recovery_match(recovery_key, user["recovery_key_hash"])
    ):
        return error(GENERIC_RECOVERY_ERROR, 401)
    return ok({"valid": True})


def recover_reset(request):
    try:
        payload = json_body(request, allow_blank=False)
    except BadJsonBody:
        return error("Invalid JSON request body", 400)

    username, email = _normalize_recovery_identity(payload)
    recovery_key = payload.get("recovery_key") or ""
    new_password = payload.get("new_password") or ""
    if (not username and not email) or not recovery_key or not _validate_password_policy(new_password):
        return error(GENERIC_RECOVERY_ERROR, 401)

    identity = username or email
    if _is_recovery_rate_limited(request, identity):
        return error("Too many recovery attempts, try again later", 429)

    conn = get_connection()
    user = _find_user_for_recovery(conn, username, email)
    if (
        not user
        or not user["recovery_key_hash"]
        or not _constant_time_recovery_match(recovery_key, user["recovery_key_hash"])
    ):
        return error(GENERIC_RECOVERY_ERROR, 401)

    now = timestamp()
    new_recovery_key = _issue_recovery_key()
    db_execute(
        conn,
        """UPDATE users
           SET password_hash = ?, recovery_key_hash = ?, recovery_key_rotated_at = ?, updated_at = ?
           WHERE id = ?""",
        (make_password(new_password), _hash_recovery_key(new_recovery_key), now, now, user["id"]),
    )
    conn.commit()
    return ok({"password_reset": True, "recovery_key": new_recovery_key})


def logout(request):
    """Clear the current browser session."""
    django_logout(request)
    for cookie_name in USER_ID_COOKIE_NAMES:
        request.COOKIES.pop(cookie_name, None)
    if hasattr(request, "current_user"):
        delattr(request, "current_user")
    return clear_legacy_identity_cookies(ok(_public_user(get_current_user(request))))
