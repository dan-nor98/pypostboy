"""Authentication API views for PostBoy."""
import hashlib
import hmac
import secrets
import sqlite3

from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.hashers import make_password
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt

from pypostboy.apps.core.models import User
from pypostboy.auth import AuthenticationError, api_token_max_age_seconds, get_current_user, issue_api_token
from pypostboy.db.migrations import DEFAULT_LOCAL_USERNAME
from pypostboy.db.serializers import timestamp
from pypostboy.djangoapp.request import BadJsonBody, json_body
from pypostboy.http.responses import created, error, ok

RECOVERY_KEY_BYTES = 32
GENERIC_RECOVERY_ERROR = "Invalid recovery credentials"
RECOVERY_MAX_ATTEMPTS = 5
RECOVERY_WINDOW_SECONDS = 300


def _user_value(user, key):
    if user is None:
        return None
    if isinstance(user, dict):
        return user.get(key)
    if key == "password_hash":
        return user.password
    return getattr(user, key, None)


def _user_to_mapping(user):
    """Return the user model as the dict shape used by repository callers."""
    if user is None:
        return None
    if isinstance(user, dict):
        return user
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "password_hash": user.password,
        "auth_provider": user.auth_provider,
        "auth_subject": user.auth_subject,
        "recovery_key_hash": user.recovery_key_hash,
        "recovery_key_created_at": user.recovery_key_created_at,
        "recovery_key_rotated_at": user.recovery_key_rotated_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login": user.last_login,
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff,
        "is_active": user.is_active,
    }


def _public_user(user):
    """Return a client-safe user representation."""
    if not user:
        return None
    username = _user_value(user, "username")
    return {
        "id": _user_value(user, "id"),
        "username": username,
        "email": _user_value(user, "email"),
        "auth_provider": _user_value(user, "auth_provider"),
        "is_guest": username == DEFAULT_LOCAL_USERNAME
        and not _user_value(user, "password_hash"),
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
    try:
        return ok(_public_user(get_current_user(request)))
    except AuthenticationError as err:
        return error(err, 401)


@ensure_csrf_cookie
def csrf_token(request):
    """Set and return CSRF token for SPA bootstrapping."""
    return ok({"csrf_token": get_token(request)})


def _is_unique_constraint_error(exc):
    """Return True if the exception represents a uniqueness constraint violation."""

    def _matches(candidate):
        if isinstance(candidate, (IntegrityError, sqlite3.IntegrityError)):
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
    """Return the legacy conflict-query tuple for backwards-compatible tests."""
    if email is None:
        return "SELECT id FROM users WHERE username = ?", (username,)
    return "SELECT id FROM users WHERE username = ? OR email = ?", (username, email)


def _registration_conflict_filter(username, email):
    """Return an ORM filter for conflicting register identities."""
    if email is None:
        return Q(username=username)
    return Q(username=username) | Q(email=email)


def insert_and_get_id(**fields):
    """Create a user through the ORM and return its id.

    The function name is retained for older tests that monkeypatch the user
    creation step to force database-level uniqueness errors.
    """
    return User.objects.create(**fields).id


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
    request.current_user = _user_to_mapping(user)
    return ok(_public_user(user))


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

    if User.objects.filter(_registration_conflict_filter(username, email)).exists():
        return error("Username or email already exists", 409)

    now = timestamp()
    recovery_key = _issue_recovery_key()
    recovery_key_hash = _hash_recovery_key(recovery_key)
    try:
        with transaction.atomic():
            user_id = insert_and_get_id(
                username=username,
                email=email,
                password=make_password(password),
                auth_provider="local",
                auth_subject=None,
                recovery_key_hash=recovery_key_hash,
                recovery_key_created_at=now,
                recovery_key_rotated_at=None,
                created_at=now,
                updated_at=now,
            )
            user = User.objects.get(pk=user_id)
    except Exception as exc:
        if _is_unique_constraint_error(exc):
            return error("Username or email already exists", 409)
        raise

    django_login(
        request,
        authenticate(request, username=username, password=password),
        backend="pypostboy.djangoapp.auth_backend.PostBoyAuthBackend",
    )
    request.current_user = _user_to_mapping(user)
    return created({"user": _public_user(user), "recovery_key": recovery_key})


def _delete_sessions_for_user(user_id):
    """Delete every server-side browser session authenticated as the user."""
    user_id = str(user_id)
    for session in Session.objects.all():
        if str(session.get_decoded().get("_auth_user_id")) == user_id:
            session.delete()


def _find_user_for_recovery(username, email):
    if username:
        return User.objects.filter(username=username).first()
    if email:
        return User.objects.filter(email=email).first()
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

    user = _find_user_for_recovery(username, email)
    if (
        not user
        or not user.recovery_key_hash
        or not _constant_time_recovery_match(recovery_key, user.recovery_key_hash)
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

    user = _find_user_for_recovery(username, email)
    if (
        not user
        or not user.recovery_key_hash
        or not _constant_time_recovery_match(recovery_key, user.recovery_key_hash)
    ):
        return error(GENERIC_RECOVERY_ERROR, 401)

    now = timestamp()
    new_recovery_key = _issue_recovery_key()
    user.password = make_password(new_password)
    user.recovery_key_hash = _hash_recovery_key(new_recovery_key)
    user.recovery_key_rotated_at = now
    user.updated_at = now
    user.save(update_fields=[
        "password",
        "recovery_key_hash",
        "recovery_key_rotated_at",
        "updated_at",
    ])
    _delete_sessions_for_user(user.id)
    if hasattr(request, "current_user"):
        delattr(request, "current_user")
    return ok({"password_reset": True, "recovery_key": new_recovery_key})


@csrf_exempt
def token(request):
    """Issue a short-lived bearer token for non-browser API clients."""
    if request.method != "POST":
        return error("Method not allowed", 405)
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

    return ok({
        "token": issue_api_token(user.id),
        "token_type": "Bearer",
        "expires_in": api_token_max_age_seconds(),
    })


def logout(request):
    """Clear the current browser session."""
    django_logout(request)
    if hasattr(request, "current_user"):
        delattr(request, "current_user")
    return ok(_public_user(get_current_user(request)))
