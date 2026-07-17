"""Authentication business operations."""
import hashlib
import hmac
import secrets
import sqlite3
from dataclasses import dataclass

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Q

from pypostboy.apps.core.models import User
from pypostboy.db.migrations import DEFAULT_LOCAL_USERNAME
from pypostboy.db.serializers import timestamp

RECOVERY_KEY_BYTES = 32
GENERIC_RECOVERY_ERROR = "Invalid recovery credentials"
RECOVERY_RATE_LIMIT_ERROR = "Too many recovery attempts, try again later"
GENERIC_AUTH_RATE_LIMIT_ERROR = "Too many authentication attempts, try again later"
RECOVERY_MAX_ATTEMPTS = 5
RECOVERY_WINDOW_SECONDS = 300
AUTH_MAX_FAILED_ATTEMPTS = 5
AUTH_WINDOW_SECONDS = 300


class AuthServiceError(Exception):
    """Base class for expected authentication service failures."""

    status_code = 400
    message = "Authentication failed"

    def __init__(self, message=None):
        super().__init__(message or self.message)
        self.message = message or self.message


class MissingCredentialsError(AuthServiceError):
    message = "Username and password are required"


class PasswordPolicyError(AuthServiceError):
    message = "Password must be at least 8 characters"


class RegistrationConflictError(AuthServiceError):
    status_code = 409
    message = "Username or email already exists"


class InvalidCredentialsError(AuthServiceError):
    status_code = 401
    message = "Invalid username or password"


class AuthRateLimitError(AuthServiceError):
    status_code = 429
    message = GENERIC_AUTH_RATE_LIMIT_ERROR


class InvalidRecoveryCredentialsError(AuthServiceError):
    status_code = 401
    message = GENERIC_RECOVERY_ERROR


class RecoveryRateLimitError(AuthServiceError):
    status_code = 429
    message = RECOVERY_RATE_LIMIT_ERROR


@dataclass(frozen=True)
class RegisteredUser:
    user: User
    recovery_key: str


def user_value(user, key):
    if user is None:
        return None
    if isinstance(user, dict):
        return user.get(key)
    if key == "password_hash":
        return user.password
    return getattr(user, key, None)


def user_to_mapping(user):
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
        "credentials_updated_at": user.credentials_updated_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login": user.last_login,
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff,
        "is_active": user.is_active,
    }


def public_user(user):
    """Return a client-safe user representation."""
    if not user:
        return None
    username = user_value(user, "username")
    return {
        "id": user_value(user, "id"),
        "username": username,
        "email": user_value(user, "email"),
        "auth_provider": user_value(user, "auth_provider"),
        "is_guest": username == DEFAULT_LOCAL_USERNAME
        and not user_value(user, "password_hash"),
    }


def normalize_credentials(payload):
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    email = (payload.get("email") or "").strip() or None
    return username, password, email


def normalize_auth_identity(payload):
    identity = (payload.get("identity") or "").strip()
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip()
    return identity or username or email, payload.get("password") or ""


def normalize_recovery_identity(payload):
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip()
    return username, email


def validate_password_policy(password):
    return len(password or "") >= 8


def issue_recovery_key():
    """Return a new high-entropy recovery key for user-facing reset flows."""
    return secrets.token_urlsafe(RECOVERY_KEY_BYTES)


def hash_recovery_key(recovery_key):
    """Return the persisted one-way hash for a recovery key."""
    return make_password(recovery_key)


def _legacy_recovery_key_hash(recovery_key):
    return hashlib.sha256((recovery_key or "").encode("utf-8")).hexdigest()


def _is_legacy_recovery_key_hash(expected_hash):
    return (
        isinstance(expected_hash, str)
        and len(expected_hash) == 64
        and all(char in "0123456789abcdefABCDEF" for char in expected_hash)
    )


def constant_time_recovery_match(recovery_key, expected_hash):
    """Return True when a supplied recovery key matches a stored hash."""
    if not expected_hash:
        return False
    if _is_legacy_recovery_key_hash(expected_hash):
        return hmac.compare_digest(_legacy_recovery_key_hash(recovery_key), expected_hash)
    return check_password(recovery_key, expected_hash)


def rehash_legacy_recovery_key(user, recovery_key):
    if not _is_legacy_recovery_key_hash(user.recovery_key_hash):
        return
    user.recovery_key_hash = hash_recovery_key(recovery_key)
    user.updated_at = timestamp()
    user.save(update_fields=["recovery_key_hash", "updated_at"])


def rotate_recovery_key(user):
    """Rotate and persist a user's recovery key, returning the plain key once."""
    recovery_key = issue_recovery_key()
    now = timestamp()
    user.recovery_key_hash = hash_recovery_key(recovery_key)
    if not user.recovery_key_created_at:
        user.recovery_key_created_at = now
    user.recovery_key_rotated_at = now
    user.updated_at = now
    user.save(update_fields=[
        "recovery_key_hash",
        "recovery_key_created_at",
        "recovery_key_rotated_at",
        "updated_at",
    ])
    return recovery_key


def dispatch_recovery_instructions(user, recovery_key):
    """Dispatch local-first recovery instructions."""
    return {
        "delivered": False,
        "channel": "local-first",
        "reason": "No email notification service is configured.",
    }


def initiate_recovery(user):
    """Rotate recovery credentials and dispatch reset instructions for a user."""
    recovery_key = rotate_recovery_key(user)
    dispatch_result = dispatch_recovery_instructions(user, recovery_key)
    return {"recovery_key": recovery_key, "notification": dispatch_result}


def hashed_identity(identity):
    normalized = (identity or "unknown").strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def hashed_remote_addr(remote_addr):
    remote_addr = (remote_addr or "unknown").strip()
    return hashlib.sha256(remote_addr.encode("utf-8")).hexdigest()


def _rate_limit_key(prefix, remote_addr, identity):
    return f"{prefix}::{hashed_remote_addr(remote_addr)}::{hashed_identity(identity)}"


def _is_limited(key, max_attempts):
    current = cache.get(key)
    return current is not None and current >= max_attempts


def _record_failure(key, window_seconds):
    current = cache.get(key)
    if current is None:
        cache.add(key, 1, timeout=window_seconds)
        return
    cache.incr(key)


def _reset_failures(key):
    cache.delete(key)


def auth_rate_limit_key(remote_addr, identity):
    return _rate_limit_key("auth_rate_limit", remote_addr, identity)


def recovery_rate_limit_key(remote_addr, identity):
    return _rate_limit_key("recover_rate_limit", remote_addr, identity)


def _is_auth_rate_limited(remote_addr, identity):
    return _is_limited(auth_rate_limit_key(remote_addr, identity), AUTH_MAX_FAILED_ATTEMPTS)


def _record_auth_failure(remote_addr, identity):
    _record_failure(auth_rate_limit_key(remote_addr, identity), AUTH_WINDOW_SECONDS)


def _reset_auth_failures(remote_addr, identity):
    _reset_failures(auth_rate_limit_key(remote_addr, identity))


def _is_recovery_rate_limited(remote_addr, identity):
    return _is_limited(recovery_rate_limit_key(remote_addr, identity), RECOVERY_MAX_ATTEMPTS)


def _record_recovery_failure(remote_addr, identity):
    _record_failure(recovery_rate_limit_key(remote_addr, identity), RECOVERY_WINDOW_SECONDS)


def _reset_recovery_failures(remote_addr, identity):
    _reset_failures(recovery_rate_limit_key(remote_addr, identity))


def is_unique_constraint_error(exc):
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


def registration_conflict_query(username, email):
    """Return the legacy conflict-query tuple for backwards-compatible tests."""
    if email is None:
        return "SELECT id FROM users WHERE username = ?", (username,)
    return "SELECT id FROM users WHERE username = ? OR email = ?", (username, email)


def registration_conflict_filter(username, email):
    """Return an ORM filter for conflicting register identities."""
    if email is None:
        return Q(username=username)
    return Q(username=username) | Q(email=email)


def insert_and_get_id(**fields):
    """Create a user through the ORM and return its id."""
    return User.objects.create(**fields).id


def register_user(payload):
    username, password, email = normalize_credentials(payload)
    if not username or not password:
        raise MissingCredentialsError()
    if not validate_password_policy(password):
        raise PasswordPolicyError()

    if User.objects.filter(registration_conflict_filter(username, email)).exists():
        raise RegistrationConflictError()

    now = timestamp()
    recovery_key = issue_recovery_key()
    recovery_key_hash = hash_recovery_key(recovery_key)
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
                credentials_updated_at=now,
                created_at=now,
                updated_at=now,
            )
            user = User.objects.get(pk=user_id)
    except Exception as exc:
        if is_unique_constraint_error(exc):
            raise RegistrationConflictError() from exc
        raise
    return RegisteredUser(user=user, recovery_key=recovery_key)


def authenticate_with_rate_limit(payload, remote_addr, request=None):
    identity, password = normalize_auth_identity(payload)
    if not identity or not password:
        raise MissingCredentialsError()
    if _is_auth_rate_limited(remote_addr, identity):
        raise AuthRateLimitError()

    user = authenticate(request, username=identity, password=password)
    if not user:
        _record_auth_failure(remote_addr, identity)
        raise InvalidCredentialsError()

    _reset_auth_failures(remote_addr, identity)
    return user


def find_user_for_recovery(username, email):
    if username:
        return User.objects.filter(username=username).first()
    if email:
        return User.objects.filter(email=email).first()
    return None


def request_recovery(payload):
    username, email = normalize_recovery_identity(payload)
    if username or email:
        user = find_user_for_recovery(username, email)
        if user:
            initiate_recovery(user)


def verify_recovery(payload, remote_addr):
    username, email = normalize_recovery_identity(payload)
    identity = username or email
    if _is_recovery_rate_limited(remote_addr, identity):
        raise RecoveryRateLimitError()

    recovery_key = payload.get("recovery_key") or ""
    if (not username and not email) or not recovery_key:
        raise InvalidRecoveryCredentialsError()

    user = find_user_for_recovery(username, email)
    if (
        not user
        or not user.recovery_key_hash
        or not constant_time_recovery_match(recovery_key, user.recovery_key_hash)
    ):
        _record_recovery_failure(remote_addr, identity)
        raise InvalidRecoveryCredentialsError()

    rehash_legacy_recovery_key(user, recovery_key)
    _reset_recovery_failures(remote_addr, identity)
    return user


def reset_password_with_recovery(payload, remote_addr):
    new_password = payload.get("new_password") or ""
    if not validate_password_policy(new_password):
        raise InvalidRecoveryCredentialsError()

    user = verify_recovery(payload, remote_addr)
    now = timestamp()
    user.password = make_password(new_password)
    user.credentials_updated_at = now
    user.updated_at = now
    user.save(update_fields=[
        "password",
        "credentials_updated_at",
        "updated_at",
    ])
    new_recovery_key = rotate_recovery_key(user)
    invalidate_sessions_for_user_id(user.id)
    return new_recovery_key


def invalidate_sessions_for_user_id(user_id):
    """Delete every server-side browser session authenticated as the user."""
    user_id = str(user_id)
    for session in Session.objects.all():
        if str(session.get_decoded().get("_auth_user_id")) == user_id:
            session.delete()
