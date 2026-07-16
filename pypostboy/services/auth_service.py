"""Authentication service helpers for recovery credentials.

PyPostBoy is local-first and does not configure outbound email by default. The
forgot-password initiation flow therefore rotates the stored recovery key for
existing users and records the plain key only in-process for tests or optional
local notification adapters. Public routes must still return the same response
for existing and missing accounts so callers cannot enumerate users.
"""
import hashlib
import hmac
import secrets

from django.contrib.auth.hashers import check_password, make_password

from pypostboy.db.serializers import timestamp

RECOVERY_KEY_BYTES = 32


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
    """Dispatch local-first recovery instructions.

    There is intentionally no outbound email dependency in the default backend.
    This hook centralizes notification behavior so deployments can replace or
    wrap it with an email/notification adapter without changing route code.
    """
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
